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
  const { first_name, last_name, email, phone_number, date_of_birth, hire_date, employment_status, department_id, position_id } = req.body;
  const result = db.prepare(`
    INSERT INTO employees (first_name, last_name, email, phone_number, date_of_birth, hire_date, employment_status, department_id, position_id)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).run(first_name, last_name, email, phone_number, date_of_birth, hire_date, employment_status || 'Active', department_id, position_id);
  res.status(201).json({ employee_id: result.lastInsertRowid });
});

router.put('/:id', requireRole('HR Admin'), (req, res) => {
  const { first_name, last_name, email, phone_number, date_of_birth, hire_date, employment_status, department_id, position_id } = req.body;
  db.prepare(`
    UPDATE employees SET first_name=?, last_name=?, email=?, phone_number=?, date_of_birth=?,
    hire_date=?, employment_status=?, department_id=?, position_id=? WHERE employee_id=?
  `).run(first_name, last_name, email, phone_number, date_of_birth, hire_date, employment_status, department_id, position_id, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', requireRole('HR Admin'), (req, res) => {
  db.prepare('DELETE FROM employees WHERE employee_id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
