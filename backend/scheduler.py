"""
APScheduler pipeline — runs every 15 minutes.
Order: fetch data → classify regimes → (optionally) generate LLM predictions.

ai_enabled=False skips all Gemini calls so the scheduler only does free work:
market/FRED/WorldBank fetches + RandomForest classification.
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timezone

scheduler = AsyncIOScheduler(timezone="UTC")
_last_run: dict = {"time": None, "status": "never"}
_settings: dict = {"ai_enabled": True}


def get_settings() -> dict:
    return dict(_settings)


def update_settings(new: dict) -> None:
    for k, v in new.items():
        if k in _settings:
            _settings[k] = v
    print(f"[scheduler] Settings updated: {_settings}")


def get_last_run() -> dict:
    return _last_run


async def run_full_pipeline() -> dict:
    from data import market_fetcher, fred_fetcher, worldbank_fetcher, crypto_fetcher, news_fetcher
    from ml.regime_detector import classify_all
    from ai.reasoning_engine import generate_predictions

    ai_enabled = _settings["ai_enabled"]
    print(f"\n[pipeline] Starting at {datetime.now(timezone.utc).isoformat()} — AI={'ON' if ai_enabled else 'OFF'}")
    _last_run["status"] = "running"

    try:
        market_rows = market_fetcher.fetch_and_store()
        fred_rows   = fred_fetcher.fetch_and_store()
        wb_rows     = worldbank_fetcher.fetch_and_store()
        crypto_fetcher.fetch_and_store()
        news_fetcher.fetch_and_store(ai_enabled=ai_enabled)

        supabase_data = {
            "macro":  fred_rows + wb_rows,
            "market": market_rows,
        }

        regimes = classify_all(supabase_data)

        if ai_enabled:
            predictions = generate_predictions(regimes, supabase_data)
        else:
            predictions = []
            print("[pipeline] AI disabled — skipping Gemini predictions")

        _last_run["time"]   = datetime.now(timezone.utc).isoformat()
        _last_run["status"] = "ok"
        print(f"[pipeline] Completed — {len(regimes)} regimes, {len(predictions)} predictions")

        return {
            "status":      "ok",
            "ai_enabled":  ai_enabled,
            "regimes":     len(regimes),
            "predictions": len(predictions),
            "timestamp":   _last_run["time"],
        }

    except Exception as e:
        _last_run["status"] = f"error: {e}"
        print(f"[pipeline] Error: {e}")
        raise


def start_scheduler():
    scheduler.add_job(run_full_pipeline, "interval", minutes=15, id="pipeline")
    scheduler.start()
    print("[scheduler] Started — pipeline runs every 15 minutes")
