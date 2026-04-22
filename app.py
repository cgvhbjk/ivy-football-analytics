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
from plotly.subplots import make_subplots
import streamlit as st

# ── page config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Ivy Football Analytics",
    page_icon="🏈",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── colour palette ────────────────────────────────────────────────────────────
SCHOOL_COLORS = {
    "brown":       "#4E3629",
    "columbia":    "#75AADB",
    "cornell":     "#B31B1B",
    "dartmouth":   "#00693E",
    "harvard":     "#A51C30",
    "pennsylvania":"#990000",
    "princeton":   "#FF8F00",
    "yale":        "#00356B",
}
DEFAULT_COLOR = "#4F8EF7"

# ── helpers ───────────────────────────────────────────────────────────────────
DATA_DIR = Path("data")


@st.cache_data(show_spinner=False)
def load_data():
    paths = {
        "stats":     DATA_DIR / "raw/team_stats/team_stats_raw.csv",
        "rosters":   DATA_DIR / "raw/rosters/rosters_raw.csv",
        "schedules": DATA_DIR / "raw/schedules/schedules_raw.csv",
        "master":    DATA_DIR / "processed/master_labeled.csv",
    }
    out = {}
    for key, p in paths.items():
        if p.exists():
            out[key] = pd.read_csv(p)
        else:
            out[key] = pd.DataFrame()
    return out


def demo_data():
    """Synthetic data so every page renders even before scraping runs."""
    rng = np.random.default_rng(42)
    schools = list(SCHOOL_COLORS.keys())
    years = list(range(2005, 2025))
    rows = []
    for s in schools:
        base_win = rng.uniform(0.3, 0.7)
        for y in years:
            rows.append({
                "school": s, "year": y,
                "ivy_win_pct": np.clip(base_win + rng.normal(0, 0.12), 0, 1),
                "yards_per_play": rng.uniform(4.5, 6.8),
                "pass_rate": rng.uniform(0.38, 0.68),
                "havoc_rate": rng.uniform(0.04, 0.14),
                "pace_proxy": rng.uniform(60, 90),
                "pass_tendency": rng.uniform(0, 1),
                "tempo": rng.uniform(0, 1),
                "spread_factor": rng.uniform(0, 1),
                "explosiveness": rng.uniform(0, 1),
                "aggression": rng.uniform(0, 1),
                "front_heaviness": rng.uniform(0, 1),
                "OL_avg_weight": rng.uniform(270, 310),
                "SKILL_avg_weight": rng.uniform(185, 215),
                "DL_avg_weight": rng.uniform(255, 295),
                "LB_avg_weight": rng.uniform(220, 245),
                "DB_avg_weight": rng.uniform(185, 205),
                "upperclassman_ratio": rng.uniform(0.4, 0.7),
                "roster_depth": rng.integers(55, 85),
                "off_scheme": rng.choice(["Air Raid / Spread RPO", "Pro-Style / Power Run",
                                           "West Coast / Pro Pass", "Spread Run / Option",
                                           "Spread Pass"]),
                "def_scheme": rng.choice(["4-3 Base", "3-4 / 3-3-5",
                                           "Aggressive 4-3", "Attacking (3-4 / Bear)"]),
            })
    return pd.DataFrame(rows)


def scheme_label(row, thresholds):
    pt = row.get("pass_tendency", np.nan)
    tp = row.get("tempo", np.nan)
    sf = row.get("spread_factor", np.nan)
    ag = row.get("aggression", np.nan)
    fh = row.get("front_heaviness", np.nan)

    def v(x): return not (isinstance(x, float) and np.isnan(x))

    if v(pt) and pt >= thresholds["pass"]:
        off = ("Air Raid / Spread RPO" if v(tp) and tp >= thresholds["tempo"]
               else "Spread Pass" if v(sf) and sf >= thresholds["spread"]
               else "West Coast / Pro Pass")
    else:
        off = ("Spread Run / Option" if v(tp) and tp >= thresholds["tempo"]
               else "Spread Run" if v(sf) and sf >= thresholds["spread"]
               else "Pro-Style / Power Run")

    def_ = ("Attacking (3-4 / Bear)" if v(ag) and ag >= thresholds["aggression"] and v(fh) and fh < thresholds["front"]
            else "Aggressive 4-3" if v(ag) and ag >= thresholds["aggression"]
            else "4-3 Base" if v(fh) and fh >= thresholds["front"]
            else "3-4 / 3-3-5")
    return off, def_


