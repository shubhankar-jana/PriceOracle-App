import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiMail, FiArrowLeft, FiCopy, FiCheck } from 'react-icons/fi'
import toast from 'react-hot-toast'
import useAuth from '../hooks/useAuth'
import AnimatedBackground from '../components/AnimatedBackground'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [resetCode, setResetCode] = useState(null)
  const [copied, setCopied] = useState(false)
  const { forgotPassword, loading } = useAuth()
  const navigate = useNavigate()

  const submit = async e => {
    e.preventDefault()
    if (!email) return toast.error('Enter your email address')
    const res = await forgotPassword(email)
    if (res.success) {
      // Backend returns the reset code directly in the response
      const code = res.data?.resetCode
      if (code) {
        setResetCode(code)
        toast.success('Reset code generated!')
      } else {
        // Email not found (server hides it) — still navigate to reset page
        toast.success('If that email is registered, proceed to reset password')
        navigate('/reset-password')
      }
    } else {
      toast.error(res.message)
    }
  }

  const copyCode = () => {
    navigator.clipboard.writeText(resetCode)
    setCopied(true)
    toast.success('Code copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="auth-page">
      <AnimatedBackground />
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo" style={{ fontSize: '1.8rem' }}>🔐</div>
          <h2>Forgot <span className="text-gradient">Password?</span></h2>
          <p>Enter your email to get a reset code</p>
        </div>

        {!resetCode ? (
          <>
            <form className="auth-form" onSubmit={submit}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-wrapper">
                  <FiMail className="input-icon" />
                  <input className="form-input with-icon" type="email" placeholder="your@email.com"
                    value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? <><span className="spinner-sm" /> Generating code...</> : 'Get Reset Code'}
              </button>
            </form>
            <div className="auth-footer">
              <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', color: 'var(--text-muted)' }}>
                <FiArrowLeft /> Back to Login
              </Link>
            </div>
          </>
        ) : (
          /* Show the reset code directly on screen */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 8 }}>
            <div style={{ background: 'rgba(102,126,234,0.08)', border: '1px solid rgba(102,126,234,0.25)', borderRadius: 'var(--radius)', padding: 24, textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>Your password reset code:</p>
              <div style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '0.4em', color: 'var(--text-primary)', fontFamily: 'monospace', marginBottom: 16 }}>
                {resetCode}
              </div>
              <button className="btn btn-glass btn-sm" onClick={copyCode} style={{ gap: 6 }}>
                {copied ? <FiCheck /> : <FiCopy />} {copied ? 'Copied!' : 'Copy Code'}
              </button>
              <p style={{ fontSize: '0.8rem', color: 'var(--warning)', marginTop: 14 }}>⏱ Expires in 10 minutes</p>
            </div>
            <button className="btn btn-primary btn-block" onClick={() => navigate('/reset-password')}>
              Continue to Reset Password →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
