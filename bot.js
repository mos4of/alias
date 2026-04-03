const { Telegraf } = require('telegraf');
const words = require('./words');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// Store game state per chat
const games = new Map();

bot.start((ctx) => {
  const webAppUrl = process.env.WEB_APP_URL;
  ctx.reply('🎮 Добро пожаловать в игру Alias!\n\nНажмите кнопку ниже чтобы открыть игру:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🚀 Открыть игру', web_app: { url: webAppUrl } }]
      ]
    }
  });
});

// Handle web app data from Mini App
bot.on('web_app_data', (ctx) => {
  try {
    const data = JSON.parse(ctx.web_app_data.data);
    const chatId = ctx.chat.id;
    
    console.log('Web app data received:', data);
    
    if (data.action === 'start_game') {
      const difficulty = data.difficulty || 'easy';
      
      // Initialize game state
      games.set(chatId, {
        difficulty,
        score: 0,
        usedWords: new Set()
      });
      
      // Get first word
      const wordList = words[difficulty];
      const randomIndex = Math.floor(Math.random() * wordList.length);
      const wordObj = wordList[randomIndex];
      
      games.get(chatId).usedWords.add(wordObj.word);
      
      // Send first word to user in chat
      ctx.reply(`🎮 Игра началась!\nУровень: ${difficulty}\n\nСлово: ${wordObj.word}\nДействие: ${wordObj.action}\n\n⏱ У вас есть 60 секунд!`);
      
    } else if (data.action === 'guessed') {
      const game = games.get(chatId);
      
      if (!game) {
        ctx.reply('❌ Игра не найдена. Начните новую игру с /start');
        return;
      }
      
      game.score++;
      
      // Get next word
      const wordList = words[game.difficulty];
      let nextWord;
      do {
        nextWord = wordList[Math.floor(Math.random() * wordList.length)];
      } while (game.usedWords.has(nextWord.word));
      
      game.usedWords.add(nextWord.word);
      
      ctx.reply(`✅ Угадано! +1 очко\nСчет: ${game.score}\n\nСлово: ${nextWord.word}\nДействие: ${nextWord.action}`);
      
    } else if (data.action === 'skipped') {
      const game = games.get(chatId);
      
      if (!game) {
        ctx.reply('❌ Игра не найдена. Начните новую игру с /start');
        return;
      }
      
      // Get next word
      const wordList = words[game.difficulty];
      let nextWord;
      do {
        nextWord = wordList[Math.floor(Math.random() * wordList.length)];
      } while (game.usedWords.has(nextWord.word));
      
      game.usedWords.add(nextWord.word);
      
      ctx.reply(`⏭ Пропущено\nСчет: ${game.score}\n\nСлово: ${nextWord.word}\nДействие: ${nextWord.action}`);
      
    } else if (data.action === 'game_over') {
      const game = games.get(chatId);
      
      if (game) {
        ctx.reply(`🏁 Игра окончена!\nИтоговый счет: ${game.score}\n\nДля новой игры нажмите /start`);
        games.delete(chatId);
      }
    }
  } catch (e) {
    console.error('Error processing web app data:', e);
    ctx.reply('❌ Произошла ошибка обработки данных');
  }
});

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

console.log('✅ Bot started successfully');