# ── sidebar ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("## 🏈 Ivy Football")
    st.markdown("---")
    page = st.radio(
        "Navigate",
        ["Overview", "Team Stats", "Scheme Detector", "Scheme vs Wins", "Roster Analysis"],
        label_visibility="collapsed",
    )
    st.markdown("---")
    st.caption("Data: Sports-Reference NCAAF · 2005–2024")

data = load_data()
has_real = not data["master"].empty or not data["stats"].empty
df = data["master"] if not data["master"].empty else demo_data()
if data["master"].empty:
    st.info("📊 Showing **demo data** — run `01_scrape.ipynb` to load real stats.", icon="ℹ️")


# ═══════════════════════════════════════════════════════════════════════════════
# PAGE: OVERVIEW
# ═══════════════════════════════════════════════════════════════════════════════
if page == "Overview":
    st.markdown("# Ivy League Football Analytics")
    st.markdown("Scheme detection, roster analysis, and win-probability modeling for all 8 Ivy schools · 2005–2024")
    st.markdown("---")

    # KPI row
    k1, k2, k3, k4 = st.columns(4)
    k1.metric("Schools", "8")
    k2.metric("Seasons", f"{df['year'].nunique()}")
    k3.metric("Team-seasons", f"{len(df):,}")
    k4.metric("Avg Ivy Win %", f"{df['ivy_win_pct'].mean():.1%}" if "ivy_win_pct" in df.columns else "—")

    st.markdown("---")
    col_l, col_r = st.columns([3, 2])

    with col_l:
        st.subheader("Ivy Win % Over Time")
        if "ivy_win_pct" in df.columns:
            fig = px.line(
                df.sort_values("year"),
                x="year", y="ivy_win_pct", color="school",
                color_discrete_map=SCHOOL_COLORS,
                labels={"ivy_win_pct": "Win %", "year": "Season", "school": "School"},
                markers=True,
            )
            fig.update_layout(
                plot_bgcolor="rgba(0,0,0,0)",
                paper_bgcolor="rgba(0,0,0,0)",
                legend=dict(orientation="h", y=-0.2),
                yaxis_tickformat=".0%",
                hovermode="x unified",
            )
            st.plotly_chart(fig, use_container_width=True)

    with col_r:
        st.subheader("Average Win % by School")
        avg = df.groupby("school")["ivy_win_pct"].mean().sort_values(ascending=True).reset_index()
        avg.columns = ["school", "avg_win_pct"]
        fig2 = px.bar(
            avg, x="avg_win_pct", y="school", orientation="h",
            color="school", color_discrete_map=SCHOOL_COLORS,
            labels={"avg_win_pct": "Avg Ivy Win %", "school": ""},
        )
        fig2.update_layout(
            plot_bgcolor="rgba(0,0,0,0)",
            paper_bgcolor="rgba(0,0,0,0)",
            showlegend=False,
            xaxis_tickformat=".0%",
        )
        st.plotly_chart(fig2, use_container_width=True)

    # Scheme distribution
    if "off_scheme" in df.columns:
        st.markdown("---")
        st.subheader("Scheme Distribution Across All Team-Seasons")
        c1, c2 = st.columns(2)
        with c1:
            off_counts = df["off_scheme"].value_counts().reset_index()
            off_counts.columns = ["scheme", "count"]
            fig3 = px.pie(off_counts, names="scheme", values="count",
                          title="Offensive Schemes",
                          color_discrete_sequence=px.colors.qualitative.Bold)
            fig3.update_layout(paper_bgcolor="rgba(0,0,0,0)")
            st.plotly_chart(fig3, use_container_width=True)
        with c2:
            def_counts = df["def_scheme"].value_counts().reset_index()
            def_counts.columns = ["scheme", "count"]
            fig4 = px.pie(def_counts, names="scheme", values="count",
                          title="Defensive Schemes",
                          color_discrete_sequence=px.colors.qualitative.Pastel)
            fig4.update_layout(paper_bgcolor="rgba(0,0,0,0)")
            st.plotly_chart(fig4, use_container_width=True)


