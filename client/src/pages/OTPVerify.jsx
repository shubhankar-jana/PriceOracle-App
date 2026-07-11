import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import useAuth from '../hooks/useAuth'
import AnimatedBackground from '../components/AnimatedBackground'

export default function OTPVerify() {
  const [otp, setOtp] = useState(Array(6).fill(''))
  const [seconds, setSeconds] = useState(120)
  const refs = useRef([])
  const { verifyOTP, loading } = useAuth()
  const navigate = useNavigate()
  const phone = localStorage.getItem('pendingPhone') || 'your phone'

  useEffect(() => {
    const t = setInterval(() => setSeconds(s => s > 0 ? s - 1 : 0), 1000)
    return () => clearInterval(t)
  }, [])

  const handleChange = (i, val) => {
    if (!/^\d*$/.test(val)) return
    const next = [...otp]
    next[i] = val.slice(-1)
    setOtp(next)
    if (val && i < 5) refs.current[i + 1]?.focus()
    if (next.every(d => d) && next.join('').length === 6) {
      submitOTP(next.join(''))
    }
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) refs.current[i - 1]?.focus()
  }

  const submitOTP = async (code) => {
    const res = await verifyOTP(phone, code || otp.join(''))
    if (res.success) { toast.success('Phone verified! Welcome 🎉'); navigate('/dashboard') }
    else toast.error(res.message)
  }

  const resend = async () => {
    setSeconds(120)
    toast.success('OTP resent!')
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <div className="auth-page">
      <AnimatedBackground />
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo" style={{ fontSize: '1.8rem' }}>📱</div>
          <h2>Verify <span className="text-gradient">Your Phone</span></h2>
          <p>We sent a 6-digit code to <strong style={{ color: 'var(--text-primary)' }}>{phone}</strong></p>
        </div>
        <div className="otp-wrapper" style={{ margin: '8px 0 16px' }}>
          {otp.map((digit, i) => (
            <input key={i} ref={el => refs.current[i] = el} className={`otp-input${digit ? ' filled' : ''}`}
              type="text" inputMode="numeric" maxLength={1} value={digit}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)} />
          ))}
        </div>
        <div className="otp-timer">
          {seconds > 0 ? <>Code expires in <span>{mm}:{ss}</span></> : <span style={{ color: 'var(--danger)' }}>Code expired</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
          <button className="btn btn-primary btn-block" onClick={() => submitOTP()} disabled={loading || otp.join('').length < 6}>
            {loading ? <><span className="spinner-sm" /> Verifying...</> : 'Verify OTP'}
          </button>
          <button className="btn btn-glass btn-block" onClick={resend} disabled={seconds > 0}>
            {seconds > 0 ? `Resend in ${mm}:${ss}` : 'Resend OTP'}
          </button>
        </div>
      </div>
    </div>
  )
}
