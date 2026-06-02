const router = require('express').Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, d.department_name FROM positions p
    LEFT JOIN departments d ON p.department_id = d.department_id
  `).all();
  res.json(rows);
});

router.post('/', requireRole('HR Admin'), (req, res) => {
  const { job_title, department_id, salary_range_min, salary_range_max, is_open } = req.body;
  const result = db.prepare('INSERT INTO positions (job_title, department_id, salary_range_min, salary_range_max, is_open) VALUES (?,?,?,?,?)').run(job_title, department_id, salary_range_min, salary_range_max, is_open ?? 1);
  res.status(201).json({ position_id: result.lastInsertRowid });
});

router.put('/:id', requireRole('HR Admin'), (req, res) => {
  const { job_title, department_id, salary_range_min, salary_range_max, is_open } = req.body;
  db.prepare('UPDATE positions SET job_title=?, department_id=?, salary_range_min=?, salary_range_max=?, is_open=? WHERE position_id=?').run(job_title, department_id, salary_range_min, salary_range_max, is_open, req.params.id);
  res.json({ success: true });
});

module.exports = router;
