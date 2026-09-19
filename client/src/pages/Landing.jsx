import { useState } from 'react'
import { Link } from 'react-router-dom'
import AnimatedBackground from '../components/AnimatedBackground'
import { TICKER_DATA } from '../utils/helpers'
import {
  FiTrendingUp, FiActivity, FiBell, FiShield, FiBarChart2,
  FiZap, FiMail, FiUser, FiMessageSquare, FiChevronDown, FiChevronUp, FiArrowRight
} from 'react-icons/fi'
import { posts } from '../data/blogData'
import toast from 'react-hot-toast'

const FEATURES = [
  { icon: <FiTrendingUp />, title: 'ML Price Predictions', desc: 'Random Forest, XGBoost & Linear models trained on historical price action.' },
  { icon: <FiBarChart2 />, title: 'Technical Analysis', desc: 'RSI, MACD, Bollinger Bands, EMA, ATR and 10+ indicators computed automatically.' },
  { icon: <FiZap />, title: 'Real-time Data', desc: 'Live prices updated regularly with automated push updates to your browser.' },
  { icon: <FiBell />, title: 'Smart Alerts', desc: 'Set price thresholds and receive instant notifications when your targets are hit.' },
  { icon: <FiActivity />, title: 'News Sentiment', desc: 'Sentiment scoring on financial headlines integrated into predictive features.' },
  { icon: <FiShield />, title: 'Multi-Asset Coverage', desc: 'Stocks, gold, silver, crude oil, Bitcoin, USD and major currency pairs.' },
]

const FAQS = [
  {
    q: "How accurate are the predictions?",
    a: "Our ML models generally achieve between 65% to 85% accuracy depending on the asset class and market volatility. We provide a 'Confidence Score' with every prediction so you know how strongly the model assesses a specific movement."
  },
  {
    q: "What data do you use to train the models?",
    a: "We train our models on historical OHLCV price series, momentum & volatility technical indicators (RSI, MACD, Bollinger Bands), and real-time news sentiment."
  },
  {
    q: "Is PriceOracle free to use?",
    a: "Currently, PriceOracle is completely free while in beta. Users can sign in to view predictions across all tracked markets."
  },
  {
    q: "How often are prices updated?",
    a: "Asset prices are updated continuously via real-time market data pipelines. Predictions are generated every 6 hours by our backend ML pipeline."
  },
  {
    q: "Can I trade directly on PriceOracle?",
    a: "No, PriceOracle is purely an analytics and prediction platform. We do not hold user funds or execute trades directly."
  }
]

