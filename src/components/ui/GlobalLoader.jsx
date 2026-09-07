/**
 * Full-screen loading placeholder shown while the app initializes.
 * Designed as a static placeholder now — animate later as needed.
 */
export default function GlobalLoader() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        background: 'var(--bg-base, #0e0e12)',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '3px solid rgba(245,158,11,0.2)',
          borderTopColor: '#F59E0B',
          animation: 'global-spin 0.8s linear infinite',
        }}
      />
      <p style={{ color: 'var(--text-tertiary, #6B6B76)', fontSize: 13, margin: 0 }}>Loading…</p>
      <style>{`@keyframes global-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
