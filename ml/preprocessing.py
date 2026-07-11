"""
preprocessing.py
Cleans raw price data, engineers technical + lag + calendar features,
merges in sentiment and macro data, and produces a model-ready dataset
per asset saved under data/processed/<symbol>.csv

Run AFTER data_collection.py (and optionally sentiment_analysis.py):
    python preprocessing.py
"""

import os
import glob
import logging
import pandas as pd
import numpy as np
from ta.trend import SMAIndicator, EMAIndicator, MACD, ADXIndicator
from ta.momentum import RSIIndicator
from ta.volatility import BollingerBands, AverageTrueRange
from ta.volume import OnBalanceVolumeIndicator

import config

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# STEP 1: LOAD + CLEAN
# ---------------------------------------------------------------------------
def load_raw_price_file(filepath: str) -> pd.DataFrame:
    df = pd.read_csv(filepath, parse_dates=["date"])
    df = df.sort_values("date").reset_index(drop=True)

    # Drop duplicate dates, keep last
    df = df.drop_duplicates(subset="date", keep="last")

    # Forward-fill small gaps (e.g. a missing single day), but don't
    # fabricate long stretches of missing data
    price_cols = [c for c in ["open", "high", "low", "close", "volume"] if c in df.columns]
    df[price_cols] = df[price_cols].ffill(limit=3)

    # Drop rows that are still missing a close price (unusable)
    df = df.dropna(subset=["close"])

    return df


