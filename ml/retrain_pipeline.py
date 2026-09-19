"""
retrain_pipeline.py
Orchestrates the full ML pipeline for a single asset (or all assets):
  1. Fetch fresh price history from yfinance
  2. Preprocess features
  3. Train and save best model

Called by api_server.py /retrain endpoints.
"""

import os
import sys
import logging
import time

import pandas as pd
import yfinance as yf
import joblib
import numpy as np

from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import config
from preprocessing import (
    add_technical_indicators,
    add_lag_and_return_features,
    add_calendar_features,
    add_target,
    merge_sentiment,
)

try:
    from xgboost import XGBRegressor
    HAS_XGB = True
except ImportError:
    HAS_XGB = False

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

FEATURE_COLS = [
    "sma_10", "sma_20", "sma_50", "ema_10", "ema_20",
    "rsi_14", "macd", "macd_signal", "macd_diff",
    "bb_high", "bb_low", "bb_width", "atr_14", "adx_14",
    "return_1d", "return_lag_1d", "return_lag_3d", "return_lag_5d", "return_lag_10d",
    "volatility_10d", "volatility_20d",
    "rolling_max_20d", "rolling_min_20d",
    "day_of_week", "month", "is_month_end",
    "sentiment_score", "news_count",
]


def _symbol_clean(symbol: str) -> str:
    return symbol.replace("=", "_").replace(".", "_")


def fetch_and_preprocess(symbol: str) -> pd.DataFrame:
    """Fetch 5 years of OHLCV from yfinance and run full feature engineering pipeline."""
    log.info(f"[Retrain] Fetching data for {symbol} ...")
    ticker = yf.Ticker(symbol)
    df = ticker.history(period=config.HISTORY_PERIOD, interval="1d")
    if df.empty:
        raise ValueError(f"No data returned by yfinance for {symbol}")

    df = df.reset_index()
    df["symbol"] = symbol
    df.columns = [c.lower().replace(" ", "_") for c in df.columns]
    if "date" not in df.columns and "datetime" in df.columns:
        df = df.rename(columns={"datetime": "date"})
    df["date"] = pd.to_datetime(df["date"]).dt.tz_localize(None)
    df = df.sort_values("date").drop_duplicates(subset="date", keep="last").reset_index(drop=True)

    # Forward-fill small gaps
    price_cols = [c for c in ["open", "high", "low", "close", "volume"] if c in df.columns]
    df[price_cols] = df[price_cols].ffill(limit=3)
    df = df.dropna(subset=["close"])

    # Feature engineering
    df = add_technical_indicators(df)
    df = add_lag_and_return_features(df)
    df = add_calendar_features(df)
    df = merge_sentiment(df, symbol)
    df["sentiment_score"] = df.get("sentiment_score", pd.Series(0.0, index=df.index)).fillna(0.0)
    df["news_count"] = df.get("news_count", pd.Series(0, index=df.index)).fillna(0)
    df = add_target(df)
    df = df.dropna().reset_index(drop=True)

    if len(df) < 60:
        raise ValueError(f"Not enough clean data rows for {symbol}: {len(df)} rows")

    return df


