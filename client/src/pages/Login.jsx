import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi'
import toast from 'react-hot-toast'
import useAuth from '../hooks/useAuth'
import AnimatedBackground from '../components/AnimatedBackground'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const { login, loading, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // If the user is already logged in (same browser session), redirect silently
  // Use a ref so this only runs once on mount, without causing re-renders
  const redirectedRef = useRef(false)
  if (isAuthenticated && !redirectedRef.current) {
    redirectedRef.current = true
    // Use setTimeout so React finishes rendering before navigating
    setTimeout(() => navigate('/dashboard', { replace: true }), 0)
  }

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    if (!form.email || !form.password) return toast.error('Please fill all fields')
    const res = await login(form.email, form.password)
    if (res.success) {
      toast.success('Welcome back! 🎉')
      navigate('/dashboard', { replace: true })
    } else {
      toast.error(res.message || 'Login failed. Please check your credentials.')
    }
  }

  return (
    <div className="auth-page">
      <AnimatedBackground />
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">📈</div>
          <h2>Welcome <span className="text-gradient">Back</span></h2>
          <p>Sign in to access your predictions dashboard</p>
        </div>
        <form className="auth-form" onSubmit={submit} autoComplete="off">
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-wrapper">
              <FiMail className="input-icon" />
              <input
                className="form-input with-icon"
                type="email"
                name="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={handle}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-wrapper">
              <FiLock className="input-icon" />
              <input
                className="form-input with-icon with-icon-right"
                type={showPw ? 'text' : 'password'}
                name="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handle}
                required
                autoComplete="current-password"
              />
              <button type="button" className="input-icon-right" onClick={() => setShowPw(!showPw)}>
                {showPw ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Link to="/forgot-password" style={{ fontSize: '0.85rem', color: 'var(--color-purple)' }}>
              Forgot Password?
            </Link>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <><span className="spinner-sm" /> Signing in...</> : 'Sign In'}
          </button>
        </form>
        <div className="auth-footer">
          Don't have an account? <Link to="/register">Create one free</Link>
        </div>
      </div>
    </div>
  )
}
