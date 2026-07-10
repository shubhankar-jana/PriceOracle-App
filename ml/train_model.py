"""
train_model.py
Trains and evaluates ML models per asset on the processed dataset.

Two prediction modes:
  --task regression   -> predicts target_price (next-day close)
  --task direction    -> predicts target_direction (up/down, classification)

Uses a CHRONOLOGICAL train/test split (never random) because shuffling
time series data leaks future information into training.

Models compared:
  - Linear/Logistic Regression (baseline)
  - Random Forest
  - XGBoost / LightGBM (if installed, best tabular performance)

Run:
    python train_model.py --symbol AAPL --task regression
    python train_model.py --symbol GC_F --task direction
"""

import os
import argparse
import joblib
import numpy as np
import pandas as pd

from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    mean_absolute_error, mean_squared_error, r2_score,
    accuracy_score, precision_score, recall_score, f1_score,
)

import config

try:
    from xgboost import XGBRegressor, XGBClassifier
    HAS_XGB = True
except ImportError:
    HAS_XGB = False


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


def load_dataset(symbol_filename: str) -> pd.DataFrame:
    path = os.path.join(config.PROCESSED_DIR, symbol_filename)
    return pd.read_csv(path, parse_dates=["date"])


def chronological_split(df: pd.DataFrame, split_fraction=config.TRAIN_TEST_SPLIT_DATE_FRACTION):
    df = df.sort_values("date").reset_index(drop=True)
    split_idx = int(len(df) * split_fraction)
    train_df = df.iloc[:split_idx]
    test_df = df.iloc[split_idx:]
    return train_df, test_df


def get_available_features(df: pd.DataFrame) -> list:
    return [c for c in FEATURE_COLS if c in df.columns]


def train_regression_models(X_train, y_train, X_test, y_test):
    results = {}
    models = {
        "LinearRegression": LinearRegression(),
        "RandomForest": RandomForestRegressor(n_estimators=300, max_depth=8, random_state=42, n_jobs=-1),
    }
    if HAS_XGB:
        models["XGBoost"] = XGBRegressor(
            n_estimators=400, max_depth=5, learning_rate=0.03,
            subsample=0.8, colsample_bytree=0.8, random_state=42
        )

    for name, model in models.items():
        model.fit(X_train, y_train)
        preds = model.predict(X_test)

        rmse = np.sqrt(mean_squared_error(y_test, preds))
        mae = mean_absolute_error(y_test, preds)
        mape = np.mean(np.abs((y_test - preds) / y_test)) * 100
        r2 = r2_score(y_test, preds)

        results[name] = {
            "model": model,
            "RMSE": rmse, "MAE": mae, "MAPE_%": mape, "R2": r2,
        }
        print(f"[{name}] RMSE={rmse:.4f}  MAE={mae:.4f}  MAPE={mape:.2f}%  R2={r2:.4f}")

    return results


def train_direction_models(X_train, y_train, X_test, y_test):
    results = {}
    models = {
        "LogisticRegression": LogisticRegression(max_iter=1000),
        "RandomForest": RandomForestClassifier(n_estimators=300, max_depth=8, random_state=42, n_jobs=-1),
    }
    if HAS_XGB:
        models["XGBoost"] = XGBClassifier(
            n_estimators=400, max_depth=5, learning_rate=0.03,
            subsample=0.8, colsample_bytree=0.8, random_state=42,
            eval_metric="logloss"
        )

    for name, model in models.items():
        model.fit(X_train, y_train)
        preds = model.predict(X_test)

        acc = accuracy_score(y_test, preds)
        prec = precision_score(y_test, preds, zero_division=0)
        rec = recall_score(y_test, preds, zero_division=0)
        f1 = f1_score(y_test, preds, zero_division=0)

        results[name] = {
            "model": model,
            "Accuracy": acc, "Precision": prec, "Recall": rec, "F1": f1,
        }
        print(f"[{name}] Accuracy={acc:.4f}  Precision={prec:.4f}  Recall={rec:.4f}  F1={f1:.4f}")

    return results


def pick_best_model(results: dict, task: str):
    if task == "regression":
        best_name = min(results, key=lambda k: results[k]["RMSE"])
    else:
        best_name = max(results, key=lambda k: results[k]["F1"])
    return best_name, results[best_name]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--symbol", type=str, required=True, help="Processed filename or symbol, e.g. AAPL")
    parser.add_argument("--task", type=str, choices=["regression", "direction"], default="regression")
    args = parser.parse_args()

    fname = args.symbol if args.symbol.endswith(".csv") else f"{args.symbol}.csv"
    df = load_dataset(fname)
    feature_cols = get_available_features(df)

    train_df, test_df = chronological_split(df)

    X_train, X_test = train_df[feature_cols], test_df[feature_cols]
    scaler = StandardScaler().fit(X_train)
    X_train_scaled = scaler.transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    if args.task == "regression":
        y_train, y_test = train_df["target_price"], test_df["target_price"]
        results = train_regression_models(X_train_scaled, y_train, X_test_scaled, y_test)
    else:
        y_train, y_test = train_df["target_direction"], test_df["target_direction"]
        results = train_direction_models(X_train_scaled, y_train, X_test_scaled, y_test)

    best_name, best_result = pick_best_model(results, args.task)
    print(f"\nBest model: {best_name}")

    symbol_clean = fname.replace(".csv", "")
    model_path = os.path.join(config.MODELS_DIR, f"{symbol_clean}_{args.task}_{best_name}.joblib")
    scaler_path = os.path.join(config.MODELS_DIR, f"{symbol_clean}_{args.task}_scaler.joblib")
    joblib.dump(best_result["model"], model_path)
    joblib.dump(scaler, scaler_path)
    joblib.dump(feature_cols, os.path.join(config.MODELS_DIR, f"{symbol_clean}_{args.task}_features.joblib"))
    print(f"Saved model -> {model_path}")
    print(f"Saved scaler -> {scaler_path}")


if __name__ == "__main__":
    main()
