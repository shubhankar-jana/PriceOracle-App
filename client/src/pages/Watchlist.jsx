import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPlus, FiTrash2, FiBell } from 'react-icons/fi'
import PriceCard from '../components/PriceCard'
import toast from 'react-hot-toast'
import api from '../api/axios'

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState([])
  const [alerts, setAlerts] = useState([])
  const [alertForm, setAlertForm] = useState({ symbol: '', alertType: 'above', targetPrice: '' })
  const [showAlertForm, setShowAlertForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const fetchWatchlist = async () => {
    try {
      const res = await api.get('/user/watchlist')
      setWatchlist(res.data.data.assets || [])
    } catch (err) {
      console.error('Failed to fetch watchlist', err)
      toast.error('Failed to load watchlist')
    }
  }

  const fetchAlerts = async () => {
    try {
      const res = await api.get('/alerts')
      setAlerts(res.data.data?.alerts || [])
    } catch (err) {
      console.error('Failed to fetch alerts', err)
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchWatchlist(), fetchAlerts()])
      setLoading(false)
    }
    load()
  }, [])

  const removeFromWatchlist = async (symbol) => {
    try {
      await api.delete(`/user/watchlist/${symbol}`)
      setWatchlist(w => w.filter(a => a.symbol !== symbol))
      toast.success(`${symbol} removed from watchlist`)
    } catch (err) {
      toast.error('Failed to remove from watchlist')
    }
  }

  const addAlert = async (symbol) => {
    if (!alertForm.targetPrice) return toast.error('Enter a target price')
    try {
      const res = await api.post('/alerts', {
        symbol,
        alertType: alertForm.alertType,
        targetPrice: parseFloat(alertForm.targetPrice)
      })
      setAlerts(a => [...a, res.data.data])
      setShowAlertForm(null)
      setAlertForm({ symbol: '', alertType: 'above', targetPrice: '' })
      toast.success('Alert set! You\'ll be notified when triggered.')
    } catch (err) {
      toast.error('Failed to set alert')
    }
  }

  const deleteAlert = async (id) => {
    try {
      await api.delete(`/alerts/${id}`)
      setAlerts(a => a.filter(al => al._id !== id))
      toast.success('Alert deleted')
    } catch (err) {
      toast.error('Failed to delete alert')
    }
  }

  if (loading) return <div className="page-wrapper"><div className="inline-loader"><div className="loader-spinner" /></div></div>

  if (!watchlist.length) return (
    <div className="page-wrapper">
      <div className="watchlist-page">
        <div className="page-header"><h1 className="page-title">My <span className="text-gradient">Watchlist</span></h1></div>
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">👁️</div>
            <h3>Your watchlist is empty</h3>
            <p>Add assets from the Dashboard to track them here and set price alerts</p>
            <button className="btn btn-primary" onClick={() => navigate('/dashboard')}><FiPlus /> Browse Assets</button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="page-wrapper">
      <div className="watchlist-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">My <span className="text-gradient">Watchlist</span></h1>
            <div className="page-sub">{watchlist.length} assets tracked</div>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}><FiPlus /> Add Assets</button>
        </div>

        <div className="assets-grid mb-32">
          {watchlist.map(asset => (
            <div key={asset.symbol}>
              <PriceCard asset={asset} onClick={() => navigate(`/asset/${asset.symbol}`)} onRemove={() => removeFromWatchlist(asset.symbol)} showRemove />
              <div style={{ marginTop: 8 }}>
                <button className="btn btn-glass btn-sm" style={{ width: '100%' }} onClick={() => setShowAlertForm(showAlertForm === asset.symbol ? null : asset.symbol)}>
                  <FiBell size={13} /> {showAlertForm === asset.symbol ? 'Cancel Alert' : 'Set Price Alert'}
                </button>
                {showAlertForm === asset.symbol && (
                  <div className="alert-form-inline" style={{ marginTop: 8 }}>
                    <select className="form-select" style={{ flex: 1, minWidth: 100 }} value={alertForm.alertType} onChange={e => setAlertForm(f => ({ ...f, alertType: e.target.value }))}>
                      <option value="above">Price goes above</option>
                      <option value="below">Price goes below</option>
                    </select>
                    <input className="form-input" style={{ flex: 1, minWidth: 100 }} type="number" placeholder="Target price" value={alertForm.targetPrice} onChange={e => setAlertForm(f => ({ ...f, targetPrice: e.target.value }))} />
                    <button className="btn btn-primary btn-sm" onClick={() => addAlert(asset.symbol)}>Set Alert</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Active Alerts */}
        <div className="card">
          <div className="card-header"><span className="card-title">🔔 Price Alerts</span><span className="badge badge-purple">{alerts.filter(a => a.isActive).length} active</span></div>
          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No alerts set yet. Use the buttons above to create alerts.</div>
          ) : alerts.map(alert => (
            <div key={alert._id} className="alert-item">
              <div className="alert-info">
                <div className="alert-title">{alert.symbol} — Price {alert.alertType} ${alert.targetPrice?.toLocaleString()}</div>
                <div className="alert-desc">Created {new Date(alert.createdAt || alert.created).toLocaleDateString()}</div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span className={`alert-status ${alert.isTriggered ? 'triggered' : 'active'}`}>
                  {alert.isTriggered ? '⚡ Triggered' : '● Active'}
                </span>
                <button className="btn btn-glass btn-sm" onClick={() => deleteAlert(alert._id)}><FiTrash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}