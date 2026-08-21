import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import GoogleSignInButton from '../GoogleSignInButton.jsx'

const GOOGLE_ENABLED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID || "603420654467-57ucc08fq5rujcmcc5cbljfc7jt6qre3.apps.googleusercontent.com")

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setSubmitting(true)
    setError('')
    try {
      await login(email.trim(), password)
      navigate(redirectTo)
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <h1 className="section-title">Log in</h1>
        <p className="subtle">Welcome back — manage your events and shared galleries.</p>

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
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="error">{error}</p>}

        <button className="btn auth-submit" type="submit" disabled={submitting || !email.trim() || !password}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>

        <p className="hint auth-switch">
          <Link to="/forgot-password">Forgot password?</Link>
        </p>

        {GOOGLE_ENABLED && (
          <>
            <div className="auth-divider"><span>or</span></div>
            <GoogleSignInButton />
          </>
        )}

        <p className="hint auth-switch">
          Don't have an account?{' '}
          <Link to={searchParams.get('redirect') ? `/register?redirect=${encodeURIComponent(searchParams.get('redirect'))}` : '/register'}>
            Create one
          </Link>
        </p>
      </form>
    </div>
  )
}
