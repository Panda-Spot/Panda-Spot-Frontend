import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Archive, ArchiveRestore, CameraOff, Download, Fingerprint, Gauge, ScanFace, Star, X } from 'lucide-react';
import { archivePhoto, downloadFile, fileUrl, restorePhoto, setCoverFromPhoto, setPhotoColorTag, setPhotoRating } from '../api.js';
import { useToast } from '../toast.jsx';
import { useConfirm } from '../confirm.jsx';
import { lockScroll, unlockScroll } from '../utils/scrollLock.js';
import GalleryMedia from './GalleryMedia.jsx';

const TAGS = [
  { value: null, label: 'None' },
  { value: 'red', label: 'Red' },
  { value: 'orange', label: 'Orange' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
  { value: 'purple', label: 'Purple' },
];

const PRESETS = [
  { value: 'full', label: 'Full-res original' },
  { value: 'web', label: 'Web (2048px)' },
  { value: 'proof', label: 'Proof (1200px)' },
  { value: 'whatsapp', label: 'WhatsApp (1280px)' },
];

// Per-photo inspector (Phase 9): EXIF metadata, sharpness/hash state,
// star rating + color tag editors, delivery-preset downloads, and
// set-as-cover. Photo objects come from the manager list (already carry
// the analysis fields once analyzed).
export default function PhotoMetaModal({ eventId, photo, onClose, onChanged }) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [preset, setPreset] = useState('full');
  const [downloading, setDownloading] = useState(false);
  // Optimistic rating/tag: instant local feel, server confirms after.
  // Re-seeded whenever a different photo opens.
  const [rating, setRating] = useState(photo?.rating ?? 0);
  const [colorTag, setColorTag] = useState(photo?.color_tag ?? null);
  useEffect(() => {
    setRating(photo?.rating ?? 0);
    setColorTag(photo?.color_tag ?? null);
  }, [photo?.photo_id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (photo) {
      lockScroll();
      return () => unlockScroll();
    }
  }, [photo]);

  useEffect(() => {
    if (!photo) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [photo, onClose]);

  if (!photo) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const qs = preset && preset !== 'full' ? `?preset=${preset}` : '';
      await downloadFile(`/events/${eventId}/photos/${photo.photo_id}/download${qs}`);
      showToast('Download started');
    } catch (e) {
      showToast(e.message, { type: 'error' });
    } finally {
      setDownloading(false);
    }
  };

  // Monotonic per-save sequence: a slow failure only reverts when no
  // newer tap has landed since (rapid re-taps keep last-tap-wins).
  const saveSeq = useRef(0);
  const saveRating = async (next) => {
    const prev = rating;
    const value = prev === next ? 0 : next;
    const my = ++saveSeq.current;
    setRating(value);
    try {
      await setPhotoRating(eventId, photo.photo_id, value);
      showToast(value === 0 ? 'Rating cleared.' : `Rated ${value} star${value === 1 ? '' : 's'}.`);
      onChanged?.();
    } catch (e) {
      if (saveSeq.current === my) setRating(prev);
      showToast(e.message, { type: 'error' });
    }
  };

  const saveTag = async (next) => {
    const prev = colorTag;
    const my = ++saveSeq.current;
    setColorTag(next);
    try {
      await setPhotoColorTag(eventId, photo.photo_id, next);
      showToast(next ? `Color tag set to ${next}.` : 'Color tag cleared.');
      onChanged?.();
    } catch (e) {
      if (saveSeq.current === my) setColorTag(prev);
      showToast(e.message, { type: 'error' });
    }
  };

  const handleCover = async () => {
    const ok = await confirm(`Set “${photo.filename}” as the event cover?`, { title: 'Set cover?', confirmLabel: 'Set cover' });
    if (!ok) return;
    setBusy(true);
    try {
      await setCoverFromPhoto(eventId, photo.photo_id);
      showToast('Cover updated');
      onChanged?.();
    } catch (e) {
      showToast(e.message, { type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  // Archive lives here now that the grid cards show only Heart / Bin /
  // Info — hides from guests and clients without deleting anything.
  const handleArchiveToggle = async () => {
    if (!photo.archived_at) {
      const ok = await confirm(`Remove “${photo.filename}” from guests and clients? The file stays in the manager and you can restore it any time.`, { title: 'Remove photo?', confirmLabel: 'Remove' });
      if (!ok) return;
    }
    setBusy(true);
    try {
      if (photo.archived_at) {
        await restorePhoto(eventId, photo.photo_id);
        showToast('Photo restored — visible to guests and clients again.');
      } else {
        await archivePhoto(eventId, photo.photo_id);
        showToast('Photo archived — hidden from guests and clients.');
      }
      onChanged?.();
    } catch (e) {
      showToast(e.message, { type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const exifRows = [
    ['Camera', photo.exif_camera],
    ['Lens', photo.exif_lens],
    ['ISO', photo.exif_iso],
    ['Shutter', photo.exif_shutter],
    ['Aperture', photo.exif_aperture],
    ['Captured', photo.exif_captured_at ? new Date(photo.exif_captured_at).toLocaleString() : null],
  ].filter(([, v]) => v != null && v !== '');

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel modal-scrollable" data-modal-panel="" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="meta-head">
          <h3 className="meta-title" title={photo.filename}>{photo.filename}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="meta-preview">
          <GalleryMedia src={fileUrl(photo.thumbnail_url || photo.url)} filename={photo.filename} style={{ width: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 8 }} />
        </div>
        <div className="meta-stats">
          <div className="meta-stat">
            <span className="meta-stat-icon"><Gauge size={16} /></span>
            <span className="meta-stat-text">
              <span className="meta-stat-label">Sharpness</span>
              {photo.sharpness != null
                ? <span className="meta-stat-value">{Math.round(photo.sharpness)}</span>
                : <span className="meta-stat-missing">Not measured</span>}
            </span>
          </div>
          <div className="meta-stat">
            <span className="meta-stat-icon"><ScanFace size={16} /></span>
            <span className="meta-stat-text">
              <span className="meta-stat-label">Faces</span>
              {photo.face_indexed_at
                ? <span className="meta-stat-value">{photo.face_count ?? 0}</span>
                : <span className="meta-stat-missing">Not indexed</span>}
            </span>
          </div>
          <div className="meta-stat">
            <span className="meta-stat-icon"><Fingerprint size={16} /></span>
            <span className="meta-stat-text">
              <span className="meta-stat-label">Duplicate hash</span>
              {photo.file_hash
                ? <span className="meta-stat-value">{photo.file_hash.slice(0, 10)}…</span>
                : <span className="meta-stat-missing">Not analyzed</span>}
            </span>
          </div>
        </div>
        <div className="meta-section">
          <div className="guest-link-label meta-section-label">Camera metadata</div>
          {exifRows.length === 0 ? (
            <p className="hint meta-empty-inline">
              <CameraOff size={14} /> No camera metadata on this file — screenshots, exports, and some uploads carry none.
            </p>
          ) : (
            <ul className="team-list">
              {exifRows.map(([k, v]) => (
                <li key={k} className="team-list-item"><span style={{ flex: 1 }}>{k}</span><span>{String(v)}</span></li>
              ))}
            </ul>
          )}
        </div>
        <div className="meta-section">
          <div className="guest-link-label meta-section-label">Rating & color tag</div>
          <div className="meta-rate-row">
            <div className="meta-rate-group">
              <span className="meta-rate-label">Rating</span>
              <div className="meta-stars">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n} type="button" className={`meta-star${rating >= n ? ' lit' : ''}`} title={`${n} star${n === 1 ? '' : 's'}`}
                    onClick={() => saveRating(n)}
                  >
                    <Star size={18} fill={rating >= n ? '#F59E0B' : 'none'} />
                  </button>
                ))}
              </div>
            </div>
            <div className="meta-rate-group">
              <span className="meta-rate-label">Color tag</span>
              <div className="meta-swatches">
                <button
                  key="none" type="button" title="No tag"
                  className={`swatch swatch-none${!colorTag ? ' active' : ''}`}
                  onClick={() => saveTag(null)}
                >
                  <X size={12} />
                </button>
                {TAGS.filter((t) => t.value).map((t) => (
                  <button
                    key={t.value} type="button" title={t.label}
                    className={`swatch${colorTag === t.value ? ' active' : ''}`}
                    style={{ background: t.value }}
                    onClick={() => saveTag(t.value)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="meta-section">
          <div className="guest-link-label meta-section-label">Actions</div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label className="field-label" htmlFor="meta-preset">Download</label>
              <select id="meta-preset" className="text-input" value={preset} onChange={(e) => setPreset(e.target.value)}>
                {PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <button className="btn secondary" type="button" disabled={downloading} onClick={handleDownload}>
              <Download size={13} /> {downloading ? 'Preparing…' : 'Download'}
            </button>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <button className="btn secondary" type="button" disabled={busy} onClick={handleCover}>
              Use as cover
            </button>
            <button className="btn secondary" type="button" disabled={busy} onClick={handleArchiveToggle}>
              {photo.archived_at ? <><ArchiveRestore size={13} /> Restore</> : <><Archive size={13} /> Archive</>}
            </button>
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 18 }}>
          <button type="button" className="btn secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
