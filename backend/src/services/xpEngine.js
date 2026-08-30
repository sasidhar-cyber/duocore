const { db } = require('../db');

function calculateLevel(xp) {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

function awardXP(userId, amount, reason = '') {
  try {
    const user = db.prepare('SELECT xp, level FROM users WHERE id = ?').get(userId);
    if (!user) return;

    const newXp = (user.xp || 0) + amount;
    const newLevel = calculateLevel(newXp);

    db.prepare('UPDATE users SET xp = ?, level = ? WHERE id = ?').run(newXp, newLevel, userId);
    return { xp: newXp, level: newLevel, leveledUp: newLevel > user.level };
  } catch (err) {
    console.error('[XP Engine Error]', err);
  }
}

module.exports = { awardXP, calculateLevel };