# ---------------------------------------------------------------------------
# STEP 2: TECHNICAL INDICATORS
# ---------------------------------------------------------------------------
def add_technical_indicators(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    df["sma_10"] = SMAIndicator(close=df["close"], window=10).sma_indicator()
    df["sma_20"] = SMAIndicator(close=df["close"], window=20).sma_indicator()
    df["sma_50"] = SMAIndicator(close=df["close"], window=50).sma_indicator()

    df["ema_10"] = EMAIndicator(close=df["close"], window=10).ema_indicator()
    df["ema_20"] = EMAIndicator(close=df["close"], window=20).ema_indicator()

    df["rsi_14"] = RSIIndicator(close=df["close"], window=14).rsi()

    macd = MACD(close=df["close"])
    df["macd"] = macd.macd()
    df["macd_signal"] = macd.macd_signal()
    df["macd_diff"] = macd.macd_diff()

    bb = BollingerBands(close=df["close"], window=20, window_dev=2)
    df["bb_high"] = bb.bollinger_hband()
    df["bb_low"] = bb.bollinger_lband()
    df["bb_width"] = bb.bollinger_wband()

    # Volume-dependent indicators only make sense if volume exists and is non-zero
    # (FX pairs from yfinance often have volume = 0)
    if "volume" in df.columns and df["volume"].fillna(0).sum() > 0:
        df["obv"] = OnBalanceVolumeIndicator(close=df["close"], volume=df["volume"]).on_balance_volume()
    else:
        df["obv"] = np.nan

    if all(c in df.columns for c in ["high", "low", "close"]):
        df["atr_14"] = AverageTrueRange(high=df["high"], low=df["low"], close=df["close"], window=14).average_true_range()
        df["adx_14"] = ADXIndicator(high=df["high"], low=df["low"], close=df["close"], window=14).adx()

    return df


# ---------------------------------------------------------------------------
# STEP 3: LAG / RETURN / CALENDAR FEATURES
# ---------------------------------------------------------------------------
def add_lag_and_return_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # Daily return
    df["return_1d"] = df["close"].pct_change(1)

    # Lag features (past returns as predictors — often more useful than raw price)
    for lag in [1, 3, 5, 10]:
        df[f"return_lag_{lag}d"] = df["close"].pct_change(lag)

    # Rolling volatility
    df["volatility_10d"] = df["return_1d"].rolling(10).std()
    df["volatility_20d"] = df["return_1d"].rolling(20).std()

    # Rolling min/max as support/resistance proxies
    df["rolling_max_20d"] = df["close"].rolling(20).max()
    df["rolling_min_20d"] = df["close"].rolling(20).min()

    return df


def add_calendar_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["day_of_week"] = df["date"].dt.dayofweek
    df["month"] = df["date"].dt.month
    df["is_month_end"] = df["date"].dt.is_month_end.astype(int)
    return df


# ---------------------------------------------------------------------------
# STEP 4: TARGET VARIABLE
# ---------------------------------------------------------------------------
def add_target(df: pd.DataFrame, horizon: int = config.PREDICTION_HORIZON) -> pd.DataFrame:
    """
    Creates two possible targets:
      - target_price: the actual close price N days ahead (regression)
      - target_direction: 1 if price goes up, 0 if down (classification)
    """
    df = df.copy()
    df["target_price"] = df["close"].shift(-horizon)
    df["target_direction"] = (df["target_price"] > df["close"]).astype(int)
    return df


# ---------------------------------------------------------------------------
# STEP 5: MERGE SENTIMENT + MACRO
# ---------------------------------------------------------------------------
def merge_sentiment(df: pd.DataFrame, symbol: str) -> pd.DataFrame:
    sentiment_path = os.path.join(config.NEWS_DIR, "daily_sentiment_by_asset.csv")
    if not os.path.exists(sentiment_path):
        df["sentiment_score"] = 0.0
        df["news_count"] = 0
        return df

    sent_df = pd.read_csv(sentiment_path, parse_dates=["date"])
    sent_df = sent_df[sent_df["symbol"] == symbol][["date", "sentiment_score", "news_count"]]

    df = df.merge(sent_df, on="date", how="left")
    df["sentiment_score"] = df["sentiment_score"].fillna(0.0)
    df["news_count"] = df["news_count"].fillna(0)
    return df


def merge_macro(df: pd.DataFrame) -> pd.DataFrame:
    macro_path = os.path.join(config.RAW_DIR, "macro_data.csv")
    if not os.path.exists(macro_path):
        return df

    macro_df = pd.read_csv(macro_path, parse_dates=["date"])
    # Macro series are often monthly/quarterly -> forward-fill onto daily price dates
    df = df.merge(macro_df, on="date", how="left")
    macro_cols = [c for c in macro_df.columns if c != "date"]
    df[macro_cols] = df[macro_cols].ffill()
    return df


# ---------------------------------------------------------------------------
# FULL PIPELINE FOR ONE ASSET
# ---------------------------------------------------------------------------
def process_asset_file(filepath: str) -> pd.DataFrame:
    symbol = pd.read_csv(filepath, nrows=1)["symbol"].iloc[0]
    log.info(f"Processing {symbol} ...")

    df = load_raw_price_file(filepath)
    df = add_technical_indicators(df)
    df = add_lag_and_return_features(df)
    df = add_calendar_features(df)
    df = merge_sentiment(df, symbol)
    df = merge_macro(df)
    df = add_target(df)

    # Drop rows with NaNs created by rolling windows / shifting target
    df = df.dropna().reset_index(drop=True)

    out_name = os.path.basename(filepath)
    out_path = os.path.join(config.PROCESSED_DIR, out_name)
    df.to_csv(out_path, index=False)
    log.info(f"Saved processed file for {symbol}: {len(df)} rows -> {out_path}")
    return df


def main():
    raw_files = [
        f for f in glob.glob(os.path.join(config.RAW_DIR, "*.csv"))
        if "_all_assets_combined" not in f and "macro_data" not in f
    ]
    if not raw_files:
        log.error("No raw price files found. Run data_collection.py first.")
        return

    for filepath in raw_files:
        try:
            process_asset_file(filepath)
        except Exception as e:
            log.error(f"Failed to process {filepath}: {e}")


if __name__ == "__main__":
    main()
