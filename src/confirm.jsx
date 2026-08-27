import { createContext, useCallback, useContext, useRef, useState } from 'react'
import Modal from './components/Modal.jsx'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null) // { message, title, confirmLabel, danger }
  const resolverRef = useRef(null)

  const confirm = useCallback((message, opts = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setState({
        message,
        title: opts.title || 'Are you sure?',
        confirmLabel: opts.confirmLabel || 'Confirm',
        danger: opts.danger ?? true,
      })
    })
  }, [])

  const settle = (result) => {
    setState(null)
    resolverRef.current?.(result)
    resolverRef.current = null
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={!!state} onClose={() => settle(false)} title={state?.title}>
        {state && (
          <>
            <p className="subtle">{state.message}</p>
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn secondary" type="button" onClick={() => settle(false)}>
                Cancel
              </button>
              <button className={`btn ${state.danger ? 'danger-btn' : ''}`} type="button" onClick={() => settle(true)}>
                {state.confirmLabel}
              </button>
            </div>
          </>
        )}
      </Modal>
    </ConfirmContext.Provider>
  )
}

/** Returns an async confirm(message, { title, confirmLabel, danger }) function
 * resolving true/false — a drop-in replacement for window.confirm(). */
export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider')
  return ctx
}
