const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { thaiNow } = require('../thaitime');

router.use(authenticate);

// List reviews for an employee (anonymous - no reviewer shown)
router.get('/', (req, res) => {
  const { employee_id } = req.query;
  let query = `SELECT review_id, employee_id, review_date,
    score_cleanliness, score_teamwork, score_service, score_retention, score_problem,
    performance_score, comments
    FROM performance_reviews WHERE 1=1`;
  const params = [];
  if (employee_id) { query += ' AND employee_id=?'; params.push(employee_id); }
  query += ' ORDER BY review_date DESC';
  res.json(db.prepare(query).all(...params));
});

// Summary: average per topic + overall + count (for one employee, or all)
router.get('/summary', (req, res) => {
  const { employee_id } = req.query;
  const where = employee_id ? 'WHERE employee_id = ?' : '';
  const params = employee_id ? [employee_id] : [];
  const row = db.prepare(`
    SELECT
      COUNT(*) as review_count,
      ROUND(AVG(score_cleanliness),2) as avg_cleanliness,
      ROUND(AVG(score_teamwork),2) as avg_teamwork,
      ROUND(AVG(score_service),2) as avg_service,
      ROUND(AVG(score_retention),2) as avg_retention,
      ROUND(AVG(score_problem),2) as avg_problem,
      ROUND(AVG(performance_score),2) as avg_overall
    FROM performance_reviews ${where}
  `).get(...params);
  res.json(row);
});

// Summary per employee (for the list page)
router.get('/summary-all', (req, res) => {
  const rows = db.prepare(`
    SELECT e.employee_id, e.first_name || ' ' || e.last_name as employee_name,
      COUNT(r.review_id) as review_count,
      ROUND(AVG(r.performance_score),2) as avg_overall
    FROM employees e
    LEFT JOIN performance_reviews r ON r.employee_id = e.employee_id
    WHERE e.employment_status != 'Terminated'
    GROUP BY e.employee_id ORDER BY e.first_name
  `).all();
  res.json(rows);
});

// Anyone can submit a review (anonymous)
router.post('/', (req, res) => {
  const { employee_id, score_cleanliness, score_teamwork, score_service, score_retention, score_problem, comments } = req.body;
  const scores = [score_cleanliness, score_teamwork, score_service, score_retention, score_problem].map(Number);
  if (scores.some(s => !s || s < 1 || s > 5)) return res.status(400).json({ error: 'กรุณาให้คะแนนทุกหัวข้อ (1-5 ดาว)' });
  const overall = Math.round((scores.reduce((a, b) => a + b, 0) / 5) * 100) / 100;
  db.prepare(`INSERT INTO performance_reviews
    (employee_id, reviewer_id, review_date, performance_score, score_cleanliness, score_teamwork, score_service, score_retention, score_problem, comments)
    VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(employee_id, req.user.employee_id, thaiNow().date, overall, ...scores, comments || null);
  res.status(201).json({ success: true });
});

module.exports = router;
