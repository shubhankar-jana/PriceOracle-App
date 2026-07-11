import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiArrowUp, FiArrowDown, FiChevronUp, FiChevronDown } from 'react-icons/fi'
import { formatCurrency, formatPercent, getCategoryIcon, getChangeColor } from '../utils/helpers'

export default function AssetTable({ assets = [], task = 'regression', onRowClick }) {
  const [sortKey, setSortKey] = useState('symbol')
  const [sortDir, setSortDir] = useState(1)
  const navigate = useNavigate()

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => -d)
    else { setSortKey(key); setSortDir(1) }
  }

  const sorted = [...assets].sort((a, b) => {
    const av = a[sortKey] ?? ''
    const bv = b[sortKey] ?? ''
    return typeof av === 'number' ? (av - bv) * sortDir : String(av).localeCompare(String(bv)) * sortDir
  })

  const SortIcon = ({ col }) => col === sortKey
    ? (sortDir === 1 ? <FiChevronUp className="sort-icon" /> : <FiChevronDown className="sort-icon" />)
    : <span className="sort-icon">⇅</span>

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th onClick={() => handleSort('symbol')}>Asset <SortIcon col="symbol" /></th>
            <th onClick={() => handleSort('currentPrice')}>Price <SortIcon col="currentPrice" /></th>
            <th onClick={() => handleSort('changePercent24h')}>24h Change <SortIcon col="changePercent24h" /></th>
            <th onClick={() => handleSort('category')}>Category <SortIcon col="category" /></th>
            <th>Prediction</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(asset => {
            const cc = getChangeColor(asset.changePercent24h)
            const isUp = asset.changePercent24h >= 0
            return (
              <tr key={asset.symbol} onClick={() => (onRowClick ? onRowClick(asset) : navigate(`/asset/${asset.symbol}`))}>
                <td>
                  <div className="table-asset-cell">
                    <div className="asset-icon" style={{ width: 34, height: 34, borderRadius: 8, fontSize: '0.9rem' }}>{getCategoryIcon(asset.category)}</div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{asset.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{asset.symbol}</div>
                    </div>
                  </div>
                </td>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(asset.currentPrice)}</td>
                <td>
                  <span className={`price-change ${cc}`} style={{ fontSize: '0.85rem' }}>
                    {isUp ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />}
                    {formatPercent(asset.changePercent24h)}
                  </span>
                </td>
                <td><span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>{asset.category}</span></td>
                <td>
                  {asset.latestPrediction ? (
                    <span className={`direction-badge ${asset.latestPrediction.direction}`}>
                      {asset.latestPrediction.direction === 'up' ? '↑' : '↓'} {task === 'regression' ? formatCurrency(asset.latestPrediction.predictedPrice) : asset.latestPrediction.direction.toUpperCase()}
                    </span>
                  ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>}
                </td>
              </tr>
            )
          })}
          {!assets.length && (
            <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No assets found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
