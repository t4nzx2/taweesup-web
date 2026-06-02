const router = require('express').Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

router.get('/', (req, res) => {
  const { employee_id } = req.query;
  let query = `SELECT t.*, e.first_name || ' ' || e.last_name as employee_name FROM training_certifications t JOIN employees e ON t.employee_id = e.employee_id WHERE 1=1`;
  const params = [];
  if (employee_id) { query += ' AND t.employee_id=?'; params.push(employee_id); }
  query += ' ORDER BY t.completion_date DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/', requireRole('HR Admin', 'Manager'), (req, res) => {
  const { employee_id, course_name, completion_date, expiration_date } = req.body;
  const result = db.prepare('INSERT INTO training_certifications (employee_id, course_name, completion_date, expiration_date) VALUES (?,?,?,?)').run(employee_id, course_name, completion_date, expiration_date);
  res.status(201).json({ training_id: result.lastInsertRowid });
});

router.delete('/:id', requireRole('HR Admin'), (req, res) => {
  db.prepare('DELETE FROM training_certifications WHERE training_id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
