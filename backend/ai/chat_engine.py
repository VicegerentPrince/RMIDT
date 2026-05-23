"""
Context-aware AI chat engine.
Fetches live Supabase state, builds a rich prompt, and answers questions via Gemini.
"""

import json
import google.generativeai as genai
from datetime import datetime, timezone
from db.supabase_client import get_client
from ai.prompts import CHAT_SYSTEM
from ai.api_key import get_api_key


def _fetch_context() -> dict:
    db = get_client()

    regimes = (
        db.table("regime_classifications")
        .select("economy, regime, confidence, feature_snapshot, classified_at")
        .order("classified_at", desc=True)
        .limit(10)
        .execute()
        .data
    )
    predictions = (
        db.table("predictions")
        .select("economy, regime, verdict, recommendation, confidence, timeframe, created_at")
        .order("created_at", desc=True)
        .limit(10)
        .execute()
        .data
    )
    market = (
        db.table("market_data")
        .select("symbol, name, category, price, change_pct, currency, captured_at")
        .order("captured_at", desc=True)
        .limit(30)
        .execute()
        .data
    )
    news = (
        db.table("news_headlines")
        .select("title, sentiment_label, source_name, published_at")
        .order("captured_at", desc=True)
        .limit(15)
        .execute()
        .data
    )

    return {"regimes": regimes, "predictions": predictions, "market": market, "news": news}


def _build_context_block(ctx: dict) -> str:
    def fmt(obj, max_chars=1800):
        s = json.dumps(obj, indent=2, default=str)
        return s[:max_chars] + ("\n... (truncated)" if len(s) > max_chars else "")

    return (
        f"=== REGIME CLASSIFICATIONS ===\n{fmt(ctx['regimes'])}\n\n"
        f"=== LATEST AI PREDICTIONS ===\n{fmt(ctx['predictions'])}\n\n"
        f"=== LIVE MARKET DATA ===\n{fmt(ctx['market'])}\n\n"
        f"=== RECENT NEWS HEADLINES ===\n{fmt(ctx['news'])}"
    )


def answer_question(question: str) -> dict:
    """Answer a macro finance question using live Supabase data as context."""
    ctx = _fetch_context()
    context_block = _build_context_block(ctx)

    prompt = f"{context_block}\n\n=== USER QUESTION ===\n{question}"

    genai.configure(api_key=get_api_key())
    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=CHAT_SYSTEM,
    )
    response = model.generate_content(prompt)
    text = response.text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1]) if lines[-1] == "```" else "\n".join(lines[1:])

    parsed = json.loads(text)
    return {
        **parsed,
        "question": question,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "model_version": "gemini-2.5-flash",
    }
