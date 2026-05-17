let bot;

function getBot() {
  if (!bot) {
    try { bot = require('./bot'); } catch { return null; }
  }
  return bot;
}

async function sendMatchNotification(userId1, userId2, matchId) {
  const b = getBot();
  if (!b) return;

  const db = require('../server/db/database');
  const u1 = db.prepare('SELECT first_name FROM users WHERE id = ?').get(userId1);
  const u2 = db.prepare('SELECT first_name FROM users WHERE id = ?').get(userId2);

  const webappUrl = process.env.WEBAPP_URL || 'http://localhost:5173';
  const { Markup } = require('telegraf');

  const btn = Markup.inlineKeyboard([[Markup.button.webApp('💬 Open Chat', `${webappUrl}/chat/${matchId}`)]]);

  const msg1 = `🔥 *It's a Match!*\n\nYou and *${u2?.first_name || 'someone'}* liked each other!\n\nStart chatting now 👇`;
  const msg2 = `🔥 *It's a Match!*\n\nYou and *${u1?.first_name || 'someone'}* liked each other!\n\nStart chatting now 👇`;

  await b.telegram.sendMessage(userId1, msg1, { parse_mode: 'Markdown', ...btn }).catch(() => {});
  await b.telegram.sendMessage(userId2, msg2, { parse_mode: 'Markdown', ...btn }).catch(() => {});
}

async function sendMessageNotification(recipientId, senderName, content, matchId) {
  const b = getBot();
  if (!b) return;

  const webappUrl = process.env.WEBAPP_URL || 'http://localhost:5173';
  const { Markup } = require('telegraf');

  const preview = content && content.length > 60 ? content.slice(0, 60) + '…' : content || '📷 Media';
  const text = `💌 *New message from ${senderName}:*\n\n${preview}`;
  const btn = Markup.inlineKeyboard([[Markup.button.webApp('💬 Reply', `${webappUrl}/chat/${matchId}`)]]);

  await b.telegram.sendMessage(recipientId, text, { parse_mode: 'Markdown', ...btn }).catch(() => {});
}

module.exports = { sendMatchNotification, sendMessageNotification };
