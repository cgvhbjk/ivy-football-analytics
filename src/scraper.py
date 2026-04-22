"""
Scraping utilities for Sports-Reference NCAAF data.
Handles team stats, rosters, and schedules for Ivy League schools.
"""

import time
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
HEADERS = {"User-Agent": "Mozilla/5.0 (research project; contact adinhelfand@gmail.com)"}
DELAY = 4  # seconds between requests to respect rate limits


def _get(url: str) -> BeautifulSoup | None:
    time.sleep(DELAY)
    try:
        r = requests.get(url, headers=HEADERS, timeout=20)
        r.raise_for_status()
        return BeautifulSoup(r.text, "lxml")
    except Exception as e:
        print(f"  [warn] {url}: {e}")
        return None


def scrape_team_season_stats(school_slug: str, year: int) -> dict | None:
    """Return one dict of season-level team stats for school/year from S-R."""
    url = f"{BASE_URL}/{school_slug}/{year}.html"
    soup = _get(url)
    if soup is None:
        return None

    stats = {"school": school_slug, "year": year}

    # Team stats table (id="team_stats")
    tbl = soup.find("table", {"id": "team_stats"})
    if tbl:
        for row in tbl.find_all("tr"):
            cells = row.find_all(["th", "td"])
            if len(cells) >= 2:
                label = cells[0].get_text(strip=True).lower().replace(" ", "_").replace("/", "_per_")
                value = cells[1].get_text(strip=True)
                try:
                    stats[label] = float(value.replace(",", "").replace("%", ""))
                except ValueError:
                    stats[label] = value

    # Opponent stats table (id="opp_stats") — prefix with "opp_"
    opp = soup.find("table", {"id": "opp_stats"})
    if opp:
        for row in opp.find_all("tr"):
            cells = row.find_all(["th", "td"])
            if len(cells) >= 2:
                label = "opp_" + cells[0].get_text(strip=True).lower().replace(" ", "_").replace("/", "_per_")
                value = cells[1].get_text(strip=True)
                try:
                    stats[label] = float(value.replace(",", "").replace("%", ""))
                except ValueError:
                    stats[label] = value

    return stats if len(stats) > 2 else None


def scrape_roster(school_slug: str, year: int) -> pd.DataFrame:
    """Return DataFrame of players on the roster for school/year."""
    url = f"{BASE_URL}/{school_slug}/roster/{year}.html"
    soup = _get(url)
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
    df["school"] = school_slug
    df["year"] = year
    return df


def scrape_schedule(school_slug: str, year: int) -> pd.DataFrame:
    """Return DataFrame of game results for school/year."""
    url = f"{BASE_URL}/{school_slug}/schedule/{year}.html"
    soup = _get(url)
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
            row["school"] = school_slug
            row["year"] = year
            rows.append(row)

    return pd.DataFrame(rows)


def scrape_all(start_year: int = 2005, end_year: int = 2024,
               data_dir: str = "data/raw") -> None:
    """
    Full scrape loop: team stats, rosters, schedules for all Ivy schools.
    Saves CSV files under data_dir/{team_stats,rosters,schedules}/.
    """
    root = Path(data_dir)
    (root / "team_stats").mkdir(parents=True, exist_ok=True)
    (root / "rosters").mkdir(parents=True, exist_ok=True)
    (root / "schedules").mkdir(parents=True, exist_ok=True)

    all_stats, all_rosters, all_schedules = [], [], []

    for display, slug in IVY_SCHOOLS.items():
        print(f"\n=== {display.upper()} ===")
        for year in range(start_year, end_year + 1):
            print(f"  {year} ", end="", flush=True)

            stats = scrape_team_season_stats(slug, year)
            if stats:
                all_stats.append(stats)
                print("S", end="", flush=True)

            roster = scrape_roster(slug, year)
            if not roster.empty:
                all_rosters.append(roster)
                print("R", end="", flush=True)

            schedule = scrape_schedule(slug, year)
            if not schedule.empty:
                all_schedules.append(schedule)
                print("G", end="", flush=True)

        print()

    if all_stats:
        pd.DataFrame(all_stats).to_csv(root / "team_stats" / "team_stats_raw.csv", index=False)
        print("Saved team_stats_raw.csv")
    if all_rosters:
        pd.concat(all_rosters, ignore_index=True).to_csv(root / "rosters" / "rosters_raw.csv", index=False)
        print("Saved rosters_raw.csv")
    if all_schedules:
        pd.concat(all_schedules, ignore_index=True).to_csv(root / "schedules" / "schedules_raw.csv", index=False)
        print("Saved schedules_raw.csv")
