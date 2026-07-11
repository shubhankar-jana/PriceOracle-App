import { Link } from 'react-router-dom'
import AnimatedBackground from '../components/AnimatedBackground'
import Footer from '../components/Footer'
import { TICKER_DATA } from '../utils/helpers'
import { FiTrendingUp, FiActivity, FiBell, FiShield, FiBarChart2, FiZap } from 'react-icons/fi'

const FEATURES = [
  { icon: <FiTrendingUp />, title: 'ML Price Predictions', desc: 'Random Forest, XGBoost & Linear models trained on 5 years of historical data.' },
  { icon: <FiBarChart2 />, title: 'Technical Analysis', desc: 'RSI, MACD, Bollinger Bands, EMA, ATR and 10+ indicators computed automatically.' },
  { icon: <FiZap />, title: 'Real-time Data', desc: 'Live prices updated every hour via yfinance with Socket.IO push to your browser.' },
  { icon: <FiBell />, title: 'Smart Alerts', desc: 'Set price thresholds and receive instant notifications when your targets are hit.' },
  { icon: <FiActivity />, title: 'News Sentiment', desc: 'VADER sentiment scoring on financial headlines integrated into prediction models.' },
  { icon: <FiShield />, title: 'Multi-Asset Coverage', desc: 'Stocks, gold, silver, crude oil, Bitcoin, USD and 10 major currency pairs.' },
]

export default function Landing() {
  const doubled = [...TICKER_DATA, ...TICKER_DATA]

  return (
    <div className="landing">
      <AnimatedBackground />

      {/* Hero */}
      <section className="hero">
        <div className="hero-badge">
          <div className="badge-dot" />
          Powered by Machine Learning
        </div>
        <h1>Predict the <span className="text-gradient">Future of Finance</span></h1>
        <p>Advanced ML models analyze stocks, commodities, crypto and currencies — giving you an edge in every market, every day.</p>
        <div className="hero-cta">
          <Link to="/register" className="btn btn-primary btn-lg">Start Predicting Free</Link>
          <Link to="/login" className="btn btn-secondary btn-lg">View Dashboard →</Link>
        </div>
      </section>

      {/* Ticker Marquee */}
      <div className="ticker-bar">
        <div className="ticker-track">
          {doubled.map((t, i) => (
            <div key={i} className="ticker-item">
              <span className="ticker-symbol">{t.symbol}</span>
              <span className="ticker-price">{t.price}</span>
              <span className={t.up ? 'price-up' : 'price-down'}>{t.change}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <section className="features-section">
        <div className="section-header" style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2>Everything you need to <span className="text-gradient">trade smarter</span></h2>
          <p>A complete toolkit for data-driven financial decisions</p>
        </div>
        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Asset Coverage */}
      <section style={{ padding: '60px 24px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ marginBottom: 12 }}>Track <span className="text-gradient">30+ Assets</span> Across Markets</h2>
          <p style={{ marginBottom: 40 }}>From US mega-caps to Indian NSE stocks, Bitcoin to gold futures</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            {['📈 AAPL', '📈 GOOG', '📈 TSLA', '📈 MSFT', '📈 AMZN', '🥇 Gold', '🥈 Silver', '🛢️ Crude Oil', '₿ Bitcoin', '💱 USD/INR', '💱 EUR/USD', '💱 USD/JPY', '📈 TCS.NS', '📈 RELIANCE.NS', '📊 USD Index'].map((a, i) => (
              <span key={i} className="badge badge-purple" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>{a}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2>Ready to make <span className="text-gradient">smarter decisions</span>?</h2>
          <p style={{ margin: '16px 0 32px' }}>Join thousands of traders using AI-powered predictions to stay ahead of the market.</p>
          <Link to="/register" className="btn btn-primary btn-lg">Get Started — It's Free</Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
