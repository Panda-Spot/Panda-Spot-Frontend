import { useEffect, useState } from 'react'
import { Download, Heart, Lock, Search, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEvent } from './EventContext.jsx'
import { fileUrl } from '../../api.js'
import GalleryMedia from '../../components/GalleryMedia.jsx'
import StudioLightbox from '../../components/StudioLightbox.jsx'
import MemberBrowser from '../../components/gallery/MemberBrowser.jsx'

export default function Selection() {
  const {
    eventId, event, publishing, handlePublish, togglingDownload, handleAllowDownload,
    selectionMembers, handleBulkRemoveVisible, handleBulkRemoveSelected, bulking,
    handleTogglePick, studioPicks, togglingPickId,
    handlePhotoFeatureMembership, savingPhotoFeatures,
    clients, pendingClientInvites, clientInviteEmail, setClientInviteEmail,
    clientInviteCap, setClientInviteCap, clientInviteExpiry, setClientInviteExpiry,
    invitingClient, handleInviteClient,
    createEmail, setCreateEmail, createName, setCreateName,
    createPassword, setCreatePassword, createCap, setCreateCap,
    createExpiry, setCreateExpiry, creatingClient, handleCreateClientAccount,
    createClientMessage, createdClientPassword,
    clientInviteMessage, clientError, handleRemoveClient,
    expandedClient, openGrantPanel, grantCap, setGrantCap, grantExpiry, setGrantExpiry,
    savingGrant, handleSaveGrant, handleSubmitBehalf, handleUnsubmit,
    handleRevoke, handleRestoreAccess,
    eventFavourites, favView, setFavView,
    handlePicksZip, zippingPicks, picksZipProgress,
    exportClient, setExportClient, exportFormat, setExportFormat,
    handleSelectionExport, exporting,
    requestStartEvent,
    formatBytes, setActiveTab,
  } = useEvent()

  useEffect(() => { setActiveTab('selection') }, [setActiveTab])

  // Fullscreen preview: { items, index } — navigable with arrows/swipe.
  const [preview, setPreview] = useState(null)

  const canView = event?.photo_selection_enabled && (event?.role === 'owner' || event?.role === 'collaborator')

  return (
    <div>
      {event && !event.started ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Heart size={28} style={{ color: '#F59E0B' }} />
          </div>
          <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700 }}>Event not started</h3>
          <p className="hint" style={{ maxWidth: 380, margin: '0 auto 16px', lineHeight: 1.5 }}>
            Start the event to unlock Photo Selection and all other features.
          </p>
          {event.role === 'owner' ? (
            <button className="btn" type="button" onClick={requestStartEvent}>
              Start event
            </button>
          ) : (
            <p className="hint">Only the event owner can start the event.</p>
          )}
        </div>
      ) : !event?.photo_selection_enabled ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.04))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <Heart size={24} style={{ color: '#EF4444' }} />
          </div>
          <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700 }}>Photo Selection is off</h3>
          <p className="hint" style={{ maxWidth: 380, margin: '0 auto 16px', lineHeight: 1.5 }}>
            Turn it on from <Link to={`/events/${eventId}/danger`} style={{ color: '#F59E0B' }}>Features in the Danger section</Link> to invite clients and collect picks.
          </p>
          <Link className="btn secondary" to={`/events/${eventId}/danger`}>
            <Lock size={14} /> Open Danger section
          </Link>
        </div>
      ) : !canView ? (
        <div className="card">
          <div className="guest-link-label">No access</div>
          <p className="hint">Only the studio team can manage Photo Selection.</p>
        </div>
      ) : (
        <div className="event-stack">
          <div className="card">
            <div className="guest-link-label">Client gallery</div>
            <p className="hint">
              {event.published_at
                ? `Published ${new Date(event.published_at).toLocaleDateString()} — Photo Selection clients see the gallery as ready.`
                : 'Not published yet — publishing marks uploads as finished for Photo Selection clients.'}
              {' '}Guest downloads are {event.allow_download ? 'allowed' : 'turned off (view-only)'}.
            </p>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              {!event.published_at && (
                <button className="btn secondary" type="button" onClick={handlePublish} disabled={publishing}>
                  {publishing ? 'Publishing…' : 'Publish event'}
                </button>
              )}
              <label className="checkbox-row" title="When off, guests and clients can view and favourite but can't download originals">
                <input
                  type="checkbox"
                  checked={!!event.allow_download}
                  disabled={togglingDownload}
                  onChange={(e) => handleAllowDownload(e.target.checked)}
                />
                Allow downloads
              </label>
            </div>
          </div>

          <div className="card">
            <div className="guest-link-label">
              Selection members ({selectionMembers().length})
            </div>
            <p className="hint">
              Only these photos appear in client galleries. Add more from Photos &amp; Imports — remove here, one by one or in bulk with Select.
            </p>
            <MemberBrowser
              items={selectionMembers()}
              removeTargetLabel="Selection"
              emptyTitle="Nothing in Photo Selection yet"
              emptyHint="Select photos in Photos & Imports and add them."
              resultNoun="member"
              onRemoveSelected={(ids) => handleBulkRemoveSelected('selection', ids)}
              onRemoveAllVisible={() => handleBulkRemoveVisible('selection')}
              renderCard={(p, i, pageStart, searched) => (
                <div className="photo-card" key={p.photo_id}>
                  <div
                    style={{ position: 'relative', cursor: 'zoom-in' }}
                    onClick={() => setPreview({ items: searched, index: pageStart + i })}
                    title="Open fullscreen preview"
                  >
                    <GalleryMedia src={fileUrl(p.thumbnail_url || p.url)} filename={p.filename} />
                    <div className="card-overlay-actions" onClick={(e) => e.stopPropagation()}>
                      <div className="meta-actions">
                        <button
                          className="icon-btn"
                          type="button"
                          title={studioPicks.includes(p.photo_id) ? 'Remove studio pick' : 'Mark as studio pick'}
                          onClick={() => handleTogglePick(p.photo_id, studioPicks.includes(p.photo_id))}
                          disabled={togglingPickId === p.photo_id}
                          style={{ color: studioPicks.includes(p.photo_id) ? '#EF4444' : undefined }}
                        >
                          <Heart size={15} fill={studioPicks.includes(p.photo_id) ? '#EF4444' : 'none'} />
                        </button>
                        <button
                          className="icon-btn danger"
                          type="button"
                          title="Remove from Photo Selection (stays in Photos & Imports)"
                          onClick={() => handlePhotoFeatureMembership(p.photo_id, { photo_selection_visible: false })}
                          disabled={!!savingPhotoFeatures[p.photo_id]}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    <div className="card-overlay-info" title={p.filename}>
                      {p.filename}
                    </div>
                  </div>
                </div>
              )}
            />
          </div>

          <div className="card team-card">
            <div className="guest-link-label">Clients</div>
            <p className="hint">Invite a client to log in and favourite their photos from this event.</p>

            <form className="row" onSubmit={handleInviteClient} style={{ flexWrap: 'wrap' }}>
              <input
                className="text-input"
                type="email"
                placeholder="client@example.com"
                value={clientInviteEmail}
                onChange={(e) => setClientInviteEmail(e.target.value)}
              />
              <input
                className="text-input"
                type="number"
                min="1"
                placeholder="Favourite cap (optional)"
                style={{ maxWidth: 180 }}
                value={clientInviteCap}
                onChange={(e) => setClientInviteCap(e.target.value)}
              />
              <input
                className="text-input"
                type="date"
                title="Access expires (optional — per-event)"
                style={{ maxWidth: 170 }}
                value={clientInviteExpiry}
                onChange={(e) => setClientInviteExpiry(e.target.value)}
              />
              <button className="btn" type="submit" disabled={invitingClient || !clientInviteEmail.trim()}>
                {invitingClient ? 'Inviting…' : 'Invite'}
              </button>
            </form>

            {clientInviteMessage && <p className="hint">{clientInviteMessage}</p>}
            {clientError && <p className="error">{clientError}</p>}

            <div className="guest-link-label" style={{ marginTop: 14 }}>Or create their login directly</div>
            <p className="hint">
              Pick the email and password yourself and share them with the client — they log straight in,
              no invite email. Same client can be on other events with a different cap and expiry.
            </p>
            <form className="row" onSubmit={handleCreateClientAccount} style={{ flexWrap: 'wrap' }}>
              <input
                className="text-input"
                type="email"
                placeholder="client@example.com"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
              />
              <input
                className="text-input"
                type="text"
                placeholder="Name (optional)"
                style={{ maxWidth: 150 }}
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
              />
              <input
                className="text-input"
                type="text"
                placeholder="Password (blank = auto-generate)"
                style={{ maxWidth: 220 }}
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                autoComplete="new-password"
              />
              <input
                className="text-input"
                type="number"
                min="1"
                placeholder="Cap (optional)"
                style={{ maxWidth: 130 }}
                value={createCap}
                onChange={(e) => setCreateCap(e.target.value)}
              />
              <input
                className="text-input"
                type="date"
                title="Access expires (optional — per-event)"
                style={{ maxWidth: 170 }}
                value={createExpiry}
                onChange={(e) => setCreateExpiry(e.target.value)}
              />
              <button className="btn secondary" type="submit" disabled={creatingClient || !createEmail.trim()}>
                {creatingClient ? 'Creating…' : 'Create login'}
              </button>
            </form>

            {createClientMessage && <p className="hint">{createClientMessage}</p>}
            {createdClientPassword && (
              <p className="hint" style={{ userSelect: 'all' }}>
                One-time password (copy now — never shown again): <strong>{createdClientPassword}</strong>
              </p>
            )}

            <ul className="team-list">
              {clients.map((c) => {
                const expanded = expandedClient === c.user_id
                const expired = c.access_expires && new Date(c.access_expires) < new Date()
                return (
                  <li key={c.user_id} className="team-list-item" style={{ display: 'block' }}>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', width: '100%' }}
                      onClick={() => openGrantPanel(c)}
                    >
                      <span style={{ flex: 1 }}>
                        {c.name} <span className="hint">({c.email})</span>
                        {c.favourite_cap != null && <span className="hint"> · cap {c.favourite_cap}</span>}
                        <span className="hint"> · {c.favourite_count || 0} favourite{(c.favourite_count || 0) === 1 ? '' : 's'}</span>
                        {c.submitted_at && <span className="hint"> · submitted</span>}
                        {c.revoked_at && <span className="hint"> · revoked</span>}
                        {expired && !c.revoked_at && <span className="hint"> · expired</span>}
                        {!expired && c.access_expires && <span className="hint"> · until {new Date(c.access_expires).toLocaleDateString()}</span>}
                      </span>
                      <button className="btn secondary" type="button" onClick={(e) => { e.stopPropagation(); handleRemoveClient(c.user_id) }}>
                        Remove
                      </button>
                    </div>
                    {expanded && (
                      <div style={{ marginTop: 10, display: 'grid', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                        <div className="row" style={{ alignItems: 'flex-end' }}>
                          <div>
                            <label className="field-label" htmlFor={`cap-${c.user_id}`}>Favourite cap</label>
                            <input
                              id={`cap-${c.user_id}`}
                              className="text-input"
                              type="number"
                              min="1"
                              placeholder="Unlimited"
                              style={{ maxWidth: 130 }}
                              value={grantCap}
                              onChange={(e) => setGrantCap(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="field-label" htmlFor={`exp-${c.user_id}`}>Access expires</label>
                            <input
                              id={`exp-${c.user_id}`}
                              className="text-input"
                              type="date"
                              value={grantExpiry}
                              onChange={(e) => setGrantExpiry(e.target.value)}
                            />
                          </div>
                          <button className="btn secondary" type="button" onClick={() => handleSaveGrant(c.user_id)} disabled={savingGrant}>
                            {savingGrant ? 'Saving…' : 'Save access'}
                          </button>
                        </div>
                        <div className="row" style={{ flexWrap: 'wrap' }}>
                          {c.submitted_at ? (
                            <button className="btn secondary" type="button" onClick={() => handleUnsubmit(c.user_id, c.name)}>
                              Unlock selection
                            </button>
                          ) : (
                            <button className="btn secondary" type="button" onClick={() => handleSubmitBehalf(c.user_id, c.name)}>
                              Submit on their behalf
                            </button>
                          )}
                          {c.revoked_at ? (
                            <button className="btn secondary" type="button" onClick={() => handleRestoreAccess(c.user_id)}>
                              Restore access
                            </button>
                          ) : (
                            <button className="btn secondary" type="button" onClick={() => handleRevoke(c.user_id, c.name)}>
                              Revoke access
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
              {pendingClientInvites.map((inv) => (
                <li key={inv.invite_id} className="team-list-item team-list-item-pending">
                  <span>
                    {inv.email} <span className="hint">(pending)</span>
                    {inv.favourite_cap != null && <span className="hint"> · cap {inv.favourite_cap}</span>}
                    {inv.expires_at && <span className="hint"> · until {new Date(inv.expires_at).toLocaleDateString()}</span>}
                  </span>
                </li>
              ))}
              {clients.length === 0 && pendingClientInvites.length === 0 && (
                <li className="hint">No clients yet — invite one above.</li>
              )}
            </ul>
          </div>

          <div className="card team-card">
            <div className="guest-link-label">Favourites</div>
            <p className="hint">What each client picked — and your own separate studio picks (heart) over the same photos.</p>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <button
                className="btn secondary"
                type="button"
                onClick={handlePicksZip}
                disabled={zippingPicks || studioPicks.length === 0}
                title={studioPicks.length === 0 ? 'Heart some photos as studio picks first' : 'Download your studio picks as a zip'}
              >
                <Download size={14} /> {zippingPicks ? 'Preparing picks zip…' : `Download picks (${studioPicks.length})`}
              </button>
            </div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 8, alignItems: 'flex-end' }}>
              <div>
                <label className="field-label" htmlFor="export-client">Client</label>
                <select
                  id="export-client"
                  className="text-input"
                  value={exportClient}
                  onChange={(e) => setExportClient(e.target.value)}
                  style={{ maxWidth: 220 }}
                >
                  <option value="merged">All clients (merged)</option>
                  {clients
                    .filter((c) => (c.favourite_count || 0) > 0)
                    .map((c) => (
                      <option key={c.user_id} value={c.user_id}>
                        {c.name || c.email} ({c.favourite_count})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="export-format">Format</label>
                <select
                  id="export-format"
                  className="text-input"
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  style={{ maxWidth: 220 }}
                >
                  <option value="csv">CSV filenames</option>
                  <option value="txt">TXT filenames</option>
                  <option value="pdf">PDF proofing report</option>
                  <option value="zip">ZIP selected photos</option>
                </select>
              </div>
              <button
                className="btn secondary"
                type="button"
                onClick={handleSelectionExport}
                disabled={exporting || (exportClient !== 'merged' && !clients.some((c) => c.user_id === exportClient && (c.favourite_count || 0) > 0))}
                title="Download the selection record — filenames, proofing report, or photos"
              >
                <Download size={14} /> {exporting ? 'Preparing…' : 'Export selection'}
              </button>
            </div>
            {zippingPicks && picksZipProgress && (
              <p className="hint">
                {formatBytes(picksZipProgress.loaded)}
                {picksZipProgress.total ? ` of ${formatBytes(picksZipProgress.total)}` : ' downloaded'}
                {' · '}{formatBytes(Math.round(picksZipProgress.speed))}/s
              </p>
            )}
            <div className="row source-filter-row">
              {[
                { key: 'grouped', label: 'By client' },
                { key: 'merged', label: 'Merged' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={favView === opt.key ? 'upload-tab active' : 'upload-tab'}
                  onClick={() => setFavView(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {!eventFavourites ? (
              <p className="hint">Loading favourites…</p>
            ) : favView === 'grouped' ? (
              eventFavourites.groups.length === 0 ? (
                <p className="hint">No clients yet — favourites appear here once clients pick.</p>
              ) : (
                eventFavourites.groups.map((g) => (
                  <div key={g.user_id} style={{ marginTop: 12 }}>
                    <p className="subtle">
                      <strong>{g.name || g.email}</strong>{' '}
                      <span className="hint">
                        {g.photos.length} favourite{g.photos.length === 1 ? '' : 's'}
                        {g.favourite_cap != null && ` · cap ${g.favourite_cap}`}
                        {g.submitted_at && ' · submitted'}
                        {g.revoked_at && ' · revoked'}
                      </span>
                    </p>
                    {g.photos.length === 0 ? (
                      <p className="hint">No picks yet.</p>
                    ) : (
                      <div className="photo-grid">
                        {g.photos.map((p, i) => (
                          <div className="photo-card" key={p.photo_id}>
                            <div
                              style={{ position: 'relative', cursor: 'zoom-in' }}
                              onClick={() => setPreview({ items: g.photos, index: i })}
                              title="Open fullscreen preview"
                            >
                              <GalleryMedia src={fileUrl(p.thumbnail_url || p.url)} filename={p.filename} />
                              <div className="card-overlay-actions" onClick={(e) => e.stopPropagation()}>
                                <div className="meta-actions">
                                  <button
                                    className="icon-btn"
                                    type="button"
                                    title={studioPicks.includes(p.photo_id) ? 'Remove studio pick' : 'Mark as studio pick'}
                                    onClick={() => handleTogglePick(p.photo_id, studioPicks.includes(p.photo_id))}
                                    disabled={togglingPickId === p.photo_id}
                                    style={{ color: studioPicks.includes(p.photo_id) ? '#EF4444' : undefined }}
                                  >
                                    <Heart size={15} fill={studioPicks.includes(p.photo_id) ? '#EF4444' : 'none'} />
                                  </button>
                                </div>
                              </div>
                              <div className="card-overlay-info" title={p.filename}>
                                {p.filename}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )
            ) : eventFavourites.merged.length === 0 ? (
              <p className="hint">No favourites yet — the merged view fills in once clients pick.</p>
            ) : (
              <div className="photo-grid">
                {eventFavourites.merged.map((p, i) => (
                  <div className="photo-card" key={p.photo_id}>
                    <div
                      style={{ position: 'relative', cursor: 'zoom-in' }}
                      onClick={() => setPreview({ items: eventFavourites.merged, index: i })}
                      title="Open fullscreen preview"
                    >
                      <GalleryMedia src={fileUrl(p.thumbnail_url || p.url)} filename={p.filename} />
                      <div className="card-overlay-actions" onClick={(e) => e.stopPropagation()}>
                        <div className="meta-actions">
                          <button
                            className="icon-btn"
                            type="button"
                            title={studioPicks.includes(p.photo_id) ? 'Remove studio pick' : 'Mark as studio pick'}
                            onClick={() => handleTogglePick(p.photo_id, studioPicks.includes(p.photo_id))}
                            disabled={togglingPickId === p.photo_id}
                            style={{ color: studioPicks.includes(p.photo_id) ? '#EF4444' : undefined }}
                          >
                            <Heart size={15} fill={studioPicks.includes(p.photo_id) ? '#EF4444' : 'none'} />
                          </button>
                        </div>
                      </div>
                      <div className="card-overlay-info" title={p.favourited_by.map((u) => u.name || u.email).join(', ')}>
                        {p.favourited_by.map((u) => u.name || u.email).join(', ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {preview && (
        <StudioLightbox
          items={preview.items}
          index={preview.index}
          onClose={() => setPreview(null)}
          onIndexChange={(fn) => setPreview((p) => (p ? { ...p, index: typeof fn === 'function' ? fn(p.index) : fn } : p))}
        />
      )}
    </div>
  )
}
