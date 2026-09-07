import { useEffect } from 'react'
import { CalendarDays, CheckCircle2, Clock, UserCheck, UserX } from 'lucide-react'
import { useEvent } from './EventContext.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import Badge from '../../components/ui/Badge.jsx'

const fmtDT = (v) => (v ? new Date(v).toLocaleString() : '—')

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
                  <Avatar name={c.name || c.email} size="sm" ring />
                  <span style={{ flex: 1 }}>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {c.name || c.email}
                    </span>{' '}
                    <span className="hint">({c.email})</span>
                    <span className="hint" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <UserCheck size={11} /> Joined {fmtDT(c.joined_at)}
                    </span>
                  </span>
                  <Badge variant="success">Active</Badge>
                  <button className="btn secondary" type="button" onClick={() => handleRemoveCollaborator(c.user_id)}>
                    Remove
                  </button>
                </li>
              ))}
              {pendingInvites.map((inv) => (
                <li key={inv.invite_id} className="team-list-item team-list-item-pending">
                  <Avatar name={inv.email} size="sm" />
                  <span style={{ flex: 1 }}>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {inv.email}
                    </span>
                    <span className="hint" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Clock size={11} /> Invited {fmtDT(inv.invited_at)} · awaiting Accept
                    </span>
                  </span>
                  <Badge variant="gold">Pending</Badge>
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
              <p className="hint">Invite audit — who accepted and exactly when.</p>
              <ul className="team-list">
                {acceptedInvites.map((inv) => (
                  <li key={inv.invite_id} className="team-list-item">
                    <Avatar name={inv.email} size="sm" />
                    <span style={{ flex: 1 }}>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {inv.email}
                      </span>
                      <span className="hint" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <CalendarDays size={11} /> Invited {fmtDT(inv.invited_at)}
                      </span>
                      <span className="hint" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <CheckCircle2 size={11} style={{ color: '#22C55E' }} /> Accepted {fmtDT(inv.accepted_at)}
                      </span>
                    </span>
                    <Badge variant="success">Accepted</Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {declinedInvites.length > 0 && (
            <div className="card">
              <div className="guest-link-label">Declined ({declinedInvites.length})</div>
              <p className="hint">Invite audit — who declined and exactly when. Re-inviting re-opens the invite.</p>
              <ul className="team-list">
                {declinedInvites.map((inv) => (
                  <li key={inv.invite_id} className="team-list-item team-list-item-pending">
                    <Avatar name={inv.email} size="sm" />
                    <span style={{ flex: 1 }}>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {inv.email}
                      </span>
                      <span className="hint" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <CalendarDays size={11} /> Invited {fmtDT(inv.invited_at)}
                      </span>
                      <span className="hint" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <UserX size={11} style={{ color: '#F87171' }} /> Declined {fmtDT(inv.declined_at)}
                      </span>
                    </span>
                    <Badge variant="error">Declined</Badge>
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
