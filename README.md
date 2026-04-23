# 🏈 Ivy League Football Analytics

A full data pipeline and interactive dashboard for analyzing Ivy League football (2005–2024) — covering scheme detection, roster composition modeling, and win-probability analysis for all 8 schools.

![Python](https://img.shields.io/badge/Python-3.14-blue?logo=python) ![Streamlit](https://img.shields.io/badge/Streamlit-1.56-red?logo=streamlit) ![License](https://img.shields.io/badge/License-MIT-green)

---

## Features

- **Automated scraping** of team stats, rosters, and schedules from Sports-Reference (2005–2024)
- **Algorithmic scheme detection** — no manual labels needed; continuous style scores (pass tendency, tempo, spread factor, explosiveness, aggression, front heaviness) derived from on-field stats and roster physics
- **Interactive sliders** to tune detection thresholds live and see scheme labels update in real time
- **Panel regression** estimating scheme effects on Ivy win %, controlling for school and year fixed effects
- **Roster → win model** using Random Forest / Logistic Regression on physical roster features
- **Streamlit dashboard** with dark theme, Plotly charts, radar profiles, and heatmaps

---

## Project Structure

```
ivy-football-analytics/
├── app.py                        # Streamlit dashboard (5 pages)
├── requirements.txt
├── .streamlit/
│   └── config.toml               # Dark theme config
├── src/
│   ├── scraper.py                # Sports-Reference team stats + schedule scraping
│   ├── roster_scraper.py         # Sports-Reference roster scraping (height/weight/pos)
│   ├── features.py               # Metric + roster feature engineering
│   ├── scheme_detector.py        # Style scoring + scheme labeling logic
│   └── models.py                 # Panel regression + RF/LR roster model
├── notebooks/
│   ├── 01_scrape.ipynb           # Run first — pulls all raw data (~45-90 min)
│   ├── 02_features_and_schemes.ipynb  # Feature engineering + slider interface
│   ├── 03_scheme_regression.ipynb     # Scheme effect regression
│   ├── 04_roster_model.ipynb          # Roster → win probability model
│   └── 05_export.ipynb               # Export all results to Excel workbook
└── data/
    ├── raw/
    │   ├── team_stats/           # team_stats_raw.csv
    │   ├── rosters/              # rosters_raw.csv
    │   └── schedules/            # schedules_raw.csv
    └── processed/                # master_labeled.csv, ivy_football_analysis.xlsx
```

---

## Quickstart

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Run the dashboard (demo data loads automatically)

```bash
python -m streamlit run app.py
```

Opens at `http://localhost:8501`

### 3. Scrape real data (optional, ~45–90 min)

```bash
python -m notebook
```

Open `notebooks/01_scrape.ipynb` and run all cells. Then run `02`, `03`, `04`, `05` in order. The dashboard picks up real data automatically on next load. Notebook `05` compiles everything into a single Excel workbook at `data/processed/ivy_football_analysis.xlsx`.

---

## Dashboard Pages

| Page | Description |
|---|---|
| **Overview** | Win % trends over time, school rankings, scheme distribution |
| **Team Stats** | Interactive scatter + trend explorer for any two metrics |
| **Scheme Detector** | Live threshold sliders — drag to reclassify all team-seasons instantly |
| **Scheme vs Wins** | Bar charts, box plots, and panel regression coefficients |
| **Roster Analysis** | Radar physical profiles, weight trends, roster metric vs win % |

---

## Scheme Detection

Rather than manually labeling coaching schemes, the pipeline computes 7 continuous `[0, 1]` style scores per team-season:

| Score | What it measures |
|---|---|
| `pass_tendency` | Pass-heaviness (0 = pure run, 1 = pure pass) |
| `tempo` | Speed of play (0 = slowest pro-style, 1 = no-huddle) |
| `spread_factor` | Alignment width (0 = tight/pro, 1 = spread) |
| `explosiveness` | Big-play rate (yards per play) |
| `aggression` | Defensive disruption (havoc rate: TFL + sacks + PBUs) |
| `front_heaviness` | DL mass relative to LB mass (3-man vs 4-man front proxy) |
| `coverage_depth` | Opponent passing success allowed |

Each score is min-max normalized within the Ivy dataset. The Scheme Detector page lets you drag threshold sliders and see the resulting human-readable labels (e.g. "Air Raid / Spread RPO", "Pro-Style / Power Run", "4-3 Base") update live.

---

## Coaching Tenure Data

The regression notebook generates `data/raw/coaches_template.csv` automatically. Fill in coach names and start years, rename to `coaches.csv`, and the tenure-split analysis (Year 1–2 vs Year 3+) runs automatically.

---

## Play-by-Play / EPA

EPA metrics are stubbed and ready to integrate. If you obtain a CollegeFootballData API key, add it to a `.env` file:

```
CFBD_API_KEY=your_key_here
```

The scraper will pick it up for drive-level and play-level data.

---

## Data Sources

- **[Sports-Reference College Football](https://www.sports-reference.com/cfb/)** — team stats, rosters, schedules
- Havoc rate definition: TFL + sacks + passes defended per defensive play
- EPA: CollegeFootballData API (optional)

---

## Schools Covered

Brown · Columbia · Cornell · Dartmouth · Harvard · Penn · Princeton · Yale
