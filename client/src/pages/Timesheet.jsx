import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';
import { toBE, todayBE } from '../utils';
import { formatTHB } from '../utils';

export default function Timesheet() {
  const { user } = useAuth();
  const { t } = useLang();
  const [status, setStatus] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const isHR = ['HR Admin', 'Manager'].includes(user.role);

  const loadStatus = () => api.get('/timesheets/status').then(r => setStatus(r.data));
  const loadRecords = () => api.get(`/timesheets?employee_id=${user.employee_id}`).then(r => setRecords(r.data));

  useEffect(() => { loadStatus(); loadRecords(); }, []);

  const clockIn = async () => {
    setLoading(true); setMsg('');
    try {
      const { data } = await api.post('/timesheets/clock-in');
      if (data.is_late) setMsg(`⚠️ ${t('lateNotice')} ${formatTHB(data.deduction)}`);
      else setMsg('✅ ' + t('clockedInMsg'));
      loadStatus(); loadRecords();
    }
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
        <p style={{color:'var(--text-muted)', marginBottom:4}}>{t('today')}: {todayBE()}</p>
        <p style={{color:'var(--text-light)', fontSize:11, marginBottom:12}}>{t('lateRuleNote')}</p>
        {status?.clock_in_time && (
          <p style={{marginBottom:16}}>
            {t('clockedInAt')} <strong>{status.clock_in_time}</strong>
            {status.is_late ? <span className="badge badge-red" style={{marginLeft:8}}>{t('lateBadge')}</span>
                            : <span className="badge badge-green" style={{marginLeft:8}}>{t('onTime')}</span>}
          </p>
        )}
        <div style={{display:'flex', gap:16, justifyContent:'center'}}>
          <button className="btn btn-success" onClick={clockIn} disabled={loading || isClockedIn} style={{fontSize:18, padding:'16px 40px'}}>
            {t('clockIn')}
          </button>
          <button className="btn btn-danger" onClick={clockOut} disabled={loading || !isClockedIn} style={{fontSize:18, padding:'16px 40px'}}>
            {t('clockOut')}
          </button>
        </div>
        {msg && <p style={{marginTop:12, fontWeight:600, color: msg.includes('⚠️') || msg.includes('Error') || msg.includes('ข้อผิดพลาด') ? 'var(--danger)' : 'var(--success)'}}>{msg}</p>}
      </div>

      {isHR && <AttendanceSummary t={t} />}

      <div className="card">
        <h2 style={{fontSize:15, fontWeight:700, marginBottom:16}}>{t('recentTimesheets')}</h2>
        {records.length === 0 ? <p className="empty">{t('noRecords')}</p> : (
          <table>
            <thead><tr><th>{t('date')}</th><th>{t('clockInTime')}</th><th>{t('clockOutTime')}</th><th>{t('hours')}</th><th>{t('status')}</th></tr></thead>
            <tbody>
              {records.map(r => (
                <tr key={r.timesheet_id}>
                  <td>{toBE(r.work_date)}</td>
                  <td>{r.clock_in_time || '—'}</td>
                  <td>{r.clock_out_time || <span className="badge badge-yellow">{t('active')}</span>}</td>
                  <td>{r.total_hours != null ? `${r.total_hours}h` : '—'}</td>
                  <td>{r.is_late ? <span className="badge badge-red">{t('lateBadge')} -{r.late_deduction}฿</span> : <span className="badge badge-green">{t('onTime')}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function AttendanceSummary({ t }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get(`/timesheets/summary?month=${month}`).then(r => setRows(r.data.rows)).catch(() => {});
  }, [month]);

  return (
    <div className="card" style={{marginBottom:24}}>
      <div className="card-header">
        <span className="card-title">{t('attendanceSummary')}</span>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{width:'auto', fontSize:13}} />
      </div>
      {rows.length === 0 ? <p className="empty">{t('noData')}</p> : (
        <table>
          <thead>
            <tr>
              <th>{t('employee')}</th>
              <th style={{textAlign:'center'}}>{t('daysWorked')}</th>
              <th style={{textAlign:'center'}}>{t('lateDays')}</th>
              <th style={{textAlign:'right'}}>{t('lateDeduction')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.employee_id}>
                <td style={{fontWeight:600}}>{r.employee_name}</td>
                <td style={{textAlign:'center'}}>{r.days_worked}</td>
                <td style={{textAlign:'center'}}>
                  {r.late_days > 0 ? <span className="badge badge-red">{r.late_days}</span> : <span style={{color:'var(--text-muted)'}}>0</span>}
                </td>
                <td style={{textAlign:'right', color: r.total_deduction > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight:600}}>
                  {r.total_deduction > 0 ? `-${r.total_deduction}฿` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
