import AnimatedBackground from '../components/AnimatedBackground'

import { Link } from 'react-router-dom'
import { posts } from '../data/blogData'

export default function Blog() {
  return (
    <div className="page-wrapper">
      <AnimatedBackground />
      <div className="container" style={{ padding: '80px 24px', maxWidth: '1000px' }}>
        <div className="section-title" style={{ textAlign: 'center', marginBottom: 50 }}>
          <h2>PriceOracle <span className="text-gradient">Blog</span></h2>
          <p>Insights, updates, and deep dives into AI and trading.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {posts.map((post, i) => (
            <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="asset-category-badge">{post.category}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{post.readTime}</span>
              </div>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', margin: '8px 0' }}>{post.title}</h3>
              <p style={{ fontSize: '0.9rem', flex: 1 }}>{post.summary}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, borderTop: '1px solid var(--glass-border)', paddingTop: 16 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{post.date}</span>
                <Link to={`/blog/${post.id}`} className="btn btn-glass btn-sm">Read Article</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
