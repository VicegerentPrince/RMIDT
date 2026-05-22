import httpx
from datetime import datetime, timezone
from db.supabase_client import get_client

COINGECKO_URL = (
    "https://api.coingecko.com/api/v3/coins/markets"
    "?vs_currency=usd&order=market_cap_desc&per_page=10"
)


def fetch_and_store() -> list[dict]:
    rows = []
    try:
        resp = httpx.get(COINGECKO_URL, timeout=15)
        resp.raise_for_status()
        coins = resp.json()

        now = datetime.now(timezone.utc).isoformat()
        for coin in coins:
            rows.append({
                "coin_id": coin.get("id", ""),
                "name": coin.get("name", ""),
                "symbol": coin.get("symbol", "").upper(),
                "current_price": coin.get("current_price"),
                "market_cap": coin.get("market_cap"),
                "price_change_24h": coin.get("price_change_percentage_24h"),
                "total_volume": coin.get("total_volume"),
                "captured_at": now,
            })

        if rows:
            db = get_client()
            db.table("crypto_data").insert(rows).execute()
            print(f"[crypto_fetcher] Stored {len(rows)} crypto rows")

    except Exception as e:
        print(f"[crypto_fetcher] Error: {e}")

    return rows
