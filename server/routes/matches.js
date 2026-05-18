const router = require('express').Router();
const jwtAuth = require('../middleware/jwtAuth');
const db = require('../db/database');

router.get('/', jwtAuth, async (req, res) => {
  try {
    const matches = await db.aAll(`
      SELECT m.id as match_id, m.created_at as matched_at,
             u.id, u.first_name, u.age, u.city, u.photo_paths,
             (SELECT COUNT(*) FROM messages msg
              WHERE msg.match_id = m.id AND msg.sender_id != ? AND msg.is_read = 0) as unread_count
      FROM matches m
      JOIN users u ON (u.id = CASE WHEN m.user1_id = ? THEN m.user2_id ELSE m.user1_id END)
      WHERE m.user1_id = ? OR m.user2_id = ?
      ORDER BY m.created_at DESC
    `, [req.userId, req.userId, req.userId, req.userId]);

    res.json(matches.map(m => ({ ...m, photo_paths: JSON.parse(m.photo_paths || '[]') })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:matchId', jwtAuth, async (req, res) => {
  const match = await db.aGet('SELECT * FROM matches WHERE id = ?', [req.params.matchId]);
  if (!match) return res.status(404).json({ error: 'Match not found' });
  if (match.user1_id !== req.userId && match.user2_id !== req.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await db.aRun('DELETE FROM messages WHERE match_id = ?', [req.params.matchId]);
  await db.aRun('DELETE FROM matches WHERE id = ?', [req.params.matchId]);
  res.json({ message: 'Unmatched' });
});

module.exports = router;
