"""
Scraping utilities for Ivy League NCAAF data.
Primary: sportsipy (wraps Sports-Reference with proper rate limiting).
Fallback: direct requests with browser headers.
"""

import time
import random
import requests
import pandas as pd
from bs4 import BeautifulSoup
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

BASE_URL = "https://www.sports-reference.com/cfb/schools"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}


def _get(url: str, session: requests.Session, min_delay: float = 4.0) -> BeautifulSoup | None:
    time.sleep(min_delay + random.uniform(0, 2))
    try:
        r = session.get(url, headers=HEADERS, timeout=30)
        r.raise_for_status()
        return BeautifulSoup(r.text, "lxml")
    except Exception as e:
        print(f"  [warn] {e}")
        return None


# ── sportsipy-based collection ────────────────────────────────────────────────

def _sportsipy_team_stats(slug: str, year: int) -> dict | None:
    try:
        from sportsipy.ncaaf.teams import Teams
        teams = Teams(year)
        for team in teams:
            if team.abbreviation and team.abbreviation.lower() == slug.lower():
                row = {"school": slug, "year": year}
                for attr in [
                    "games", "wins", "losses", "points_per_game",
                    "points_against_per_game", "yards_per_play",
                    "pass_attempts", "rush_attempts",
                    "pass_yards", "rush_yards",
                    "turnovers", "fumbles_lost",
                    "first_downs", "third_down_conversions", "third_down_attempts",
                ]:
                    try:
                        row[attr] = getattr(team, attr, None)
                    except Exception:
                        pass
                return row
    except Exception as e:
        print(f"  [sportsipy warn] {e}")
    return None


def _sportsipy_schedule(slug: str, year: int) -> pd.DataFrame:
    try:
        from sportsipy.ncaaf.schedule import Schedule
        sched = Schedule(slug.upper(), year=year)
        rows = []
        for game in sched:
            rows.append({
                "school": slug, "year": year,
                "date": getattr(game, "date", None),
                "opponent": getattr(game, "opponent_name", None),
                "result": getattr(game, "result", None),
                "points": getattr(game, "points", None),
                "opp_points": getattr(game, "opponent_points", None),
                "location": getattr(game, "location", None),
            })
        return pd.DataFrame(rows)
    except Exception as e:
        print(f"  [sportsipy warn] {e}")
        return pd.DataFrame()


def _sportsipy_roster(slug: str, year: int) -> pd.DataFrame:
    try:
        from sportsipy.ncaaf.roster import Roster
        roster = Roster(slug.upper(), year=year)
        rows = []
        for player in roster.players:
            rows.append({
                "school": slug, "year": year,
                "name": getattr(player, "name", None),
                "position": getattr(player, "position", None),
                "height": getattr(player, "height", None),
                "weight": getattr(player, "weight", None),
                "year_class": getattr(player, "year", None),
            })
        return pd.DataFrame(rows)
    except Exception as e:
        print(f"  [sportsipy warn] {e}")
        return pd.DataFrame()


# ── fallback: direct HTML scrape with browser session ────────────────────────

def _html_team_stats(slug: str, year: int, session: requests.Session) -> dict | None:
    url = f"{BASE_URL}/{slug}/{year}.html"
    soup = _get(url, session)
    if soup is None:
        return None

    stats = {"school": slug, "year": year}
    for table_id, prefix in [("team_stats", ""), ("opp_stats", "opp_")]:
        tbl = soup.find("table", {"id": table_id})
        if not tbl:
            continue
        for row in tbl.find_all("tr"):
            cells = row.find_all(["th", "td"])
            if len(cells) >= 2:
                label = prefix + cells[0].get_text(strip=True).lower().replace(" ", "_").replace("/", "_per_")
                value = cells[1].get_text(strip=True)
                try:
                    stats[label] = float(value.replace(",", "").replace("%", ""))
                except ValueError:
                    stats[label] = value
    return stats if len(stats) > 2 else None


