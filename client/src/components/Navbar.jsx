import { useState } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  FiTrendingUp, FiBarChart2, FiEye, FiSettings, FiLogOut,
  FiMenu, FiX, FiActivity, FiInfo, FiHelpCircle, FiMail, FiBookOpen,
  FiSun, FiMoon
} from 'react-icons/fi'
import useAuth from '../hooks/useAuth'
import { useTheme } from '../context/ThemeContext'

/**
 * Smooth-scroll helper for landing page anchor links.
 * Works whether we're already on '/' or navigating from another page.
 */
function useLandingScroll() {
  const navigate = useNavigate()
  const location = useLocation()

  return (anchor) => {
    if (location.pathname === '/') {
      // Already on landing — just scroll
      const el = document.getElementById(anchor)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      // Navigate to landing with hash; after mount the browser will scroll
      navigate(`/#${anchor}`)
    }
  }
}

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropOpen, setDropOpen] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const scrollTo = useLandingScroll()
  const location = useLocation()
  const navigate = useNavigate()

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  // App navigation links (only visible when logged in)
  const appNavLinks = [
    { to: '/dashboard',   label: 'Dashboard',   icon: <FiTrendingUp /> },
    { to: '/predictions', label: 'Predictions', icon: <FiActivity /> },
    { to: '/analytics',   label: 'Analytics',   icon: <FiBarChart2 /> },
    { to: '/watchlist',   label: 'Watchlist',   icon: <FiEye /> },
  ]

  // Landing page section links (visible when logged out, on any page)
  const landingLinks = [
    { anchor: 'about',   label: 'About',   icon: <FiInfo /> },
    { anchor: 'faq',     label: 'FAQ',     icon: <FiHelpCircle /> },
    { anchor: 'contact', label: 'Contact', icon: <FiMail /> },
    { anchor: 'blog',    label: 'Blog',    icon: <FiBookOpen /> },
  ]

  const handleLandingLink = (anchor) => {
    scrollTo(anchor)
    setMenuOpen(false)
  }

  const handleLogout = () => {
    setDropOpen(false)
    setMenuOpen(false)
    logout()
  }

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          {/* Logo */}
          <Link to="/" className="navbar-logo">
            <div className="logo-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiTrendingUp />
            </div>
            <span className="text-gradient">PriceOracle</span>
          </Link>

          {/* Desktop nav links */}
          <div className="navbar-nav">
            {isAuthenticated
              ? appNavLinks.map(l => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                  >
                    {l.icon} {l.label}
                  </NavLink>
                ))
              : landingLinks.map(l => (
                  <button
                    key={l.anchor}
                    className="nav-link"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={() => handleLandingLink(l.anchor)}
                  >
                    {l.icon} {l.label}
                  </button>
                ))
            }
          </div>

          {/* Right side */}
          <div className="navbar-right">
            {/* Theme toggle */}
            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
            </button>

            {isAuthenticated ? (
              <div className="user-menu">
                <button className="user-avatar-btn" onClick={() => setDropOpen(!dropOpen)} aria-label="User menu">
                  {user?.avatar && !avatarError ? (
                    <img
                      src={user.avatar}
                      alt="avatar"
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      onError={() => setAvatarError(true)}
                      style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="avatar-circle">{initials}</div>
                  )}
                  <span className="user-name-text">{user?.name?.split(' ')[0]}</span>
                  <FiSettings size={14} className="user-settings-icon" />
                </button>

                {dropOpen && (
                  <div className="dropdown-menu" onMouseLeave={() => setDropOpen(false)}>
                    <div style={{ padding: '8px 14px 12px', borderBottom: '1px solid var(--glass-border)' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user?.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', wordBreak: 'break-all' }}>{user?.email}</div>
                    </div>
                    <div className="dropdown-item" onClick={() => { navigate('/settings'); setDropOpen(false) }}>
                      <FiSettings /> Settings
                    </div>
                    <div className="dropdown-item" onClick={() => { navigate('/watchlist'); setDropOpen(false) }}>
                      <FiEye /> Watchlist
                    </div>
                    <div className="dropdown-divider" />
                    <div className="dropdown-item danger" onClick={handleLogout}>
                      <FiLogOut /> Sign Out
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="navbar-auth-desktop flex gap-8">
                <Link to="/login" className="btn btn-glass btn-sm">Login</Link>
                <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
              </div>
            )}

            {/* Hamburger — always shown on mobile */}
            <button
              className="hamburger"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle navigation menu"
            >
              {menuOpen ? <FiX /> : <FiMenu />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu backdrop */}
      {menuOpen && (
        <div
          className="mobile-nav-backdrop"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Mobile menu */}
      <div className={`mobile-nav${menuOpen ? ' open' : ''}`}>
        {isAuthenticated
          ? (
            <>
              {appNavLinks.map(l => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {l.icon} {l.label}
                </NavLink>
              ))}
              <NavLink
                to="/settings"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                <FiSettings /> Settings
              </NavLink>
            </>
          )
          : landingLinks.map(l => (
              <button
                key={l.anchor}
                className="nav-link"
                style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                onClick={() => handleLandingLink(l.anchor)}
              >
                {l.icon} {l.label}
              </button>
            ))
        }

        {/* Theme toggle in mobile menu */}
        <button
          className="nav-link"
          style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
          onClick={() => { toggleTheme(); setMenuOpen(false) }}
        >
          {theme === 'dark' ? <FiSun /> : <FiMoon />} {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>

        <div className="divider" style={{ margin: '8px 0' }} />

        {isAuthenticated ? (
          <div className="nav-link" onClick={handleLogout} style={{ cursor: 'pointer', color: 'var(--danger)' }}>
            <FiLogOut /> Sign Out ({user?.name?.split(' ')[0] || 'User'})
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
            <Link to="/login" className="btn btn-glass btn-block" onClick={() => setMenuOpen(false)}>Login</Link>
            <Link to="/register" className="btn btn-primary btn-block" onClick={() => setMenuOpen(false)}>Get Started Free</Link>
          </div>
        )}
      </div>
    </>
  )
}
