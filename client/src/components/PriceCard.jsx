import { FiArrowUp, FiArrowDown, FiMinus, FiPlus } from 'react-icons/fi'
import { getCategoryIcon, getCategoryClass, formatCurrency, formatPercent, getChangeColor } from '../utils/helpers'

export default function PriceCard({ asset, onClick, onRemove, showRemove, onAddToWatchlist }) {
  if (!asset) return null
  const { symbol, name, category, currentPrice, change24h, changePercent24h } = asset
  const changeClass = getChangeColor(changePercent24h)
  const isUp = changePercent24h > 0
  const isDown = changePercent24h < 0

  return (
    <div className="price-card" onClick={onClick} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onClick?.()}>
      {showRemove && (
        <button className="price-card-remove" onClick={e => { e.stopPropagation(); onRemove?.() }}>✕</button>
      )}
      {onAddToWatchlist && !showRemove && (
        <button className="price-card-add-watchlist" onClick={e => { e.stopPropagation(); onAddToWatchlist(symbol) }} title="Add to watchlist">
          <FiPlus size={14} />
        </button>
      )}
      <div className="price-card-header">
        <div className="asset-info">
          <div className={`asset-icon ${getCategoryClass(category)}`}>{getCategoryIcon(category)}</div>
          <div>
            <div className="asset-name">{name}</div>
            <div className="asset-symbol">{symbol}</div>
          </div>
        </div>
        <span className={`badge badge-purple`} style={{ fontSize: '0.7rem' }}>{category}</span>
      </div>
      <div className="price-card-body">
        <div className="current-price">{formatCurrency(currentPrice)}</div>
        <div className={`price-change ${changeClass}`}>
          <span className="arrow">
            {isUp ? <FiArrowUp size={12} /> : isDown ? <FiArrowDown size={12} /> : <FiMinus size={12} />}
          </span>
          <span>{formatCurrency(Math.abs(change24h || 0))}</span>
          <span>({formatPercent(changePercent24h)})</span>
        </div>
        <svg className="sparkline" viewBox="0 0 100 40" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`sg-${symbol}`} x1="0" y1="0" x2="100%" y2="0">
              <stop offset="0%" stopColor={isUp ? '#00e676' : '#ff5252'} />
              <stop offset="100%" stopColor={isUp ? '#667eea' : '#ff1744'} />
            </linearGradient>
          </defs>
          <polyline
            points={isUp ? '0,35 15,28 30,25 45,20 60,22 75,12 90,8 100,5' : '0,5 15,12 30,10 45,18 60,15 75,25 90,28 100,35'}
            fill="none" stroke={`url(#sg-${symbol})`} strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}