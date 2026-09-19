import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiUser, FiMail, FiLock, FiPhone, FiEye, FiEyeOff, FiTrendingUp } from 'react-icons/fi'
import { FcGoogle } from 'react-icons/fc'
import { GoogleLogin } from '@react-oauth/google'
import toast from 'react-hot-toast'
import useAuth from '../hooks/useAuth'
import AnimatedBackground from '../components/AnimatedBackground'

const rawGoogleId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const isGoogleConfigured = Boolean(
  rawGoogleId &&
  !rawGoogleId.includes('dummy') &&
  !rawGoogleId.includes('placeholder') &&
  !rawGoogleId.includes('your-google-client-id')
)

const getStrength = pw => {
  if (!pw) return null
  if (pw.length < 6) return 'weak'
  if (pw.length < 10 || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw)) return 'medium'
  return 'strong'
}

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const { register, googleLogin, loading, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      toast('You are already logged in')
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, navigate])
  const strength = getStrength(form.password)

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    if (!agreed) return toast.error('Please accept the terms')
    if (form.password !== form.confirm) return toast.error('Passwords do not match')
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters')
    const phone = form.phone.startsWith('+') ? form.phone : '+91' + form.phone.replace(/\D/g, '')
    const res = await register(form.name, form.email, phone, form.password)
    if (res.success) {
      setForm({ name: '', email: '', phone: '', password: '', confirm: '' })
      toast.success('Account created! Welcome to PriceOracle')
      navigate('/dashboard')
    } else {
      toast.error(res.message)
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    if (credentialResponse.credential) {
      const res = await googleLogin(credentialResponse.credential)
      if (res.success) {
        toast.success('Welcome to PriceOracle!')
        navigate('/dashboard')
      } else {
        toast.error(res.message)
      }
    }
  }

  const handleGoogleError = () => {
    toast.error('Google Sign-Up was unsuccessful. Please check OAuth origin settings or try email/password.')
  }

  return (
    <div className="auth-page">
      <AnimatedBackground />
      <div className="auth-card auth-card-wide">
        <div className="auth-header">
          <div className="auth-logo"><FiTrendingUp size={28} /></div>
          <h2>Create <span className="text-gradient">Account</span></h2>
          <p>Join PriceOracle and start making smarter financial decisions</p>
        </div>

        <form className="auth-form" onSubmit={submit} autoComplete="off">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div className="input-wrapper">
              <FiUser className="input-icon" />
              <input className="form-input with-icon" name="name" placeholder="Your full name" value={form.name} onChange={handle} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-wrapper">
              <FiMail className="input-icon" />
              <input className="form-input with-icon" type="email" name="email" placeholder="your@email.com" value={form.email} onChange={handle} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <div className="phone-input-wrapper">
              <div className="phone-prefix">+91</div>
              <div className="input-wrapper" style={{ flex: 1 }}>
                <FiPhone className="input-icon" />
                <input className="form-input with-icon" name="phone" placeholder="10-digit mobile number" value={form.phone} onChange={handle} required />
              </div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-wrapper">
              <FiLock className="input-icon" />
              <input className="form-input with-icon with-icon-right" type={showPw ? 'text' : 'password'} name="password" placeholder="Create a strong password" value={form.password} onChange={handle} required autoComplete="new-password" />
              <button type="button" className="input-icon-right" onClick={() => setShowPw(!showPw)}>{showPw ? <FiEyeOff /> : <FiEye />}</button>
            </div>
            {strength && (
              <div className="password-strength">
                <div className="strength-bar"><div className={`strength-fill ${strength}`} /></div>
                <div className={`strength-text ${strength}`}>
                  {strength === 'weak' ? 'Weak — add numbers & uppercase' : strength === 'medium' ? 'Medium — getting better' : 'Strong password'}
                </div>
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <div className="input-wrapper">
              <FiLock className="input-icon" />
              <input className="form-input with-icon" type="password" name="confirm" placeholder="Repeat your password" value={form.confirm} onChange={handle} required />
            </div>
          </div>
          <label className="checkbox-group">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
            I agree to the <a href="#" style={{ color: 'var(--color-purple)', margin: '0 4px' }}>Terms of Service</a> and <a href="#" style={{ color: 'var(--color-purple)' }}>Privacy Policy</a>
          </label>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <><span className="spinner-sm" /> Creating account...</> : 'Create Account'}
          </button>
        </form>

        <div style={{ margin: '20px 0 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', margin: '0 0 16px', gap: '12px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            {isGoogleConfigured ? (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="filled_black"
                shape="pill"
                text="signup_with"
              />
            ) : (
              <button
                type="button"
                className="btn-google-fallback"
                onClick={() => toast('Google Sign-Up is not configured yet. Configure VITE_GOOGLE_CLIENT_ID in .env or create an account with email/password.', { icon: 'ℹ️' })}
              >
                <FcGoogle size={18} />
                <span>Sign up with Google</span>
              </button>
            )}
          </div>
        </div>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
