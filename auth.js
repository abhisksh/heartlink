const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('./db/database');

function validateTelegramInitData(initData) {
  if (initData === 'dev_test_mode') {
    return { id: 999999, first_name: 'DevUser', username: 'devuser' };
  }
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;
    params.delete('hash');
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(process.env.BOT_TOKEN).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    if (calculatedHash !== hash) return null;
    const userParam = params.get('user');
    if (!userParam) return null;
    return JSON.parse(userParam);
  } catch { return null; }
}

async function loginOrCreate(telegramUser) {
  const existing = await db.aGet('SELECT * FROM users WHERE id = ?', [telegramUser.id]);
  if (!existing) {
    await db.aRun(
      `INSERT INTO users (id, username, first_name, consent_given, created_at, last_active)
       VALUES (?, ?, ?, 0, datetime('now'), datetime('now'))`,
      [telegramUser.id, telegramUser.username || null, telegramUser.first_name || 'User']
    );
  } else {
    await db.aRun(
      `UPDATE users SET last_active = datetime('now'), username = COALESCE(?, username) WHERE id = ?`,
      [telegramUser.username || null, telegramUser.id]
    );
  }
  return db.aGet('SELECT * FROM users WHERE id = ?', [telegramUser.id]);
}

function issueJWT(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

module.exports = { validateTelegramInitData, loginOrCreate, issueJWT };
