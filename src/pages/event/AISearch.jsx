import { useEffect, useState } from 'react'
import { Flag, Search, Target, Trash2, Users } from 'lucide-react'
import { updateEvent } from '../../api.js'
import { useToast } from '../../toast.jsx'
import { useEvent } from './EventContext.jsx'
import { fileUrl } from '../../api.js'
import FaceGroupsView from '../../components/FaceGroupsView.jsx'
import GalleryMedia from '../../components/GalleryMedia.jsx'
import { GALLERY_SORTS, useGalleryItems } from '../../components/gallery/galleryTools.js'
import GalleryEmpty from '../../components/gallery/GalleryEmpty.jsx'
import PrivacySettingsCard from '../../components/PrivacySettingsCard.jsx'
import StatTile from '../../components/StatTile.jsx'
import TrendChart from '../../components/TrendChart.jsx'

export default function AISearch() {
  const { showToast } = useToast()
  const {
    eventId, event, analytics, load,
    aiMembers, aiView, setAiView,
    faceGroupsState, openGroupId, setOpenGroupId, openFaceViewer,
    handleBulkRemoveVisible, bulking, handlePhotoFeatureMembership, savingPhotoFeatures,
    privacyDraft, setPrivacyDraft,
    requestStartEvent, setActiveTab,
  } = useEvent()

  useEffect(() => { setActiveTab('ai') }, [setActiveTab])

  const [savingPrivacy, setSavingPrivacy] = useState(false)
  const [memberQuery, setMemberQuery] = useState('')
  const [memberSort, setMemberSort] = useState('newest')
  const shownAiMembers = useGalleryItems(aiMembers(), { query: memberQuery, sort: memberSort })

  const handlePrivacySave = async () => {
    if (!privacyDraft) return
    setSavingPrivacy(true)
    try {
      const days = privacyDraft.guest_data_retention_days
      await updateEvent(eventId, {
        require_face_search_consent: !!privacyDraft.require_face_search_consent,
        privacy_notice_text: privacyDraft.privacy_notice_text?.trim() ? privacyDraft.privacy_notice_text.trim() : null,
        selfie_retention_mode: privacyDraft.selfie_retention_mode,
        guest_data_retention_days: days === '' || days == null ? null : Number(days),
        allow_guest_data_delete_request: !!privacyDraft.allow_guest_data_delete_request,
      })
      setPrivacyDraft(null)
      showToast('Privacy settings saved')
      load()
    } catch (err) {
      showToast(err.message, { type: 'error' })
    } finally {
      setSavingPrivacy(false)
    }
  }

  const faceGroups = faceGroupsState.data

  if (event && !event.started) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <Search size={28} style={{ color: '#F59E0B' }} />
        </div>
        <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700 }}>Event not started</h3>
        <p className="hint" style={{ maxWidth: 380, margin: '0 auto 16px', lineHeight: 1.5 }}>
          Start the event to unlock AI Face Search and all other features.
        </p>
        {event.role === 'owner' ? (
          <button className="btn" type="button" onClick={requestStartEvent}>
            Start event
          </button>
        ) : (
          <p className="hint">Only the event owner can start the event.</p>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="event-stack">
        {analytics && (
          <div className="card analytics-card">
            <div className="guest-link-label">Analytics</div>
            <div className="stat-grid">
              <StatTile icon={Search} value={analytics.total_searches} label="searches" />
              <StatTile icon={Users} value={analytics.unique_guests} label="unique guests" />
              <StatTile icon={Target} value={`${Math.round(analytics.match_rate * 100)}%`} label="match rate" />
              <StatTile icon={Flag} value={analytics.feedback_count} label="flagged as wrong" />
            </div>
            {analytics.daily_searches && (
              <TrendChart
                series={[
                  { key: 'searches', name: 'Searches', data: analytics.daily_searches },
                  { key: 'matches', name: 'Matches', data: analytics.daily_matches },
                ]}
              />
            )}
          </div>
        )}

        {event?.face_search_enabled && (
          <div className="card">
            <div className="guest-link-label">
              AI members ({aiMembers().length})
            </div>
            <p className="hint">
              Only these photos are selfie-searchable by guests. Photos without face data index in the background once added.
            </p>
            {event?.match_threshold != null && (
              <p className="hint">
                Match strictness: {Math.round(event.match_threshold * 100)}% similarity — rises automatically when guests report wrong matches.
              </p>
            )}
            <div className="row source-filter-row" style={{ marginBottom: 8 }}>
              {[
                { key: 'members', label: `Members` },
                { key: 'faces', label: `Faces${faceGroups ? ` (${faceGroups.group_count})` : ''}` },
              ].map((opt) => (
                <button
                  key={`ai-${opt.key}`}
                  type="button"
                  className={aiView === opt.key ? 'upload-tab active' : 'upload-tab'}
                  onClick={() => setAiView(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {aiView === 'faces' ? (
              <FaceGroupsView
                eventId={eventId}
                groupsState={faceGroupsState}
                onOpenGroup={setOpenGroupId}
                openGroupId={openGroupId}
                onOpenPhoto={openFaceViewer}
              />
            ) : (
              <>
                <div className="row" style={{ marginBottom: 8 }}>
                  <button
                    className="btn secondary"
                    type="button"
                    disabled={bulking || aiMembers().length === 0}
                    onClick={() => handleBulkRemoveVisible('ai')}
                  >
                    Remove all visible from AI Search
                  </button>
                </div>
                {aiMembers().length === 0 ? (
                  <GalleryEmpty
                    title="Nothing in AI Search yet"
                    hint="Select photos in Photos & Imports and add them."
                  />
                ) : (
                  <>
                    <div className="row" style={{ gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                      <input
                        className="text-input gallery-search"
                        type="search"
                        placeholder="Search by image name…"
                        value={memberQuery}
                        onChange={(e) => setMemberQuery(e.target.value)}
                      />
                      <select
                        className="text-input" value={memberSort}
                        onChange={(e) => setMemberSort(e.target.value)}
                        title="Sort photos"
                        style={{ width: 'auto' }}
                      >
                        {GALLERY_SORTS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                      </select>
                    </div>
                    {shownAiMembers.length === 0 ? (
                      <GalleryEmpty
                        icon={Search}
                        title="No photos match"
                        hint="Try a different search."
                      />
                    ) : (
                  <div className="photo-grid">
                    {shownAiMembers.map((p) => (
                      <div className="photo-card" key={p.photo_id}>
                        <div style={{ cursor: 'zoom-in' }} onClick={() => openFaceViewer(p)} title="Open fullscreen + face closeups">
                          <GalleryMedia src={fileUrl(p.thumbnail_url || p.url)} filename={p.filename} />
                        </div>
                        <div className="meta">
                          <span className="hint">
                            {p.face_indexed_at
                              ? `${p.face_count} face${p.face_count === 1 ? '' : 's'} indexed`
                              : 'Indexing…'}
                          </span>
                          <div className="meta-actions">
                            <button
                              className="icon-btn danger"
                              type="button"
                              title="Remove from AI Search (face data kept, photo stays in Photos & Imports)"
                              onClick={() => handlePhotoFeatureMembership(p.photo_id, { face_search_visible: false })}
                              disabled={!!savingPhotoFeatures[p.photo_id]}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {!event?.face_search_enabled && (
          <div className="card">
            <div className="guest-link-label">Face Search is off</div>
            <p className="hint">Face Search is picked at event creation — switches live in the Danger section.</p>
          </div>
        )}

        {event && (event.role === 'owner' || event.role === 'collaborator') && (
          <PrivacySettingsCard
            event={event}
            draft={privacyDraft}
            setDraft={setPrivacyDraft}
            saving={savingPrivacy}
            onSave={handlePrivacySave}
          />
        )}
      </div>
    </div>
  )
}
