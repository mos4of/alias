const Telegraf = require('telegraf');
const words = require('./words');
const path = require('path');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Store game state per chat
const games = new Map();

bot.start((ctx) => {
  ctx.reply('Добро пожаловать в игру Alias!', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Играть', callback_data: 'start_game' }]
      ]
    }
  });
});

bot.action('start_game', (ctx) => {
  ctx.editMessageText('Выберите уровень сложности:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Легкий', callback_data: 'diff_easy' }],
        [{ text: 'Средний', callback_data: 'diff_medium' }],
        [{ text: 'Сложный', callback_data: 'diff_hard' }]
      ]
    }
  });
});

bot.action(/^diff_(easy|medium|hard)$/, (ctx) => {
  const difficulty = ctx.match[1];
  const chatId = ctx.chat.id;
  
  // Initialize game state
  games.set(chatId, {
    difficulty,
    score: 0,
    currentWordIndex: 0,
    usedWords: new Set(),
    teamA: 0,
    teamB: 0,
    currentTeam: 'A',
    timer: null,
    timeLeft: 60
  });
  
  ctx.editMessageText(`Выбран уровень: ${difficulty}\nИгра начинается!`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Открыть игру', web_app: { url: process.env.WEB_APP_URL } }]
      ]
    }
  });
});

// Handle web app data from Mini App
bot.on('web_app_data', (ctx) => {
  try {
    const data = JSON.parse(ctx.web_app_data.data);
    const chatId = ctx.chat.id;
    const game = games.get(chatId);
    
    if (!game) {
      ctx.reply('Игра не найдена. Начните новую игру с /start');
      return;
    }
    
    if (data.action === 'guessed') {
      game.score++;
      // Get next word
      const wordList = words[game.difficulty];
      let nextWord;
      do {
        nextWord = wordList[Math.floor(Math.random() * wordList.length)];
      } while (game.usedWords.has(nextWord.word));
      
      game.usedWords.add(nextWord.word);
      game.currentWordIndex++;
      
      // Send updated word to web app
      ctx.telegram.sendChatAction(chatId, 'typing');
      // In a real implementation, we'd send this via web app update
      // For now, we'll just acknowledge
      ctx.reply(`Угадано! Счет: ${game.score}`);
    } else if (data.action === 'skipped') {
      // Just get next word without increasing score
      const wordList = words[game.difficulty];
      let nextWord;
      do {
        nextWord = wordList[Math.floor(Math.random() * wordList.length)];
      } while (game.usedWords.has(nextWord.word));
      
      game.usedWords.add(nextWord.word);
      game.currentWordIndex++;
      ctx.reply(`Пропущено. Счет: ${game.score}`);
    }
  } catch (e) {
    console.error('Error processing web app data:', e);
    ctx.reply('Произошла ошибка обработки данных');
  }
});

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

console.log('Bot started');