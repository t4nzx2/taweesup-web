const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);
router.use(requireRole('HR Admin'));

// Get user account for an employee
router.get('/by-employee/:employee_id', (req, res) => {
  const row = db.prepare('SELECT user_id, username, role FROM users WHERE employee_id=?').get(req.params.employee_id);
  res.json(row || null);
});

// Create user account for an employee
router.post('/', (req, res) => {
  const { employee_id, username, password, role } = req.body;
  if (!employee_id || !username || !password) return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบ' });

  const exists = db.prepare('SELECT user_id FROM users WHERE username=?').get(username);
  if (exists) return res.status(400).json({ error: 'Username นี้ถูกใช้แล้ว' });

  const hasAccount = db.prepare('SELECT user_id FROM users WHERE employee_id=?').get(employee_id);
  if (hasAccount) return res.status(400).json({ error: 'พนักงานคนนี้มี account แล้ว' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (employee_id, username, password_hash, role) VALUES (?,?,?,?)').run(employee_id, username, hash, role || 'Employee');
  res.status(201).json({ user_id: result.lastInsertRowid });
});

// Reset password
router.put('/:user_id/reset-password', (req, res) => {
  const { new_password } = req.body;
  if (!new_password || new_password.length < 6) return res.status(400).json({ error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัว' });
  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password_hash=? WHERE user_id=?').run(hash, req.params.user_id);
  res.json({ success: true });
});

// Update role
router.put('/:user_id/role', (req, res) => {
  const { role } = req.body;
  db.prepare('UPDATE users SET role=? WHERE user_id=?').run(role, req.params.user_id);
  res.json({ success: true });
});

// Delete account
router.delete('/:user_id', (req, res) => {
  db.prepare('DELETE FROM users WHERE user_id=?').run(req.params.user_id);
  res.json({ success: true });
});

module.exports = router;
