import { useState } from 'react'
import { FiMail, FiUser, FiMessageSquare } from 'react-icons/fi'
import toast from 'react-hot-toast'
import AnimatedBackground from '../components/AnimatedBackground'

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [loading, setLoading] = useState(false)

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = e => {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) return toast.error('Please fill all fields')
    setLoading(true)
    setTimeout(() => {
      toast.success('Message sent! We will get back to you shortly.')
      setForm({ name: '', email: '', message: '' })
      setLoading(false)
    }, 1500)
  }

  return (
    <div className="page-wrapper">
      <AnimatedBackground />
      <div className="container" style={{ padding: '80px 24px', maxWidth: '600px' }}>
        <div className="card">
          <div className="section-title text-center" style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2>Get In <span className="text-gradient">Touch</span></h2>
            <p>Have questions? Our support team is here to help.</p>
          </div>
          
          <form className="auth-form" onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Your Name</label>
              <div className="input-wrapper">
                <FiUser className="input-icon" />
                <input className="form-input with-icon" name="name" placeholder="John Doe" value={form.name} onChange={handle} required />
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-wrapper">
                <FiMail className="input-icon" />
                <input className="form-input with-icon" type="email" name="email" placeholder="your@email.com" value={form.email} onChange={handle} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Message</label>
              <div className="input-wrapper">
                <FiMessageSquare className="input-icon" style={{ top: 24 }} />
                <textarea className="form-input with-icon" name="message" placeholder="How can we help you?" value={form.message} onChange={handle} required rows="5" style={{ resize: 'vertical' }}></textarea>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: 10 }}>
              {loading ? <><span className="spinner-sm" /> Sending...</> : 'Send Message'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