# ═══════════════════════════════════════════════════════════════════════════════
# PAGE: TEAM STATS
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "Team Stats":
    st.markdown("# Team Statistics Explorer")
    st.markdown("---")

    src = data["stats"] if not data["stats"].empty else df

    schools = sorted(src["school"].unique())
    sel_schools = st.multiselect("Schools", schools, default=schools, key="ts_schools")
    year_min, year_max = int(src["year"].min()), int(src["year"].max())
    yr_range = st.slider("Season range", year_min, year_max, (year_min, year_max), key="ts_years")

    filtered = src[
        src["school"].isin(sel_schools) &
        src["year"].between(*yr_range)
    ]

    numeric_cols = [c for c in ["yards_per_play", "pass_rate", "havoc_rate",
                                 "pace_proxy", "ivy_win_pct", "explosiveness",
                                 "aggression", "pass_tendency", "tempo"]
                    if c in filtered.columns]

    if not numeric_cols:
        st.warning("No numeric metric columns found yet — run `01_scrape.ipynb` first.")
    else:
        c1, c2 = st.columns(2)
        x_axis = c1.selectbox("X axis", numeric_cols, index=0)
        y_axis = c2.selectbox("Y axis", numeric_cols, index=min(1, len(numeric_cols)-1))

        fig = px.scatter(
            filtered, x=x_axis, y=y_axis,
            color="school", color_discrete_map=SCHOOL_COLORS,
            hover_data=["school", "year"] + numeric_cols,
            size_max=12,
            labels={x_axis: x_axis.replace("_", " ").title(),
                    y_axis: y_axis.replace("_", " ").title()},
        )
        fig.update_layout(plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)")
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
        fig2.update_layout(plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
                           legend=dict(orientation="h", y=-0.2))
        st.plotly_chart(fig2, use_container_width=True)

        st.markdown("---")
        with st.expander("Raw data table"):
            st.dataframe(
                filtered[["school", "year"] + numeric_cols]
                .sort_values(["school", "year"])
                .style.background_gradient(subset=numeric_cols, cmap="RdYlGn"),
                use_container_width=True,
            )


# ═══════════════════════════════════════════════════════════════════════════════
# PAGE: SCHEME DETECTOR
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "Scheme Detector":
    st.markdown("# Scheme Detector")
    st.markdown("Drag the sliders to adjust detection thresholds. Labels update instantly.")
    st.markdown("---")

    style_cols = ["pass_tendency", "tempo", "spread_factor",
                  "explosiveness", "aggression", "front_heaviness"]
    available = [c for c in style_cols if c in df.columns]

    if not available:
        st.error("No style score columns found. Run notebook 02 first.")
    else:
        with st.sidebar:
            st.markdown("### Threshold Sliders")
            thresholds = {
                "pass":       st.slider("Pass tendency",   0.0, 1.0, 0.55, 0.01),
                "tempo":      st.slider("Tempo",            0.0, 1.0, 0.55, 0.01),
                "spread":     st.slider("Spread factor",   0.0, 1.0, 0.55, 0.01),
                "explosive":  st.slider("Explosiveness",   0.0, 1.0, 0.55, 0.01),
                "aggression": st.slider("Def aggression",  0.0, 1.0, 0.55, 0.01),
                "front":      st.slider("Front heaviness", 0.0, 1.0, 0.55, 0.01),
            }

        labeled = df.copy()
        labeled[["off_scheme", "def_scheme"]] = labeled.apply(
            lambda r: pd.Series(scheme_label(r, thresholds)), axis=1
        )

        # School filter
        schools = sorted(labeled["school"].unique())
        sel = st.multiselect("Filter schools", schools, default=schools)
        view = labeled[labeled["school"].isin(sel)]

        # Style score heatmap
        st.subheader("Style Scores Heatmap")
        heat_metric = st.selectbox("Metric to map", available, key="heat_m")
        pivot = view.pivot_table(index="school", columns="year", values=heat_metric)
        fig = px.imshow(
            pivot, color_continuous_scale="RdYlGn", aspect="auto",
            labels={"color": heat_metric.replace("_", " ").title()},
            title=f"{heat_metric.replace('_', ' ').title()} — School × Year",
        )
        fig.update_layout(paper_bgcolor="rgba(0,0,0,0)")
        st.plotly_chart(fig, use_container_width=True)

        # Scheme label table
        st.subheader("Scheme Labels")
        display_cols = ["school", "year", "off_scheme", "def_scheme"] + available
        st.dataframe(
            view[display_cols].sort_values(["school", "year"])
            .style.background_gradient(
                subset=[c for c in available if c in view.columns],
                cmap="RdYlGn"
            ),
            use_container_width=True,
            height=420,
        )

        # Distribution under current thresholds
        st.markdown("---")
        st.subheader("Label Distribution (current thresholds)")
        c1, c2 = st.columns(2)
        with c1:
            oc = view["off_scheme"].value_counts().reset_index()
            oc.columns = ["scheme", "n"]
            fig2 = px.bar(oc, x="n", y="scheme", orientation="h",
                          color="scheme", title="Offensive",
                          color_discrete_sequence=px.colors.qualitative.Bold)
            fig2.update_layout(showlegend=False, paper_bgcolor="rgba(0,0,0,0)",
                               plot_bgcolor="rgba(0,0,0,0)")
            st.plotly_chart(fig2, use_container_width=True)
        with c2:
            dc = view["def_scheme"].value_counts().reset_index()
            dc.columns = ["scheme", "n"]
            fig3 = px.bar(dc, x="n", y="scheme", orientation="h",
                          color="scheme", title="Defensive",
                          color_discrete_sequence=px.colors.qualitative.Pastel)
            fig3.update_layout(showlegend=False, paper_bgcolor="rgba(0,0,0,0)",
                               plot_bgcolor="rgba(0,0,0,0)")
            st.plotly_chart(fig3, use_container_width=True)


