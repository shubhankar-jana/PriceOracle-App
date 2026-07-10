import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency, formatDate } from '../utils/helpers'

const RANGES = ['1W', '1M', '3M', '6M', '1Y']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="custom-tooltip">
      <div className="tooltip-date">{label}</div>
      <div className="tooltip-row"><span>Close</span><span>{formatCurrency(payload[0]?.value)}</span></div>
    </div>
  )
}

export default function PriceChart({ data = [], symbol }) {
  const [range, setRange] = useState('1M')

  const chartData = data.length > 0 ? data : []

  return (
    <div className="chart-container">
      <div className="chart-header">
        <span className="chart-title">Price History — {symbol}</span>
        <div className="time-range-buttons">
          {RANGES.map(r => (
            <button key={r} className={`time-btn${range === r ? ' active' : ''}`} onClick={() => setRange(r)}>{r}</button>
          ))}
        </div>
      </div>
      <div className="chart-wrapper">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#667eea" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#606080', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#606080', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => '$' + v.toFixed(0)} width={55} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="close" stroke="#667eea" strokeWidth={2} fill="url(#priceGrad)" dot={false} activeDot={{ r: 4, fill: '#667eea' }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            No historical data available
          </div>
        )}
      </div>
    </div>
  )
}