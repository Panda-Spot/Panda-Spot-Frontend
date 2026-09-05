import { useState } from 'react';
import { Download, Star } from 'lucide-react';
import { downloadFile, fileUrl, setCoverFromPhoto, setPhotoColorTag, setPhotoRating } from '../api.js';
import { useToast } from '../toast.jsx';
import { useConfirm } from '../confirm.jsx';
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

  const exifRows = [
    ['Camera', photo.exif_camera],
    ['Lens', photo.exif_lens],
    ['ISO', photo.exif_iso],
    ['Shutter', photo.exif_shutter],
    ['Aperture', photo.exif_aperture],
    ['Captured', photo.exif_captured_at ? new Date(photo.exif_captured_at).toLocaleString() : null],
  ].filter(([, v]) => v != null && v !== '');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <h3 style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{photo.filename}</h3>
        <GalleryMedia src={fileUrl(photo.thumbnail_url || photo.url)} filename={photo.filename} style={{ width: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 8 }} />
        <div className="stat-grid" style={{ marginTop: 10 }}>
          <div><div className="hint">Sharpness</div><div>{photo.sharpness != null ? Math.round(photo.sharpness) : 'not measured'}</div></div>
          <div><div className="hint">Faces</div><div>{photo.face_count ?? 0}</div></div>
          <div><div className="hint">Duplicate hash</div><div>{photo.file_hash ? `${photo.file_hash.slice(0, 10)}…` : 'not analyzed'}</div></div>
        </div>
        <div className="guest-link-label" style={{ marginTop: 10 }}>Metadata</div>
        {exifRows.length === 0 ? (
          <p className="hint">No camera metadata on this file (screenshots, exports, and some uploads carry none).</p>
        ) : (
          <ul className="team-list">
            {exifRows.map(([k, v]) => (
              <li key={k} className="team-list-item"><span style={{ flex: 1 }}>{k}</span><span>{String(v)}</span></li>
            ))}
          </ul>
        )}
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
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
          <button type="button" className="btn secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
