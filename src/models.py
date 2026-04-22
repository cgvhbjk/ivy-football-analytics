"""
Statistical models: panel regression for scheme effects and
logistic/RF model for roster → win probability.
"""

import numpy as np
import pandas as pd
import statsmodels.formula.api as smf
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
import matplotlib.pyplot as plt
import warnings
warnings.filterwarnings("ignore")


# ---------------------------------------------------------------------------
# Panel regression — scheme effects
# ---------------------------------------------------------------------------

def run_scheme_regression(master_df: pd.DataFrame) -> dict:
    """
    Fit: ivy_win_pct ~ off_scheme + def_scheme + C(school) + C(year)

    Returns dict with:
      - model_summary: statsmodels RegressionResultsWrapper
      - coef_df: tidy DataFrame of coefficients + CIs
    """
    needed = ["ivy_win_pct", "off_scheme", "def_scheme", "school", "year"]
    df = master_df.dropna(subset=needed).copy()

    if len(df) < 20:
        raise ValueError(f"Too few observations ({len(df)}) for regression.")

    formula = "ivy_win_pct ~ C(off_scheme) + C(def_scheme) + C(school) + C(year)"
    model = smf.ols(formula, data=df).fit(cov_type="HC3")

    coef_df = pd.DataFrame({
        "coef": model.params,
        "ci_lo": model.conf_int()[0],
        "ci_hi": model.conf_int()[1],
        "pvalue": model.pvalues,
    }).reset_index().rename(columns={"index": "term"})
    coef_df = coef_df[~coef_df["term"].str.startswith("C(school)")]
    coef_df = coef_df[~coef_df["term"].str.startswith("C(year)")]

    return {"model_summary": model, "coef_df": coef_df}


def plot_scheme_coefs(coef_df: pd.DataFrame, ax=None) -> None:
    df = coef_df[coef_df["term"] != "Intercept"].copy()
    df = df.sort_values("coef")

    if ax is None:
        _, ax = plt.subplots(figsize=(10, 6))

    colors = ["#2ecc71" if c > 0 else "#e74c3c" for c in df["coef"]]
    ax.barh(df["term"], df["coef"], xerr=[df["coef"] - df["ci_lo"], df["ci_hi"] - df["coef"]],
            color=colors, capsize=4, alpha=0.8)
    ax.axvline(0, color="black", linewidth=0.8, linestyle="--")
    ax.set_xlabel("Effect on Ivy Win %")
    ax.set_title("Scheme Coefficients (FE regression, HC3 SEs)")
    plt.tight_layout()


# ---------------------------------------------------------------------------
# Tenure split analysis
# ---------------------------------------------------------------------------

def scheme_by_tenure(master_df: pd.DataFrame) -> pd.DataFrame:
    """
    Compare scheme effectiveness by coach tenure phase.
    Requires a 'coach' and 'coach_start_year' column.
    Returns grouped means.
    """
    df = master_df.copy()
    if "coach_start_year" not in df.columns:
        return pd.DataFrame()

    df["tenure_year"] = df["year"] - df["coach_start_year"] + 1
    df["tenure_phase"] = pd.cut(df["tenure_year"], bins=[0, 2, 5, 100],
                                 labels=["Year 1-2", "Year 3-5", "Year 6+"])
    return (df.groupby(["off_scheme", "tenure_phase"])["ivy_win_pct"]
              .agg(["mean", "count", "std"])
              .reset_index()
              .rename(columns={"mean": "avg_win_pct", "count": "n", "std": "std_win_pct"}))


# ---------------------------------------------------------------------------
# Roster → Win probability model
# ---------------------------------------------------------------------------

ROSTER_FEATURES = [
    "OL_avg_weight", "SKILL_avg_weight", "DL_avg_weight", "LB_avg_weight",
    "DB_avg_weight", "OL_avg_height", "SKILL_avg_height", "DL_to_LB_weight_ratio",
    "OL_vs_DL_weight_diff", "roster_depth", "upperclassman_ratio",
]

STYLE_FEATURES = [
    "pass_tendency", "tempo", "spread_factor", "explosiveness",
    "aggression", "front_heaviness",
]


