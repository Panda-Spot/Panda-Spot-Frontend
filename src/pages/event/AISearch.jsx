import { useEffect, useState } from 'react'
import { Flag, Search, Target, Users } from 'lucide-react'
import { updateEvent } from '../../api.js'
import { useToast } from '../../toast.jsx'
import { useEvent } from './EventContext.jsx'
import { fileUrl } from '../../api.js'
import FaceGroupsView from '../../components/FaceGroupsView.jsx'
import GalleryMedia from '../../components/GalleryMedia.jsx'
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
    setActiveTab,
  } = useEvent()

  useEffect(() => { setActiveTab('ai') }, [setActiveTab])

  const [savingPrivacy, setSavingPrivacy] = useState(false)

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
                  <p className="hint">Nothing in AI Search yet — select photos in Photos &amp; Imports and add them.</p>
                ) : (
                  <div className="photo-grid">
                    {aiMembers().map((p) => (
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
                          <button
                            className="dismiss-btn"
                            type="button"
                            onClick={() => handlePhotoFeatureMembership(p.photo_id, { face_search_visible: false })}
                            disabled={!!savingPhotoFeatures[p.photo_id]}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
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
