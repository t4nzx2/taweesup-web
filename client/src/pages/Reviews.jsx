import { useEffect, useState } from 'react';
import api from '../api';
import { useLang } from '../LangContext';

const TOPICS = [
  { key: 'score_cleanliness', label: 'topicCleanliness', avg: 'avg_cleanliness' },
  { key: 'score_teamwork', label: 'topicTeamwork', avg: 'avg_teamwork' },
  { key: 'score_service', label: 'topicService', avg: 'avg_service' },
  { key: 'score_retention', label: 'topicRetention', avg: 'avg_retention' },
  { key: 'score_problem', label: 'topicProblem', avg: 'avg_problem' },
];

// Star display (read-only, supports decimals)
function Stars({ value }) {
  const v = Number(value) || 0;
  return (
    <span style={{ color: '#f59e0b', fontSize: 16, letterSpacing: 1 }}>
      {[1,2,3,4,5].map(n => <span key={n}>{v >= n ? '★' : v >= n - 0.5 ? '⯨' : '☆'}</span>)}
    </span>
  );
}

// Star input (clickable)
function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <span style={{ fontSize: 26, color: '#f59e0b', cursor: 'pointer', letterSpacing: 2 }}>
      {[1,2,3,4,5].map(n => (
        <span key={n}
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}>
          {(hover || value) >= n ? '★' : '☆'}
        </span>
      ))}
    </span>
  );
}

export default function Reviews() {
  const { t } = useLang();
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState(null);
  const [summary, setSummary] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const loadEmployees = () => api.get('/reviews/summary-all').then(r => setEmployees(r.data)).catch(() => {});
  const loadSummary = (id) => api.get(`/reviews/summary?employee_id=${id}`).then(r => setSummary(r.data)).catch(() => {});

  useEffect(() => { loadEmployees(); }, []);

  const selectEmp = (emp) => {
    setSelected(emp);
    setSummary(null);
    loadSummary(emp.employee_id);
  };

  return (
    <div>
      <div className="page-header">
        <h1>{t('performance')}</h1>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>📊 {t('anonymousNote')}</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 16 }}>
        {/* Employee list */}
        <div className="card">
          <div className="card-header"><span className="card-title">{t('selectEmpToReview')}</span></div>
          {employees.length === 0 ? <p className="empty">{t('noEmployeesFound')}</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {employees.map(e => (
                <div key={e.employee_id}
                  onClick={() => selectEmp(e)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    borderRadius: 8, cursor: 'pointer',
                    background: selected?.employee_id === e.employee_id ? 'var(--primary-light)' : 'transparent',
                    border: '1px solid var(--border)'
                  }}>
                  <div className="avatar avatar-sm">{e.employee_name.split(' ').map(x=>x[0]).join('').slice(0,2)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{e.employee_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {e.review_count > 0 ? `${e.avg_overall} / 5 (${e.review_count} ${t('reviewCount')})` : t('noReviewsYet')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary panel */}
        <div className="card">
          {!selected ? (
            <p className="empty"><div className="empty-icon">⭐</div>{t('selectEmpToReview')}</p>
          ) : (
            <>
              <div className="card-header">
                <span className="card-title">{selected.employee_name}</span>
                <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>{t('rateEmployee')}</button>
              </div>

              {summary && summary.review_count > 0 ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0 16px' }}>
                    <div>
                      <div style={{ fontSize: 28, fontWeight: 800 }}>{summary.avg_overall ?? '—'}<span style={{fontSize:14, color:'var(--text-muted)'}}> / 5</span></div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('overallAvg')} · {summary.review_count} {t('reviewCount')}</div>
                    </div>
                    <div style={{ marginLeft: 'auto' }}><Stars value={summary.avg_overall} /></div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>{t('avgByTopic')}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {TOPICS.map(tp => (
                      <div key={tp.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, fontSize: 13 }}>{t(tp.label)}</div>
                        <Stars value={summary[tp.avg]} />
                        <div style={{ width: 36, textAlign: 'right', fontWeight: 600, fontSize: 13 }}>{summary[tp.avg] ?? '—'}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="empty">{t('noReviewsYet')}</p>
              )}
            </>
          )}
        </div>
      </div>

      {showForm && selected && (
        <ReviewModal
          employee={selected}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadSummary(selected.employee_id); loadEmployees(); }}
        />
      )}
    </div>
  );
}

function ReviewModal({ employee, onClose, onSaved }) {
  const { t } = useLang();
  const [scores, setScores] = useState({ score_cleanliness: 0, score_teamwork: 0, score_service: 0, score_retention: 0, score_problem: 0 });
  const [comments, setComments] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (Object.values(scores).some(s => s < 1)) { setError(t('error') + ' (1-5 ★)'); return; }
    setError(''); setSaving(true);
    try {
      await api.post('/reviews', { employee_id: employee.employee_id, ...scores, comments });
      onSaved();
    } catch (err) { setError(err.response?.data?.error || t('error')); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{t('rateEmployee')}: {employee.employee_name}</h2>
        <form onSubmit={submit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {TOPICS.map(tp => (
              <div key={tp.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14 }}>{t(tp.label)}</span>
                <StarInput value={scores[tp.key]} onChange={v => setScores(s => ({ ...s, [tp.key]: v }))} />
              </div>
            ))}
            <div className="form-group">
              <label>{t('comments')}</label>
              <textarea rows={2} value={comments} onChange={e => setComments(e.target.value)} />
            </div>
          </div>
          {error && <p style={{ color: 'var(--danger)', marginTop: 8, fontSize: 13 }}>{error}</p>}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '...' : t('submitReview')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
