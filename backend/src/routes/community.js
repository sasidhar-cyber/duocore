const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { awardXP } = require('../services/xpEngine');

const router = express.Router();

// 1. GET Public Community Posts / Writeups
router.get('/posts', (req, res) => {
  try {
    const { category, tag, search, sort = 'latest' } = req.query;

    let sql = `
      SELECT p.*, u.username, u.avatar_url, u.level, u.xp
      FROM community_posts p
      JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (category && category !== 'all') {
      sql += ' AND p.category = ?';
      params.push(category);
    }

    if (tag) {
      sql += ' AND p.tags LIKE ?';
      params.push(`%${tag}%`);
    }

    if (search) {
      sql += ' AND (p.title LIKE ? OR p.content LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (sort === 'popular') {
      sql += ' ORDER BY p.likes_count DESC, p.created_at DESC';
    } else {
      sql += ' ORDER BY p.created_at DESC';
    }

    sql += ' LIMIT 50';

    const posts = db.prepare(sql).all(...params);
    const parsed = posts.map(p => ({
      ...p,
      tags: typeof p.tags === 'string' ? JSON.parse(p.tags || '[]') : p.tags
    }));

    res.json({ posts: parsed });
  } catch (error) {
    console.error('[Community Posts GET]', error);
    res.status(500).json({ error: 'Failed to fetch community posts' });
  }
});

// 2. GET Single Post with Comments
router.get('/posts/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Increment view count
    db.prepare('UPDATE community_posts SET views_count = views_count + 1 WHERE id = ?').run(id);

    const post = db.prepare(`
      SELECT p.*, u.username, u.avatar_url, u.level, u.xp
      FROM community_posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comments = db.prepare(`
      SELECT c.*, u.username, u.avatar_url, u.level
      FROM post_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `).all(id);

    res.json({
      post: {
        ...post,
        tags: typeof post.tags === 'string' ? JSON.parse(post.tags || '[]') : post.tags
      },
      comments
    });
  } catch (error) {
    console.error('[Community Post Detail GET]', error);
    res.status(500).json({ error: 'Failed to fetch post details' });
  }
});

// 3. POST Create New Community Writeup
router.post('/posts', requireAuth, (req, res) => {
  try {
    const { title, category = 'writeup', tags = [], content, code_snippet = '' } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const id = 'post-' + uuidv4().slice(0, 10);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO community_posts (id, user_id, title, category, tags, content, code_snippet, likes_count, comments_count, views_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?)
    `).run(
      id,
      req.user.id,
      title.trim(),
      category,
      JSON.stringify(Array.isArray(tags) ? tags : []),
      content.trim(),
      code_snippet.trim(),
      now,
      now
    );

    awardXP(req.user.id, 50, 'Published community writeup');

    const created = db.prepare(`
      SELECT p.*, u.username, u.avatar_url, u.level
      FROM community_posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(id);

    res.status(201).json({
      message: 'Writeup published successfully!',
      post: {
        ...created,
        tags: JSON.parse(created.tags || '[]')
      }
    });
  } catch (error) {
    console.error('[Community Post Create]', error);
    res.status(500).json({ error: 'Failed to create writeup' });
  }
});

