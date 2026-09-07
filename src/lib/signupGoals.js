import { BookOpen, Camera, Heart, Receipt, ScanFace, Sparkles, Users, Wifi, Zap } from 'lucide-react'

// Shared between the Register stepper and the trial-welcome onboarding
// popup (Google signups skip the Register form, so they answer there).
export const IMPROVE_OPTIONS = [
  { id: 'selection', label: 'Photo selection', icon: Heart },
  { id: 'ai-search', label: 'AI face search', icon: ScanFace },
  { id: 'delivery', label: 'Faster delivery', icon: Zap },
  { id: 'albums', label: 'Album approvals', icon: BookOpen },
  { id: 'billing', label: 'Billing & invoices', icon: Receipt },
  { id: 'everything', label: 'Everything above', icon: Sparkles },
]

export const WAY_OPTIONS = [
  { id: 'self-serve', label: 'Guests find their own photos', icon: Camera },
  { id: 'client-picks', label: 'Clients pick favourites', icon: Users },
  { id: 'live', label: 'Live uploads during shoot', icon: Wifi },
]

const GOALS_KEY = 'pandaspot_signup_goals'

export function loadSignupGoals() {
  try {
    const raw = localStorage.getItem(GOALS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

export function saveSignupGoals({ improve, ways }) {
  try {
    localStorage.setItem(GOALS_KEY, JSON.stringify({ improve: improve || '', ways: ways || [] }))
  } catch {
    // storage unavailable — goals just won't persist
  }
}
