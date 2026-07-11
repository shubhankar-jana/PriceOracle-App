export default function Loader({ message = 'Loading...' }) {
  return (
    <div className="loader-overlay">
      <div className="loader-spinner" />
      <p className="loader-text">{message}</p>
    </div>
  )
}

export function InlineLoader() {
  return <div className="inline-loader"><div className="loader-spinner" /></div>
}
