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
        home = g.get("homeTeam") == team_name
        opponent = g.get("awayTeam") if home else g.get("homeTeam")
        pts = g.get("homePoints") if home else g.get("awayPoints")
        opp_pts = g.get("awayPoints") if home else g.get("homePoints")
        if pts is not None and opp_pts is not None:
            result = "W" if pts > opp_pts else "L"
        else:
            result = None
        rows.append({
            "school": team_name.lower(), "year": year,
            "date": (g.get("startDate") or "")[:10],
            "opponent": opponent,
            "result": result,
            "points": pts,
            "opp_points": opp_pts,
            "home_away": "home" if home else "away",
            "conference_game": g.get("conferenceGame"),
            "completed": g.get("completed"),
        })
    return pd.DataFrame(rows)


def cfbd_all_ivy_games_year(year: int, api_key: str) -> pd.DataFrame:
    """
    Fetch ALL Ivy League games for a given year in ONE API call.
    Returns rows for both teams' perspectives (home and away).
    Costs 1 request per year instead of 1 per team — use this to conserve quota.
    """
    data = _cfbd_get("/games", {"year": year, "conference": "Ivy", "seasonType": "regular"}, api_key)
    if not data:
        return pd.DataFrame()
    rows = []
    for g in data:
        home_team = g.get("homeTeam", "")
        away_team = g.get("awayTeam", "")
        home_pts  = g.get("homePoints")
        away_pts  = g.get("awayPoints")
        date = (g.get("startDate") or "")[:10]
        conf = g.get("conferenceGame")
        completed = g.get("completed")

        for team, opp, pts, opp_pts, loc in [
            (home_team, away_team, home_pts, away_pts, "home"),
            (away_team, home_team, away_pts, home_pts, "away"),
        ]:
            if team.lower() not in {n.lower() for n in IVY_CFBD_NAMES.values()}:
                continue
            result = ("W" if pts > opp_pts else "L") if (pts is not None and opp_pts is not None) else None
            rows.append({
                "school": team.lower(), "year": year,
                "date": date, "opponent": opp,
                "result": result, "points": pts, "opp_points": opp_pts,
                "home_away": loc, "conference_game": conf, "completed": completed,
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

def _already_fetched(root: Path, slug: str, year: int) -> tuple[bool, bool, bool]:
    """Return (has_stats, has_roster, has_games) from cached CSVs to avoid re-fetching."""
    stats_path    = root / "team_stats" / "team_stats_raw.csv"
    rosters_path  = root / "rosters"    / "rosters_raw.csv"
    schedules_path = root / "schedules" / "schedules_raw.csv"

    def _has_row(path, slug, year):
        if not path.exists():
            return False
        try:
            df = pd.read_csv(path, usecols=["school", "year"])
            return ((df["school"].str.lower() == slug.lower()) & (df["year"] == year)).any()
        except Exception:
            return False

    return (
        _has_row(stats_path, slug, year),
        _has_row(rosters_path, slug, year),
        _has_row(schedules_path, slug, year),
    )


def scrape_all(start_year: int = 2005, end_year: int = 2024,
               data_dir: str = "data/raw") -> None:
    """
    Scrape all Ivy schools via the CollegeFootballData API.
    Skips school/year combinations already saved to avoid wasting quota.
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

    # Load any existing data so we can append without re-fetching
    def _load_existing(path):
        if not path.exists():
            return []
        try:
            return pd.read_csv(path).to_dict("records")
        except Exception:
            return []

    all_stats     = _load_existing(root / "team_stats" / "team_stats_raw.csv")
    all_rosters   = list(pd.read_csv(root / "rosters" / "rosters_raw.csv").to_dict("records")) if (root / "rosters" / "rosters_raw.csv").exists() else []
    all_schedules = list(pd.read_csv(root / "schedules" / "schedules_raw.csv").to_dict("records")) if (root / "schedules" / "schedules_raw.csv").exists() else []

    requests_made = 0
    skipped = 0

    # ── Phase 1: bulk game fetch (1 request per year for all 8 teams) ──────────
    print("Fetching games (1 request/year for all Ivy teams)...")
    years_needed = [y for y in range(start_year, end_year + 1)
                    if not _already_fetched(root, "Brown", y)[2]]  # check any school
    for year in years_needed:
        print(f"  {year} ", end="", flush=True)
        bulk = cfbd_all_ivy_games_year(year, api_key)
        requests_made += 1
        if not bulk.empty:
            all_schedules.extend(bulk.to_dict("records"))
            print("G", end="", flush=True)
        else:
            skipped += 1
    pd.DataFrame(all_schedules).to_csv(root / "schedules" / "schedules_raw.csv", index=False)
    print(f"\nGames saved: {len(all_schedules)} rows")

    # ── Phase 2: rosters per team (only recent years where cfbd has data) ──────
    print("\nFetching rosters (recent years only)...")
    for slug, cfbd_name in IVY_CFBD_NAMES.items():
        print(f"\n  {slug}: ", end="", flush=True)
        for year in range(max(start_year, 2022), end_year + 1):
            _, has_roster, _ = _already_fetched(root, cfbd_name, year)
            if has_roster:
                print(f"{year}[cached] ", end="", flush=True)
                continue
            roster = cfbd_roster(cfbd_name, year, api_key)
            requests_made += 1
            if not roster.empty:
                all_rosters.extend(roster.to_dict("records"))
                print(f"{year}R ", end="", flush=True)
    pd.DataFrame(all_rosters).to_csv(root / "rosters" / "rosters_raw.csv", index=False)
    print(f"\nRosters saved: {len(all_rosters)} rows")

    print(f"\nDone.  API requests made this run: {requests_made}  |  Years skipped (cached): {skipped}")
    print(f"Saved: {len(all_stats)} stat rows, {len(all_rosters)} roster rows, {len(all_schedules)} game rows")
