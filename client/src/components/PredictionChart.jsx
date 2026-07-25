import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import { formatCurrency } from '../utils/helpers'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="custom-tooltip">
      <div className="tooltip-date">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="tooltip-row">
          <span style={{ color: p.color }}>{p.name}</span>
          <span>{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * Smart Y-axis formatter — handles small values like currency pairs correctly.
 */
const makeYFormatter = (data) => {
  const values = data.flatMap(d => [d.actual, d.predicted]).filter(v => v != null && v > 0)
  if (values.length === 0) return v => formatCurrency(v)
  const max = Math.max(...values)
  if (max < 10) return v => v.toFixed(4)
  if (max < 100) return v => v.toFixed(2)
  if (max >= 1000) return v => '$' + (v / 1000).toFixed(1) + 'k'
  return v => '$' + v.toFixed(0)
}

export default function PredictionChart({ data = [], symbol }) {
  if (!data || data.length === 0) return null

  const hasActual = data.some(d => d.actual != null)
  const hasPredicted = data.some(d => d.predicted != null)
  const yFormatter = makeYFormatter(data)

  return (
    <div className="chart-container">
      <div className="chart-header">
        <span className="chart-title">ML Prediction History — {symbol}</span>
        <span className="badge badge-cyan" style={{ fontSize: '0.75rem' }}>Predicted vs Actual</span>
      </div>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
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
            <Legend wrapperStyle={{ color: '#9090b0', fontSize: '0.85rem' }} />
            {data.length > 1 && (
              <ReferenceLine
                x={data[data.length - 1]?.date}
                stroke="rgba(255,255,255,0.1)"
                strokeDasharray="4 4"
                label={{ value: 'Latest', fill: '#606080', fontSize: 10 }}
              />
            )}
            {hasActual && (
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual Close"
                stroke="#00d4ff"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls
              />
            )}
            {hasPredicted && (
              <Line
                type="monotone"
                dataKey="predicted"
                name="Predicted"
                stroke="#764ba2"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}