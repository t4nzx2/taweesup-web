import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';

export default function Training() {
  const { user } = useAuth();
  const { t } = useLang();
  const [records, setRecords] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const canManage = user.role !== 'Employee';

  const load = () => {
    const query = user.role === 'Employee' ? `?employee_id=${user.employee_id}` : '';
    api.get(`/training${query}`).then(r => setRecords(r.data));
  };

  useEffect(() => { load(); }, []);

  const deleteRecord = async (id) => {
    if (!confirm(t('deleteConfirm'))) return;
    await api.delete(`/training/${id}`);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h1>{t('training')}</h1>
        {canManage && <button className="btn btn-primary" onClick={() => setShowModal(true)}>{t('addTraining')}</button>}
      </div>
      <div className="card">
        {records.length === 0 ? <p className="empty">{t('noTraining')}</p> : (
          <table>
            <thead><tr>{canManage && <th>{t('employee')}</th>}<th>{t('course')}</th><th>{t('completed')}</th><th>{t('expires')}</th>{user.role === 'HR Admin' && <th></th>}</tr></thead>
            <tbody>
              {records.map(r => (
                <tr key={r.training_id}>
                  {canManage && <td>{r.employee_name}</td>}
                  <td>{r.course_name}</td>
                  <td>{r.completion_date || '—'}</td>
                  <td>{r.expiration_date ? <span className={new Date(r.expiration_date) < new Date() ? 'badge badge-red' : 'badge badge-green'}>{r.expiration_date}</span> : '—'}</td>
                  {user.role === 'HR Admin' && <td><button className="btn btn-danger btn-sm" onClick={() => deleteRecord(r.training_id)}>{t('delete')}</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {showModal && <TrainingModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />}
    </div>
  );
}

function TrainingModal({ onClose, onSaved }) {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ employee_id:'', course_name:'', completion_date:'', expiration_date:'' });
  const [error, setError] = useState('');
  const { t } = useLang();

  useEffect(() => { api.get('/employees').then(r => setEmployees(r.data)); }, []);
  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const submit = async (e) => {
    e.preventDefault();
    try { await api.post('/training', form); onSaved(); }
    catch (err) { setError(err.response?.data?.error || t('error')); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{t('addTrainingTitle')}</h2>
        <form onSubmit={submit}>
          <div style={{display:'flex', flexDirection:'column', gap:12}}>
            <div className="form-group">
              <label>{t('employee')}</label>
              <select required value={form.employee_id} onChange={e => set('employee_id', e.target.value)}>
                <option value="">{t('selectEmployee')}</option>
                {employees.map(e => <option key={e.employee_id} value={e.employee_id}>{e.first_name} {e.last_name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>{t('courseName')}</label><input required value={form.course_name} onChange={e => set('course_name', e.target.value)} /></div>
            <div className="form-grid">
              <div className="form-group"><label>{t('completionDate')}</label><input type="date" value={form.completion_date} onChange={e => set('completion_date', e.target.value)} /></div>
              <div className="form-group"><label>{t('expirationDate')}</label><input type="date" value={form.expiration_date} onChange={e => set('expiration_date', e.target.value)} /></div>
            </div>
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
