import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';
import { toBE } from '../utils';

export default function EmployeeProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [emp, setEmp] = useState(null);
  const [tab, setTab] = useState('info');
  const [reviews, setReviews] = useState([]);
  const [training, setTraining] = useState([]);
  const [benefits, setBenefits] = useState([]);
  const [account, setAccount] = useState(undefined); // undefined=loading, null=no account

  const loadAccount = () => {
    if (user.role === 'HR Admin') {
      api.get(`/users/by-employee/${id}`).then(r => setAccount(r.data)).catch(() => setAccount(null));
    }
  };

  useEffect(() => {
    api.get(`/employees/${id}`).then(r => setEmp(r.data)).catch(() => navigate('/employees'));
    api.get(`/reviews?employee_id=${id}`).then(r => setReviews(r.data));
    api.get(`/training?employee_id=${id}`).then(r => setTraining(r.data));
    if (user.role !== 'Employee') api.get(`/benefits?employee_id=${id}`).then(r => setBenefits(r.data));
    loadAccount();
  }, [id]);

  if (!emp) return <div className="empty">{t('loading')}</div>;

  const initials = `${emp.first_name[0]}${emp.last_name[0]}`;

  const handleTerminate = async () => {
    if (!confirm(`เปลี่ยนสถานะ ${emp.first_name} ${emp.last_name} เป็น "Terminated" หรือไม่?`)) return;
    try {
      await api.put(`/employees/${id}`, { ...emp, employment_status: 'Terminated' });
      navigate('/employees');
    } catch { alert('เกิดข้อผิดพลาด'); }
  };

  const handleDelete = async () => {
    if (!confirm(`⚠️ ลบพนักงาน "${emp.first_name} ${emp.last_name}" ออกจากระบบถาวรหรือไม่?\n\nข้อมูลทั้งหมดจะหายไป`)) return;
    try {
      await api.delete(`/employees/${id}`);
      navigate('/employees');
    } catch (e) { alert(e.response?.data?.error || 'เกิดข้อผิดพลาด'); }
  };

  return (
    <div>
      <div className="page-header">
        <h1>{t('employeeProfile')}</h1>
        <div style={{display:'flex', gap:8}}>
          <button className="btn btn-secondary" onClick={() => navigate('/employees')}>{t('back')}</button>
          {user.role === 'HR Admin' && emp.employment_status !== 'Terminated' && (
            <button className="btn btn-warning btn-sm" onClick={handleTerminate}>🚫 ให้ออกจากงาน</button>
          )}
          {user.role === 'HR Admin' && (
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>🗑 ลบออกจากระบบ</button>
          )}
        </div>
      </div>

      <div className="card" style={{marginBottom: 16}}>
        <div style={{display:'flex', alignItems:'center', gap:20}}>
          <div style={{width:72, height:72, borderRadius:'50%', background:'var(--primary)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, fontWeight:700}}>{initials}</div>
          <div style={{flex:1}}>
            <h2 style={{fontSize:22, fontWeight:800}}>{emp.first_name} {emp.last_name}</h2>
            <p style={{color:'var(--text-muted)'}}>{emp.job_title || t('noTitle')} · {emp.department_name || t('noDept')}</p>
            <p style={{color:'var(--text-muted)', fontSize:12}}>{emp.email} · {emp.phone_number}</p>
          </div>
          <span className={`badge ${emp.employment_status === 'Active' ? 'badge-green' : emp.employment_status === 'On Leave' ? 'badge-yellow' : 'badge-red'}`}>{emp.employment_status}</span>
        </div>
      </div>

      <div style={{display:'flex', gap:8, marginBottom:16, flexWrap:'wrap'}}>
        {[
          ['info', t('info')],
          ['reviews', t('reviews')],
          ...(user.role === 'HR Admin' ? [['account', '🔑 บัญชีผู้ใช้']] : []),
        ].map(([key, label]) => (
          <button key={key} className={`btn ${tab === key ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="card">
          <div className="form-grid">
            <InfoRow label={t('employeeId')} value={`#${emp.employee_id}`} />
            <InfoRow label={t('hireDate')} value={toBE(emp.hire_date)} />
            <InfoRow label={t('dateOfBirth')} value={toBE(emp.date_of_birth)} />
            <InfoRow label={t('phone')} value={emp.phone_number || '—'} />
            <InfoRow label={t('email')} value={emp.email} />
            <InfoRow label={t('status')} value={emp.employment_status} />
          </div>
        </div>
      )}

      {tab === 'reviews' && (
        <div className="card">
          <h3 style={{marginBottom:12}}>{t('performanceReviews')}</h3>
          {reviews.length === 0 ? <p className="empty">{t('noReviews')}</p> : (
            <table>
              <thead><tr><th>{t('date')}</th><th>{t('reviewer')}</th><th>{t('score')}</th><th>{t('comments')}</th></tr></thead>
              <tbody>
                {reviews.map(r => (
                  <tr key={r.review_id}>
                    <td>{r.review_date}</td>
                    <td>{r.reviewer_name}</td>
                    <td>{'★'.repeat(r.performance_score)}{'☆'.repeat(5 - r.performance_score)}</td>
                    <td>{r.comments || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'account' && user.role === 'HR Admin' && (
        <AccountTab employeeId={id} account={account} onRefresh={loadAccount} />
      )}
    </div>
  );
}

function AccountTab({ employeeId, account, onRefresh }) {
  const [form, setForm] = useState({ username: '', password: '', role: 'Employee' });
  const [pwForm, setPwForm] = useState({ new_password: '', confirm: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const createAccount = async (e) => {
    e.preventDefault(); setErr(''); setMsg('');
    try {
      await api.post('/users', { employee_id: employeeId, ...form });
      setMsg('สร้างบัญชีสำเร็จ!'); onRefresh();
    } catch (ex) { setErr(ex.response?.data?.error || 'เกิดข้อผิดพลาด'); }
  };

  const resetPassword = async (e) => {
    e.preventDefault(); setErr(''); setMsg('');
    if (pwForm.new_password !== pwForm.confirm) { setErr('รหัสผ่านไม่ตรงกัน'); return; }
    try {
      await api.put(`/users/${account.user_id}/reset-password`, { new_password: pwForm.new_password });
      setMsg('เปลี่ยนรหัสผ่านสำเร็จ!'); setPwForm({ new_password: '', confirm: '' });
    } catch (ex) { setErr(ex.response?.data?.error || 'เกิดข้อผิดพลาด'); }
  };

  const updateRole = async (role) => {
    setErr(''); setMsg('');
    try { await api.put(`/users/${account.user_id}/role`, { role }); setMsg('อัปเดต Role สำเร็จ!'); onRefresh(); }
    catch (ex) { setErr(ex.response?.data?.error || 'เกิดข้อผิดพลาด'); }
  };

  const deleteAccount = async () => {
    if (!confirm('ลบบัญชีผู้ใช้นี้หรือไม่? พนักงานจะไม่สามารถเข้าสู่ระบบได้')) return;
    try { await api.delete(`/users/${account.user_id}`); setMsg('ลบบัญชีแล้ว'); onRefresh(); }
    catch (ex) { setErr(ex.response?.data?.error || 'เกิดข้อผิดพลาด'); }
  };

  return (
    <div style={{display:'flex', flexDirection:'column', gap:16}}>
      {msg && <div style={{background:'#dcfce7', color:'#166534', padding:'10px 14px', borderRadius:8, fontSize:13, fontWeight:600}}>{msg}</div>}
      {err && <div style={{background:'#fee2e2', color:'#991b1b', padding:'10px 14px', borderRadius:8, fontSize:13}}>{err}</div>}

      {!account ? (
        /* No account yet — create one */
        <div className="card">
          <h3 style={{fontWeight:700, marginBottom:4}}>สร้างบัญชีผู้ใช้</h3>
          <p style={{color:'var(--text-muted)', fontSize:13, marginBottom:16}}>พนักงานคนนี้ยังไม่มี account สำหรับเข้าสู่ระบบ</p>
          <form onSubmit={createAccount}>
            <div className="form-grid" style={{marginBottom:12}}>
              <div className="form-group">
                <label>Username</label>
                <input required value={form.username} onChange={e => set('username', e.target.value)} placeholder="เช่น john.doe" />
              </div>
              <div className="form-group">
                <label>รหัสผ่าน (อย่างน้อย 6 ตัว)</label>
                <input type="password" required minLength={6} value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••" />
              </div>
            </div>
            <div className="form-group" style={{marginBottom:16}}>
              <label>สิทธิ์การเข้าถึง</label>
              <select value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="Employee">Employee — ดูข้อมูลตนเองได้</option>
                <option value="Manager">Manager — อนุมัติลา, เขียน Review ได้</option>
                <option value="HR Admin">HR Admin — เข้าถึงทุกอย่าง</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary">สร้างบัญชี</button>
          </form>
        </div>
      ) : (
        /* Has account — show info + manage */
        <>
          <div className="card">
            <h3 style={{fontWeight:700, marginBottom:12}}>ข้อมูลบัญชี</h3>
            <div className="form-grid">
              <div>
                <div style={{fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:2}}>Username</div>
                <div style={{fontWeight:700, fontSize:16}}>{account.username}</div>
              </div>
              <div>
                <div style={{fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:4}}>Role</div>
                <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
                  {['Employee','Manager','HR Admin'].map(r => (
                    <button key={r} type="button"
                      className={`btn btn-sm ${account.role === r ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => account.role !== r && updateRole(r)}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{fontWeight:700, marginBottom:12}}>เปลี่ยนรหัสผ่าน</h3>
            <form onSubmit={resetPassword}>
              <div className="form-grid" style={{marginBottom:12}}>
                <div className="form-group">
                  <label>รหัสผ่านใหม่</label>
                  <input type="password" required minLength={6} value={pwForm.new_password} onChange={e => setPwForm(p => ({...p, new_password: e.target.value}))} placeholder="อย่างน้อย 6 ตัว" />
                </div>
                <div className="form-group">
                  <label>ยืนยันรหัสผ่าน</label>
                  <input type="password" required value={pwForm.confirm} onChange={e => setPwForm(p => ({...p, confirm: e.target.value}))} placeholder="กรอกซ้ำอีกครั้ง" />
                </div>
              </div>
              <button type="submit" className="btn btn-warning">เปลี่ยนรหัสผ่าน</button>
            </form>
          </div>

          <div className="card" style={{borderLeft:'4px solid var(--danger)'}}>
            <h3 style={{fontWeight:700, marginBottom:4}}>Danger Zone</h3>
            <p style={{color:'var(--text-muted)', fontSize:13, marginBottom:12}}>ลบบัญชีนี้จะทำให้พนักงานเข้าสู่ระบบไม่ได้</p>
            <button className="btn btn-danger btn-sm" onClick={deleteAccount}>ลบบัญชีผู้ใช้</button>
          </div>
        </>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div style={{fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:2}}>{label}</div>
      <div style={{fontWeight:500}}>{value}</div>
    </div>
  );
}
