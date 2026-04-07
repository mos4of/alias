// Initialize Telegram WebApp (if available)
if (typeof tg !== 'undefined' && tg.WebApp) {
    tg.WebApp.ready();
    tg.WebApp.expand();
}

// Words data (will be loaded from JSON)
let words = null;
let wordsLoaded = false;

// Load words from JSON
async function loadWords() {
    try {
        // Add cache buster to prevent caching issues
        const cacheBuster = Date.now();
        const response = await fetch('words.json?v=' + cacheBuster);
        if (!response.ok) {
            throw new Error('Failed to load words.json: ' + response.status);
        }
        words = await response.json();
        wordsLoaded = true;
        console.log('Words loaded successfully', words);
        console.log('Easy words count:', words.easy?.length);
        console.log('Medium words count:', words.medium?.length);
        console.log('Hard words count:', words.hard?.length);
        return true;
    } catch (error) {
        console.error('Error loading words:', error);
        // Fallback to hardcoded words to ensure game works
        console.warn('Using fallback hardcoded words');
        words = {
            easy: ['кот', 'собака', 'пицца', 'машина', 'телефон', 'вода', 'дом', 'друг'],
            medium: ['самолёт', 'робот', 'повар', 'доктор', 'шпион', 'маг', 'спортсмен'],
            hard: ['гравитация', 'инфляция', 'иллюзия', 'харизма', 'логика', 'парадокс', 'реальность']
        };
        wordsLoaded = true;
        alert('Не удалось загрузить слова. Используются встроенные слова.');
        return true;
    }
}

// Game state
let gameState = {
    team: 'A',
    difficulty: 'easy',
    roundTime: 60,
    targetScore: 50,
    teamAScore: 0,
    teamBScore: 0,
    currentWord: null,
    timeLeft: 60,
    timerId: null,
    usedWords: new Set(),
    gameOver: false,
    isPaused: false
};

// Track last team to alternate between games
let lastTeam = 'A';

// DOM elements
const welcomeScreen = document.getElementById('welcome-screen');
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const resultScreen = document.getElementById('result-screen');
const intermediateScreen = document.getElementById('intermediate-screen');

const teamBtns = document.querySelectorAll('.team-btn');
const diffBtns = document.querySelectorAll('.diff-btn');
const timeSlider = document.getElementById('time-slider');
const timeDisplay = document.getElementById('time-display');
const targetScoreSlider = document.getElementById('target-score-slider');
const targetScoreDisplay = document.getElementById('target-score-display');
const startBtn = document.getElementById('start-btn');
const toStartBtn = document.getElementById('to-start-btn');
const pauseBtn = document.getElementById('pause-btn');
const continueBtn = document.getElementById('continue-btn');
const nextTeamNameEl = document.getElementById('next-team-name');
const intermediateTeamAEl = document.getElementById('intermediate-team-a');
const intermediateTeamBEl = document.getElementById('intermediate-team-b');

const currentTeamEl = document.getElementById('current-team');
const teamAScoreEl = document.getElementById('team-a-score');
const teamBScoreEl = document.getElementById('team-b-score');
const timerEl = document.getElementById('timer');
const wordEl = document.getElementById('word');

const guessedBtn = document.getElementById('guessed-btn');
const skippedBtn = document.getElementById('skipped-btn');
const playAgainBtn = document.getElementById('play-again-btn');

const finalTeamAEl = document.getElementById('final-team-a');
const finalTeamBEl = document.getElementById('final-team-b');
const trophyAnimEl = document.getElementById('trophy-animation');
const winnerMessageEl = document.getElementById('winner-message');
const resultTitleEl = document.getElementById('result-title');
const statsEl = document.getElementById('stats');

// Team selection
teamBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        teamBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gameState.team = btn.dataset.team;
    });
});

// Difficulty selection
diffBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        diffBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gameState.difficulty = btn.dataset.diff;
    });
});

// Time slider
timeSlider.addEventListener('input', (e) => {
    gameState.roundTime = parseInt(e.target.value);
    updateTimeDisplay();
});

// Target score slider
if (targetScoreSlider) {
    targetScoreSlider.addEventListener('input', (e) => {
        gameState.targetScore = parseInt(e.target.value);
        updateTargetScoreDisplay();
    });
}

function updateTimeDisplay() {
    const seconds = gameState.roundTime;
    if (seconds >= 60) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        timeDisplay.textContent = `${mins}м ${secs}с`;
    } else {
        timeDisplay.textContent = `${seconds}с`;
    }
}

