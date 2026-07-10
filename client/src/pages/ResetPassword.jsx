import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiMail, FiLock, FiKey } from 'react-icons/fi'
import toast from 'react-hot-toast'
import useAuth from '../hooks/useAuth'
import AnimatedBackground from '../components/AnimatedBackground'

export default function ResetPassword() {
  const [form, setForm] = useState({ email: localStorage.getItem('resetEmail') || '', code: '', newPassword: '', confirm: '' })
  const { resetPassword, loading } = useAuth()
  const navigate = useNavigate()
  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    if (form.newPassword !== form.confirm) return toast.error('Passwords do not match')
    if (form.newPassword.length < 6) return toast.error('Password must be at least 6 characters')
    const res = await resetPassword(form.email, form.code, form.newPassword)
    if (res.success) { toast.success('Password reset successful!'); navigate('/login') }
    else toast.error(res.message)
  }

  return (
    <div className="auth-page">
      <AnimatedBackground />
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo" style={{ fontSize: '1.8rem' }}>🔑</div>
          <h2>Reset <span className="text-gradient">Password</span></h2>
          <p>Enter the code from your email and create a new password</p>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-wrapper">
              <FiMail className="input-icon" />
              <input className="form-input with-icon" type="email" name="email" value={form.email} onChange={handle} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Verification Code</label>
            <div className="input-wrapper">
              <FiKey className="input-icon" />
              <input className="form-input with-icon" name="code" placeholder="6-digit code from email" value={form.code} onChange={handle} required maxLength={6} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <div className="input-wrapper">
              <FiLock className="input-icon" />
              <input className="form-input with-icon" type="password" name="newPassword" placeholder="Create new password" value={form.newPassword} onChange={handle} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <div className="input-wrapper">
              <FiLock className="input-icon" />
              <input className="form-input with-icon" type="password" name="confirm" placeholder="Repeat new password" value={form.confirm} onChange={handle} required />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <><span className="spinner-sm" /> Resetting...</> : 'Reset Password'}
          </button>
        </form>
        <div className="auth-footer">
          Remember it? <Link to="/login">Sign In</Link>
        </div>
      </div>
    </div>
  )
}
