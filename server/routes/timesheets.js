const router = require('express').Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

router.get('/', (req, res) => {
  const { employee_id, week } = req.query;
  let query = `SELECT t.*, e.first_name || ' ' || e.last_name as employee_name FROM timesheets t JOIN employees e ON t.employee_id = e.employee_id WHERE 1=1`;
  const params = [];
  if (employee_id) { query += ' AND t.employee_id=?'; params.push(employee_id); }
  if (week) { query += ' AND t.work_date >= ? AND t.work_date <= ?'; params.push(week, week.replace(/\d{4}-\d{2}-\d{2}/, d => { const dt = new Date(d); dt.setDate(dt.getDate()+6); return dt.toISOString().slice(0,10); })); }
  query += ' ORDER BY t.work_date DESC';
  res.json(db.prepare(query).all(...params));
});

// Clock in
router.post('/clock-in', (req, res) => {
  const employee_id = req.user.employee_id;
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toTimeString().slice(0, 8);
  const existing = db.prepare('SELECT * FROM timesheets WHERE employee_id=? AND work_date=?').get(employee_id, today);
  if (existing && existing.clock_in_time && !existing.clock_out_time) return res.status(400).json({ error: 'Already clocked in' });
  db.prepare('INSERT INTO timesheets (employee_id, work_date, clock_in_time) VALUES (?,?,?)').run(employee_id, today, now);
  res.json({ success: true, clock_in_time: now });
});

// Clock out
router.post('/clock-out', (req, res) => {
  const employee_id = req.user.employee_id;
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toTimeString().slice(0, 8);
  const row = db.prepare('SELECT * FROM timesheets WHERE employee_id=? AND work_date=? AND clock_out_time IS NULL').get(employee_id, today);
  if (!row) return res.status(400).json({ error: 'Not clocked in' });
  const inTime = new Date(`${today}T${row.clock_in_time}`);
  const outTime = new Date(`${today}T${now}`);
  const hours = Math.round(((outTime - inTime) / 3600000) * 100) / 100;
  db.prepare('UPDATE timesheets SET clock_out_time=?, total_hours=? WHERE timesheet_id=?').run(now, hours, row.timesheet_id);
  res.json({ success: true, total_hours: hours });
});

router.get('/status', (req, res) => {
  const employee_id = req.user.employee_id;
  const today = new Date().toISOString().slice(0, 10);
  const row = db.prepare('SELECT * FROM timesheets WHERE employee_id=? AND work_date=?').get(employee_id, today);
  res.json(row || { clocked_in: false });
});

module.exports = router;
