import { useParams, Link, useNavigate } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { posts } from '../data/blogData'
import AnimatedBackground from '../components/AnimatedBackground'

export default function BlogPost() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const post = posts.find(p => p.id === id)

  if (!post) {
    return (
      <div className="page-wrapper">
        <AnimatedBackground />
        <div className="container" style={{ padding: '80px 24px', textAlign: 'center' }}>
          <h2>Article not found</h2>
          <button className="btn btn-primary" onClick={() => navigate('/blog')} style={{ marginTop: 20 }}>
            <FiArrowLeft /> Back to Blog
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-wrapper">
      <AnimatedBackground />
      <div className="container" style={{ padding: '40px 24px 80px', maxWidth: '800px' }}>
        <button className="btn btn-glass btn-sm" onClick={() => navigate('/blog')} style={{ marginBottom: 30 }}>
          <FiArrowLeft /> Back to Blog
        </button>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span className="asset-category-badge">{post.category}</span>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{post.date} • {post.readTime}</span>
          </div>
          
          <h1 style={{ fontSize: '2rem', marginBottom: 20, lineHeight: 1.3 }}>{post.title}</h1>
          
          <div style={{ 
            fontSize: '0.95rem', 
            color: 'var(--text-secondary)', 
            lineHeight: 1.7,
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px' 
          }}>
            {/* Split the content by double newlines and render paragraphs/headers */}
            {post.content.trim().split('\n\n').map((paragraph, idx) => {
              if (paragraph.startsWith('###')) {
                return <h3 key={idx} style={{ color: 'var(--text-primary)', fontSize: '1.2rem', marginTop: 16, marginBottom: -8 }}>{paragraph.replace('### ', '')}</h3>
              }
              // Handle simple bold text formatting
              const formattedText = paragraph.split('**').map((text, i) => i % 2 === 1 ? <strong key={i} style={{ color: 'var(--text-primary)' }}>{text}</strong> : text)
              return <p key={idx}>{formattedText}</p>
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