function updateTargetScoreDisplay() {
    targetScoreDisplay.textContent = gameState.targetScore;
}

// Send to bot
function sendToBot(data) {
    if (typeof tg !== 'undefined' && tg.WebApp) {
        try {
            tg.WebApp.sendData(JSON.stringify(data));
        } catch (error) {
            console.error('Failed to send data to bot:', error);
        }
    }
}

// Pick next word from words.json database
function pickNextWord() {
    try {
        // Don't pick if game is over
        if (gameState.gameOver) {
            console.log('Game is over, not picking next word');
            return;
        }
        
        if (!wordsLoaded || !words) {
            console.error('Words not loaded yet');
            return;
        }
        
        const wordList = words[gameState.difficulty];
        if (!wordList) {
            console.error('No word list for difficulty:', gameState.difficulty);
            return;
        }
        
        const availableWords = wordList.filter(w => !gameState.usedWords.has(w));
        console.log('Picking next word. Used:', gameState.usedWords.size, 'Available:', availableWords.length);
        
        if (availableWords.length === 0) {
            // All words used - end game
            console.log('All words used, ending game');
            clearInterval(gameState.timerId);
            gameState.timerId = null;
            gameState.gameOver = true;
            sendToBot({ action: 'game_over' });
            showResults();
            return;
        }
        
        const randomIndex = Math.floor(Math.random() * availableWords.length);
        const word = availableWords[randomIndex];
        
        gameState.currentWord = word;
        gameState.usedWords.add(word);
        
        console.log('Selected word:', word);
        
        if (wordEl) {
            wordEl.textContent = gameState.currentWord;
            // Animation
            wordEl.style.animation = 'none';
            void wordEl.offsetWidth;
            wordEl.style.animation = 'pulse 0.5s';
        }
    } catch (error) {
        console.error('Error in pickNextWord:', error);
    }
}

// Navigation functions
function showWelcome() {
    welcomeScreen.classList.add('active');
    startScreen.classList.remove('active');
    gameScreen.classList.remove('active');
    resultScreen.classList.remove('active');
}

function showStart() {
    welcomeScreen.classList.remove('active');
    startScreen.classList.add('active');
    gameScreen.classList.remove('active');
    resultScreen.classList.remove('active');
    if (intermediateScreen) intermediateScreen.classList.remove('active');
    updateTimeDisplay();
    updateTargetScoreDisplay();
    
    // Alternate team selection for new game (opposite of last team)
    const oppositeTeam = lastTeam === 'A' ? 'B' : 'A';
    teamBtns.forEach(btn => {
        if (btn.dataset.team === oppositeTeam) {
            btn.classList.add('active');
            gameState.team = oppositeTeam;
        } else {
            btn.classList.remove('active');
        }
    });
}

function showGame() {
    welcomeScreen.classList.remove('active');
    startScreen.classList.remove('active');
    gameScreen.classList.add('active');
    resultScreen.classList.remove('active');
    if (intermediateScreen) intermediateScreen.classList.remove('active');
}

function showResult() {
    welcomeScreen.classList.remove('active');
    startScreen.classList.remove('active');
    gameScreen.classList.remove('active');
    resultScreen.classList.add('active');
    if (intermediateScreen) intermediateScreen.classList.remove('active');
}

function showIntermediate() {
    welcomeScreen.classList.remove('active');
    startScreen.classList.remove('active');
    gameScreen.classList.remove('active');
    resultScreen.classList.remove('active');
    if (intermediateScreen) intermediateScreen.classList.add('active');
    
    // Update intermediate scores
    if (intermediateTeamAEl) intermediateTeamAEl.textContent = gameState.teamAScore;
    if (intermediateTeamBEl) intermediateTeamBEl.textContent = gameState.teamBScore;
    
    // Show which team will explain next
    const nextTeam = gameState.team === 'A' ? 'Б' : 'А';
    if (nextTeamNameEl) {
        nextTeamNameEl.textContent = `Команда ${nextTeam}`;
    }
}

// Start game
function startGame() {
    if (!wordsLoaded || !words) {
        alert('Слова еще не загружены. Пожалуйста, подождите.');
        return;
    }
    
    // Reset state for new game
    gameState.teamAScore = 0;
    gameState.teamBScore = 0;
    gameState.usedWords = new Set();
    gameState.timeLeft = gameState.roundTime;
    gameState.gameOver = false;
    gameState.isPaused = false;
    
    // Team is already selected in showStart() - keep it for this game session
    
    updateTeamDisplay();
    updateTimer();
    
    // Send start to bot with current team
    sendToBot({
        action: 'start_game',
        difficulty: gameState.difficulty,
        roundTime: gameState.roundTime,
        team: gameState.team,
        targetScore: gameState.targetScore
    });
    
    // Pick and show first word
    pickNextWord();
    
    // Start timer
    startTimer();
    
    // Switch screens
    showGame();
}

