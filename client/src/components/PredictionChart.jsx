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

export default function PredictionChart({ data = [], symbol }) {
  if (!data || data.length === 0) {
    return null
  }

  const hasActual = data.some(d => d.actual != null)
  const hasPredicted = data.some(d => d.predicted != null)

  return (
    <div className="chart-container">
      <div className="chart-header">
        <span className="chart-title">ML Prediction — {symbol}</span>
        <span className="badge badge-cyan" style={{ fontSize: '0.75rem' }}>Predicted vs Actual</span>
      </div>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fill: '#606080', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: '#606080', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => '$' + v.toFixed(0)} width={55} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: '#9090b0', fontSize: '0.85rem' }} />
            <ReferenceLine x={data[data.length - 1]?.date} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" label={{ value: 'Latest', fill: '#606080', fontSize: 10 }} />
            {hasActual && <Line type="monotone" dataKey="actual" name="Actual Close" stroke="#00d4ff" strokeWidth={2} dot={false} activeDot={{ r: 4 }} connectNulls />}
            {hasPredicted && <Line type="monotone" dataKey="predicted" name="Predicted" stroke="#764ba2" strokeWidth={2} strokeDasharray="6 3" dot={false} activeDot={{ r: 4 }} connectNulls />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}