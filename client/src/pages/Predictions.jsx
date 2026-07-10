import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiRefreshCw } from 'react-icons/fi'
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
  const [runningPreds, setRunningPreds] = useState(false)
  const navigate = useNavigate()
  const { socket } = useSocket()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resAssets, resPreds] = await Promise.all([
          api.get('/assets'),
          api.get('/predictions')
        ])
        setAssets(resAssets.data.data.assets || [])
        setPredictions(resPreds.data.data.predictions || [])
      } catch (err) {
        console.error('Failed to fetch data', err)
        if (assets.length === 0) {
          toast.error('Failed to load live market data')
        }
      } finally {
        setLoading(false)
      }
    }
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
          <button className="btn btn-glass btn-sm" onClick={triggerPredictions} disabled={runningPreds}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <FiRefreshCw size={14} className={runningPreds ? 'spin' : ''} />
            {runningPreds ? 'Running...' : 'Refresh Predictions'}
          </button>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-label">Assets Predicted</div><div className="stat-value">{mergedData.length}</div></div>
          <div className="stat-card"><div className="stat-label">Avg Confidence</div><div className="stat-value" style={{ color: 'var(--info)' }}>{avgConf}%</div></div>
          <div className="stat-card"><div className="stat-label">Bullish Signals</div><div className="stat-value" style={{ color: 'var(--success)' }}>{upCount}</div></div>
          <div className="stat-card"><div className="stat-label">Bearish Signals</div><div className="stat-value" style={{ color: 'var(--danger)' }}>{mergedData.length - upCount}</div></div>
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
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <span className="spinner-sm" style={{ marginRight: 8 }}></span> Loading live market data...
            </div>
          ) : (
            <AssetTable assets={filtered} task={task} onRowClick={a => navigate(`/asset/${a.symbol}`)} />
          )}
        </div>
      </div>
    </div>
  )
}
