import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function PasswordInput({
  id = 'password',
  className = 'text-input',
  value,
  onChange,
  autoComplete = 'current-password',
  placeholder,
  required,
  style,
  wrapStyle,
  ...rest
}) {
  const [show, setShow] = useState(false)

  return (
    <div className="password-input-wrap" style={wrapStyle}>
      <input
        id={id}
        className={className}
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        style={style}
        {...rest}
      />
      <button
        type="button"
        className="password-toggle-btn"
        onClick={() => setShow(s => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        title={show ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}
