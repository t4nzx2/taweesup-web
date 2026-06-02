import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';

export default function Timesheet() {
  const { user } = useAuth();
  const { t } = useLang();
  const [status, setStatus] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const loadStatus = () => api.get('/timesheets/status').then(r => setStatus(r.data));
  const loadRecords = () => api.get(`/timesheets?employee_id=${user.employee_id}`).then(r => setRecords(r.data));

  useEffect(() => { loadStatus(); loadRecords(); }, []);

  const clockIn = async () => {
    setLoading(true); setMsg('');
    try { await api.post('/timesheets/clock-in'); setMsg(t('clockedInMsg')); loadStatus(); loadRecords(); }
    catch (e) { setMsg(e.response?.data?.error || t('error')); }
    finally { setLoading(false); }
  };

  const clockOut = async () => {
    setLoading(true); setMsg('');
    try { const { data } = await api.post('/timesheets/clock-out'); setMsg(`${t('clockedOut')} ${data.total_hours}h`); loadStatus(); loadRecords(); }
    catch (e) { setMsg(e.response?.data?.error || t('error')); }
    finally { setLoading(false); }
  };

  const isClockedIn = status?.clock_in_time && !status?.clock_out_time;

  return (
    <div>
      <div className="page-header"><h1>{t('timesheet')}</h1></div>

      <div className="card" style={{marginBottom: 24, textAlign:'center'}}>
        <p style={{color:'var(--text-muted)', marginBottom:8}}>{t('today')}: {new Date().toDateString()}</p>
        {status?.clock_in_time && <p style={{marginBottom:16}}>{t('clockedInAt')} <strong>{status.clock_in_time}</strong></p>}
        <div style={{display:'flex', gap:16, justifyContent:'center'}}>
          <button className="btn btn-success" onClick={clockIn} disabled={loading || isClockedIn} style={{fontSize:18, padding:'16px 40px'}}>
            {t('clockIn')}
          </button>
          <button className="btn btn-danger" onClick={clockOut} disabled={loading || !isClockedIn} style={{fontSize:18, padding:'16px 40px'}}>
            {t('clockOut')}
          </button>
        </div>
        {msg && <p style={{marginTop:12, fontWeight:600, color: msg.includes('Error') || msg.includes('ข้อผิดพลาด') ? 'var(--danger)' : 'var(--success)'}}>{msg}</p>}
      </div>

      <div className="card">
        <h2 style={{fontSize:15, fontWeight:700, marginBottom:16}}>{t('recentTimesheets')}</h2>
        {records.length === 0 ? <p className="empty">{t('noRecords')}</p> : (
          <table>
            <thead><tr><th>{t('date')}</th><th>{t('clockInTime')}</th><th>{t('clockOutTime')}</th><th>{t('hours')}</th></tr></thead>
            <tbody>
              {records.map(r => (
                <tr key={r.timesheet_id}>
                  <td>{r.work_date}</td>
                  <td>{r.clock_in_time || '—'}</td>
                  <td>{r.clock_out_time || <span className="badge badge-yellow">{t('active')}</span>}</td>
                  <td>{r.total_hours != null ? `${r.total_hours}h` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
