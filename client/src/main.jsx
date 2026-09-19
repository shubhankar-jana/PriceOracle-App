import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App.jsx'
import './App.css'

const rawGoogleId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const isGoogleConfigured = Boolean(
  rawGoogleId &&
  !rawGoogleId.includes('dummy') &&
  !rawGoogleId.includes('placeholder') &&
  !rawGoogleId.includes('your-google-client-id')
)
const googleClientId = isGoogleConfigured ? rawGoogleId : 'priceoracle-oauth-placeholder.apps.googleusercontent.com'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GoogleOAuthProvider>
  </StrictMode>,
)
