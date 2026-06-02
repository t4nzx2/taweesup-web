const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', (req, res) => {
  const total_employees = db.prepare("SELECT COUNT(*) as c FROM employees WHERE employment_status='Active'").get().c;
  const pending_leave = db.prepare("SELECT COUNT(*) as c FROM leave_requests WHERE approval_status='Pending'").get().c;
  const recent_hires = db.prepare("SELECT first_name, last_name, hire_date, employee_id FROM employees ORDER BY hire_date DESC LIMIT 5").all();
  const dept_counts = db.prepare("SELECT d.department_name, COUNT(e.employee_id) as count FROM departments d LEFT JOIN employees e ON d.department_id=e.department_id AND e.employment_status='Active' GROUP BY d.department_id").all();
  res.json({ total_employees, pending_leave, recent_hires, dept_counts });
});

module.exports = router;