// Continue to next round (from intermediate screen)
function continueToNextRound() {
    // Switch team for next round
    gameState.team = gameState.team === 'A' ? 'B' : 'A';
    lastTeam = gameState.team;
    
    // Reset round state but keep scores
    gameState.usedWords = new Set();
    gameState.timeLeft = gameState.roundTime;
    gameState.gameOver = false;
    gameState.isPaused = false;
    pauseBtn.textContent = '⏸️ Пауза';
    
    updateTeamDisplay();
    updateTimer();
    
    // Send continue to bot
    sendToBot({
        action: 'continue_round',
        team: gameState.team,
        targetScore: gameState.targetScore
    });
    
    // Pick first word for new round
    pickNextWord();
    
    // Start timer
    startTimer();
    
    // Switch to game screen
    showGame();
}

// Toggle pause
function togglePause() {
    if (gameState.gameOver) {
        console.log('Game is over, ignoring pause');
        return;
    }
    
    gameState.isPaused = !gameState.isPaused;
    
    if (gameState.isPaused) {
        // Pause timer
        if (gameState.timerId) {
            clearInterval(gameState.timerId);
            gameState.timerId = null;
        }
        pauseBtn.textContent = '▶️ Продолжить';
        console.log('Game paused');
    } else {
        // Resume timer
        pauseBtn.textContent = '⏸️ Пауза';
        startTimer();
        console.log('Game resumed');
    }
}

// Timer
function startTimer() {
    // Clear any existing timer
    if (gameState.timerId) {
        clearInterval(gameState.timerId);
        gameState.timerId = null;
    }
    
    console.log('Starting timer with', gameState.timeLeft, 'seconds');
    
    gameState.timerId = setInterval(() => {
        console.log('Timer tick:', gameState.timeLeft);
        
        if (gameState.timeLeft > 0) {
            gameState.timeLeft--;
            updateTimer();
            console.log('Time left:', gameState.timeLeft);
        }
        
        if (gameState.timeLeft <= 0) {
            clearInterval(gameState.timerId);
            gameState.timerId = null;
            gameState.timeLeft = 0;
            updateTimer();
            console.log('Timer expired, checking target score');
            sendToBot({ action: 'game_over' });
            
            const maxScore = Math.max(gameState.teamAScore, gameState.teamBScore);
            if (maxScore >= gameState.targetScore) {
                console.log('Target score reached, showing final results');
                showResults();
            } else {
                console.log('Target score not reached, showing intermediate screen');
                showIntermediate();
            }
        }
    }, 1000);
}

