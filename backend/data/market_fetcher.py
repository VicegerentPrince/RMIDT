import yfinance as yf
from datetime import datetime, timezone
from db.supabase_client import get_client

EQUITIES = {
    "^GSPC": "S&P 500",
    "^IXIC": "NASDAQ",
    "^GDAXI": "DAX",
    "^N225": "Nikkei 225",
    "^KSE": "KSE-100",
    "^HSI": "Hang Seng",
}

FOREX = {
    "EURUSD=X": "EUR/USD",
    "GBPUSD=X": "GBP/USD",
    "USDJPY=X": "USD/JPY",
    "USDPKR=X": "USD/PKR",
    "USDCNY=X": "USD/CNY",
}

COMMODITIES = {
    "GC=F": "Gold",
    "CL=F": "Crude Oil",
    "SI=F": "Silver",
    "NG=F": "Natural Gas",
}


def _fetch_ticker(symbol: str, name: str, category: str) -> dict | None:
    try:
        t = yf.Ticker(symbol)
        info = t.fast_info
        price = getattr(info, "last_price", None)
        prev_close = getattr(info, "previous_close", None)
        volume = getattr(info, "three_month_average_volume", None)

        change_pct = None
        if price and prev_close and prev_close != 0:
            change_pct = round((price - prev_close) / prev_close * 100, 4)

        return {
            "symbol": symbol,
            "name": name,
            "category": category,
            "price": float(price) if price else None,
            "change_pct": change_pct,
            "volume": int(volume) if volume else None,
            "currency": "USD",
            "source": "yfinance",
            "captured_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        print(f"[market_fetcher] Error fetching {symbol}: {e}")
        return None


def fetch_and_store() -> list[dict]:
    rows = []

    for symbol, name in EQUITIES.items():
        row = _fetch_ticker(symbol, name, "equity")
        if row:
            rows.append(row)

    for symbol, name in FOREX.items():
        row = _fetch_ticker(symbol, name, "forex")
        if row:
            rows.append(row)

    for symbol, name in COMMODITIES.items():
        row = _fetch_ticker(symbol, name, "commodity")
        if row:
            rows.append(row)

    if rows:
        db = get_client()
        db.table("market_data").insert(rows).execute()
        print(f"[market_fetcher] Stored {len(rows)} market rows")

    return rows
