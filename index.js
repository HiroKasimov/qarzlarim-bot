const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const TOKEN = process.env.BOT_TOKEN || '8948826691:AAG_f1X_Ze3w1dFHxbpGDllrjSQdLSN2Jl4';
const APP_URL = 'https://hirokasimov.github.io/Moliyaviy-erkinlik/qarzlar.html';
const MINI_APP_URL = 'https://t.me/Hiro_moliyaviy_erkinligi_bot/Qarzlarim';

const bot = new TelegramBot(TOKEN, { polling: true });
const app = express();

app.get('/', (req, res) => res.send('Bot ishlayapti! ✅'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server port ${PORT} da ishlamoqda`));

// /start komandasi
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name || 'Do\'st';

  const text = `
⚡ *MOLIYAVIY ERKINLIK*
━━━━━━━━━━━━━━━━━━━━

Salom, *${name}*\\! 👋

Bu bot sening qarzlarini kuzatishga yordam beradi\\.

💸 *Hozirgi imkoniyatlar:*
• Barcha qarzlarni ko'rish
• Qarz qo'shish va o'chirish  
• Muddat kuzatish
• Real\\-vaqt saqlash \\(Firebase\\)

━━━━━━━━━━━━━━━━━━━━
_Botqoqdan chiqish vaqti keldi\\!_ 💪
`;

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: '💸 QARZLARIMNI KO\'RISH',
          web_app: { url: APP_URL }
        }
      ],
      [
        {
          text: '📊 STATISTIKA',
          callback_data: 'stats'
        },
        {
          text: '❓ YORDAM',
          callback_data: 'help'
        }
      ],
      [
        {
          text: '🚀 MINI APP OCHISH',
          url: MINI_APP_URL
        }
      ]
    ]
  };

  bot.sendMessage(chatId, text, {
    parse_mode: 'MarkdownV2',
    reply_markup: keyboard
  });
});

// /qarzlar komandasi
bot.onText(/\/qarzlar/, (msg) => {
  const chatId = msg.chat.id;

  const text = `
💸 *QARZLARIM*
━━━━━━━━━━━━━━━━━━━━

Barcha qarzlarni ko'rish uchun quyidagi tugmani bosing\\.

_Real\\-vaqt ma'lumotlar Firebase'da saqlanadi_
`;

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: '💸 QARZLARNI OCHISH',
          web_app: { url: APP_URL }
        }
      ]
    ]
  };

  bot.sendMessage(chatId, text, {
    parse_mode: 'MarkdownV2',
    reply_markup: keyboard
  });
});

// /help komandasi
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;

  const text = `
❓ *YORDAM*
━━━━━━━━━━━━━━━━━━━━

*Mavjud komandalar:*
/start \\- Botni ishga tushirish
/qarzlar \\- Qarzlarni ko'rish
/help \\- Shu yordam xabari

*Qanday ishlaydi:*
1\\. /start yoki /qarzlar bosing
2\\. "QARZLARNI OCHISH" tugmasini bosing
3\\. Ilovada qarzlarni tahrirlang
4\\. Hamma o'zgarish avtomatik saqlanadi ✅

━━━━━━━━━━━━━━━━━━━━
_Savollar bo'lsa\\ \\— harakat qilaveramiz\\!_ 💪
`;

  bot.sendMessage(chatId, text, { parse_mode: 'MarkdownV2' });
});

// Callback queries
bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data === 'help') {
    const text = `
❓ *YORDAM*
━━━━━━━━━━━━━━━━━━━━

*Mavjud komandalar:*
/start \\- Botni ishga tushirish
/qarzlar \\- Qarzlarni ko'rish
/help \\- Yordam

*Qanday ishlaydi:*
1\\. Qarzlarni ochish tugmasini bosing
2\\. Ilovada qarzlarni tahrirlang
3\\. Hamma narsa Firebase'da saqlanadi ✅
`;
    bot.sendMessage(chatId, text, { parse_mode: 'MarkdownV2' });
    bot.answerCallbackQuery(query.id);
  }

  if (data === 'stats') {
    const text = `
📊 *STATISTIKA*
━━━━━━━━━━━━━━━━━━━━

Statistikani ko'rish uchun ilovani oching \\— u yerda barcha ma'lumotlar real\\-vaqtda ko'rinadi\\.

💡 _Tez orada bot ichida ham statistika qo'shiladi\\!_
`;
    bot.sendMessage(chatId, text, { parse_mode: 'MarkdownV2' });
    bot.answerCallbackQuery(query.id);
  }
});

// Noma'lum xabarlar
bot.on('message', (msg) => {
  if (msg.text && !msg.text.startsWith('/')) {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId,
      '⚡ Botni ishlatish uchun /start yozing\\!',
      { parse_mode: 'MarkdownV2' }
    );
  }
});

console.log('🤖 Bot ishga tushdi!');
