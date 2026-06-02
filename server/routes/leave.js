const router = require('express').Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

router.get('/', (req, res) => {
  const { employee_id, status } = req.query;
  let query = `SELECT l.*, e.first_name || ' ' || e.last_name as employee_name FROM leave_requests l JOIN employees e ON l.employee_id = e.employee_id WHERE 1=1`;
  const params = [];
  if (employee_id) { query += ' AND l.employee_id=?'; params.push(employee_id); }
  if (status) { query += ' AND l.approval_status=?'; params.push(status); }
  query += ' ORDER BY l.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/', (req, res) => {
  const { leave_type, start_date, end_date, reason } = req.body;
  const employee_id = req.user.employee_id;
  const result = db.prepare('INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason) VALUES (?,?,?,?,?)').run(employee_id, leave_type, start_date, end_date, reason);
  res.status(201).json({ leave_id: result.lastInsertRowid });
});

router.put('/:id/status', requireRole('HR Admin', 'Manager'), (req, res) => {
  const { approval_status } = req.body;
  db.prepare('UPDATE leave_requests SET approval_status=?, reviewed_by=? WHERE leave_id=?').run(approval_status, req.user.employee_id, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM leave_requests WHERE leave_id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (row.employee_id !== req.user.employee_id && req.user.role === 'Employee') return res.status(403).json({ error: 'Forbidden' });
  if (row.approval_status !== 'Pending') return res.status(400).json({ error: 'Cannot delete non-pending request' });
  db.prepare('DELETE FROM leave_requests WHERE leave_id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
