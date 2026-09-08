import { useState, useEffect } from 'react';
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

  const saveRating = async (rating) => {
    setBusy(true);
    try {
      await setPhotoRating(eventId, photo.photo_id, rating);
      onChanged?.();
    } catch (e) {
      showToast(e.message, { type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const saveTag = async (colorTag) => {
    setBusy(true);
    try {
      await setPhotoColorTag(eventId, photo.photo_id, colorTag);
      onChanged?.();
    } catch (e) {
      showToast(e.message, { type: 'error' });
    } finally {
      setBusy(false);
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{photo.filename}</h3>
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
              <span className="meta-stat-value">{photo.sharpness != null ? Math.round(photo.sharpness) : '—'}</span>
              <span className="hint">Sharpness{photo.sharpness == null ? ' · not measured' : ''}</span>
            </span>
          </div>
          <div className="meta-stat">
            <span className="meta-stat-icon"><ScanFace size={16} /></span>
            <span className="meta-stat-text">
              <span className="meta-stat-value">{photo.face_indexed_at ? (photo.face_count ?? 0) : '—'}</span>
              <span className="hint">Faces{photo.face_indexed_at ? '' : ' · not indexed'}</span>
            </span>
          </div>
          <div className="meta-stat">
            <span className="meta-stat-icon"><Fingerprint size={16} /></span>
            <span className="meta-stat-text">
              <span className="meta-stat-value">{photo.file_hash ? `${photo.file_hash.slice(0, 10)}…` : '—'}</span>
              <span className="hint">Duplicate hash{photo.file_hash ? '' : ' · not analyzed'}</span>
            </span>
          </div>
        </div>
        <div className="guest-link-label" style={{ marginTop: 14 }}>Camera metadata</div>
        {exifRows.length === 0 ? (
          <div className="meta-empty">
            <CameraOff size={18} />
            <p className="hint" style={{ margin: 0 }}>No camera metadata on this file — screenshots, exports, and some uploads carry none.</p>
          </div>
        ) : (
          <ul className="team-list">
            {exifRows.map(([k, v]) => (
              <li key={k} className="team-list-item"><span style={{ flex: 1 }}>{k}</span><span>{String(v)}</span></li>
            ))}
          </ul>
        )}
        <div className="guest-link-label" style={{ marginTop: 14 }}>Rating & color tag</div>
        <div className="row" style={{ gap: 12, marginTop: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <span className="field-label">Rating</span>
            <div className="row" style={{ gap: 2 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n} type="button" className="dismiss-btn" title={`${n} star${n === 1 ? '' : 's'}`}
                  disabled={busy} onClick={() => saveRating(photo.rating === n ? 0 : n)}
                  style={{ color: (photo.rating || 0) >= n ? '#F59E0B' : undefined }}
                >
                  <Star size={18} fill={(photo.rating || 0) >= n ? '#F59E0B' : 'none'} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="meta-tag">Color tag</label>
            <select id="meta-tag" className="text-input" disabled={busy} value={photo.color_tag || ''} onChange={(e) => saveTag(e.target.value === '' ? null : e.target.value)}>
              {TAGS.map((t) => (
                <option key={t.label} value={t.value || ''}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="guest-link-label" style={{ marginTop: 14 }}>Actions</div>
        <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
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
          <button className="btn secondary" type="button" disabled={busy} onClick={handleCover}>
            Use as cover
          </button>
          <button className="btn secondary" type="button" disabled={busy} onClick={handleArchiveToggle}>
            {photo.archived_at ? <><ArchiveRestore size={13} /> Restore</> : <><Archive size={13} /> Archive</>}
          </button>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
          <button type="button" className="btn secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
