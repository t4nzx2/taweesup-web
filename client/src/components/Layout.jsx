import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import api from '../api';
import './Layout.css';

const mainNav = [
  { to: '/', key: 'dashboard', icon: '▦', exact: true },
  { to: '/employees', key: 'employees', icon: '⊹' },
  { to: '/departments', key: 'departments', icon: '⊞' },
  { to: '/timesheet', key: 'timesheet', icon: '◷' },
  { to: '/leave', key: 'leaveRequests', icon: '◫' },
  { to: '/reviews', key: 'performance', icon: '★' },
];
const mgmtNav = [
  { to: '/payroll', key: 'payroll', icon: '$', restricted: true },
  { to: '/accounts', key: 'accounting', icon: '฿', restricted: true },
  { to: '/incidents', key: 'incidents', icon: '⚠', restricted: true },
];

const pageTitles = {
  '/': 'Dashboard', '/employees': 'Employees', '/departments': 'Departments',
  '/timesheet': 'Timesheet', '/leave': 'Leave Requests', '/payroll': 'Payroll',
  '/reviews': 'Performance', '/incidents': 'Incidents', '/accounts': 'Accounting',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const { lang, toggleLang, t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();

  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const handleLogout = () => { logout(); navigate('/login'); };
  const closeSidebar = () => setSidebarOpen(false);
  const isHRorMgr = ['HR Admin', 'Manager'].includes(user.role);

  const handleSearch = (e) => {
    if (e.key === 'Enter' && search.trim()) {
      navigate(`/employees?q=${encodeURIComponent(search.trim())}`);
      setSearch('');
    }
  };

  const handleExport = async () => {
    try {
      const { data } = await api.get('/employees');
      const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Department', 'Job Title', 'Status', 'Hire Date'];
      const rows = data.map(e => [
        e.employee_id, e.first_name, e.last_name, e.email,
        e.phone_number || '', e.department_name || '', e.job_title || '',
        e.employment_status, e.hire_date
      ]);
      const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `employees_${new Date().toISOString().slice(0,10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
    } catch {}
  };

  const pageTitle = Object.entries(pageTitles).findLast(([path]) => location.pathname.startsWith(path))?.[1] || 'HRIT';

  const NavGroup = ({ items }) => items
    .filter(i => !i.restricted || isHRorMgr)
    .map(item => (
      <NavLink key={item.to} to={item.to} end={item.exact}
        onClick={closeSidebar}
        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
        <span className="nav-icon">{item.icon}</span>
        <span>{item.label || t(item.key)}</span>
      </NavLink>
    ));

  return (
    <div className="layout">
      <div className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`} onClick={closeSidebar} />
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-logo">T</div>
          <span className="brand-text">Taweesup.Web</span>
          <button className="hamburger" onClick={closeSidebar} style={{marginLeft:'auto'}}>✕</button>
        </div>

        <div className="nav-section">
          <div className="nav-section-label">Main Menu</div>
          <NavGroup items={mainNav} />
        </div>

        {isHRorMgr && (
          <div className="nav-section">
            <div className="nav-section-label">Team Management</div>
            <NavGroup items={mgmtNav} />
          </div>
        )}

        <div className="sidebar-bottom">
          <div className="user-card">
            <div className="user-avatar">{user.name?.[0]}</div>
            <div className="user-info-text">
              <div className="user-name">{user.name}</div>
              <div className="user-role-text">{user.role}</div>
            </div>
          </div>
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>
          <button className="lang-toggle" onClick={toggleLang}>
            {lang === 'en' ? '🇹🇭 ภาษาไทย' : '🇬🇧 English'}
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            <span>⎋</span> {t('signOut')}
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
          <span className="topbar-title">{pageTitle}</span>
          <div className="topbar-search">
            <span className="si">🔍</span>
            <input
              placeholder="Search employees... (Enter)"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleSearch}
            />
          </div>
          <div className="topbar-actions">
            <button className="topbar-btn" title="Pending leave requests" onClick={() => navigate('/leave?status=Pending')}>✉</button>
            <button className="topbar-btn" title="Export employees CSV" onClick={handleExport}>↗</button>
            <div className="user-avatar" style={{cursor:'default'}} title={user.name}>{user.name?.[0]}</div>
          </div>
        </header>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
