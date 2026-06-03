const router = require('express').Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT d.*, e.first_name || ' ' || e.last_name as manager_name
    FROM departments d LEFT JOIN employees e ON d.manager_id = e.employee_id
  `).all();
  // Attach members of each department (join positions for job_title)
  const memberStmt = db.prepare(`
    SELECT e.employee_id, e.first_name || ' ' || e.last_name as name, p.job_title
    FROM employees e LEFT JOIN positions p ON e.position_id = p.position_id
    WHERE e.department_id = ? ORDER BY e.first_name
  `);
  for (const d of rows) {
    d.members = memberStmt.all(d.department_id);
    d.member_count = d.members.length;
  }
  res.json(rows);
});

router.post('/', requireRole('HR Admin'), (req, res) => {
  const { department_name, manager_id, budget } = req.body;
  const result = db.prepare('INSERT INTO departments (department_name, manager_id, budget) VALUES (?,?,?)').run(department_name, manager_id, budget);
  res.status(201).json({ department_id: result.lastInsertRowid });
});

router.put('/:id', requireRole('HR Admin'), (req, res) => {
  const { department_name, manager_id, budget } = req.body;
  db.prepare('UPDATE departments SET department_name=?, manager_id=?, budget=? WHERE department_id=?').run(department_name, manager_id, budget, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', requireRole('HR Admin'), (req, res) => {
  const id = req.params.id;
  // Unlink employees and positions from this department, then delete
  db.prepare('UPDATE employees SET department_id=NULL WHERE department_id=?').run(id);
  db.prepare('UPDATE positions SET department_id=NULL WHERE department_id=?').run(id);
  db.prepare('DELETE FROM departments WHERE department_id=?').run(id);
  res.json({ success: true });
});

module.exports = router;
