require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/positions', require('./routes/positions'));
app.use('/api/timesheets', require('./routes/timesheets'));
app.use('/api/leave', require('./routes/leave'));
app.use('/api/payroll', require('./routes/payroll'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/training', require('./routes/training'));
app.use('/api/benefits', require('./routes/benefits'));
app.use('/api/incidents', require('./routes/incidents'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/users', require('./routes/users'));

// Serve React frontend in production
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Auto-seed if database is empty
const db = require('./db');
const bcrypt = require('bcryptjs');
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (userCount === 0) {
  console.log('Seeding initial data...');
  db.prepare('INSERT OR IGNORE INTO departments (department_name, budget) VALUES (?,?)').run('Human Resources', 500000);
  db.prepare('INSERT OR IGNORE INTO departments (department_name, budget) VALUES (?,?)').run('Engineering', 1200000);
  db.prepare('INSERT OR IGNORE INTO departments (department_name, budget) VALUES (?,?)').run('Sales', 800000);
  db.prepare('INSERT OR IGNORE INTO positions (job_title, department_id, salary_range_min, salary_range_max) VALUES (?,?,?,?)').run('HR Manager', 1, 60000, 90000);
  db.prepare('INSERT OR IGNORE INTO positions (job_title, department_id, salary_range_min, salary_range_max) VALUES (?,?,?,?)').run('Software Engineer', 2, 70000, 120000);
  db.prepare('INSERT OR IGNORE INTO employees (first_name, last_name, email, phone_number, hire_date, employment_status, department_id, position_id) VALUES (?,?,?,?,?,?,?,?)').run('Admin', 'User', 'admin@company.com', '555-0001', '2020-01-01', 'Active', 1, 1);
  const hash = (pw) => bcrypt.hashSync(pw, 10);
  db.prepare('INSERT OR IGNORE INTO users (employee_id, username, password_hash, role) VALUES (?,?,?,?)').run(1, 'admin', hash('admin123'), 'HR Admin');
  console.log('Seed complete. Login: admin / admin123');
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Taweesup.Web running on port ${PORT}`));
