import AnimatedBackground from '../components/AnimatedBackground'

export default function Security() {
  return (
    <div className="page-wrapper">
      <AnimatedBackground />
      <div className="container" style={{ padding: '80px 24px', maxWidth: '800px' }}>
        <div className="card">
          <div className="section-title text-center" style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2>Security <span className="text-gradient">Policy</span></h2>
            <p>How we protect your data and privacy</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ padding: 20, background: 'rgba(102, 126, 234, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
              <h4 style={{ color: 'var(--color-cyan)', marginBottom: 8 }}>Data Encryption</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>All data transmitted between your browser and PriceOracle is encrypted using industry-standard TLS 1.3. User passwords are securely hashed using bcrypt before being stored in our database.</p>
            </div>

            <div style={{ padding: 20, background: 'rgba(102, 126, 234, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
              <h4 style={{ color: 'var(--color-purple)', marginBottom: 8 }}>No Financial Data Storage</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>PriceOracle is an analytics platform. We do not link to your bank accounts, we do not require your Social Security Number, and we do not hold your funds. If our database were ever compromised, no financial assets could be stolen.</p>
            </div>

            <div style={{ padding: 20, background: 'rgba(102, 126, 234, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
              <h4 style={{ color: 'var(--warning)', marginBottom: 8 }}>Authentication Security</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>We employ strict rate-limiting on all authentication endpoints to prevent brute-force attacks. JSON Web Tokens (JWT) are used for session management with short-lived access tokens and secure refresh mechanisms.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
