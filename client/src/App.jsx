import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { LangProvider } from './LangContext';
import { ThemeProvider } from './ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import EmployeeProfile from './pages/EmployeeProfile';
import Timesheet from './pages/Timesheet';
import LeaveRequests from './pages/LeaveRequests';
import Payroll from './pages/Payroll';
import Reviews from './pages/Reviews';
import Incidents from './pages/Incidents';
import Departments from './pages/Departments';
import Accounts from './pages/Accounts';
import Announcements from './pages/Announcements';

function RequireAuth({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ThemeProvider>
    <LangProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
            <Route index element={<Dashboard />} />
            <Route path="employees" element={<Employees />} />
            <Route path="employees/:id" element={<EmployeeProfile />} />
            <Route path="timesheet" element={<Timesheet />} />
            <Route path="leave" element={<LeaveRequests />} />
            <Route path="payroll" element={<Payroll />} />
            <Route path="reviews" element={<Reviews />} />
            <Route path="incidents" element={<Incidents />} />
            <Route path="departments" element={<Departments />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="announcements" element={<Announcements />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </LangProvider>
    </ThemeProvider>
  );
}
