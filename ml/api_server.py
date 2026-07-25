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


@app.route("/predict/<path:symbol>", methods=["GET"])
def predict_symbol(symbol: str):
    """Generate prediction for a single asset.
    Uses <path:symbol> so Flask doesn't treat '/' in symbols as a route separator.
    The symbol may arrive URL-encoded (e.g. GC%3DF) — urllib.parse.unquote handles it.
    """
    from urllib.parse import unquote
    task = request.args.get("task", "regression")
    if task not in ("regression", "direction"):
        return jsonify({"error": True, "message": "Invalid task. Use 'regression' or 'direction'."}), 400

    # Decode URL-encoded symbol: GC%3DF → GC=F
    symbol = unquote(symbol).upper().strip()

    if symbol not in config.ALL_ASSETS:
        return jsonify({
            "error": True,
            "message": f"Unknown symbol '{symbol}'. Use /assets to see available symbols.",
        }), 404

    name = config.ALL_ASSETS[symbol]
    result = predict_single(symbol, task)
    if result.get("error"):
        result = _technical_prediction(symbol, name, task)

    if result.get("error"):
        return jsonify(result), 500

    return jsonify(result)


# ---------------------------------------------------------------------------
# HISTORY
# ---------------------------------------------------------------------------
@app.route("/history/<path:symbol>", methods=["GET"])
def get_history(symbol):
    """Fetch daily OHLCV history for a single asset.
    Uses <path:symbol> + URL-decoding so GC%3DF → GC=F works correctly.
    Uses yf.download() which is more reliable than ticker.history() on hosted servers.
    """
    from urllib.parse import unquote
    import yfinance as yf

    # Decode URL-encoded symbol
    symbol = unquote(symbol).upper().strip()

    period_map = {"1d": "5d", "1w": "1mo", "1m": "1mo", "3m": "3mo", "6m": "6mo", "1y": "1y", "5y": "5y"}
    raw_period = request.args.get("period", "3mo")
    period = period_map.get(raw_period, raw_period)

    if symbol not in config.ALL_ASSETS:
        return jsonify({"error": True, "message": f"Unknown symbol '{symbol}'"}), 404

    try:
        # yf.download is more reliable than ticker.history() on cloud servers
        hist = yf.download(symbol, period=period, interval="1d", progress=False, auto_adjust=True)
        if hist.empty:
            # Try ticker.history() as backup
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period=period, interval="1d")

        if hist.empty:
            return jsonify({"symbol": symbol, "history": [], "count": 0,
                            "message": "No data available from yfinance"})

        # Flatten MultiIndex columns if yf.download returned them
        if hasattr(hist.columns, 'levels'):
            hist.columns = [col[0] if isinstance(col, tuple) else col for col in hist.columns]

        records = []
        for idx, row in hist.iterrows():
            try:
                records.append({
                    "date": str(idx.date()) if hasattr(idx, 'date') else str(idx)[:10],
                    "open":   round(float(row.get("Open",   row.get("open",   0))), 4),
                    "high":   round(float(row.get("High",   row.get("high",   0))), 4),
                    "low":    round(float(row.get("Low",    row.get("low",    0))), 4),
                    "close":  round(float(row.get("Close",  row.get("close",  0))), 4),
                    "volume": int(row.get("Volume", row.get("volume", 0)) or 0),
                })
            except Exception:
                continue  # skip malformed rows

        return jsonify({
            "symbol": symbol,
            "name": config.ALL_ASSETS.get(symbol, symbol),
            "period": period,
            "count": len(records),
            "history": records,
        })
    except Exception as e:
        log.error(f"History fetch failed for {symbol}: {e}")
        return jsonify({"error": True, "symbol": symbol, "message": str(e)}), 500


