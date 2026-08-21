import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { loginWithGoogle } from './api.js'
import { useAuth } from './auth.jsx'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export default function GoogleSignInButton() {
  const divRef = useRef(null)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setUserDirectly } = useAuth()

  useEffect(() => {
    if (!CLIENT_ID) return
    const scriptId = 'google-identity-services'
    function init() {
      if (!window.google || !divRef.current) return
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: async (response) => {
          try {
            const user = await loginWithGoogle(response.credential)
            setUserDirectly(user)
            navigate(searchParams.get('redirect') || '/')
          } catch {
            // Swallow — a real error surface isn't critical for this button;
            // the user can retry, and password/email login remains available.
          }
        },
      })
      window.google.accounts.id.renderButton(divRef.current, { theme: 'outline', size: 'large', width: 320 })
    }
    if (document.getElementById(scriptId)) { init(); return }
    const script = document.createElement('script')
    script.id = scriptId
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = init
    document.body.appendChild(script)
  }, [navigate, searchParams, setUserDirectly])

  if (!CLIENT_ID) return null
  return <div ref={divRef} className="google-signin-slot" />
}
