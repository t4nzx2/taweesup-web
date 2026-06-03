import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import api from '../api';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';
import { toBE } from '../utils';

const INCOME_CATEGORIES = ['รายได้จากลูกค้า', 'ค่าบริการ', 'ดอกเบี้ย', 'เงินอุดหนุน', 'อื่นๆ'];
const EXPENSE_CATEGORIES = ['เงินเดือนพนักงาน', 'สวัสดิการ', 'ค่าฝึกอบรม', 'ค่าสำนักงาน', 'ค่าอุปกรณ์', 'ค่าสาธารณูปโภค', 'อื่นๆ'];
const COLORS = ['#6c63ff','#22c55e','#f59e0b','#3b82f6','#ef4444','#8b5cf6','#06b6d4'];

const fmt = (n) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(n);
const fmtShort = (n) => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}k` : n;

export default function Accounts() {
  const { user } = useAuth();
  const { t } = useLang();
  const [summary, setSummary] = useState({ income: 0, expense: 0, net: 0, monthly: [], byCategory: [] });
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const canManage = ['HR Admin', 'Manager'].includes(user.role);

  const loadSummary = () => api.get('/transactions/summary').then(r => setSummary(r.data)).catch(() => {});
  const loadTx = () => {
    const q = new URLSearchParams();
    if (typeFilter) q.set('type', typeFilter);
    if (monthFilter) q.set('month', monthFilter);
    api.get(`/transactions?${q}`).then(r => setTransactions(r.data)).catch(() => {});
  };

  useEffect(() => { loadSummary(); }, []);
  useEffect(() => { loadTx(); }, [typeFilter, monthFilter]);

  const handleDelete = async (id) => {
    if (!confirm('ลบรายการนี้หรือไม่?')) return;
    await api.delete(`/transactions/${id}`);
    loadSummary(); loadTx();
  };

  const netColor = summary.net >= 0 ? 'var(--success)' : 'var(--danger)';

  // Pie data
  const incomeByCategory = summary.byCategory.filter(c => c.type === 'Income');
  const expenseByCategory = summary.byCategory.filter(c => c.type === 'Expense');

  return (
    <div>
      <div className="page-header">
        <h1>ระบบบัญชี</h1>
        {canManage && (
          <div style={{display:'flex', gap:10}}>
            <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
              + เพิ่มรายการ
            </button>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:20}}>
        <SummaryCard label="รายรับทั้งหมด" value={fmt(summary.income)} icon="↑" color="#22c55e" bg="#dcfce7" sub="Income" />
        <SummaryCard label="รายจ่ายทั้งหมด" value={fmt(summary.expense)} icon="↓" color="#ef4444" bg="#fee2e2" sub="Expense" />
        <SummaryCard
          label="ยอดคงเหลือสุทธิ"
          value={fmt(summary.net)}
          icon={summary.net >= 0 ? '✓' : '!'}
          color={netColor}
          bg={summary.net >= 0 ? '#dcfce7' : '#fee2e2'}
          sub={summary.net >= 0 ? 'กำไร' : 'ขาดทุน'}
        />
      </div>

      {/* Charts */}
      <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, marginBottom:20}}>
        {/* Area chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">รายรับ-รายจ่าย รายเดือน</span>
          </div>
          {summary.monthly.length === 0
            ? <p className="empty" style={{padding:20}}>ยังไม่มีข้อมูล</p>
            : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={summary.monthly} margin={{top:5,right:10,left:-10,bottom:0}}>
                <defs>
                  <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7" />
                <XAxis dataKey="month" tick={{fontSize:11,fill:'#8a93a8'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize:11,fill:'#8a93a8'}} axisLine={false} tickLine={false} tickFormatter={fmtShort} />
                <Tooltip formatter={(v,n) => [fmt(v), n==='income'?'รายรับ':'รายจ่าย']} contentStyle={{borderRadius:8,fontSize:12}} />
                <Area type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} fill="url(#gi)" name="income" />
                <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fill="url(#ge)" name="expense" />
              </AreaChart>
            </ResponsiveContainer>
          )}
          <div style={{display:'flex',gap:16,justifyContent:'center',marginTop:8}}>
            <Dot color="#22c55e" label="รายรับ" />
            <Dot color="#ef4444" label="รายจ่าย" />
          </div>
        </div>

        {/* Pie — expense by category */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">รายจ่ายตามหมวดหมู่</span>
          </div>
          {expenseByCategory.length === 0
            ? <p className="empty" style={{padding:20}}>ยังไม่มีข้อมูล</p>
            : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={expenseByCategory} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={75} paddingAngle={2}>
                  {expenseByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => fmt(v)} contentStyle={{borderRadius:8,fontSize:12}} />
                <Legend iconSize={10} wrapperStyle={{fontSize:11}} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Transaction table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">รายการธุรกรรม</span>
          <div style={{display:'flex',gap:10}}>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{width:'auto',minWidth:130,fontSize:13}}>
              <option value="">ทุกประเภท</option>
              <option value="Income">รายรับ</option>
              <option value="Expense">รายจ่าย</option>
            </select>
            <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} style={{width:'auto',fontSize:13}} />
          </div>
        </div>

        {transactions.length === 0
          ? <p className="empty"><div className="empty-icon">📒</div>ยังไม่มีรายการ</p>
          : (
          <table>
            <thead>
              <tr>
                <th>วันที่</th>
                <th>ประเภท</th>
                <th>หมวดหมู่</th>
                <th>รายละเอียด</th>
                <th style={{textAlign:'right'}}>จำนวนเงิน</th>
                <th>บันทึกโดย</th>
                {canManage && <th></th>}
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.transaction_id}>
                  <td style={{color:'var(--text-muted)',fontSize:12}}>{toBE(tx.transaction_date)}</td>
                  <td>
                    <span className={`badge ${tx.type === 'Income' ? 'badge-green' : 'badge-red'}`}>
                      {tx.type === 'Income' ? '↑ รายรับ' : '↓ รายจ่าย'}
                    </span>
                  </td>
                  <td>{tx.category}</td>
                  <td style={{color:'var(--text-muted)'}}>{tx.description || '—'}</td>
                  <td style={{textAlign:'right', fontWeight:700, color: tx.type === 'Income' ? 'var(--success)' : 'var(--danger)'}}>
                    {tx.type === 'Income' ? '+' : '-'}{fmt(tx.amount)}
                  </td>
                  <td style={{color:'var(--text-muted)',fontSize:12}}>{tx.recorded_by_name || '—'}</td>
                  {canManage && (
                    <td>
                      <div style={{display:'flex',gap:6}}>
                        <button className="btn-icon btn-sm" onClick={() => { setEditing(tx); setShowModal(true); }}>✏</button>
                        {user.role === 'HR Admin' && (
                          <button className="btn-icon btn-sm" style={{color:'var(--danger)'}} onClick={() => handleDelete(tx.transaction_id)}>🗑</button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <TxModal
          initial={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={() => { setShowModal(false); setEditing(null); loadSummary(); loadTx(); }}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon, color, bg, sub }) {
  return (
    <div className="card" style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div>
          <div style={{fontSize:12,color:'var(--text-muted)',fontWeight:500,marginBottom:6}}>{label}</div>
          <div style={{fontSize:24,fontWeight:800,color:'var(--text)',lineHeight:1}}>{value}</div>
        </div>
        <div style={{width:44,height:44,borderRadius:12,background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,color,fontWeight:700}}>{icon}</div>
      </div>
      <div style={{fontSize:12,color,fontWeight:600}}>{sub}</div>
    </div>
  );
}

function Dot({ color, label }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--text-muted)'}}>
      <div style={{width:8,height:8,borderRadius:'50%',background:color}} />{label}
    </div>
  );
}

function TxModal({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial ? {
    type: initial.type, category: initial.category,
    amount: initial.amount, description: initial.description || '',
    transaction_date: initial.transaction_date
  } : { type: 'Income', category: '', amount: '', description: '', transaction_date: new Date().toISOString().slice(0,10) });
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({...f, [k]: v}));
  const categories = form.type === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (initial) await api.put(`/transactions/${initial.transaction_id}`, form);
      else await api.post('/transactions', form);
      onSaved();
    } catch (err) { setError(err.response?.data?.error || 'เกิดข้อผิดพลาด'); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{initial ? 'แก้ไขรายการ' : 'เพิ่มรายการใหม่'}</h2>
        <form onSubmit={submit}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>

            {/* Type toggle */}
            <div className="form-group">
              <label>ประเภท</label>
              <div style={{display:'flex',gap:10,marginTop:4}}>
                {['Income','Expense'].map(tp => (
                  <button key={tp} type="button"
                    style={{flex:1,padding:'10px',borderRadius:8,border:'2px solid',
                      borderColor: form.type===tp ? (tp==='Income'?'var(--success)':'var(--danger)') : 'var(--border)',
                      background: form.type===tp ? (tp==='Income'?'#dcfce7':'#fee2e2') : 'transparent',
                      color: form.type===tp ? (tp==='Income'?'var(--success)':'var(--danger)') : 'var(--text-muted)',
                      fontWeight:600, fontSize:13, cursor:'pointer'}}
                    onClick={() => set('type', tp)}>
                    {tp==='Income' ? '↑ รายรับ' : '↓ รายจ่าย'}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>หมวดหมู่</label>
                <select required value={form.category} onChange={e => set('category', e.target.value)}>
                  <option value="">เลือกหมวดหมู่...</option>
                  {categories.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>จำนวนเงิน (บาท)</label>
                <input type="number" min="0" step="0.01" required value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" />
              </div>
            </div>

            <div className="form-group">
              <label>วันที่</label>
              <input type="date" required value={form.transaction_date} onChange={e => set('transaction_date', e.target.value)} />
            </div>

            <div className="form-group">
              <label>รายละเอียด</label>
              <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="บันทึกรายละเอียดเพิ่มเติม..." />
            </div>
          </div>

          {error && <p style={{color:'var(--danger)',marginTop:8,fontSize:13}}>{error}</p>}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>ยกเลิก</button>
            <button type="submit" className="btn btn-primary">บันทึก</button>
          </div>
        </form>
      </div>
    </div>
  );
}
