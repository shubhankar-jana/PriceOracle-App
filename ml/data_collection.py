"""
data_collection.py
Pulls raw data from all sources and stores it under data/raw, data/news.

Sources:
  1. yfinance          -> OHLCV price history for every asset in config.ALL_ASSETS
  2. NewsAPI            -> headlines per topic (requires NEWSAPI_KEY)
  3. FRED               -> macroeconomic series (requires FRED_API_KEY)

Run:
    python data_collection.py
"""

import os
import time
import json
import logging
import pandas as pd
import yfinance as yf

import config

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# 1. PRICE DATA
# ---------------------------------------------------------------------------
def fetch_price_history(symbol: str, period: str = config.HISTORY_PERIOD) -> pd.DataFrame:
    """Fetch OHLCV history for a single symbol using yfinance."""
    ticker = yf.Ticker(symbol)
    df = ticker.history(period=period, interval="1d")
    if df.empty:
        log.warning(f"No data returned for {symbol}")
        return df
    df = df.reset_index()
    df["symbol"] = symbol
    # Standardize column names
    df.columns = [c.lower().replace(" ", "_") for c in df.columns]
    return df


def collect_all_prices():
    """Loop over every asset in config.ALL_ASSETS and save a CSV per symbol."""
    all_frames = []
    for symbol, name in config.ALL_ASSETS.items():
        log.info(f"Fetching price history: {symbol} ({name})")
        try:
            df = fetch_price_history(symbol)
            if df.empty:
                continue
            out_path = os.path.join(config.RAW_DIR, f"{symbol.replace('=', '_').replace('.', '_')}.csv")
            df.to_csv(out_path, index=False)
            all_frames.append(df)
        except Exception as e:
            log.error(f"Failed to fetch {symbol}: {e}")
        time.sleep(0.5)  # be polite to the API

    if all_frames:
        combined = pd.concat(all_frames, ignore_index=True)
        combined.to_csv(os.path.join(config.RAW_DIR, "_all_assets_combined.csv"), index=False)
        log.info(f"Saved combined price file with {len(combined)} rows.")
    return all_frames


# ---------------------------------------------------------------------------
# 2. NEWS DATA (NewsAPI)
# ---------------------------------------------------------------------------
def fetch_news_for_topic(topic: str, api_key: str, page_size: int = 50) -> list:
    """
    Fetch recent news articles for a topic using NewsAPI.
    Falls back gracefully (returns []) if no API key is configured.
    """
    if not api_key:
        log.warning("NEWSAPI_KEY not set — skipping news fetch. "
                    "Set the NEWSAPI_KEY environment variable to enable this.")
        return []

    from newsapi import NewsApiClient  # pip install newsapi-python

    client = NewsApiClient(api_key=api_key)
    try:
        response = client.get_everything(
            q=topic,
            language="en",
            sort_by="publishedAt",
            page_size=page_size,
        )
        return response.get("articles", [])
    except Exception as e:
        log.error(f"NewsAPI error for topic '{topic}': {e}")
        return []


def collect_all_news():
    """Fetch news for every topic defined in config.NEWS_TOPICS and save as JSON + CSV."""
    all_articles = []
    for topic, related_assets in config.NEWS_TOPICS.items():
        log.info(f"Fetching news for topic: {topic}")
        articles = fetch_news_for_topic(topic, config.NEWSAPI_KEY)
        for a in articles:
            all_articles.append({
                "topic": topic,
                "related_assets": ",".join(related_assets),
                "headline": a.get("title"),
                "description": a.get("description"),
                "published_at": a.get("publishedAt"),
                "source": (a.get("source") or {}).get("name"),
                "url": a.get("url"),
            })
        time.sleep(1)

    if all_articles:
        df = pd.DataFrame(all_articles)
        df.to_csv(os.path.join(config.NEWS_DIR, "news_raw.csv"), index=False)
        log.info(f"Saved {len(df)} news articles.")
    else:
        log.warning("No news articles collected (missing API key or no results).")
    return all_articles


# ---------------------------------------------------------------------------
# 3. MACRO DATA (FRED)
# ---------------------------------------------------------------------------
def collect_macro_data():
    """Fetch macroeconomic series from FRED and save as a single CSV."""
    if not config.FRED_API_KEY:
        log.warning("FRED_API_KEY not set — skipping macro data fetch. "
                    "Set the FRED_API_KEY environment variable to enable this.")
        return None

    from fredapi import Fred  # pip install fredapi

    fred = Fred(api_key=config.FRED_API_KEY)
    frames = []
    for series_id, name in config.FRED_SERIES.items():
        try:
            series = fred.get_series(series_id)
            df = series.reset_index()
            df.columns = ["date", name]
            frames.append(df.set_index("date"))
        except Exception as e:
            log.error(f"Failed to fetch FRED series {series_id}: {e}")

    if frames:
        macro_df = pd.concat(frames, axis=1).reset_index().rename(columns={"index": "date"})
        macro_df.to_csv(os.path.join(config.RAW_DIR, "macro_data.csv"), index=False)
        log.info(f"Saved macro data with columns: {list(macro_df.columns)}")
        return macro_df
    return None


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    log.info("=== Starting full data collection ===")
    collect_all_prices()
    collect_all_news()
    collect_macro_data()
    log.info("=== Data collection complete ===")