// 4. POST Like / Unlike Post
router.post('/posts/:id/like', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existing = db.prepare('SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?').get(id, userId);

    if (existing) {
      db.prepare('DELETE FROM post_likes WHERE id = ?').run(existing.id);
      db.prepare('UPDATE community_posts SET likes_count = MAX(0, likes_count - 1) WHERE id = ?').run(id);
      res.json({ liked: false });
    } else {
      const likeId = 'like-' + uuidv4().slice(0, 8);
      db.prepare('INSERT INTO post_likes (id, post_id, user_id, created_at) VALUES (?, ?, ?, ?)').run(
        likeId,
        id,
        userId,
        new Date().toISOString()
      );
      db.prepare('UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = ?').run(id);
      awardXP(userId, 5, 'Liked writeup');
      res.json({ liked: true });
    }
  } catch (error) {
    console.error('[Community Like]', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// 5. POST Add Comment to Post
router.post('/posts/:id/comments', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const commentId = 'com-' + uuidv4().slice(0, 8);
    const now = new Date().toISOString();

    db.prepare('INSERT INTO post_comments (id, post_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)').run(
      commentId,
      id,
      req.user.id,
      content.trim(),
      now
    );

    db.prepare('UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = ?').run(id);
    awardXP(req.user.id, 10, 'Commented on writeup');

    const comment = db.prepare(`
      SELECT c.*, u.username, u.avatar_url, u.level
      FROM post_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(commentId);

    res.status(201).json({ message: 'Comment added', comment });
  } catch (error) {
    console.error('[Community Comment Add]', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// 6. GET Public Community CTF Challenges
router.get('/challenges', (req, res) => {
  try {
    const challenges = db.prepare(`
      SELECT c.id, c.created_by, c.title, c.category, c.difficulty, c.points, c.description, c.hint, c.solved_count, c.created_at,
             u.username as author_username, u.avatar_url as author_avatar
      FROM community_challenges c
      JOIN users u ON c.created_by = u.id
      ORDER BY c.created_at DESC
    `).all();

    res.json({ challenges });
  } catch (error) {
    console.error('[Community Challenges GET]', error);
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});

// 7. POST Submit CTF Challenge Flag
router.post('/challenges/:id/submit', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { flag } = req.body;
    const userId = req.user.id;

    if (!flag || !flag.trim()) {
      return res.status(400).json({ error: 'Flag is required' });
    }

    const challenge = db.prepare('SELECT * FROM community_challenges WHERE id = ?').get(id);
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const cleanInputFlag = flag.trim();
    if (cleanInputFlag !== challenge.flag.trim()) {
      return res.status(400).json({ isCorrect: false, error: 'Incorrect flag. Try analyzing the challenge again!' });
    }

    // Check if already solved
    const existingSolve = db.prepare('SELECT id FROM challenge_solves WHERE challenge_id = ? AND user_id = ?').get(id, userId);

    if (existingSolve) {
      return res.json({
        isCorrect: true,
        alreadySolved: true,
        message: 'Correct flag! (Already recorded earlier)'
      });
    }

    const solveId = 'solve-' + uuidv4().slice(0, 8);
    const now = new Date().toISOString();

    db.prepare('INSERT INTO challenge_solves (id, challenge_id, user_id, solved_at) VALUES (?, ?, ?, ?)').run(
      solveId,
      id,
      userId,
      now
    );

    db.prepare('UPDATE community_challenges SET solved_count = solved_count + 1 WHERE id = ?').run(id);
    awardXP(userId, challenge.points || 100, `Solved CTF: ${challenge.title}`);

    res.json({
      isCorrect: true,
      alreadySolved: false,
      points: challenge.points || 100,
      message: `🎉 Correct! Flag verified! +${challenge.points || 100} XP awarded!`
    });
  } catch (error) {
    console.error('[Challenge Submit]', error);
    res.status(500).json({ error: 'Failed to submit flag' });
  }
});

// 8. GET Global Hall of Fame / Leaderboard
router.get('/leaderboard', (req, res) => {
  try {
    const topUsers = db.prepare(`
      SELECT u.id, u.username, u.avatar_url, u.bio, u.xp, u.level, u.streak,
             COUNT(DISTINCT cs.id) as challenges_solved,
             COUNT(DISTINCT cp.id) as writeups_published
      FROM users u
      LEFT JOIN challenge_solves cs ON u.id = cs.user_id
      LEFT JOIN community_posts cp ON u.id = cp.user_id
      GROUP BY u.id
      ORDER BY u.xp DESC, challenges_solved DESC
      LIMIT 25
    `).all();

    res.json({ leaderboard: topUsers });
  } catch (error) {
    console.error('[Leaderboard GET]', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
