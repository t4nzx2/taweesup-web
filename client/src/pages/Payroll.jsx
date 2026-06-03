import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';
import { formatTHB, toBE } from '../utils';

export default function Payroll() {
  const { user } = useAuth();
  const { t } = useLang();
  const [records, setRecords] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const isHR = user.role === 'HR Admin';

  const load = () => {
    const url = isHR ? '/payroll' : '/payroll/my';
    api.get(url).then(r => setRecords(r.data));
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="page-header">
        <h1>{t('payroll')}</h1>
        {isHR && <button className="btn btn-primary" onClick={() => setShowModal(true)}>{t('addPayroll')}</button>}
      </div>
      <div className="card">
        {records.length === 0 ? <p className="empty">{t('noPayrollRecords')}</p> : (
          <table>
            <thead>
              <tr>
                {isHR && <th>{t('employee')}</th>}
                <th>{t('period')}</th><th>{t('grossPay')}</th><th>{t('tax')}</th><th>{t('netPay')}</th><th>{t('paymentDate')}</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.payroll_id}>
                  {isHR && <td>{r.employee_name}</td>}
                  <td>{toBE(r.pay_period_start)} – {toBE(r.pay_period_end)}</td>
                  <td>{formatTHB(r.gross_pay)}</td>
                  <td>{formatTHB(r.tax_deductions)}</td>
                  <td><strong>{formatTHB(r.net_pay)}</strong></td>
                  <td>{toBE(r.payment_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {showModal && <PayrollModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />}
    </div>
  );
}

function PayrollModal({ onClose, onSaved }) {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ employee_id:'', pay_period_start:'', pay_period_end:'', gross_pay:'', tax_deductions:'', payment_date:'' });
  const [error, setError] = useState('');
  const { t } = useLang();

  useEffect(() => { api.get('/employees').then(r => setEmployees(r.data)); }, []);
  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const submit = async (e) => {
    e.preventDefault();
    try { await api.post('/payroll', form); onSaved(); }
    catch (err) { setError(err.response?.data?.error || t('error')); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{t('addPayrollTitle')}</h2>
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
              <div className="form-group"><label>{t('periodStart')}</label><input type="date" required value={form.pay_period_start} onChange={e => set('pay_period_start', e.target.value)} /></div>
              <div className="form-group"><label>{t('periodEnd')}</label><input type="date" required value={form.pay_period_end} onChange={e => set('pay_period_end', e.target.value)} /></div>
              <div className="form-group"><label>{t('grossPay')}</label><input type="number" required value={form.gross_pay} onChange={e => set('gross_pay', e.target.value)} /></div>
              <div className="form-group"><label>{t('taxDeductions')}</label><input type="number" required value={form.tax_deductions} onChange={e => set('tax_deductions', e.target.value)} /></div>
            </div>
            <div className="form-group"><label>{t('paymentDate')}</label><input type="date" value={form.payment_date} onChange={e => set('payment_date', e.target.value)} /></div>
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
