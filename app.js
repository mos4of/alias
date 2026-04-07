// ============================================
// ALIAS GAME - Modern Dark UI
// Premium Dashboard Style
// ============================================

// Initialize Telegram WebApp (if available)
if (typeof tg !== 'undefined' && tg.WebApp) {
    tg.WebApp.ready();
    tg.WebApp.expand();
}

// Random team names pool (Russian, fun)
const TEAM_NAMES = [
    'Морские котики', 'Солнечные зайки', 'Громкие пингвины', 'Быстрые лисы',
    'Умные совы', 'Смешные медведи', 'Рыжие лисы', 'Звёздные тигры',
    'Летающие драконы', 'Огненные единороги', 'Секретные агенты', 'Космические десантники',
    'Супергерои', 'Весёлые обезьянки', 'Дикие волки', 'Снежные барсы',
    'Буйные буйволы', 'Ласковые коалы', 'Хитрые хорьки', 'Мудрые черепахи'
];

// Words data (will be loaded from JSON)
let words = null;
let wordsLoaded = false;

// Game state
let gameState = {
    teams: [], // Array of {name: string, score: number}
    currentTeamIndex: 0,
    difficulty: 'easy',
    roundTime: 60,
    targetScore: 50,
    currentWord: null,
    timeLeft: 60,
    timerId: null,
    usedWords: new Set(),
    gameOver: false,
    isPaused: false,
    teamCount: 2,
    roundNumber: 1,
    totalWordsGuessed: 0,
    totalGamesPlayed: 0
};

// Track last team index to alternate between games
let lastTeamIndex = 0;

// DOM elements
const welcomeScreen = document.getElementById('welcome-screen');
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const resultScreen = document.getElementById('result-screen');
const intermediateScreen = document.getElementById('intermediate-screen');

const teamCountDisplay = document.getElementById('team-count-display');
const teamNamesPreview = document.getElementById('team-names-preview');
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

const currentTeamBadge = document.getElementById('current-team-badge');
const scoreDisplayEl = document.getElementById('score-display');
const intermediateScoresEl = document.getElementById('intermediate-scores');
const finalScoresEl = document.getElementById('final-scores');
const timerEl = document.getElementById('timer-text');
const timerCircle = document.getElementById('timer-circle');
const wordEl = document.getElementById('word');
const roundNumberEl = document.getElementById('round-number');

const guessedBtn = document.getElementById('guessed-btn');
const skippedBtn = document.getElementById('skipped-btn');
const playAgainBtn = document.getElementById('play-again-btn');
const trophyAnimEl = document.getElementById('trophy-animation');
const winnerMessageEl = document.getElementById('winner-message');
const resultTitleEl = document.getElementById('result-title');
const statsEl = document.getElementById('stats');

const totalGamesEl = document.getElementById('total-games');
const totalWordsEl = document.getElementById('total-words');

// Team count controls
const teamMinusBtn = document.getElementById('team-minus');
const teamPlusBtn = document.getElementById('team-plus');

