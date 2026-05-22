"""
RMIDT Macro Intelligence Agent.

Architecture: pre-fetch all live context from Supabase (regimes, market, indicators,
news, k-NN similar history), then make ONE Gemini call with the AGENT_SYSTEM prompt
that instructs the model to reason in ReAct format (THOUGHT / TOOL / OBSERVATION /
ANSWER).  The response is parsed into a structured tool_trace for the frontend.

Zero extra API calls beyond a single Gemini generation.
"""

import os
import re
import json
import time
import google.generativeai as genai
from datetime import datetime, timezone

from db.supabase_client import get_client
from ai.prompts import AGENT_SYSTEM
from ml.semantic_search import find_similar_history


# ---------------------------------------------------------------------------
# Context fetchers
# ---------------------------------------------------------------------------

def _fetch_all_context() -> dict:
    """Pull the latest snapshot of every table the agent has tools for."""
    db = get_client()

    regimes = (
        db.table("regime_classifications")
        .select("economy, regime, confidence, feature_snapshot, classified_at")
        .order("classified_at", desc=True)
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
    indicators = (
        db.table("macro_indicators")
        .select("series_id, country, indicator_name, value, period, source")
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

    # k-NN similar history for each tracked economy
    similar_history: dict[str, list] = {}
    regime_by_economy = {r["economy"]: r for r in regimes}
    for economy, row in regime_by_economy.items():
        snap = row.get("feature_snapshot") or {}
        if snap:
            similar_history[economy] = find_similar_history(snap, economy, k=3)

    return {
        "regimes": regimes,
        "market": market,
        "indicators": indicators,
        "news": news,
        "similar_history": similar_history,
    }


def _build_context_block(ctx: dict, max_chars: int = 6000) -> str:
    """Serialize the pre-fetched context into a text block for the prompt."""
    def fmt(obj, limit=1400):
        s = json.dumps(obj, indent=2, default=str)
        return s[:limit] + ("\n[...truncated]" if len(s) > limit else "")

    block = (
        "=== TOOL: get_regime_data() — current regime classifications ===\n"
        + fmt(ctx["regimes"])
        + "\n\n=== TOOL: get_market_snapshot() — live market prices ===\n"
        + fmt(ctx["market"])
        + "\n\n=== TOOL: get_macro_indicators() — FRED/WorldBank indicators ===\n"
        + fmt(ctx["indicators"])
        + "\n\n=== TOOL: get_recent_news() — latest headlines ===\n"
        + fmt(ctx["news"])
        + "\n\n=== TOOL: find_similar_history() — k-NN results per economy ===\n"
        + fmt(ctx["similar_history"])
    )
    return block[:max_chars]


# ---------------------------------------------------------------------------
# Response parser
# ---------------------------------------------------------------------------

def _parse_react_response(text: str) -> dict:
    """
    Parse a Gemini ReAct-format response into:
      tool_trace: list of {thought, tool, observation}
      answer:     dict from the ANSWER: {...} block
    """
    trace: list[dict] = []
    current: dict = {}

    lines = text.strip().split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]

        if line.startswith("THOUGHT:"):
            if current:
                trace.append(current)
            current = {
                "thought": line[8:].strip(),
                "tool": None,
                "observation": None,
            }
        elif line.startswith("TOOL:") and current is not None:
            current["tool"] = line[5:].strip()
        elif line.startswith("OBSERVATION:") and current is not None:
            # Observation may span multiple lines until the next keyword
            obs_parts = [line[12:].strip()]
            while i + 1 < len(lines):
                peek = lines[i + 1]
                if any(peek.startswith(k) for k in ("THOUGHT:", "TOOL:", "ANSWER:")):
                    break
                i += 1
                obs_parts.append(lines[i])
            current["observation"] = " ".join(obs_parts).strip()
        elif line.startswith("ANSWER:"):
            if current:
                trace.append(current)
                current = {}
            answer_text = text[text.find("ANSWER:") + 7:]
            json_match = re.search(r"\{.*\}", answer_text, re.DOTALL)
            answer: dict = {}
            if json_match:
                try:
                    answer = json.loads(json_match.group(0))
                except json.JSONDecodeError:
                    answer = {"verdict": answer_text.strip()}
            return {"tool_trace": trace, "answer": answer}

        i += 1

    if current:
        trace.append(current)
    return {"tool_trace": trace, "answer": {}}


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def run_agent(task: str) -> dict:
    """
    Run the RMIDT macro agent on a natural-language task.

    Returns a dict with:
      tool_trace    list of {thought, tool, observation}
      answer        structured dict parsed from ANSWER block
      raw_response  full Gemini text (for debugging)
      model_version
      elapsed_ms
      generated_at
    """
    t0 = time.time()

    # Step 1: pre-fetch all context (Supabase only, no Gemini calls)
    ctx = _fetch_all_context()
    context_block = _build_context_block(ctx)

    prompt = (
        f"=== LIVE DATA CONTEXT ===\n{context_block}\n\n"
        f"=== TASK ===\n{task}\n\n"
        "Now reason step-by-step using the data above. Follow the THOUGHT/TOOL/OBSERVATION format strictly."
    )

    # Step 2: single Gemini call
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=AGENT_SYSTEM,
    )
    response = model.generate_content(prompt)
    raw = response.text.strip()

    # Step 3: parse ReAct output
    parsed = _parse_react_response(raw)

    elapsed_ms = round((time.time() - t0) * 1000)

    return {
        **parsed,
        "task": task,
        "raw_response": raw,
        "model_version": "gemini-2.5-flash",
        "elapsed_ms": elapsed_ms,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
