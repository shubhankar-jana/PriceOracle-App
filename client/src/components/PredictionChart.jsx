import { useMemo } from 'react'
import { FiInfo } from 'react-icons/fi'
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { formatCurrency } from '../utils/helpers'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="custom-tooltip">
      <div className="tooltip-date">{label}</div>
      {payload.map(p => (
        p.value != null && (
          <div key={p.dataKey} className="tooltip-row">
            <span style={{ color: p.color }}>{p.name}</span>
            <span>{formatCurrency(p.value)}</span>
          </div>
        )
      ))}
    </div>
  )
}

/**
 * PredictionChart — shows Predicted vs Actual close prices over time.
 *
 * @param {Array} data  - Array of { date, actual, predicted } — actual may be null for future dates.
 * @param {string} symbol
 */
export default function PredictionChart({ data = [], symbol }) {
  if (!data || data.length === 0) return null

  const hasActual = data.some(d => d.actual != null && d.actual > 0)
  const hasPredicted = data.some(d => d.predicted != null && d.predicted > 0)

  // Find the first date where actual is null (the "today" divider)
  const firstFutureDate = useMemo(() => {
    const item = data.find(d => d.actual == null || d.actual <= 0)
    return item ? item.date : null
  }, [data])

  // Compute Y-axis domain from all real values for a tight, informative chart
  const yDomain = useMemo(() => {
    const values = data.flatMap(d => [d.actual, d.predicted]).filter(v => v != null && v > 0)
    if (!values.length) return ['auto', 'auto']
    const min = Math.min(...values)
    const max = Math.max(...values)
    const pad = (max - min) * 0.05 || max * 0.02
    return [min - pad, max + pad]
  }, [data])

  // Tick formatter that shows compact numbers
  const tickFormatter = v => {
    if (!v) return ''
    if (v >= 1000) return '$' + (v / 1000).toFixed(1) + 'k'
    return '$' + v.toFixed(2)
  }

  const tickInterval = Math.max(0, Math.floor(data.length / 8) - 1)

  return (
    <div className="chart-container">
      <div className="chart-header">
        <span className="chart-title">Prediction History — {symbol}</span>
        <span className="badge badge-cyan" style={{ fontSize: '0.75rem' }}>Predicted vs Actual</span>
      </div>

      {!hasActual && (
        <div style={{ padding: '8px 16px 0', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <FiInfo size={14} style={{ flexShrink: 0 }} /> Actual prices are filled in nightly after target dates pass. Check back tomorrow for Actual line data.
        </div>
      )}

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
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
              tickFormatter={tickFormatter}
              width={65}
              domain={yDomain}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ color: '#9090b0', fontSize: '0.85rem', paddingTop: '8px' }}
            />

            {/* "Today" divider line if we have future predictions */}
            {firstFutureDate && (
              <ReferenceLine
                x={firstFutureDate}
                stroke="rgba(255,255,255,0.2)"
                strokeDasharray="4 4"
                label={{ value: 'Today', fill: '#606080', fontSize: 10, position: 'insideTopLeft' }}
              />
            )}

            {/* Actual price — solid cyan line, only where data exists */}
            {hasActual && (
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual Close"
                stroke="#00d4ff"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: '#00d4ff' }}
                connectNulls={false}
              />
            )}

            {/* Predicted price — dashed purple line */}
            {hasPredicted && (
              <Line
                type="monotone"
                dataKey="predicted"
                name="Predicted"
                stroke="#764ba2"
                strokeWidth={2}
                strokeDasharray="7 3"
                dot={false}
                activeDot={{ r: 5, fill: '#764ba2' }}
                connectNulls={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}