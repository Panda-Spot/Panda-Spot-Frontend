import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './auth.jsx'
import { ThemeProvider } from './theme.jsx'
import { ToastProvider } from './toast.jsx'
import { ConfirmProvider } from './confirm.jsx'
import { initSmoothScroll } from './lib/lenisSmoothScroll.js'
import GlobalLoader from './components/ui/GlobalLoader.jsx'

// Buttery inertial page scrolling (singleton, no-ops for reduced motion).
initSmoothScroll({ lerp: 0.15, wheelMultiplier: 1.0 })

function Root() {
  const [booted, setBooted] = useState(false)
  useEffect(() => { setBooted(true) }, [])
  if (!booted) return <GlobalLoader />
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              <App />
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
