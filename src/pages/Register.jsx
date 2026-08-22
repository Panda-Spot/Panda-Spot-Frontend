import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import GoogleSignInButton from '../GoogleSignInButton.jsx'

const GOOGLE_ENABLED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID || "603420654467-57ucc08fq5rujcmcc5cbljfc7jt6qre3.apps.googleusercontent.com")

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !password) return
    setSubmitting(true)
    setError('')
    try {
      await register(email.trim(), password, name.trim())
      navigate(redirectTo)
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-wordmark">PandaSpot</div>
      <form className="card auth-card" onSubmit={handleSubmit}>
        <h1 className="section-title">Create your account</h1>
        <p className="subtle">Set up PandaSpot for your photography business — create events, upload galleries, and let guests spot themselves.</p>

        <label className="field-label" htmlFor="name">Name</label>
        <input
          id="name"
          className="text-input"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label className="field-label" htmlFor="email">Email</label>
        <input
          id="email"
          className="text-input"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="field-label" htmlFor="password">Password</label>
        <input
          id="password"
          className="text-input"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="error">{error}</p>}

        <button className="btn auth-submit" type="submit" disabled={submitting || !name.trim() || !email.trim() || !password}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>

        {GOOGLE_ENABLED && (
          <>
            <div className="auth-divider"><span>or</span></div>
            <GoogleSignInButton />
          </>
        )}

        <p className="hint auth-switch">
          Already have an account?{' '}
          <Link to={searchParams.get('redirect') ? `/login?redirect=${encodeURIComponent(searchParams.get('redirect'))}` : '/login'}>
            Log in
          </Link>
        </p>
      </form>
    </div>
  )
}
