import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';

const statusBadge = { Pending: 'badge-yellow', Approved: 'badge-green', Denied: 'badge-red' };

export default function LeaveRequests() {
  const { user } = useAuth();
  const { t } = useLang();
  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const isHR = user.role !== 'Employee';

  const load = () => {
    const query = isHR ? '' : `?employee_id=${user.employee_id}`;
    api.get(`/leave${query}`).then(r => setRequests(r.data));
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    await api.put(`/leave/${id}/status`, { approval_status: status });
    load();
  };

  const deleteRequest = async (id) => {
    if (!confirm(t('deleteConfirm'))) return;
    await api.delete(`/leave/${id}`);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h1>{t('leaveRequests')}</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>{t('requestLeave')}</button>
      </div>
      <div className="card">
        <div style={{display:'flex', gap:12, marginBottom:16}}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{width:'auto', minWidth:160}}>
            <option value="">All Status</option>
            <option>Pending</option><option>Approved</option><option>Denied</option>
          </select>
        </div>
        {requests.filter(r => !statusFilter || r.approval_status === statusFilter).length === 0
          ? <p className="empty">{t('noLeaveRequests')}</p>
          : (
          <table>
            <thead>
              <tr>
                {isHR && <th>{t('employee')}</th>}
                <th>{t('leaveType')}</th><th>{t('from')}</th><th>{t('to')}</th><th>{t('reason')}</th><th>{t('status')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {requests.filter(r => !statusFilter || r.approval_status === statusFilter).map(r => (
                <tr key={r.leave_id}>
                  {isHR && <td>{r.employee_name}</td>}
                  <td>{r.leave_type}</td>
                  <td>{r.start_date}</td>
                  <td>{r.end_date}</td>
                  <td>{r.reason || '—'}</td>
                  <td><span className={`badge ${statusBadge[r.approval_status]}`}>{r.approval_status}</span></td>
                  {isHR && (
                    <td style={{display:'flex', gap:6}}>
                      {r.approval_status === 'Pending' && <>
                        <button className="btn btn-success btn-sm" onClick={() => updateStatus(r.leave_id, 'Approved')}>{t('approve')}</button>
                        <button className="btn btn-danger btn-sm" onClick={() => updateStatus(r.leave_id, 'Denied')}>{t('deny')}</button>
                      </>}
                    </td>
                  )}
                  {!isHR && r.approval_status === 'Pending' && (
                    <td><button className="btn btn-danger btn-sm" onClick={() => deleteRequest(r.leave_id)}>{t('cancelRequest')}</button></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {showModal && <LeaveModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />}
    </div>
  );
}

function LeaveModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ leave_type: 'PTO', start_date: '', end_date: '', reason: '' });
  const [error, setError] = useState('');
  const { t } = useLang();
  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const submit = async (e) => {
    e.preventDefault();
    try { await api.post('/leave', form); onSaved(); }
    catch (err) { setError(err.response?.data?.error || t('error')); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{t('requestLeaveTitle')}</h2>
        <form onSubmit={submit}>
          <div style={{display:'flex', flexDirection:'column', gap:12}}>
            <div className="form-group">
              <label>{t('leaveType')}</label>
              <select value={form.leave_type} onChange={e => set('leave_type', e.target.value)}>
                <option>PTO</option><option>Sick</option><option>Unpaid</option>
              </select>
            </div>
            <div className="form-grid">
              <div className="form-group"><label>{t('startDate')}</label><input type="date" required value={form.start_date} onChange={e => set('start_date', e.target.value)} /></div>
              <div className="form-group"><label>{t('endDate')}</label><input type="date" required value={form.end_date} onChange={e => set('end_date', e.target.value)} /></div>
            </div>
            <div className="form-group"><label>{t('reason')}</label><textarea rows={3} value={form.reason} onChange={e => set('reason', e.target.value)} /></div>
          </div>
          {error && <p style={{color:'var(--danger)', marginTop:8, fontSize:13}}>{error}</p>}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('cancel')}</button>
            <button type="submit" className="btn btn-primary">{t('submit')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