# ═══════════════════════════════════════════════════════════════════════════════
# PAGE: SCHEME vs WINS
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "Scheme vs Wins":
    st.markdown("# Scheme Effect on Wins")
    st.markdown("---")

    if "ivy_win_pct" not in df.columns or "off_scheme" not in df.columns:
        st.warning("Need `ivy_win_pct` and scheme labels. Run notebooks 01–02 first.")
    else:
        c1, c2 = st.columns(2)

        with c1:
            st.subheader("Offensive Scheme")
            off_grp = (df.groupby("off_scheme")["ivy_win_pct"]
                       .agg(["mean", "std", "count"])
                       .reset_index()
                       .rename(columns={"mean": "avg", "std": "sd", "count": "n"})
                       .sort_values("avg", ascending=False))
            fig = go.Figure()
            fig.add_trace(go.Bar(
                x=off_grp["off_scheme"], y=off_grp["avg"],
                error_y=dict(type="data", array=off_grp["sd"], visible=True),
                marker_color=px.colors.qualitative.Bold[:len(off_grp)],
                text=off_grp["n"].apply(lambda n: f"n={n}"),
                textposition="outside",
            ))
            fig.add_hline(y=0.5, line_dash="dash", line_color="gray", annotation_text="0.500")
            fig.update_layout(yaxis_tickformat=".0%", yaxis_title="Avg Ivy Win %",
                              plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
                              xaxis_tickangle=-20)
            st.plotly_chart(fig, use_container_width=True)

        with c2:
            st.subheader("Defensive Scheme")
            def_grp = (df.groupby("def_scheme")["ivy_win_pct"]
                       .agg(["mean", "std", "count"])
                       .reset_index()
                       .rename(columns={"mean": "avg", "std": "sd", "count": "n"})
                       .sort_values("avg", ascending=False))
            fig2 = go.Figure()
            fig2.add_trace(go.Bar(
                x=def_grp["def_scheme"], y=def_grp["avg"],
                error_y=dict(type="data", array=def_grp["sd"], visible=True),
                marker_color=px.colors.qualitative.Pastel[:len(def_grp)],
                text=def_grp["n"].apply(lambda n: f"n={n}"),
                textposition="outside",
            ))
            fig2.add_hline(y=0.5, line_dash="dash", line_color="gray", annotation_text="0.500")
            fig2.update_layout(yaxis_tickformat=".0%", yaxis_title="Avg Ivy Win %",
                               plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
                               xaxis_tickangle=-20)
            st.plotly_chart(fig2, use_container_width=True)

        st.markdown("---")
        st.subheader("Win % Distribution by Offensive Scheme")
        fig3 = px.box(
            df, x="off_scheme", y="ivy_win_pct", color="off_scheme",
            points="all",
            color_discrete_sequence=px.colors.qualitative.Bold,
            labels={"ivy_win_pct": "Ivy Win %", "off_scheme": ""},
        )
        fig3.add_hline(y=0.5, line_dash="dash", line_color="gray")
        fig3.update_layout(showlegend=False, plot_bgcolor="rgba(0,0,0,0)",
                           paper_bgcolor="rgba(0,0,0,0)", yaxis_tickformat=".0%",
                           xaxis_tickangle=-15)
        st.plotly_chart(fig3, use_container_width=True)

        # Regression output (if processed data has enough rows)
        st.markdown("---")
        st.subheader("Panel Regression (scheme effects, school + year FE)")
        needed = ["ivy_win_pct", "off_scheme", "def_scheme", "school", "year"]
        if all(c in df.columns for c in needed) and df[needed].dropna().__len__() >= 20:
            try:
                import statsmodels.formula.api as smf
                reg_df = df[needed].dropna()
                model = smf.ols("ivy_win_pct ~ C(off_scheme) + C(def_scheme) + C(school) + C(year)",
                                data=reg_df).fit(cov_type="HC3")
                coef = pd.DataFrame({
                    "coef": model.params,
                    "ci_lo": model.conf_int()[0],
                    "ci_hi": model.conf_int()[1],
                    "pvalue": model.pvalues,
                }).reset_index().rename(columns={"index": "term"})
                coef = coef[~coef["term"].str.startswith(("C(school)", "C(year)", "Intercept"))]
                coef = coef.sort_values("coef")

                fig4 = go.Figure()
                colors = ["#2ecc71" if c > 0 else "#e74c3c" for c in coef["coef"]]
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
                fig4.add_vline(x=0, line_dash="dash", line_color="gray")
                fig4.update_layout(
                    xaxis_title="Effect on Ivy Win % (vs. baseline scheme)",
                    plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
                    height=max(300, len(coef) * 40),
                )
                st.plotly_chart(fig4, use_container_width=True)
                with st.expander("Full regression summary"):
                    st.text(model.summary().as_text())
            except Exception as e:
                st.info(f"Regression needs more data points. ({e})")
        else:
            st.info("Regression requires ≥20 labeled team-seasons. Run notebooks 01–02 first.")


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
    else:
        schools = sorted(df["school"].unique())
        sel = st.multiselect("Schools", schools, default=schools, key="ros_schools")
        view = df[df["school"].isin(sel)]

        # Radar chart — avg profile per school
        st.subheader("Physical Profile Radar")
        radar_metrics = [c for c in ["OL_avg_weight", "SKILL_avg_weight", "DL_avg_weight",
                                      "LB_avg_weight", "DB_avg_weight"] if c in view.columns]
        if radar_metrics:
            school_avgs = view.groupby("school")[radar_metrics].mean()
            # Normalise to [0,1] for radar
            normed = (school_avgs - school_avgs.min()) / (school_avgs.max() - school_avgs.min() + 1e-9)

            fig = go.Figure()
            for school, row in normed.iterrows():
                vals = row.tolist() + [row.tolist()[0]]
                cats = [m.replace("_avg_weight", "").upper() for m in radar_metrics]
                cats += [cats[0]]
                fig.add_trace(go.Scatterpolar(
                    r=vals, theta=cats, fill="toself", name=school.title(),
                    line_color=SCHOOL_COLORS.get(school, DEFAULT_COLOR),
                ))
            fig.update_layout(
                polar=dict(radialaxis=dict(visible=True, range=[0, 1])),
                paper_bgcolor="rgba(0,0,0,0)",
                legend=dict(orientation="h", y=-0.15),
            )
            st.plotly_chart(fig, use_container_width=True)

        # Weight trends over time
        st.markdown("---")
        st.subheader("Weight Trends Over Time")
        wt_metric = st.selectbox("Position group weight",
                                  [c for c in roster_metrics if "weight" in c and "ratio" not in c and "diff" not in c],
                                  key="wt_sel")
        fig2 = px.line(
            view.sort_values("year"),
            x="year", y=wt_metric, color="school",
            color_discrete_map=SCHOOL_COLORS, markers=True,
            labels={"year": "Season", wt_metric: wt_metric.replace("_", " ").title()},
        )
        fig2.update_layout(plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
                           legend=dict(orientation="h", y=-0.2))
        st.plotly_chart(fig2, use_container_width=True)

        # Roster metric vs win %
        if "ivy_win_pct" in view.columns:
            st.markdown("---")
            st.subheader("Roster Feature vs Win %")
            sel_metric = st.selectbox("Roster metric", roster_metrics, key="ros_win")
            sub = view[["school", "year", sel_metric, "ivy_win_pct"]].dropna()
            fig3 = px.scatter(
                sub, x=sel_metric, y="ivy_win_pct",
                color="school", color_discrete_map=SCHOOL_COLORS,
                trendline="ols",
                hover_data=["school", "year"],
                labels={sel_metric: sel_metric.replace("_", " ").title(),
                        "ivy_win_pct": "Ivy Win %"},
            )
            fig3.update_layout(plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
                               yaxis_tickformat=".0%")
            st.plotly_chart(fig3, use_container_width=True)

        # Heatmap of all roster metrics
        st.markdown("---")
        with st.expander("Full roster metrics table"):
            display = view[["school", "year"] + roster_metrics].sort_values(["school", "year"])
            st.dataframe(
                display.style.background_gradient(subset=roster_metrics, cmap="Blues"),
                use_container_width=True,
                height=400,
            )
