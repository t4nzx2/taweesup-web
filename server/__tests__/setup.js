const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'hrit_secret_key';

function seedTestDb() {
  db.prepare('INSERT INTO departments (department_name, budget) VALUES (?,?)').run('HR', 500000);
  db.prepare('INSERT INTO departments (department_name, budget) VALUES (?,?)').run('Engineering', 800000);
  db.prepare('INSERT INTO positions (job_title, department_id, salary_range_min, salary_range_max) VALUES (?,?,?,?)').run('HR Manager', 1, 50000, 80000);
  db.prepare('INSERT INTO positions (job_title, department_id, salary_range_min, salary_range_max) VALUES (?,?,?,?)').run('Developer', 2, 60000, 100000);
  db.prepare('INSERT INTO employees (first_name, last_name, email, hire_date, employment_status, department_id, position_id) VALUES (?,?,?,?,?,?,?)').run('Admin', 'User', 'admin@test.com', '2020-01-01', 'Active', 1, 1);
  db.prepare('INSERT INTO employees (first_name, last_name, email, hire_date, employment_status, department_id, position_id) VALUES (?,?,?,?,?,?,?)').run('Jane', 'Doe', 'jane@test.com', '2021-06-01', 'Active', 2, 2);
  db.prepare('INSERT INTO users (employee_id, username, password_hash, role) VALUES (?,?,?,?)').run(1, 'admin', bcrypt.hashSync('admin123', 10), 'HR Admin');
  db.prepare('INSERT INTO users (employee_id, username, password_hash, role) VALUES (?,?,?,?)').run(2, 'jane', bcrypt.hashSync('jane123', 10), 'Employee');
}

function makeToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '1h' });
}

const adminToken = () => makeToken({ user_id: 1, employee_id: 1, role: 'HR Admin', name: 'Admin User' });
const employeeToken = () => makeToken({ user_id: 2, employee_id: 2, role: 'Employee', name: 'Jane Doe' });
const managerToken = () => makeToken({ user_id: 99, employee_id: 99, role: 'Manager', name: 'Manager Test' });

module.exports = { db, seedTestDb, adminToken, employeeToken, managerToken };