def build_game_dataset(master_df: pd.DataFrame, schedule_df: pd.DataFrame) -> pd.DataFrame:
    """
    Join per-game outcomes with team-season features to build a game-level
    training dataset.  Each row = one team's perspective of one game.
    """
    df = schedule_df.copy()
    df.columns = df.columns.str.lower()
    if "year" in df.columns:
        df = df[df["year"] >= 2014]

    opp_col = next((c for c in df.columns if c in ("opponent", "opp", "school_name")), None)
    result_col = next((c for c in df.columns if c in ("result", "w/l", "wl")), None)
    if opp_col is None or result_col is None:
        return pd.DataFrame()

    df["win"] = df[result_col].str.upper().str.startswith("W").astype(int)

    # Normalise school/opponent names to lowercase so the merge matches
    # CFBD schedules store opponents as title-case ("Harvard") while master
    # stores schools as lowercase ("harvard") — without this they never join.
    df["school"] = df["school"].str.lower()
    df[opp_col] = df[opp_col].str.lower()

    feat_cols = [c for c in ROSTER_FEATURES + STYLE_FEATURES if c in master_df.columns]
    home_feats = master_df[["school", "year"] + feat_cols].copy()
    home_feats["school"] = home_feats["school"].str.lower()
    home_feats.columns = ["school", "year"] + [f"home_{c}" for c in feat_cols]

    opp_feats = master_df[["school", "year"] + feat_cols].copy()
    opp_feats["school"] = opp_feats["school"].str.lower()
    opp_feats.columns = [opp_col, "year"] + [f"opp_{c}" for c in feat_cols]

    df = df.merge(home_feats, on=["school", "year"], how="left")
    df = df.merge(opp_feats, on=[opp_col, "year"], how="left")

    # Opponent type: run_heavy flag (1 if opponent rush_rate > 0.55)
    if "opp_pass_tendency" in df.columns:
        df["opp_run_heavy"] = (df["opp_pass_tendency"] < 0.45).astype(int)
        df["opp_pass_heavy"] = (df["opp_pass_tendency"] > 0.55).astype(int)

    return df.dropna(subset=["win"])


def train_roster_model(game_df: pd.DataFrame,
                       model_type: str = "rf") -> dict:
    """
    Train a classifier predicting win from roster + opponent-type features.
    Returns dict with model, feature importances, and CV score.
    """
    feature_cols = [c for c in game_df.columns
                    if (c.startswith("home_") and c != "home_away")
                    or c in ("opp_run_heavy", "opp_pass_heavy")]

    # Drop columns with no data at all — a single all-NaN column would wipe
    # every row in the subsequent dropna()
    feature_cols = [c for c in feature_cols if game_df[c].notna().any()]

    df = game_df[feature_cols + ["win"]].dropna()
    if len(df) < 30:
        raise ValueError(f"Too few rows ({len(df)}) for roster model.")

    X = df[feature_cols].values
    y = df["win"].values

    if model_type == "rf":
        clf = RandomForestClassifier(n_estimators=300, max_depth=5,
                                      min_samples_leaf=5, random_state=42)
    else:
        clf = Pipeline([("scaler", StandardScaler()),
                        ("lr", LogisticRegression(max_iter=1000, C=0.1))])

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scores = cross_val_score(clf, X, y, cv=cv, scoring="roc_auc")
    clf.fit(X, y)

    if model_type == "rf":
        importances = pd.Series(clf.feature_importances_, index=feature_cols).sort_values(ascending=False)
    else:
        coefs = clf.named_steps["lr"].coef_[0]
        importances = pd.Series(np.abs(coefs), index=feature_cols).sort_values(ascending=False)

    return {
        "model": clf,
        "feature_cols": feature_cols,
        "importances": importances,
        "cv_auc_mean": scores.mean(),
        "cv_auc_std": scores.std(),
    }


def plot_feature_importances(result: dict, top_n: int = 15, ax=None) -> None:
    imp = result["importances"].head(top_n)
    if ax is None:
        _, ax = plt.subplots(figsize=(10, 6))
    imp[::-1].plot.barh(ax=ax, color="#3498db", alpha=0.8)
    ax.set_xlabel("Importance / |Coefficient|")
    ax.set_title(f"Roster Model Feature Importances\n(CV AUC = {result['cv_auc_mean']:.3f} ± {result['cv_auc_std']:.3f})")
    plt.tight_layout()
