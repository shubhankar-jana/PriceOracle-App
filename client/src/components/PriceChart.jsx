import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '../utils/helpers'

const RANGES = [
  { label: '1W', value: '1w' },
  { label: '1M', value: '1m' },
  { label: '3M', value: '3m' },
  { label: '6M', value: '6m' },
  { label: '1Y', value: '1y' },
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
 * Smart Y-axis tick formatter — avoids showing "$1" for values like 1.08 (EUR/USD).
 * Shows enough decimal places based on the data range.
 */
const makeYAxisFormatter = (data) => {
  if (!data || data.length === 0) return v => formatCurrency(v)
  const values = data.map(d => d.close).filter(Boolean)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min

  // For very small values (e.g. currency pairs < 10), show 4 decimals
  if (max < 10) return v => v.toFixed(4)
  // For medium range values (< 100), show 2 decimals
  if (max < 100) return v => v.toFixed(2)
  // For large values, show abbreviated with $
  if (range > 1000) return v => '$' + (v / 1000).toFixed(1) + 'k'
  return v => '$' + v.toFixed(0)
}

export default function PriceChart({ data = [], symbol, loading = false, selectedPeriod = '1m', onPeriodChange }) {
  const yFormatter = makeYAxisFormatter(data)

  return (
    <div className="chart-container">
      <div className="chart-header">
        <span className="chart-title">Price History — {symbol}</span>
        <div className="time-range-buttons">
          {RANGES.map(r => (
            <button
              key={r.value}
              className={`time-btn${selectedPeriod === r.value ? ' active' : ''}`}
              onClick={() => onPeriodChange && onPeriodChange(r.value)}
              disabled={loading}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-wrapper">
        {loading ? (
          <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <div className="loader-spinner" style={{ width: 28, height: 28 }} />
          </div>
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#667eea" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#606080', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis
                tick={{ fill: '#606080', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={yFormatter}
                width={65}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="close" stroke="#667eea" strokeWidth={2} fill="url(#priceGrad)" dot={false} activeDot={{ r: 4, fill: '#667eea' }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>📉</div>
              <p>No historical data available</p>
              <p style={{ fontSize: '0.8rem', marginTop: 4, opacity: 0.7 }}>ML service may be warming up</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}