// Update timer display
function updateTimer() {
    const minutes = Math.floor(gameState.timeLeft / 60);
    const seconds = gameState.timeLeft % 60;
    timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Update team display
function updateTeamDisplay() {
    currentTeamEl.textContent = `Команда ${gameState.team}`;
    teamAScoreEl.textContent = gameState.teamAScore;
    teamBScoreEl.textContent = gameState.teamBScore;
}

// Handle guessed
function handleGuessed() {
    // Ignore if game is over or paused
    if (gameState.gameOver || gameState.isPaused) {
        console.log('Game is over or paused, ignoring guess');
        return;
    }
    
    // Add point to current team (the team that is explaining)
    if (gameState.team === 'A') {
        gameState.teamAScore++;
    } else {
        gameState.teamBScore++;
    }
    updateTeamDisplay();
    
    // Send to bot with team info
    sendToBot({ action: 'guessed', team: gameState.team });
    
    // Do NOT switch team - same team continues explaining for the entire timer
    
    // Pick next word
    pickNextWord();
}

// Handle skipped
function handleSkipped() {
    // Ignore if game is over
    if (gameState.gameOver) {
        console.log('Game is over, ignoring skip');
        return;
    }
    
    // Send to bot with team info
    sendToBot({ action: 'skipped', team: gameState.team });
    
    // Do NOT switch team - same team continues explaining for the entire timer
    
    // Pick next word
    pickNextWord();
}

// Switch team (double click)
function switchTeam() {
    gameState.team = gameState.team === 'A' ? 'B' : 'A';
    updateTeamDisplay();
}

// Toggle pause
function togglePause() {
    if (gameState.gameOver) {
        console.log('Game is over, ignoring pause');
        return;
    }
    
    gameState.isPaused = !gameState.isPaused;
    
    if (gameState.isPaused) {
        // Pause timer
        if (gameState.timerId) {
            clearInterval(gameState.timerId);
            gameState.timerId = null;
        }
        pauseBtn.textContent = '▶️ Продолжить';
        console.log('Game paused');
    } else {
        // Resume timer
        pauseBtn.textContent = '⏸️ Пауза';
        startTimer();
        console.log('Game resumed');
    }
}

// Show results
function showResults() {
    console.log('showResults called');
    
    // Mark game as over
    gameState.gameOver = true;
    
    // Remember which team just played for next game alternation
    lastTeam = gameState.team;
    
    // Clear timer
    if (gameState.timerId) {
        clearInterval(gameState.timerId);
        gameState.timerId = null;
    }
    
    try {
        // Update final scores with null checks
        if (finalTeamAEl) finalTeamAEl.textContent = gameState.teamAScore;
        if (finalTeamBEl) finalTeamBEl.textContent = gameState.teamBScore;
        
        // Calculate total words used
        const totalWords = gameState.usedWords.size;
        const totalPossible = wordsLoaded && words ? (words[gameState.difficulty]?.length || 0) : 0;
        
        console.log('Game stats:', { totalWords, totalPossible, difficulty: gameState.difficulty, teamAScore: gameState.teamAScore, teamBScore: gameState.teamBScore });
        
        // Determine winner and set messages
        let winnerMessage = '';
        let resultTitle = '🎉 Поздравляем!';
        let trophyClass = '';
        
        if (gameState.teamAScore > gameState.teamBScore) {
            winnerMessage = '🏆 Победила Команда А!';
            if (winnerMessageEl) winnerMessageEl.className = 'winner team-a';
            trophyClass = 'trophy-a';
            resultTitle = '🎉 Команда А — чемпионы!';
        } else if (gameState.teamBScore > gameState.teamAScore) {
            winnerMessage = '🏆 Победила Команда Б!';
            if (winnerMessageEl) winnerMessageEl.className = 'winner team-b';
            trophyClass = 'trophy-b';
            resultTitle = '🎉 Команда Б — чемпионы!';
        } else {
            winnerMessage = '🤝 Ничья!';
            if (winnerMessageEl) winnerMessageEl.className = 'winner draw';
            trophyClass = 'trophy-draw';
            resultTitle = '🤝 Одинаково сильные команды!';
        }
        
        if (winnerMessageEl) winnerMessageEl.textContent = winnerMessage;
        if (resultTitleEl) resultTitleEl.textContent = resultTitle;
        
        // Update stats
        const difficultyText = {
            'easy': 'Лёгкая',
            'medium': 'Средняя',
            'hard': 'Сложная'
        };
        
        if (statsEl) {
            statsEl.innerHTML = `
                <p>📚 Сложность: <strong>${difficultyText[gameState.difficulty]}</strong></p>
                <p>⏱ Время: <strong>${gameState.roundTime} секунд</strong></p>
                <p>📖 Использовано слов: <strong>${totalWords} из ${totalPossible}</strong></p>
            `;
        }
        
        // Animate trophy
        if (trophyAnimEl) {
            trophyAnimEl.className = 'trophy-animation ' + trophyClass;
            // Trigger animation
            setTimeout(() => {
                if (trophyAnimEl) trophyAnimEl.classList.add('active');
            }, 100);
        }
        
        console.log('Calling showResult()');
        showResult();
        console.log('Results screen should now be visible');
    } catch (error) {
        console.error('Error in showResults:', error);
        // Fallback: just show result screen
        showResult();
    }
}

// Restart game
function restartGame() {
    showWelcome();
}

// Event listeners
toStartBtn.addEventListener('click', showStart);
startBtn.addEventListener('click', startGame);
guessedBtn.addEventListener('click', handleGuessed);
skippedBtn.addEventListener('click', handleSkipped);
playAgainBtn.addEventListener('click', restartGame);
continueBtn.addEventListener('click', continueToNextRound);
pauseBtn.addEventListener('click', togglePause);

// Double click on team name to switch (during game)
currentTeamEl.addEventListener('dblclick', switchTeam);

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Alias Game initializing...');
    
    // Load words from JSON
    const loaded = await loadWords();
    if (!loaded) {
        alert('Ошибка загрузки слов. Пожалуйста, обновите страницу.');
        return;
    }
    
    console.log('Alias Game initialized');
    showWelcome();
    updateTimeDisplay();
});