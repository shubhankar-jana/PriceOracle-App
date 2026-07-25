import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiArrowUp, FiArrowDown, FiRefreshCw } from 'react-icons/fi'
import PriceChart from '../components/PriceChart'
import PredictionChart from '../components/PredictionChart'
import { formatCurrency, formatPercent, getCategoryIcon, getCategoryClass, getChangeColor } from '../utils/helpers'
import api from '../api/axios'
import toast from 'react-hot-toast'

// Period options for the chart — these map to what the backend accepts
const PERIOD_OPTIONS = [
  { label: '1W', value: '1w' },
  { label: '1M', value: '1m' },
  { label: '3M', value: '3m' },
  { label: '6M', value: '6m' },
  { label: '1Y', value: '1y' },
]

const toDateKey = d => {
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export default function AssetDetail() {
  const { symbol } = useParams()
  const navigate = useNavigate()

  const [asset, setAsset] = useState(null)
  const [prediction, setPrediction] = useState(null)
  const [priceHistory, setPriceHistory] = useState([])
  const [predictionHistory, setPredictionHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [fetchError, setFetchError] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('1m')

  // Encode the symbol for safe URL usage (handles GC=F, EURUSD=X, etc.)
  const encodedSymbol = encodeURIComponent(symbol)

  const fetchHistory = useCallback(async (period) => {
    setHistoryLoading(true)
    try {
      const historyRes = await api.get(`/assets/${encodedSymbol}/history?period=${period}`)
      const rawHistory = historyRes?.data?.data?.history
      if (rawHistory && rawHistory.length > 0) {
        const formatted = rawHistory
          .map(h => ({
            date: new Date(h.date || h.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            close: h.close || h.price || 0,
            open: h.open || 0,
            high: h.high || 0,
            low: h.low || 0,
          }))
          .filter(d => d.close > 0)
        setPriceHistory(formatted)
      } else {
        setPriceHistory([])
      }
    } catch (err) {
      console.warn('[AssetDetail] History fetch failed:', err.message)
      setPriceHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }, [encodedSymbol])

  useEffect(() => {
    const fetchData = async () => {
      setFetchError(false)
      setLoading(true)

      try {
        // Fetch asset info + predictions from DB, and price history — run in parallel
        const [assetRes, historyRes, predRes] = await Promise.allSettled([
          api.get(`/assets/${encodedSymbol}`),
          api.get(`/assets/${encodedSymbol}/history?period=${selectedPeriod}`),
          api.get(`/predictions/${encodedSymbol}`),
        ])

        // ── Asset data ──────────────────────────────────────────────────────
        if (assetRes.status === 'rejected') {
          throw new Error(assetRes.reason?.message || 'Failed to load asset')
        }
        const assetData = assetRes.value.data.data
        setAsset(assetData.asset)

        // ── Prediction from DB ─────────────────────────────────────────────
        // Prefer DB predictions first (already stored by cron job)
        const dbPreds = assetData.predictions || []
        const bestDbPred = dbPreds.find(p => p.predictedPrice != null && p.predictedPrice > 0) || dbPreds[0]
        if (bestDbPred) {
          setPrediction(bestDbPred)
        } else {
          // No DB prediction found (e.g. fresh deploy, commodity/currency not yet predicted)
          // Try fetching directly from the predictions route which has the full history
          if (predRes.status === 'fulfilled') {
            const predData = predRes.value.data.data
            const preds = predData?.predictions || []
            const best = preds.find(p => p.predictedPrice != null && p.predictedPrice > 0) || preds[0]
            if (best) setPrediction(best)
          }
        }

        // ── Price History ──────────────────────────────────────────────────
        let rawHistory = []
        if (historyRes.status === 'fulfilled') {
          rawHistory = historyRes.value?.data?.data?.history || []
        }
        if (rawHistory.length > 0) {
          const formatted = rawHistory
            .map(h => ({
              date: new Date(h.date || h.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              close: h.close || h.price || 0,
              open: h.open || 0,
              high: h.high || 0,
              low: h.low || 0,
            }))
            .filter(d => d.close > 0)
          setPriceHistory(formatted)
        }

        // ── Prediction Chart History ───────────────────────────────────────
        if (predRes.status === 'fulfilled') {
          const rawPreds = predRes.value.data.data?.predictions || []

          // Build date→close map to fill in actual prices
          const dateCloseMap = {}
          rawHistory.forEach(h => {
            dateCloseMap[toDateKey(h.date || h.timestamp)] = h.close || h.price || 0
          })

          const predFormatted = rawPreds
            .filter(p => p.predictedPrice != null && p.predictedPrice > 0)
            .slice(0, 30)
            .map(p => {
              const date = new Date(p.targetDate || p.predictionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              const key = toDateKey(p.targetDate || p.predictionDate)
              let actual = p.actualPrice != null && p.actualPrice > 0 ? p.actualPrice : null
              if (actual == null && dateCloseMap[key]) {
                actual = dateCloseMap[key]
              }
              return { date, actual, predicted: p.predictedPrice }
            })
            .reverse()

          // Show prediction chart even with just 1 data point
          if (predFormatted.length > 0) {
            setPredictionHistory(predFormatted)
          }
        }
      } catch (err) {
        console.error('[AssetDetail] Failed to fetch asset data:', err)
        setFetchError(true)
        toast.error('Failed to load asset data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [symbol, encodedSymbol]) // intentionally not including selectedPeriod — history is re-fetched separately

  // Re-fetch history when period changes (after initial load)
  const handlePeriodChange = async (period) => {
    setSelectedPeriod(period)
    await fetchHistory(period)
  }

  if (loading) return (
    <div className="page-wrapper">
      <div className="inline-loader"><div className="loader-spinner" /></div>
    </div>
  )

  if (fetchError && !asset) return (
    <div className="page-wrapper">
      <div className="asset-detail-page">
        <button className="back-btn" onClick={() => navigate(-1)}><FiArrowLeft /> Back</button>
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <h3>Unable to load {symbol}</h3>
          <p>The market data server is not responding. Please try again later.</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    </div>
  )

  if (!asset) return (
    <div className="page-wrapper">
      <div className="empty-state"><h3>Asset not found</h3></div>
    </div>
  )

  const changeClass = getChangeColor(asset.changePercent24h)
  const isUp = asset.changePercent24h >= 0

  return (
    <div className="page-wrapper">
      <div className="asset-detail-page">
        <button className="back-btn" onClick={() => navigate(-1)}><FiArrowLeft /> Back</button>

        {/* Asset Hero */}
        <div className="asset-hero">
          <div className={`asset-hero-icon ${getCategoryClass(asset.category)}`}>{getCategoryIcon(asset.category)}</div>
          <div className="asset-hero-info">
            <h1>{asset.name || symbol}</h1>
            <div className="asset-hero-meta">
              <span className="badge badge-purple">{symbol}</span>
              <span className="badge badge-cyan">{asset.category}</span>
            </div>
            <div className="asset-big-price">{formatCurrency(asset.currentPrice)}</div>
            <div className={`price-change ${changeClass}`} style={{ fontSize: '1rem', marginTop: 6 }}>
              {isUp ? <FiArrowUp /> : <FiArrowDown />}
              {formatCurrency(Math.abs(asset.change24h || 0))} ({formatPercent(asset.changePercent24h)}) today
            </div>
          </div>
        </div>

        {/* OHLCV Row */}
        {asset.latestOHLCV && (
          <div className="indicators-grid" style={{ marginBottom: 24 }}>
            {[['Open', asset.latestOHLCV.open], ['High', asset.latestOHLCV.high], ['Low', asset.latestOHLCV.low], ['Volume', asset.latestOHLCV.volume]].map(([label, val]) => (
              <div key={label} className="indicator-card">
                <div className="indicator-label">{label}</div>
                <div className="indicator-value">
                  {label === 'Volume'
                    ? (val ? (val / 1e6).toFixed(1) + 'M' : '—')
                    : formatCurrency(val)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Price Chart */}
        <div style={{ marginBottom: 24 }}>
          <PriceChart
            data={priceHistory}
            symbol={symbol}
            loading={historyLoading}
            selectedPeriod={selectedPeriod}
            onPeriodChange={handlePeriodChange}
          />
        </div>

        {/* Prediction Card */}
        {prediction ? (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <span className="card-title">ML Prediction — Next Trading Day</span>
              <span className="badge badge-purple">{prediction.modelName || 'Ensemble'}</span>
            </div>
            <div className="prediction-box">
              <div className={`prediction-direction ${prediction.direction}`}>
                {prediction.direction === 'up' ? '↑' : '↓'}
              </div>
              <div className="prediction-info">
                <div className="prediction-label">Predicted Close Price</div>
                <div className="prediction-price">{formatCurrency(prediction.predictedPrice)}</div>
                <div className="prediction-meta">
                  <span className={`confidence-badge ${prediction.direction === 'up' ? 'up' : 'down'}`}>
                    {prediction.direction === 'up' ? '↑' : '↓'} {((prediction.confidence || 0) * 100).toFixed(0)}% confidence
                  </span>
                </div>
              </div>
            </div>
            {prediction.metrics && (
              <div className="metrics-grid">
                {prediction.metrics.rmse != null && <div className="metric-card"><div className="metric-label">RMSE</div><div className="metric-value">${prediction.metrics.rmse.toFixed(2)}</div></div>}
                {prediction.metrics.mae != null && <div className="metric-card"><div className="metric-label">MAE</div><div className="metric-value">${prediction.metrics.mae.toFixed(2)}</div></div>}
                {prediction.metrics.mape != null && <div className="metric-card"><div className="metric-label">MAPE</div><div className="metric-value">{prediction.metrics.mape.toFixed(2)}%</div></div>}
                {prediction.metrics.r2 != null && <div className="metric-card"><div className="metric-label">R²</div><div className="metric-value">{prediction.metrics.r2.toFixed(3)}</div></div>}
              </div>
            )}
          </div>
        ) : (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header"><span className="card-title">ML Prediction</span></div>
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>🤖</div>
              <p>No prediction available yet.</p>
              <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Predictions are generated every 6 hours by the ML engine.</p>
            </div>
          </div>
        )}

        {/* Prediction vs Actual Chart */}
        {predictionHistory.length > 0 && <PredictionChart data={predictionHistory} symbol={symbol} />}
      </div>
    </div>
  )
}