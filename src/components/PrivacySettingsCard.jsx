// Face Search privacy settings (Phase 2) — studio-side card on the event
// page. Draft-edit pattern: edits accumulate locally until Save, Cancel
// drops back to the event's stored values.
export default function PrivacySettingsCard({ event, draft, setDraft, saving, onSave }) {
  const fromEvent = (e) => ({
    require_face_search_consent: !!e.require_face_search_consent,
    privacy_notice_text: e.privacy_notice_text || '',
    selfie_retention_mode: e.selfie_retention_mode || 'process_only',
    guest_data_retention_days: e.guest_data_retention_days ?? '',
    allow_guest_data_delete_request: e.allow_guest_data_delete_request !== false,
  });
  const d = draft || fromEvent(event);
  const dirty = !!draft;
  const set = (patch) => setDraft({ ...d, ...patch });

  return (
    <div className="card">
      <div className="guest-link-label">Face Search privacy</div>
      <p className="hint">
        Consent-first controls for weddings, schools, and corporate clients. Selfies are processed in memory
        only and never stored — these settings govern the consent gate, the notice guests see, and how long
        search records are kept.
      </p>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={!!d.require_face_search_consent}
          onChange={(e) => set({ require_face_search_consent: e.target.checked })}
        />
        Require consent — block selfie search until the guest ticks the consent box
      </label>
      <div style={{ marginTop: 8 }}>
        <label className="field-label" htmlFor="privacy-notice">Privacy notice (blank = built-in default)</label>
        <textarea
          id="privacy-notice"
          className="text-input"
          rows={3}
          maxLength={2000}
          placeholder="How this event uses guest selfies…"
          value={d.privacy_notice_text}
          onChange={(e) => set({ privacy_notice_text: e.target.value })}
          style={{ width: '100%' }}
        />
      </div>
      <div className="row" style={{ flexWrap: 'wrap', gap: 12, marginTop: 8, alignItems: 'flex-end' }}>
        <div>
          <label className="field-label" htmlFor="selfie-retention">Selfie handling</label>
          <select
            id="selfie-retention"
            className="text-input"
            value={d.selfie_retention_mode}
            onChange={(e) => set({ selfie_retention_mode: e.target.value })}
          >
            <option value="process_only">Process only (never stored)</option>
            <option value="retain">Retain records longer (explicit opt-in)</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="guest-retention-days">Delete search records after (days, blank = keep)</label>
          <input
            id="guest-retention-days"
            className="text-input"
            type="number"
            min="0"
            max="3650"
            placeholder="e.g. 30"
            value={d.guest_data_retention_days}
            onChange={(e) => set({ guest_data_retention_days: e.target.value })}
            style={{ maxWidth: 160 }}
          />
        </div>
      </div>
      <label className="checkbox-row" style={{ marginTop: 8 }}>
        <input
          type="checkbox"
          checked={!!d.allow_guest_data_delete_request}
          onChange={(e) => set({ allow_guest_data_delete_request: e.target.checked })}
        />
        Allow guests to file data-deletion requests from the event page
      </label>
      {dirty && (
        <div className="row" style={{ marginTop: 10, gap: 8 }}>
          <button className="btn" type="button" onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save privacy settings'}
          </button>
          <button className="btn secondary" type="button" onClick={() => setDraft(null)}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
