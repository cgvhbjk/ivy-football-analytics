"""
Algorithmic scheme detection + interactive slider interface.

Approach: instead of manual labels, we compute a set of continuous
"style scores" from on-field stats and roster composition, then let
analysts inspect and override them with sliders in Jupyter.

Offensive style dimensions
--------------------------
  pass_tendency  : 0 = pure run, 1 = pure pass
  tempo          : 0 = slowest (power/pro), 1 = fastest (no-huddle/spread)
  spread_factor  : 0 = pro-style (TE/FB heavy), 1 = spread (WR/slot heavy)
  explosiveness  : 0 = grind-it-out, 1 = big-play

Defensive style dimensions
--------------------------
  front_heaviness : 0 = 3-man front, 1 = 4-man front (more like 4-4 etc.)
  aggression      : 0 = bend-don't-break, 1 = attack (high havoc, blitz-heavy)
  coverage_depth  : 0 = press/man, 1 = zone/soft
"""

import numpy as np
import pandas as pd
from scipy.stats import zscore


def _norm(series: pd.Series) -> pd.Series:
    """Normalise a series to [0, 1] using min-max scaling."""
    mn, mx = series.min(), series.max()
    if mx == mn:
        return pd.Series(0.5, index=series.index)
    return (series - mn) / (mx - mn)


def compute_style_scores(metrics_df: pd.DataFrame) -> pd.DataFrame:
    """
    Derive continuous [0,1] style scores from computed metrics.
    Returns a DataFrame with one row per team-year + style columns.
    """
    df = metrics_df.copy()

    # ----- Offensive dimensions -----

    if "pass_rate" in df.columns:
        df["pass_tendency"] = _norm(df["pass_rate"])
    else:
        df["pass_tendency"] = np.nan

    if "pace_proxy" in df.columns:
        df["tempo"] = _norm(df["pace_proxy"])
    else:
        df["tempo"] = np.nan

    # Spread factor: proxy via (WR+slot weight) vs (TE+FB weight), or pass_rate + tempo
    if "SKILL_avg_weight" in df.columns and "OL_avg_weight" in df.columns:
        # Lighter skill players → more spread
        df["spread_factor"] = _norm(1 / df["SKILL_avg_weight"].replace(0, np.nan))
    elif "pass_tendency" in df.columns and "tempo" in df.columns:
        df["spread_factor"] = _norm((df["pass_tendency"].fillna(0.5) + df["tempo"].fillna(0.5)) / 2)
    else:
        df["spread_factor"] = np.nan

    if "yards_per_play" in df.columns:
        df["explosiveness"] = _norm(df["yards_per_play"])
    else:
        df["explosiveness"] = np.nan

    # ----- Defensive dimensions -----

    if "havoc_rate" in df.columns:
        df["aggression"] = _norm(df["havoc_rate"])
    else:
        df["aggression"] = np.nan

    # Front heaviness proxy: DL weight vs LB weight ratio
    if "DL_to_LB_weight_ratio" in df.columns:
        df["front_heaviness"] = _norm(df["DL_to_LB_weight_ratio"])
    else:
        df["front_heaviness"] = np.nan

    # Coverage depth proxy: opponent pass yards / total def plays
    if "opp_pass_yds" in df.columns and "opp_plays" in df.columns:
        df["coverage_depth"] = _norm(df["opp_pass_yds"] / df["opp_plays"].replace(0, np.nan))
    else:
        df["coverage_depth"] = np.nan

    style_cols = ["pass_tendency", "tempo", "spread_factor", "explosiveness",
                  "aggression", "front_heaviness", "coverage_depth"]

    keep = ["school", "year"] + [c for c in style_cols if c in df.columns]
    return df[keep]


