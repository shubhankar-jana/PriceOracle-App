"""
config.py
Central place for all ticker symbols, API keys, and paths.
Edit ASSETS / CURRENCIES to add or remove instruments.
"""

import os

# ---------------------------------------------------------------------------
# API KEYS  (set these as environment variables, never hardcode in real use)
# ---------------------------------------------------------------------------
NEWSAPI_KEY = os.getenv("NEWSAPI_KEY", "")   # https://newsapi.org
FRED_API_KEY = os.getenv("FRED_API_KEY", "") # https://fred.stlouisfed.org/docs/api/api_key.html

# ---------------------------------------------------------------------------
# ASSET UNIVERSE
# ---------------------------------------------------------------------------

STOCKS = {
    "AAPL": "Apple",
    "GOOG": "Alphabet",
    "MSFT": "Microsoft",
    "TSLA": "Tesla",
    "AMZN": "Amazon",
    "RELIANCE.NS": "Reliance Industries",
    "TCS.NS": "Tata Consultancy Services",
    "INFY.NS": "Infosys",
    "SBIN.NS": "State Bank of India",
}

COMMODITIES = {
    "GC=F": "Gold",
    "SI=F": "Silver",
    "CL=F": "Crude Oil (WTI)",
}

CRYPTO = {
    "BTC-USD": "Bitcoin",
}

INDEXES = {
    "DX-Y.NYB": "US Dollar Index",
}

# 10 major currency pairs (all quoted as "how many units of quote per 1 USD"
# except where Yahoo's own convention differs, noted below)
CURRENCIES = {
    "USDINR=X": "USD/INR",
    "EURUSD=X": "EUR/USD",
    "GBPUSD=X": "GBP/USD",
    "USDJPY=X": "USD/JPY",
    "AUDUSD=X": "AUD/USD",
    "USDCAD=X": "USD/CAD",
    "USDCHF=X": "USD/CHF",
    "USDCNY=X": "USD/CNY",
    "NZDUSD=X": "NZD/USD",
    "USDSGD=X": "USD/SGD",
}

# Merge everything into one master dict: symbol -> friendly name
ALL_ASSETS = {**STOCKS, **COMMODITIES, **CRYPTO, **INDEXES, **CURRENCIES}

# ---------------------------------------------------------------------------
# MACRO SERIES FROM FRED (used as extra context features, not per-asset)
# ---------------------------------------------------------------------------
FRED_SERIES = {
    "CPIAUCSL": "CPI_Inflation",
    "FEDFUNDS": "Fed_Funds_Rate",
    "UNRATE": "Unemployment_Rate",
    "GDP": "GDP",
    "DGS10": "US_10Y_Treasury_Yield",
}

# ---------------------------------------------------------------------------
# NEWS SEARCH TOPICS (mapped to which assets they should influence)
# ---------------------------------------------------------------------------
NEWS_TOPICS = {
    "stock market": list(STOCKS.keys()),
    "gold price": ["GC=F"],
    "silver price": ["SI=F"],
    "crude oil price": ["CL=F"],
    "bitcoin": ["BTC-USD"],
    "US dollar index": ["DX-Y.NYB"],
    "USD INR rupee": ["USDINR=X"],
    "federal reserve interest rate": list(ALL_ASSETS.keys()),  # macro, affects everything
}

# ---------------------------------------------------------------------------
# PATHS
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RAW_DIR = os.path.join(BASE_DIR, "data", "raw")
NEWS_DIR = os.path.join(BASE_DIR, "data", "news")
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")
MODELS_DIR = os.path.join(BASE_DIR, "models")
REPORTS_DIR = os.path.join(BASE_DIR, "reports")

for d in [RAW_DIR, NEWS_DIR, PROCESSED_DIR, MODELS_DIR, REPORTS_DIR]:
    os.makedirs(d, exist_ok=True)

# ---------------------------------------------------------------------------
# DEFAULT SETTINGS
# ---------------------------------------------------------------------------
HISTORY_PERIOD = "5y"      # how much history to pull with yfinance
PREDICTION_HORIZON = 1     # predict N days ahead
TRAIN_TEST_SPLIT_DATE_FRACTION = 0.85  # 85% train, 15% test, chronological
