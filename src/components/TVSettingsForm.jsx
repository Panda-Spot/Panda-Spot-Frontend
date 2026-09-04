import { useRef, useState } from 'react';
import { deleteSponsorLogo, updateEvent, uploadSponsorLogo } from '../api.js';
import { useToast } from '../toast.jsx';

// Live TV wall settings (Phase 8) — on-air source selector, dwell time,
// QR toggle, and sponsor frame. Draft-edit pattern: Save pushes the whole
// patch; sponsor logo uploads immediately (single-file, like the cover).
export default function TVSettingsForm({ event, onSaved }) {
  const { showToast } = useToast();
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoRef = useRef(null);

  const fromEvent = (e) => ({
    tv_mode: e.tv_mode || 'all',
    tv_transition_ms: e.tv_transition_ms ?? 5000,
    tv_show_qr: e.tv_show_qr !== false,
    sponsor_name: e.sponsor_name || '',
  });
  const d = draft || fromEvent(event);
  const set = (patch) => setDraft({ ...d, ...patch });

  const save = async () => {
    setSaving(true);
    try {
      await updateEvent(event.id, {
        tv_mode: d.tv_mode,
        tv_transition_ms: Number(d.tv_transition_ms),
        tv_show_qr: !!d.tv_show_qr,
        sponsor_name: d.sponsor_name?.trim() ? d.sponsor_name.trim() : null,
      });
      setDraft(null);
      showToast('TV wall settings saved');
      onSaved();
    } catch (e) {
      showToast(e.message, { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogo = async (files) => {
    const file = files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      await uploadSponsorLogo(event.id, file);
      showToast('Sponsor logo uploaded');
      onSaved();
    } catch (e) {
      showToast(e.message, { type: 'error' });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    setUploadingLogo(true);
    try {
      await deleteSponsorLogo(event.id);
      showToast('Sponsor logo removed');
      onSaved();
    } catch (e) {
      showToast(e.message, { type: 'error' });
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 10, marginTop: 4 }}>
      <div className="row" style={{ flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        <div>
          <label className="field-label" htmlFor="tv-mode">On-air source</label>
          <select id="tv-mode" className="text-input" value={d.tv_mode} onChange={(e) => set({ tv_mode: e.target.value })}>
            <option value="all">All approved photos</option>
            <option value="highlights">Highlights only (starred)</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="tv-transition">Slide dwell (seconds)</label>
          <input
            id="tv-transition"
            className="text-input"
            type="number"
            min="2"
            max="30"
            step="1"
            value={Math.round(Number(d.tv_transition_ms) / 1000)}
            onChange={(e) => set({ tv_transition_ms: Math.min(30000, Math.max(2000, Number(e.target.value) * 1000 || 5000)) })}
            style={{ maxWidth: 120 }}
          />
        </div>
        <label className="checkbox-row" style={{ margin: 0 }}>
          <input type="checkbox" checked={!!d.tv_show_qr} onChange={(e) => set({ tv_show_qr: e.target.checked })} />
          Show QR corner
        </label>
      </div>
      <div className="row" style={{ flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
        <div>
          <label className="field-label" htmlFor="tv-sponsor">Sponsor name (optional)</label>
          <input
            id="tv-sponsor"
            className="text-input"
            placeholder="e.g. Grand Ballroom"
            value={d.sponsor_name}
            onChange={(e) => set({ sponsor_name: e.target.value })}
            maxLength={120}
            style={{ minWidth: 200 }}
          />
        </div>
        <input
          ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={(e) => { handleLogo(e.target.files); e.target.value = ''; }}
        />
        <button type="button" className="btn secondary" disabled={uploadingLogo} onClick={() => logoRef.current?.click()}>
          {uploadingLogo ? 'Uploading…' : event.sponsor_logo_url ? 'Replace sponsor logo' : 'Upload sponsor logo'}
        </button>
        {event.sponsor_logo_url && (
          <button type="button" className="btn secondary" disabled={uploadingLogo} onClick={handleRemoveLogo}>
            Remove logo
          </button>
        )}
      </div>
      {draft && (
        <div className="row" style={{ gap: 8 }}>
          <button className="btn" type="button" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save TV settings'}
          </button>
          <button className="btn secondary" type="button" onClick={() => setDraft(null)}>
            Cancel
          </button>
        </div>
      )}
      <p className="hint">
        Highlights mode shows only starred photos — star them from the Manager grid.
        {d.tv_mode === 'highlights' ? ' New approvals stay off-air until starred.' : ''}
      </p>
    </div>
  );
}
