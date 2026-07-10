import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { FiTrendingUp, FiBarChart2, FiEye, FiSettings, FiLogOut, FiMenu, FiX, FiActivity, FiBell } from 'react-icons/fi'
import useAuth from '../hooks/useAuth'

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropOpen, setDropOpen] = useState(false)
  const navigate = useNavigate()

  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U'

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: <FiTrendingUp /> },
    { to: '/predictions', label: 'Predictions', icon: <FiActivity /> },
    { to: '/analytics', label: 'Analytics', icon: <FiBarChart2 /> },
    { to: '/watchlist', label: 'Watchlist', icon: <FiEye /> },
  ]

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="navbar-logo">
            <div className="logo-icon">📈</div>
            <span className="text-gradient">PriceOracle</span>
          </Link>

          {isAuthenticated && (
            <div className="navbar-nav">
              {navLinks.map(l => (
                <NavLink key={l.to} to={l.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                  {l.icon} {l.label}
                </NavLink>
              ))}
            </div>
          )}

          <div className="navbar-right">
            {isAuthenticated ? (
              <div className="user-menu">
                <button className="user-avatar-btn" onClick={() => setDropOpen(!dropOpen)}>
                  <div className="avatar-circle">{initials}</div>
                  <span>{user?.name?.split(' ')[0]}</span>
                  <FiSettings size={14} />
                </button>
                {dropOpen && (
                  <div className="dropdown-menu" onMouseLeave={() => setDropOpen(false)}>
                    <div style={{ padding: '8px 14px 12px', borderBottom: '1px solid var(--glass-border)' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user?.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{user?.email}</div>
                    </div>
                    <div className="dropdown-item" onClick={() => { navigate('/settings'); setDropOpen(false) }}>
                      <FiSettings /> Settings
                    </div>
                    <div className="dropdown-item" onClick={() => { navigate('/watchlist'); setDropOpen(false) }}>
                      <FiEye /> Watchlist
                    </div>
                    <div className="dropdown-divider" />
                    <div className="dropdown-item danger" onClick={logout}>
                      <FiLogOut /> Sign Out
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-8">
                <Link to="/login" className="btn btn-glass btn-sm">Login</Link>
                <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
              </div>
            )}
            {isAuthenticated && (
              <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="menu">
                {menuOpen ? <FiX /> : <FiMenu />}
              </button>
            )}
          </div>
        </div>
      </nav>

      {isAuthenticated && (
        <div className={`mobile-nav${menuOpen ? ' open' : ''}`}>
          {navLinks.map(l => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              onClick={() => setMenuOpen(false)}>
              {l.icon} {l.label}
            </NavLink>
          ))}
          <div className="divider" />
          <div className="nav-link" onClick={logout} style={{ cursor: 'pointer', color: 'var(--danger)' }}>
            <FiLogOut /> Sign Out
          </div>
        </div>
      )}
    </>
  )
}
