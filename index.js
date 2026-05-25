const fetch = require('node-fetch');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const TOKEN = process.env.BOT_TOKEN;
const APP_URL = 'https://hirokasimov.github.io/Moliyaviy-erkinlik/qarzlar.html';
const MINI_APP_URL = 'https://t.me/Hiro_moliyaviy_erkinligi_bot/Qarzlarim';
const FIREBASE_URL = 'https://moliyaviy-erkinlik-default-rtdb.firebaseio.com';

const bot = new TelegramBot(TOKEN, { polling: true });
const app = express();

app.get('/', (req, res) => res.send('Bot ishlayapti! ✅'));
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server port ${PORT} da ishlamoqda`));

// ─── Firebase dan ma'lumot olish ───────────────────────────────────────────
async function getQarzlar() {
  const url = `${FIREBASE_URL}/qarzlar.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Firebase xatosi');
  return await res.json();
}

// ─── Yordamchi funksiyalar ─────────────────────────────────────────────────
function fmt(n) {
  return Number(n).toLocaleString('ru-RU') + " so'm";
}

function urgentStatus(dateStr) {
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  if (diff < 0)  return { emoji: '🔴', label: 'MUDDATI O\'TDI', days: diff };
  if (diff <= 7) return { emoji: '🚨', label: `${diff} kun qoldi`, days: diff };
  if (diff <= 20) return { emoji: '⚠️', label: `${diff} kun qoldi`, days: diff };
  return null;
}

const SECTION_NAMES = {
  uzum:     '🏦 Uzum Bank',
  payme:    '📱 Payme',
  yengil:   '💰 Yengil Kredit',
  paylater: '💳 Pay Later',
  tebo:     '🛵 Tebo Skuter',
  boshqa:   '📦 Boshqa'
};

// ─── Statistika hisobi ─────────────────────────────────────────────────────
async function buildStats() {
  const data = await getQarzlar();
  if (!data) return null;

  let grandTotal = 0;
  const sections = [];
  const urgentList = [];

  for (const [secId, items] of Object.entries(data)) {
    if (!items) continue;
    let secTotal = 0;
    const debts = Object.values(items);

    debts.forEach(d => {
      secTotal += Number(d.amount || 0);
      const urg = urgentStatus(d.date);
      if (urg) {
        urgentList.push({
          section: SECTION_NAMES[secId] || secId,
          name: d.name,
          amount: d.amount,
          date: d.date,
          status: urg
        });
      }
    });

    if (secTotal > 0) {
      sections.push({ id: secId, name: SECTION_NAMES[secId] || secId, total: secTotal });
    }
    grandTotal += secTotal;
  }

  // Urgent'larni sanaga qarab sort
  urgentList.sort((a, b) => new Date(a.date) - new Date(b.date));

  return { grandTotal, sections, urgentList };
}

// ─── /start ────────────────────────────────────────────────────────────────
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name || 'Do\'st';

  const text = `⚡ *MOLIYAVIY ERKINLIK*
━━━━━━━━━━━━━━━━━━━━

Salom, *${escape(name)}*\\! 👋

Bu bot qarzlaringni kuzatishga yordam beradi\\.

💸 *Imkoniyatlar:*
• 📊 Real\\-vaqt statistika
• 🚨 Urgent to'lovlarni aniqlash
• 📋 Kategoriya bo'yicha qarzlar
• ✏️ Mini App orqali tahrirlash

━━━━━━━━━━━━━━━━━━━━
_Botqoqdan chiqish vaqti keldi\\!_ 💪`;

  bot.sendMessage(chatId, text, {
    parse_mode: 'MarkdownV2',
    reply_markup: mainKeyboard()
  });
});

// ─── /statistika ──────────────────────────────────────────────────────────
bot.onText(/\/statistika/, async (msg) => {
  await sendStats(msg.chat.id);
});

// ─── /qarzlar ─────────────────────────────────────────────────────────────
bot.onText(/\/qarzlar/, async (msg) => {
  await sendAllDebts(msg.chat.id);
});

// ─── /urgent ──────────────────────────────────────────────────────────────
bot.onText(/\/urgent/, async (msg) => {
  await sendUrgent(msg.chat.id);
});

