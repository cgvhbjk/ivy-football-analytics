"""
Roster scraper for Ivy League school athletic sites (Sidearm Sports / Nuxt).
Extracts player height, weight, position, year from the __NUXT_DATA__ payload.
Works on all 8 Ivy school sites going back to ~2014.
"""

import re
import json
import time
import random
import requests
import pandas as pd
from pathlib import Path

SCHOOL_SITES = {
    "brown":        "https://brownbears.com",
    "columbia":     "https://gocolumbialions.com",
    "cornell":      "https://cornellbigred.com",
    "dartmouth":    "https://dartmouthsports.com",
    "harvard":      "https://gocrimson.com",
    "pennsylvania": "https://pennathletics.com",
    "princeton":    "https://goprincetontigers.com",
    "yale":         "https://yalebulldogs.com",
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def _val(ref, arr):
    """Resolve exactly one Nuxt index hop — returns the value at arr[ref]."""
    if isinstance(ref, int) and 0 <= ref < len(arr):
        return arr[ref]
    return ref


def _fetch_nuxt_data(url: str, session: requests.Session) -> list | None:
    time.sleep(2 + random.uniform(0, 1.5))
    try:
        r = session.get(url, headers=HEADERS, timeout=20)
        r.raise_for_status()
        m = re.search(
            r'<script[^>]*id=["\']__NUXT_DATA__["\'][^>]*>(.*?)</script>',
            r.text, re.DOTALL
        )
        if not m:
            return None
        return json.loads(m.group(1))
    except Exception as e:
        print(f"  [warn] {url}: {e}")
        return None


def _parse_players(nuxt_arr: list) -> list[dict]:
    """
    Walk the flat Nuxt array and extract all player objects.
    A player object is identified by having both 'weight' and 'heightFeet' keys.
    Values are index references into the array — resolve one level only.
    """
    players = []
    seen_ids = set()
    for item in nuxt_arr:
        if not isinstance(item, dict):
            continue
        if not ("weight" in item and "heightFeet" in item and "positionShort" in item):
            continue
        # Deduplicate by rosterPlayerId
        rid = item.get("rosterPlayerId")
        if rid is not None:
            rid_val = _val(rid, nuxt_arr)
            if rid_val in seen_ids:
                continue
            seen_ids.add(rid_val)

        p = {k: _val(v, nuxt_arr) for k, v in item.items()
             if not isinstance(_val(v, nuxt_arr), (dict, list))}
        players.append(p)
    return players


# Schools that use plain HTML tables instead of Sidearm/Nuxt
HTML_TABLE_SCHOOLS = {"harvard", "yale", "cornell"}


def _parse_ht(ht_str: str) -> float | None:
    """Convert '6-2' or '6-2' style to total inches."""
    if not ht_str:
        return None
    import re
    m = re.match(r"(\d)['\-](\d+)", str(ht_str).strip())
    if m:
        return int(m.group(1)) * 12 + int(m.group(2))
    return None


def _scrape_html_table_roster(school: str, year: int,
                               session: requests.Session) -> pd.DataFrame:
    """Parse rosters from schools using standard HTML tables (Harvard, Yale, Cornell)."""
    base = SCHOOL_SITES.get(school)
    url = f"{base}/sports/football/roster/{year}"
    time.sleep(2 + random.uniform(0, 1.5))
    try:
        r = session.get(url, headers=HEADERS, timeout=20)
        r.raise_for_status()
    except Exception as e:
        print(f"  [warn] {url}: {e}")
        return pd.DataFrame()

    from bs4 import BeautifulSoup
    soup = BeautifulSoup(r.text, "lxml")

    # Find table containing height data
    tbl = None
    for t in soup.find_all("table"):
        text = t.get_text()
        if any(k in text for k in ["Ht.", "Ht ", "Height"]):
            tbl = t
            break
    if tbl is None:
        return pd.DataFrame()

    # Parse header row to find column indices
    header_row = tbl.find("tr")
    if not header_row:
        return pd.DataFrame()
    headers = [th.get_text(strip=True).lower() for th in header_row.find_all(["th", "td"])]

    def col_idx(*names):
        for n in names:
            for i, h in enumerate(headers):
                if n in h:
                    return i
        return None

    i_name  = col_idx("name", "full name")
    i_pos   = col_idx("pos")
    i_ht    = col_idx("ht", "height")
    i_wt    = col_idx("wt", "weight")
    i_yr    = col_idx("cl", "class", "academic year", "yr")
    i_town  = col_idx("hometown", "home")

    rows = []
    for tr in tbl.find_all("tr")[1:]:
        cells = [td.get_text(strip=True) for td in tr.find_all(["td", "th"])]
        if len(cells) < 2:
            continue
        def g(i):
            return cells[i] if i is not None and i < len(cells) else None

        ht_raw = g(i_ht)
        wt_raw = g(i_wt)
        try:
            wt = float(str(wt_raw).replace(",", "")) if wt_raw else None
        except ValueError:
            wt = None

        rows.append({
            "school":     school,
            "year":       year,
            "name":       g(i_name),
            "position":   g(i_pos),
            "height_in":  _parse_ht(ht_raw),
            "weight_lbs": wt,
            "year_class": g(i_yr),
            "hometown":   g(i_town),
            "home_state": None,
            "jersey":     cells[0] if cells else None,
        })
    return pd.DataFrame(rows) if rows else pd.DataFrame()


def scrape_school_roster(school: str, year: int,
                          session: requests.Session) -> pd.DataFrame:
    if school in HTML_TABLE_SCHOOLS:
        return _scrape_html_table_roster(school, year, session)

    base = SCHOOL_SITES.get(school)
    if not base:
        return pd.DataFrame()

    url = f"{base}/sports/football/roster/{year}"
    arr = _fetch_nuxt_data(url, session)
    if arr is None:
        return pd.DataFrame()

    players = _parse_players(arr)
    if not players:
        return pd.DataFrame()

    rows = []
    for p in players:
        first = p.get("firstName") or p.get("first_name") or ""
        last  = p.get("lastName")  or p.get("last_name")  or ""
        name  = f"{first} {last}".strip()

        ht_ft  = p.get("heightFeet")
        ht_in  = p.get("heightInches")
        try:
            height_in = int(ht_ft) * 12 + int(ht_in)
        except (TypeError, ValueError):
            height_in = None

        rows.append({
            "school":     school,
            "year":       year,
            "name":       name or None,
            "position":   p.get("positionShort") or p.get("positionLong"),
            "height_in":  height_in,
            "weight_lbs": p.get("weight"),
            "year_class": p.get("academicYearShort") or p.get("academicYearLong"),
            "hometown":   p.get("hometown"),
            "home_state": p.get("homeState") or p.get("home_state"),
            "jersey":     p.get("jerseyNumber"),
        })
    return pd.DataFrame(rows)


def scrape_all_rosters(start_year: int = 2014, end_year: int = 2024,
                        data_dir: str = "data/raw") -> pd.DataFrame:
    """
    Scrape rosters for all Ivy schools from their athletic sites.
    Merges with any existing roster CSV (preserves cfbd data).
    """
    out_path = Path(data_dir) / "rosters" / "rosters_raw.csv"
    existing = pd.read_csv(out_path) if out_path.exists() else pd.DataFrame()

    session = requests.Session()
    session.headers.update(HEADERS)

    new_rows = []
    for school in SCHOOL_SITES:
        print(f"\n{school.upper()}: ", end="", flush=True)
        for year in range(start_year, end_year + 1):
            # Skip if already have site-scraped data for this school/year
            if not existing.empty and "height_in" in existing.columns:
                already = existing[
                    (existing["school"] == school) &
                    (existing["year"] == year) &
                    existing["height_in"].notna()
                ]
                if len(already) > 10:
                    print(f"{year}✓ ", end="", flush=True)
                    continue

            df = scrape_school_roster(school, year, session)
            if not df.empty:
                new_rows.append(df)
                print(f"{year}({len(df)}) ", end="", flush=True)
            else:
                print(f"{year}✗ ", end="", flush=True)

    print("\n")

    if not new_rows:
        print("No new roster data scraped.")
        return existing

    combined = pd.concat(new_rows, ignore_index=True)

    # Merge with existing: site-scraped takes priority over cfbd for same school/year
    if not existing.empty:
        existing_key = existing.set_index(["school", "year"])
        combined_key = combined.set_index(["school", "year"])
        # Keep all rows from combined; append existing rows not in combined
        existing_only = existing[
            ~existing.set_index(["school","year"]).index.isin(combined_key.index)
        ]
        final = pd.concat([combined, existing_only], ignore_index=True)
    else:
        final = combined

    final.to_csv(out_path, index=False)
    print(f"Saved {len(final)} total roster rows to {out_path}")
    return final
