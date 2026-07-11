import AnimatedBackground from '../components/AnimatedBackground'

export default function About() {
  return (
    <div className="page-wrapper">
      <AnimatedBackground />
      <div className="container" style={{ padding: '80px 24px', maxWidth: '800px' }}>
        <div className="card">
          <div className="section-title text-center" style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2>About <span className="text-gradient">PriceOracle</span></h2>
            <p>Empowering financial decisions with artificial intelligence</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h3 style={{ marginBottom: 12, color: 'var(--color-purple)' }}>Our Mission</h3>
              <p>At PriceOracle, our mission is to democratize institutional-grade financial analytics. We believe that everyone, from retail investors to seasoned traders, should have access to highly accurate, AI-driven market predictions.</p>
            </div>
            
            <div>
              <h3 style={{ marginBottom: 12, color: 'var(--color-cyan)' }}>The Technology</h3>
              <p>We leverage state-of-the-art Machine Learning algorithms, including XGBoost, Random Forest, and deep neural networks, to analyze millions of data points across stocks, commodities, crypto, and fiat currencies in real-time. Our models analyze technical indicators, historical trends, and market sentiment to predict future price movements with high confidence.</p>
            </div>

            <div>
              <h3 style={{ marginBottom: 12, color: 'var(--warning)' }}>Why Choose Us?</h3>
              <ul style={{ listStyle: 'disc', paddingLeft: 20, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <li><strong>Multi-Asset Support:</strong> Track everything from Apple stock to Bitcoin and Gold in one unified dashboard.</li>
                <li><strong>Real-Time Analytics:</strong> Live data processing using high-speed data pipelines.</li>
                <li><strong>Actionable Insights:</strong> Clear, easy-to-understand confidence scores and directional predictions.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