// ─── /help ────────────────────────────────────────────────────────────────
bot.onText(/\/help/, (msg) => {
  const text = `❓ *YORDAM*
━━━━━━━━━━━━━━━━━━━━

*Komandalar:*
/start \\- Bosh menyu
/statistika \\- Umumiy statistika
/qarzlar \\- Barcha qarzlar
/urgent \\- Muddati yaqin to'lovlar
/help \\- Yordam

*Qanday ishlaydi:*
1\\. Bot Firebase'dan ma'lumot o'qiydi
2\\. Avtomatik hisoblaydi
3\\. Muddati 7 kun qolganda 🚨 urgent`;

  bot.sendMessage(msg.chat.id, text, {
    parse_mode: 'MarkdownV2',
    reply_markup: mainKeyboard()
  });
});

// ─── Callback queries ──────────────────────────────────────────────────────
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  bot.answerCallbackQuery(query.id);

  if (query.data === 'stats')   await sendStats(chatId);
  if (query.data === 'urgent')  await sendUrgent(chatId);
  if (query.data === 'all')     await sendAllDebts(chatId);
  if (query.data === 'help') {
    bot.sendMessage(chatId,
      '❓ Yordam uchun /help yozing\\.',
      { parse_mode: 'MarkdownV2' }
    );
  }
});

// ─── Noma'lum xabarlar ─────────────────────────────────────────────────────
bot.on('message', (msg) => {
  if (msg.text && !msg.text.startsWith('/')) {
    bot.sendMessage(msg.chat.id,
      '⚡ Botni ishlatish uchun /start yozing\\!',
      { parse_mode: 'MarkdownV2' }
    );
  }
});

// ─── Statistika xabari ─────────────────────────────────────────────────────
async function sendStats(chatId) {
  const loading = await bot.sendMessage(chatId, '⏳ Firebase\'dan yuklanmoqda\\.\\.\\.', { parse_mode: 'MarkdownV2' });

  try {
    const stats = await buildStats();
    if (!stats) {
      bot.editMessageText('❌ Ma\'lumot topilmadi\\.', {
        chat_id: chatId, message_id: loading.message_id, parse_mode: 'MarkdownV2'
      });
      return;
    }

    const urgCount = stats.urgentList.length;
    let text = `📊 *MOLIYAVIY STATISTIKA*
━━━━━━━━━━━━━━━━━━━━

💰 *Umumiy qarz:* \`${escape(fmt(stats.grandTotal))}\`
${urgCount > 0 ? `🚨 *Urgent to'lovlar:* ${urgCount} ta` : '✅ Hozircha urgent yo\'q'}

📋 *Kategoriyalar:*\n`;

    stats.sections.forEach(sec => {
      const percent = Math.round((sec.total / stats.grandTotal) * 100);
      text += `${escape(sec.name)} — \`${escape(fmt(sec.total))}\` \\(${percent}%\\)\n`;
    });

    text += `\n━━━━━━━━━━━━━━━━━━━━
_Ma'lumot Firebase'dan olindi_ ⚡`;

    bot.editMessageText(text, {
      chat_id: chatId,
      message_id: loading.message_id,
      parse_mode: 'MarkdownV2',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🚨 Urgentlar', callback_data: 'urgent' },
            { text: '📋 Barcha qarzlar', callback_data: 'all' }
          ],
          [{ text: '✏️ Mini App', web_app: { url: APP_URL } }]
        ]
      }
    });
  } catch (e) {
    bot.editMessageText('❌ Xatolik: ' + escape(e.message), {
      chat_id: chatId, message_id: loading.message_id, parse_mode: 'MarkdownV2'
    });
  }
}

