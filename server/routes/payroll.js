const router = require('express').Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

router.get('/', requireRole('HR Admin', 'Manager'), (req, res) => {
  const { employee_id, period } = req.query;
  let query = `SELECT p.*, e.first_name || ' ' || e.last_name as employee_name FROM payroll p JOIN employees e ON p.employee_id = e.employee_id WHERE 1=1`;
  const params = [];
  if (employee_id) { query += ' AND p.employee_id=?'; params.push(employee_id); }
  if (period) { query += ' AND p.pay_period_start >= ?'; params.push(period); }
  query += ' ORDER BY p.payment_date DESC';
  res.json(db.prepare(query).all(...params));
});

router.get('/my', (req, res) => {
  const rows = db.prepare('SELECT * FROM payroll WHERE employee_id=? ORDER BY payment_date DESC').all(req.user.employee_id);
  res.json(rows);
});

// Get total late deduction for an employee within a period (helper for the form)
router.get('/late-deduction', requireRole('HR Admin'), (req, res) => {
  const { employee_id, start, end } = req.query;
  const row = db.prepare(`
    SELECT COALESCE(SUM(late_deduction),0) as total, COALESCE(SUM(is_late),0) as late_days
    FROM timesheets WHERE employee_id=? AND work_date >= ? AND work_date <= ?
  `).get(employee_id, start, end);
  res.json(row);
});

router.post('/', requireRole('HR Admin'), (req, res) => {
  const { employee_id, pay_period_start, pay_period_end, gross_pay, tax_deductions, payment_date } = req.body;
  // Auto-add late deductions for the period
  const late = db.prepare(`SELECT COALESCE(SUM(late_deduction),0) as total FROM timesheets WHERE employee_id=? AND work_date >= ? AND work_date <= ?`)
    .get(employee_id, pay_period_start, pay_period_end).total;
  const totalDeductions = Number(tax_deductions || 0) + Number(late);
  const net_pay = Number(gross_pay) - totalDeductions;
  const result = db.prepare('INSERT INTO payroll (employee_id, pay_period_start, pay_period_end, gross_pay, tax_deductions, net_pay, payment_date) VALUES (?,?,?,?,?,?,?)')
    .run(employee_id, pay_period_start, pay_period_end, gross_pay, totalDeductions, net_pay, payment_date);
  res.status(201).json({ payroll_id: result.lastInsertRowid, late_deduction: late });
});

module.exports = router;
