require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);
const WEBAPP_URL = process.env.WEBAPP_URL || '';
const isHTTPS = WEBAPP_URL.startsWith('https://');

function buildStartKeyboard() {
  if (isHTTPS) {
    return Markup.inlineKeyboard([[Markup.button.webApp('💝 Open HeartLink', WEBAPP_URL)]]);
  }
  return Markup.inlineKeyboard([[Markup.button.url('💝 Open HeartLink (Dev)', 'https://t.me')]]);
}

bot.start(async (ctx) => {
  try {
    const devNote = isHTTPS ? '' : '\n\n<i>Dev Mode: Set WEBAPP_URL to an HTTPS URL for the Mini App button.</i>';
    await ctx.reply(
      `💝 <b>Welcome to HeartLink!</b>\n\nFind your perfect match — swipe, connect, and chat privately.${devNote}\n\n` +
      (isHTTPS ? `Tap below to open HeartLink 👇` : `Open the app to get started!`),
      { parse_mode: 'HTML', ...buildStartKeyboard() }
    );
  } catch (e) {
    console.error('Start handler error:', e.message);
  }
});

bot.help((ctx) => {
  ctx.reply(
    `💝 *HeartLink Help*\n\n/start - Open the app\n\nAll features are inside the Mini App!`,
    { parse_mode: 'Markdown' }
  );
});

// Only set menu button if HTTPS URL is configured
if (isHTTPS) {
  bot.telegram.setChatMenuButton({
    menuButton: { type: 'web_app', text: '💝 HeartLink', web_app: { url: WEBAPP_URL } },
  }).catch(err => console.error('Menu button error:', err.message));
}

bot.launch().then(() => {
  console.log('🤖 HeartLink Bot is running');
}).catch(err => {
  console.error('Bot launch failed:', err.message);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = bot;
