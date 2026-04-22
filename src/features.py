"""
Feature engineering: compute offensive/defensive metrics and roster summaries.
"""

import re
import numpy as np
import pandas as pd


# ---------------------------------------------------------------------------
# Roster parsing helpers
# ---------------------------------------------------------------------------

def parse_height(h: str) -> float | None:
    """Convert '6-2' or '6\'2"' style strings to total inches."""
    if pd.isna(h) or str(h).strip() == "":
        return None
    h = str(h).strip()
    m = re.match(r"(\d+)['\-](\d+)", h)
    if m:
        return int(m.group(1)) * 12 + int(m.group(2))
    try:
        return float(h)
    except ValueError:
        return None


def parse_weight(w: str) -> float | None:
    if pd.isna(w) or str(w).strip() == "":
        return None
    try:
        return float(re.sub(r"[^\d.]", "", str(w)))
    except ValueError:
        return None


POSITION_GROUPS = {
    "OL": ["OL", "OT", "OG", "C", "LS"],
    "SKILL": ["QB", "RB", "WR", "TE", "FB", "HB", "SB"],
    "DL": ["DL", "DE", "DT", "NT", "NG"],
    "LB": ["LB", "ILB", "OLB", "MLB"],
    "DB": ["DB", "CB", "S", "SS", "FS"],
    "ST": ["K", "P", "KR", "PR"],
}


def classify_position_group(pos: str) -> str:
    pos = str(pos).upper().strip()
    for group, positions in POSITION_GROUPS.items():
        if pos in positions:
            return group
    return "OTHER"


def build_roster_features(roster_df: pd.DataFrame) -> pd.DataFrame:
    """
    Given the raw roster DataFrame, return one row per team-year with
    aggregated physical features.
    """
    df = roster_df.copy()

    # Normalise column names — handle both site-scraped and S-R naming
    col_map = {}
    for c in df.columns:
        cl = c.lower().strip()
        if cl in ("ht", "height", "height_raw") and "height_in" not in df.columns:
            col_map[c] = "height_in_raw"
        elif cl in ("wt", "weight", "weight_raw") and "weight_lbs" not in df.columns:
            col_map[c] = "weight_lbs_raw"
        elif cl in ("pos", "position"):
            col_map[c] = "pos"
        elif cl in ("cl", "class", "yr", "year_cls", "year_class"):
            col_map[c] = "class_yr"
    df = df.rename(columns=col_map)

    # Parse height/weight if they came in as strings; site-scraped data is already numeric
    if "height_in_raw" in df.columns:
        df["height_in"] = df["height_in_raw"].apply(parse_height)
    if "weight_lbs_raw" in df.columns:
        df["weight_lbs"] = df["weight_lbs_raw"].apply(parse_weight)

    # Ensure numeric
    if "height_in" in df.columns:
        df["height_in"] = pd.to_numeric(df["height_in"], errors="coerce")
    if "weight_lbs" in df.columns:
        df["weight_lbs"] = pd.to_numeric(df["weight_lbs"], errors="coerce")

    if "pos" in df.columns:
        df["pos_group"] = df["pos"].apply(classify_position_group)

    records = []
    for (school, year), grp in df.groupby(["school", "year"]):
        rec = {"school": school, "year": int(year)}

        for pg in ["OL", "SKILL", "DL", "LB", "DB"]:
            sub = grp[grp.get("pos_group", pd.Series()) == pg] if "pos_group" in grp.columns else pd.DataFrame()
            if not sub.empty and "weight_lbs" in sub.columns:
                rec[f"{pg}_avg_weight"] = sub["weight_lbs"].dropna().mean()
                rec[f"{pg}_n"] = sub["weight_lbs"].dropna().count()
            else:
                rec[f"{pg}_avg_weight"] = np.nan
                rec[f"{pg}_n"] = 0

            if not sub.empty and "height_in" in sub.columns:
                rec[f"{pg}_avg_height"] = sub["height_in"].dropna().mean()
            else:
                rec[f"{pg}_avg_height"] = np.nan

        # Derived ratios
        ol_w = rec.get("OL_avg_weight", np.nan)
        dl_w = rec.get("DL_avg_weight", np.nan)
        lb_w = rec.get("LB_avg_weight", np.nan)
        rec["DL_to_LB_weight_ratio"] = dl_w / lb_w if (lb_w and lb_w > 0) else np.nan
        rec["OL_vs_DL_weight_diff"] = ol_w - dl_w if not (np.isnan(ol_w) or np.isnan(dl_w)) else np.nan

        # Roster depth proxy: total players with weight data
        if "weight_lbs" in grp.columns:
            rec["roster_depth"] = grp["weight_lbs"].dropna().count()
        else:
            rec["roster_depth"] = 0

        # Upperclassman ratio (junior + senior)
        if "class_yr" in grp.columns:
            upper = grp["class_yr"].str.upper().isin(["JR", "SR", "3", "4", "JUNIOR", "SENIOR"]).sum()
            total = len(grp)
            rec["upperclassman_ratio"] = upper / total if total > 0 else np.nan

        records.append(rec)

    return pd.DataFrame(records)


