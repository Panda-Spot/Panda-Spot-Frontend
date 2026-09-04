import { useState } from 'react';

// Gallery access settings (Phase 3) — studio-side card on the event page.
// Draft-edit pattern like PrivacySettingsCard: edits accumulate locally
// until Save. Expiry presets write expires_at + expiry_preset together;
// the access key field only ever sends a NEW key (or a clear flag) — the
// hash itself never leaves the server.
const MODES = [
  { value: 'public', label: 'Public link', hint: 'Anyone with the link can browse and search.' },
  { value: 'private_key', label: 'Private key', hint: 'Guests enter your access key first.' },
  { value: 'client_login', label: 'Client login', hint: 'Guest link closed — invited clients log in.' },
  { value: 'invite_only', label: 'Invite only', hint: 'Guest link closed — strictest, login only.' },
];

const PRESETS = [
  { value: '7_days', label: '7 days', days: 7 },
  { value: '30_days', label: '30 days', days: 30 },
  { value: '90_days', label: '90 days', days: 90 },
];

function toDateInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function presetDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function AccessSettingsCard({ event, draft, setDraft, saving, onSave, guestLinkUrl, copied, onCopyLink }) {
  const [newKey, setNewKey] = useState('');
  const fromEvent = (e) => ({
    access_mode: e.access_mode || 'public',
    expires_at: toDateInput(e.expires_at),
    expiry_preset: e.expiry_preset || '90_days',
    clear_key: false,
  });
  const d = draft || fromEvent(event);
  const dirty = !!draft || newKey.trim() !== '';
  const set = (patch) => setDraft({ ...d, ...patch });

  const pickPreset = (preset) => {
    if (preset === 'custom') {
      set({ expiry_preset: 'custom' });
    } else {
      const found = PRESETS.find((p) => p.value === preset);
      set({ expiry_preset: preset, expires_at: presetDate(found.days) });
    }
  };

  const save = () => {
    onSave({
      access_mode: d.access_mode,
      access_key: d.clear_key ? null : newKey.trim() ? newKey.trim() : undefined,
      expires_at: d.expires_at ? new Date(`${d.expires_at}T23:59:59`).toISOString() : undefined,
      expiry_preset: d.expiry_preset,
    });
  };

  const keySet = event.access_key_set && !d.clear_key;

  return (
    <div className="card">
      <div className="guest-link-label">Gallery access</div>
      <p className="hint">Who the guest link serves, and how long it stays open.</p>
      <div>
        <label className="field-label" htmlFor="access-mode">Access mode</label>
        <select id="access-mode" className="text-input" value={d.access_mode} onChange={(e) => set({ access_mode: e.target.value })} style={{ maxWidth: 280 }}>
          {MODES.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <p className="hint">{MODES.find((m) => m.value === d.access_mode)?.hint}</p>
      </div>

      {d.access_mode === 'private_key' && (
        <div style={{ marginTop: 8 }}>
          <label className="field-label" htmlFor="access-key">Private access key</label>
          {keySet && !newKey ? (
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <span className="hint">A key is set on this gallery.</span>
              <button type="button" className="btn secondary" onClick={() => set({ clear_key: true })}>Remove key</button>
            </div>
          ) : (
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <input
                id="access-key"
                className="text-input"
                type="text"
                autoComplete="off"
                placeholder={keySet ? 'Enter a new key to replace it' : 'e.g. SharmaWedding2026 (min 4 chars)'}
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                maxLength={200}
                style={{ maxWidth: 280 }}
              />
              {d.clear_key && (
                <button type="button" className="btn secondary" onClick={() => set({ clear_key: false })}>Keep existing key</button>
              )}
            </div>
          )}
          <p className="hint">Share it with guests privately — they enter it once to unlock the gallery for 12 hours.</p>
        </div>
      )}

      <div style={{ marginTop: 8 }}>
        <span className="field-label">Guest access closes</span>
        <div className="row source-filter-row" style={{ marginBottom: 8 }}>
          {[...PRESETS.map((p) => ({ key: p.value, label: p.label })), { key: 'custom', label: 'Custom' }].map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={d.expiry_preset === opt.key ? 'upload-tab active' : 'upload-tab'}
              onClick={() => pickPreset(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <input
          className="text-input"
          type="date"
          value={d.expires_at}
          onChange={(e) => set({ expires_at: e.target.value, expiry_preset: 'custom' })}
          style={{ maxWidth: 200 }}
        />
      </div>

      <div style={{ marginTop: 8 }}>
        <label className="field-label">Access link</label>
        <div className="row">
          <input className="text-input" readOnly value={guestLinkUrl} onFocus={(e) => e.target.select()} />
          <button className="btn secondary" type="button" onClick={onCopyLink}>
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      </div>

      {dirty && (
        <div className="row" style={{ marginTop: 10, gap: 8 }}>
          <button className="btn" type="button" onClick={() => { save(); setNewKey(''); }} disabled={saving}>
            {saving ? 'Saving…' : 'Save access settings'}
          </button>
          <button className="btn secondary" type="button" onClick={() => { setDraft(null); setNewKey(''); }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
