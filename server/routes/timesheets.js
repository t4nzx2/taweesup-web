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
  // Block if ANY open record exists (not just today)
  const openRecord = db.prepare('SELECT * FROM timesheets WHERE employee_id=? AND clock_out_time IS NULL ORDER BY work_date DESC LIMIT 1').get(employee_id);
  if (openRecord) return res.status(400).json({ error: 'ลงเวลาเข้าแล้ว กรุณาลงเวลาออกก่อน' });
  db.prepare('INSERT INTO timesheets (employee_id, work_date, clock_in_time) VALUES (?,?,?)').run(employee_id, today, now);
  res.json({ success: true, clock_in_time: now });
});

// Clock out
router.post('/clock-out', (req, res) => {
  const employee_id = req.user.employee_id;
  const now = new Date().toTimeString().slice(0, 8);
  const today = new Date().toISOString().slice(0, 10);
  // Find the most recent open record (any date)
  const row = db.prepare('SELECT * FROM timesheets WHERE employee_id=? AND clock_out_time IS NULL ORDER BY work_date DESC, timesheet_id DESC LIMIT 1').get(employee_id);
  if (!row) return res.status(400).json({ error: 'ยังไม่ได้ลงเวลาเข้า' });
  const workDate = row.work_date;
  const inTime = new Date(`${workDate}T${row.clock_in_time}`);
  const outTime = new Date(`${today}T${now}`);
  const hours = Math.max(0, Math.round(((outTime - inTime) / 3600000) * 100) / 100);
  db.prepare('UPDATE timesheets SET clock_out_time=?, total_hours=?, work_date=? WHERE timesheet_id=?').run(now, hours, today, row.timesheet_id);
  res.json({ success: true, total_hours: hours });
});

router.get('/status', (req, res) => {
  const employee_id = req.user.employee_id;
  // Return most recent open record if any
  const open = db.prepare('SELECT * FROM timesheets WHERE employee_id=? AND clock_out_time IS NULL ORDER BY work_date DESC, timesheet_id DESC LIMIT 1').get(employee_id);
  if (open) return res.json(open);
  // Otherwise return today's completed record
  const today = new Date().toISOString().slice(0, 10);
  const row = db.prepare('SELECT * FROM timesheets WHERE employee_id=? AND work_date=? ORDER BY timesheet_id DESC LIMIT 1').get(employee_id, today);
  res.json(row || { clocked_in: false });
});

module.exports = router;
