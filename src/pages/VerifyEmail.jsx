import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { confirmEmailVerification } from '../api.js'

export default function VerifyEmail() {
  const { token } = useParams()
  const [status, setStatus] = useState('pending') // 'pending' | 'done' | 'error'
  const [error, setError] = useState('')

  useEffect(() => {
    confirmEmailVerification(token)
      .then(() => setStatus('done'))
      .catch((e) => { setError(e.message); setStatus('error') })
  }, [token])

  if (status === 'pending') return <p className="hint">Verifying your email…</p>
  if (status === 'error') return <p className="error">{error}</p>

  return (
    <div className="card">
      <h1 className="section-title">Email verified</h1>
      <p className="subtle">Thanks — your email address is confirmed.</p>
      <Link className="btn" to="/">Go to dashboard</Link>
    </div>
  )
}
