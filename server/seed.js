const db = require('./db');
const bcrypt = require('bcryptjs');

// Seed initial data
const depts = db.prepare(`INSERT OR IGNORE INTO departments (department_name, budget) VALUES (?,?)`);
depts.run('Human Resources', 500000);
depts.run('Engineering', 1200000);
depts.run('Sales', 800000);
depts.run('Finance', 600000);

const pos = db.prepare(`INSERT OR IGNORE INTO positions (job_title, department_id, salary_range_min, salary_range_max) VALUES (?,?,?,?)`);
pos.run('HR Manager', 1, 60000, 90000);
pos.run('Software Engineer', 2, 70000, 120000);
pos.run('Sales Rep', 3, 40000, 70000);
pos.run('Accountant', 4, 50000, 80000);

const emp = db.prepare(`INSERT OR IGNORE INTO employees (first_name, last_name, email, phone_number, hire_date, employment_status, department_id, position_id) VALUES (?,?,?,?,?,?,?,?)`);
emp.run('Admin', 'User', 'admin@company.com', '555-0001', '2020-01-01', 'Active', 1, 1);
emp.run('Jane', 'Manager', 'jane@company.com', '555-0002', '2021-03-15', 'Active', 2, 2);
emp.run('John', 'Employee', 'john@company.com', '555-0003', '2022-06-01', 'Active', 3, 3);

const hash = (pw) => bcrypt.hashSync(pw, 10);
const user = db.prepare(`INSERT OR IGNORE INTO users (employee_id, username, password_hash, role) VALUES (?,?,?,?)`);
user.run(1, 'admin', hash('admin123'), 'HR Admin');
user.run(2, 'jane', hash('jane123'), 'Manager');
user.run(3, 'john', hash('john123'), 'Employee');

console.log('Seed complete.');
console.log('Logins:  admin/admin123  |  jane/jane123  |  john/john123');
