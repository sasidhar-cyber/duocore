const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { awardXP } = require('../services/xpEngine');

const router = express.Router();

router.get('/questions', requireAuth, (req, res) => {
  const { subjectSlug = 'cybersecurity', count = 8, difficulty } = req.query;
  let sql = 'SELECT id, subject_slug, topic_slug, difficulty, question_text, code_snippet, options FROM questions WHERE subject_slug = ?';
  const params = [subjectSlug];
  if (difficulty) {
    sql += ' AND difficulty = ?';
    params.push(difficulty);
  }
  sql += ' ORDER BY RANDOM() LIMIT ?';
  params.push(Number(count) || 8);

  const questions = db.prepare(sql).all(...params);
  const parsed = questions.map((q) => ({
    ...q,
    options: JSON.parse(q.options)
  }));

  res.json({ questions: parsed });
});

router.post('/submit-answer', requireAuth, (req, res) => {
  const { questionId, selectedIndex, responseTimeMs } = req.body;
  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);
  if (!question) return res.status(404).json({ error: 'Question not found' });

  const isCorrect = question.correct_index === selectedIndex;
  if (isCorrect) {
    awardXP(req.user.id, 25, 'Correct quiz answer');
  } else {
    db.prepare(`
      INSERT OR REPLACE INTO revision_items (id, user_id, topic_slug, subject_slug, title, reason, priority, created_at)
      VALUES (?, ?, ?, ?, ?, 'Incorrect answer in Quiz Arena', 'high', ?)
    `).run(
      `rev-${req.user.id}-${question.topic_slug}`,
      req.user.id,
      question.topic_slug,
      question.subject_slug,
      `Quiz Review: ${question.topic_slug}`,
      new Date().toISOString()
    );
  }

  res.json({
    isCorrect,
    correctIndex: question.correct_index,
    explanation: question.explanation,
    responseTimeMs: responseTimeMs || null
  });
});

module.exports = router;
