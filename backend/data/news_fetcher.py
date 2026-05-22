import os
import json
import httpx
import google.generativeai as genai
from datetime import datetime, timezone
from db.supabase_client import get_client

NEWSAPI_BASE = "https://newsapi.org/v2"

_POSITIVE = {"surge", "rally", "growth", "gain", "rise", "boom", "strong", "profit", "beat", "record"}
_NEGATIVE = {"crash", "recession", "crisis", "fall", "drop", "decline", "loss", "fear", "risk", "debt", "default"}


def _keyword_sentiment(title: str) -> str:
    lower = title.lower()
    pos = sum(1 for w in _POSITIVE if w in lower)
    neg = sum(1 for w in _NEGATIVE if w in lower)
    if pos > neg:
        return "positive"
    if neg > pos:
        return "negative"
    return "neutral"


def _llm_batch_sentiment(titles: list[str]) -> list[str]:
    """Score a batch of headlines with Gemini. Falls back to keyword matching on failure."""
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key or not titles:
        return [_keyword_sentiment(t) for t in titles]
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")
        numbered = "\n".join(f"{i+1}. {t}" for i, t in enumerate(titles))
        prompt = (
            "Classify each headline's sentiment as 'positive', 'negative', or 'neutral' "
            "from a macro financial market perspective.\n"
            "Return ONLY a JSON array of strings in the same order as the headlines, "
            "e.g. [\"negative\", \"neutral\", \"positive\"].\n\n"
            f"Headlines:\n{numbered}"
        )
        resp = model.generate_content(prompt)
        text = resp.text.strip()
        if text.startswith("```"):
            text = "\n".join(text.split("\n")[1:-1])
        labels = json.loads(text)
        if isinstance(labels, list) and len(labels) == len(titles):
            valid = {"positive", "negative", "neutral"}
            return [l if l in valid else "neutral" for l in labels]
    except Exception as e:
        print(f"[news_fetcher] LLM sentiment failed, using keyword fallback: {e}")
    return [_keyword_sentiment(t) for t in titles]


def _fetch_headlines(api_key: str, endpoint: str, params: dict) -> list[dict]:
    try:
        resp = httpx.get(
            f"{NEWSAPI_BASE}/{endpoint}",
            params={"apiKey": api_key, **params},
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json().get("articles", [])
    except Exception as e:
        print(f"[news_fetcher] Error fetching {endpoint}: {e}")
        return []


def fetch_and_store() -> list[dict]:
    api_key = os.environ.get("NEWS_API_KEY", "")
    rows = []
    seen_titles: set[str] = set()

    now = datetime.now(timezone.utc).isoformat()

    business = _fetch_headlines(api_key, "top-headlines", {"category": "business", "pageSize": 20})
    macro = _fetch_headlines(api_key, "everything", {"q": "economy markets recession", "pageSize": 20, "language": "en"})

    articles_deduped = []
    for article in business + macro:
        title = article.get("title", "")
        if not title or title in seen_titles:
            continue
        seen_titles.add(title)
        articles_deduped.append(article)

    titles = [a["title"] for a in articles_deduped]
    sentiments = _llm_batch_sentiment(titles)

    for article, sentiment in zip(articles_deduped, sentiments):
        pub = article.get("publishedAt")
        rows.append({
            "title": article["title"][:500],
            "source_name": article.get("source", {}).get("name", ""),
            "url": article.get("url", ""),
            "published_at": pub,
            "sentiment_label": sentiment,
            "captured_at": now,
        })

    if rows:
        db = get_client()
        db.table("news_headlines").insert(rows).execute()
        print(f"[news_fetcher] Stored {len(rows)} headlines")

    return rows