def label_scheme(row: pd.Series,
                 pass_thresh: float = 0.55,
                 tempo_thresh: float = 0.55,
                 spread_thresh: float = 0.55,
                 explosive_thresh: float = 0.55,
                 aggression_thresh: float = 0.55,
                 front_thresh: float = 0.55) -> dict:
    """
    Convert continuous scores + user-adjustable thresholds into
    human-readable scheme labels.  Returns dict with off_scheme and def_scheme.
    """
    pt = row.get("pass_tendency", np.nan)
    tp = row.get("tempo", np.nan)
    sf = row.get("spread_factor", np.nan)
    ex = row.get("explosiveness", np.nan)
    ag = row.get("aggression", np.nan)
    fh = row.get("front_heaviness", np.nan)

    # Offensive label
    if not np.isnan(pt) and pt >= pass_thresh:
        if not np.isnan(tp) and tp >= tempo_thresh:
            off = "Air Raid / Spread RPO"
        elif not np.isnan(sf) and sf >= spread_thresh:
            off = "Spread Pass"
        else:
            off = "West Coast / Pro Pass"
    else:
        if not np.isnan(tp) and tp >= tempo_thresh:
            off = "Spread Run / Option"
        elif not np.isnan(sf) and sf >= spread_thresh:
            off = "Spread Run"
        else:
            off = "Pro-Style / Power Run"

    # Defensive label
    if not np.isnan(ag) and ag >= aggression_thresh:
        def_ = "Attacking (3-4 / Bear)" if (not np.isnan(fh) and fh < front_thresh) else "Aggressive 4-3"
    else:
        def_ = "4-3 Base" if (not np.isnan(fh) and fh >= front_thresh) else "3-4 / 3-3-5"

    return {"off_scheme": off, "def_scheme": def_}


def apply_labels(style_df: pd.DataFrame, **thresh_kwargs) -> pd.DataFrame:
    labels = style_df.apply(lambda r: label_scheme(r, **thresh_kwargs), axis=1, result_type="expand")
    return pd.concat([style_df, labels], axis=1)


# ---------------------------------------------------------------------------
# Interactive widget — call build_scheme_widget(style_df) in a Jupyter cell
# ---------------------------------------------------------------------------

def build_scheme_widget(style_df: pd.DataFrame):
    """
    Renders ipywidgets sliders to adjust all detection thresholds live,
    and displays the resulting scheme labels in a styled DataFrame.
    """
    try:
        import ipywidgets as widgets
        from IPython.display import display, clear_output
    except ImportError:
        print("ipywidgets not installed — run: pip install ipywidgets")
        return

    output = widgets.Output()

    sliders = {
        "pass_thresh":     widgets.FloatSlider(value=0.55, min=0, max=1, step=0.01, description="Pass threshold", style={"description_width": "150px"}, layout=widgets.Layout(width="500px")),
        "tempo_thresh":    widgets.FloatSlider(value=0.55, min=0, max=1, step=0.01, description="Tempo threshold", style={"description_width": "150px"}, layout=widgets.Layout(width="500px")),
        "spread_thresh":   widgets.FloatSlider(value=0.55, min=0, max=1, step=0.01, description="Spread threshold", style={"description_width": "150px"}, layout=widgets.Layout(width="500px")),
        "explosive_thresh":widgets.FloatSlider(value=0.55, min=0, max=1, step=0.01, description="Explosiveness", style={"description_width": "150px"}, layout=widgets.Layout(width="500px")),
        "aggression_thresh":widgets.FloatSlider(value=0.55, min=0, max=1, step=0.01, description="Def aggression", style={"description_width": "150px"}, layout=widgets.Layout(width="500px")),
        "front_thresh":    widgets.FloatSlider(value=0.55, min=0, max=1, step=0.01, description="Front heaviness", style={"description_width": "150px"}, layout=widgets.Layout(width="500px")),
    }

    def _update(*_):
        with output:
            clear_output(wait=True)
            kwargs = {k: s.value for k, s in sliders.items()}
            labeled = apply_labels(style_df, **kwargs)
            display(labeled[["school", "year", "off_scheme", "def_scheme",
                              "pass_tendency", "tempo", "spread_factor",
                              "explosiveness", "aggression"]].style.background_gradient(
                subset=["pass_tendency", "tempo", "spread_factor", "explosiveness", "aggression"],
                cmap="RdYlGn"
            ))

    for s in sliders.values():
        s.observe(_update, names="value")

    box = widgets.VBox([
        widgets.HTML("<h3>Scheme Detection Threshold Sliders</h3>"),
        *sliders.values(),
        output
    ])
    _update()
    display(box)