# ---------------------------------------------------------------------------
# Team-season metrics from stats table
# ---------------------------------------------------------------------------

def build_team_metrics(stats_df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute derived metrics from the team stats CSV.
    Works with both game-derived stats and S-R exports.
    """
    df = stats_df.copy()

    def col(*aliases):
        for a in aliases:
            if a in df.columns:
                return pd.to_numeric(df[a], errors="coerce")
        return pd.Series(np.nan, index=df.index)

    # --- From game-derived data (always available) ---
    df["points_per_game"] = col("points_for")
    df["points_allowed_per_game"] = col("points_against")

    # --- From cfbd box scores or S-R exports ---
    rush_att  = col("rushingAttempts", "rush_att", "rushing_attempts", "RushAtt")
    pass_att  = col("completionAttempts_att", "pass_att", "passing_attempts", "PassAtt")
    total_att = rush_att + pass_att

    # Only trust box-score-derived rates when we have ≥3 games of data
    min_games = col("games_with_boxscore")
    enough_games = min_games >= 3

    df["pass_rate"] = np.where(enough_games & (total_att > 0), pass_att / total_att, np.nan)
    df["rush_rate"] = np.where(enough_games & (total_att > 0), rush_att / total_att, np.nan)

    total_yards = col("totalYards", "total_yards", "yards", "Yds")
    df["yards_per_play"] = np.where(enough_games & (total_att > 0), total_yards / total_att, np.nan)

    # Pace: plays per game — NaN when box scores unavailable or insufficient sample
    df["pace_proxy"] = np.where(enough_games & (total_att > 0), total_att, np.nan)

    # Turnovers
    df["turnovers_per_game"] = col("turnovers", "turnovers_per_game")

    # Possession time in minutes
    def parse_possession(s):
        try:
            parts = str(s).split(":")
            return int(parts[0]) + int(parts[1]) / 60
        except Exception:
            return np.nan
    if "possessionTime" in df.columns:
        df["possession_min"] = df["possessionTime"].apply(parse_possession)

    tfl      = col("tacklesForLoss", "tfl", "tackles_for_loss", "TFL")
    sacks    = col("sacks", "sk", "Sacks")
    pbu      = col("passesDeflected", "pbu", "passes_defended", "PBU")
    def_plays = col("opp_plays", "def_plays", "plays_against")
    denom = np.where(def_plays > 0, def_plays, 70.0)
    havoc_raw = tfl + sacks + pbu
    df["havoc_rate"] = np.where(enough_games & havoc_raw.notna() & (havoc_raw > 0), havoc_raw / denom, np.nan)

    return df


# ---------------------------------------------------------------------------
# Derive team stats from game data (used when season-stats API is unavailable)
# ---------------------------------------------------------------------------

IVY_CFBD_NAMES = {"brown", "columbia", "cornell", "dartmouth", "harvard",
                   "pennsylvania", "princeton", "yale"}


def build_stats_from_games(schedule_df: pd.DataFrame) -> pd.DataFrame:
    """
    Derive per-season team metrics directly from game results.
    Works with the cfbd games schema (columns: school, year, points, opp_points,
    result, conference_game, opponent).
    """
    df = schedule_df.copy()
    df["points"]     = pd.to_numeric(df.get("points"),     errors="coerce")
    df["opp_points"] = pd.to_numeric(df.get("opp_points"), errors="coerce")
    # Use stored result column — don't recompute from points which are null for older FCS games
    df["win"]    = df["result"].fillna("").str.upper().str.startswith("W").astype(int)
    df["margin"] = df["points"] - df["opp_points"]

    agg = df.groupby(["school", "year"]).agg(
        games         = ("win", "count"),
        wins          = ("win", "sum"),
        points_for    = ("points", "mean"),
        points_against= ("opp_points", "mean"),
        avg_margin    = ("margin", "mean"),
    ).reset_index()
    agg["win_pct"]   = agg["wins"] / agg["games"]
    agg["point_diff"]= agg["points_for"] - agg["points_against"]

    # Ivy-only subset
    ivy_mask = df["opponent"].fillna("").str.lower().apply(
        lambda x: any(s in x for s in IVY_CFBD_NAMES)
    )
    ivy = df[ivy_mask].groupby(["school", "year"]).agg(
        ivy_wins  = ("win", "sum"),
        ivy_games = ("win", "count"),
        ivy_avg_margin = ("margin", "mean"),
    ).reset_index()
    ivy["ivy_win_pct"] = ivy["ivy_wins"] / ivy["ivy_games"]

    return agg.merge(ivy, on=["school", "year"], how="left")


# ---------------------------------------------------------------------------
# Schedule / outcomes
# ---------------------------------------------------------------------------

IVY_SLUGS = set(["brown", "columbia", "cornell", "dartmouth", "harvard", "pennsylvania", "princeton", "yale"])


def compute_ivy_record(schedule_df: pd.DataFrame) -> pd.DataFrame:
    """
    From raw schedule data, compute Ivy-only win%, avg margin, and total games.
    """
    df = schedule_df.copy()

    # Normalise opponent column
    opp_col = next((c for c in df.columns if c.lower() in ("opponent", "opp", "school_name")), None)
    result_col = next((c for c in df.columns if c.lower() in ("result", "w/l", "wl", "outcome")), None)
    pts_col = next((c for c in df.columns if c.lower() in ("pts", "points", "tm")), None)
    opp_pts_col = next((c for c in df.columns if c.lower() in ("opp", "opp_pts", "opponent_pts")), None)

    if opp_col is None or result_col is None:
        return pd.DataFrame()

    df["opp_lower"] = df[opp_col].str.lower().str.replace(r"[^a-z]", "", regex=True)
    ivy_mask = df["opp_lower"].apply(lambda x: any(s in x for s in IVY_SLUGS))
    ivy = df[ivy_mask].copy()

    if ivy.empty:
        return pd.DataFrame()

    ivy["win"] = ivy[result_col].str.upper().str.startswith("W").astype(int)

    if pts_col and opp_pts_col:
        ivy[pts_col] = pd.to_numeric(ivy[pts_col], errors="coerce")
        ivy[opp_pts_col] = pd.to_numeric(ivy[opp_pts_col], errors="coerce")
        ivy["margin"] = ivy[pts_col] - ivy[opp_pts_col]

    agg = {"win": ["sum", "count"]}
    if "margin" in ivy.columns:
        agg["margin"] = "mean"

    result = ivy.groupby(["school", "year"]).agg(agg)
    result.columns = ["ivy_wins", "ivy_games", "ivy_avg_margin"] if "margin" in ivy.columns else ["ivy_wins", "ivy_games"]
    result["ivy_win_pct"] = result["ivy_wins"] / result["ivy_games"]
    return result.reset_index()
