import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiRefreshCw, FiAlertTriangle } from 'react-icons/fi'
import AssetTable from '../components/AssetTable'
import api from '../api/axios'
import { useSocket } from '../context/SocketContext'
import toast from 'react-hot-toast'

export default function Predictions() {
  const [cat, setCat] = useState('All')
  const [task, setTask] = useState('regression')
  const [assets, setAssets] = useState([])
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [runningPreds, setRunningPreds] = useState(false)
  const navigate = useNavigate()
  const { socket } = useSocket()

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [resAssets, resPreds] = await Promise.all([
        api.get('/assets'),
        api.get('/predictions')
      ])
      setAssets(resAssets.data.data.assets || [])
      setPredictions(resPreds.data.data.predictions || [])
      setError(null)
    } catch (err) {
      console.error('Failed to fetch data', err)
      const errorMsg = err.response?.data?.message || 
        (err.code === 'ERR_NETWORK' || err.message === 'Network Error' 
          ? 'Cannot connect to backend server. Please verify the API server is running on port 5000.'
          : err.response?.status === 429
          ? 'Too many requests. Please wait a moment before refreshing.'
          : 'Failed to load live predictions and market price data.')
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (!socket) return

    const onPriceUpdate = (data) => {
      setAssets(prev => prev.map(a => {
        const updated = data.prices.find(p => p.symbol === a.symbol)
        if (updated) {
          return { ...a, currentPrice: updated.price, changePercent24h: updated.change }
        }
        return a
      }))
    }

    const onNewPrediction = (data) => {
      setPredictions(prev => {
        const idx = prev.findIndex(p => p.symbol === data.symbol)
        if (idx !== -1) {
          const newArr = [...prev]
          newArr[idx] = data.prediction
          return newArr
        }
        return [...prev, data.prediction]
      })
    }

    socket.on('priceUpdate', onPriceUpdate)
    socket.on('newPrediction', onNewPrediction)
    
    return () => {
      socket.off('priceUpdate', onPriceUpdate)
      socket.off('newPrediction', onNewPrediction)
    }
  }, [socket])

  const mergedData = assets.map(a => {
    const p = predictions.find(pred => pred.symbol === a.symbol)
    return { ...a, latestPrediction: p || null }
  })

  const filtered = cat === 'All' ? mergedData : mergedData.filter(a => a.category === cat)
  const avgConf = mergedData.length > 0 
    ? (mergedData.reduce((s, p) => s + (p.latestPrediction?.confidence || 0), 0) / mergedData.length * 100).toFixed(0) 
    : 0
  const upCount = mergedData.filter(p => p.latestPrediction?.direction === 'up').length

  const triggerPredictions = async () => {
    setRunningPreds(true)
    try {
      await api.post('/predictions/run-all')
      toast.success('Prediction cycle started! Data will update shortly.')
      // Reload predictions after a short delay
      setTimeout(async () => {
        const res = await api.get('/predictions')
        setPredictions(res.data.data.predictions || [])
        setRunningPreds(false)
      }, 8000)
    } catch (err) {
      toast.error('Failed to trigger predictions')
      setRunningPreds(false)
    }
  }

  return (
    <div className="page-wrapper">
      <div className="predictions-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">ML <span className="text-gradient">Predictions</span></h1>
            <div className="page-sub">Next trading day forecasts — powered by Technical Analysis + ML models</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className="btn btn-glass btn-sm"
              onClick={fetchData}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <FiRefreshCw size={14} className={loading ? 'spin' : ''} />
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={triggerPredictions}
              disabled={runningPreds}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <FiRefreshCw size={14} className={runningPreds ? 'spin' : ''} />
              {runningPreds ? 'Running Models...' : 'Run New Predictions'}
            </button>
          </div>
        </div>

        {/* Warning Banner when cached data is shown after background refresh failure */}
        {error && mergedData.length > 0 && (
          <div className="error-banner-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', background: 'rgba(255, 82, 82, 0.12)', border: '1px solid rgba(255, 82, 82, 0.3)', borderRadius: '10px', marginBottom: 20, color: 'var(--text-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FiAlertTriangle size={18} style={{ color: 'var(--danger)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.9rem' }}>
                <strong>Data sync error:</strong> {error}. Displaying last known prediction data.
              </span>
            </div>
            <button className="btn btn-glass btn-sm" onClick={fetchData} disabled={loading}>
              <FiRefreshCw size={12} className={loading ? 'spin' : ''} /> Retry
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-label">Assets Predicted</div><div className="stat-value">{mergedData.length}</div></div>
          <div className="stat-card"><div className="stat-label">Avg Confidence</div><div className="stat-value" style={{ color: 'var(--info)' }}>{avgConf}%</div></div>
          <div className="stat-card"><div className="stat-label">Bullish Signals</div><div className="stat-value" style={{ color: 'var(--success)' }}>{upCount}</div></div>
          <div className="stat-card"><div className="stat-label">Bearish Signals</div><div className="stat-value" style={{ color: 'var(--danger)' }}>{mergedData.length > 0 ? mergedData.length - upCount : 0}</div></div>
        </div>

        {/* Filters */}
        <div className="filter-bar">
          <div className="category-tabs" style={{ margin: 0 }}>
            {['All', 'stock', 'commodity', 'crypto', 'currency'].map(c => (
              <button key={c} className={`tab-btn${cat === c ? ' active' : ''}`} onClick={() => setCat(c)}>
                {c === 'All' ? 'All Assets' : c.charAt(0).toUpperCase() + c.slice(1) + 's'}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className={`tab-btn${task === 'regression' ? ' active' : ''}`} onClick={() => setTask('regression')}>Price</button>
            <button className={`tab-btn${task === 'direction' ? ' active' : ''}`} onClick={() => setTask('direction')}>Direction</button>
          </div>
        </div>

        <div className="card">
          {loading && mergedData.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <span className="spinner-sm" style={{ marginRight: 8 }}></span> Loading live market data and predictions...
            </div>
          ) : error && mergedData.length === 0 ? (
            <div className="card error-state-card" style={{ padding: '48px 24px', textAlign: 'center', border: '1px solid rgba(255, 82, 82, 0.25)', background: 'rgba(255, 82, 82, 0.04)', borderRadius: '16px' }}>
              <div style={{ color: 'var(--danger)', marginBottom: '16px', display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'rgba(255, 82, 82, 0.1)' }}>
                <FiAlertTriangle size={36} />
              </div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '8px', color: 'var(--text-primary)' }}>Unable to Load Predictions</h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 20px', fontSize: '0.95rem' }}>
                {error}
              </p>
              <button className="btn btn-primary" onClick={fetchData} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <FiRefreshCw size={14} /> Retry Loading Predictions
              </button>
            </div>
          ) : (
            <AssetTable assets={filtered} task={task} onRowClick={a => navigate(`/asset/${a.symbol}`)} />
          )}
        </div>
      </div>
    </div>
  )
}
