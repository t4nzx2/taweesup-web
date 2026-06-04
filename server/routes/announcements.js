const router = require('express').Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

// Get all announcements (newest first, pinned on top)
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT a.*, e.first_name || ' ' || e.last_name as author_name
    FROM announcements a
    LEFT JOIN employees e ON a.created_by = e.employee_id
    ORDER BY a.pinned DESC, a.created_at DESC
  `).all();
  res.json(rows);
});

// Create announcement (HR Admin only)
router.post('/', requireRole('HR Admin'), (req, res) => {
  const { title, body, pinned } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'Title and body required' });
  const result = db.prepare(
    'INSERT INTO announcements (title, body, pinned, created_by) VALUES (?,?,?,?)'
  ).run(title, body, pinned ? 1 : 0, req.user.employee_id);
  res.status(201).json({ announcement_id: result.lastInsertRowid });
});

// Toggle pin (HR Admin only)
router.put('/:id/pin', requireRole('HR Admin'), (req, res) => {
  const row = db.prepare('SELECT pinned FROM announcements WHERE announcement_id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE announcements SET pinned=? WHERE announcement_id=?').run(row.pinned ? 0 : 1, req.params.id);
  res.json({ success: true, pinned: !row.pinned });
});

// Delete announcement (HR Admin only)
router.delete('/:id', requireRole('HR Admin'), (req, res) => {
  db.prepare('DELETE FROM announcements WHERE announcement_id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
