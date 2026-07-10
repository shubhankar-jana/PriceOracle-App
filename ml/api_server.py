"""
api_server.py
Lightweight Flask API that wraps predict.py for the Node.js backend
to call via HTTP instead of child_process.spawn.

Endpoints:
    GET /predict/<symbol>?task=regression   — Single-asset prediction
    GET /predict/all?task=regression         — Predictions for all assets
    GET /health                             — Health check
    GET /assets                             — List of all tracked assets
    GET /latest-prices                      — Current prices for all assets via yfinance

Runs on port 5001 by default.

Usage:
    python api_server.py
    python api_server.py --port 5002
"""

import os
import sys
import argparse
import logging
from datetime import datetime

from flask import Flask, jsonify, request
from flask_cors import CORS

# Ensure the ml/ directory is on the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import config
from predict import predict_single, predict_all

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)


# ---------------------------------------------------------------------------
# HEALTH CHECK
# ---------------------------------------------------------------------------
@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "service": "PriceOracle ML API",
        "timestamp": datetime.now().isoformat(),
        "total_assets": len(config.ALL_ASSETS),
    })


# ---------------------------------------------------------------------------
# ASSETS LIST
# ---------------------------------------------------------------------------
@app.route("/assets", methods=["GET"])
def get_assets():
    """Return the full list of tracked assets from config."""
    assets = []
    for symbol, name in config.ALL_ASSETS.items():
        # Determine asset category
        category = "unknown"
        if symbol in config.STOCKS:
            category = "stock"
        elif symbol in config.COMMODITIES:
            category = "commodity"
        elif symbol in config.CRYPTO:
            category = "crypto"
        elif symbol in config.INDEXES:
            category = "index"
        elif symbol in config.CURRENCIES:
            category = "currency"

        assets.append({
            "symbol": symbol,
            "name": name,
            "category": category,
        })

    return jsonify({
        "count": len(assets),
        "assets": assets,
    })


# ---------------------------------------------------------------------------
# PREDICTIONS
# ---------------------------------------------------------------------------
@app.route("/predict/all", methods=["GET"])
def predict_all_endpoint():
    """Generate predictions for every asset."""
    task = request.args.get("task", "regression")
    if task not in ("regression", "direction"):
        return jsonify({"error": True, "message": "Invalid task. Use 'regression' or 'direction'."}), 400

    results = []
    for symbol, name in config.ALL_ASSETS.items():
        # Try trained ML model first
        ml_result = predict_single(symbol, task)
        if ml_result.get("error"):
            # Fallback: use technical analysis on live data
            log.info(f"No ML model for {symbol}, using technical analysis fallback")
            ml_result = _technical_prediction(symbol, name, task)
        results.append(ml_result)

    successful = [r for r in results if not r.get("error")]
    failed = [r for r in results if r.get("error")]

    return jsonify({
        "task": task,
        "total": len(results),
        "successful": len(successful),
        "failed": len(failed),
        "predictions": results,
    })


@app.route("/predict/<symbol>", methods=["GET"])
def predict_symbol(symbol: str):
    """Generate prediction for a single asset."""
    task = request.args.get("task", "regression")
    if task not in ("regression", "direction"):
        return jsonify({"error": True, "message": "Invalid task. Use 'regression' or 'direction'."}), 400

    if symbol not in config.ALL_ASSETS:
        return jsonify({
            "error": True,
            "message": f"Unknown symbol '{symbol}'. Use /assets to see available symbols.",
        }), 404

    name = config.ALL_ASSETS[symbol]
    result = predict_single(symbol, task)
    if result.get("error"):
        # Fallback: technical analysis
        result = _technical_prediction(symbol, name, task)

    if result.get("error"):
        return jsonify(result), 500

    return jsonify(result)


# ---------------------------------------------------------------------------
# HISTORY
# ---------------------------------------------------------------------------
@app.route("/history/<symbol>", methods=["GET"])
def get_history(symbol):
    """Fetch up to 90 days of daily OHLCV history for a single asset."""
    import yfinance as yf
    import pandas as pd

    period_map = {"1d": "5d", "1w": "1mo", "1m": "1mo", "3m": "3mo", "6m": "6mo", "1y": "1y", "5y": "5y"}
    raw_period = request.args.get("period", "3mo")
    period = period_map.get(raw_period, raw_period)
    if symbol not in config.ALL_ASSETS:
        return jsonify({"error": True, "message": f"Unknown symbol '{symbol}'"}), 404

    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period, interval="1d")
        if hist.empty:
            return jsonify({"symbol": symbol, "history": [], "count": 0})

        records = []
        for idx, row in hist.iterrows():
            records.append({
                "date": str(idx.date()),
                "open": round(float(row["Open"]), 4),
                "high": round(float(row["High"]), 4),
                "low": round(float(row["Low"]), 4),
                "close": round(float(row["Close"]), 4),
                "volume": int(row["Volume"]) if row["Volume"] > 0 else 0,
            })

        return jsonify({
            "symbol": symbol,
            "name": config.ALL_ASSETS[symbol],
            "period": period,
            "count": len(records),
            "history": records,
        })
    except Exception as e:
        return jsonify({"error": True, "symbol": symbol, "message": str(e)}), 500


