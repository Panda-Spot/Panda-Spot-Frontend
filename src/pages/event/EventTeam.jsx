import { useEffect } from 'react'
import { useEvent } from './EventContext.jsx'

export default function EventTeam() {
  const {
    event, collaborators, pendingInvites, acceptedInvites, declinedInvites,
    inviteEmail, setInviteEmail, inviting, inviteMessage, teamError,
    handleInvite, handleRemoveCollaborator, handleCancelInvite,
    setActiveTab,
  } = useEvent()

  useEffect(() => { setActiveTab('manager') }, [setActiveTab])

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Team
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          Second shooters and assistants for this event only.
        </p>
      </div>

      {event?.role !== 'owner' ? (
        <div className="card">
          <div className="guest-link-label">Team</div>
          <p className="hint">Only the event owner can manage collaborators.</p>
        </div>
      ) : (
        <div className="event-stack">
          <div className="card team-card">
            <div className="guest-link-label">Team</div>
            <p className="hint">Invite a second shooter to help with this event — they&apos;ll get their own login, scoped to this event only. They must accept the invitation before they get access.</p>

            <form className="row" onSubmit={handleInvite}>
              <input
                className="text-input"
                type="email"
                placeholder="assistant@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <button className="btn" type="submit" disabled={inviting || !inviteEmail.trim()}>
                {inviting ? 'Inviting…' : 'Invite'}
              </button>
            </form>

            {inviteMessage && <p className="hint">{inviteMessage}</p>}
            {teamError && <p className="error">{teamError}</p>}

            <ul className="team-list">
              {collaborators.map((c) => (
                <li key={c.user_id} className="team-list-item">
                  <span>{c.name} <span className="hint">({c.email})</span></span>
                  <button className="btn secondary" type="button" onClick={() => handleRemoveCollaborator(c.user_id)}>
                    Remove
                  </button>
                </li>
              ))}
              {pendingInvites.map((inv) => (
                <li key={inv.invite_id} className="team-list-item team-list-item-pending">
                  <span>{inv.email} <span className="hint">(pending)</span></span>
                  <button className="btn secondary" type="button" onClick={() => handleCancelInvite(inv.invite_id)}>
                    Cancel
                  </button>
                </li>
              ))}
              {collaborators.length === 0 && pendingInvites.length === 0 && (
                <li className="hint">No collaborators yet — invite someone above.</li>
              )}
            </ul>
          </div>

          {acceptedInvites.length > 0 && (
            <div className="card">
              <div className="guest-link-label">Accepted ({acceptedInvites.length})</div>
              <p className="hint">Invite audit — who accepted and when.</p>
              <ul className="team-list">
                {acceptedInvites.map((inv) => (
                  <li key={inv.invite_id} className="team-list-item">
                    <span>
                      {inv.email}{' '}
                      <span className="hint">
                        · invited {new Date(inv.invited_at).toLocaleString()} · accepted {new Date(inv.accepted_at).toLocaleString()}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {declinedInvites.length > 0 && (
            <div className="card">
              <div className="guest-link-label">Declined ({declinedInvites.length})</div>
              <p className="hint">Invite audit — who declined and when. Re-inviting re-opens the invite.</p>
              <ul className="team-list">
                {declinedInvites.map((inv) => (
                  <li key={inv.invite_id} className="team-list-item team-list-item-pending">
                    <span>
                      {inv.email}{' '}
                      <span className="hint">
                        · invited {new Date(inv.invited_at).toLocaleString()} · declined {new Date(inv.declined_at).toLocaleString()}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
