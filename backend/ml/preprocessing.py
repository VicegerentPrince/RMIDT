"""
MacroPreprocessor — feature engineering + normalization for the regime detector.

Adds 3 derived features beyond the raw 7:
  real_rate            = treasury_10yr - cpi_yoy  (inflation-adjusted yield)
  yield_curve_inverted = 1 if yield_spread < 0     (classic recession signal)
  stress_index         = composite of unemployment excess, equity drawdown, CPI overshoot

StandardScaler is fitted on the heuristic seed data so live inference is
on the same scale as training.  SimpleImputer fills 0-valued gaps with
column means before scaling.
"""

import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer

FEATURE_NAMES_RAW = [
    "gdp_growth", "cpi_yoy", "unemployment",
    "fed_rate", "treasury_10yr", "yield_spread", "equity_change_1m",
]

FEATURE_NAMES_DERIVED = ["real_rate", "yield_curve_inverted", "stress_index"]

FEATURE_NAMES_ALL = FEATURE_NAMES_RAW + FEATURE_NAMES_DERIVED

DERIVED_FORMULAS = {
    "real_rate": "treasury_10yr - cpi_yoy  (inflation-adjusted yield; negative = financial repression)",
    "yield_curve_inverted": "1 if yield_spread < 0 else 0  (inverted curve precedes recession ~12 months)",
    "stress_index": "composite of unemployment excess (>4%), equity drawdown (negative), CPI overshoot (>2%)",
}


class MacroPreprocessor:
    """Normalize and engineer macro feature vectors for the regime classifier."""

    def __init__(self):
        self.imputer = SimpleImputer(strategy="mean")
        self.scaler = StandardScaler()
        self._fitted = False

    def _add_derived(self, X: np.ndarray) -> np.ndarray:
        """Extend (n, 7) raw feature array to (n, 10) with engineered features."""
        cpi      = X[:, 1]
        unem     = X[:, 2]
        treasury = X[:, 4]
        spread   = X[:, 5]
        equity   = X[:, 6]

        real_rate      = treasury - cpi
        yield_inv      = (spread < 0).astype(float)
        stress_index   = (
            np.maximum(0.0, (unem - 4.0) / 6.0)       # unemployment above 4 %
            + np.maximum(0.0, -equity / 30.0)           # equity drawdown
            + np.maximum(0.0, (cpi - 2.0) / 8.0)       # CPI above 2 % target
        )
        return np.column_stack([X, real_rate, yield_inv, stress_index])

    def fit_transform(self, X: np.ndarray) -> np.ndarray:
        """Fit on seed/training data and return scaled (n, 10) matrix."""
        X_clean  = self.imputer.fit_transform(X)
        X_ext    = self._add_derived(X_clean)
        X_scaled = self.scaler.fit_transform(X_ext)
        self._fitted = True
        return X_scaled

    def transform(self, X: np.ndarray) -> np.ndarray:
        """Transform live feature vector using the fitted scaler."""
        X_clean = self.imputer.transform(X)
        X_ext   = self._add_derived(X_clean)
        return self.scaler.transform(X_ext)

    def get_info(self) -> dict:
        return {
            "feature_names": FEATURE_NAMES_ALL,
            "derived_features": DERIVED_FORMULAS,
            "scaler_means": list(self.scaler.mean_.round(4)) if self._fitted else None,
            "scaler_stds": list(self.scaler.scale_.round(4)) if self._fitted else None,
            "n_raw_features": len(FEATURE_NAMES_RAW),
            "n_total_features": len(FEATURE_NAMES_ALL),
        }
