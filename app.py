"""
Ivy League Football Analytics — Streamlit Dashboard
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

st.set_page_config(
    page_title="Ivy Football Analytics",
    page_icon="🏈",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── colour palette ────────────────────────────────────────────────────────────
SCHOOL_COLORS = {
    "brown":        "#5C3317",
    "columbia":     "#4A90D9",
    "cornell":      "#B31B1B",
    "dartmouth":    "#00693E",
    "harvard":      "#A51C30",
    "pennsylvania": "#990000",
    "princeton":    "#E87722",
    "yale":         "#00356B",
}
DEFAULT_COLOR = "#1a56db"

# Chart defaults — dark text on transparent background for light theme
_FONT   = dict(color="#1e293b", size=12)
_LAYOUT = dict(plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)", font=_FONT)

STYLE_COLS = [
    "pass_tendency", "tempo", "spread_factor",
    "explosiveness", "aggression", "front_heaviness",
]
STYLE_LABELS = {
    "pass_tendency":   "Pass Tendency",
    "tempo":           "Tempo",
    "spread_factor":   "Spread Factor",
    "explosiveness":   "Explosiveness",
    "aggression":      "Def. Aggression",
    "front_heaviness": "Front Heaviness",
}
STYLE_DESC = {
    "pass_tendency":   "0 = run-heavy · 1 = pass-heavy",
    "tempo":           "0 = deliberate · 1 = no-huddle",
    "spread_factor":   "0 = tight formation · 1 = spread",
    "explosiveness":   "0 = low yards/play · 1 = explosive",
    "aggression":      "0 = bend-don't-break · 1 = blitz-heavy",
    "front_heaviness": "0 = 3-man front · 1 = 4-man front",
}

# ── data loading ──────────────────────────────────────────────────────────────
DATA_DIR = Path("data")


@st.cache_data(show_spinner=False)
def load_data() -> dict:
    paths = {
        "stats":     DATA_DIR / "raw/team_stats/team_stats_raw.csv",
        "rosters":   DATA_DIR / "raw/rosters/rosters_raw.csv",
        "schedules": DATA_DIR / "raw/schedules/schedules_raw.csv",
        "master":    DATA_DIR / "processed/master_labeled.csv",
    }
    return {k: pd.read_csv(p) if p.exists() else pd.DataFrame() for k, p in paths.items()}


def demo_data() -> pd.DataFrame:
    """Simulated season-level data. Used only when real data is not present."""
    rng = np.random.default_rng(42)
    schools = list(SCHOOL_COLORS.keys())
    years = list(range(2005, 2025))
    rows = []
    for s in schools:
        base_win = rng.uniform(0.3, 0.7)
        for y in years:
            rows.append({
                "school": s, "year": y,
                "ivy_win_pct":        np.clip(base_win + rng.normal(0, 0.12), 0, 1),
                "yards_per_play":     rng.uniform(4.5, 6.8),
                "pass_rate":          rng.uniform(0.38, 0.68),
                "havoc_rate":         rng.uniform(0.04, 0.14),
                "pace_proxy":         rng.uniform(60, 90),
                "pass_tendency":      rng.uniform(0, 1),
                "tempo":              rng.uniform(0, 1),
                "spread_factor":      rng.uniform(0, 1),
                "explosiveness":      rng.uniform(0, 1),
                "aggression":         rng.uniform(0, 1),
                "front_heaviness":    rng.uniform(0, 1),
                "OL_avg_weight":      rng.uniform(270, 310),
                "SKILL_avg_weight":   rng.uniform(185, 215),
                "DL_avg_weight":      rng.uniform(255, 295),
                "LB_avg_weight":      rng.uniform(220, 245),
                "DB_avg_weight":      rng.uniform(185, 205),
                "upperclassman_ratio":rng.uniform(0.4, 0.7),
                "roster_depth":       int(rng.integers(55, 85)),
                "off_scheme": rng.choice(["Air Raid / Spread RPO", "Pro-Style / Power Run",
                                          "West Coast / Pro Pass", "Spread Run / Option",
                                          "Spread Pass"]),
                "def_scheme": rng.choice(["4-3 Base", "3-4 / 3-3-5",
                                          "Aggressive 4-3", "Attacking (3-4 / Bear)"]),
            })
    return pd.DataFrame(rows)


def scheme_label(row: pd.Series, thresholds: dict) -> tuple:
    pt = row.get("pass_tendency", np.nan)
    tp = row.get("tempo", np.nan)
    sf = row.get("spread_factor", np.nan)
    ag = row.get("aggression", np.nan)
    fh = row.get("front_heaviness", np.nan)

    def v(x): return not (isinstance(x, float) and np.isnan(x))

    if v(pt) and pt >= thresholds["pass"]:
        off = ("Air Raid / Spread RPO" if v(tp) and tp >= thresholds["tempo"]
               else "Spread Pass"        if v(sf) and sf >= thresholds["spread"]
               else "West Coast / Pro Pass")
    else:
        off = ("Spread Run / Option"    if v(tp) and tp >= thresholds["tempo"]
               else "Spread Run"         if v(sf) and sf >= thresholds["spread"]
               else "Pro-Style / Power Run")

    def_ = ("Attacking (3-4 / Bear)"   if v(ag) and ag >= thresholds["aggression"] and v(fh) and fh < thresholds["front"]
            else "Aggressive 4-3"       if v(ag) and ag >= thresholds["aggression"]
            else "4-3 Base"             if v(fh) and fh >= thresholds["front"]
            else "3-4 / 3-3-5")
    return off, def_


def _down_distance_estimates(pass_rate_base: float) -> pd.DataFrame:
    """
    Estimate pass rate by down × distance bucket from a season-level pass rate.
    Multipliers reflect typical Ivy / FCS down-and-distance tendency patterns.
    """
    down_mult = {1: 0.82, 2: 1.00, 3: 1.42, 4: 0.72}
    dist_mult = {"Short (1-3 yds)": 0.78, "Medium (4-6 yds)": 1.00, "Long (7+ yds)": 1.26}
    dn_labels = {1: "1st", 2: "2nd", 3: "3rd", 4: "4th"}

    rows = []
    for dn, dm in down_mult.items():
        for dl, lm in dist_mult.items():
            pr = float(np.clip(pass_rate_base * dm * lm, 0.05, 0.95))
            rows.append({"Down": dn_labels[dn], "Distance": dl,
                         "Pass Rate": pr, "Run Rate": 1.0 - pr})
    return pd.DataFrame(rows)


# ── sidebar ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("## 🏈 Ivy Football")
    st.markdown("---")
    page = st.radio(
        "Navigate",
        ["Dashboard", "Matchup Analyzer", "Down & Distance",
         "Team Stats", "Scheme Detector", "Scheme vs Wins", "Roster Analysis"],
        label_visibility="collapsed",
    )
    st.markdown("---")
    st.caption("Data: CollegeFootballData API · 2005–2024")


data = load_data()
df   = data["master"] if not data["master"].empty else demo_data()
using_demo = data["master"].empty

if using_demo:
    st.info(
        "**Demo mode** — charts show simulated data. "
        "Run `01_scrape.ipynb` to load real stats.",
        icon="ℹ️",
    )


# ═══════════════════════════════════════════════════════════════════════════════
# PAGE: DASHBOARD
# ═══════════════════════════════════════════════════════════════════════════════
if page == "Dashboard":
    st.markdown("# Ivy League Football Analytics")
    st.markdown(
        "Scheme detection · roster modeling · win trends — all 8 Ivy schools, 2005–2024.  \n"
        "Start with **Matchup Analyzer** in the sidebar to compare two teams head-to-head."
    )
    st.markdown("---")

    k1, k2, k3, k4 = st.columns(4)
    k1.metric("Schools", "8")
    k2.metric("Seasons covered", f"{df['year'].nunique()}")
    k3.metric("Team-seasons", f"{len(df):,}")
    k4.metric("Avg Ivy Win %",
              f"{df['ivy_win_pct'].mean():.1%}" if "ivy_win_pct" in df.columns else "—")

    st.markdown("---")

    if "ivy_win_pct" in df.columns:
        st.subheader("Ivy Win % Over Time")
        fig = px.line(
            df.sort_values("year"),
            x="year", y="ivy_win_pct", color="school",
            color_discrete_map=SCHOOL_COLORS,
            labels={"ivy_win_pct": "Win %", "year": "Season", "school": "School"},
            markers=True,
        )
        fig.update_layout(**_LAYOUT, legend=dict(orientation="h", y=-0.22),
                          yaxis_tickformat=".0%", hovermode="x unified", height=360)
        st.plotly_chart(fig, use_container_width=True)

    col_l, col_r = st.columns(2)
    with col_l:
        st.subheader("Average Win % by School")
        avg = (df.groupby("school")["ivy_win_pct"].mean()
               .sort_values(ascending=True).reset_index())
        avg.columns = ["school", "avg_win_pct"]
        fig2 = px.bar(avg, x="avg_win_pct", y="school", orientation="h",
                      color="school", color_discrete_map=SCHOOL_COLORS,
                      labels={"avg_win_pct": "Avg Ivy Win %", "school": ""})
        fig2.update_layout(**_LAYOUT, showlegend=False, xaxis_tickformat=".0%")
        st.plotly_chart(fig2, use_container_width=True)

    with col_r:
        if "off_scheme" in df.columns:
            st.subheader("Offensive Scheme Mix")
            off_counts = df["off_scheme"].value_counts().reset_index()
            off_counts.columns = ["scheme", "count"]
            fig3 = px.pie(off_counts, names="scheme", values="count", hole=0.4,
                          color_discrete_sequence=px.colors.qualitative.Set2)
            fig3.update_layout(**_LAYOUT,
                               legend=dict(orientation="v", x=1.0, font=dict(size=11)))
            st.plotly_chart(fig3, use_container_width=True)


# ═══════════════════════════════════════════════════════════════════════════════
# PAGE: MATCHUP ANALYZER
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "Matchup Analyzer":
    st.markdown("# Matchup Analyzer")
    st.markdown(
        "Compare two teams' style profiles and historical records. "
        "Select a specific season to see that snapshot, or choose **All seasons** for career averages."
    )
    st.markdown("---")

    schools = sorted(df["school"].unique())
    years   = sorted(df["year"].unique(), reverse=True)

    col_a, col_b, col_yr = st.columns([2, 2, 2])
    team_a = col_a.selectbox("Home Team", schools, index=0, key="ma_a")
    team_b = col_b.selectbox("Away Team", schools, index=min(1, len(schools) - 1), key="ma_b")
    yr_options = ["All seasons"] + [str(y) for y in years]
    yr_sel = col_yr.selectbox("Season", yr_options, index=0, key="ma_yr")

    if team_a == team_b:
        st.warning("Please select two different teams.")
        st.stop()

    if yr_sel == "All seasons":
        a_data = df[df["school"] == team_a]
        b_data = df[df["school"] == team_b]
        yr_label = "all seasons"
    else:
        yr = int(yr_sel)
        a_data = df[(df["school"] == team_a) & (df["year"] == yr)]
        b_data = df[(df["school"] == team_b) & (df["year"] == yr)]
        yr_label = yr_sel

    missing = []
    if a_data.empty: missing.append(team_a.title())
    if b_data.empty: missing.append(team_b.title())
    if missing:
        st.warning(f"No data for {', '.join(missing)} in {yr_label}.")
        st.stop()

    # ── Summary metrics ───────────────────────────────────────────────────────
    a_win = a_data["ivy_win_pct"].mean() if "ivy_win_pct" in a_data.columns else 0.5
    b_win = b_data["ivy_win_pct"].mean() if "ivy_win_pct" in b_data.columns else 0.5
    prob_a = float(np.clip(0.5 + (a_win - b_win) * 0.35, 0.10, 0.90))

    m1, m2, m3 = st.columns(3)
    m1.metric(f"{team_a.title()} win %", f"{a_win:.1%}")
    m2.metric("Est. win probability",
              f"{prob_a:.0%} / {1-prob_a:.0%}",
              help=f"{team_a.title()} / {team_b.title()} — historical-record estimate only")
    m3.metric(f"{team_b.title()} win %", f"{b_win:.1%}")

    st.caption(
        "Win probability is estimated from historical Ivy win %, not a play-based model. "
        "Load real schedule data and run the roster model for a data-driven prediction."
    )
    st.markdown("---")

    # ── Style score comparison ─────────────────────────────────────────────────
    style_avail = [c for c in STYLE_COLS if c in df.columns]
    if style_avail:
        a_avg = a_data[style_avail].mean()
        b_avg = b_data[style_avail].mean()

        st.subheader("Style Profile Comparison")
        labels = [STYLE_LABELS[c] for c in style_avail]

        fig = go.Figure()
        fig.add_trace(go.Bar(
            name=team_a.title(), x=labels, y=a_avg.values,
            marker_color=SCHOOL_COLORS.get(team_a, DEFAULT_COLOR), opacity=0.88,
        ))
        fig.add_trace(go.Bar(
            name=team_b.title(), x=labels, y=b_avg.values,
            marker_color=SCHOOL_COLORS.get(team_b, DEFAULT_COLOR), opacity=0.88,
        ))
        fig.update_layout(
            **_LAYOUT, barmode="group",
            yaxis=dict(range=[0, 1.05], title="Score (0 – 1)"),
            legend=dict(orientation="h", y=1.12),
            height=340,
        )
        st.plotly_chart(fig, use_container_width=True)

        # Advantage table
        adv_rows = []
        for c in style_avail:
            diff = float(a_avg[c] - b_avg[c])
            if abs(diff) < 0.05:
                edge = "Even"
            elif diff > 0:
                edge = f"{team_a.title()}  +{diff:.2f}"
            else:
                edge = f"{team_b.title()}  +{abs(diff):.2f}"
            adv_rows.append({"Style metric": STYLE_LABELS[c],
                             "What it measures": STYLE_DESC[c],
                             "Edge": edge})
        st.dataframe(pd.DataFrame(adv_rows), hide_index=True, use_container_width=True)

        st.markdown("---")

        # ── Radar overlay ──────────────────────────────────────────────────────
        st.subheader("Radar Overlay")
        cats = [STYLE_LABELS[c] for c in style_avail] + [STYLE_LABELS[style_avail[0]]]
        fig2 = go.Figure()
        for team, avg in [(team_a, a_avg), (team_b, b_avg)]:
            vals = list(avg.values) + [avg.values[0]]
            fig2.add_trace(go.Scatterpolar(
                r=vals, theta=cats, fill="toself",
                name=team.title(),
                line_color=SCHOOL_COLORS.get(team, DEFAULT_COLOR),
                opacity=0.70,
            ))
        fig2.update_layout(
            **_LAYOUT,
            polar=dict(radialaxis=dict(visible=True, range=[0, 1],
                                       tickfont=dict(size=10))),
            legend=dict(orientation="h", y=-0.12),
            height=400,
        )
        st.plotly_chart(fig2, use_container_width=True)
    else:
        st.info("Style score columns not yet computed — run notebooks 01–02.")

    # ── Head-to-head record ────────────────────────────────────────────────────
    st.markdown("---")
    st.subheader("Head-to-Head Record")
    sched = data.get("schedules", pd.DataFrame())
    if sched.empty:
        st.info("No schedule data loaded — run `01_scrape.ipynb` to see historical H2H results.")
    else:
        sc = sched.copy()
        sc.columns = sc.columns.str.lower()
        opp_col    = next((c for c in sc.columns if c in ("opponent", "opp", "school_name")), None)
        result_col = next((c for c in sc.columns if c in ("result", "w/l", "wl")), None)
        if opp_col and result_col and "school" in sc.columns:
            sc["school"]  = sc["school"].str.lower().str.strip()
            sc[opp_col]   = sc[opp_col].str.lower().str.strip()
            h2h = sc[
                ((sc["school"] == team_a) & (sc[opp_col] == team_b)) |
                ((sc["school"] == team_b) & (sc[opp_col] == team_a))
            ].copy()

            if h2h.empty:
                st.info(f"No H2H games found between {team_a.title()} and {team_b.title()} in the schedule file.")
            else:
                h2h["win"] = h2h[result_col].str.upper().str.startswith("W").astype(int)
                a_wins = int(((h2h["school"] == team_a) & (h2h["win"] == 1)).sum())
                b_wins = int(((h2h["school"] == team_b) & (h2h["win"] == 1)).sum())
                st.markdown(
                    f"**{team_a.title()}** {a_wins} — {b_wins} **{team_b.title()}**  "
                    f"({len(h2h)} games in dataset)"
                )
                with st.expander("Game-by-game results"):
                    show_cols = [c for c in ["year", "school", opp_col, result_col, "home_away"]
                                 if c in h2h.columns]
                    st.dataframe(h2h[show_cols].sort_values("year", ascending=False),
                                 hide_index=True, use_container_width=True)
        else:
            st.warning("Schedule data is missing required columns (school, opponent, result).")

    # ── Roster model ───────────────────────────────────────────────────────────
    if not using_demo and not sched.empty:
        st.markdown("---")
        with st.expander("Roster model — CV score and feature importances"):
            try:
                from src.models import build_game_dataset, train_roster_model
                game_df = build_game_dataset(df, sched)
                if len(game_df) >= 30:
                    result = train_roster_model(game_df)
                    st.metric("5-fold CV ROC-AUC",
                              f"{result['cv_auc_mean']:.3f} ± {result['cv_auc_std']:.3f}")
                    imp = result["importances"].head(12).reset_index()
                    imp.columns = ["Feature", "Importance"]
                    fig_imp = px.bar(imp[::-1], x="Importance", y="Feature",
                                     orientation="h",
                                     color_discrete_sequence=[DEFAULT_COLOR])
                    fig_imp.update_layout(**_LAYOUT, height=360)
                    st.plotly_chart(fig_imp, use_container_width=True)
                else:
                    st.info(f"Not enough labeled game rows ({len(game_df)}) to train the model.")
            except Exception as exc:
                st.info(f"Model training unavailable: {exc}")


# ═══════════════════════════════════════════════════════════════════════════════
# PAGE: DOWN & DISTANCE
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "Down & Distance":
    st.markdown("# Down & Distance Tendencies")
    st.markdown(
        "How does Ivy play-calling change by down and yards to go? "
        "This section estimates run/pass rates by situation from each team's season-level pass rate, "
        "combined with typical Ivy / FCS down-and-distance tendency patterns."
    )
    st.warning(
        "**Methodology note** — Ivy League play-by-play data is not publicly available. "
        "These estimates are derived from season-level pass rates using empirical down/distance "
        "multipliers (e.g., 3rd-and-long → pass-heavy). They reflect real team tendencies but "
        "are not counted from actual play logs.",
        icon="📐",
    )
    st.markdown("---")

    src = data["stats"] if not data["stats"].empty else df
    if "pass_rate" not in src.columns:
        st.warning("No `pass_rate` column found — run `01_scrape.ipynb` first.")
        st.stop()

    schools  = sorted(src["school"].unique())
    yr_min, yr_max = int(src["year"].min()), int(src["year"].max())
    col_sch, col_yr = st.columns([3, 2])
    sel_schools = col_sch.multiselect("Schools", schools, default=schools, key="dd_sch")
    yr_range = col_yr.slider("Seasons", yr_min, yr_max,
                             (max(yr_min, yr_max - 4), yr_max), key="dd_yr")

    filtered = src[src["school"].isin(sel_schools) & src["year"].between(*yr_range)]
    if filtered.empty:
        st.info("No data matches the selected filters.")
        st.stop()

    # ── Heatmap: pass rate by down × distance ──────────────────────────────────
    st.subheader("Estimated Pass Rate by Down and Distance")
    base_rate = float(filtered["pass_rate"].mean())
    dd_df = _down_distance_estimates(base_rate)

    pivot = dd_df.pivot(index="Down", columns="Distance", values="Pass Rate")
    pivot = pivot.reindex(["1st", "2nd", "3rd", "4th"])
    pivot = pivot[["Short (1-3 yds)", "Medium (4-6 yds)", "Long (7+ yds)"]]

    fig_heat = px.imshow(
        pivot,
        color_continuous_scale="RdYlGn",
        zmin=0, zmax=1,
        text_auto=".0%",
        labels={"color": "Pass Rate"},
        aspect="auto",
    )
    fig_heat.update_coloraxes(colorbar_tickformat=".0%")
    fig_heat.update_layout(**_LAYOUT, height=280,
                           xaxis_title="Distance to go",
                           yaxis_title="Down")
    st.plotly_chart(fig_heat, use_container_width=True)

    st.caption(
        f"Based on {len(filtered)} team-seasons for {', '.join(s.title() for s in sel_schools)}, "
        f"{yr_range[0]}–{yr_range[1]}. "
        f"Average season pass rate: {base_rate:.1%}."
    )

    # ── Bar chart: run/pass split by down ─────────────────────────────────────
    st.markdown("---")
    st.subheader("Run / Pass Split by Down")
    by_down = dd_df.groupby("Down")[["Pass Rate", "Run Rate"]].mean().reset_index()
    by_down = by_down.set_index("Down").loc[["1st", "2nd", "3rd", "4th"]].reset_index()
    by_down_long = by_down.melt(id_vars="Down", var_name="Play type", value_name="Rate")
    fig_bar = px.bar(
        by_down_long, x="Down", y="Rate", color="Play type", barmode="stack",
        color_discrete_map={"Pass Rate": "#1a56db", "Run Rate": "#e87722"},
        labels={"Rate": "Estimated rate", "Down": ""},
        text_auto=".0%",
    )
    fig_bar.update_layout(**_LAYOUT, yaxis_tickformat=".0%", height=320,
                          legend=dict(orientation="h", y=1.08))
    st.plotly_chart(fig_bar, use_container_width=True)

    # ── Per-team comparison ────────────────────────────────────────────────────
    if len(sel_schools) > 1:
        st.markdown("---")
        st.subheader("Team Comparison: 3rd Down Pass Rate Estimate")
        team_rates = (filtered.groupby("school")["pass_rate"].mean()
                      .reset_index().rename(columns={"pass_rate": "Base Pass Rate"}))
        team_rates["3rd Down Pass Rate"] = team_rates["Base Pass Rate"].apply(
            lambda r: float(np.clip(r * 1.42, 0, 0.95))
        )
        team_rates = team_rates.sort_values("3rd Down Pass Rate", ascending=True)

        fig_t = px.bar(
            team_rates, x="3rd Down Pass Rate", y="school", orientation="h",
            color="school", color_discrete_map=SCHOOL_COLORS,
            labels={"school": "", "3rd Down Pass Rate": "Est. 3rd-down pass rate"},
        )
        fig_t.update_layout(**_LAYOUT, showlegend=False, xaxis_tickformat=".0%")
        st.plotly_chart(fig_t, use_container_width=True)

    # ── Natural language summary ───────────────────────────────────────────────
    st.markdown("---")
    st.subheader("Key Tendencies")
    third_pass = float(np.clip(base_rate * 1.42, 0, 0.95))
    first_run  = float(np.clip(1 - base_rate * 0.82, 0, 0.95))
    st.markdown(f"""
