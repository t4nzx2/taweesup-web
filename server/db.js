const Database = require('better-sqlite3');
const path = require('path');

// Use DATA_DIR (Render persistent disk) if set, otherwise local folder
const dbPath = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'hrit.db')
  : path.join(__dirname, 'hrit.db');

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS departments (
    department_id INTEGER PRIMARY KEY AUTOINCREMENT,
    department_name TEXT NOT NULL,
    manager_id INTEGER,
    budget REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS employees (
    employee_id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone_number TEXT,
    date_of_birth TEXT,
    hire_date TEXT NOT NULL,
    employment_status TEXT NOT NULL DEFAULT 'Active' CHECK(employment_status IN ('Active','On Leave','Terminated')),
    department_id INTEGER,
    position_id INTEGER,
    photo_url TEXT,
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
  );

  CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER UNIQUE,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Employee' CHECK(role IN ('HR Admin','Manager','Employee')),
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
  );

  CREATE TABLE IF NOT EXISTS positions (
    position_id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_title TEXT NOT NULL,
    department_id INTEGER,
    salary_range_min REAL,
    salary_range_max REAL,
    is_open INTEGER DEFAULT 1,
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
  );

  CREATE TABLE IF NOT EXISTS timesheets (
    timesheet_id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    work_date TEXT NOT NULL,
    clock_in_time TEXT,
    clock_out_time TEXT,
    total_hours REAL,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
  );

  CREATE TABLE IF NOT EXISTS leave_requests (
    leave_id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    leave_type TEXT NOT NULL CHECK(leave_type IN ('PTO','Sick','Unpaid')),
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    reason TEXT,
    approval_status TEXT NOT NULL DEFAULT 'Pending' CHECK(approval_status IN ('Pending','Approved','Denied')),
    reviewed_by INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
  );

  CREATE TABLE IF NOT EXISTS payroll (
    payroll_id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    pay_period_start TEXT NOT NULL,
    pay_period_end TEXT NOT NULL,
    gross_pay REAL NOT NULL,
    tax_deductions REAL NOT NULL DEFAULT 0,
    net_pay REAL NOT NULL,
    payment_date TEXT,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
  );

  CREATE TABLE IF NOT EXISTS performance_reviews (
    review_id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    reviewer_id INTEGER NOT NULL,
    review_date TEXT NOT NULL,
    performance_score INTEGER NOT NULL CHECK(performance_score BETWEEN 1 AND 5),
    comments TEXT,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
    FOREIGN KEY (reviewer_id) REFERENCES employees(employee_id)
  );

  CREATE TABLE IF NOT EXISTS training_certifications (
    training_id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    course_name TEXT NOT NULL,
    completion_date TEXT,
    expiration_date TEXT,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
  );

  CREATE TABLE IF NOT EXISTS benefits (
    benefit_id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    plan_type TEXT NOT NULL CHECK(plan_type IN ('Health','Dental','Retirement','Vision','Other')),
    enrollment_date TEXT NOT NULL,
    monthly_cost REAL DEFAULT 0,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
  );

  CREATE TABLE IF NOT EXISTS incidents (
    incident_id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    incident_date TEXT NOT NULL,
    violation_type TEXT NOT NULL,
    description TEXT,
    action_taken TEXT CHECK(action_taken IN ('Verbal Warning','Written Warning','Suspension','Termination','Other')),
    recorded_by INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
  );
`);

// ---- Migrations: add new columns if they don't exist ----
function addColumn(table, colDef) {
  try { db.prepare(`ALTER TABLE ${table} ADD COLUMN ${colDef}`).run(); } catch (e) { /* already exists */ }
}
addColumn('timesheets', 'is_late INTEGER DEFAULT 0');
addColumn('timesheets', 'late_deduction REAL DEFAULT 0');
addColumn('performance_reviews', 'score_cleanliness INTEGER');
addColumn('performance_reviews', 'score_teamwork INTEGER');
addColumn('performance_reviews', 'score_service INTEGER');
addColumn('performance_reviews', 'score_retention INTEGER');
addColumn('performance_reviews', 'score_problem INTEGER');

module.exports = db;
