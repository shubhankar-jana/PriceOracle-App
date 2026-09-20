import { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { FiBarChart2, FiInbox, FiRefreshCw, FiAlertTriangle } from 'react-icons/fi'
import { formatCurrency } from '../utils/helpers'

const RANGES = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="custom-tooltip">
      <div className="tooltip-date">{label}</div>
      <div className="tooltip-row"><span>Close</span><span>{formatCurrency(payload[0]?.value)}</span></div>
    </div>
  )
}

/**
 * PriceChart
 * @param {Array} data - Full price history array, each item: { date, close, open, high, low }
 * @param {string} symbol - Asset ticker symbol
 * @param {boolean} loading - History loading state
 * @param {boolean} error - History fetch error state
 * @param {function} onRetry - Handler to retry fetching history
 */
export default function PriceChart({ data = [], symbol, loading = false, error = false, onRetry = null }) {
  const [range, setRange] = useState('1M')

  // Slice data client-side based on selected range — no extra network calls needed
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    const selected = RANGES.find(r => r.label === range)
    const cutoffDays = selected ? selected.days : 30
    if (data.length <= cutoffDays) return data
    return data.slice(-cutoffDays)
  }, [data, range])

  // Determine Y-axis domain for proper zoom
  const yDomain = useMemo(() => {
    if (!chartData.length) return ['auto', 'auto']
    const values = chartData.map(d => d.close).filter(v => v > 0)
    if (!values.length) return ['auto', 'auto']
    const min = Math.min(...values)
    const max = Math.max(...values)
    const padding = (max - min) * 0.05 || max * 0.02
    return [min - padding, max + padding]
  }, [chartData])

  // Determine X-axis tick interval for readability
  const tickInterval = useMemo(() => {
    const len = chartData.length
    if (len <= 10) return 0
    if (len <= 30) return Math.floor(len / 5)
    if (len <= 90) return Math.floor(len / 6)
    return Math.floor(len / 8)
  }, [chartData])

  return (
    <div className="chart-container">
      <div className="chart-header">
        <span className="chart-title">Price History — {symbol}</span>
        <div className="time-range-buttons">
          {RANGES.map(r => (
            <button
              key={r.label}
              className={`time-btn${range === r.label ? ' active' : ''}`}
              onClick={() => setRange(r.label)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-wrapper">
        {loading ? (
          <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: 12 }}>
            <div className="loader-spinner" style={{ width: 32, height: 32 }} />
            <span>Loading historical price data...</span>
          </div>
        ) : chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#667eea" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#606080', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={tickInterval}
              />
              <YAxis
                tick={{ fill: '#606080', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => {
                  if (v >= 1000) return '$' + (v / 1000).toFixed(1) + 'k'
                  return '$' + v.toFixed(2)
                }}
                width={60}
                domain={yDomain}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="close"
                stroke="#667eea"
                strokeWidth={2}
                fill="url(#priceGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#667eea' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : error ? (
          <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: 12, textAlign: 'center', padding: 20 }}>
            <FiAlertTriangle size={36} style={{ color: 'var(--warning)' }} />
            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Price history failed to load</span>
            <span style={{ fontSize: '0.85rem', maxWidth: 400 }}>The market data server is taking longer to respond. Please try refreshing or check back shortly.</span>
            {onRetry && (
              <button className="btn btn-glass btn-sm" onClick={onRetry} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <FiRefreshCw size={14} /> Retry Loading History
              </button>
            )}
          </div>
        ) : chartData.length === 1 ? (
          <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: 12, textAlign: 'center', padding: 20 }}>
            <FiBarChart2 size={36} style={{ color: 'var(--color-purple)' }} />
            <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>Only 1 data point is currently loaded.</span>
            <span style={{ fontSize: '0.85rem', maxWidth: 400 }}>Tap below to fetch full historical price data for {symbol}.</span>
            {onRetry && (
              <button className="btn btn-glass btn-sm" onClick={onRetry} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <FiRefreshCw size={14} /> Fetch Full History
              </button>
            )}
          </div>
        ) : (
          <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: 12, textAlign: 'center', padding: 20 }}>
            <FiInbox size={36} />
            <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>No price history data available</span>
            <span style={{ fontSize: '0.85rem', maxWidth: 400 }}>Market data for {symbol} could not be retrieved right now.</span>
            {onRetry && (
              <button className="btn btn-glass btn-sm" onClick={onRetry} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <FiRefreshCw size={14} /> Retry Loading History
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}