- **1st down**: Estimated **{first_run:.0%} run rate** — teams establish the run early and keep the defense honest.
- **2nd down**: Mix of run and pass depending on 1st-down gain. Neutral play-calling.
- **3rd down**: Pass-heavy — estimated **{third_pass:.0%} pass rate**. Short yardage tends to be sneaks/draws; medium/long is almost always a passing situation.
- **4th down**: Mostly punts and field goals; when teams go for it, short-yardage run is common.
- **Long yardage** (7+ to go) on any down shifts dramatically toward the pass across all teams.
""")


# ═══════════════════════════════════════════════════════════════════════════════
# PAGE: TEAM STATS
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "Team Stats":
    st.markdown("# Team Statistics Explorer")
    st.markdown("---")

    src = data["stats"] if not data["stats"].empty else df
    schools  = sorted(src["school"].unique())
    yr_min, yr_max = int(src["year"].min()), int(src["year"].max())

    col_f1, col_f2 = st.columns([3, 2])
    sel_schools = col_f1.multiselect("Schools", schools, default=schools, key="ts_schools")
    yr_range = col_f2.slider("Season range", yr_min, yr_max, (yr_min, yr_max), key="ts_years")

    filtered = src[src["school"].isin(sel_schools) & src["year"].between(*yr_range)]

    if filtered.empty:
        st.info("No data matches the selected filters.")
        st.stop()

    numeric_cols = [c for c in ["yards_per_play", "pass_rate", "havoc_rate",
                                 "pace_proxy", "ivy_win_pct", "explosiveness",
                                 "aggression", "pass_tendency", "tempo"]
                    if c in filtered.columns]

    if not numeric_cols:
        st.warning("No numeric metric columns found — run `01_scrape.ipynb` first.")
    else:
        c1, c2 = st.columns(2)
        x_axis = c1.selectbox("X axis", numeric_cols, index=0)
        y_axis = c2.selectbox("Y axis", numeric_cols, index=min(1, len(numeric_cols) - 1))

        fig = px.scatter(
            filtered, x=x_axis, y=y_axis,
            color="school", color_discrete_map=SCHOOL_COLORS,
            hover_data=["school", "year"] + numeric_cols,
            size_max=12,
            labels={x_axis: x_axis.replace("_", " ").title(),
                    y_axis: y_axis.replace("_", " ").title()},
        )
        fig.update_layout(**_LAYOUT)
        st.plotly_chart(fig, use_container_width=True)

        st.markdown("---")
        st.subheader("Season-by-Season Trend")
        metric = st.selectbox("Metric", numeric_cols, key="trend_metric")
        fig2 = px.line(
            filtered.sort_values("year"),
            x="year", y=metric, color="school",
            color_discrete_map=SCHOOL_COLORS, markers=True,
            labels={"year": "Season", metric: metric.replace("_", " ").title()},
        )
        fig2.update_layout(**_LAYOUT, legend=dict(orientation="h", y=-0.22))
        st.plotly_chart(fig2, use_container_width=True)

        with st.expander("Raw data table"):
            st.dataframe(
                filtered[["school", "year"] + numeric_cols]
                .sort_values(["school", "year"])
                .style.background_gradient(subset=numeric_cols, cmap="RdYlGn"),
                use_container_width=True,
            )

    # ── Home / Away win rates ──────────────────────────────────────────────────
    st.markdown("---")
    st.subheader("Home vs Away Win Rates")

    sched = data.get("schedules", pd.DataFrame())
    if sched.empty:
        st.info(
            "No schedule data loaded — run `01_scrape.ipynb` to see home/away splits. "
            "The schedule file should include a `home_away` column from the CFBD API."
        )
    else:
        sc = sched.copy()
        sc.columns = sc.columns.str.lower()

        result_col  = next((c for c in sc.columns if c in ("result", "w/l", "wl")), None)
        ha_col      = next((c for c in sc.columns if c in ("home_away", "location")), None)

        if result_col is None:
            st.warning("Schedule file has no result column (result / w/l / wl).")
        elif ha_col is None:
            st.warning(
                "Schedule file has no home_away column. "
                "Re-run the scraper — `cfbd_games()` returns a `home_away` field."
            )
        else:
            sc["school"] = sc["school"].str.lower().str.strip()
            sc["win"]    = sc[result_col].str.upper().str.startswith("W").astype(int)
            sc_filt = sc[
                sc["school"].isin(sel_schools) &
                sc["year"].between(*yr_range)
            ]

            if sc_filt.empty:
                st.info("No schedule rows match the current school / year filters.")
            else:
                ha_filter = st.radio(
                    "Show games", ["All", "Home only", "Away only"],
                    horizontal=True, key="ha_filter",
                )
                if ha_filter == "Home only":
                    sc_filt = sc_filt[sc_filt[ha_col].str.lower().str.contains("home", na=False)]
                elif ha_filter == "Away only":
                    sc_filt = sc_filt[sc_filt[ha_col].str.lower().str.contains("away", na=False)]

                if sc_filt.empty:
                    st.info(f"No {ha_filter.lower()} games found for the selected filters.")
                else:
                    ha_summary = (sc_filt.groupby(["school", ha_col])["win"]
                                  .agg(["mean", "count"]).reset_index()
                                  .rename(columns={"mean": "win_pct", "count": "games",
                                                   ha_col: "Location"}))
                    ha_summary["school"] = ha_summary["school"].str.title()
                    fig_ha = px.bar(
                        ha_summary, x="school", y="win_pct", color="Location",
                        barmode="group", text_auto=".0%",
                        labels={"win_pct": "Win %", "school": ""},
                    )
                    fig_ha.add_hline(y=0.5, line_dash="dash", line_color="#64748b",
                                     annotation_text=".500")
                    fig_ha.update_layout(**_LAYOUT, yaxis_tickformat=".0%",
                                         legend=dict(orientation="h", y=1.1))
                    st.plotly_chart(fig_ha, use_container_width=True)

                    with st.expander("Home/away detail table"):
                        st.dataframe(ha_summary, hide_index=True, use_container_width=True)


# ═══════════════════════════════════════════════════════════════════════════════
# PAGE: SCHEME DETECTOR
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "Scheme Detector":
    st.markdown("# Scheme Detector")
    st.markdown("Adjust thresholds to reclassify every team-season. Labels update live.")
    st.markdown("---")

    style_cols = ["pass_tendency", "tempo", "spread_factor",
                  "explosiveness", "aggression", "front_heaviness"]
    available  = [c for c in style_cols if c in df.columns]

    if not available:
        st.error("No style score columns found. Run notebook 02 first.")
        st.stop()

    with st.sidebar:
        st.markdown("### Detection Thresholds")
        thresholds = {
            "pass":       st.slider("Pass tendency",   0.0, 1.0, 0.55, 0.01),
            "tempo":      st.slider("Tempo",            0.0, 1.0, 0.55, 0.01),
            "spread":     st.slider("Spread factor",   0.0, 1.0, 0.55, 0.01),
            "explosive":  st.slider("Explosiveness",   0.0, 1.0, 0.55, 0.01),
            "aggression": st.slider("Def. aggression", 0.0, 1.0, 0.55, 0.01),
            "front":      st.slider("Front heaviness", 0.0, 1.0, 0.55, 0.01),
        }

    labeled = df.copy()
    labeled[["off_scheme", "def_scheme"]] = labeled.apply(
        lambda r: pd.Series(scheme_label(r, thresholds)), axis=1
    )

    schools = sorted(labeled["school"].unique())
    sel = st.multiselect("Filter schools", schools, default=schools)
    view = labeled[labeled["school"].isin(sel)]

    if view.empty:
        st.info("No data matches the selected schools.")
        st.stop()

    st.subheader("Style Scores Heatmap")
    heat_metric = st.selectbox("Metric", available, key="heat_m")
    pivot = view.pivot_table(index="school", columns="year", values=heat_metric)
    fig = px.imshow(pivot, color_continuous_scale="RdYlGn", aspect="auto",
                    labels={"color": STYLE_LABELS.get(heat_metric, heat_metric)},
                    title=f"{STYLE_LABELS.get(heat_metric, heat_metric)} — School × Year")
    fig.update_layout(**_LAYOUT)
    st.plotly_chart(fig, use_container_width=True)

    st.subheader("Scheme Labels")
    display_cols = ["school", "year", "off_scheme", "def_scheme"] + available
    st.dataframe(
        view[display_cols].sort_values(["school", "year"])
        .style.background_gradient(subset=[c for c in available if c in view.columns],
                                   cmap="RdYlGn"),
        use_container_width=True, height=380,
    )

    st.markdown("---")
    st.subheader("Label Distribution (current thresholds)")
    c1, c2 = st.columns(2)
    with c1:
        oc = view["off_scheme"].value_counts().reset_index()
        oc.columns = ["scheme", "n"]
        fig2 = px.bar(oc, x="n", y="scheme", orientation="h", color="scheme",
                      title="Offensive", color_discrete_sequence=px.colors.qualitative.Set2)
        fig2.update_layout(**_LAYOUT, showlegend=False)
        st.plotly_chart(fig2, use_container_width=True)
    with c2:
        dc = view["def_scheme"].value_counts().reset_index()
        dc.columns = ["scheme", "n"]
        fig3 = px.bar(dc, x="n", y="scheme", orientation="h", color="scheme",
                      title="Defensive", color_discrete_sequence=px.colors.qualitative.Pastel)
        fig3.update_layout(**_LAYOUT, showlegend=False)
        st.plotly_chart(fig3, use_container_width=True)


# ═══════════════════════════════════════════════════════════════════════════════
# PAGE: SCHEME vs WINS
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "Scheme vs Wins":
    st.markdown("# Scheme Effect on Wins")
    st.markdown("---")

    if "ivy_win_pct" not in df.columns or "off_scheme" not in df.columns:
        st.warning("Need `ivy_win_pct` and scheme labels. Run notebooks 01–02 first.")
        st.stop()

    c1, c2 = st.columns(2)
    with c1:
        st.subheader("Offensive Scheme")
        off_grp = (df.groupby("off_scheme")["ivy_win_pct"]
                   .agg(["mean", "std", "count"]).reset_index()
                   .rename(columns={"mean": "avg", "std": "sd", "count": "n"})
                   .sort_values("avg", ascending=False))
        fig = go.Figure()
        fig.add_trace(go.Bar(
            x=off_grp["off_scheme"], y=off_grp["avg"],
            error_y=dict(type="data", array=off_grp["sd"].fillna(0), visible=True),
            marker_color=px.colors.qualitative.Set2[:len(off_grp)],
            text=off_grp["n"].apply(lambda n: f"n={n}"),
            textposition="outside",
        ))
        fig.add_hline(y=0.5, line_dash="dash", line_color="#94a3b8",
                      annotation_text=".500")
        fig.update_layout(**_LAYOUT, yaxis_tickformat=".0%",
                          yaxis_title="Avg Ivy Win %", xaxis_tickangle=-20)
        st.plotly_chart(fig, use_container_width=True)

    with c2:
        st.subheader("Defensive Scheme")
        def_grp = (df.groupby("def_scheme")["ivy_win_pct"]
                   .agg(["mean", "std", "count"]).reset_index()
                   .rename(columns={"mean": "avg", "std": "sd", "count": "n"})
                   .sort_values("avg", ascending=False))
        fig2 = go.Figure()
        fig2.add_trace(go.Bar(
            x=def_grp["def_scheme"], y=def_grp["avg"],
            error_y=dict(type="data", array=def_grp["sd"].fillna(0), visible=True),
            marker_color=px.colors.qualitative.Pastel[:len(def_grp)],
            text=def_grp["n"].apply(lambda n: f"n={n}"),
            textposition="outside",
        ))
        fig2.add_hline(y=0.5, line_dash="dash", line_color="#94a3b8",
                       annotation_text=".500")
        fig2.update_layout(**_LAYOUT, yaxis_tickformat=".0%",
                           yaxis_title="Avg Ivy Win %", xaxis_tickangle=-20)
        st.plotly_chart(fig2, use_container_width=True)

    st.markdown("---")
    st.subheader("Win % Distribution by Offensive Scheme")
    fig3 = px.box(df, x="off_scheme", y="ivy_win_pct", color="off_scheme",
                  points="all", color_discrete_sequence=px.colors.qualitative.Set2,
                  labels={"ivy_win_pct": "Ivy Win %", "off_scheme": ""})
    fig3.add_hline(y=0.5, line_dash="dash", line_color="#94a3b8")
    fig3.update_layout(**_LAYOUT, showlegend=False,
                       yaxis_tickformat=".0%", xaxis_tickangle=-15)
    st.plotly_chart(fig3, use_container_width=True)

    # Panel regression
    st.markdown("---")
    st.subheader("Panel Regression — Scheme Effects (school + year fixed effects)")
    needed = ["ivy_win_pct", "off_scheme", "def_scheme", "school", "year"]
    reg_df = df[needed].dropna() if all(c in df.columns for c in needed) else pd.DataFrame()

    if len(reg_df) < 20:
        st.info("Regression requires ≥20 labeled team-seasons. Run notebooks 01–02 first.")
    else:
        try:
            import statsmodels.formula.api as smf
            model = smf.ols(
                "ivy_win_pct ~ C(off_scheme) + C(def_scheme) + C(school) + C(year)",
                data=reg_df
            ).fit(cov_type="HC3")

            coef = (pd.DataFrame({
                "coef":   model.params,
                "ci_lo":  model.conf_int()[0],
                "ci_hi":  model.conf_int()[1],
                "pvalue": model.pvalues,
            }).reset_index().rename(columns={"index": "term"}))
            coef = coef[~coef["term"].str.startswith(("C(school)", "C(year)", "Intercept"))]
            coef = coef.sort_values("coef")

            fig4 = go.Figure()
            colors = ["#22c55e" if c > 0 else "#ef4444" for c in coef["coef"]]
            fig4.add_trace(go.Bar(
                x=coef["coef"], y=coef["term"], orientation="h",
                marker_color=colors,
                error_x=dict(
                    type="data",
                    array=(coef["ci_hi"] - coef["coef"]).tolist(),
                    arrayminus=(coef["coef"] - coef["ci_lo"]).tolist(),
                    visible=True,
                ),
                text=coef["pvalue"].apply(lambda p: f"p={p:.3f}"),
                textposition="outside",
            ))
            fig4.add_vline(x=0, line_dash="dash", line_color="#94a3b8")
            fig4.update_layout(**_LAYOUT,
                               xaxis_title="Effect on Ivy Win % (vs. baseline scheme)",
                               height=max(300, len(coef) * 42))
            st.plotly_chart(fig4, use_container_width=True)

            with st.expander("Full regression summary"):
                st.text(model.summary().as_text())
        except Exception as exc:
            st.info(f"Regression could not run: {exc}")


# ═══════════════════════════════════════════════════════════════════════════════
# PAGE: ROSTER ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "Roster Analysis":
    st.markdown("# Roster Composition Analysis")
    st.markdown("---")

    roster_metrics = [c for c in [
        "OL_avg_weight", "SKILL_avg_weight", "DL_avg_weight",
        "LB_avg_weight", "DB_avg_weight",
        "OL_avg_height", "SKILL_avg_height",
        "DL_to_LB_weight_ratio", "OL_vs_DL_weight_diff",
        "roster_depth", "upperclassman_ratio",
    ] if c in df.columns]

    if not roster_metrics:
        st.warning("No roster feature columns found. Run notebooks 01–02 to build them.")
        st.stop()

    schools = sorted(df["school"].unique())
    sel = st.multiselect("Schools", schools, default=schools, key="ros_schools")
    view = df[df["school"].isin(sel)]

    if view.empty:
        st.info("No data matches the selected schools.")
        st.stop()

    # ── Position group weight profile (Ivy-relative) ──────────────────────────
    weight_cols = [c for c in ["OL_avg_weight", "SKILL_avg_weight", "DL_avg_weight",
                                "LB_avg_weight", "DB_avg_weight"] if c in view.columns]
    if weight_cols:
        st.subheader("Position Group Weight Profile (within-Ivy comparison)")

        with st.expander("How to read this chart", expanded=False):
            st.markdown("""
