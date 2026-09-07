import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpen, Camera, Heart, Receipt, ScanFace, Sparkles, Users, Wifi, Zap } from 'lucide-react'
import { useAuth } from '../auth.jsx'
import GoogleSignInButton from '../GoogleSignInButton.jsx'
import PasswordStrength from '../components/ui/PasswordStrength.jsx'
import PasswordInput from '../components/ui/PasswordInput.jsx'

const GOOGLE_ENABLED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID || "603420654467-57ucc08fq5rujcmcc5cbljfc7jt6qre3.apps.googleusercontent.com")

const IMPROVE_OPTIONS = [
  { id: 'selection', label: 'Photo selection', icon: Heart },
  { id: 'ai-search', label: 'AI face search', icon: ScanFace },
  { id: 'delivery', label: 'Faster delivery', icon: Zap },
  { id: 'albums', label: 'Album approvals', icon: BookOpen },
  { id: 'billing', label: 'Billing & invoices', icon: Receipt },
  { id: 'everything', label: 'Everything above', icon: Sparkles },
]

const WAY_OPTIONS = [
  { id: 'self-serve', label: 'Guests find their own photos', icon: Camera },
  { id: 'client-picks', label: 'Clients pick favourites', icon: Users },
  { id: 'live', label: 'Live uploads during shoot', icon: Wifi },
]

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/events'
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !password) return
    setSubmitting(true)
    setError('')
    try {
      // Remember the studio's goals on this device so the product can
      // highlight the workflows they care about most.
      try {
        localStorage.setItem('pandaspot_signup_goals', JSON.stringify({ improve, ways }))
      } catch {
        // storage unavailable — signup must never fail for this
      }
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
      <form className="card auth-card auth-card-wide" onSubmit={handleSubmit}>
        <h1 className="section-title">Create your account</h1>
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

        {GOOGLE_ENABLED && (
          <>
            <div className="auth-divider"><span>continue with</span></div>
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
