import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';

export default function Benefits() {
  const { user } = useAuth();
  const { t } = useLang();
  const [records, setRecords] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const isHR = user.role === 'HR Admin';

  const load = () => {
    const query = user.role === 'Employee' ? `?employee_id=${user.employee_id}` : '';
    api.get(`/benefits${query}`).then(r => setRecords(r.data));
  };

  useEffect(() => { load(); }, []);

  const deleteRecord = async (id) => {
    if (!confirm(t('deleteConfirm'))) return;
    await api.delete(`/benefits/${id}`);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h1>{t('benefits')}</h1>
        {isHR && <button className="btn btn-primary" onClick={() => setShowModal(true)}>{t('enrollBenefit')}</button>}
      </div>
      <div className="card">
        {records.length === 0 ? <p className="empty">{t('noBenefits')}</p> : (
          <table>
            <thead><tr>{isHR && <th>{t('employee')}</th>}<th>{t('planType')}</th><th>{t('enrolled')}</th><th>{t('monthlyCost')}</th>{isHR && <th></th>}</tr></thead>
            <tbody>
              {records.map(r => (
                <tr key={r.benefit_id}>
                  {isHR && <td>{r.employee_name}</td>}
                  <td><span className="badge badge-blue">{r.plan_type}</span></td>
                  <td>{r.enrollment_date}</td>
                  <td>${r.monthly_cost?.toFixed(2)}</td>
                  {isHR && <td><button className="btn btn-danger btn-sm" onClick={() => deleteRecord(r.benefit_id)}>{t('remove')}</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {showModal && <BenefitModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />}
    </div>
  );
}

function BenefitModal({ onClose, onSaved }) {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ employee_id:'', plan_type:'Health', enrollment_date:'', monthly_cost:'' });
  const [error, setError] = useState('');
  const { t } = useLang();

  useEffect(() => { api.get('/employees').then(r => setEmployees(r.data)); }, []);
  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const submit = async (e) => {
    e.preventDefault();
    try { await api.post('/benefits', form); onSaved(); }
    catch (err) { setError(err.response?.data?.error || t('error')); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{t('enrollBenefitTitle')}</h2>
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
              <div className="form-group">
                <label>{t('planType')}</label>
                <select value={form.plan_type} onChange={e => set('plan_type', e.target.value)}>
                  {['Health','Dental','Retirement','Vision','Other'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group"><label>{t('monthlyCost')}</label><input type="number" step="0.01" value={form.monthly_cost} onChange={e => set('monthly_cost', e.target.value)} /></div>
            </div>
            <div className="form-group"><label>{t('enrollmentDate')}</label><input type="date" required value={form.enrollment_date} onChange={e => set('enrollment_date', e.target.value)} /></div>
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