export default function Landing() {
  const doubled = [...TICKER_DATA, ...TICKER_DATA]
  const [openFaq, setOpenFaq] = useState(null)
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' })
  const [sendingMessage, setSendingMessage] = useState(false)

  const handleContactSubmit = e => {
    e.preventDefault()
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      return toast.error('Please fill in all fields')
    }
    setSendingMessage(true)
    setTimeout(() => {
      toast.success('Message sent! Our support team will get back to you.')
      setContactForm({ name: '', email: '', message: '' })
      setSendingMessage(false)
    }, 1000)
  }

  return (
    <div className="landing">
      <AnimatedBackground />

      {/* Hero Section */}
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

      {/* Features Section */}
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

      {/* Asset Coverage Section */}
      <section className="landing-section-alt">
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ marginBottom: 12 }}>Track <span className="text-gradient">30+ Assets</span> Across Markets</h2>
          <p style={{ marginBottom: 32 }}>From US mega-caps to Indian NSE stocks, Bitcoin to gold futures</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {[
              { name: 'AAPL', icon: <FiTrendingUp size={13} /> },
              { name: 'GOOG', icon: <FiTrendingUp size={13} /> },
              { name: 'TSLA', icon: <FiTrendingUp size={13} /> },
              { name: 'MSFT', icon: <FiTrendingUp size={13} /> },
              { name: 'AMZN', icon: <FiTrendingUp size={13} /> },
              { name: 'Gold', icon: <FiBarChart2 size={13} /> },
              { name: 'Silver', icon: <FiBarChart2 size={13} /> },
              { name: 'Crude Oil', icon: <FiBarChart2 size={13} /> },
              { name: 'Bitcoin', icon: <FiZap size={13} /> },
              { name: 'USD/INR', icon: <FiActivity size={13} /> },
              { name: 'EUR/USD', icon: <FiActivity size={13} /> },
              { name: 'USD/JPY', icon: <FiActivity size={13} /> },
              { name: 'TCS.NS', icon: <FiTrendingUp size={13} /> },
              { name: 'RELIANCE.NS', icon: <FiTrendingUp size={13} /> },
              { name: 'USD Index', icon: <FiBarChart2 size={13} /> }
            ].map((a, i) => (
              <span key={i} className="badge badge-purple" style={{ padding: '8px 14px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {a.icon} {a.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* About Section (Anchor: #about) */}
      <section id="about" className="landing-section">
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div className="section-header" style={{ textAlign: 'center', marginBottom: 32 }}>
            <h2>About <span className="text-gradient">PriceOracle</span></h2>
            <p>Empowering everyday investors with institutional-grade AI analytics</p>
          </div>
          <div className="card" style={{ padding: 'clamp(20px, 4vw, 32px)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ marginBottom: 10, color: 'var(--color-purple)' }}>Our Mission</h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  At PriceOracle, our mission is to democratize institutional-grade financial analytics. We believe that everyone, from retail investors to seasoned analysts, should have access to high-accuracy, AI-driven market forecasts.
                </p>
              </div>
              <div>
                <h3 style={{ marginBottom: 10, color: 'var(--color-cyan)' }}>Predictive Technology</h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  We leverage Machine Learning models including XGBoost, Random Forests, and Linear baselines trained on years of historical market cycles. Our pipelines ingest technical momentum indicators, moving averages, and market sentiment to predict next-session price directions with statistical confidence scores.
                </p>
              </div>
              <div>
                <h3 style={{ marginBottom: 10, color: 'var(--warning)' }}>Why Choose Us</h3>
                <ul style={{ listStyle: 'disc', paddingLeft: 20, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <li><strong>Multi-Asset Support:</strong> Track stocks, crypto, commodities, and currencies from one unified terminal.</li>
                  <li><strong>Automated Retraining:</strong> Models stay fresh by continuously adapting to new market data.</li>
                  <li><strong>Clear Directional Probability:</strong> No ambiguity — get explicit direction probabilities and confidence metrics.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section (Anchor: #faq) */}
      <section id="faq" className="landing-section-alt">
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div className="section-header" style={{ textAlign: 'center', marginBottom: 32 }}>
            <h2>Frequently Asked <span className="text-gradient">Questions</span></h2>
            <p>Everything you need to know about our prediction platform</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className="card"
                style={{ padding: '18px', cursor: 'pointer', transition: 'all 0.2s ease' }}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ color: openFaq === i ? 'var(--color-purple)' : 'var(--text-primary)', margin: 0, fontSize: '0.95rem' }}>
                    {faq.q}
                  </h4>
                  <span style={{ color: 'var(--color-purple)', fontSize: '1.1rem' }}>
                    {openFaq === i ? <FiChevronUp /> : <FiChevronDown />}
                  </span>
                </div>
                {openFaq === i && (
                  <p style={{ marginTop: 12, color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.9rem' }}>
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Section (Anchor: #blog) */}
      <section id="blog" className="landing-section">
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div className="section-header" style={{ textAlign: 'center', marginBottom: 32 }}>
            <h2>Latest Insights from the <span className="text-gradient">Blog</span></h2>
            <p>Deep dives into machine learning, quantitative finance, and trading strategies</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px' }}>
            {posts.slice(0, 3).map((post, i) => (
              <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>{post.category}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{post.readTime}</span>
                  </div>
                  <h3 style={{ fontSize: '1.05rem', marginBottom: 8, color: 'var(--text-primary)' }}>{post.title}</h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{post.summary}</p>
                </div>
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{post.date}</span>
                  <Link to={`/blog/${post.id}`} className="btn btn-glass btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    Read <FiArrowRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Link to="/blog" className="btn btn-secondary">View All Blog Articles →</Link>
          </div>
        </div>
      </section>

      {/* Contact Section (Anchor: #contact) */}
      <section id="contact" className="landing-section-alt">
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div className="section-header" style={{ textAlign: 'center', marginBottom: 32 }}>
            <h2>Get In <span className="text-gradient">Touch</span></h2>
            <p>Have questions or need support? Drop us a message anytime.</p>
          </div>
          <div className="card" style={{ padding: 'clamp(20px, 5vw, 32px)' }}>
            <form className="auth-form" onSubmit={handleContactSubmit}>
              <div className="form-group">
                <label className="form-label">Your Name</label>
                <div className="input-wrapper">
                  <FiUser className="input-icon" />
                  <input
                    className="form-input with-icon"
                    name="name"
                    placeholder="Jane Doe"
                    value={contactForm.name}
                    onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-wrapper">
                  <FiMail className="input-icon" />
                  <input
                    className="form-input with-icon"
                    type="email"
                    name="email"
                    placeholder="jane@example.com"
                    value={contactForm.email}
                    onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Message</label>
                <div className="input-wrapper">
                  <FiMessageSquare className="input-icon" style={{ top: 20 }} />
                  <textarea
                    className="form-input with-icon"
                    name="message"
                    placeholder="How can we help you?"
                    rows="4"
                    value={contactForm.message}
                    onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                    required
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={sendingMessage} style={{ marginTop: 8 }}>
                {sendingMessage ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="landing-section" style={{ textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2>Ready to make <span className="text-gradient">smarter decisions</span>?</h2>
          <p style={{ margin: '16px 0 32px' }}>Join thousands of traders using AI-powered predictions to stay ahead of the market.</p>
          <Link to="/register" className="btn btn-primary btn-lg">Get Started — It's Free</Link>
        </div>
      </section>
    </div>
  )
}
