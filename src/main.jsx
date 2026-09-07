import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './auth.jsx'
import { ThemeProvider } from './theme.jsx'
import { ToastProvider } from './toast.jsx'
import { ConfirmProvider } from './confirm.jsx'
import { initSmoothScroll } from './lib/lenisSmoothScroll.js'

// Buttery inertial page scrolling (singleton, no-ops for reduced motion).
initSmoothScroll({ lerp: 0.09, wheelMultiplier: 0.9 })

createRoot(document.getElementById('root')).render(
  <StrictMode>
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
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
