import os
import httpx
from datetime import datetime, timezone
from db.supabase_client import get_client

NEWSAPI_BASE = "https://newsapi.org/v2"

POSITIVE_KEYWORDS = {"surge", "rally", "growth", "gain", "rise", "boom", "strong", "profit", "beat", "record"}
NEGATIVE_KEYWORDS = {"crash", "recession", "crisis", "fall", "drop", "decline", "loss", "fear", "risk", "debt", "default"}


def _sentiment(title: str) -> str:
    lower = title.lower()
    pos = sum(1 for w in POSITIVE_KEYWORDS if w in lower)
    neg = sum(1 for w in NEGATIVE_KEYWORDS if w in lower)
    if pos > neg:
        return "positive"
    if neg > pos:
        return "negative"
    return "neutral"


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

    for article in business + macro:
        title = article.get("title", "")
        if not title or title in seen_titles:
            continue
        seen_titles.add(title)

        pub = article.get("publishedAt")
        rows.append({
            "title": title[:500],
            "source_name": article.get("source", {}).get("name", ""),
            "url": article.get("url", ""),
            "published_at": pub,
            "sentiment_label": _sentiment(title),
            "captured_at": now,
        })

    if rows:
        db = get_client()
        db.table("news_headlines").insert(rows).execute()
        print(f"[news_fetcher] Stored {len(rows)} headlines")

    return rows
