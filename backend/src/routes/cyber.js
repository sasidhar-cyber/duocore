const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { awardXP } = require('../services/xpEngine');

const router = express.Router();

router.get('/progress', requireAuth, (req, res) => {
  const progress = db.prepare('SELECT * FROM level_progress WHERE user_id = ? AND track = ?').all(req.user.id, 'cyber');
  res.json({ progress });
});

router.post('/progress/update', requireAuth, (req, res) => {
  const { levelNum, lessonDone, labDone, challengeDone, quizDone, mastery } = req.body;
  if (!levelNum) return res.status(400).json({ error: 'Level number required' });

  const now = new Date().toISOString();
  const existing = db.prepare(
    'SELECT * FROM level_progress WHERE user_id = ? AND track = ? AND level_num = ?'
  ).get(req.user.id, 'cyber', levelNum);

  const nextLesson = lessonDone ? 1 : (existing?.lesson_done || 0);
  const nextLab = labDone ? 1 : (existing?.lab_done || 0);
  const nextChallenge = challengeDone ? 1 : (existing?.challenge_done || 0);
  const nextQuiz = quizDone ? 1 : (existing?.quiz_done || 0);
  const nextMastery = typeof mastery === 'number' ? mastery : (existing?.mastery || 0);

  const id = `lp-cyber-${req.user.id}-${levelNum}`;
  db.prepare(`
    INSERT INTO level_progress (id, user_id, track, level_num, lesson_done, lab_done, challenge_done, quiz_done, mastery, updated_at)
    VALUES (?, ?, 'cyber', ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, track, level_num) DO UPDATE SET
      lesson_done = excluded.lesson_done,
      lab_done = excluded.lab_done,
      challenge_done = excluded.challenge_done,
      quiz_done = excluded.quiz_done,
      mastery = excluded.mastery,
      updated_at = excluded.updated_at
  `).run(id, req.user.id, levelNum, nextLesson, nextLab, nextChallenge, nextQuiz, nextMastery, now);

  let gained = 0;
  if (labDone && !existing?.lab_done) gained += 40;
  if (quizDone && !existing?.quiz_done) gained += 50;
  if (challengeDone && !existing?.challenge_done) gained += 30;
  if (gained) awardXP(req.user.id, gained, `Cyber level ${levelNum} progress`);

  res.json({ message: 'Progress recorded', xpAwarded: gained });
});

router.post('/bookmark', requireAuth, (req, res) => {
  const { levelId, title } = req.body;
  if (!levelId) return res.status(400).json({ error: 'Level id required' });
  const now = new Date().toISOString();
  db.prepare(`
    INSERT OR IGNORE INTO bookmarks (id, user_id, track, level_id, title, created_at)
    VALUES (?, ?, 'cyber', ?, ?, ?)
  `).run(`bm-${req.user.id}-${levelId}`, req.user.id, levelId, title || levelId, now);

  db.prepare(`
    INSERT OR REPLACE INTO revision_items (id, user_id, topic_slug, subject_slug, title, reason, priority, created_at)
    VALUES (?, ?, ?, 'cybersecurity', ?, 'Bookmarked for revision', 'medium', ?)
  `).run(`rev-${req.user.id}-${levelId}`, req.user.id, levelId, title || levelId, now);

  res.json({ message: 'Bookmarked' });
});

module.exports = router;
