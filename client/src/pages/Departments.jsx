import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';
import { formatTHB } from '../utils';

export default function Departments() {
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const isHR = user.role === 'HR Admin';

  const load = () => api.get('/departments').then(r => setDepartments(r.data));
  useEffect(() => { load(); }, []);

  const handleDelete = async (id, name) => {
    if (!confirm(`ลบแผนก "${name}" หรือไม่?`)) return;
    try {
      await api.delete(`/departments/${id}`);
      load();
    } catch (e) {
      alert(e.response?.data?.error || 'เกิดข้อผิดพลาด');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>{t('departments')}</h1>
        {isHR && <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>{t('addDept')}</button>}
      </div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:16}}>
        {departments.map(d => (
          <div key={d.department_id} className="card">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8}}>
              <span style={{fontSize:20}}>🏢</span>
              <span className="badge badge-blue">{d.member_count} คน</span>
            </div>
            <h3 style={{fontWeight:700, marginBottom:4}}>{d.department_name}</h3>
            <p style={{color:'var(--text-muted)', fontSize:13, marginBottom:10}}>{t('manager')}: {d.manager_name || t('unassigned')}</p>

            <div style={{borderTop:'1px solid var(--border)', paddingTop:10}}>
              <div style={{fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:6}}>พนักงาน</div>
              {d.members && d.members.length > 0 ? (
                <div style={{display:'flex', flexDirection:'column', gap:6}}>
                  {d.members.map(m => (
                    <div key={m.employee_id}
                      onClick={() => navigate(`/employees/${m.employee_id}`)}
                      style={{display:'flex', alignItems:'center', gap:8, cursor:'pointer'}}>
                      <div className="avatar avatar-sm">{m.name.split(' ').map(x=>x[0]).join('').slice(0,2)}</div>
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:13, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{m.name}</div>
                        <div style={{fontSize:11, color:'var(--text-muted)'}}>{m.job_title || '—'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{fontSize:12, color:'var(--text-light)'}}>ยังไม่มีพนักงาน</p>
              )}
            </div>

            {isHR && (
              <div style={{display:'flex', gap:8, marginTop:14}}>
                <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(d); setShowModal(true); }}>{t('edit')}</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(d.department_id, d.department_name)}>ลบ</button>
              </div>
            )}
          </div>
        ))}
        {departments.length === 0 && <p className="empty">{t('noDepartments')}</p>}
      </div>
      {showModal && (
        <DeptModal
          initial={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}

function DeptModal({ initial, onClose, onSaved }) {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(initial ? { department_name: initial.department_name, manager_id: initial.manager_id || '', budget: initial.budget || '' } : { department_name:'', manager_id:'', budget:'' });
  const [error, setError] = useState('');
  const { t } = useLang();

  useEffect(() => { api.get('/employees').then(r => setEmployees(r.data)); }, []);
  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (initial) await api.put(`/departments/${initial.department_id}`, form);
      else await api.post('/departments', form);
      onSaved();
    } catch (err) { setError(err.response?.data?.error || t('error')); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{initial ? t('editDeptTitle') : t('addDeptTitle')}</h2>
        <form onSubmit={submit}>
          <div style={{display:'flex', flexDirection:'column', gap:12}}>
            <div className="form-group"><label>{t('departmentName')}</label><input required value={form.department_name} onChange={e => set('department_name', e.target.value)} /></div>
            <div className="form-group">
              <label>{t('manager')}</label>
              <select value={form.manager_id} onChange={e => set('manager_id', e.target.value)}>
                <option value="">{t('unassigned')}</option>
                {employees.map(e => <option key={e.employee_id} value={e.employee_id}>{e.first_name} {e.last_name}</option>)}
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
