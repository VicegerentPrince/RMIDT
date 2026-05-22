import os
import json
import google.generativeai as genai
from datetime import datetime, timezone
from db.supabase_client import get_client
from ai.prompts import MACRO_ANALYST_SYSTEM, STRESS_TEST_SYSTEM

_model = None


def _get_model():
    global _model
    if _model is None:
        genai.configure(api_key=os.environ["GEMINI_API_KEY"])
        _model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=MACRO_ANALYST_SYSTEM,
        )
    return _model


def _call_gemini(system: str, user_prompt: str) -> dict:
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=system,
    )
    response = model.generate_content(user_prompt)
    text = response.text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1]) if lines[-1] == "```" else "\n".join(lines[1:])
    return json.loads(text)


def _recent_news_block(limit: int = 8) -> str:
    """Fetch the most recent news headlines from Supabase for prompt context."""
    try:
        db = get_client()
        rows = (
            db.table("news_headlines")
            .select("title, sentiment_label, published_at")
            .order("captured_at", desc=True)
            .limit(limit)
            .execute()
            .data
        )
        if not rows:
            return ""
        lines = [f"  [{r.get('sentiment_label', '?').upper()}] {r.get('title', '')}" for r in rows]
        return "\nRecent Market News:\n" + "\n".join(lines)
    except Exception:
        return ""


def generate_predictions(regimes: list[dict], supabase_data: dict) -> list[dict]:
    """Generate LLM predictions for each economy and store in Supabase."""
    results = []
    now = datetime.now(timezone.utc).isoformat()
    news_block = _recent_news_block()

    for regime_row in regimes:
        economy = regime_row["economy"]
        regime = regime_row["regime"]
        features = regime_row.get("feature_snapshot", {})

        prompt = f"""
Economy: {economy}
Current Regime: {regime}
Regime Confidence: {regime_row.get('confidence', 0):.0%}

Key Economic Indicators:
- GDP Growth: {features.get('gdp_growth', 'N/A')}%
- CPI Inflation: {features.get('cpi_yoy', 'N/A')}%
- Unemployment: {features.get('unemployment', 'N/A')}%
- Central Bank Rate: {features.get('fed_rate', 'N/A')}%
- 10-Year Treasury Yield: {features.get('treasury_10yr', 'N/A')}%
- Yield Spread (10yr - policy): {features.get('yield_spread', 'N/A')}%
- Equity Market Change: {features.get('equity_change_1m', 'N/A')}%
{news_block}
Provide your macro analysis and prediction.
"""

        try:
            parsed = _call_gemini(MACRO_ANALYST_SYSTEM, prompt)
            row = {
                "economy": economy,
                "regime": regime,
                "reasoning_chain": parsed.get("chain_of_thought", ""),
                "verdict": parsed.get("verdict", ""),
                "confidence": float(parsed.get("confidence", 0.5)),
                "timeframe": parsed.get("timeframe", ""),
                "trigger_conditions": parsed.get("trigger_conditions", {}),
                "historical_analogs": parsed.get("historical_analogs", []),
                "recommendation": parsed.get("recommendation", ""),
                "input_snapshot": {
                    "regime_row": regime_row,
                    "prompt": prompt,
                },
                "model_version": "gemini-2.5-flash",
                "created_at": now,
            }
            results.append(row)
        except Exception as e:
            print(f"[reasoning_engine] Error for {economy}: {e}")

    if results:
        db = get_client()
        db.table("predictions").insert(results).execute()
        print(f"[reasoning_engine] Stored {len(results)} predictions")

    return results


def run_stress_test(scenario_text: str) -> dict:
    """Simulate a macro shock scenario and store in Supabase."""
    prompt = f"""
Shock Scenario: {scenario_text}

Simulate the full cascade of effects across global markets.
Consider second and third-order effects.
"""
    parsed = _call_gemini(STRESS_TEST_SYSTEM, prompt)

    row = {
        "scenario_text": scenario_text,
        "affected_markets": parsed.get("affected_markets", []),
        "contagion_path": parsed.get("contagion_path", []),
        "safe_havens": parsed.get("safe_havens", []),
        "historical_analogs": parsed.get("historical_analogs", []),
        "full_analysis": parsed.get("full_analysis", ""),
        "confidence": float(parsed.get("confidence", 0.5)),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    db = get_client()
    result = db.table("stress_tests").insert(row).execute()
    print(f"[reasoning_engine] Stored stress test result")

    return {**row, "id": result.data[0]["id"] if result.data else None}