// ─── Urgent xabari ─────────────────────────────────────────────────────────
async function sendUrgent(chatId) {
  const loading = await bot.sendMessage(chatId, '⏳ Tekshirilmoqda\\.\\.\\.', { parse_mode: 'MarkdownV2' });

  try {
    const stats = await buildStats();

    if (!stats || stats.urgentList.length === 0) {
      bot.editMessageText('✅ *Hozircha urgent to\'lovlar yo\'q\\!*\n\n_Barcha muddatlar 20+ kun uzoqda_ 😌', {
        chat_id: chatId, message_id: loading.message_id, parse_mode: 'MarkdownV2'
      });
      return;
    }

    let text = `🚨 *URGENT TO'LOVLAR*
━━━━━━━━━━━━━━━━━━━━\n\n`;

    stats.urgentList.forEach(item => {
      text += `${item.status.emoji} *${escape(item.name)}*\n`;
      text += `   📁 ${escape(item.section)}\n`;
      text += `   💸 \`${escape(fmt(item.amount))}\`\n`;
      text += `   📅 ${escape(item.date)} — _${escape(item.status.label)}_\n\n`;
    });

    const urgTotal = stats.urgentList.reduce((s, i) => s + Number(i.amount), 0);
    text += `━━━━━━━━━━━━━━━━━━━━\n💰 *Jami urgent:* \`${escape(fmt(urgTotal))}\``;

    bot.editMessageText(text, {
      chat_id: chatId,
      message_id: loading.message_id,
      parse_mode: 'MarkdownV2',
      reply_markup: {
        inline_keyboard: [
          [{ text: '✏️ Mini App ochish', web_app: { url: APP_URL } }],
          [{ text: '📊 Statistika', callback_data: 'stats' }]
        ]
      }
    });
  } catch (e) {
    bot.editMessageText('❌ Xatolik: ' + escape(e.message), {
      chat_id: chatId, message_id: loading.message_id, parse_mode: 'MarkdownV2'
    });
  }
}

// ─── Barcha qarzlar ────────────────────────────────────────────────────────
async function sendAllDebts(chatId) {
  const loading = await bot.sendMessage(chatId, '⏳ Yuklanmoqda\\.\\.\\.', { parse_mode: 'MarkdownV2' });

  try {
    const stats = await buildStats();
    if (!stats) {
      bot.editMessageText('❌ Ma\'lumot topilmadi\\.', {
        chat_id: chatId, message_id: loading.message_id, parse_mode: 'MarkdownV2'
      });
      return;
    }

    const data = await getQarzlar();
    let text = `📋 *BARCHA QARZLAR*\n━━━━━━━━━━━━━━━━━━━━\n\n`;

    for (const [secId, items] of Object.entries(data)) {
      if (!items) continue;
      const debts = Object.values(items);
      if (debts.length === 0) continue;

      const secTotal = debts.reduce((s, d) => s + Number(d.amount || 0), 0);
      text += `*${escape(SECTION_NAMES[secId] || secId)}* — \`${escape(fmt(secTotal))}\`\n`;

      debts.forEach(d => {
        const urg = urgentStatus(d.date);
        const flag = urg ? urg.emoji : '  ';
        text += `${flag} ${escape(d.name)} — \`${escape(fmt(d.amount))}\` _\\(${escape(d.date)}\\)_\n`;
      });
      text += '\n';
    }

    text += `━━━━━━━━━━━━━━━━━━━━\n💰 *Jami:* \`${escape(fmt(stats.grandTotal))}\``;

    bot.editMessageText(text, {
      chat_id: chatId,
      message_id: loading.message_id,
      parse_mode: 'MarkdownV2',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🚨 Urgentlar', callback_data: 'urgent' },
            { text: '📊 Statistika', callback_data: 'stats' }
          ],
          [{ text: '✏️ Mini App', web_app: { url: APP_URL } }]
        ]
      }
    });
  } catch (e) {
    bot.editMessageText('❌ Xatolik: ' + escape(e.message), {
      chat_id: chatId, message_id: loading.message_id, parse_mode: 'MarkdownV2'
    });
  }
}

// ─── Keyboard ──────────────────────────────────────────────────────────────
function mainKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '📊 STATISTIKA', callback_data: 'stats' }],
      [
        { text: '🚨 URGENT', callback_data: 'urgent' },
        { text: '📋 BARCHASI', callback_data: 'all' }
      ],
      [{ text: '✏️ MINI APP OCHISH', web_app: { url: APP_URL } }]
    ]
  };
}

// ─── MarkdownV2 escape ─────────────────────────────────────────────────────
function escape(str) {
  return String(str).replace(/[_*[\]()~`>#+=|{}.!\\-]/g, '\\$&');
}

console.log('🤖 Bot ishga tushdi!');
