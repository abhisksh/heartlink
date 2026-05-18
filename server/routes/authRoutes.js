const router = require('express').Router();
const { validateTelegramInitData, loginOrCreate, issueJWT } = require('../auth');

router.post('/login', async (req, res) => {
  const { initData } = req.body;
  if (!initData) return res.status(400).json({ error: 'initData required' });
  const telegramUser = validateTelegramInitData(initData);
  if (!telegramUser) return res.status(401).json({ error: 'Invalid Telegram data' });
  try {
    const user = await loginOrCreate(telegramUser);
    const token = issueJWT(user.id);
    user.photo_paths = JSON.parse(user.photo_paths || '[]');
    user.video_paths = JSON.parse(user.video_paths || '[]');
    res.json({ token, user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
