import { useEffect } from 'react'
import { Flag, Search, Target, Users } from 'lucide-react'
import { useEvent } from './EventContext.jsx'
import { fileUrl } from '../../api.js'
import FaceGroupsView from '../../components/FaceGroupsView.jsx'
import GalleryMedia from '../../components/GalleryMedia.jsx'
import StatTile from '../../components/StatTile.jsx'
import TrendChart from '../../components/TrendChart.jsx'

export default function AISearch() {
  const {
    eventId, event, analytics,
    aiMembers, aiView, setAiView,
    faceGroupsState, openGroupId, setOpenGroupId, openFaceViewer,
    handleBulkRemoveVisible, bulking, handlePhotoFeatureMembership, savingPhotoFeatures,
    setActiveTab,
  } = useEvent()

  useEffect(() => { setActiveTab('ai') }, [setActiveTab])

  const faceGroups = faceGroupsState.data

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          AI Face Search
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          Selfie-searchable photos, face groups and guest search analytics.
        </p>
      </div>

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
            <p className="hint">Turn it on from Overview → Features to start building the searchable set.</p>
          </div>
        )}
      </div>
    </div>
  )
}
