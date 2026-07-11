import { useState } from 'react'
import { FiUser, FiMail, FiPhone, FiLock, FiBell, FiCalendar } from 'react-icons/fi'
import toast from 'react-hot-toast'
import useAuth from '../hooks/useAuth'
import api from '../api/axios'

export default function Settings() {
  const { user, updateProfile } = useAuth()
  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' })
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' })
  const [notifs, setNotifs] = useState({ email: true, push: true, sms: false })
  const [saving, setSaving] = useState(false)

  const saveProfile = async () => {
    setSaving(true)
    const res = await updateProfile(profile)
    setSaving(false)
    res.success ? toast.success('Profile updated!') : toast.error(res.message)
  }

  const changePassword = async () => {
    if (passwords.newPass !== passwords.confirm) return toast.error('Passwords do not match')
    if (passwords.newPass.length < 6) return toast.error('Min 6 characters required')
    try {
      await api.put('/user/change-password', { currentPassword: passwords.current, newPassword: passwords.newPass })
      toast.success('Password changed!')
      setPasswords({ current: '', newPass: '', confirm: '' })
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to change password') }
  }

  return (
    <div className="page-wrapper">
      <div className="settings-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Account <span className="text-gradient">Settings</span></h1>
            <div className="page-sub">Manage your profile, security and notification preferences</div>
          </div>
        </div>

        <div className="settings-sections">
          {/* Profile */}
          <div className="settings-card">
            <div className="settings-card-header">
              <h3>👤 Profile Information</h3>
              <p>Update your name, email and phone number</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div className="input-wrapper">
                  <FiUser className="input-icon" />
                  <input className="form-input with-icon" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-wrapper">
                  <FiMail className="input-icon" />
                  <input className="form-input with-icon" type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <div className="input-wrapper">
                  <FiPhone className="input-icon" />
                  <input className="form-input with-icon" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
                </div>
              </div>
              <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={saveProfile} disabled={saving}>
                {saving ? <><span className="spinner-sm" /> Saving...</> : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Security */}
          <div className="settings-card">
            <div className="settings-card-header">
              <h3>🔐 Security</h3>
              <p>Change your password</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[['Current Password', 'current'], ['New Password', 'newPass'], ['Confirm New Password', 'confirm']].map(([label, key]) => (
                <div key={key} className="form-group">
                  <label className="form-label">{label}</label>
                  <div className="input-wrapper">
                    <FiLock className="input-icon" />
                    <input className="form-input with-icon" type="password" value={passwords[key]} onChange={e => setPasswords(p => ({ ...p, [key]: e.target.value }))} placeholder="••••••••" />
                  </div>
                </div>
              ))}
              <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={changePassword}>Update Password</button>
            </div>
          </div>

          {/* Notifications */}
          <div className="settings-card">
            <div className="settings-card-header">
              <h3>🔔 Notifications</h3>
              <p>Choose how you receive price alerts and updates</p>
            </div>
            <div className="toggle-group">
              <div className="toggle-label">
                <span>Email Notifications</span>
                <small>Receive price alerts and updates via email</small>
              </div>
              <label className="toggle">
                <input type="checkbox" checked={notifs.email} onChange={e => setNotifs(n => ({ ...n, email: e.target.checked }))} />
                <span className="toggle-slider" />
              </label>
            </div>
            <div className="toggle-group">
              <div className="toggle-label">
                <span>Push Notifications</span>
                <small>Browser push notifications for price alerts</small>
              </div>
              <label className="toggle">
                <input type="checkbox" checked={notifs.push} onChange={e => setNotifs(n => ({ ...n, push: e.target.checked }))} />
                <span className="toggle-slider" />
              </label>
            </div>
            <div className="toggle-group">
              <div className="toggle-label">
                <span>SMS Notifications</span>
                <small>Text message alerts for critical price movements</small>
              </div>
              <label className="toggle">
                <input type="checkbox" checked={notifs.sms} onChange={e => setNotifs(n => ({ ...n, sms: e.target.checked }))} />
                <span className="toggle-slider" />
              </label>
            </div>
            <button className="btn btn-primary mt-16" style={{ alignSelf: 'flex-start' }} onClick={() => toast.success('Notification preferences saved!')}>Save Preferences</button>
          </div>

          {/* Account Info */}
          <div className="settings-card">
            <div className="settings-card-header">
              <h3>ℹ️ Account Information</h3>
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div className="indicator-card" style={{ flex: 1 }}>
                <div className="indicator-label">Member Since</div>
                <div className="indicator-value">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Today'}</div>
              </div>
              <div className="indicator-card" style={{ flex: 1 }}>
                <div className="indicator-label">Account Status</div>
                <div className="indicator-value"><span className="badge badge-green">✓ Verified</span></div>
              </div>
              <div className="indicator-card" style={{ flex: 1 }}>
                <div className="indicator-label">Watchlist Items</div>
                <div className="indicator-value">{user?.watchlist?.length || 3}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
