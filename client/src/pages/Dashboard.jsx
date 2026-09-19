import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiTrendingUp, FiTrendingDown, FiActivity, FiGrid, FiPlus, FiGlobe, FiLayers, FiCpu, FiDollarSign, FiBarChart2, FiAlertTriangle, FiRefreshCw } from 'react-icons/fi'
import PriceCard from '../components/PriceCard'
import { InlineLoader } from '../components/Loader'
import api from '../api/axios'
import { useSocket } from '../context/SocketContext'
import useAuth from '../hooks/useAuth'
import { formatPercent, getTimeAgo } from '../utils/helpers'
import toast from 'react-hot-toast'

const CATEGORIES = ['All', 'stock', 'commodity', 'crypto', 'currency', 'index']

export default function Dashboard() {
  const [cat, setCat] = useState('All')
  const { user } = useAuth()
  const navigate = useNavigate()
  const { socket } = useSocket()

  const [assets, setAssets] = useState([])
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [addingWatchlist, setAddingWatchlist] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async (isInitial = false) => {
    if (isInitial) {
      setLoading(true)
      setError(null)
    } else {
      setRefreshing(true)
    }
    try {
      const [resAssets, resPreds] = await Promise.all([
        api.get('/assets'),
        api.get('/predictions')
      ])
      setAssets(resAssets.data.data.assets || [])
      setPredictions(resPreds.data.data.predictions || [])
      setError(null)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to fetch data', err)
      const errorMsg = err.response?.data?.message || 
        (err.code === 'ERR_NETWORK' || err.message === 'Network Error' 
          ? 'Cannot connect to backend server. Please verify the API server is running on port 5000.'
          : err.response?.status === 429
          ? 'Too many requests. Please wait a moment before refreshing.'
          : 'Failed to load live price data from server.')
      setError(errorMsg)
      if (isInitial) {
        setAssets([])
      } else {
        toast.error('Failed to refresh data — showing last known values')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const addToWatchlist = async (symbol) => {
    setAddingWatchlist(symbol)
    try {
      await api.post('/user/watchlist', { symbol })
      toast.success(`${symbol} added to watchlist!`)
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error(`${symbol} is already in your watchlist`)
      } else {
        toast.error('Failed to add to watchlist')
      }
    } finally {
      setAddingWatchlist(null)
    }
  }

  useEffect(() => {
    fetchData(true)
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
      setLastUpdated(new Date(data.timestamp || new Date()))
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

  const filtered = cat === 'All' ? assets : assets.filter(a => a.category === cat)
  
  const { topGainer, topLoser, sentimentLabel, sentimentColor, recentPreds } = useMemo(() => {
    const sortedByChange = [...assets].sort((a, b) => (b.changePercent24h || 0) - (a.changePercent24h || 0))
    const tg = sortedByChange.filter(a => a.changePercent24h > 0)[0]
    const tl = [...sortedByChange].reverse().filter(a => a.changePercent24h < 0)[0]
    
    const totalGreen = sortedByChange.filter(a => a.changePercent24h > 0).length
    const totalRed = sortedByChange.filter(a => a.changePercent24h < 0).length
    const rawSentiment = (totalGreen - totalRed) / (totalGreen + totalRed || 1)
    
    let sLabel = 'Neutral'
    let sColor = 'var(--warning)'
    if (rawSentiment > 0.3) { sLabel = 'Bullish'; sColor = 'var(--success)' }
    else if (rawSentiment < -0.3) { sLabel = 'Bearish'; sColor = 'var(--danger)' }

    // Join predictions with asset names
    const rPreds = [...predictions].sort((a, b) => new Date(b.predictionDate) - new Date(a.predictionDate)).slice(0, 5).map(p => {
      const a = assets.find(ast => ast.symbol === p.symbol)
      return { ...p, name: a ? a.name : p.symbol }
    })

    return { topGainer: tg, topLoser: tl, sentimentLabel: sLabel, sentimentColor: sColor, recentPreds: rPreds }
  }, [assets, predictions])

  const now = lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="page-wrapper">
      <div className="dashboard-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Market <span className="text-gradient">Overview</span></h1>
            <div className="page-sub flex items-center gap-8">
              <div className="live-dot" />
              Live • Last updated {now}
            </div>
          </div>
          <button
            className="btn btn-glass btn-sm"
            onClick={() => fetchData(false)}
            disabled={refreshing || loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <FiRefreshCw size={14} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Updating...' : 'Refresh Prices'}
          </button>
        </div>

        {/* Warning Banner when cached data is shown after failed background refresh */}
        {error && assets.length > 0 && (
          <div className="error-banner-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', background: 'rgba(255, 82, 82, 0.12)', border: '1px solid rgba(255, 82, 82, 0.3)', borderRadius: '10px', marginBottom: 20, color: 'var(--text-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FiAlertTriangle size={18} style={{ color: 'var(--danger)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.9rem' }}>
                <strong>Live sync error:</strong> {error}. Showing last known prices.
              </span>
            </div>
            <button className="btn btn-glass btn-sm" onClick={() => fetchData(false)} disabled={refreshing}>
              <FiRefreshCw size={12} className={refreshing ? 'spin' : ''} /> Retry
            </button>
          </div>
        )}

        {/* Market Summary */}
        <div className="market-summary">
          <div className="summary-card">
            <div className="summary-icon purple"><FiGrid size={20} /></div>
            <div className="summary-content">
              <div className="summary-label">Assets Tracked</div>
              <div className="summary-value">{assets.length}</div>
              <div className="summary-sub">Stocks, crypto, FX & more</div>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon green"><FiTrendingUp size={20} /></div>
            <div className="summary-content">
              <div className="summary-label">Top Gainer</div>
              <div className="summary-value" style={{ fontSize: '1rem', color: 'var(--success)' }}>{topGainer?.name || '---'}</div>
              <div className="summary-sub" style={{ color: 'var(--success)' }}>{topGainer ? `+${topGainer.changePercent24h.toFixed(2)}%` : '0%'}</div>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon red"><FiTrendingDown size={20} /></div>
            <div className="summary-content">
              <div className="summary-label">Top Loser</div>
              <div className="summary-value" style={{ fontSize: '1rem', color: 'var(--danger)' }}>{topLoser?.name || '---'}</div>
              <div className="summary-sub" style={{ color: 'var(--danger)' }}>{topLoser ? `${topLoser.changePercent24h.toFixed(2)}%` : '0%'}</div>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon cyan"><FiActivity size={20} /></div>
            <div className="summary-content">
              <div className="summary-label">Market Sentiment</div>
              <div className="summary-value" style={{ color: sentimentColor }}>{sentimentLabel}</div>
              <div className="summary-sub">Live market momentum</div>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="category-tabs">
          {CATEGORIES.map(c => (
            <button key={c} className={`tab-btn${cat === c ? ' active' : ''}`} onClick={() => setCat(c)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {c === 'All' ? <><FiGlobe size={14} /> All</> : c === 'stock' ? <><FiTrendingUp size={14} /> Stocks</> : c === 'commodity' ? <><FiLayers size={14} /> Commodities</> : c === 'crypto' ? <><FiCpu size={14} /> Crypto</> : c === 'currency' ? <><FiDollarSign size={14} /> Currencies</> : <><FiBarChart2 size={14} /> Indexes</>}
            </button>
          ))}
        </div>

        {/* Assets Grid */}
        {loading && assets.length === 0 ? (
          <InlineLoader />
        ) : error && assets.length === 0 ? (
          <div className="card error-state-card" style={{ padding: '48px 24px', textAlign: 'center', margin: '24px 0', border: '1px solid rgba(255, 82, 82, 0.25)', background: 'rgba(255, 82, 82, 0.04)', borderRadius: '16px' }}>
            <div style={{ color: 'var(--danger)', marginBottom: '16px', display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'rgba(255, 82, 82, 0.1)' }}>
              <FiAlertTriangle size={36} />
            </div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '8px', color: 'var(--text-primary)' }}>Unable to Load Price Data</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 20px', fontSize: '0.95rem' }}>
              {error}
            </p>
            <button className="btn btn-primary" onClick={() => fetchData(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <FiRefreshCw size={14} /> Retry Loading Data
            </button>
          </div>
        ) : assets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><FiAlertTriangle size={36} /></div>
            <h3>No Live Data</h3>
            <p>Ensure the backend and ML pipeline are running and connected.</p>
            <button className="btn btn-primary" onClick={() => fetchData(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <FiRefreshCw size={14} /> Refresh Data
            </button>
          </div>
        ) : (
          <div className="assets-grid">
            {filtered.map(asset => (
              <PriceCard key={asset.symbol} asset={asset} onClick={() => navigate(`/asset/${asset.symbol}`)} onAddToWatchlist={addToWatchlist} />
            ))}
          </div>
        )}

        {/* Recent Predictions */}
        <div style={{ marginTop: 40 }}>
          <div className="card-header" style={{ marginBottom: 16 }}>
            <h3>Recent <span className="text-gradient">ML Predictions</span></h3>
            <button className="btn btn-glass btn-sm" onClick={() => navigate('/predictions')}>View All</button>
          </div>
          <div className="card mini-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Predicted Price</th>
                  <th>Direction</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {recentPreds.length > 0 ? recentPreds.map(p => (
                  <tr key={p.symbol} onClick={() => navigate(`/asset/${p.symbol}`)}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</td>
                    <td style={{ color: 'var(--text-primary)' }}>${(p.predictedPrice || 0).toLocaleString()}</td>
                    <td><span className={`direction-badge ${p.direction}`}>{p.direction === 'up' ? '↑ Up' : '↓ Down'}</span></td>
                    <td><span className="badge badge-cyan">{((p.confidence || 0) * 100).toFixed(0)}%</span></td>
                  </tr>
                )) : <tr><td colSpan="4" style={{ textAlign: 'center', padding: 24 }}>No recent predictions found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
