const { Telegraf } = require('telegraf');
const words = require('./words.json');
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
    const queryId = ctx.web_app_data.query_id; // Get the query ID to respond
    
    console.log('Web app data received:', data);
    
    if (data.action === 'start_game') {
      const difficulty = data.difficulty || 'easy';
      const roundTime = data.roundTime || 60;
      const team = data.team || 'A'; // Get team from Mini App
      const targetScore = data.targetScore || 50;
      
      // Initialize game state
      games.set(chatId, {
        difficulty,
        roundTime,
        currentTeam: team,
        teamAScore: 0,
        teamBScore: 0,
        usedWords: new Set(),
        targetScore: targetScore
      });
      
      // Send first word via WebApp query response
      sendNextWord(ctx, chatId, queryId);
      
    } else if (data.action === 'guessed') {
      const game = games.get(chatId);
      
      if (!game) {
        ctx.reply('❌ Игра не найдена. Начните новую игру с /start');
        return;
      }
      
      // Add point to current team (the team that is explaining)
      if (game.currentTeam === 'A') {
        game.teamAScore++;
      } else {
        game.teamBScore++;
      }
      
      // Do NOT switch team - same team continues explaining
      
      // Send next word via WebApp query response
      sendNextWord(ctx, chatId, queryId);
      
      // Also send score update to chat
      ctx.reply(`✅ Угадано!\n\n📊 Счет:\nКоманда А: ${game.teamAScore}\nКоманда Б: ${game.teamBScore}\n\nОбъясняет: Команда ${game.currentTeam}`);
      
    } else if (data.action === 'skipped') {
      const game = games.get(chatId);
      
      if (!game) {
        ctx.reply('❌ Игра не найдена. Начните новую игру с /start');
        return;
      }
      
      // Do NOT switch team on skip - same team continues explaining
      
      // Send next word via WebApp query response
      sendNextWord(ctx, chatId, queryId);
      
      // Also send notification to chat
      ctx.reply(`⏭ Пропущено\n\n📊 Счет:\nКоманда А: ${game.teamAScore}\nКоманда Б: ${game.teamBScore}\n\nОбъясняет: Команда ${game.currentTeam}`);
      
    } else if (data.action === 'game_over') {
      const game = games.get(chatId);
      
      if (game) {
        let winnerText = '';
        const maxScore = Math.max(game.teamAScore, game.teamBScore);
        
        if (game.teamAScore > game.teamBScore) {
          winnerText = '🏆 Победила Команда А!';
        } else if (game.teamBScore > game.teamAScore) {
          winnerText = '🏆 Победила Команда Б!';
        } else {
          winnerText = '🤝 Ничья!';
        }
        
        // Check if target score reached
        if (maxScore >= game.targetScore) {
          // Game completely over
          ctx.reply(`🏁 Игра окончена! Достигнут целевой балл!\n\n📊 Итоговый счет:\nКоманда А: ${game.teamAScore}\nКоманда Б: ${game.teamBScore}\n\n${winnerText}\n\nДля новой игры нажмите /start`);
          games.delete(chatId);
        } else {
          // Intermediate round - continue to next round
          ctx.reply(`⏱ Время вышло! Целевой балл (${game.targetScore}) не достигнут.\n\n📊 Счет:\nКоманда А: ${game.teamAScore}\nКоманда Б: ${game.teamBScore}\n\nСледующая команда объясняет.`);
          // Don't delete game state - continue playing
        }
      }
    } else if (data.action === 'continue_round') {
      const game = games.get(chatId);
      
      if (!game) {
        ctx.reply('❌ Игра не найдена. Начните новую игру с /start');
        return;
      }
      
      // Update current team (already switched in Mini App)
      game.currentTeam = data.team;
      
      ctx.reply(`🔄 Новый раунд!\n\n📊 Счет сохраняется:\nКоманда А: ${game.teamAScore}\nКоманда Б: ${game.teamBScore}\n\nОбъясняет: Команда ${game.currentTeam}`);
    }
  } catch (e) {
    console.error('Error processing web app data:', e);
    ctx.reply('❌ Произошла ошибка обработки данных');
  }
});

// Send next word to Web App and chat
function sendNextWord(ctx, chatId, queryId) {
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
  } while (game.usedWords.has(nextWord));
  
  game.usedWords.add(nextWord);
  
  const timeText = game.roundTime >= 60
    ? `${Math.floor(game.roundTime / 60)}:${(game.roundTime % 60).toString().padStart(2, '0')}`
    : `${game.roundTime}с`;
  
  // Send word to chat as well
  ctx.reply(`🎯 Команда ${game.currentTeam}\n\nСлово: ${nextWord}\n\n⏱ Время: ${timeText}`);
  
  // Send word to Web App via answerWebAppQuery
  if (queryId) {
    try {
      ctx.answerWebAppQuery({
        type: 'article',
        id: Date.now().toString(),
        title: `Слово для Команды ${game.currentTeam}`,
        description: nextWord,
        input_message_content: {
          message_text: `🎯 Команда ${game.currentTeam}\n\nСлово: ${nextWord}\n\n⏱ Время: ${timeText}\n\n📊 Счет: А=${game.teamAScore}, Б=${game.teamBScore}`
        }
      });
    } catch (e) {
      console.error('Error sending WebApp response:', e);
    }
  }
}

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

console.log('✅ Bot started successfully');