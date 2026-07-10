import { Link } from 'react-router-dom'
import AnimatedBackground from '../components/AnimatedBackground'

export default function NotFound() {
  return (
    <div className="not-found">
      <AnimatedBackground />
      <div className="not-found-code">404</div>
      <h2>Page Not Found</h2>
      <p>The page you're looking for doesn't exist or has been moved. Let's get you back on track.</p>
      <Link to="/" className="btn btn-primary btn-lg">← Back to Home</Link>
    </div>
  )
}
