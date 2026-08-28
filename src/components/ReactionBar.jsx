import { useState } from 'react'
import { Heart, Laugh, Sparkles, PartyPopper, Flame } from 'lucide-react'

const REACTIONS = [
  { type: 'heart', Icon: Heart, color: '#e0457b' },
  { type: 'laugh', Icon: Laugh, color: '#d99a2b' },
  { type: 'wow', Icon: Sparkles, color: '#7c5ce0' },
  { type: 'clap', Icon: PartyPopper, color: '#3ba8c9' },
  { type: 'fire', Icon: Flame, color: '#e0592f' },
]

let burstIdCounter = 0

// A row of 5 reaction buttons (heart/laugh/wow/clap/fire) — tapping one
// sets/switches it, tapping the same one again removes it (see
// api.js's reactToPhoto). Each tap also fires a full-screen burst of
// flying copies of that reaction, Instagram/Facebook-Live-story style.
export default function ReactionBar({ reactions = {}, myReaction, onReact, size = 14 }) {
  const [bursts, setBursts] = useState([])

  const handleClick = (type) => {
    onReact(type)
    if (myReaction === type) return // removing a reaction shouldn't also burst
    const id = burstIdCounter++
    setBursts((prev) => [...prev, { id, type }])
    setTimeout(() => setBursts((prev) => prev.filter((b) => b.id !== id)), 1600)
  }

  return (
    <>
      <div className="reaction-bar">
        {REACTIONS.map(({ type, Icon, color }) => {
          const count = reactions[type] || 0
          const active = myReaction === type
          return (
            <button
              key={type}
              type="button"
              className={active ? 'reaction-btn active' : 'reaction-btn'}
              style={active ? { color } : undefined}
              onClick={() => handleClick(type)}
              aria-label={`React with ${type}`}
            >
              <Icon size={size} fill={active ? 'currentColor' : 'none'} />
              {count > 0 && <span>{count}</span>}
            </button>
          )
        })}
      </div>
      {bursts.map((b) => (
        <ReactionBurst key={b.id} type={b.type} />
      ))}
    </>
  )
}

function ReactionBurst({ type }) {
  const { Icon, color } = REACTIONS.find((r) => r.type === type)
  const particles = Array.from({ length: 14 })
  return (
    <div className="reaction-burst-overlay" aria-hidden="true">
      {particles.map((_, i) => {
        const left = 5 + Math.random() * 90
        const delay = Math.random() * 0.35
        const duration = 1 + Math.random() * 0.7
        const iconSize = 18 + Math.random() * 22
        return (
          <span
            key={i}
            className="reaction-burst-particle"
            style={{
              left: `${left}%`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              color,
            }}
          >
            <Icon size={iconSize} fill="currentColor" />
          </span>
        )
      })}
    </div>
  )
}
