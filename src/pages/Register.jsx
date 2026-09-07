import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import GoogleSignInButton from '../GoogleSignInButton.jsx'
import PasswordStrength from '../components/ui/PasswordStrength.jsx'
import PasswordInput from '../components/ui/PasswordInput.jsx'
import GoldButton from '../components/ui/GoldButton.jsx'
import { IMPROVE_OPTIONS, WAY_OPTIONS, saveSignupGoals } from '../lib/signupGoals.js'

const GOOGLE_ENABLED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID || "603420654467-57ucc08fq5rujcmcc5cbljfc7jt6qre3.apps.googleusercontent.com")

const STEPS = ['Goals', 'Workflow', 'Account']

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/dashboard'
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [improve, setImprove] = useState('')
  const [ways, setWays] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const toggleWay = (id) => {
    setWays((prev) => (prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]))
  }

  const skipToAccount = () => {
    setError('')
    setStep(3)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !password) return
    setSubmitting(true)
    setError('')
    try {
      // Remember the studio's goals on this device so the product can
      // highlight the workflows they care about most.
      saveSignupGoals({ improve, ways })
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
      <div className="card auth-card auth-card-wide">
        <h1 className="section-title">Create your account</h1>

        <div className="signup-steps" aria-label="Signup progress">
          {STEPS.map((label, i) => (
            <div key={label} className="signup-step" data-active={step === i + 1} data-done={step > i + 1}>
              <span className="signup-step-dot">{step > i + 1 ? '✓' : i + 1}</span>
              <span className="signup-step-label">{label}</span>
            </div>
          ))}
        </div>

        {step === 1 && (
          <>
            <p className="signup-pitch">
              Studios on PandaSpot <strong>cut post-shoot busywork</strong> — no more sorting thousands of
              photos by hand or chasing picks over WhatsApp. Tell us what matters to you:
            </p>
            <p className="goal-question">What do you want to improve most?</p>
            <div className="goal-grid" role="radiogroup" aria-label="What do you want to improve most?">
              {IMPROVE_OPTIONS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={improve === id}
                  data-selected={improve === id}
                  className="goal-card"
                  onClick={() => setImprove((prev) => (prev === id ? '' : id))}
                >
                  <span className="goal-card-icon"><Icon size={20} /></span>
                  {label}
                </button>
              ))}
            </div>
            <div className="row mt-4">
              <GoldButton className="flex-1 justify-center" onClick={() => setStep(2)}>Next</GoldButton>
              <button type="button" className="btn secondary" onClick={skipToAccount}>Skip</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="goal-question">How should it work for you?</p>
            <p className="goal-question-sub">Pick any — we&apos;ll set up your first event around it.</p>
            <div className="goal-grid" role="group" aria-label="How should it work for you?">
              {WAY_OPTIONS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="checkbox"
                  aria-checked={ways.includes(id)}
                  data-selected={ways.includes(id)}
                  className="goal-card"
                  onClick={() => toggleWay(id)}
                >
                  <span className="goal-card-icon"><Icon size={20} /></span>
                  {label}
                </button>
              ))}
            </div>
            <div className="row mt-4">
              <button type="button" className="btn secondary" onClick={() => setStep(1)}>Back</button>
              <GoldButton className="flex-1 justify-center" onClick={() => setStep(3)}>Next</GoldButton>
              <button type="button" className="btn secondary" onClick={skipToAccount}>Skip</button>
            </div>
          </>
        )}

        {step === 3 && (
          <form onSubmit={handleSubmit}>
            {GOOGLE_ENABLED && (
              <>
                <GoogleSignInButton />
                <div className="auth-divider"><span>or create with email</span></div>
              </>
            )}

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
            <PasswordInput
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <PasswordStrength value={password} />

            {error && <p className="error">{error}</p>}

            <button className="btn auth-submit" type="submit" disabled={submitting || !name.trim() || !email.trim() || !password}>
              {submitting ? 'Creating account…' : 'Create account'}
            </button>

            <div className="row mt-4">
              <button type="button" className="btn secondary" onClick={() => setStep(2)}>Back</button>
            </div>

            <p className="hint auth-switch">
              Already have an account?{' '}
              <Link to={searchParams.get('redirect') ? `/login?redirect=${encodeURIComponent(searchParams.get('redirect'))}` : '/login'}>
                Log in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
