"""
predict.py
Inference script for PriceOracle — loads trained .joblib models and
generates price predictions.

The Node.js backend calls this via child_process.spawn.

Usage:
    python predict.py --symbol AAPL --task regression
    python predict.py --symbol AAPL --task direction
    python predict.py --all
    python predict.py --all --task direction
"""

import os
import sys
import json
import glob
import argparse
import logging
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
import joblib
import yfinance as yf

# Ensure the ml/ directory is on the path so config and preprocessing import
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import config
from preprocessing import add_technical_indicators, add_lag_and_return_features, add_calendar_features

logging.basicConfig(level=logging.WARNING, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------

def _find_model_file(symbol_clean: str, task: str) -> str | None:
    """
    Locate the best-model .joblib file for a given symbol and task.
    Naming convention from train_model.py: <symbol>_<task>_<ModelName>.joblib
    """
    pattern = os.path.join(config.MODELS_DIR, f"{symbol_clean}_{task}_*.joblib")
    candidates = [
        f for f in glob.glob(pattern)
        if not f.endswith("_scaler.joblib") and not f.endswith("_features.joblib")
    ]
    if not candidates:
        return None
    # If multiple models exist, prefer XGBoost > RandomForest > Linear/Logistic
    priority = {"XGBoost": 0, "RandomForest": 1, "LinearRegression": 2, "LogisticRegression": 2}
    candidates.sort(key=lambda f: priority.get(
        os.path.basename(f).replace(f"{symbol_clean}_{task}_", "").replace(".joblib", ""), 99
    ))
    return candidates[0]


def _extract_model_name(model_path: str, symbol_clean: str, task: str) -> str:
    """Extract the model name (e.g. 'XGBoost') from the file path."""
    basename = os.path.basename(model_path).replace(".joblib", "")
    prefix = f"{symbol_clean}_{task}_"
    return basename.replace(prefix, "")


def _symbol_to_clean(symbol: str) -> str:
    """Convert ticker symbol to the cleaned filename format used by train_model.py."""
    return symbol.replace("=", "_").replace(".", "_")


def _fetch_latest_data(symbol: str, days: int = 120) -> pd.DataFrame:
    """
    Fetch recent price history for a symbol via yfinance.
    We pull extra days so rolling-window indicators have enough warm-up data.
    """
    ticker = yf.Ticker(symbol)
    df = ticker.history(period=f"{days}d", interval="1d")
    if df.empty:
        return df
    df = df.reset_index()
    df["symbol"] = symbol
    df.columns = [c.lower().replace(" ", "_") for c in df.columns]
    # Ensure 'date' is datetime
    if "date" not in df.columns and "datetime" in df.columns:
        df = df.rename(columns={"datetime": "date"})
    df["date"] = pd.to_datetime(df["date"]).dt.tz_localize(None)
    return df


def _prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Apply the same feature engineering pipeline used during training.
    """
    df = add_technical_indicators(df)
    df = add_lag_and_return_features(df)
    df = add_calendar_features(df)
    # Fill sentiment with defaults (not available at inference time)
    df["sentiment_score"] = 0.0
    df["news_count"] = 0
    return df


# ---------------------------------------------------------------------------
# PREDICTION
# ---------------------------------------------------------------------------

def predict_single(symbol: str, task: str = "regression") -> dict:
    """
    Load the trained model, scaler, and feature list for the given symbol/task,
    fetch latest market data, compute features, and return a prediction dict.
    """
    symbol_clean = _symbol_to_clean(symbol)
    friendly_name = config.ALL_ASSETS.get(symbol, symbol)

    # --- Locate model artifacts ---
    model_path = _find_model_file(symbol_clean, task)
    if model_path is None:
        return {
            "error": True,
            "symbol": symbol,
            "name": friendly_name,
            "message": f"No trained {task} model found for {symbol}. Run train_model.py first.",
        }

    scaler_path = os.path.join(config.MODELS_DIR, f"{symbol_clean}_{task}_scaler.joblib")
    features_path = os.path.join(config.MODELS_DIR, f"{symbol_clean}_{task}_features.joblib")

    if not os.path.exists(scaler_path) or not os.path.exists(features_path):
        return {
            "error": True,
            "symbol": symbol,
            "name": friendly_name,
            "message": f"Scaler or feature list missing for {symbol} ({task}). Retrain the model.",
        }

    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    feature_cols = joblib.load(features_path)
    model_name = _extract_model_name(model_path, symbol_clean, task)

    # --- Fetch and prepare data ---
    try:
        raw_df = _fetch_latest_data(symbol)
    except Exception as e:
        return {
            "error": True,
            "symbol": symbol,
            "name": friendly_name,
            "message": f"Failed to fetch data for {symbol}: {str(e)}",
        }

    if raw_df.empty:
        return {
            "error": True,
            "symbol": symbol,
            "name": friendly_name,
            "message": f"No recent price data available for {symbol}.",
        }

    df = _prepare_features(raw_df)

    # Use the most recent complete row
    available_features = [c for c in feature_cols if c in df.columns]
    if len(available_features) < len(feature_cols):
        missing = set(feature_cols) - set(available_features)
        # Fill missing features with 0 so prediction can still run
        for col in missing:
            df[col] = 0.0

    # Take the last row (most recent trading day)
    latest_row = df.iloc[[-1]][feature_cols]

    # Drop any NaN rows — if the last row has NaNs, try the second-to-last, etc.
    for i in range(len(df) - 1, max(len(df) - 10, -1), -1):
        candidate = df.iloc[[i]][feature_cols]
        if not candidate.isna().any().any():
            latest_row = candidate
            break
    else:
        # If all recent rows have NaNs, fill with 0
        latest_row = latest_row.fillna(0)

    # Scale features
    X_scaled = scaler.transform(latest_row.values)

    # --- Run prediction ---
    prediction_date = datetime.now().strftime("%Y-%m-%d")
    target_date = (datetime.now() + timedelta(days=config.PREDICTION_HORIZON)).strftime("%Y-%m-%d")
    current_price = float(df["close"].iloc[-1])

    if task == "regression":
        predicted_price = float(model.predict(X_scaled)[0])
        direction = "up" if predicted_price > current_price else "down"
        change_pct = ((predicted_price - current_price) / current_price) * 100

        return {
            "error": False,
            "symbol": symbol,
            "name": friendly_name,
            "current_price": round(current_price, 4),
            "predicted_price": round(predicted_price, 4),
            "direction": direction,
            "change_percent": round(change_pct, 2),
            "model_name": model_name,
            "task": task,
            "prediction_date": prediction_date,
            "target_date": target_date,
        }
    else:  # direction / classification
        direction_pred = int(model.predict(X_scaled)[0])
        direction = "up" if direction_pred == 1 else "down"

        # Try to get probability/confidence
        confidence = None
        if hasattr(model, "predict_proba"):
            proba = model.predict_proba(X_scaled)[0]
            confidence = float(max(proba))

        result = {
            "error": False,
            "symbol": symbol,
            "name": friendly_name,
            "current_price": round(current_price, 4),
            "direction": direction,
            "model_name": model_name,
            "task": task,
            "prediction_date": prediction_date,
            "target_date": target_date,
        }
        if confidence is not None:
            result["confidence"] = round(confidence, 4)
        return result


def predict_all(task: str = "regression") -> list[dict]:
    """Run prediction for every asset defined in config.ALL_ASSETS."""
    results = []
    for symbol in config.ALL_ASSETS:
        try:
            result = predict_single(symbol, task)
            results.append(result)
        except Exception as e:
            results.append({
                "error": True,
                "symbol": symbol,
                "name": config.ALL_ASSETS.get(symbol, symbol),
                "message": f"Unexpected error: {str(e)}",
            })
    return results


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="PriceOracle Inference Script")
    parser.add_argument("--symbol", type=str, help="Ticker symbol, e.g. AAPL, GC=F, BTC-USD")
    parser.add_argument("--task", type=str, choices=["regression", "direction"], default="regression",
                        help="Prediction task: 'regression' (price) or 'direction' (up/down)")
    parser.add_argument("--all", action="store_true", help="Run predictions for all assets")
    args = parser.parse_args()

    if args.all:
        results = predict_all(args.task)
        print(json.dumps(results, indent=2))
    elif args.symbol:
        result = predict_single(args.symbol, args.task)
        print(json.dumps(result, indent=2))
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
