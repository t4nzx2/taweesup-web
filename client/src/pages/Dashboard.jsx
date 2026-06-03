import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import api from '../api';
import { useLang } from '../LangContext';
import { useAuth } from '../AuthContext';
import { formatTHB, toBE, todayBE } from '../utils';

const monthlyData = [
  { month: 'Jan', income: 6200, expense: 3100 }, { month: 'Feb', income: 7800, expense: 3400 },
  { month: 'Mar', income: 7200, expense: 3800 }, { month: 'Apr', income: 8500, expense: 3600 },
  { month: 'May', income: 7900, expense: 4100 }, { month: 'Jun', income: 8200, expense: 3900 },
  { month: 'Jul', income: 9100, expense: 4300 }, { month: 'Aug', income: 8600, expense: 4000 },
  { month: 'Sep', income: 9400, expense: 4200 }, { month: 'Oct', income: 8800, expense: 3800 },
  { month: 'Nov', income: 9600, expense: 4500 }, { month: 'Dec', income: 10200, expense: 4800 },
];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [employees, setEmployees] = useState([]);
  const navigate = useNavigate();
  const { t } = useLang();
  const { user } = useAuth();
  const today = todayBE();

  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data)).catch(() => {});
    api.get('/employees').then(r => setEmployees(r.data.slice(0, 5))).catch(() => {});
  }, []);

  if (!data) return <div className="empty" style={{paddingTop:80}}><div className="empty-icon">⏳</div>{t('loading')}</div>;

  return (
    <div>
      {/* Welcome + date */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22, fontWeight:700}}>Welcome back, {user.name?.split(' ')[0]}! 👋</h1>
          <p style={{color:'var(--text-muted)', marginTop:2, fontSize:13}}>{today}</p>
        </div>
        <button className="btn btn-primary" style={{gap:8}} onClick={async () => {
          const { data } = await api.get('/employees');
          const headers = ['ID','First Name','Last Name','Email','Department','Job Title','Status','Hire Date'];
          const rows = data.map(e => [e.employee_id,e.first_name,e.last_name,e.email,e.department_name||'',e.job_title||'',e.employment_status,e.hire_date]);
          const csv = [headers,...rows].map(r=>r.map(v=>`"${v}"`).join(',')).join('\n');
          const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
          a.download = `hrit_report_${new Date().toISOString().slice(0,10)}.csv`; a.click();
        }}>
          <span>↓</span> Export
        </button>
      </div>

      {/* Stat cards row */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:20}}>
        <StatCard
          title="Total Employees"
          value={data.total_employees}
          sub={`${data.dept_counts.length} departments`}
          color="#6c63ff" bg="#ede9ff" icon="👥"
          trend="+5% this month" up />
        <StatCard
          title="Attendance Rate"
          value="90%"
          sub="Since last month"
          color="#22c55e" bg="#dcfce7" icon="✅"
          trend="+20%" up />
        <StatCard
          title="Pending Leave"
          value={data.pending_leave}
          sub="Awaiting approval"
          color="#f59e0b" bg="#fef9c3" icon="📅"
          trend={data.pending_leave > 0 ? 'Needs review' : 'All clear'} />
      </div>

      {/* Charts row */}
      <div style={{display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:16, marginBottom:20}}>
        {/* Line chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Payroll Statistics</span>
            <a href="/payroll" style={{fontSize:12, color:'var(--primary)', fontWeight:600}}>More details →</a>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyData} margin={{top:5, right:10, left:-20, bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7" />
              <XAxis dataKey="month" tick={{fontSize:11, fill:'#8a93a8'}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize:11, fill:'#8a93a8'}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v/1000}k`} />
              <Tooltip formatter={(v, n) => [formatTHB(v), n === 'income' ? 'รายรับ' : 'รายจ่าย']} contentStyle={{borderRadius:8, border:'1px solid #e8eaf0', fontSize:12}} />
              <Line type="monotone" dataKey="income" stroke="#6c63ff" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="expense" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div style={{display:'flex', gap:16, justifyContent:'center', marginTop:8}}>
            <LegendDot color="#6c63ff" label="Income" />
            <LegendDot color="#f59e0b" label="Expense" />
          </div>
        </div>

        {/* Department bar */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Employees by Dept.</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.dept_counts} layout="vertical" margin={{top:0, right:10, left:0, bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7" horizontal={false} />
              <XAxis type="number" tick={{fontSize:11, fill:'#8a93a8'}} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="department_name" tick={{fontSize:11, fill:'#8a93a8'}} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={{borderRadius:8, border:'1px solid #e8eaf0', fontSize:12}} />
              <Bar dataKey="count" fill="#6c63ff" radius={[0,6,6,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Employee list */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Employees</span>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/employees')}>View All →</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Job Title</th>
              <th>Hire Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(e => (
              <tr key={e.employee_id} style={{cursor:'pointer'}} onClick={() => navigate(`/employees/${e.employee_id}`)}>
                <td>
                  <div style={{display:'flex', alignItems:'center', gap:10}}>
                    <div className="avatar avatar-sm">{e.first_name[0]}{e.last_name[0]}</div>
                    <div>
                      <div style={{fontWeight:600, fontSize:13}}>{e.first_name} {e.last_name}</div>
                      <div style={{fontSize:11, color:'var(--text-muted)'}}>{e.email}</div>
                    </div>
                  </div>
                </td>
                <td>{e.department_name || '—'}</td>
                <td style={{color:'var(--text-muted)'}}>{e.job_title || '—'}</td>
                <td style={{color:'var(--text-muted)'}}>{toBE(e.hire_date)}</td>
                <td>
                  <span className={`badge ${e.employment_status === 'Active' ? 'badge-green' : e.employment_status === 'On Leave' ? 'badge-yellow' : 'badge-red'}`}>
                    {e.employment_status}
                  </span>
                </td>
              </tr>
            ))}
            {employees.length === 0 && <tr><td colSpan={5} className="empty">No employees yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ title, value, sub, color, bg, icon, trend, up }) {
  return (
    <div className="card" style={{display:'flex', flexDirection:'column', gap:12}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
        <div>
          <div style={{fontSize:12, color:'var(--text-muted)', fontWeight:500, marginBottom:6}}>{title}</div>
          <div style={{fontSize:32, fontWeight:800, color:'var(--text)', lineHeight:1}}>{value}</div>
        </div>
        <div style={{width:44, height:44, borderRadius:12, background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20}}>{icon}</div>
      </div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <span style={{fontSize:12, color:'var(--text-muted)'}}>{sub}</span>
        {trend && <span style={{fontSize:12, fontWeight:600, color: up ? 'var(--success)' : 'var(--text-muted)'}}>{up ? '↑' : ''} {trend}</span>}
      </div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div style={{display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-muted)'}}>
      <div style={{width:8, height:8, borderRadius:'50%', background:color}} />
      {label}
    </div>
  );
}
