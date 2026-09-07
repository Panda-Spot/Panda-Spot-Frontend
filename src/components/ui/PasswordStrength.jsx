import React from 'react'
import { Check, X } from 'lucide-react'

const rules = [
  { id: 'length', label: '8+ chars', test: value => value.length >= 8 },
  { id: 'upper', label: 'Uppercase', test: value => /[A-Z]/.test(value) },
  { id: 'lower', label: 'Lowercase', test: value => /[a-z]/.test(value) },
  { id: 'number', label: 'Number', test: value => /\d/.test(value) },
  { id: 'symbol', label: 'Symbol', test: value => /[^A-Za-z0-9]/.test(value) },
]

const levels = [
  { label: 'Too weak', color: '#F87171' },
  { label: 'Weak', color: '#FB923C' },
  { label: 'Fair', color: '#FBBF24' },
  { label: 'Strong', color: '#34D399' },
  { label: 'Excellent', color: '#22C55E' },
]

const getScore = (value) => {
  if (!value) return 0
  const passed = rules.filter(rule => rule.test(value)).length
  if (passed <= 1) return 0 // Too weak — red
  if (passed === 2) return 1 // Weak — orange
  if (passed === 3) return 2 // Fair — amber
  if (passed === 4) return 3 // Strong — emerald
  return value.length >= 12 ? 4 : 3 // all 5 rules: Excellent green at 12+ chars, else Strong
}

export default function PasswordStrength({ value = '', className = '', showRules = true }) {
  if (!value) return null

  const score = getScore(value)
  const level = levels[score]

  return (
    <div className={`mb-4 ${className}`}>
      <div className="flex items-center gap-1.5 mb-2" aria-hidden="true">
        {[0, 1, 2, 3, 4].map(index => (
          <div
            key={index}
            className="h-1.5 flex-1 rounded-full transition-all duration-300"
            style={{
              background: index <= score ? level.color : 'var(--border-subtle)',
              boxShadow: index <= score ? `0 0 12px ${level.color}33` : 'none',
            }}
          />
        ))}
        <span className="ml-2 text-[11px] font-semibold whitespace-nowrap" style={{ color: level.color }}>
          {level.label}
        </span>
      </div>

      {showRules && (
        <ul className="flex flex-col gap-1 mt-1" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {rules.map(rule => {
            const passed = rule.test(value)
            return (
              <li
                key={rule.id}
                className="flex items-center gap-2 text-xs font-medium"
                style={{ color: passed ? '#22C55E' : '#F87171' }}
              >
                {passed ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}
                {rule.label}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
