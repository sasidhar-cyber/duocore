const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const items = db.prepare('SELECT * FROM revision_items WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ items });
});

router.post('/add', requireAuth, (req, res) => {
  const { topicSlug, subjectSlug, title, reason, priority } = req.body;
  const id = 'rev-' + uuidv4().slice(0, 8);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT OR REPLACE INTO revision_items (id, user_id, topic_slug, subject_slug, title, reason, priority, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.user.id, topicSlug, subjectSlug, title, reason || 'Revision needed', priority || 'medium', now);

  res.status(201).json({ message: 'Added to revision zone' });
});

router.delete('/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM revision_items WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Removed from revision zone' });
});

module.exports = router;
