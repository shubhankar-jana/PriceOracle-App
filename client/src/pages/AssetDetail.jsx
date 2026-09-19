import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiArrowUp, FiArrowDown, FiRefreshCw, FiAlertTriangle } from 'react-icons/fi'
import PriceChart from '../components/PriceChart'
import PredictionChart from '../components/PredictionChart'
import { formatCurrency, formatPercent, getCategoryIcon, getCategoryClass, getChangeColor } from '../utils/helpers'
import api from '../api/axios'
import toast from 'react-hot-toast'

/** Convert any date-like value to a YYYY-MM-DD key for map lookups */
const toDateKey = d => {
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return null
  return dt.toISOString().slice(0, 10)
}

/** Format a date for chart display */
const fmtChartDate = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export default function AssetDetail() {
  const { symbol } = useParams()
  const navigate = useNavigate()
  const [asset, setAsset] = useState(null)
  const [prediction, setPrediction] = useState(null)
  const [priceHistory, setPriceHistory] = useState([])
  const [predictionHistory, setPredictionHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)

  const fetchData = async () => {
    setFetchError(false)
    setLoading(true)
    try {
      // Fetch asset details and predictions together
      const assetRes = await api.get(`/assets/${symbol}`)
      const assetData = assetRes.data.data
      setAsset(assetData.asset)

      // Pick best regression prediction for the "Next Day" box
      const preds = assetData.predictions || []
      const regressionPred = preds.find(p => p.predictedPrice != null && p.predictedPrice > 0 && p.task === 'regression') || preds[0]
      if (regressionPred) setPrediction(regressionPred)

      // Fetch 1 YEAR of price history so the chart can slice any range client-side
      let rawHistory = []
      try {
        const histRes = await api.get(`/assets/${symbol}/history?period=1y`)
        rawHistory = histRes?.data?.data?.history || []
      } catch {
        console.warn(`[AssetDetail] Could not load price history for ${symbol}`)
      }

      if (rawHistory.length > 0) {
        const formatted = rawHistory
          .map(h => ({
            date: fmtChartDate(h.date || h.timestamp),
            // Keep raw ISO date for range slicing (used in PriceChart useMemo)
            rawDate: new Date(h.date || h.timestamp).getTime(),
            close: parseFloat(h.close || h.price || 0),
            open: parseFloat(h.open || 0),
            high: parseFloat(h.high || 0),
            low: parseFloat(h.low || 0),
            volume: h.volume || 0,
          }))
          .filter(d => d.close > 0)
          .sort((a, b) => a.rawDate - b.rawDate)
        setPriceHistory(formatted)
      }

      // Build date → close price map for actual price lookup
      const dateCloseMap = {}
      for (const h of rawHistory) {
        const key = toDateKey(h.date || h.timestamp)
        if (key) dateCloseMap[key] = parseFloat(h.close || h.price || 0)
      }

      // Also fetch prediction history from /predictions/:symbol endpoint
      let rawPreds = []
      try {
        const predRes = await api.get(`/predictions/${symbol}`)
        rawPreds = predRes?.data?.data?.predictions || preds
      } catch {
        // Fall back to the predictions that came with the asset
        rawPreds = preds
      }

      if (rawPreds.length > 0) {
        // Take the most recent 60 regression predictions (sorted newest-first from server)
        const regressionPreds = rawPreds
          .filter(p => p.predictedPrice != null && p.predictedPrice > 0 && (p.task === 'regression' || !p.task))

        // Sort chronologically for the chart
        const sorted = [...regressionPreds]
          .sort((a, b) => new Date(a.predictionDate || a.createdAt) - new Date(b.predictionDate || b.createdAt))
          .slice(-60) // most recent 60 entries chronologically

        const predFormatted = sorted.map(p => {
          const targetKey = toDateKey(p.targetDate || p.predictionDate)
          const predKey = toDateKey(p.predictionDate || p.createdAt)

          // Prefer stored actualPrice, then fall back to price history map
          let actual = null
          if (p.actualPrice != null && p.actualPrice > 0) {
            actual = p.actualPrice
          } else if (targetKey && dateCloseMap[targetKey] && dateCloseMap[targetKey] > 0) {
            actual = dateCloseMap[targetKey]
          }

          return {
            date: fmtChartDate(p.targetDate || p.predictionDate || p.createdAt),
            rawDate: new Date(p.targetDate || p.predictionDate || p.createdAt).getTime(),
            actual: actual,
            predicted: p.predictedPrice,
          }
        })

        // Only show prediction history chart if we have at least 2 data points
        if (predFormatted.length >= 2) {
          setPredictionHistory(predFormatted)
        }
      }
    } catch (err) {
      console.error('Failed to fetch asset data', err)
      setFetchError(true)
      toast.error('Failed to load asset data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [symbol])

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
          <div className="empty-icon"><FiAlertTriangle size={36} /></div>
          <h3>Unable to load {symbol}</h3>
          <p>The market data server is not responding. Please try again later.</p>
          <button className="btn btn-primary" onClick={fetchData}>Retry</button>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button className="back-btn" onClick={() => navigate(-1)}><FiArrowLeft /> Back</button>
          <button
            className="btn btn-glass btn-sm"
            onClick={fetchData}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <FiRefreshCw size={14} /> Refresh
          </button>
        </div>

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
            {[
              ['Open', asset.latestOHLCV.open],
              ['High', asset.latestOHLCV.high],
              ['Low', asset.latestOHLCV.low],
              ['Volume', asset.latestOHLCV.volume],
            ].map(([label, val]) => (
              <div key={label} className="indicator-card">
                <div className="indicator-label">{label}</div>
                <div className="indicator-value">
                  {label === 'Volume'
                    ? val ? (val / 1e6).toFixed(1) + 'M' : '—'
                    : formatCurrency(val)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Price History Chart — receives full 1Y dataset; PriceChart slices by selected range */}
        <div style={{ marginBottom: 24 }}>
          <PriceChart data={priceHistory} symbol={symbol} />
        </div>

        {/* ML Prediction Box */}
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
                {prediction.confidence != null && (
                  <div className="prediction-meta">
                    <span className={`confidence-badge ${prediction.direction === 'up' ? 'up' : 'down'}`}>
                      {prediction.direction === 'up' ? '↑' : '↓'} {(prediction.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                )}
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
              No prediction available yet. Predictions are generated every 6 hours.
            </div>
          </div>
        )}

        {/* Prediction History Chart */}
        {predictionHistory.length > 0 && (
          <PredictionChart data={predictionHistory} symbol={symbol} />
        )}
      </div>
    </div>
  )
}