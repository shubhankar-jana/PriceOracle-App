"""
sentiment_analysis.py
Scores every collected headline with VADER sentiment, then aggregates
to a daily sentiment score per asset (since one topic maps to multiple assets).

Run AFTER data_collection.py:
    python sentiment_analysis.py
"""

import os
import pandas as pd
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

import config

analyzer = SentimentIntensityAnalyzer()


def score_headlines(news_df: pd.DataFrame) -> pd.DataFrame:
    """Add a compound sentiment score column for each headline."""
    def compute_score(row):
        text = f"{row.get('headline') or ''}. {row.get('description') or ''}"
        return analyzer.polarity_scores(text)["compound"]

    news_df = news_df.copy()
    news_df["sentiment_score"] = news_df.apply(compute_score, axis=1)
    news_df["date"] = pd.to_datetime(news_df["published_at"], errors="coerce").dt.date
    return news_df


def explode_to_asset_level(news_df: pd.DataFrame) -> pd.DataFrame:
    """
    Each news row can relate to multiple assets (comma-separated symbols).
    Explode so we get one row per (date, asset, sentiment_score).
    """
    news_df = news_df.copy()
    news_df["related_assets"] = news_df["related_assets"].fillna("").apply(
        lambda x: [s for s in x.split(",") if s]
    )
    exploded = news_df.explode("related_assets").rename(columns={"related_assets": "symbol"})
    return exploded.dropna(subset=["symbol", "date"])


def aggregate_daily_sentiment(exploded_df: pd.DataFrame) -> pd.DataFrame:
    """Average sentiment per symbol per day, plus a count of articles (volume of news)."""
    agg = (
        exploded_df.groupby(["date", "symbol"])
        .agg(
            sentiment_score=("sentiment_score", "mean"),
            news_count=("sentiment_score", "count"),
        )
        .reset_index()
    )
    return agg


def main():
    news_path = os.path.join(config.NEWS_DIR, "news_raw.csv")
    if not os.path.exists(news_path):
        print("No news_raw.csv found. Run data_collection.py first "
              "(with NEWSAPI_KEY set) to generate it.")
        return

    news_df = pd.read_csv(news_path)
    scored = score_headlines(news_df)
    exploded = explode_to_asset_level(scored)
    daily_sentiment = aggregate_daily_sentiment(exploded)

    out_path = os.path.join(config.NEWS_DIR, "daily_sentiment_by_asset.csv")
    daily_sentiment.to_csv(out_path, index=False)
    print(f"Saved daily sentiment for {daily_sentiment['symbol'].nunique()} assets -> {out_path}")


if __name__ == "__main__":
    main()