def _html_roster(slug: str, year: int, session: requests.Session) -> pd.DataFrame:
    url = f"{BASE_URL}/{slug}/roster/{year}.html"
    soup = _get(url, session)
    if soup is None:
        return pd.DataFrame()
    tbl = soup.find("table", {"id": "roster"})
    if tbl is None:
        return pd.DataFrame()
    rows = []
    headers = [th.get_text(strip=True) for th in tbl.find("thead").find_all("th")]
    for tr in tbl.find("tbody").find_all("tr"):
        if tr.get("class") and "thead" in tr["class"]:
            continue
        cells = [td.get_text(strip=True) for td in tr.find_all(["th", "td"])]
        if cells:
            rows.append(dict(zip(headers, cells)))
    df = pd.DataFrame(rows)
    df["school"] = slug
    df["year"] = year
    return df


def _html_schedule(slug: str, year: int, session: requests.Session) -> pd.DataFrame:
    url = f"{BASE_URL}/{slug}/schedule/{year}.html"
    soup = _get(url, session)
    if soup is None:
        return pd.DataFrame()
    tbl = soup.find("table", {"id": "schedule"})
    if tbl is None:
        return pd.DataFrame()
    rows = []
    headers = [th.get_text(strip=True) for th in tbl.find("thead").find_all("th")]
    for tr in tbl.find("tbody").find_all("tr"):
        if tr.get("class") and "thead" in tr["class"]:
            continue
        cells = [td.get_text(strip=True) for td in tr.find_all(["th", "td"])]
        if cells:
            row = dict(zip(headers, cells))
            row["school"] = slug
            row["year"] = year
            rows.append(row)
    return pd.DataFrame(rows)


# ── main scrape loop ──────────────────────────────────────────────────────────

def scrape_all(start_year: int = 2005, end_year: int = 2024,
               data_dir: str = "data/raw") -> None:
    """
    Scrape all Ivy schools. Tries sportsipy first, falls back to direct HTML.
    Saves CSVs under data_dir/{team_stats,rosters,schedules}/.
    """
    root = Path(data_dir)
    for d in ["team_stats", "rosters", "schedules"]:
        (root / d).mkdir(parents=True, exist_ok=True)

    # Warm up a browser-like session for the HTML fallback
    session = requests.Session()
    session.headers.update(HEADERS)
    # Visit the main page once to get cookies
    try:
        session.get("https://www.sports-reference.com/cfb/", timeout=15)
        time.sleep(3)
    except Exception:
        pass

    all_stats, all_rosters, all_schedules = [], [], []

    for display, slug in IVY_SCHOOLS.items():
        print(f"\n=== {display.upper()} ===")
        for year in range(start_year, end_year + 1):
            print(f"  {year} ", end="", flush=True)

            # ── team stats ──
            stats = _sportsipy_team_stats(slug, year)
            if not stats:
                stats = _html_team_stats(slug, year, session)
            if stats:
                all_stats.append(stats)
                print("S", end="", flush=True)

            # ── roster ──
            roster = _sportsipy_roster(slug, year)
            if roster.empty:
                roster = _html_roster(slug, year, session)
            if not roster.empty:
                all_rosters.append(roster)
                print("R", end="", flush=True)

            # ── schedule ──
            schedule = _sportsipy_schedule(slug, year)
            if schedule.empty:
                schedule = _html_schedule(slug, year, session)
            if not schedule.empty:
                all_schedules.append(schedule)
                print("G", end="", flush=True)

        print()

    if all_stats:
        pd.DataFrame(all_stats).to_csv(root / "team_stats" / "team_stats_raw.csv", index=False)
        print(f"\nSaved team_stats_raw.csv ({len(all_stats)} rows)")
    if all_rosters:
        pd.concat(all_rosters, ignore_index=True).to_csv(root / "rosters" / "rosters_raw.csv", index=False)
        print(f"Saved rosters_raw.csv")
    if all_schedules:
        pd.concat(all_schedules, ignore_index=True).to_csv(root / "schedules" / "schedules_raw.csv", index=False)
        print(f"Saved schedules_raw.csv")
    if not any([all_stats, all_rosters, all_schedules]):
        print("\n[!] No data collected. Sports-Reference may be rate-limiting — wait 10 min and retry.")
