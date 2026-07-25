import { useMemo } from 'react'
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
      <div className="tooltip-row">
        <span>Close</span>
        <span>{formatCurrency(payload[0]?.value)}</span>
      </div>
    </div>
  )
}

export default function PriceChart({ data = [], symbol, loading = false, selectedPeriod = '1m', onPeriodChange }) {
  // Compute Y-axis domain + tick formatter from data — memoized so it doesn't recalculate on every render
  const { yDomain, yFormatter } = useMemo(() => {
    if (!data || data.length === 0) {
      return { yDomain: ['auto', 'auto'], yFormatter: v => formatCurrency(v) }
    }

    const values = data.map(d => d.close).filter(v => v != null && v > 0)
    if (values.length === 0) return { yDomain: ['auto', 'auto'], yFormatter: v => formatCurrency(v) }

    const min = Math.min(...values)
    const max = Math.max(...values)
    const padding = (max - min) * 0.08 || max * 0.02 // 8% padding, or 2% of max if flat

    const domainMin = Math.max(0, min - padding)
    const domainMax = max + padding

    // Formatter: adapt decimals to the price magnitude
    let fmt
    if (max < 10) fmt = v => v.toFixed(4)           // EUR/USD, NZD/USD
    else if (max < 100) fmt = v => v.toFixed(2)      // Silver ~30, crude ~70
    else if (max >= 100000) fmt = v => '$' + (v / 1000).toFixed(0) + 'k'  // BTC
    else if (max >= 1000) fmt = v => '$' + (v / 1000).toFixed(1) + 'k'    // Gold ~3300
    else fmt = v => '$' + v.toFixed(0)               // Stocks ~100-999

    return { yDomain: [domainMin, domainMax], yFormatter: fmt }
  }, [data])

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
          <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="loader-spinner" style={{ width: 28, height: 28 }} />
          </div>
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#667eea" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#667eea" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#606080', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#606080', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={yFormatter}
                width={68}
                domain={yDomain}
                tickCount={6}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="close"
                stroke="#667eea"
                strokeWidth={2}
                fill="url(#priceGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#667eea', stroke: '#667eea' }}
                isAnimationActive={false}
              />
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