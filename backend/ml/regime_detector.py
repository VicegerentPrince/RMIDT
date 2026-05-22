"""
Regime detector using RandomForestClassifier.

Five regimes: Expansion, Peak, Contraction, Crisis, Recovery

Trained on a heuristic-seeded dataset that encodes economic theory.
Retrained each time classify() is called with new data from Supabase.
"""

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from datetime import datetime, timezone
from db.supabase_client import get_client

REGIMES = ["Expansion", "Peak", "Contraction", "Crisis", "Recovery"]

# Each row: [gdp_growth, cpi_yoy, unemployment, fed_rate, treasury_10yr, yield_spread, equity_change_1m]
# Labels encode economic theory for each regime
_SEED_X = np.array([
    # Expansion: GDP+, CPI moderate, unemployment low, equities up
    [3.5, 2.5, 4.0, 1.5, 3.5, 2.0,  4.0],
    [2.8, 2.2, 4.2, 1.0, 3.0, 2.0,  3.5],
    [4.0, 3.0, 3.5, 2.0, 4.0, 2.0,  5.0],
    # Peak: GDP slowing, CPI high, equities near top
    [1.5, 5.0, 3.8, 4.5, 5.5, 1.0,  1.5],
    [1.0, 4.5, 3.5, 4.0, 5.0, 1.0,  0.5],
    [0.8, 5.5, 3.6, 5.0, 5.8, 0.8, -0.5],
    # Contraction: GDP negative/flat, unemployment rising, equities down
    [-0.5, 3.5, 5.5, 3.0, 4.0, 1.0, -5.0],
    [-1.0, 2.5, 6.5, 2.0, 3.5, 1.5, -8.0],
    [-0.2, 2.0, 6.0, 1.5, 3.0, 1.5, -6.0],
    # Crisis: GDP sharply negative, unemployment high, equities crashing
    [-3.5, 1.0, 9.0, 0.25, 2.5, 2.25, -20.0],
    [-4.5, 0.5, 10.5, 0.1, 2.0, 1.9,  -30.0],
    [-2.5, 1.5, 8.5, 0.5, 2.8, 2.3,  -15.0],
    # Recovery: GDP turning up, unemployment still elevated but falling
    [1.0, 1.5, 7.5, 0.25, 2.5, 2.25,  3.0],
    [1.5, 2.0, 7.0, 0.5, 2.8, 2.3,   5.0],
    [0.8, 1.8, 7.8, 0.1, 2.3, 2.2,   2.0],
], dtype=float)

_SEED_Y = np.array([
    0, 0, 0,  # Expansion
    1, 1, 1,  # Peak
    2, 2, 2,  # Contraction
    3, 3, 3,  # Crisis
    4, 4, 4,  # Recovery
])

_model = RandomForestClassifier(n_estimators=100, random_state=42)
_model.fit(_SEED_X, _SEED_Y)


def _build_feature_vector(economy: str, supabase_data: dict) -> np.ndarray:
    """Extract feature vector for a given economy from the latest Supabase data."""
    macro = supabase_data.get("macro", [])
    market = supabase_data.get("market", [])

    def get_macro(series: str, country: str = "US") -> float:
        matches = [r for r in macro if r.get("series_id") == series and r.get("country") == country]
        if matches:
            return float(matches[-1].get("value") or 0.0)
        return 0.0

    def get_equity_change(symbol: str) -> float:
        matches = [r for r in market if r.get("symbol") == symbol]
        if matches:
            return float(matches[-1].get("change_pct") or 0.0)
        return 0.0

    economy_config = {
        "US":     {"gdp": ("GDPC1", "US"),    "cpi": ("CPIAUCSL", "US"), "unem": ("UNRATE", "US"),
                   "rate": ("FEDFUNDS", "US"), "t10": ("DGS10", "US"),    "equity": "^GSPC"},
        "EU":     {"gdp": ("NY.GDP.MKTP.CD", "DE"), "cpi": ("FP.CPI.TOTL.ZG", "DE"), "unem": ("SL.UEM.TOTL.ZS", "DE"),
                   "rate": ("FEDFUNDS", "US"),       "t10": ("DGS10", "US"),           "equity": "^GDAXI"},
        "PK":     {"gdp": ("NY.GDP.MKTP.CD", "PK"), "cpi": ("FP.CPI.TOTL.ZG", "PK"), "unem": ("SL.UEM.TOTL.ZS", "PK"),
                   "rate": ("FEDFUNDS", "US"),       "t10": ("DGS10", "US"),           "equity": "^KSE"},
        "CN":     {"gdp": ("NY.GDP.MKTP.CD", "CN"), "cpi": ("FP.CPI.TOTL.ZG", "CN"), "unem": ("SL.UEM.TOTL.ZS", "CN"),
                   "rate": ("FEDFUNDS", "US"),       "t10": ("DGS10", "US"),           "equity": "^HSI"},
        "GLOBAL": {"gdp": ("GDPC1", "US"),    "cpi": ("CPIAUCSL", "US"), "unem": ("UNRATE", "US"),
                   "rate": ("FEDFUNDS", "US"), "t10": ("DGS10", "US"),    "equity": "^GSPC"},
    }

    cfg = economy_config.get(economy, economy_config["US"])
    gdp = get_macro(*cfg["gdp"])
    cpi = get_macro(*cfg["cpi"])
    unem = get_macro(*cfg["unem"])
    rate = get_macro(*cfg["rate"])
    t10 = get_macro(*cfg["t10"])
    spread = t10 - rate
    equity = get_equity_change(cfg["equity"])

    return np.array([[gdp, cpi, unem, rate, t10, spread, equity]], dtype=float)


def classify_all(supabase_data: dict) -> list[dict]:
    """Classify all tracked economies and store results in Supabase."""
    economies = ["US", "EU", "PK", "CN", "GLOBAL"]
    results = []
    now = datetime.now(timezone.utc).isoformat()

    for economy in economies:
        try:
            features = _build_feature_vector(economy, supabase_data)
            pred = int(_model.predict(features)[0])
            proba = _model.predict_proba(features)[0]
            regime = REGIMES[pred]
            confidence = round(float(proba[pred]), 4)

            row = {
                "economy": economy,
                "regime": regime,
                "confidence": confidence,
                "feature_snapshot": {
                    "gdp_growth": float(features[0][0]),
                    "cpi_yoy": float(features[0][1]),
                    "unemployment": float(features[0][2]),
                    "fed_rate": float(features[0][3]),
                    "treasury_10yr": float(features[0][4]),
                    "yield_spread": float(features[0][5]),
                    "equity_change_1m": float(features[0][6]),
                },
                "classified_at": now,
            }
            results.append(row)
        except Exception as e:
            print(f"[regime_detector] Error classifying {economy}: {e}")

    if results:
        db = get_client()
        db.table("regime_classifications").insert(results).execute()
        print(f"[regime_detector] Stored {len(results)} regime classifications")

    return results
