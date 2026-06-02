import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';

const actionBadge = { 'Verbal Warning': 'badge-yellow', 'Written Warning': 'badge-warning', 'Suspension': 'badge-red', 'Termination': 'badge-red', 'Other': 'badge-gray' };

export default function Incidents() {
  const { user } = useAuth();
  const { t } = useLang();
  const [incidents, setIncidents] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const load = () => api.get('/incidents').then(r => setIncidents(r.data)).catch(() => {});

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="page-header">
        <h1>{t('disciplinaryLog')}</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>{t('logIncident')}</button>
      </div>
      <div className="card" style={{borderLeft: '4px solid var(--danger)'}}>
        <p style={{fontSize:12, color:'var(--text-muted)', marginBottom:12}}>{t('confidential')}</p>
        {incidents.length === 0 ? <p className="empty">{t('noIncidents')}</p> : (
          <table>
            <thead><tr><th>{t('employee')}</th><th>{t('date')}</th><th>{t('violation')}</th><th>{t('actionTaken')}</th><th>{t('recordedBy')}</th></tr></thead>
            <tbody>
              {incidents.map(i => (
                <tr key={i.incident_id}>
                  <td>{i.employee_name}</td>
                  <td>{i.incident_date}</td>
                  <td>{i.violation_type}<br/><span style={{fontSize:11, color:'var(--text-muted)'}}>{i.description}</span></td>
                  <td><span className={`badge ${actionBadge[i.action_taken] || 'badge-gray'}`}>{i.action_taken || '—'}</span></td>
                  <td>{i.recorded_by_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {showModal && <IncidentModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />}
    </div>
  );
}

function IncidentModal({ onClose, onSaved }) {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ employee_id:'', incident_date:'', violation_type:'', description:'', action_taken:'Verbal Warning' });
  const [error, setError] = useState('');
  const { t } = useLang();

  useEffect(() => { api.get('/employees').then(r => setEmployees(r.data)); }, []);
  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const submit = async (e) => {
    e.preventDefault();
    try { await api.post('/incidents', form); onSaved(); }
    catch (err) { setError(err.response?.data?.error || t('error')); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{t('logIncidentTitle')}</h2>
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
              <div className="form-group"><label>{t('incidentDate')}</label><input type="date" required value={form.incident_date} onChange={e => set('incident_date', e.target.value)} /></div>
              <div className="form-group">
                <label>{t('actionTaken')}</label>
                <select value={form.action_taken} onChange={e => set('action_taken', e.target.value)}>
                  {['Verbal Warning','Written Warning','Suspension','Termination','Other'].map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group"><label>{t('violationType')}</label><input required placeholder={t('violationPlaceholder')} value={form.violation_type} onChange={e => set('violation_type', e.target.value)} /></div>
            <div className="form-group"><label>{t('description')}</label><textarea rows={4} value={form.description} onChange={e => set('description', e.target.value)} /></div>
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
