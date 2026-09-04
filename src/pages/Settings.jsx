import { useState } from 'react'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { useAuth } from '../auth.jsx'
import { adminResetAccountPassword, adminUnlockAccount, changePassword } from '../api.js'
import { useToast } from '../toast.jsx'
import { useShutterNavigate } from '../context/ShutterContext.jsx'
import GlassCard from '../components/ui/GlassCard.jsx'
import GoldButton from '../components/ui/GoldButton.jsx'
import GoldInput from '../components/ui/GoldInput.jsx'

// Shared account page (all authenticated roles): password tab for everyone,
// plus a Super-Admin-only Accounts tab with unlock/reset tools for any
// account in the system — the administrative account-recovery console.
// (Studio-Verse identifies accounts by username; PandaSpot accounts are
// email-identified, so both tools take an email address instead.)
export default function Settings() {
  const { user, logout } = useAuth()
  const { showToast } = useToast()
  const shutterNavigate = useShutterNavigate()
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const [tab, setTab] = useState('password')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changing, setChanging] = useState(false)

  const [unlockEmail, setUnlockEmail] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [resetting, setResetting] = useState(false)

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', { type: 'error' })
      return
    }
    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters', { type: 'error' })
      return
    }
    setChanging(true)
    try {
      const res = await changePassword(currentPassword, newPassword)
      showToast(res.message || 'Password changed successfully. Please log in again.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      // Our own token was blocklisted server-side — drop it and re-login.
      try { await logout() } catch {
        // logout clears local state even if the server call fails
      }
      shutterNavigate('/login')
    } catch (err) {
      showToast(err.message, { type: 'error' })
    } finally {
      setChanging(false)
    }
  }

  const handleUnlock = async (e) => {
    e.preventDefault()
    if (!unlockEmail.trim()) return
    setUnlocking(true)
    try {
      const res = await adminUnlockAccount(unlockEmail.trim())
      showToast(res.message || 'Account unlocked')
      setUnlockEmail('')
    } catch (err) {
      showToast(err.message, { type: 'error' })
    } finally {
      setUnlocking(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    if (!resetEmail.trim() || resetPassword.length < 8) {
      showToast('Enter an email and a new password of at least 8 characters', { type: 'error' })
      return
    }
    setResetting(true)
    try {
      const res = await adminResetAccountPassword(resetEmail.trim(), resetPassword)
      showToast(res.message || 'Password reset')
      setResetEmail('')
      setResetPassword('')
    } catch (err) {
      showToast(err.message, { type: 'error' })
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          Signed in as <strong>{user?.email || '…'}</strong>
        </p>
      </div>

      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-elevated)' }}>
        {[
          { key: 'password', label: 'Password', icon: KeyRound },
          ...(isSuperAdmin ? [{ key: 'accounts', label: 'Accounts', icon: ShieldCheck }] : []),
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className="px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
            style={{
              background: tab === key ? 'var(--bg-surface)' : 'transparent',
              color: tab === key ? '#F59E0B' : 'var(--text-secondary)',
            }}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {tab === 'password' && (
        <GlassCard hover={false} className="max-w-md">
          <div className="guest-link-label">Change password</div>
          <p className="hint">Changing your password logs you out everywhere else.</p>
          <form onSubmit={handleChangePassword} className="mt-2">
            <GoldInput label="Current password" name="cur-pass" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            <GoldInput label="New password (min 8 characters)" name="new-pass" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <GoldInput label="Confirm new password" name="confirm-pass" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            <GoldButton type="submit" loading={changing} className="w-full justify-center">
              Change password
            </GoldButton>
          </form>
        </GlassCard>
      )}

      {tab === 'accounts' && isSuperAdmin && (
        <div className="grid md:grid-cols-2 gap-4">
          <GlassCard hover={false}>
            <div className="guest-link-label">Unlock account</div>
            <p className="hint">Clear the lockout on an account frozen by too many failed logins.</p>
            <form onSubmit={handleUnlock} className="mt-2">
              <GoldInput label="Account email" name="unlock-email" type="email" value={unlockEmail} onChange={(e) => setUnlockEmail(e.target.value)} />
              <GoldButton type="submit" loading={unlocking} className="w-full justify-center">
                Unlock account
              </GoldButton>
            </form>
          </GlassCard>

          <GlassCard hover={false}>
            <div className="guest-link-label">Reset password</div>
            <p className="hint">Force-set a new password for any account (also clears its lockout).</p>
            <form onSubmit={handleReset} className="mt-2">
              <GoldInput label="Account email" name="reset-email" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
              <GoldInput label="New password (min 8 characters)" name="reset-pass" type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} />
              <GoldButton type="submit" loading={resetting} className="w-full justify-center">
                Reset password
              </GoldButton>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  )
}
