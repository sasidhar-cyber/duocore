const express = require('express');
const { db } = require('../db');
const { executeVirtualCommand } = require('../services/linuxLabEngine');
const { requireAuth } = require('../middleware/auth');
const { awardXP } = require('../services/xpEngine');

const router = express.Router();

// Get user Linux progress
router.get('/progress', requireAuth, (req, res) => {
  const progress = db.prepare('SELECT * FROM level_progress WHERE user_id = ? AND track = ?').all(req.user.id, 'linux');
  res.json({ progress });
});

// Update Linux level progress
router.post('/progress/update', requireAuth, (req, res) => {
  const { levelNum, lessonDone, labDone, challengeDone, quizDone, mastery } = req.body;
  if (!levelNum) return res.status(400).json({ error: 'Level number required' });

  const now = new Date().toISOString();
  const id = `lp-linux-${req.user.id}-${levelNum}`;

  db.prepare(`
    INSERT INTO level_progress (id, user_id, track, level_num, lesson_done, lab_done, challenge_done, quiz_done, mastery, updated_at)
    VALUES (?, ?, 'linux', ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, track, level_num) DO UPDATE SET
      lesson_done = COALESCE(excluded.lesson_done, level_progress.lesson_done),
      lab_done = COALESCE(excluded.lab_done, level_progress.lab_done),
      challenge_done = COALESCE(excluded.challenge_done, level_progress.challenge_done),
      quiz_done = COALESCE(excluded.quiz_done, level_progress.quiz_done),
      mastery = COALESCE(excluded.mastery, level_progress.mastery),
      updated_at = excluded.updated_at
  `).run(
    id,
    req.user.id,
    levelNum,
    lessonDone ? 1 : 0,
    labDone ? 1 : 0,
    challengeDone ? 1 : 0,
    quizDone ? 1 : 0,
    mastery || 50,
    now
  );

  awardXP(req.user.id, 50, `Completed Linux Level ${levelNum} challenge`);
  res.json({ message: 'Linux progress recorded' });
});

// Execute virtual command
router.post('/terminal', requireAuth, (req, res) => {
  const { command, cwd } = req.body;
  if (typeof command !== 'string') {
    return res.status(400).json({ error: 'Command string required' });
  }

  const result = executeVirtualCommand(command, cwd || '~');
  awardXP(req.user.id, 5, 'Terminal command');
  res.json(result);
});

module.exports = router;
