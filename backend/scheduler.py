"""
APScheduler pipeline — runs every 15 minutes.
Order: fetch data → classify regimes → generate LLM predictions.
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timezone

scheduler = AsyncIOScheduler(timezone="UTC")
_last_run: dict = {"time": None, "status": "never"}


async def run_full_pipeline() -> dict:
    from data import market_fetcher, fred_fetcher, worldbank_fetcher, crypto_fetcher, news_fetcher
    from ml.regime_detector import classify_all
    from ai.reasoning_engine import generate_predictions
    from db.supabase_client import get_client

    print(f"\n[pipeline] Starting at {datetime.now(timezone.utc).isoformat()}")
    _last_run["status"] = "running"

    try:
        market_rows = market_fetcher.fetch_and_store()
        fred_rows = fred_fetcher.fetch_and_store()
        wb_rows = worldbank_fetcher.fetch_and_store()
        crypto_fetcher.fetch_and_store()
        news_fetcher.fetch_and_store()

        supabase_data = {
            "macro": fred_rows + wb_rows,
            "market": market_rows,
        }

        regimes = classify_all(supabase_data)
        predictions = generate_predictions(regimes, supabase_data)

        _last_run["time"] = datetime.now(timezone.utc).isoformat()
        _last_run["status"] = "ok"
        print(f"[pipeline] Completed — {len(regimes)} regimes, {len(predictions)} predictions")

        return {
            "status": "ok",
            "regimes": len(regimes),
            "predictions": len(predictions),
            "timestamp": _last_run["time"],
        }

    except Exception as e:
        _last_run["status"] = f"error: {e}"
        print(f"[pipeline] Error: {e}")
        raise


def get_last_run() -> dict:
    return _last_run


def start_scheduler():
    scheduler.add_job(run_full_pipeline, "interval", minutes=15, id="pipeline")
    scheduler.start()
    print("[scheduler] Started — pipeline runs every 15 minutes")
