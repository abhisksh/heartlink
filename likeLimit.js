const db = require('../db/database');
const FREE_DAILY_LIMIT = 5;

async function checkAndIncrementLike(userId) {
  const user = await db.aGet('SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) return { allowed: false, reason: 'User not found' };

  if (user.is_premium && user.premium_until && new Date(user.premium_until) > new Date()) {
    return { allowed: true, isPremium: true };
  }

  const today = new Date().toISOString().slice(0, 10);
  if (user.likes_reset_date !== today) {
    await db.aRun('UPDATE users SET daily_likes_used = 0, likes_reset_date = ? WHERE id = ?', [today, userId]);
    user.daily_likes_used = 0;
  }

  if (user.daily_likes_used >= FREE_DAILY_LIMIT) {
    return { allowed: false, reason: 'daily_limit', remaining: 0 };
  }

  await db.aRun('UPDATE users SET daily_likes_used = daily_likes_used + 1 WHERE id = ?', [userId]);
  return { allowed: true, remaining: FREE_DAILY_LIMIT - user.daily_likes_used - 1 };
}

module.exports = { checkAndIncrementLike, FREE_DAILY_LIMIT };
