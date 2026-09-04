import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { confirmPasswordReset } from '../api.js'
import PasswordStrength from '../components/ui/PasswordStrength.jsx'

export default function ResetPassword() {
  const { token } = useParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError("Passwords don't match"); return }
    setSubmitting(true)
    setError('')
    try {
      await confirmPasswordReset(token, password)
      setDone(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <h1 className="section-title">Set a new password</h1>
        {done ? (
          <>
            <p className="subtle">Your password has been updated.</p>
            <Link className="btn auth-submit" to="/login">Log in</Link>
          </>
        ) : (
          <>
            <label className="field-label" htmlFor="password">New password</label>
            <input id="password" className="text-input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <PasswordStrength value={password} />
            <label className="field-label" htmlFor="confirm">Confirm password</label>
            <input id="confirm" className="text-input" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            {error && <p className="error">{error}</p>}
            <button className="btn auth-submit" type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Set new password'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}