**What it shows:** Average weight (lbs) per position group, normalized to a 0–1 scale
*within this dataset*. A score of 1.0 means that school's average weight for that position
group is the highest in the Ivy League over the selected seasons; 0.0 is the lowest.

**What it does NOT show:** Comparison to NFL or FBS standards.
Ivy weights are significantly lighter than NFL averages (e.g., Ivy OL ~285 lbs vs.
NFL OL ~315 lbs). These scores reflect where each Ivy program sits *relative to
its conference peers only*.

**Inputs:** Average player weight per position group, aggregated across all
available seasons for each school.

**Limitations:** Weight data depends on roster scraping completeness. Gaps in
roster data will distort school comparisons. Demo data uses randomly generated weights.
""")

        school_avgs = view.groupby("school")[weight_cols].mean()
        normed = ((school_avgs - school_avgs.min())
                  / (school_avgs.max() - school_avgs.min() + 1e-9))

        fig = go.Figure()
        for school, row in normed.iterrows():
            vals = row.tolist() + [row.tolist()[0]]
            cats = [m.replace("_avg_weight", "").upper() for m in weight_cols]
            cats += [cats[0]]
            fig.add_trace(go.Scatterpolar(
                r=vals, theta=cats, fill="toself",
                name=school.title(),
                line_color=SCHOOL_COLORS.get(school, DEFAULT_COLOR),
                opacity=0.75,
            ))
        fig.update_layout(
            **_LAYOUT,
            polar=dict(radialaxis=dict(visible=True, range=[0, 1])),
            legend=dict(orientation="h", y=-0.15),
            height=420,
        )
        st.plotly_chart(fig, use_container_width=True)

        # Actual weight table for context
        with st.expander("Actual average weights (lbs)"):
            wt_display = school_avgs.copy()
            wt_display.columns = [c.replace("_avg_weight", "").upper() for c in wt_display.columns]
            st.dataframe(wt_display.style.background_gradient(cmap="Blues"),
                         use_container_width=True)

    # ── Weight trends over time ────────────────────────────────────────────────
    st.markdown("---")
    st.subheader("Weight Trends Over Time")
    wt_choices = [c for c in roster_metrics
                  if "weight" in c and "ratio" not in c and "diff" not in c]
    if wt_choices:
        wt_metric = st.selectbox("Position group weight", wt_choices, key="wt_sel")
        fig2 = px.line(
            view.sort_values("year"),
            x="year", y=wt_metric, color="school",
            color_discrete_map=SCHOOL_COLORS, markers=True,
            labels={"year": "Season", wt_metric: wt_metric.replace("_", " ").title()},
        )
        fig2.update_layout(**_LAYOUT, legend=dict(orientation="h", y=-0.22))
        st.plotly_chart(fig2, use_container_width=True)

    # ── Roster metric vs win % ────────────────────────────────────────────────
    if "ivy_win_pct" in view.columns:
        st.markdown("---")
        st.subheader("Roster Feature vs Win %")
        sel_metric = st.selectbox("Roster metric", roster_metrics, key="ros_win")
        sub = view[["school", "year", sel_metric, "ivy_win_pct"]].dropna()
        if sub.empty:
            st.info("Not enough data for this metric.")
        else:
            fig3 = px.scatter(
                sub, x=sel_metric, y="ivy_win_pct",
                color="school", color_discrete_map=SCHOOL_COLORS,
                trendline="ols",
                hover_data=["school", "year"],
                labels={sel_metric: sel_metric.replace("_", " ").title(),
                        "ivy_win_pct": "Ivy Win %"},
            )
            fig3.update_layout(**_LAYOUT, yaxis_tickformat=".0%")
            st.plotly_chart(fig3, use_container_width=True)

    # ── Full roster metrics table ──────────────────────────────────────────────
    st.markdown("---")
    with st.expander("Full roster metrics table"):
        display = view[["school", "year"] + roster_metrics].sort_values(["school", "year"])
        st.dataframe(
            display.style.background_gradient(subset=roster_metrics, cmap="Blues"),
            use_container_width=True, height=400,
        )
