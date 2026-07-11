"""
eda.py
Exploratory Data Analysis over the processed per-asset datasets.
Produces summary stats + a set of plots saved to reports/.

Run AFTER preprocessing.py:
    python eda.py --symbol AAPL
    python eda.py --all          # runs correlation heatmap across all assets too
"""

import os
import argparse
import glob
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")  # headless
import matplotlib.pyplot as plt
import seaborn as sns

import config

sns.set_theme(style="darkgrid")


def load_processed(symbol_filename: str) -> pd.DataFrame:
    path = os.path.join(config.PROCESSED_DIR, symbol_filename)
    return pd.read_csv(path, parse_dates=["date"])


def summary_stats(df: pd.DataFrame, symbol: str):
    print(f"\n=== Summary stats: {symbol} ===")
    print(df[["open", "high", "low", "close", "volume", "return_1d"]].describe())
    print(f"\nMissing values:\n{df.isna().sum()[df.isna().sum() > 0]}")


def plot_price_trend(df: pd.DataFrame, symbol: str):
    fig, ax = plt.subplots(figsize=(12, 5))
    ax.plot(df["date"], df["close"], label="Close")
    ax.plot(df["date"], df["sma_20"], label="SMA 20", alpha=0.7)
    ax.plot(df["date"], df["sma_50"], label="SMA 50", alpha=0.7)
    ax.set_title(f"{symbol} — Price Trend with Moving Averages")
    ax.set_xlabel("Date")
    ax.set_ylabel("Price")
    ax.legend()
    fig.tight_layout()
    out = os.path.join(config.REPORTS_DIR, f"{symbol}_price_trend.png")
    fig.savefig(out, dpi=120)
    plt.close(fig)
    print(f"Saved: {out}")


def plot_return_distribution(df: pd.DataFrame, symbol: str):
    fig, ax = plt.subplots(figsize=(8, 5))
    sns.histplot(df["return_1d"].dropna(), bins=60, kde=True, ax=ax)
    ax.set_title(f"{symbol} — Daily Return Distribution")
    ax.set_xlabel("Daily Return")
    fig.tight_layout()
    out = os.path.join(config.REPORTS_DIR, f"{symbol}_return_dist.png")
    fig.savefig(out, dpi=120)
    plt.close(fig)
    print(f"Saved: {out}")


def plot_rolling_volatility(df: pd.DataFrame, symbol: str):
    fig, ax = plt.subplots(figsize=(12, 4))
    ax.plot(df["date"], df["volatility_20d"], color="firebrick")
    ax.set_title(f"{symbol} — 20-Day Rolling Volatility")
    fig.tight_layout()
    out = os.path.join(config.REPORTS_DIR, f"{symbol}_volatility.png")
    fig.savefig(out, dpi=120)
    plt.close(fig)
    print(f"Saved: {out}")


def plot_feature_correlation(df: pd.DataFrame, symbol: str):
    feature_cols = [
        "close", "sma_20", "ema_20", "rsi_14", "macd", "bb_width",
        "return_1d", "volatility_20d", "sentiment_score", "news_count",
    ]
    feature_cols = [c for c in feature_cols if c in df.columns]
    corr = df[feature_cols].corr()

    fig, ax = plt.subplots(figsize=(9, 7))
    sns.heatmap(corr, annot=True, fmt=".2f", cmap="coolwarm", center=0, ax=ax)
    ax.set_title(f"{symbol} — Feature Correlation Matrix")
    fig.tight_layout()
    out = os.path.join(config.REPORTS_DIR, f"{symbol}_feature_correlation.png")
    fig.savefig(out, dpi=120)
    plt.close(fig)
    print(f"Saved: {out}")


def plot_cross_asset_correlation():
    """Correlation of daily returns ACROSS assets — e.g. does gold move opposite to USD?"""
    files = glob.glob(os.path.join(config.PROCESSED_DIR, "*.csv"))
    returns = {}
    for f in files:
        symbol = os.path.basename(f).replace(".csv", "")
        try:
            df = pd.read_csv(f, parse_dates=["date"])
            returns[symbol] = df.set_index("date")["return_1d"]
        except Exception:
            continue

    if len(returns) < 2:
        print("Not enough processed assets to compute cross-asset correlation.")
        return

    returns_df = pd.DataFrame(returns)
    corr = returns_df.corr()

    fig, ax = plt.subplots(figsize=(14, 12))
    sns.heatmap(corr, cmap="coolwarm", center=0, ax=ax, xticklabels=True, yticklabels=True)
    ax.set_title("Cross-Asset Daily Return Correlation")
    fig.tight_layout()
    out = os.path.join(config.REPORTS_DIR, "cross_asset_correlation.png")
    fig.savefig(out, dpi=120)
    plt.close(fig)
    print(f"Saved: {out}")


def run_eda_for_symbol(symbol_filename: str):
    symbol = symbol_filename.replace(".csv", "")
    df = load_processed(symbol_filename)
    summary_stats(df, symbol)
    plot_price_trend(df, symbol)
    plot_return_distribution(df, symbol)
    plot_rolling_volatility(df, symbol)
    plot_feature_correlation(df, symbol)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--symbol", type=str, help="Processed filename or raw symbol, e.g. AAPL")
    parser.add_argument("--all", action="store_true", help="Run EDA for every processed asset")
    args = parser.parse_args()

    if args.all:
        files = [os.path.basename(f) for f in glob.glob(os.path.join(config.PROCESSED_DIR, "*.csv"))]
        for f in files:
            run_eda_for_symbol(f)
        plot_cross_asset_correlation()
    elif args.symbol:
        # allow user to pass "AAPL" or "AAPL.csv"
        fname = args.symbol if args.symbol.endswith(".csv") else f"{args.symbol}.csv"
        run_eda_for_symbol(fname)
    else:
        print("Pass --symbol SYMBOL or --all. Example: python eda.py --symbol AAPL")


if __name__ == "__main__":
    main()
