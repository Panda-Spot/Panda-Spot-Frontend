import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, ClipboardList } from 'lucide-react'
import { listClientQuestionnaires, respondClientQuestionnaire } from '../api.js'
import { useToast } from '../toast.jsx'
import { pop } from '../lib/confetti.js'

// Client-side questionnaires (Phase 12): answer what the studio assigned.
export default function ClientQuestionnaires() {
  const { showToast } = useToast()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [drafts, setDrafts] = useState({})
  const [busyId, setBusyId] = useState(null)

  const load = () => {
    listClientQuestionnaires().then(setRows).catch((e) => setError(e.message))
  }

  useEffect(() => { load() }, [])

  const setAnswer = (assignmentId, qid, value) => {
    setDrafts((d) => ({ ...d, [assignmentId]: { ...(d[assignmentId] || {}), [qid]: value } }));
  }

  const submit = async (a) => {
    const answers = drafts[a.assignment_id] || {};
    const missing = a.questionnaire.questions.filter((q) => {
      const v = answers[q.id];
      return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
    });
    if (missing.length > 0) {
      showToast(`Please answer: ${missing.map((q) => q.label).join(', ')}`, { type: 'error' });
      return;
    }
    setBusyId(a.assignment_id);
    try {
      await respondClientQuestionnaire(a.assignment_id, answers);
      showToast('Answers submitted — thank you!');
      pop()
      setDrafts((d) => {
        const next = { ...d };
        delete next[a.assignment_id];
        return next;
      });
      load();
    } catch (e) {
      showToast(e.message, { type: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  if (error && !rows) return <p className="error">{error}</p>
  if (!rows) return <p className="hint">Loading questionnaires…</p>

  return (
    <div>
      <Link className="back-link" to="/client"><ArrowLeft size={13} style={{ display: 'inline' }} /> Your events</Link>
      {rows.length === 0 ? (
        <p className="hint">No questionnaires assigned to you yet.</p>
      ) : (
        rows.map((a) => (
          <div className="card" key={a.assignment_id} style={{ marginTop: 12 }}>
            <div className="guest-link-label">
              <ClipboardList size={13} style={{ display: 'inline', verticalAlign: -2 }} /> {a.questionnaire.title}
            </div>
            <p className="hint">{a.event?.name || ''}</p>
            {a.submitted ? (
              <p style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={16} style={{ color: '#34D399' }} />
                Submitted{a.submitted_at ? ` on ${new Date(a.submitted_at).toLocaleDateString()}` : ''} — you can update answers below.
              </p>
            ) : null}
            <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
              {a.questionnaire.questions.map((q) => {
                const value = drafts[a.assignment_id]?.[q.id] ?? a.answers?.[q.id] ?? '';
                return (
                  <div key={q.id}>
                    <label className="field-label">{q.label}</label>
                    {q.type === 'choice' ? (
                      <select
                        className="text-input"
                        value={Array.isArray(value) ? value[0] || '' : value}
                        onChange={(e) => setAnswer(a.assignment_id, q.id, e.target.value)}
                      >
                        <option value="">Pick…</option>
                        {(q.options || []).map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    ) : q.type === 'date' ? (
                      <input
                        className="text-input" type="date" style={{ maxWidth: 200 }}
                        value={typeof value === 'string' ? value : ''}
                        onChange={(e) => setAnswer(a.assignment_id, q.id, e.target.value)}
                      />
                    ) : (
                      <textarea
                        className="text-input" rows={2}
                        value={typeof value === 'string' ? value : ''}
                        onChange={(e) => setAnswer(a.assignment_id, q.id, e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <button
              className="btn" type="button" style={{ marginTop: 10 }}
              disabled={busyId === a.assignment_id}
              onClick={() => submit(a)}
            >
              {busyId === a.assignment_id ? 'Submitting…' : a.submitted ? 'Update answers' : 'Submit answers'}
            </button>
          </div>
        ))
      )}
    </div>
  )
}
