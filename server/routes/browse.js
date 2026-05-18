const router = require('express').Router();
const jwtAuth = require('../middleware/jwtAuth');
const db = require('../db/database');
const haversine = require('../utils/haversine');
const { checkAndIncrementLike } = require('../utils/likeLimit');
const { sendMatchNotification } = require('../../bot/notifications');

router.get('/', jwtAuth, async (req, res) => {
  try {
    const me = await db.aGet('SELECT * FROM users WHERE id = ?', [req.userId]);
    if (!me) return res.status(404).json({ error: 'User not found' });

    const swiped = await db.aAll('SELECT swiped_id FROM swipes WHERE swiper_id = ?', [req.userId]);
    const excludeIds = [req.userId, ...swiped.map(r => r.swiped_id)];
    const placeholders = excludeIds.map(() => '?').join(',');

    let genderFilter = '';
    const genderParams = [];
    if (me.looking_for === 'male') { genderFilter = "AND gender = ?"; genderParams.push('male'); }
    else if (me.looking_for === 'female') { genderFilter = "AND gender = ?"; genderParams.push('female'); }

    const candidates = await db.aAll(
      `SELECT * FROM users
       WHERE id NOT IN (${placeholders})
       AND registration_complete = 1
       AND is_active = 1
       AND age BETWEEN ? AND ?
       ${genderFilter}
       LIMIT 50`,
      [...excludeIds, me.age_min || 18, me.age_max || 99, ...genderParams]
    );

    const filtered = candidates.filter(c => {
      if (!me.latitude || !me.longitude || !c.latitude || !c.longitude) return true;
      const dist = haversine(me.latitude, me.longitude, c.latitude, c.longitude);
      c.distance_km = Math.round(dist);
      return dist <= (me.radius_km || 9999);
    });

    if (filtered.length === 0) return res.json(null);

    const profile = filtered[0];
    profile.photo_paths = JSON.parse(profile.photo_paths || '[]');
    profile.video_paths = JSON.parse(profile.video_paths || '[]');
    delete profile.latitude; delete profile.longitude;
    delete profile.daily_likes_used; delete profile.likes_reset_date;

    res.json(profile);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/swipe', jwtAuth, async (req, res) => {
  const { targetId, action } = req.body;
  if (!targetId || !['like', 'pass'].includes(action)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  if (action === 'like') {
    const limitCheck = await checkAndIncrementLike(req.userId);
    if (!limitCheck.allowed) {
      return res.status(429).json({ error: 'daily_limit', message: 'Daily like limit reached. Upgrade to Premium!' });
    }
  }

  try {
    await db.aRun(
      'INSERT OR IGNORE INTO swipes (swiper_id, swiped_id, action) VALUES (?, ?, ?)',
      [req.userId, targetId, action]
    );
  } catch {}

  let matched = false, matchId = null;

  if (action === 'like') {
    const theirLike = await db.aGet(
      "SELECT 1 FROM swipes WHERE swiper_id = ? AND swiped_id = ? AND action = 'like'",
      [targetId, req.userId]
    );

    if (theirLike) {
      const existing = await db.aGet(
        'SELECT id FROM matches WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)',
        [req.userId, targetId, targetId, req.userId]
      );
      if (!existing) {
        const result = await db.aRun(
          'INSERT INTO matches (user1_id, user2_id) VALUES (?, ?)',
          [req.userId, targetId]
        );
        matchId = result.lastID;
        matched = true;
        try { sendMatchNotification(req.userId, targetId, matchId); } catch {}
      }
    }
  }

  res.json({ matched, matchId });
});

module.exports = router;
