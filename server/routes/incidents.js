const router = require('express').Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);
router.use(requireRole('HR Admin', 'Manager'));

router.get('/', (req, res) => {
  const { employee_id } = req.query;
  let query = `SELECT i.*, e.first_name || ' ' || e.last_name as employee_name, r.first_name || ' ' || r.last_name as recorded_by_name FROM incidents i JOIN employees e ON i.employee_id = e.employee_id LEFT JOIN employees r ON i.recorded_by = r.employee_id WHERE 1=1`;
  const params = [];
  if (employee_id) { query += ' AND i.employee_id=?'; params.push(employee_id); }
  query += ' ORDER BY i.incident_date DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/', (req, res) => {
  const { employee_id, incident_date, violation_type, description, action_taken } = req.body;
  const result = db.prepare('INSERT INTO incidents (employee_id, incident_date, violation_type, description, action_taken, recorded_by) VALUES (?,?,?,?,?,?)').run(employee_id, incident_date, violation_type, description, action_taken, req.user.employee_id);
  res.status(201).json({ incident_id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { violation_type, description, action_taken } = req.body;
  db.prepare('UPDATE incidents SET violation_type=?, description=?, action_taken=? WHERE incident_id=?').run(violation_type, description, action_taken, req.params.id);
  res.json({ success: true });
});

module.exports = router;