# ---------------------------------------------------------------------------
# LATEST PRICES
# ---------------------------------------------------------------------------
@app.route("/latest-prices", methods=["GET"])
def latest_prices():
    """Fetch current prices for all tracked assets using yfinance batch download.

    Uses yf.download() with all symbols at once — much faster and more reliable
    than per-ticker calls, and avoids Yahoo Finance rate limiting on cloud servers.
    Falls back to per-ticker calls if batch download fails or returns partial data.
    """
    import yfinance as yf

    all_symbols = list(config.ALL_ASSETS.keys())
    prices = []
    errors = []

    # ── Batch download (fast path) ────────────────────────────────────────────
    try:
        batch = yf.download(
            tickers=all_symbols,
            period="5d",
            interval="1d",
            progress=False,
            auto_adjust=True,
            group_by="ticker",
            threads=True,
        )

        for symbol in all_symbols:
            name = config.ALL_ASSETS[symbol]
            try:
                # Extract per-symbol slice from multi-level DataFrame
                if len(all_symbols) > 1:
                    sym_df = batch[symbol] if symbol in batch.columns.get_level_values(0) else None
                else:
                    sym_df = batch  # single ticker returns flat DataFrame

                if sym_df is None or sym_df.empty or sym_df["Close"].dropna().empty:
                    errors.append({"symbol": symbol, "name": name, "message": "No batch data"})
                    continue

                sym_df = sym_df.dropna(subset=["Close"])
                latest = sym_df.iloc[-1]
                current_close = float(latest["Close"])
                prev_close = float(sym_df["Close"].iloc[-2]) if len(sym_df) >= 2 else None

                entry = {
                    "symbol": symbol,
                    "name": name,
                    "price": round(current_close, 4),
                    "open":  round(float(latest.get("Open",  current_close)), 4),
                    "high":  round(float(latest.get("High",  current_close)), 4),
                    "low":   round(float(latest.get("Low",   current_close)), 4),
                    "volume": int(latest.get("Volume", 0) or 0),
                    "date":  str(sym_df.index[-1].date()),
                }

                if prev_close and prev_close != 0:
                    change = current_close - prev_close
                    entry["change"] = round(change, 4)
                    entry["change_percent"] = round((change / prev_close) * 100, 2)

                prices.append(entry)

            except Exception as sym_err:
                errors.append({"symbol": symbol, "name": name, "message": str(sym_err)})

    except Exception as batch_err:
        log.warning(f"Batch download failed ({batch_err}), falling back to per-ticker...")

    # ── Per-ticker fallback for symbols that failed in batch ──────────────────
    fetched_syms = {p["symbol"] for p in prices}
    failed_syms  = [s for s in all_symbols if s not in fetched_syms]

    for symbol in failed_syms:
        name = config.ALL_ASSETS[symbol]
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="5d", interval="1d")
            if hist.empty:
                errors.append({"symbol": symbol, "name": name, "message": "No data (ticker fallback)"})
                continue

            latest       = hist.iloc[-1]
            current_close = float(latest["Close"])
            prev_close    = float(hist["Close"].iloc[-2]) if len(hist) >= 2 else None

            entry = {
                "symbol": symbol,
                "name":   name,
                "price":  round(current_close, 4),
                "open":   round(float(latest["Open"]),   4),
                "high":   round(float(latest["High"]),   4),
                "low":    round(float(latest["Low"]),    4),
                "volume": int(latest["Volume"]) if latest["Volume"] > 0 else 0,
                "date":   str(hist.index[-1].date()),
            }

            if prev_close and prev_close != 0:
                change = current_close - prev_close
                entry["change"] = round(change, 4)
                entry["change_percent"] = round((change / prev_close) * 100, 2)

            prices.append(entry)

        except Exception as e:
            errors.append({"symbol": symbol, "name": name, "message": str(e)})

    log.info(f"latest-prices: {len(prices)} fetched, {len(errors)} errors")

    return jsonify({
        "count": len(prices),
        "prices": prices,
        "errors": errors,
        "timestamp": datetime.now().isoformat(),
    })


