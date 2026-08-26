import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../theme.jsx'

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      className={`sidebar-footer-btn theme-toggle ${className}`}
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      <span className="sidebar-footer-btn-label">{isDark ? 'Light mode' : 'Dark mode'}</span>
    </button>
  )
}
