import { useEffect, useRef, useState } from 'react';
import {
  analyzePhotos,
  batchRenamePhotos,
  fileUrl,
  getCoverSuggestions,
  listDuplicateGroups,
  setCoverFromPhoto,
  subscribeToAnalyzeProgress,
} from '../api.js';
import { useToast } from '../toast.jsx';
import { useConfirm } from '../confirm.jsx';
import GalleryMedia from './GalleryMedia.jsx';

// Photography tools pack panel (Phase 9) — runs on existing uploaded
// media, never blocks uploads: async analyze job (hash/blur/EXIF) with
// SSE progress, exact-duplicate groups, smart cover shortlist, and batch
// rename. Face-count diagnostics come straight from the photo list
// (AI-readiness counts below). Closed-eye detection is honestly
// unavailable: the face engine exposes no landmarks to compute it from.
export const BLURRY_BELOW = 80;

export default function PhotoToolsCard({ eventId, photos, onAnalyzed, dupIds, setDupIds, onOpenMeta }) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [job, setJob] = useState(null); // { id, completed, total }
  const [jobError, setJobError] = useState('');
  const [dups, setDups] = useState(null);
  const [dupsLoading, setDupsLoading] = useState(false);
  const [covers, setCovers] = useState(null);
  const [coversLoading, setCoversLoading] = useState(false);
  const [settingCoverId, setSettingCoverId] = useState(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renamePrefix, setRenamePrefix] = useState('');
  const [renameStart, setRenameStart] = useState('1');
  const [renaming, setRenaming] = useState(false);
  const unsubRef = useRef(null);

  useEffect(() => () => unsubRef.current?.(), []);

  const analyzed = photos.filter((p) => p.file_hash).length;
  const faces0 = photos.filter((p) => (p.face_count || 0) === 0).length;
  const faces1 = photos.filter((p) => (p.face_count || 0) === 1).length;
  const facesMany = photos.filter((p) => (p.face_count || 0) >= 2).length;

  const startAnalyze = async (scope) => {
    setJobError('');
    try {
      const res = await analyzePhotos(eventId, scope === 'all' ? { all: true } : { photoIds: scope });
      const jobId = res.job_id;
      setJob({ id: jobId, completed: 0, total: res.total || 0 });
      unsubRef.current?.();
      unsubRef.current = subscribeToAnalyzeProgress(eventId, jobId, {
        onProgress: (d) => setJob({ id: jobId, completed: d.completed || 0, total: d.total || 0 }),
        onDone: (d) => {
          setJob(null);
          showToast(`Analyzed ${d.analyzed ?? 0} photo${(d.analyzed ?? 0) === 1 ? '' : 's'}${(d.skipped || []).length ? ` (${d.skipped.length} skipped)` : ''}`);
          setDups(null);
          onAnalyzed?.();
        },
        onError: (d) => {
          setJob(null);
          setJobError(d.message || 'Analyze failed');
        },
      });
    } catch (e) {
      setJobError(e.message);
    }
  };

  const loadDups = async () => {
    setDupsLoading(true);
    try {
      const groups = await listDuplicateGroups(eventId);
      setDups(groups);
      const ids = new Set();
      groups.forEach((g) => g.photos.forEach((p) => ids.add(p.photo_id)));
      setDupIds?.(ids);
      if (groups.length === 0) showToast('No exact duplicates found');
    } catch (e) {
      showToast(e.message, { type: 'error' });
    } finally {
      setDupsLoading(false);
    }
  };

  const loadCovers = async () => {
    setCoversLoading(true);
    try {
      const res = await getCoverSuggestions(eventId);
      setCovers(res.suggestions || []);
    } catch (e) {
      showToast(e.message, { type: 'error' });
    } finally {
      setCoversLoading(false);
    }
  };

  const handleSetCover = async (photoId, filename) => {
    const ok = await confirm(`Set “${filename}” as the event cover?`, { title: 'Set cover?', confirmLabel: 'Set cover' });
    if (!ok) return;
    setSettingCoverId(photoId);
    try {
      await setCoverFromPhoto(eventId, photoId);
      showToast('Cover updated');
      onAnalyzed?.();
    } catch (e) {
      showToast(e.message, { type: 'error' });
    } finally {
      setSettingCoverId(null);
    }
  };

  const handleRename = async () => {
    const prefix = renamePrefix.trim();
    const start = Math.max(1, parseInt(renameStart, 10) || 1);
    if (!prefix) {
      showToast('Enter a filename prefix first', { type: 'error' });
      return;
    }
    const targets = [...photos].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const renames = targets.map((p, i) => {
      const ext = (p.filename.match(/\.[^.]+$/) || [''])[0];
      return { photo_id: p.photo_id, filename: `${prefix}-${String(start + i).padStart(3, '0')}${ext}` };
    });
    setRenaming(true);
    try {
      const res = await batchRenamePhotos(eventId, renames);
      const failed = (res.results || []).filter((r) => !r.ok);
      showToast(failed.length === 0 ? `Renamed ${renames.length} photos` : `Renamed ${renames.length - failed.length}, ${failed.length} failed`, failed.length === 0 ? undefined : { type: 'error' });
      setRenameOpen(false);
      onAnalyzed?.();
    } catch (e) {
      showToast(e.message, { type: 'error' });
    } finally {
      setRenaming(false);
    }
  };

  return (
    <div className="card">
      <div className="guest-link-label">Photo tools</div>
      <p className="hint">
        Duplicate detection, blur scoring, EXIF snapshots, ratings, and cover picks — runs on your uploaded media
        in the background, never blocking uploads. {analyzed}/{photos.length} analyzed.
      </p>
      <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
        <button className="btn secondary" type="button" disabled={!!job || photos.length === 0} onClick={() => startAnalyze('all')}>
          {job ? `Analyzing… ${job.completed}/${job.total}` : 'Analyze all photos'}
        </button>
        <button className="btn secondary" type="button" disabled={dupsLoading || photos.length === 0} onClick={loadDups}>
          {dupsLoading ? 'Scanning…' : 'Find duplicates'}
        </button>
        <button className="btn secondary" type="button" disabled={coversLoading} onClick={loadCovers}>
          {coversLoading ? 'Scoring…' : 'Suggest covers'}
        </button>
        <button className="btn secondary" type="button" disabled={photos.length === 0} onClick={() => setRenameOpen(true)}>
          Batch rename
        </button>
      </div>
      {jobError && <p className="error">{jobError}</p>}
      <p className="hint" style={{ marginTop: 8 }}>
        AI-readiness: {faces0} with no face · {faces1} single-face · {facesMany} multi-face.
        Closed-eye detection needs face landmarks, which the current engine doesn’t provide — skipped honestly, not silently.
      </p>

      {dups && dups.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div className="guest-link-label">Exact duplicates ({dups.length} group{dups.length === 1 ? '' : 's'})</div>
          {dups.map((g) => (
            <div key={g.file_hash} className="card" style={{ padding: '8px 10px', marginBottom: 8 }}>
              <p className="hint">{g.count} identical files · hash {g.file_hash.slice(0, 12)}…</p>
              <div className="photo-grid">
                {g.photos.map((p) => (
                  <div className="photo-card" key={p.photo_id}>
                    <GalleryMedia src={fileUrl(`/files/events/${eventId}/photos/${p.photo_id}/thumb`)} filename={p.filename} />
                    <div className="meta"><span className="hint">{p.filename}</span></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {covers && (
        <div style={{ marginTop: 10 }}>
          <div className="guest-link-label">Cover suggestions {covers.length === 0 ? '(none — approve some photos first)' : ''}</div>
          <div className="photo-grid">
            {covers.map((c) => (
              <div className="photo-card" key={c.photo_id}>
                <GalleryMedia src={fileUrl(c.thumbnail_url)} filename={c.filename} />
                <div className="meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="hint">score {c.score} · {c.reasons.join(' · ')}</span>
                </div>
                <div className="row" style={{ gap: 6, padding: '0 8px 8px' }}>
                  <button className="btn secondary" type="button" disabled={settingCoverId === c.photo_id} onClick={() => handleSetCover(c.photo_id, c.filename)}>
                    {settingCoverId === c.photo_id ? 'Setting…' : 'Use as cover'}
                  </button>
                  <button className="btn secondary" type="button" onClick={() => onOpenMeta?.(c.photo_id)}>
                    Info
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {renameOpen && (
        <div className="modal-backdrop" onClick={() => setRenameOpen(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <h3>Batch rename ({photos.length} photos)</h3>
            <p className="hint">Renames display filenames in upload order: prefix-001.ext, prefix-002.ext… Extensions never change.</p>
            <div className="row" style={{ gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label className="field-label" htmlFor="rename-prefix">Prefix</label>
                <input id="rename-prefix" className="text-input" value={renamePrefix} onChange={(e) => setRenamePrefix(e.target.value)} placeholder="e.g. Sharma-Wedding" maxLength={80} />
              </div>
              <div>
                <label className="field-label" htmlFor="rename-start">Start at</label>
                <input id="rename-start" className="text-input" type="number" min="1" value={renameStart} onChange={(e) => setRenameStart(e.target.value)} style={{ maxWidth: 100 }} />
              </div>
              <button className="btn" type="button" disabled={renaming || !renamePrefix.trim()} onClick={handleRename}>
                {renaming ? 'Renaming…' : 'Rename'}
              </button>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
              <button type="button" className="btn secondary" onClick={() => setRenameOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
