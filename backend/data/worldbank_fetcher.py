import httpx
from datetime import datetime, timezone
from db.supabase_client import get_client

WB_BASE = "https://api.worldbank.org/v2/country/{country}/indicator/{indicator}"

INDICATORS = {
    "NY.GDP.MKTP.CD": "GDP (Current USD)",
    "FP.CPI.TOTL.ZG": "CPI Inflation (%)",
    "SL.UEM.TOTL.ZS": "Unemployment (%)",
}

COUNTRIES = {
    "US": "United States",
    "PK": "Pakistan",
    "CN": "China",
    "DE": "Germany",
    "JP": "Japan",
}


def _fetch_indicator(country: str, indicator: str, name: str) -> dict | None:
    try:
        url = WB_BASE.format(country=country, indicator=indicator)
        resp = httpx.get(
            url,
            params={"format": "json", "mrv": 1, "per_page": 1},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        if len(data) < 2 or not data[1]:
            return None
        obs = data[1][0]
        value = obs.get("value")
        if value is None:
            return None
        return {
            "series_id": indicator,
            "country": country,
            "indicator_name": name,
            "value": float(value),
            "period": str(obs.get("date", "")),
            "source": "WorldBank",
            "captured_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        print(f"[worldbank_fetcher] Error {country}/{indicator}: {e}")
        return None


def fetch_and_store() -> list[dict]:
    rows = []

    for country in COUNTRIES:
        for indicator, name in INDICATORS.items():
            row = _fetch_indicator(country, indicator, name)
            if row:
                rows.append(row)

    if rows:
        db = get_client()
        db.table("macro_indicators").insert(rows).execute()
        print(f"[worldbank_fetcher] Stored {len(rows)} World Bank rows")

    return rows
