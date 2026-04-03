const { Telegraf } = require('telegraf');
const words = require('./words');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// Store game state per chat
const games = new Map();

bot.start((ctx) => {
  const webAppUrl = process.env.WEB_APP_URL;
  
  if (!webAppUrl) {
    ctx.reply('❌ Ошибка: WEB_APP_URL не настроен. Обратитесь к администратору бота.');
    return;
  }
  
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
      const roundTime = data.roundTime || 60;
      
      // Initialize game state
      games.set(chatId, {
        difficulty,
        roundTime,
        teamAScore: 0,
        teamBScore: 0,
        currentTeam: 'A',
        usedWords: new Set()
      });
      
      // Send first word
      sendNextWord(ctx, chatId);
      
    } else if (data.action === 'guessed') {
      const game = games.get(chatId);
      
      if (!game) {
        ctx.reply('❌ Игра не найдена. Начните новую игру с /start');
        return;
      }
      
      // Add point to current team
      if (game.currentTeam === 'A') {
        game.teamAScore++;
      } else {
        game.teamBScore++;
      }
      
      // Send updated scores
      ctx.reply(`✅ Угадано!\n\n📊 Счет:\nКоманда А: ${game.teamAScore}\nКоманда Б: ${game.teamBScore}\n\nХодит: Команда ${game.currentTeam}`);
      
      // Switch team
      game.currentTeam = game.currentTeam === 'A' ? 'B' : 'A';
      
      // Send next word
      sendNextWord(ctx, chatId);
      
    } else if (data.action === 'skipped') {
      const game = games.get(chatId);
      
      if (!game) {
        ctx.reply('❌ Игра не найдена. Начните новую игру с /start');
        return;
      }
      
      // Switch team on skip
      game.currentTeam = game.currentTeam === 'A' ? 'B' : 'A';
      
      ctx.reply(`⏭ Пропущено\n\n📊 Счет:\nКоманда А: ${game.teamAScore}\nКоманда Б: ${game.teamBScore}\n\nХодит: Команда ${game.currentTeam}`);
      
      // Send next word
      sendNextWord(ctx, chatId);
      
    } else if (data.action === 'game_over') {
      const game = games.get(chatId);
      
      if (game) {
        let winnerText = '';
        if (game.teamAScore > game.teamBScore) {
          winnerText = '🏆 Победила Команда А!';
        } else if (game.teamBScore > game.teamAScore) {
          winnerText = '🏆 Победила Команда Б!';
        } else {
          winnerText = '🤝 Ничья!';
        }
        
        ctx.reply(`🏁 Игра окончена!\n\n📊 Итоговый счет:\nКоманда А: ${game.teamAScore}\nКоманда Б: ${game.teamBScore}\n\n${winnerText}\n\nДля новой игры нажмите /start`);
        games.delete(chatId);
      }
    }
  } catch (e) {
    console.error('Error processing web app data:', e);
    ctx.reply('❌ Произошла ошибка обработки данных');
  }
});

// Send next word to chat
function sendNextWord(ctx, chatId) {
  const game = games.get(chatId);
  
  if (!game) return;
  
  const wordList = words[game.difficulty];
  let nextWord;
  
  // Check if all words used
  if (game.usedWords.size >= wordList.length) {
    ctx.reply('⚠️ Слова закончились! Игра завершена.\n\n📊 Счет:\nКоманда А: ' + game.teamAScore + '\nКоманда Б: ' + game.teamBScore);
    games.delete(chatId);
    return;
  }
  
  do {
    nextWord = wordList[Math.floor(Math.random() * wordList.length)];
  } while (game.usedWords.has(nextWord.word));
  
  game.usedWords.add(nextWord.word);
  
  const timeText = game.roundTime >= 60
    ? `${Math.floor(game.roundTime / 60)}:${(game.roundTime % 60).toString().padStart(2, '0')}`
    : `${game.roundTime}с`;
  
  ctx.reply(`🎯 Команда ${game.currentTeam}\n\nСлово: ${nextWord.word}\nДействие: ${nextWord.action}\n\n⏱ Время: ${timeText}`);
}

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

console.log('✅ Bot started successfully');