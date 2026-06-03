import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { toBE } from '../utils';
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

  const [statusFilter, setStatusFilter] = useState('');
  const [openMenu, setOpenMenu] = useState(null); // employee_id of open dropdown

  const load = () => api.get('/employees').then(r => setEmployees(r.data));

  useEffect(() => {
    load();
    api.get('/departments').then(r => setDepartments(r.data));
    api.get('/positions').then(r => setPositions(r.data));
    // close dropdown on outside click
    const close = () => setOpenMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const handleTerminate = async (e) => {
    if (!confirm(`เปลี่ยนสถานะ ${e.first_name} ${e.last_name} เป็น Terminated?`)) return;
    await api.put(`/employees/${e.employee_id}`, { ...e, employment_status: 'Terminated' });
    load();
  };

  const handleDelete = async (e) => {
    if (!confirm(`⚠️ ลบ ${e.first_name} ${e.last_name} ออกจากระบบถาวร?`)) return;
    try { await api.delete(`/employees/${e.employee_id}`); load(); }
    catch (err) { alert(err.response?.data?.error || 'เกิดข้อผิดพลาด'); }
  };

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
                <th>{t('phone')}</th>
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
                  <td style={{color:'var(--text-muted)'}}>{e.phone_number || '—'}</td>
                  <td style={{color:'var(--text-muted)'}}>{e.job_title || '—'}</td>
                  <td>{e.department_name || '—'}</td>
                  <td><span className={`badge ${statusBadge[e.employment_status] || 'badge-gray'}`}>{e.employment_status}</span></td>
                  <td>
                    <div style={{display:'flex', gap:6, position:'relative'}}>
                      <button className="btn-icon btn-sm" title="View" onClick={() => navigate(`/employees/${e.employee_id}`)}>👁</button>
                      {user.role === 'HR Admin' && (
                        <button className="btn-icon btn-sm" title="More"
                          onClick={ev => { ev.stopPropagation(); setOpenMenu(openMenu === e.employee_id ? null : e.employee_id); }}>
                          ⋯
                        </button>
                      )}
                      {openMenu === e.employee_id && (
                        <div onClick={ev => ev.stopPropagation()} style={{
                          position:'absolute', right:0, top:'110%', background:'var(--white)',
                          border:'1px solid var(--border)', borderRadius:8, boxShadow:'var(--shadow-md)',
                          zIndex:100, minWidth:180, overflow:'hidden'
                        }}>
                          <button onClick={() => { navigate(`/employees/${e.employee_id}`); setOpenMenu(null); }}
                            style={{display:'flex', alignItems:'center', gap:8, width:'100%', padding:'10px 14px', border:'none', background:'none', cursor:'pointer', fontSize:13, color:'var(--text)', textAlign:'left'}}
                            onMouseEnter={e => e.currentTarget.style.background='var(--bg)'}
                            onMouseLeave={e => e.currentTarget.style.background='none'}>
                            ✏️ แก้ไข / ดูโปรไฟล์
                          </button>
                          {e.employment_status !== 'Terminated' && (
                            <button onClick={() => { handleTerminate(e); setOpenMenu(null); }}
                              style={{display:'flex', alignItems:'center', gap:8, width:'100%', padding:'10px 14px', border:'none', background:'none', cursor:'pointer', fontSize:13, color:'var(--warning)', textAlign:'left'}}
                              onMouseEnter={ev => ev.currentTarget.style.background='var(--bg)'}
                              onMouseLeave={ev => ev.currentTarget.style.background='none'}>
                              🚫 ให้ออกจากงาน
                            </button>
                          )}
                          <div style={{borderTop:'1px solid var(--border)'}} />
                          <button onClick={() => { handleDelete(e); setOpenMenu(null); }}
                            style={{display:'flex', alignItems:'center', gap:8, width:'100%', padding:'10px 14px', border:'none', background:'none', cursor:'pointer', fontSize:13, color:'var(--danger)', textAlign:'left'}}
                            onMouseEnter={ev => ev.currentTarget.style.background='#fee2e2'}
                            onMouseLeave={ev => ev.currentTarget.style.background='none'}>
                            🗑 ลบออกจากระบบ
                          </button>
                        </div>
                      )}
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
  const [form, setForm] = useState({ first_name:'', last_name:'', phone_number:'', hire_date:'', employment_status:'Active', department_id:'', position_id:'' });
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
            <div className="form-group"><label>{t('phone')}</label><input value={form.phone_number} onChange={e => set('phone_number', e.target.value)} /></div>
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
