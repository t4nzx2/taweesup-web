import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';

const statusBadge = { Active: 'badge-green', 'On Leave': 'badge-yellow', Terminated: 'badge-red' };

export default function Employees() {
  const [searchParams] = useSearchParams();
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [showModal, setShowModal] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  const load = () => api.get('/employees').then(r => setEmployees(r.data));

  useEffect(() => {
    load();
    api.get('/departments').then(r => setDepartments(r.data));
    api.get('/positions').then(r => setPositions(r.data));
  }, []);

  const [statusFilter, setStatusFilter] = useState('');

  const filtered = employees.filter(e => {
    const matchSearch = `${e.first_name} ${e.last_name} ${e.email}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || e.employment_status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <div className="page-header">
        <h1>{t('employees')}</h1>
        {user.role === 'HR Admin' && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>{t('addEmployee')}</button>
        )}
      </div>

      <div className="card">
        <div style={{display:'flex', gap:12, marginBottom:16, flexWrap:'wrap'}}>
          <div className="search-wrap" style={{flex:1, minWidth:200}}>
            <span className="search-icon">🔍</span>
            <input placeholder={t('searchEmployees')} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{width:'auto', minWidth:140}}>
            <option value="">All Status</option>
            <option>Active</option><option>On Leave</option><option>Terminated</option>
          </select>
          <button className="btn btn-outline" onClick={() => {}}>↓ Export</button>
        </div>

        {filtered.length === 0 ? <p className="empty"><div className="empty-icon">👥</div>{t('noEmployeesFound')}</p> : (
          <table>
            <thead>
              <tr>
                <th style={{width:32}}><input type="checkbox" /></th>
                <th>Employee ID</th>
                <th>{t('name')}</th>
                <th>{t('email')}</th>
                <th>{t('jobTitle')}</th>
                <th>{t('department')}</th>
                <th>{t('status')}</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.employee_id}>
                  <td><input type="checkbox" /></td>
                  <td style={{color:'var(--text-muted)', fontSize:12}}>EMP{String(e.employee_id).padStart(6,'0')}</td>
                  <td>
                    <div style={{display:'flex', alignItems:'center', gap:10}}>
                      <div className="avatar avatar-sm">{e.first_name[0]}{e.last_name[0]}</div>
                      <span style={{fontWeight:600}}>{e.first_name} {e.last_name}</span>
                    </div>
                  </td>
                  <td style={{color:'var(--text-muted)'}}>{e.email}</td>
                  <td style={{color:'var(--text-muted)'}}>{e.job_title || '—'}</td>
                  <td>{e.department_name || '—'}</td>
                  <td><span className={`badge ${statusBadge[e.employment_status] || 'badge-gray'}`}>{e.employment_status}</span></td>
                  <td>
                    <div style={{display:'flex', gap:6}}>
                      <button className="btn-icon btn-sm" title="View" onClick={() => navigate(`/employees/${e.employee_id}`)}>👁</button>
                      <button className="btn-icon btn-sm" title="More">⋯</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <AddEmployeeModal
          departments={departments} positions={positions}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}

function AddEmployeeModal({ departments, positions, onClose, onSaved }) {
  const [form, setForm] = useState({ first_name:'', last_name:'', email:'', phone_number:'', date_of_birth:'', hire_date:'', employment_status:'Active', department_id:'', position_id:'' });
  const [error, setError] = useState('');
  const { t } = useLang();

  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const submit = async (e) => {
    e.preventDefault(); setError('');
    try { await api.post('/employees', form); onSaved(); }
    catch (err) { setError(err.response?.data?.error || t('error')); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{t('addEmployeeTitle')}</h2>
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="form-group"><label>{t('firstName')}</label><input required value={form.first_name} onChange={e => set('first_name', e.target.value)} /></div>
            <div className="form-group"><label>{t('lastName')}</label><input required value={form.last_name} onChange={e => set('last_name', e.target.value)} /></div>
            <div className="form-group"><label>{t('email')}</label><input type="email" required value={form.email} onChange={e => set('email', e.target.value)} /></div>
            <div className="form-group"><label>{t('phone')}</label><input value={form.phone_number} onChange={e => set('phone_number', e.target.value)} /></div>
            <div className="form-group"><label>{t('dateOfBirth')}</label><input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} /></div>
            <div className="form-group"><label>{t('hireDate')}</label><input type="date" required value={form.hire_date} onChange={e => set('hire_date', e.target.value)} /></div>
            <div className="form-group"><label>{t('department')}</label>
              <select value={form.department_id} onChange={e => set('department_id', e.target.value)}>
                <option value="">{t('selectDept')}</option>
                {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>{t('position')}</label>
              <select value={form.position_id} onChange={e => set('position_id', e.target.value)}>
                <option value="">{t('select')}</option>
                {positions.map(p => <option key={p.position_id} value={p.position_id}>{p.job_title}</option>)}
              </select>
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