def _technical_prediction(symbol: str, name: str, task: str) -> dict:
    """
    Generate a prediction using a weighted multi-indicator technical analysis engine.
    Used as fallback when no trained ML model exists for a symbol.

    Indicators used (each contributes a weighted vote):
      1. RSI-14          — oversold/overbought momentum
      2. MACD crossover  — trend direction & strength
      3. EMA 10/20 cross — short vs medium-term trend
      4. Bollinger Band  — price position within bands (mean reversion)
      5. 3-day momentum  — short-term price drift
      6. 10-day momentum — medium-term price drift
      7. Volume trend    — buying/selling pressure (if available)

    Confidence is derived from weighted signal consensus, then adjusted by
    recent volatility. Range: roughly 52%–82%.
    """
    import yfinance as yf
    from datetime import timedelta

    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="60d", interval="1d")
        if hist.empty or len(hist) < 20:
            return {"error": True, "symbol": symbol, "message": "Not enough data for technical analysis"}

        closes  = hist["Close"].values.astype(float)
        highs   = hist["High"].values.astype(float)
        lows    = hist["Low"].values.astype(float)
        volumes = hist["Volume"].values.astype(float) if "Volume" in hist.columns else None

        current_price = float(closes[-1])
        n = len(closes)

        # ── 1. RSI-14 ──────────────────────────────────────────────────────
        deltas = [closes[i] - closes[i-1] for i in range(1, n)]
        gains  = [max(d, 0) for d in deltas]
        losses = [max(-d, 0) for d in deltas]
        window = 14
        avg_gain = sum(gains[-window:]) / window if len(gains) >= window else (sum(gains) / len(gains) if gains else 1e-9)
        avg_loss = sum(losses[-window:]) / window if len(losses) >= window else (sum(losses) / len(losses) if losses else 1e-9)
        rs  = avg_gain / avg_loss if avg_loss > 1e-9 else 100
        rsi = 100 - (100 / (1 + rs))

        # Strong vote when clearly oversold/overbought, scaled by extremity
        if rsi <= 30:
            rsi_vote   = 1.0 * (1 + (30 - rsi) / 30)   # stronger near RSI=0
            rsi_weight = 0.20
        elif rsi >= 70:
            rsi_vote   = -1.0 * (1 + (rsi - 70) / 30)
            rsi_weight = 0.20
        elif rsi < 45:
            rsi_vote, rsi_weight = 0.4, 0.10
        elif rsi > 55:
            rsi_vote, rsi_weight = -0.4, 0.10
        else:
            rsi_vote, rsi_weight = 0.0, 0.05  # neutral zone

        # ── 2. MACD (12/26/9) ─────────────────────────────────────────────
        def ema_calc(arr, span):
            k = 2 / (span + 1)
            e = arr[0]
            for v in arr[1:]:
                e = v * k + e * (1 - k)
            return e

        ema12_series, ema26_series = [], []
        e12 = closes[0]; e26 = closes[0]
        k12 = 2 / 13; k26 = 2 / 27
        for v in closes:
            e12 = v * k12 + e12 * (1 - k12)
            e26 = v * k26 + e26 * (1 - k26)
            ema12_series.append(e12)
            ema26_series.append(e26)

        macd_series = [ema12_series[i] - ema26_series[i] for i in range(n)]
        # Signal line = 9-period EMA of MACD
        if len(macd_series) >= 9:
            sig = macd_series[0]
            ks = 2 / 10
            for v in macd_series:
                sig = v * ks + sig * (1 - ks)
            macd_val = macd_series[-1]
            signal_val = sig
            macd_hist  = macd_val - signal_val
            # Crossover: is MACD above signal? Histogram positive?
            prev_macd_hist = macd_series[-2] - signal_val if n >= 2 else 0
            if macd_hist > 0 and prev_macd_hist <= 0:
                macd_vote, macd_weight = 1.0, 0.20   # fresh bullish crossover
            elif macd_hist < 0 and prev_macd_hist >= 0:
                macd_vote, macd_weight = -1.0, 0.20  # fresh bearish crossover
            elif macd_hist > 0:
                macd_vote, macd_weight = 0.5, 0.15
            else:
                macd_vote, macd_weight = -0.5, 0.15
        else:
            macd_vote, macd_weight = 0.0, 0.0

        # ── 3. EMA 10 vs EMA 20 cross ────────────────────────────────────
        ema10_val = ema12_series[-1]   # approximate with shorter span
        # Proper EMA10
        e10 = closes[0]; k10 = 2 / 11
        for v in closes:
            e10 = v * k10 + e10 * (1 - k10)
        e20 = closes[0]; k20 = 2 / 21
        for v in closes:
            e20 = v * k20 + e20 * (1 - k20)

        if e10 > e20:
            ema_vote, ema_weight = 0.6, 0.15
        elif e10 < e20:
            ema_vote, ema_weight = -0.6, 0.15
        else:
            ema_vote, ema_weight = 0.0, 0.05

        # ── 4. Bollinger Band position (20-day) ──────────────────────────
        if n >= 20:
            bb_window = closes[-20:]
            bb_mean   = sum(bb_window) / 20
            bb_std    = (sum((v - bb_mean)**2 for v in bb_window) / 20) ** 0.5
            bb_upper  = bb_mean + 2 * bb_std
            bb_lower  = bb_mean - 2 * bb_std

            # %B indicator: where is price within the bands (0=lower, 1=upper)
            bb_range = bb_upper - bb_lower
            pct_b = (current_price - bb_lower) / bb_range if bb_range > 1e-9 else 0.5

            if pct_b <= 0.1:         # near/below lower band → likely bounce up
                bb_vote, bb_weight = 1.0, 0.15
            elif pct_b >= 0.9:       # near/above upper band → likely pullback
                bb_vote, bb_weight = -1.0, 0.15
            elif pct_b < 0.4:
                bb_vote, bb_weight = 0.3, 0.08
            elif pct_b > 0.6:
                bb_vote, bb_weight = -0.3, 0.08
            else:
                bb_vote, bb_weight = 0.0, 0.05
        else:
            bb_vote, bb_weight = 0.0, 0.0

        # ── 5. Short momentum (3-day) ─────────────────────────────────────
        mom_3d = (closes[-1] - closes[-4]) / closes[-4] if n >= 4 else 0
        if abs(mom_3d) > 0.03:
            mom3_vote   = 1.0 if mom_3d > 0 else -1.0
            mom3_weight = 0.12
        elif abs(mom_3d) > 0.01:
            mom3_vote   = 0.5 if mom_3d > 0 else -0.5
            mom3_weight = 0.08
        else:
            mom3_vote, mom3_weight = 0.0, 0.04

        # ── 6. Medium momentum (10-day) ───────────────────────────────────
        mom_10d = (closes[-1] - closes[-11]) / closes[-11] if n >= 11 else 0
        if abs(mom_10d) > 0.05:
            mom10_vote   = 1.0 if mom_10d > 0 else -1.0
            mom10_weight = 0.10
        elif abs(mom_10d) > 0.02:
            mom10_vote   = 0.5 if mom_10d > 0 else -0.5
            mom10_weight = 0.07
        else:
            mom10_vote, mom10_weight = 0.0, 0.04

        # ── 7. Volume trend (if available) ────────────────────────────────
        if volumes is not None and len(volumes) >= 10 and volumes[-5:].sum() > 0:
            recent_vol = float(volumes[-5:].mean())
            prev_vol   = float(volumes[-10:-5].mean()) if len(volumes) >= 10 else recent_vol
            vol_ratio  = recent_vol / prev_vol if prev_vol > 1e-9 else 1.0
            price_up   = closes[-1] > closes[-6] if n >= 6 else True

            if vol_ratio > 1.3 and price_up:
                vol_vote, vol_weight = 0.7, 0.08    # strong buying volume
            elif vol_ratio > 1.3 and not price_up:
                vol_vote, vol_weight = -0.7, 0.08   # strong selling volume
            elif vol_ratio < 0.7 and price_up:
                vol_vote, vol_weight = 0.2, 0.04    # weak-volume rally (less reliable)
            else:
                vol_vote, vol_weight = 0.0, 0.02
        else:
            vol_vote, vol_weight = 0.0, 0.0

        # ── Aggregate weighted score ──────────────────────────────────────
        total_weight = (rsi_weight + macd_weight + ema_weight +
                        bb_weight + mom3_weight + mom10_weight + vol_weight)

        if total_weight < 1e-9:
            total_weight = 1.0

        weighted_score = (
            rsi_vote   * rsi_weight   +
            macd_vote  * macd_weight  +
            ema_vote   * ema_weight   +
            bb_vote    * bb_weight    +
            mom3_vote  * mom3_weight  +
            mom10_vote * mom10_weight +
            vol_vote   * vol_weight
        ) / total_weight   # range: roughly -1 to +1

        direction = "up" if weighted_score >= 0 else "down"

        # ── Confidence from signal consensus + volatility adjustment ──────
        # Normalize score to [0, 1] where 1 = maximum agreement across all signals
        signal_consensus = min(abs(weighted_score), 1.0)

        # Volatility penalty: high volatility = less reliable signal
        returns     = [(closes[i] - closes[i-1]) / closes[i-1] for i in range(max(1, n-15), n)]
        volatility  = (sum(r**2 for r in returns) / len(returns)) ** 0.5 if returns else 0.01
        vol_penalty = min(volatility * 8, 0.20)   # capped at -20%

        # Base: 0.50 when neutral, scales up to 0.82 when all signals agree
        raw_confidence = 0.50 + signal_consensus * 0.32 - vol_penalty
        confidence = round(max(0.51, min(0.84, raw_confidence)), 4)

        # ── Predicted price ───────────────────────────────────────────────
        # Use weighted_score to project expected move (dampened by volatility)
        base_move_pct = weighted_score * 0.012   # max ~1.2% per day
        expected_move_pct = base_move_pct + (mom_3d * 0.15)  # add some momentum persistence
        predicted_price = round(current_price * (1 + expected_move_pct), 4)

        target_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")

        base_result = {
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
            # Extra debug fields for transparency
            "_signals": {
                "rsi": round(rsi, 1),
                "macd_histogram": round(macd_series[-1] - sig if len(macd_series) >= 9 else 0, 6),
                "ema_cross": "bullish" if e10 > e20 else "bearish",
                "momentum_3d_pct": round(mom_3d * 100, 2),
                "momentum_10d_pct": round(mom_10d * 100, 2),
                "weighted_score": round(weighted_score, 4),
            }
        }

        if task == "regression":
            base_result["predicted_price"] = predicted_price
            base_result["predictedPrice"]  = predicted_price

        return base_result

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
