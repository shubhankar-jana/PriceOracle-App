import AnimatedBackground from '../components/AnimatedBackground'

export default function Terms() {
  return (
    <div className="page-wrapper">
      <AnimatedBackground />
      <div className="container" style={{ padding: '80px 24px', maxWidth: '800px' }}>
        <div className="card">
          <div className="section-title text-center" style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2>Terms of <span className="text-gradient">Service</span></h2>
            <p>Last updated: July 2026</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', color: 'var(--text-secondary)' }}>
            <section>
              <h4 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>1. Acceptance of Terms</h4>
              <p>By accessing or using PriceOracle, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.</p>
            </section>

            <section>
              <h4 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>2. Financial Disclaimer</h4>
              <p>PriceOracle provides AI-driven market predictions for educational and informational purposes only. We are not registered financial advisors. Any trading decisions you make based on our predictions are entirely at your own risk. Past performance of our models does not guarantee future results.</p>
            </section>

            <section>
              <h4 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>3. User Accounts</h4>
              <p>You are responsible for safeguarding the password that you use to access the service. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.</p>
            </section>

            <section>
              <h4 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>4. Service Availability</h4>
              <p>While we strive for 99.9% uptime, we do not guarantee that our services will be uninterrupted or error-free. Data feeds from external providers may occasionally experience delays.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
