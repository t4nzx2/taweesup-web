const router = require('express').Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT e.*, d.department_name, p.job_title
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.department_id
    LEFT JOIN positions p ON e.position_id = p.position_id
    ORDER BY e.last_name, e.first_name
  `).all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare(`
    SELECT e.*, d.department_name, p.job_title
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.department_id
    LEFT JOIN positions p ON e.position_id = p.position_id
    WHERE e.employee_id = ?
  `).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', requireRole('HR Admin'), (req, res) => {
  const { first_name, last_name, phone_number, hire_date, employment_status, department_id, position_id } = req.body;
  // email is required-unique in schema but no longer collected; auto-generate placeholder
  const email = req.body.email || `emp_${Date.now()}@local`;
  const date_of_birth = req.body.date_of_birth || null;
  const result = db.prepare(`
    INSERT INTO employees (first_name, last_name, email, phone_number, date_of_birth, hire_date, employment_status, department_id, position_id)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).run(first_name, last_name, email, phone_number, date_of_birth, hire_date || new Date().toISOString().slice(0,10), employment_status || 'Active', department_id || null, position_id || null);
  res.status(201).json({ employee_id: result.lastInsertRowid });
});

router.put('/:id', requireRole('HR Admin'), (req, res) => {
  const { first_name, last_name, phone_number, hire_date, employment_status, department_id, position_id } = req.body;
  const existing = db.prepare('SELECT email, date_of_birth FROM employees WHERE employee_id=?').get(req.params.id) || {};
  const email = req.body.email || existing.email;
  const date_of_birth = req.body.date_of_birth ?? existing.date_of_birth;
  db.prepare(`
    UPDATE employees SET first_name=?, last_name=?, email=?, phone_number=?, date_of_birth=?,
    hire_date=?, employment_status=?, department_id=?, position_id=? WHERE employee_id=?
  `).run(first_name, last_name, email, phone_number, date_of_birth, hire_date, employment_status, department_id || null, position_id || null, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', requireRole('HR Admin'), (req, res) => {
  const id = req.params.id;
  // Delete all related records first
  const eid = Number(id);
  // Disable FK checks, run all deletes, re-enable
  db.prepare('PRAGMA foreign_keys = OFF').run();
  try {
    db.prepare('DELETE FROM users WHERE employee_id=?').run(eid);
    db.prepare('DELETE FROM timesheets WHERE employee_id=?').run(eid);
    db.prepare('DELETE FROM leave_requests WHERE employee_id=?').run(eid);
    db.prepare('UPDATE leave_requests SET reviewed_by=NULL WHERE reviewed_by=?').run(eid);
    db.prepare('DELETE FROM payroll WHERE employee_id=?').run(eid);
    db.prepare('DELETE FROM performance_reviews WHERE employee_id=? OR reviewer_id=?').run(eid, eid);
    db.prepare('DELETE FROM training_certifications WHERE employee_id=?').run(eid);
    db.prepare('DELETE FROM benefits WHERE employee_id=?').run(eid);
    db.prepare('DELETE FROM incidents WHERE employee_id=?').run(eid);
    db.prepare('UPDATE incidents SET recorded_by=NULL WHERE recorded_by=?').run(eid);
    db.prepare('UPDATE transactions SET recorded_by=NULL WHERE recorded_by=?').run(eid);
    db.prepare('UPDATE departments SET manager_id=NULL WHERE manager_id=?').run(eid);
    db.prepare('DELETE FROM employees WHERE employee_id=?').run(eid);
  } finally {
    db.prepare('PRAGMA foreign_keys = ON').run();
  }
  res.json({ success: true });
});

module.exports = router;
