import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../api/axios'
import { useSocket } from '../context/SocketContext'
import { formatCurrency } from '../utils/helpers'
import toast from 'react-hot-toast'

const COLORS = ['#667eea', '#ffab40', '#f7931a', '#00d4ff', '#00e676']

export default function Analytics() {
  const navigate = useNavigate()
  const { socket } = useSocket()
  
  const [assets, setAssets] = useState([])
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(true)

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
        toast.error('Failed to load analytics data')
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

  // Compute derived data
  const { HEATMAP, GAINERS, LOSERS, PIE_DATA, BAR_DATA, sentiment, sentimentLabel, sentimentColor } = useMemo(() => {
    const sortedByChange = [...assets].sort((a, b) => (b.changePercent24h || 0) - (a.changePercent24h || 0))
    const gainers = sortedByChange.filter(a => a.changePercent24h > 0).slice(0, 5)
    // Reverse logic to get most negative first for losers
    const losers = sortedByChange.filter(a => a.changePercent24h < 0).sort((a, b) => (a.changePercent24h || 0) - (b.changePercent24h || 0)).slice(0, 5)
    const heatmap = assets.map(a => ({ symbol: a.symbol, change: a.changePercent24h || 0 }))

    const categoryCounts = assets.reduce((acc, a) => {
      if (!a.category) return acc
      acc[a.category] = (acc[a.category] || 0) + 1
      return acc
    }, {})
    const PLURAL_MAP = { stock: 'Stocks', commodity: 'Commodities', crypto: 'Crypto', currency: 'Currencies', index: 'Indexes' }
    const pieData = Object.entries(categoryCounts).map(([cat, count]) => ({
      name: PLURAL_MAP[cat] || (cat.charAt(0).toUpperCase() + cat.slice(1) + 's'),
      value: count
    }))

    const sortedByConf = [...predictions].sort((a, b) => (b.confidence || 0) - (a.confidence || 0)).slice(0, 7)
    const barData = sortedByConf.length > 0
      ? sortedByConf.map(p => ({ name: p.symbol, confidence: Math.round((p.confidence || 0) * 100) }))
      : [] // Will show empty state message when no predictions

    // Mock global sentiment based on general asset movement (ratio of green to red)
    const totalGreen = gainers.length
    const totalRed = losers.length
    const totalMove = totalGreen + totalRed || 1
    const rawSentiment = ((totalGreen - totalRed) / totalMove) // ranges -1 to 1
    
    let label = 'Neutral'
    let color = 'var(--warning)'
    if (rawSentiment > 0.3) { label = 'Bullish'; color = 'var(--success)' }
    else if (rawSentiment < -0.3) { label = 'Bearish'; color = 'var(--danger)' }

    return { 
      HEATMAP: heatmap, 
      GAINERS: gainers, 
      LOSERS: losers, 
      PIE_DATA: pieData, 
      BAR_DATA: barData,
      sentiment: rawSentiment,
      sentimentLabel: label,
      sentimentColor: color
    }
  }, [assets, predictions])

  if (loading) {
    return (
      <div className="page-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <span className="spinner" style={{ width: 40, height: 40, marginBottom: 16 }}></span>
          <p>Loading analytics engine...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-wrapper">
      <div className="analytics-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Market <span className="text-gradient">Analytics</span></h1>
            <div className="page-sub">Live cross-asset performance, correlations and market sentiment</div>
          </div>
        </div>

        {/* Heatmap */}
        <div className="card mb-24">
          <div className="card-header"><span className="card-title">📊 Market Heatmap — 24h Performance</span></div>
          <div className="heatmap-grid">
            {HEATMAP.map(t => (
              <div key={t.symbol} className={`heatmap-tile ${t.change > 0.3 ? 'positive' : t.change < -0.3 ? 'negative' : 'neutral'}`}
                style={{ opacity: 0.7 + Math.abs(t.change) * 0.1 }}>
                <div className="heatmap-symbol">{t.symbol}</div>
                <div className="heatmap-change">{t.change > 0 ? '+' : ''}{t.change.toFixed(2)}%</div>
              </div>
            ))}
          </div>
        </div>

        <div className="analytics-grid">
          {/* Top Movers */}
          <div className="card">
            <div className="card-header"><span className="card-title">🚀 Top Movers</span></div>
            <div className="movers-grid">
              <div>
                <h4 style={{ color: 'var(--success)', marginBottom: 16, fontSize: '0.9rem' }}>📈 Top Gainers</h4>
                {GAINERS.length > 0 ? GAINERS.map((g, i) => (
                  <div key={g.symbol} className="mover-item">
                    <div className="mover-info">
                      <span className="mover-rank">#{i + 1}</span>
                      <div>
                        <div className="mover-name">{g.name}</div>
                        <div className="mover-symbol">{g.symbol}</div>
                      </div>
                    </div>
                    <div>
                      <div style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.85rem' }}>{formatCurrency(g.currentPrice)}</div>
                      <div className="price-up" style={{ fontSize: '0.8rem', textAlign: 'right' }}>+{g.changePercent24h.toFixed(2)}%</div>
                    </div>
                  </div>
                )) : <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No significant gainers.</div>}
              </div>
              <div>
                <h4 style={{ color: 'var(--danger)', marginBottom: 16, fontSize: '0.9rem' }}>📉 Top Losers</h4>
                {LOSERS.length > 0 ? LOSERS.map((l, i) => (
                  <div key={l.symbol} className="mover-item">
                    <div className="mover-info">
                      <span className="mover-rank">#{i + 1}</span>
                      <div>
                        <div className="mover-name">{l.name}</div>
                        <div className="mover-symbol">{l.symbol}</div>
                      </div>
                    </div>
                    <div>
                      <div style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.85rem' }}>{formatCurrency(l.currentPrice)}</div>
                      <div className="price-down" style={{ fontSize: '0.8rem', textAlign: 'right' }}>{l.changePercent24h.toFixed(2)}%</div>
                    </div>
                  </div>
                )) : <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No significant losers.</div>}
              </div>
            </div>
          </div>

          {/* Sentiment Gauge */}
          <div className="card">
            <div className="card-header"><span className="card-title">🧠 Market Sentiment</span><span className="badge badge-cyan">LIVE API</span></div>
            <div className="sentiment-gauge">
              <svg viewBox="0 0 200 110" style={{ width: '100%', maxWidth: 260 }}>
                <defs>
                  <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ff5252" />
                    <stop offset="50%" stopColor="#ffab40" />
                    <stop offset="100%" stopColor="#00e676" />
                  </linearGradient>
                </defs>
                <path d="M 15 100 A 85 85 0 0 1 185 100" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="16" strokeLinecap="round" />
                <path d="M 15 100 A 85 85 0 0 1 185 100" fill="none" stroke="url(#gaugeGrad)" strokeWidth="16" strokeLinecap="round" strokeDasharray={`${(sentiment + 1) / 2 * 267} 267`} />
                <circle cx={100 + Math.cos(Math.PI - (sentiment + 1) / 2 * Math.PI) * 75}
                  cy={100 + Math.sin(Math.PI - (sentiment + 1) / 2 * Math.PI) * (-75)}
                  r="7" fill="white" />
                <text x="100" y="75" textAnchor="middle" fill={sentimentColor} fontSize="24" fontWeight="800">{sentimentLabel}</text>
                <text x="100" y="95" textAnchor="middle" fill="#606080" fontSize="11">{(sentiment * 100).toFixed(0)}% positive</text>
              </svg>
              <div className="gauge-labels" style={{ width: 200 }}>
                <span style={{ color: 'var(--danger)' }}>Bearish</span>
                <span style={{ color: 'var(--text-muted)' }}>Neutral</span>
                <span style={{ color: 'var(--success)' }}>Bullish</span>
              </div>
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <p style={{ fontSize: '0.85rem' }}>Live sentiment computed from {assets.length} tracked assets.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="analytics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', display: 'grid', gap: '24px', marginTop: 24 }}>
          {/* Pie Chart */}
          <div className="card">
            <div className="card-header"><span className="card-title">🥧 Asset Distribution</span></div>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                    {PIE_DATA.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} itemStyle={{ color: 'var(--text-primary)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
                {PIE_DATA.map((entry, i) => (
                  <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS[i] }}></div>
                    {entry.name}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="card">
            <div className="card-header"><span className="card-title">📊 Top Prediction Confidence</span></div>
            <div style={{ height: 300 }}>
              {BAR_DATA.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={BAR_DATA} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                    <Bar dataKey="confidence" fill="var(--color-purple)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: '2rem' }}>🤖</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No ML predictions available yet.</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Predictions run every 6 hours automatically.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
