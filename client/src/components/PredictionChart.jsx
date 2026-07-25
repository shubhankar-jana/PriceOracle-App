import { useMemo } from 'react'
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
  if (!data || data.length === 0) return null

  const hasActual = data.some(d => d.actual != null)
  const hasPredicted = data.some(d => d.predicted != null)

  // Memoized Y-axis domain + formatter based on data values
  const { yDomain, yFormatter } = useMemo(() => {
    const values = data
      .flatMap(d => [d.actual, d.predicted])
      .filter(v => v != null && v > 0)

    if (values.length === 0) return { yDomain: ['auto', 'auto'], yFormatter: v => formatCurrency(v) }

    const min = Math.min(...values)
    const max = Math.max(...values)
    const padding = (max - min) * 0.1 || max * 0.02

    const domainMin = Math.max(0, min - padding)
    const domainMax = max + padding

    let fmt
    if (max < 10) fmt = v => v.toFixed(4)
    else if (max < 100) fmt = v => v.toFixed(2)
    else if (max >= 100000) fmt = v => '$' + (v / 1000).toFixed(0) + 'k'
    else if (max >= 1000) fmt = v => '$' + (v / 1000).toFixed(1) + 'k'
    else fmt = v => '$' + v.toFixed(0)

    return { yDomain: [domainMin, domainMax], yFormatter: fmt }
  }, [data])

  return (
    <div className="chart-container">
      <div className="chart-header">
        <span className="chart-title">Prediction History — {symbol}</span>
        <span className="badge badge-cyan" style={{ fontSize: '0.75rem' }}>Predicted vs Actual</span>
      </div>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
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
            <Legend wrapperStyle={{ color: '#9090b0', fontSize: '0.85rem' }} />
            {data.length > 1 && (
              <ReferenceLine
                x={data[data.length - 1]?.date}
                stroke="rgba(255,255,255,0.12)"
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
                isAnimationActive={false}
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
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}