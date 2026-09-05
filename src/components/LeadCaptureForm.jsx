import { useState } from 'react';
import { submitGuestLead } from '../api.js';
import { getGuestClientId } from '../guestId.js';

// Lead capture form (Phase 10) — name/phone/email + guest type + consent.
// Used inline on the guest page: blocking when the studio requires it,
// dismissible otherwise. Reports capture state back via onCaptured.
const TYPES = [
  { value: 'guest', label: 'Guest' },
  { value: 'family', label: 'Family' },
  { value: 'friend', label: 'Friend' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'other', label: 'Other' },
];

export default function LeadCaptureForm({ slug, source, blocking, onCaptured, onDismiss }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [guestType, setGuestType] = useState('guest');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || (!phone.trim() && !email.trim()) || !consent) {
      setError('Please add your name, a phone or email, and tick the consent box.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await submitGuestLead(slug, {
        guestClientId: getGuestClientId(),
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        guestType,
        consent: true,
        source,
      });
      onCaptured?.(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ borderColor: 'var(--gold, #d4af37)' }}>
      <div className="guest-link-label">{blocking ? 'One quick intro first' : 'Say hello (optional)'}</div>
      <p className="hint">
        {blocking
          ? 'This gallery asks every guest to introduce themselves before continuing — the studio uses it to share your photos with you.'
          : 'Share your details so the studio can send you your photos. Never required.'}
      </p>
      <form onSubmit={submit} style={{ display: 'grid', gap: 8 }}>
        <input className="text-input" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <input className="text-input" style={{ flex: 1, minWidth: 140 }} placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} />
          <input className="text-input" style={{ flex: 1, minWidth: 140 }} placeholder="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} />
        </div>
        <select className="text-input" value={guestType} onChange={(e) => setGuestType(e.target.value)} style={{ maxWidth: 200 }}>
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <label className="row" style={{ gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
          <span className="subtle">I agree the studio may contact me about my photos. I can ask for my data to be deleted anytime.</span>
        </label>
        {error && <p className="error">{error}</p>}
        <div className="row" style={{ gap: 8 }}>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Continue'}
          </button>
          {!blocking && (
            <button className="btn secondary" type="button" onClick={onDismiss}>
              Skip
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
