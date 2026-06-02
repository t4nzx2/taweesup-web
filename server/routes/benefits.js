const router = require('express').Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

router.get('/', (req, res) => {
  const { employee_id } = req.query;
  let query = `SELECT b.*, e.first_name || ' ' || e.last_name as employee_name FROM benefits b JOIN employees e ON b.employee_id = e.employee_id WHERE 1=1`;
  const params = [];
  if (employee_id) { query += ' AND b.employee_id=?'; params.push(employee_id); }
  query += ' ORDER BY b.enrollment_date DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/', requireRole('HR Admin'), (req, res) => {
  const { employee_id, plan_type, enrollment_date, monthly_cost } = req.body;
  const result = db.prepare('INSERT INTO benefits (employee_id, plan_type, enrollment_date, monthly_cost) VALUES (?,?,?,?)').run(employee_id, plan_type, enrollment_date, monthly_cost);
  res.status(201).json({ benefit_id: result.lastInsertRowid });
});

router.delete('/:id', requireRole('HR Admin'), (req, res) => {
  db.prepare('DELETE FROM benefits WHERE benefit_id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
