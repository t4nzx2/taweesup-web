const router = require('express').Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { thaiNow } = require('../thaitime');

router.use(authenticate);

// Late rules (Thai time)
// 07:30 - 07:45  -> on time
// after 07:45    -> late, deduct 10 baht
// after 08:00    -> late, deduct 50 baht
function computeLate(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const mins = h * 60 + m;
  const t745 = 7 * 60 + 45;
  const t800 = 8 * 60;
  if (mins <= t745) return { is_late: 0, deduction: 0 };
  if (mins <= t800) return { is_late: 1, deduction: 10 };
  return { is_late: 1, deduction: 50 };
}

router.get('/', (req, res) => {
  const { employee_id, week } = req.query;
  let query = `SELECT t.*, e.first_name || ' ' || e.last_name as employee_name FROM timesheets t JOIN employees e ON t.employee_id = e.employee_id WHERE 1=1`;
  const params = [];
  if (employee_id) { query += ' AND t.employee_id=?'; params.push(employee_id); }
  query += ' ORDER BY t.work_date DESC';
  res.json(db.prepare(query).all(...params));
});

// Monthly attendance summary (HR / Manager)
router.get('/summary', requireRole('HR Admin', 'Manager'), (req, res) => {
  const month = req.query.month || thaiNow().date.slice(0, 7); // YYYY-MM
  const rows = db.prepare(`
    SELECT e.employee_id,
      e.first_name || ' ' || e.last_name as employee_name,
      COUNT(DISTINCT CASE WHEN t.clock_in_time IS NOT NULL THEN t.work_date END) as days_worked,
      COALESCE(SUM(t.is_late), 0) as late_days,
      COALESCE(SUM(t.late_deduction), 0) as total_deduction
    FROM employees e
    LEFT JOIN timesheets t ON t.employee_id = e.employee_id AND substr(t.work_date,1,7) = ?
    WHERE e.employment_status != 'Terminated'
    GROUP BY e.employee_id
    ORDER BY e.first_name
  `).all(month);
  res.json({ month, rows });
});

// Clock in
router.post('/clock-in', (req, res) => {
  const employee_id = req.user.employee_id;
  const { date, time } = thaiNow();
  const openRecord = db.prepare('SELECT * FROM timesheets WHERE employee_id=? AND clock_out_time IS NULL ORDER BY work_date DESC LIMIT 1').get(employee_id);
  if (openRecord) return res.status(400).json({ error: 'ลงเวลาเข้าแล้ว กรุณาลงเวลาออกก่อน' });
  const { is_late, deduction } = computeLate(time);
  db.prepare('INSERT INTO timesheets (employee_id, work_date, clock_in_time, is_late, late_deduction) VALUES (?,?,?,?,?)')
    .run(employee_id, date, time, is_late, deduction);
  res.json({ success: true, clock_in_time: time, is_late, deduction });
});

// Clock out
router.post('/clock-out', (req, res) => {
  const employee_id = req.user.employee_id;
  const { date, time } = thaiNow();
  const row = db.prepare('SELECT * FROM timesheets WHERE employee_id=? AND clock_out_time IS NULL ORDER BY work_date DESC, timesheet_id DESC LIMIT 1').get(employee_id);
  if (!row) return res.status(400).json({ error: 'ยังไม่ได้ลงเวลาเข้า' });
  const inTime = new Date(`${row.work_date}T${row.clock_in_time}`);
  const outTime = new Date(`${date}T${time}`);
  const hours = Math.max(0, Math.round(((outTime - inTime) / 3600000) * 100) / 100);
  db.prepare('UPDATE timesheets SET clock_out_time=?, total_hours=? WHERE timesheet_id=?').run(time, hours, row.timesheet_id);
  res.json({ success: true, total_hours: hours });
});

router.get('/status', (req, res) => {
  const employee_id = req.user.employee_id;
  const open = db.prepare('SELECT * FROM timesheets WHERE employee_id=? AND clock_out_time IS NULL ORDER BY work_date DESC, timesheet_id DESC LIMIT 1').get(employee_id);
  if (open) return res.json(open);
  const today = thaiNow().date;
  const row = db.prepare('SELECT * FROM timesheets WHERE employee_id=? AND work_date=? ORDER BY timesheet_id DESC LIMIT 1').get(employee_id, today);
  res.json(row || { clocked_in: false });
});

module.exports = router;
