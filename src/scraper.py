"""
Ivy League NCAAF data collection.

PRIMARY: CollegeFootballData API (cfbd) — free key at https://collegefootballdata.com/key
  Set CFBD_API_KEY in a .env file or as an environment variable.

FALLBACK: Sports-Reference HTML scrape (FBS only via sportsipy; Ivy/FCS teams
  are frequently 403'd because S-R blocks automated requests for FCS pages).
"""

import os
import time
import random
import requests
import pandas as pd
from pathlib import Path

IVY_SCHOOLS = {
    "brown":     "brown",
    "columbia":  "columbia",
    "cornell":   "cornell",
    "dartmouth": "dartmouth",
    "harvard":   "harvard",
    "penn":      "pennsylvania",
    "princeton": "princeton",
    "yale":      "yale",
}

# Full team names as cfbd knows them
IVY_CFBD_NAMES = {
    "brown":     "Brown",
    "columbia":  "Columbia",
    "cornell":   "Cornell",
    "dartmouth": "Dartmouth",
    "harvard":   "Harvard",
    "penn":      "Pennsylvania",
    "princeton": "Princeton",
    "yale":      "Yale",
}

CFBD_BASE = "https://api.collegefootballdata.com"


def _cfbd_headers(api_key: str) -> dict:
    return {"Authorization": f"Bearer {api_key}", "Accept": "application/json"}


def _get_api_key() -> str | None:
    # Check env var first, then .env file
    key = os.environ.get("CFBD_API_KEY")
    if key:
        return key
    env_path = Path(".env")
    if not env_path.exists():
        env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("CFBD_API_KEY="):
                return line.split("=", 1)[1].strip()
    return None


# ── cfbd API calls ────────────────────────────────────────────────────────────

def _cfbd_get(endpoint: str, params: dict, api_key: str) -> list:
    time.sleep(0.5)  # cfbd allows ~600 req/min
    try:
        r = requests.get(
            f"{CFBD_BASE}{endpoint}",
            headers=_cfbd_headers(api_key),
            params=params,
            timeout=20,
        )
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print(f"  [cfbd warn] {endpoint} {params}: {e}")
        return []


def cfbd_team_stats(team_name: str, year: int, api_key: str) -> dict | None:
    data = _cfbd_get("/stats/season", {"year": year, "team": team_name}, api_key)
    if not data:
        return None
    row = {"school": team_name.lower(), "year": year}
    for item in data:
        stat = item.get("statName", "").lower().replace(" ", "_")
        row[stat] = item.get("statValue")
    return row if len(row) > 2 else None


def cfbd_games(team_name: str, year: int, api_key: str) -> pd.DataFrame:
    data = _cfbd_get("/games", {"year": year, "team": team_name, "seasonType": "regular"}, api_key)
    if not data:
        return pd.DataFrame()
    rows = []
    for g in data:
        home = g.get("home_team") == team_name
        opponent = g.get("away_team") if home else g.get("home_team")
        pts = g.get("home_points") if home else g.get("away_points")
        opp_pts = g.get("away_points") if home else g.get("home_points")
        result = "W" if (pts is not None and opp_pts is not None and pts > opp_pts) else "L"
        rows.append({
            "school": team_name.lower(), "year": year,
            "date": g.get("start_date", "")[:10],
            "opponent": opponent,
            "result": result,
            "points": pts,
            "opp_points": opp_pts,
            "home_away": "home" if home else "away",
            "conference_game": g.get("conference_game"),
        })
    return pd.DataFrame(rows)


def cfbd_roster(team_name: str, year: int, api_key: str) -> pd.DataFrame:
    data = _cfbd_get("/roster", {"team": team_name, "year": year}, api_key)
    if not data:
        return pd.DataFrame()
    rows = []
    for p in data:
        rows.append({
            "school": team_name.lower(), "year": year,
            "name": f"{p.get('first_name','')} {p.get('last_name','')}".strip(),
            "position": p.get("position"),
            "height": p.get("height"),
            "weight": p.get("weight"),
            "year_class": p.get("year"),
            "hometown": p.get("home_city"),
            "home_state": p.get("home_state"),
        })
    return pd.DataFrame(rows)


def cfbd_advanced_stats(team_name: str, year: int, api_key: str) -> dict:
    """Pull advanced team stats (EPA, success rate, havoc, etc.)."""
    data = _cfbd_get("/stats/season/advanced",
                     {"year": year, "team": team_name, "excludeGarbageTime": "true"},
                     api_key)
    if not data:
        return {}
    row = {}
    for item in data:
        if isinstance(item, dict):
            off = item.get("offense", {})
            def_ = item.get("defense", {})
            for k, v in off.items():
                row[f"off_{k}"] = v
            for k, v in def_.items():
                row[f"def_{k}"] = v
    return row


# ── main scrape loop ──────────────────────────────────────────────────────────

def scrape_all(start_year: int = 2005, end_year: int = 2024,
               data_dir: str = "data/raw") -> None:
    """
    Scrape all Ivy schools via the CollegeFootballData API.
    Requires CFBD_API_KEY set in .env or environment.
    Get a free key at: https://collegefootballdata.com/key
    """
    api_key = _get_api_key()
    if not api_key:
        print("=" * 60)
        print("  CFBD_API_KEY not found.")
        print("  1. Get a free key at: https://collegefootballdata.com/key")
        print("  2. Create a file called .env in the ivy-football-analytics folder")
        print("  3. Add this line:  CFBD_API_KEY=your_key_here")
        print("  4. Restart the notebook kernel and re-run this cell")
        print("=" * 60)
        return

    root = Path(data_dir)
    for d in ["team_stats", "rosters", "schedules"]:
        (root / d).mkdir(parents=True, exist_ok=True)

    all_stats, all_rosters, all_schedules = [], [], []

    for slug, cfbd_name in IVY_CFBD_NAMES.items():
        print(f"\n=== {slug.upper()} ===")
        for year in range(start_year, end_year + 1):
            print(f"  {year} ", end="", flush=True)

            stats = cfbd_team_stats(cfbd_name, year, api_key)
            adv = cfbd_advanced_stats(cfbd_name, year, api_key)
            if stats:
                stats.update(adv)
                all_stats.append(stats)
                print("S", end="", flush=True)

            roster = cfbd_roster(cfbd_name, year, api_key)
            if not roster.empty:
                all_rosters.append(roster)
                print("R", end="", flush=True)

            games = cfbd_games(cfbd_name, year, api_key)
            if not games.empty:
                all_schedules.append(games)
                print("G", end="", flush=True)

        print()

    if all_stats:
        pd.DataFrame(all_stats).to_csv(root / "team_stats" / "team_stats_raw.csv", index=False)
        print(f"\nSaved team_stats_raw.csv  ({len(all_stats)} rows)")
    if all_rosters:
        pd.concat(all_rosters, ignore_index=True).to_csv(root / "rosters" / "rosters_raw.csv", index=False)
        print(f"Saved rosters_raw.csv")
    if all_schedules:
        pd.concat(all_schedules, ignore_index=True).to_csv(root / "schedules" / "schedules_raw.csv", index=False)
        print(f"Saved schedules_raw.csv")
    if not any([all_stats, all_rosters, all_schedules]):
        print("\n[!] No data collected. Check your API key and try again.")
