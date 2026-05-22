import os
import httpx
from datetime import datetime, timezone
from db.supabase_client import get_client

FRED_BASE = "https://api.stlouisfed.org/fred/series/observations"

FRED_SERIES = {
    "GDPC1": "GDP (Real)",
    "CPIAUCSL": "CPI",
    "UNRATE": "Unemployment Rate",
    "FEDFUNDS": "Fed Funds Rate",
    "DGS10": "10-Year Treasury Yield",
}


def _fetch_series(series_id: str, indicator_name: str, api_key: str) -> dict | None:
    try:
        resp = httpx.get(
            FRED_BASE,
            params={
                "series_id": series_id,
                "api_key": api_key,
                "file_type": "json",
                "sort_order": "desc",
                "limit": 1,
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        obs = data.get("observations", [])
        if not obs:
            return None
        latest = obs[0]
        value = latest.get("value", ".")
        if value == ".":
            return None
        return {
            "series_id": series_id,
            "country": "US",
            "indicator_name": indicator_name,
            "value": float(value),
            "period": latest.get("date", ""),
            "source": "FRED",
            "captured_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        print(f"[fred_fetcher] Error fetching {series_id}: {e}")
        return None


def fetch_and_store() -> list[dict]:
    api_key = os.environ.get("FRED_API_KEY", "")
    rows = []

    for series_id, name in FRED_SERIES.items():
        row = _fetch_series(series_id, name, api_key)
        if row:
            rows.append(row)

    if rows:
        db = get_client()
        db.table("macro_indicators").insert(rows).execute()
        print(f"[fred_fetcher] Stored {len(rows)} FRED rows")

    return rows
