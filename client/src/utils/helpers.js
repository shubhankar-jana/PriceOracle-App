export const formatCurrency = (value, decimals = 2) => {
  if (value == null || isNaN(value)) return '—'
  if (value >= 1000) return '$' + Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return '$' + Number(value).toFixed(decimals)
}

export const formatPercent = (value) => {
  if (value == null || isNaN(value)) return '—'
  const sign = value >= 0 ? '+' : ''
  return sign + Number(value).toFixed(2) + '%'
}

export const formatDate = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export const formatNumber = (value) => {
  if (value == null || isNaN(value)) return '—'
  if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B'
  if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M'
  if (value >= 1e3) return (value / 1e3).toFixed(2) + 'K'
  return Number(value).toFixed(2)
}

export const getChangeColor = (change) => {
  if (!change) return 'price-neutral'
  return change >= 0 ? 'price-up' : 'price-down'
}

export const getCategoryIcon = (category) => {
  const icons = { stock: '📈', commodity: '🥇', crypto: '₿', index: '📊', currency: '💱' }
  return icons[category] || '📊'
}

export const getCategoryClass = (category) => {
  const map = { stock: '', commodity: 'commodity', crypto: 'crypto', index: 'index', currency: 'currency' }
  return map[category] || ''
}

export const getTimeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export const TICKER_DATA = [
  { symbol: 'AAPL', price: '$215.34', change: '+1.2%', up: true },
  { symbol: 'GOOG', price: '$182.50', change: '+0.8%', up: true },
  { symbol: 'TSLA', price: '$248.10', change: '-1.5%', up: false },
  { symbol: 'MSFT', price: '$421.20', change: '+0.5%', up: true },
  { symbol: 'BTC', price: '$62,340', change: '+2.1%', up: true },
  { symbol: 'GOLD', price: '$3,361', change: '+0.3%', up: true },
  { symbol: 'OIL', price: '$68.42', change: '-0.7%', up: false },
  { symbol: 'SILVER', price: '$37.15', change: '+1.1%', up: true },
  { symbol: 'USD/INR', price: '₹83.42', change: '-0.1%', up: false },
  { symbol: 'EUR/USD', price: '$1.0842', change: '+0.2%', up: true },
  { symbol: 'AMZN', price: '$195.80', change: '+0.9%', up: true },
  { symbol: 'RELIANCE', price: '₹2,945', change: '+0.6%', up: true },
]
