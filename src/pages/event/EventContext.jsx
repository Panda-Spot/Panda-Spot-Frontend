import { createContext, useContext } from 'react'

// Shared state for everything inside one event (see EventWorkspace.jsx,
// which provides the value). Section pages under /events/:eventId/* read
// what they need from here instead of each fetching the event themselves.
const EventContext = createContext(null)

export function useEvent() {
  const ctx = useContext(EventContext)
  if (!ctx) throw new Error('useEvent must be used inside an event route')
  return ctx
}

export default EventContext