# ---------------------------------------------------------------------------
# LATEST PRICES
# ---------------------------------------------------------------------------
@app.route("/latest-prices", methods=["GET"])
def latest_prices():
    """Fetch current/latest prices for all tracked assets using yfinance."""
    import yfinance as yf
    import math

    prices = []
    errors = []

    for symbol, name in config.ALL_ASSETS.items():
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="5d", interval="1d")
            if hist.empty:
                errors.append({"symbol": symbol, "name": name, "message": "No data"})
                continue

            latest = hist.iloc[-1]
            prev_close = float(hist["Close"].iloc[-2]) if len(hist) >= 2 else None
            current_close = float(latest["Close"])

            entry = {
                "symbol": symbol,
                "name": name,
                "price": round(current_close, 4),
                "open": round(float(latest["Open"]), 4),
                "high": round(float(latest["High"]), 4),
                "low": round(float(latest["Low"]), 4),
                "volume": int(latest["Volume"]) if latest["Volume"] > 0 else None,
                "date": str(hist.index[-1].date()),
            }

            if prev_close is not None and prev_close != 0:
                change = current_close - prev_close
                change_pct = (change / prev_close) * 100
                entry["change"] = round(change, 4)
                entry["change_percent"] = round(change_pct, 2)

            prices.append(entry)

        except Exception as e:
            errors.append({"symbol": symbol, "name": name, "message": str(e)})

    return jsonify({
        "count": len(prices),
        "prices": prices,
        "errors": errors,
        "timestamp": datetime.now().isoformat(),
    })


def _technical_prediction(symbol: str, name: str, task: str) -> dict:
    """
    Generate a prediction using technical analysis on live data.
    Used as a fallback when no trained ML model exists.
    Uses: 5-day momentum, RSI-like signal, and volatility-based confidence.
    """
    import yfinance as yf
    import math
    from datetime import timedelta

    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="30d", interval="1d")
        if hist.empty or len(hist) < 5:
            return {"error": True, "symbol": symbol, "message": "Not enough data"}

        closes = hist["Close"].values
        current_price = float(closes[-1])

        # 5-day momentum
        momentum_5d = (closes[-1] - closes[-5]) / closes[-5] if len(closes) >= 5 else 0

        # 14-day RSI (simplified)
        deltas = [closes[i] - closes[i-1] for i in range(1, len(closes))]
        gains = [d for d in deltas if d > 0]
        losses = [-d for d in deltas if d < 0]
        avg_gain = sum(gains[-14:]) / 14 if len(gains) >= 14 else (sum(gains) / len(gains) if gains else 0)
        avg_loss = sum(losses[-14:]) / 14 if len(losses) >= 14 else (sum(losses) / len(losses) if losses else 1)
        rsi = 100 - (100 / (1 + avg_gain / avg_loss)) if avg_loss > 0 else 50

        # Volatility (std of last 10 days returns)
        returns = [(closes[i] - closes[i-1]) / closes[i-1] for i in range(1, len(closes))]
        volatility = float(sum(r**2 for r in returns[-10:]) / 10) ** 0.5 if returns else 0.01

        # Direction signal: momentum + RSI
        # RSI < 30 = oversold = likely up, RSI > 70 = overbought = likely down
        rsi_signal = 1 if rsi < 45 else (-1 if rsi > 55 else 0)
        momentum_signal = 1 if momentum_5d > 0.002 else (-1 if momentum_5d < -0.002 else 0)
        combined = rsi_signal + momentum_signal

        direction = "up" if combined >= 0 else "down"

        # Confidence: higher when both signals agree and volatility is low
        signal_strength = abs(combined) / 2  # 0 to 1
        vol_penalty = min(volatility * 10, 0.3)
        confidence = round(max(0.50, min(0.85, 0.55 + signal_strength * 0.25 - vol_penalty)), 4)

        # Predicted price: current + expected move
        expected_move_pct = momentum_5d * 0.3 + (0.003 if direction == "up" else -0.003)
        predicted_price = round(current_price * (1 + expected_move_pct), 4)

        target_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")

        if task == "regression":
            return {
                "error": False,
                "symbol": symbol,
                "name": name,
                "current_price": round(current_price, 4),
                "predicted_price": predicted_price,
                "predictedPrice": predicted_price,
                "direction": direction,
                "confidence": confidence,
                "model_name": "TechnicalAnalysis",
                "modelName": "TechnicalAnalysis",
                "task": task,
                "prediction_date": datetime.now().strftime("%Y-%m-%d"),
                "target_date": target_date,
                "targetDate": target_date,
            }
        else:
            return {
                "error": False,
                "symbol": symbol,
                "name": name,
                "current_price": round(current_price, 4),
                "direction": direction,
                "confidence": confidence,
                "model_name": "TechnicalAnalysis",
                "modelName": "TechnicalAnalysis",
                "task": task,
                "prediction_date": datetime.now().strftime("%Y-%m-%d"),
                "target_date": target_date,
                "targetDate": target_date,
            }
    except Exception as e:
        return {"error": True, "symbol": symbol, "message": str(e)}


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PriceOracle ML API Server")
    parser.add_argument("--port", type=int, default=5001, help="Port to run the server on")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--debug", action="store_true", help="Enable Flask debug mode")
    args = parser.parse_args()

    log.info(f"Starting PriceOracle ML API on {args.host}:{args.port}")
    log.info(f"Tracking {len(config.ALL_ASSETS)} assets")
    app.run(host=args.host, port=args.port, debug=args.debug, threaded=True)
