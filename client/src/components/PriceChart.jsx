import { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { FiBarChart2, FiInbox } from 'react-icons/fi'
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
 * @param {Array} data - Full price history array (ideally 1Y worth), each item: { date, close, open, high, low }
 * @param {string} symbol - Asset ticker symbol
 */
export default function PriceChart({ data = [], symbol }) {
  const [range, setRange] = useState('1M')

  // Slice data client-side based on selected range — no extra network calls needed
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    const selected = RANGES.find(r => r.label === range)
    const cutoffDays = selected ? selected.days : 30
    // data items have a `date` string like "Aug 11" — we need the raw date for slicing
    // Use the last N items proportionally if no raw timestamps available
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
        {chartData.length > 1 ? (
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
        ) : chartData.length === 1 ? (
          <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: 8 }}>
            <FiBarChart2 size={36} />
            <span>Only 1 data point available — select a wider range or wait for more data to accumulate.</span>
          </div>
        ) : (
          <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: 8 }}>
            <FiInbox size={36} />
            <span>No historical price data available</span>
            <span style={{ fontSize: '0.8rem' }}>The ML API may be offline or this asset has no history yet.</span>
          </div>
        )}
      </div>
    </div>
  )
}