def train_for_symbol(symbol: str, task: str = "regression") -> dict:
    """
    Full retrain pipeline for one symbol.
    Returns a dict with status and metrics.
    """
    sc = _symbol_clean(symbol)
    try:
        df = fetch_and_preprocess(symbol)
    except Exception as e:
        return {"symbol": symbol, "success": False, "error": str(e)}

    feature_cols = [c for c in FEATURE_COLS if c in df.columns]
    if len(feature_cols) < 5:
        return {"symbol": symbol, "success": False, "error": f"Too few features: {feature_cols}"}

    # Chronological split
    split_idx = int(len(df) * config.TRAIN_TEST_SPLIT_DATE_FRACTION)
    train_df = df.iloc[:split_idx]
    test_df = df.iloc[split_idx:]

    if len(test_df) < 5:
        return {"symbol": symbol, "success": False, "error": "Test set too small after split"}

    X_train = train_df[feature_cols].fillna(0)
    X_test = test_df[feature_cols].fillna(0)

    target_col = "target_return" if task == "regression" else "target_direction"
    y_train = train_df[target_col]
    y_test = test_df[target_col]

    scaler = StandardScaler().fit(X_train)
    X_train_s = scaler.transform(X_train)
    X_test_s = scaler.transform(X_test)

    # Train models and pick best by RMSE
    candidates = {
        "LinearRegression": LinearRegression(),
        "RandomForest": RandomForestRegressor(n_estimators=200, max_depth=7, random_state=42, n_jobs=-1),
    }
    if HAS_XGB:
        candidates["XGBoost"] = XGBRegressor(
            n_estimators=300, max_depth=5, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8, random_state=42
        )

    best_name = None
    best_model = None
    best_rmse = float("inf")
    best_metrics = {}

    for name, model in candidates.items():
        try:
            model.fit(X_train_s, y_train)
            if task == "regression":
                preds_return = model.predict(X_test_s)
                preds_return = np.clip(preds_return, -0.06, 0.06)
                preds_price = test_df["close"].values * (1 + preds_return)
                y_test_price = test_df["target_price"].values
                rmse = float(np.sqrt(mean_squared_error(y_test_price, preds_price)))
                mae = float(mean_absolute_error(y_test_price, preds_price))
                mape = float(np.mean(np.abs((y_test_price - preds_price) / (y_test_price + 1e-8))) * 100)
                r2 = float(r2_score(y_test_price, preds_price))
            else:
                preds = model.predict(X_test_s)
                rmse = float(np.mean(preds != y_test))
                mae = rmse
                mape = rmse * 100
                r2 = float(np.mean(preds == y_test))

            log.info(f"[Retrain] {symbol} {name}: RMSE={rmse:.4f} MAE={mae:.4f} R2={r2:.4f}")
            if rmse < best_rmse:
                best_rmse = rmse
                best_name = name
                best_model = model
                best_metrics = {"rmse": rmse, "mae": mae, "mape": mape, "r2": r2}
        except Exception as e:
            log.warning(f"[Retrain] {name} failed for {symbol}: {e}")

    if best_model is None:
        return {"symbol": symbol, "success": False, "error": "All models failed to train"}

    # Save artifacts
    os.makedirs(config.MODELS_DIR, exist_ok=True)
    model_path = os.path.join(config.MODELS_DIR, f"{sc}_{task}_{best_name}.joblib")
    scaler_path = os.path.join(config.MODELS_DIR, f"{sc}_{task}_scaler.joblib")
    features_path = os.path.join(config.MODELS_DIR, f"{sc}_{task}_features.joblib")
    joblib.dump(best_model, model_path)
    joblib.dump(scaler, scaler_path)
    joblib.dump(feature_cols, features_path)
    log.info(f"[Retrain] Saved {best_name} for {symbol} → {model_path}")

    return {
        "symbol": symbol,
        "success": True,
        "model": best_name,
        "metrics": best_metrics,
        "rows_trained": len(train_df),
        "rows_tested": len(test_df),
    }


def retrain_all(task: str = "regression") -> list:
    """Retrain models for every asset in config.ALL_ASSETS."""
    results = []
    for symbol in config.ALL_ASSETS:
        result = train_for_symbol(symbol, task)
        results.append(result)
        time.sleep(0.5)  # be polite to yfinance
    return results


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--symbol", help="Single symbol to retrain")
    parser.add_argument("--all", action="store_true", help="Retrain all assets")
    parser.add_argument("--task", default="regression", choices=["regression", "direction"])
    args = parser.parse_args()

    if args.all:
        results = retrain_all(args.task)
        for r in results:
            print(r)
    elif args.symbol:
        print(train_for_symbol(args.symbol, args.task))
    else:
        parser.print_help()
