"""
Feature-space k-NN similarity search over stored regime classifications.

Uses cosine similarity on the 7-dimensional economic feature space (optionally
extended to 10 dims by the MacroPreprocessor).  Zero extra API calls — pure numpy.
"""

import numpy as np
from db.supabase_client import get_client


FEATURE_KEYS = [
    "gdp_growth", "cpi_yoy", "unemployment",
    "fed_rate", "treasury_10yr", "yield_spread", "equity_change_1m",
]


def _snapshot_to_vector(snapshot: dict) -> np.ndarray:
    """Convert a feature_snapshot dict to a 7-dim numpy vector."""
    return np.array([float(snapshot.get(k) or 0.0) for k in FEATURE_KEYS])


def _cosine_similarity(query: np.ndarray, corpus: np.ndarray) -> np.ndarray:
    """
    Compute cosine similarity between a single query vector and each row in corpus.
    Returns a (n,) array of similarity scores in [-1, 1].
    """
    q_norm = np.linalg.norm(query)
    c_norms = np.linalg.norm(corpus, axis=1)

    # Guard against zero vectors
    valid = (q_norm > 1e-9) & (c_norms > 1e-9)
    scores = np.zeros(len(corpus))
    if q_norm > 1e-9:
        scores[valid] = corpus[valid] @ query / (c_norms[valid] * q_norm)
    return scores


def find_similar_history(
    current_snapshot: dict,
    economy: str,
    k: int = 3,
    history_limit: int = 100,
) -> list[dict]:
    """
    Find the k most similar past economic states for a given economy using k-NN
    cosine similarity in the 7-dimensional feature space.

    Args:
        current_snapshot: feature_snapshot dict of the current regime row
        economy: one of US / EU / PK / CN / GLOBAL
        k: number of nearest neighbours to return
        history_limit: how many past records to search over

    Returns:
        List of dicts with keys: period, regime, similarity_score, feature_snapshot
    """
    db = get_client()
    rows = (
        db.table("regime_classifications")
        .select("economy, regime, confidence, feature_snapshot, classified_at")
        .eq("economy", economy)
        .order("classified_at", desc=True)
        .limit(history_limit)
        .execute()
        .data
    )

    if not rows:
        return []

    query_vec = _snapshot_to_vector(current_snapshot)

    candidates = []
    vectors = []
    for row in rows:
        snap = row.get("feature_snapshot") or {}
        if not snap:
            continue
        vectors.append(_snapshot_to_vector(snap))
        candidates.append(row)

    if not vectors:
        return []

    corpus = np.array(vectors)
    scores = _cosine_similarity(query_vec, corpus)

    # Rank by similarity descending, skip the first result if it's the current
    # snapshot itself (similarity == 1.0) to avoid self-reference.
    ranked_idx = np.argsort(scores)[::-1]
    results = []
    for idx in ranked_idx:
        row = candidates[idx]
        sim = float(scores[idx])
        if sim >= 0.9999:  # skip exact self-match
            continue
        results.append({
            "period": (row.get("classified_at") or "")[:10],
            "economy": row["economy"],
            "regime": row["regime"],
            "similarity_score": round(sim, 4),
            "confidence": row.get("confidence"),
            "feature_snapshot": row.get("feature_snapshot", {}),
        })
        if len(results) == k:
            break

    return results
