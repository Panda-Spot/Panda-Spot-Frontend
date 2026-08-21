import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../api.js'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitting(true)
    setError('')
    try {
      await requestPasswordReset(email.trim())
      setSent(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <h1 className="section-title">Reset your password</h1>
        {sent ? (
          <p className="subtle">If an account exists for that email, a reset link is on its way.</p>
        ) : (
          <>
            <p className="subtle">Enter your email and we'll send a link to reset your password.</p>
            <label className="field-label" htmlFor="email">Email</label>
            <input id="email" className="text-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {error && <p className="error">{error}</p>}
            <button className="btn auth-submit" type="submit" disabled={submitting || !email.trim()}>
              {submitting ? 'Sending…' : 'Send reset link'}
            </button>
          </>
        )}
        <p className="hint auth-switch"><Link to="/login">Back to log in</Link></p>
      </form>
    </div>
  )
}
