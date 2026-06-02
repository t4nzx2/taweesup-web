const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const SECRET = process.env.JWT_SECRET || 'hrit_secret_key';

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare(`
    SELECT u.*, e.first_name, e.last_name, e.employee_id as emp_id
    FROM users u LEFT JOIN employees e ON u.employee_id = e.employee_id
    WHERE u.username = ?
  `).get(username);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign(
    { user_id: user.user_id, employee_id: user.emp_id, role: user.role, name: `${user.first_name} ${user.last_name}` },
    SECRET, { expiresIn: '8h' }
  );
  res.json({ token, role: user.role, name: `${user.first_name} ${user.last_name}`, employee_id: user.emp_id });
});

module.exports = router;