// Load words from JSON
async function loadWords() {
    try {
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

// Generate random team names
function generateRandomTeamNames(count) {
    const shuffled = [...TEAM_NAMES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map((name, index) => ({
        name: name,
        score: 0,
        id: index
    }));
}

// Update team names preview on start screen
function generateTeamNamesPreview() {
    if (!teamNamesPreview) return;
    
    const count = gameState.teamCount;
    const teams = generateRandomTeamNames(count);
    
    teamNamesPreview.innerHTML = teams.map(t => 
        `<div class="team-preview-item">${t.name}</div>`
    ).join('');
}

// Update score display in game screen (dynamic for any number of teams)
function updateScoreDisplay() {
    if (!scoreDisplayEl) return;
    
    // For 2 teams, show compact pills; for more, show flexible grid
    if (gameState.teams.length === 2) {
        const teamA = gameState.teams[0];
        const teamB = gameState.teams[1];
        const pillA = document.getElementById('score-pill-a');
        const pillB = document.getElementById('score-pill-b');
        
        if (pillA && teamA) {
            pillA.querySelector('.team-score').textContent = teamA.score;
        }
        if (pillB && teamB) {
            pillB.querySelector('.team-score').textContent = teamB.score;
        }
    } else {
        // For 3+ teams, build dynamic grid
        scoreDisplayEl.innerHTML = gameState.teams.map((team, index) => `
            <div class="score-pill" data-index="${index}">
                <span class="team-label">${team.name.charAt(0)}</span>
                <span class="team-score">${team.score}</span>
            </div>
        `).join('');
    }
}

// Update current team indicator
function updateTeamDisplay() {
    if (gameState.teams.length === 0) return;
    const currentTeam = gameState.teams[gameState.currentTeamIndex];
    if (currentTeamBadge) {
        currentTeamBadge.textContent = currentTeam.name;
    }
    
    // Update active state for score pills (2 teams)
    const pills = document.querySelectorAll('.score-pill');
    pills.forEach((pill, idx) => {
        if (idx === gameState.currentTeamIndex) {
            pill.classList.add('active');
        } else {
            pill.classList.remove('active');
        }
    });
}

// Update timer circle
function updateTimerCircle() {
    if (!timerCircle) return;
    
    const totalTime = gameState.roundTime;
    const timeLeft = gameState.timeLeft;
    const percentage = (timeLeft / totalTime) * 100;
    const circumference = 2 * Math.PI * 45; // radius 45
    const offset = circumference - (percentage / 100) * circumference;
    
    timerCircle.style.strokeDasharray = circumference;
    timerCircle.style.strokeDashoffset = offset;
}

// Navigation functions
function showWelcome() {
    welcomeScreen.classList.add('active');
    startScreen.classList.remove('active');
    gameScreen.classList.remove('active');
    resultScreen.classList.remove('active');
    if (intermediateScreen) intermediateScreen.classList.remove('active');
    
    // Update stats
    if (totalGamesEl) totalGamesEl.textContent = gameState.totalGamesPlayed;
    if (totalWordsEl) totalWordsEl.textContent = gameState.totalWordsGuessed;
}

function showStart() {
    welcomeScreen.classList.remove('active');
    startScreen.classList.add('active');
    gameScreen.classList.remove('active');
    resultScreen.classList.remove('active');
    if (intermediateScreen) intermediateScreen.classList.remove('active');
    updateTimeDisplay();
    updateTargetScoreDisplay();
    
    // Initialize team count slider
    if (teamCountDisplay) {
        teamCountDisplay.textContent = gameState.teamCount;
        generateTeamNamesPreview();
    }
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
    
    // Update intermediate scores dynamically
    if (intermediateScoresEl) {
        intermediateScoresEl.innerHTML = gameState.teams.map((team, index) => `
            <div class="score-card ${index === 0 ? 'team-a' : index === 1 ? 'team-b' : ''}">
                <div class="team-icon">${index === 0 ? '🔵' : index === 1 ? '🟠' : '⚪'}</div>
                <h3>${team.name}</h3>
                <p class="score">${team.score}</p>
            </div>
        `).join('');
    }
    
    // Show which team will explain next
    const nextTeamIndex = (gameState.currentTeamIndex + 1) % gameState.teams.length;
    const nextTeam = gameState.teams[nextTeamIndex];
    if (nextTeamNameEl) {
        nextTeamNameEl.textContent = nextTeam.name;
    }
}

// Start game
function startGame() {
    if (!wordsLoaded || !words) {
        alert('Слова еще не загружены. Пожалуйста, подождите.');
        return;
    }
    
    // Reset state for new game
    const teams = generateRandomTeamNames(gameState.teamCount);
    gameState.teams = teams;
    gameState.currentTeamIndex = lastTeamIndex;
    gameState.usedWords = new Set();
    gameState.timeLeft = gameState.roundTime;
    gameState.gameOver = false;
    gameState.isPaused = false;
    gameState.roundNumber = 1;
    pauseBtn.textContent = '⏸️ Пауза';
    
    updateScoreDisplay();
    updateTeamDisplay();
    updateTimer();
    updateTimerCircle();
    
    // Send start to bot with current team
    const currentTeam = gameState.teams[gameState.currentTeamIndex];
    sendToBot({
        action: 'start_game',
        difficulty: gameState.difficulty,
        roundTime: gameState.roundTime,
        team: currentTeam.name,
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
    // Switch to next team in circular order
    gameState.currentTeamIndex = (gameState.currentTeamIndex + 1) % gameState.teams.length;
    lastTeamIndex = gameState.currentTeamIndex;
    gameState.roundNumber++;
    
    // Reset round state but keep scores
    gameState.usedWords = new Set();
    gameState.timeLeft = gameState.roundTime;
    gameState.gameOver = false;
    gameState.isPaused = false;
    pauseBtn.textContent = '⏸️ Пауза';
    
    updateScoreDisplay();
    updateTeamDisplay();
    updateTimer();
    updateTimerCircle();
    
    // Send continue to bot
    const currentTeam = gameState.teams[gameState.currentTeamIndex];
    sendToBot({
        action: 'continue_round',
        team: currentTeam.name,
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
        if (gameState.isPaused || gameState.gameOver) {
            clearInterval(gameState.timerId);
            gameState.timerId = null;
            return;
        }
        
        if (gameState.timeLeft > 0) {
            gameState.timeLeft--;
            updateTimer();
            updateTimerCircle();
            console.log('Time left:', gameState.timeLeft);
        }
        
        if (gameState.timeLeft <= 0) {
            clearInterval(gameState.timerId);
            gameState.timerId = null;
            gameState.timeLeft = 0;
            updateTimer();
            updateTimerCircle();
            console.log('Timer expired, checking target score');
            sendToBot({ action: 'game_over' });
            
            const maxScore = Math.max(...gameState.teams.map(t => t.score));
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

function updateTimer() {
    const minutes = Math.floor(gameState.timeLeft / 60);
    const seconds = gameState.timeLeft % 60;
    if (timerEl) {
        timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
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
            wordEl.style.animation = 'wordPulse 2s ease-in-out infinite';
        }
    } catch (error) {
        console.error('Error in pickNextWord:', error);
    }
}

// Handle guessed
function handleGuessed() {
    if (gameState.gameOver || gameState.isPaused) {
        console.log('Game is over or paused, ignoring guess');
        return;
    }
    
    const currentTeam = gameState.teams[gameState.currentTeamIndex];
    currentTeam.score++;
    gameState.totalWordsGuessed++;
    
    updateScoreDisplay();
    updateTeamDisplay();
    
    sendToBot({ action: 'guessed', team: currentTeam.name });
    
    pickNextWord();
}

// Handle skipped
function handleSkipped() {
    if (gameState.gameOver) {
        console.log('Game is over, ignoring skip');
        return;
    }
    
    const currentTeam = gameState.teams[gameState.currentTeamIndex];
    
    sendToBot({ action: 'skipped', team: currentTeam.name });
    
    pickNextWord();
}

// Switch team (double click)
function switchTeam() {
    if (gameState.teams.length > 0) {
        gameState.currentTeamIndex = (gameState.currentTeamIndex + 1) % gameState.teams.length;
        updateTeamDisplay();
    }
}

// Show results
function showResults() {
    console.log('showResults called');
    
    gameState.gameOver = true;
    lastTeamIndex = gameState.currentTeamIndex;
    gameState.totalGamesPlayed++;
    
    if (gameState.timerId) {
        clearInterval(gameState.timerId);
        gameState.timerId = null;
    }
    
    try {
        // Find winner(s)
        let maxScore = Math.max(...gameState.teams.map(t => t.score));
        let winners = gameState.teams.filter(t => t.score === maxScore);
        let winnerMessage = '';
        let resultTitle = '🎉 Поздравляем!';
        let trophyClass = '';
        
        if (winners.length === 1) {
            winnerMessage = `🏆 Победила ${winners[0].name}!`;
            if (winnerMessageEl) winnerMessageEl.className = 'winner team-a';
            trophyClass = 'trophy-a';
            resultTitle = `🎉 ${winners[0].name} — чемпионы!`;
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
                <p>📖 Использовано слов: <strong>${gameState.usedWords.size}</strong></p>
            `;
        }
        
        // Update final scores dynamically
        if (finalScoresEl) {
            finalScoresEl.innerHTML = gameState.teams.map((team, index) => `
                <div class="final-score-card ${index === 0 ? 'team-a' : index === 1 ? 'team-b' : ''}">
                    <div class="team-icon">${index === 0 ? '🔵' : index === 1 ? '🟠' : '⚪'}</div>
                    <h3>${team.name}</h3>
                    <p class="score">${team.score}</p>
                    <p class="score-label">очков</p>
                </div>
            `).join('');
        }
        
        // Animate trophy
        if (trophyAnimEl) {
            trophyAnimEl.className = 'trophy-animation ' + trophyClass;
            setTimeout(() => {
                if (trophyAnimEl) trophyAnimEl.classList.add('active');
            }, 100);
        }
        
        // Update stats on welcome screen
        if (totalGamesEl) totalGamesEl.textContent = gameState.totalGamesPlayed;
        if (totalWordsEl) totalWordsEl.textContent = gameState.totalWordsGuessed;
        
        showResult();
    } catch (error) {
        console.error('Error in showResults:', error);
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

// Team count controls
if (teamMinusBtn) {
    teamMinusBtn.addEventListener('click', () => {
        if (gameState.teamCount > 2) {
            gameState.teamCount--;
            teamCountDisplay.textContent = gameState.teamCount;
            generateTeamNamesPreview();
        }
    });
}

if (teamPlusBtn) {
    teamPlusBtn.addEventListener('click', () => {
        if (gameState.teamCount < 6) {
            gameState.teamCount++;
            teamCountDisplay.textContent = gameState.teamCount;
            generateTeamNamesPreview();
        }
    });
}

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

// Double click on team name to switch (during game)
if (currentTeamBadge) {
    currentTeamBadge.addEventListener('dblclick', switchTeam);
}

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
    
    // Initialize team count and generate preview
    gameState.teamCount = 2;
    if (teamCountDisplay) teamCountDisplay.textContent = 2;
    generateTeamNamesPreview();
    
    showWelcome();
    updateTimeDisplay();
    
    // Load stats from localStorage
    const savedStats = localStorage.getItem('aliasGameStats');
    if (savedStats) {
        try {
            const stats = JSON.parse(savedStats);
            gameState.totalGamesPlayed = stats.games || 0;
            gameState.totalWordsGuessed = stats.words || 0;
            if (totalGamesEl) totalGamesEl.textContent = gameState.totalGamesPlayed;
            if (totalWordsEl) totalWordsEl.textContent = gameState.totalWordsGuessed;
        } catch (e) {
            console.error('Error loading stats:', e);
        }
    }
});

// Save stats on page unload
window.addEventListener('beforeunload', () => {
    const stats = {
        games: gameState.totalGamesPlayed,
        words: gameState.totalWordsGuessed
    };
    localStorage.setItem('aliasGameStats', JSON.stringify(stats));
});
