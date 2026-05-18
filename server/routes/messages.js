const router = require('express').Router();
const jwtAuth = require('../middleware/jwtAuth');
const db = require('../db/database');
const { sendMessageNotification } = require('../../bot/notifications');

router.get('/:matchId', jwtAuth, async (req, res) => {
  try {
    const match = await db.aGet('SELECT * FROM matches WHERE id = ?', [req.params.matchId]);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (match.user1_id !== req.userId && match.user2_id !== req.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await db.aRun(
      'UPDATE messages SET is_read = 1 WHERE match_id = ? AND sender_id != ?',
      [req.params.matchId, req.userId]
    );
    const messages = await db.aAll(
      'SELECT * FROM messages WHERE match_id = ? ORDER BY created_at ASC',
      [req.params.matchId]
    );
    res.json(messages);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/send', jwtAuth, async (req, res) => {
  const { matchId, content, media_path } = req.body;
  if (!matchId || (!content && !media_path)) {
    return res.status(400).json({ error: 'matchId and content required' });
  }
  try {
    const match = await db.aGet('SELECT * FROM matches WHERE id = ?', [matchId]);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (match.user1_id !== req.userId && match.user2_id !== req.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const result = await db.aRun(
      'INSERT INTO messages (match_id, sender_id, content, media_path) VALUES (?, ?, ?, ?)',
      [matchId, req.userId, content || null, media_path || null]
    );
    const recipientId = match.user1_id === req.userId ? match.user2_id : match.user1_id;
    const sender = await db.aGet('SELECT first_name FROM users WHERE id = ?', [req.userId]);
    try { sendMessageNotification(recipientId, sender.first_name, content, matchId); } catch {}
    res.json({ id: result.lastID, matchId, content, created_at: new Date().toISOString() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
