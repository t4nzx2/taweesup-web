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
  const [editing, setEditing] = useState(null);
  const isHR = user.role === 'HR Admin';

  const load = () => {
    const url = isHR ? '/payroll' : '/payroll/my';
    api.get(url).then(r => setRecords(r.data));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('ลบรายการเงินเดือนนี้หรือไม่?')) return;
    await api.delete(`/payroll/${id}`);
    load();
  };

  const exportPDF = () => {
    const win = window.open('', '_blank');
    const rows = records.map(r => `
      <tr>
        ${isHR ? `<td>${r.employee_name || ''}</td>` : ''}
        <td>${r.pay_period_start} – ${r.pay_period_end}</td>
        <td style="text-align:right">${Number(r.gross_pay).toLocaleString('th-TH')} ฿</td>
        <td style="text-align:right">${Number(r.tax_deductions).toLocaleString('th-TH')} ฿</td>
        <td style="text-align:right"><strong>${Number(r.net_pay).toLocaleString('th-TH')} ฿</strong></td>
        <td>${r.payment_date || '—'}</td>
      </tr>`).join('');
    win.document.write(`
      <!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Payroll Report</title>
      <style>
        body { font-family: sans-serif; padding: 32px; color: #1a1a2e; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        p.sub { color: #666; font-size: 13px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: #6c63ff; color: white; padding: 10px 12px; text-align: left; }
        td { padding: 9px 12px; border-bottom: 1px solid #e8eaf0; }
        tr:nth-child(even) td { background: #f8f9fe; }
        .footer { margin-top: 24px; font-size: 12px; color: #999; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <h1>📄 Payroll Report — Taweesup.Web</h1>
      <p class="sub">Generated: ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })} · ${records.length} record(s)</p>
      <table>
        <thead><tr>
          ${isHR ? '<th>Employee</th>' : ''}
          <th>Period</th><th>Gross Pay</th><th>Deductions</th><th>Net Pay</th><th>Payment Date</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">Taweesup.Web HR System — Confidential</div>
      <script>window.onload = () => { window.print(); }<\/script>
      </body></html>`);
    win.document.close();
  };

  return (
    <div>
      <div className="page-header">
        <h1>{t('payroll')}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {records.length > 0 && (
            <button className="btn btn-outline" onClick={exportPDF}>
              🖨 Export PDF
            </button>
          )}
          {isHR && <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>{t('addPayroll')}</button>}
        </div>
      </div>
      <div className="card">
        {records.length === 0 ? <p className="empty">{t('noPayrollRecords')}</p> : (
          <table>
            <thead>
              <tr>
                {isHR && <th>{t('employee')}</th>}
                <th>{t('period')}</th><th>{t('grossPay')}</th><th>{t('tax')}</th><th>{t('netPay')}</th><th>{t('paymentDate')}</th>
                {isHR && <th></th>}
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
                  {isHR && (
                    <td>
                      <div style={{display:'flex', gap:6}}>
                        <button className="btn-icon btn-sm" title={t('edit')} onClick={() => { setEditing(r); setShowModal(true); }}>✏</button>
                        <button className="btn-icon btn-sm" style={{color:'var(--danger)'}} onClick={() => handleDelete(r.payroll_id)}>🗑</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {showModal && <PayrollModal initial={editing} onClose={() => { setShowModal(false); setEditing(null); }} onSaved={() => { setShowModal(false); setEditing(null); load(); }} />}
    </div>
  );
}

function PayrollModal({ initial, onClose, onSaved }) {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(initial ? {
    employee_id: initial.employee_id,
    pay_period_start: initial.pay_period_start, pay_period_end: initial.pay_period_end,
    gross_pay: initial.gross_pay, tax_deductions: initial.tax_deductions, payment_date: initial.payment_date || ''
  } : { employee_id:'', pay_period_start:'', pay_period_end:'', gross_pay:'', tax_deductions:'', payment_date:'' });
  const [error, setError] = useState('');
  const { t } = useLang();

  useEffect(() => { api.get('/employees').then(r => setEmployees(r.data)); }, []);
  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (initial) await api.put(`/payroll/${initial.payroll_id}`, form);
      else await api.post('/payroll', form);
      onSaved();
    } catch (err) { setError(err.response?.data?.error || t('error')); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{initial ? t('editPayrollTitle') : t('addPayrollTitle')}</h2>
        <form onSubmit={submit}>
          <div style={{display:'flex', flexDirection:'column', gap:12}}>
            <div className="form-group">
              <label>{t('employee')}</label>
              <select required value={form.employee_id} onChange={e => set('employee_id', e.target.value)} disabled={!!initial}>
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
          {!initial && (
            <p style={{fontSize:12, color:'var(--text-muted)', marginTop:10, padding:'8px 12px', background:'var(--bg)', borderRadius:8}}>
              ℹ️ {t('lateDeduction')}: ระบบจะหักเงินมาสายในช่วงเวลานี้ให้อัตโนมัติ (Late deductions are added automatically)
            </p>
          )}
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
