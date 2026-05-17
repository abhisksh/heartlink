const router = require('express').Router();
const jwtAuth = require('../middleware/jwtAuth');
const db = require('../db/database');

router.get('/me', jwtAuth, async (req, res) => {
  try {
    const user = await db.aGet('SELECT * FROM users WHERE id = ?', [req.userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.photo_paths = JSON.parse(user.photo_paths || '[]');
    user.video_paths = JSON.parse(user.video_paths || '[]');
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/me', jwtAuth, async (req, res) => {
  const { age, gender, bio, city, looking_for, age_min, age_max, radius_km,
    latitude, longitude, registration_complete, consent_given, first_name } = req.body;
  try {
    await db.aRun(`
      UPDATE users SET
        first_name = COALESCE(?, first_name),
        age = COALESCE(?, age), gender = COALESCE(?, gender),
        bio = COALESCE(?, bio), city = COALESCE(?, city),
        looking_for = COALESCE(?, looking_for),
        age_min = COALESCE(?, age_min), age_max = COALESCE(?, age_max),
        radius_km = COALESCE(?, radius_km),
        latitude = COALESCE(?, latitude), longitude = COALESCE(?, longitude),
        registration_complete = COALESCE(?, registration_complete),
        consent_given = COALESCE(?, consent_given),
        last_active = datetime('now')
      WHERE id = ?
    `, [first_name || null, age || null, gender || null, bio || null, city || null,
        looking_for || null, age_min || null, age_max || null, radius_km || null,
        latitude || null, longitude || null,
        registration_complete != null ? (registration_complete ? 1 : 0) : null,
        consent_given != null ? (consent_given ? 1 : 0) : null,
        req.userId]);

    const user = await db.aGet('SELECT * FROM users WHERE id = ?', [req.userId]);
    user.photo_paths = JSON.parse(user.photo_paths || '[]');
    user.video_paths = JSON.parse(user.video_paths || '[]');
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/me/media', jwtAuth, async (req, res) => {
  const { photo_paths, video_paths } = req.body;
  const user = await db.aGet('SELECT * FROM users WHERE id = ?', [req.userId]);
  const currentPhotos = JSON.parse(user.photo_paths || '[]');
  const currentVideos = JSON.parse(user.video_paths || '[]');
  const newPhotos = photo_paths ? [...currentPhotos, ...photo_paths] : currentPhotos;
  const newVideos = video_paths ? [...currentVideos, ...video_paths] : currentVideos;
  await db.aRun('UPDATE users SET photo_paths = ?, video_paths = ? WHERE id = ?',
    [JSON.stringify(newPhotos), JSON.stringify(newVideos), req.userId]);
  res.json({ photo_paths: newPhotos, video_paths: newVideos });
});

router.delete('/me', jwtAuth, async (req, res) => {
  await db.aRun('DELETE FROM messages WHERE sender_id = ?', [req.userId]);
  await db.aRun('DELETE FROM swipes WHERE swiper_id = ? OR swiped_id = ?', [req.userId, req.userId]);
  await db.aRun('DELETE FROM matches WHERE user1_id = ? OR user2_id = ?', [req.userId, req.userId]);
  await db.aRun('DELETE FROM users WHERE id = ?', [req.userId]);
  res.json({ message: 'Account deleted' });
});

router.put('/me/pause', jwtAuth, async (req, res) => {
  const user = await db.aGet('SELECT is_active FROM users WHERE id = ?', [req.userId]);
  const newState = user.is_active ? 0 : 1;
  await db.aRun('UPDATE users SET is_active = ? WHERE id = ?', [newState, req.userId]);
  res.json({ is_active: newState });
});

module.exports = router;
