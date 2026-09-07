import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import { useEvent } from './EventContext.jsx'

export default function Exports() {
  const {
    eventId, event,
    handleStudioZip, zipping, zipProgress, formatBytes,
    studioPicks, zippingPicks, picksZipProgress, handlePicksZip,
    clients, exportClient, setExportClient, exportFormat, setExportFormat,
    handleSelectionExport, exporting,
    setActiveTab,
  } = useEvent()

  useEffect(() => { setActiveTab('manager') }, [setActiveTab])

  return (
    <div>
      <div className="event-stack">
        {event?.started && (
          <div className="card">
            <div className="guest-link-label">Export</div>
            <p className="hint">Download every approved photo as one zip — your own copy, regardless of guest download settings.</p>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <button className="btn secondary" type="button" onClick={handleStudioZip} disabled={zipping}>
                <Download size={14} /> {zipping ? 'Preparing zip…' : 'Download all photos (zip)'}
              </button>
            </div>
            {zipping && zipProgress && (
              <div style={{ marginTop: 8 }}>
                <div className="progress-bar">
                  {zipProgress.total
                    ? <div className="progress-bar-fill" style={{ width: `${Math.min(100, Math.round((zipProgress.loaded / zipProgress.total) * 100))}%` }} />
                    : <div className="progress-bar-fill" style={{ width: '100%', opacity: 0.5 }} />}
                </div>
                <p className="hint">
                  {formatBytes(zipProgress.loaded)}
                  {zipProgress.total ? ` of ${formatBytes(zipProgress.total)}` : ' downloaded'}
                  {' · '}{formatBytes(Math.round(zipProgress.speed))}/s
                </p>
              </div>
            )}
          </div>
        )}

        <div className="card">
          <div className="guest-link-label">Studio picks</div>
          <p className="hint">The photos you starred across the gallery and client selections.</p>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button
              className="btn secondary"
              type="button"
              onClick={handlePicksZip}
              disabled={zippingPicks || studioPicks.length === 0}
              title={studioPicks.length === 0 ? 'Star some photos as studio picks first' : 'Download your studio picks as a zip'}
            >
              <Download size={14} /> {zippingPicks ? 'Preparing picks zip…' : `Download picks (${studioPicks.length})`}
            </button>
          </div>
          {zippingPicks && picksZipProgress && (
            <p className="hint">
              {formatBytes(picksZipProgress.loaded)}
              {picksZipProgress.total ? ` of ${formatBytes(picksZipProgress.total)}` : ' downloaded'}
              {' · '}{formatBytes(Math.round(picksZipProgress.speed))}/s
            </p>
          )}
        </div>

        {event?.photo_selection_enabled && (
          <div className="card">
            <div className="guest-link-label">Selection record</div>
            <p className="hint">Per-client or merged record for album design, editing, printing and client confirmation.</p>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
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
          </div>
        )}

        <div className="card">
          <div className="guest-link-label">Album proofs</div>
          <p className="hint">Proof PDFs live on each album — open the album to download or share its proof.</p>
          <Link className="btn secondary" to={`/events/${eventId}/albums`}>
            Open albums
          </Link>
        </div>
      </div>
    </div>
  )
}
