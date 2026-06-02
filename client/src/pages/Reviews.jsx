import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';

export default function Reviews() {
  const { user } = useAuth();
  const { t } = useLang();
  const [reviews, setReviews] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const canReview = user.role !== 'Employee';

  const load = () => {
    const query = user.role === 'Employee' ? `?employee_id=${user.employee_id}` : '';
    api.get(`/reviews${query}`).then(r => setReviews(r.data));
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="page-header">
        <h1>{t('performance')}</h1>
        {canReview && <button className="btn btn-primary" onClick={() => setShowModal(true)}>{t('addReview')}</button>}
      </div>
      <div className="card">
        {reviews.length === 0 ? <p className="empty">{t('noReviews')}</p> : (
          <table>
            <thead><tr>{canReview && <th>{t('employee')}</th>}<th>{t('date')}</th><th>{t('reviewer')}</th><th>{t('score')}</th><th>{t('comments')}</th></tr></thead>
            <tbody>
              {reviews.map(r => (
                <tr key={r.review_id}>
                  {canReview && <td>{r.employee_name}</td>}
                  <td>{r.review_date}</td>
                  <td>{r.reviewer_name}</td>
                  <td style={{fontSize:16}}>{'★'.repeat(r.performance_score)}{'☆'.repeat(5 - r.performance_score)}</td>
                  <td>{r.comments || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {showModal && <ReviewModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />}
    </div>
  );
}

function ReviewModal({ onClose, onSaved }) {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ employee_id:'', review_date:'', performance_score:'3', comments:'' });
  const [error, setError] = useState('');
  const { t } = useLang();

  useEffect(() => { api.get('/employees').then(r => setEmployees(r.data)); }, []);
  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const submit = async (e) => {
    e.preventDefault();
    try { await api.post('/reviews', form); onSaved(); }
    catch (err) { setError(err.response?.data?.error || t('error')); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{t('addReviewTitle')}</h2>
        <form onSubmit={submit}>
          <div style={{display:'flex', flexDirection:'column', gap:12}}>
            <div className="form-group">
              <label>{t('employee')}</label>
              <select required value={form.employee_id} onChange={e => set('employee_id', e.target.value)}>
                <option value="">{t('selectEmployee')}</option>
                {employees.map(e => <option key={e.employee_id} value={e.employee_id}>{e.first_name} {e.last_name}</option>)}
              </select>
            </div>
            <div className="form-grid">
              <div className="form-group"><label>{t('reviewDate')}</label><input type="date" required value={form.review_date} onChange={e => set('review_date', e.target.value)} /></div>
              <div className="form-group">
                <label>{t('scoreLabel')}</label>
                <select value={form.performance_score} onChange={e => set('performance_score', e.target.value)}>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {t('scoreOptions')[n-1]}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group"><label>{t('comments')}</label><textarea rows={4} value={form.comments} onChange={e => set('comments', e.target.value)} /></div>
          </div>
          {error && <p style={{color:'var(--danger)', marginTop:8, fontSize:13}}>{error}</p>}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('cancel')}</button>
            <button type="submit" className="btn btn-primary">{t('save')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
