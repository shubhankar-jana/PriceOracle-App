import { Link } from 'react-router-dom'
import { FiGithub, FiLinkedin, FiInstagram, FiFacebook } from 'react-icons/fi'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div className="logo-icon" style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>📈</div>
            <span style={{ fontSize: '1.2rem', fontWeight: 800 }} className="text-gradient">PriceOracle</span>
          </div>
          <p>AI-powered multi-asset price prediction platform. Analyze stocks, commodities, crypto, and currencies with advanced ML models.</p>
          <div className="footer-social">
            <a href="https://github.com/shubhankar-jana" className="social-icon" aria-label="GitHub"><FiGithub /></a>
            <a href="https://www.linkedin.com/in/shubhankar-jana" className="social-icon" aria-label="LinkedIn"><FiLinkedin /></a>
            <a href="#" className="social-icon" aria-label="Instagram"><FiInstagram /></a>
            <a href="https://www.facebook.com/profile.php?id=100074474074075&locale=hi_IN" className="social-icon" aria-label="Facebook"><FiFacebook /></a>
          </div>
        </div>

        <div className="footer-col">
          <h4>Product</h4>
          <ul>
            <li><Link to="/dashboard">Dashboard</Link></li>
            <li><Link to="/predictions">Predictions</Link></li>
            <li><Link to="/analytics">Analytics</Link></li>
            <li><Link to="/watchlist">Watchlist</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Company</h4>
          <ul>
            <li><Link to="/about">About</Link></li>
            <li><Link to="/contact">Contact</Link></li>
            <li><Link to="/faq">FAQ</Link></li>
            <li><Link to="/blog">Blog</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Legal & Account</h4>
          <ul>
            <li><Link to="/terms">Terms of Service</Link></li>
            <li><Link to="/security">Security Policy</Link></li>
            <li><Link to="/login">Login / Register</Link></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2026 PriceOracle. All rights reserved.</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          Built with ❤️ | Powered by ML
        </span>
      </div>
    </footer>
  )
}
