import { useEffect, useState } from 'react';
import { listThemes, updateEvent } from '../api.js';
import { useToast } from '../toast.jsx';

// Per-event gallery theme assignment (Phase 11): studio default unless
// overridden here. Lists the studio's own themes; clearing falls back.
export default function EventThemePicker({ eventId, currentThemeId, onSaved }) {
  const { showToast } = useToast();
  const [themes, setThemes] = useState([]);
  const [value, setValue] = useState(currentThemeId || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listThemes().then((t) => setThemes(t.themes || [])).catch(() => setThemes([]));
  }, []);

  useEffect(() => {
    setValue(currentThemeId || '');
  }, [currentThemeId]);

  const save = async () => {
    setSaving(true);
    try {
      await updateEvent(eventId, { gallery_theme_id: value || null });
      showToast(value ? 'Event theme set' : 'Falling back to studio default');
      onSaved?.();
    } catch (e) {
      showToast(e.message, { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const dirty = (value || '') !== (currentThemeId || '');

  return (
    <div className="card">
      <div className="guest-link-label">Gallery theme</div>
      <p className="hint">Override the studio default for this event only. Manage themes, subdomains, and custom domains from Gallery Themes.</p>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label className="field-label" htmlFor="event-theme">Theme</label>
          <select id="event-theme" className="text-input" value={value} onChange={(e) => setValue(e.target.value)} style={{ minWidth: 200 }}>
            <option value="">Studio default</option>
            {themes.map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.preset})</option>
            ))}
          </select>
        </div>
        {dirty && (
          <>
            <button className="btn" type="button" disabled={saving} onClick={save}>
              {saving ? 'Saving…' : 'Save theme'}
            </button>
            <button className="btn secondary" type="button" onClick={() => setValue(currentThemeId || '')}>
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
