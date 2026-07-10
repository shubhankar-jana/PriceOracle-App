import { useState } from 'react'
import AnimatedBackground from '../components/AnimatedBackground'

const faqs = [
  {
    q: "How accurate are the predictions?",
    a: "Our ML models generally achieve between 65% to 85% accuracy depending on the asset class and market volatility. We provide a 'Confidence Score' with every prediction so you know how strongly the model feels about a specific movement."
  },
  {
    q: "What data do you use to train the models?",
    a: "We use historical price data (OHLCV), technical indicators (RSI, MACD, Bollinger Bands), macroeconomic data, and real-time news sentiment analysis to train our prediction engines."
  },
  {
    q: "Is PriceOracle free to use?",
    a: "Currently, PriceOracle is completely free while in beta. We plan to introduce premium tiers for high-frequency predictions and API access in the future."
  },
  {
    q: "How often are prices updated?",
    a: "Asset prices are updated in real-time via Socket.IO connections. Predictions are generated every 6 hours by our backend ML pipeline."
  },
  {
    q: "Can I trade directly on PriceOracle?",
    a: "No, PriceOracle is purely an analytics and prediction platform. We do not hold user funds or execute trades. You should use your preferred brokerage to execute trades based on our insights."
  }
]

export default function FAQ() {
  const [open, setOpen] = useState(null)

  return (
    <div className="page-wrapper">
      <AnimatedBackground />
      <div className="container" style={{ padding: '80px 24px', maxWidth: '800px' }}>
        <div className="section-title" style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2>Frequently Asked <span className="text-gradient">Questions</span></h2>
          <p>Everything you need to know about PriceOracle.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {faqs.map((faq, i) => (
            <div key={i} className="card" style={{ padding: '20px', cursor: 'pointer' }} onClick={() => setOpen(open === i ? null : i)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ color: open === i ? 'var(--color-purple)' : 'var(--text-primary)', margin: 0, transition: 'var(--transition)' }}>{faq.q}</h4>
                <span style={{ fontSize: '1.2rem', color: 'var(--color-purple)' }}>{open === i ? '−' : '+'}</span>
              </div>
              {open === i && (
                <p style={{ marginTop: 16, color: 'var(--text-secondary)', animation: 'fadeIn 0.3s ease' }}>
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
