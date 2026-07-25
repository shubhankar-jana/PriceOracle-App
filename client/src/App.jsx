import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import ScrollToTop from './components/ScrollToTop'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import OTPVerify from './pages/OTPVerify'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import AssetDetail from './pages/AssetDetail'
import Predictions from './pages/Predictions'
import Analytics from './pages/Analytics'
import Watchlist from './pages/Watchlist'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'
import About from './pages/About'
import Contact from './pages/Contact'
import FAQ from './pages/FAQ'
import Blog from './pages/Blog'
import BlogPost from './pages/BlogPost'
import Terms from './pages/Terms'
import Security from './pages/Security'

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <ScrollToTop />
        <Navbar />
        <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:id" element={<BlogPost />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/security" element={<Security />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<OTPVerify />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/asset/:symbol" element={<AssetDetail />} />
          <Route path="/predictions" element={<Predictions />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1a1a2e', color: '#e8e8f0', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', fontSize: '0.9rem' },
          success: { iconTheme: { primary: '#00e676', secondary: '#1a1a2e' } },
          error: { iconTheme: { primary: '#ff5252', secondary: '#1a1a2e' } },
        }}
      />
      </SocketProvider>
    </AuthProvider>
  )
}
