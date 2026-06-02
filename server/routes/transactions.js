const router = require('express').Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

// Initialize table if needed
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('Income','Expense')),
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    transaction_date TEXT NOT NULL,
    recorded_by INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (recorded_by) REFERENCES employees(employee_id)
  );
`);

// Summary
router.get('/summary', (req, res) => {
  const { month } = req.query;
  let where = month ? `WHERE strftime('%Y-%m', transaction_date) = ?` : '';
  const params = month ? [month] : [];

  const income = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='Income' ${month ? "AND strftime('%Y-%m', transaction_date) = ?" : ''}`).get(...params).total;
  const expense = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='Expense' ${month ? "AND strftime('%Y-%m', transaction_date) = ?" : ''}`).get(...params).total;

  const monthly = db.prepare(`
    SELECT strftime('%Y-%m', transaction_date) as month,
      SUM(CASE WHEN type='Income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type='Expense' THEN amount ELSE 0 END) as expense
    FROM transactions
    GROUP BY month ORDER BY month DESC LIMIT 12
  `).all().reverse();

  const byCategory = db.prepare(`
    SELECT category, type, SUM(amount) as total
    FROM transactions ${where}
    GROUP BY category, type ORDER BY total DESC
  `).all(...params);

  res.json({ income, expense, net: income - expense, monthly, byCategory });
});

// List
router.get('/', (req, res) => {
  const { type, month, limit = 50 } = req.query;
  let query = `SELECT t.*, e.first_name || ' ' || e.last_name as recorded_by_name
    FROM transactions t LEFT JOIN employees e ON t.recorded_by = e.employee_id WHERE 1=1`;
  const params = [];
  if (type) { query += ' AND t.type=?'; params.push(type); }
  if (month) { query += " AND strftime('%Y-%m', t.transaction_date)=?"; params.push(month); }
  query += ' ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT ?';
  params.push(Number(limit));
  res.json(db.prepare(query).all(...params));
});

// Create
router.post('/', requireRole('HR Admin', 'Manager'), (req, res) => {
  const { type, category, amount, description, transaction_date } = req.body;
  const result = db.prepare(
    'INSERT INTO transactions (type, category, amount, description, transaction_date, recorded_by) VALUES (?,?,?,?,?,?)'
  ).run(type, category, amount, description, transaction_date, req.user.employee_id);
  res.status(201).json({ transaction_id: result.lastInsertRowid });
});

// Update
router.put('/:id', requireRole('HR Admin'), (req, res) => {
  const { type, category, amount, description, transaction_date } = req.body;
  db.prepare(
    'UPDATE transactions SET type=?, category=?, amount=?, description=?, transaction_date=? WHERE transaction_id=?'
  ).run(type, category, amount, description, transaction_date, req.params.id);
  res.json({ success: true });
});

// Delete
router.delete('/:id', requireRole('HR Admin'), (req, res) => {
  db.prepare('DELETE FROM transactions WHERE transaction_id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
