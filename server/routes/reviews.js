const router = require('express').Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

router.get('/', (req, res) => {
  const { employee_id } = req.query;
  let query = `SELECT r.*, e.first_name || ' ' || e.last_name as employee_name, m.first_name || ' ' || m.last_name as reviewer_name FROM performance_reviews r JOIN employees e ON r.employee_id = e.employee_id JOIN employees m ON r.reviewer_id = m.employee_id WHERE 1=1`;
  const params = [];
  if (employee_id) { query += ' AND r.employee_id=?'; params.push(employee_id); }
  query += ' ORDER BY r.review_date DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/', requireRole('HR Admin', 'Manager'), (req, res) => {
  const { employee_id, review_date, performance_score, comments } = req.body;
  const result = db.prepare('INSERT INTO performance_reviews (employee_id, reviewer_id, review_date, performance_score, comments) VALUES (?,?,?,?,?)').run(employee_id, req.user.employee_id, review_date, performance_score, comments);
  res.status(201).json({ review_id: result.lastInsertRowid });
});

router.put('/:id', requireRole('HR Admin', 'Manager'), (req, res) => {
  const { performance_score, comments } = req.body;
  db.prepare('UPDATE performance_reviews SET performance_score=?, comments=? WHERE review_id=?').run(performance_score, comments, req.params.id);
  res.json({ success: true });
});

module.exports = router;
