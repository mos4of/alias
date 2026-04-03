// Initialize Telegram WebApp (if available)
if (typeof tg !== 'undefined' && tg.WebApp) {
    tg.WebApp.ready();
    tg.WebApp.expand();
}

// Game state
let gameState = {
    team: 'A',
    difficulty: 'easy',
    roundTime: 60,
    teamAScore: 0,
    teamBScore: 0,
    currentWord: null,
    currentAction: null,
    timeLeft: 60,
    timerId: null,
    usedWords: new Set()
};

// DOM elements
const welcomeScreen = document.getElementById('welcome-screen');
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const resultScreen = document.getElementById('result-screen');

const teamBtns = document.querySelectorAll('.team-btn');
const diffBtns = document.querySelectorAll('.diff-btn');
const timeSlider = document.getElementById('time-slider');
const timeDisplay = document.getElementById('time-display');
const startBtn = document.getElementById('start-btn');
const toStartBtn = document.getElementById('to-start-btn');

const currentTeamEl = document.getElementById('current-team');
const teamAScoreEl = document.getElementById('team-a-score');
const teamBScoreEl = document.getElementById('team-b-score');
const timerEl = document.getElementById('timer');
const wordEl = document.getElementById('word');
const actionEl = document.getElementById('action');

const guessedBtn = document.getElementById('guessed-btn');
const skippedBtn = document.getElementById('skipped-btn');
const playAgainBtn = document.getElementById('play-again-btn');

const finalTeamAEl = document.getElementById('final-team-a');
const finalTeamBEl = document.getElementById('final-team-b');
const winnerEl = document.getElementById('winner');

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

// Send to bot
function sendToBot(data) {
    if (typeof tg !== 'undefined' && tg.WebApp) {
        tg.WebApp.sendData(JSON.stringify(data));
    }
}

// Receive from bot
function handleBotResponse(data) {
    if (data.action === 'new_word') {
        gameState.currentWord = data.word;
        gameState.currentAction = data.action_text;
        wordEl.textContent = gameState.currentWord;
        actionEl.textContent = gameState.currentAction;
        
        // Animation
        wordEl.style.animation = 'none';
        void wordEl.offsetWidth;
        wordEl.style.animation = 'pulse 0.5s';
    } else if (data.action === 'game_over') {
        clearInterval(gameState.timerId);
        showResults();
    }
}

// Initialize WebApp listener
if (typeof tg !== 'undefined' && tg.WebApp) {
    tg.WebApp.onEvent('web_app_data', handleBotResponse);
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
    updateTimeDisplay();
}

function showGame() {
    welcomeScreen.classList.remove('active');
    startScreen.classList.remove('active');
    gameScreen.classList.add('active');
    resultScreen.classList.remove('active');
}

function showResult() {
    welcomeScreen.classList.remove('active');
    startScreen.classList.remove('active');
    gameScreen.classList.remove('active');
    resultScreen.classList.add('active');
}

// Start game
function startGame() {
    // Reset state
    gameState.teamAScore = 0;
    gameState.teamBScore = 0;
    gameState.usedWords = new Set();
    gameState.timeLeft = gameState.roundTime;
    
    updateTeamDisplay();
    updateTimer();
    
    // Send start to bot
    sendToBot({
        action: 'start_game',
        difficulty: gameState.difficulty,
        roundTime: gameState.roundTime
    });
    
    // Start timer
    startTimer();
    
    // Switch screens
    showGame();
}

// Timer
function startTimer() {
    clearInterval(gameState.timerId);
    gameState.timerId = setInterval(() => {
        gameState.timeLeft--;
        updateTimer();
        
        if (gameState.timeLeft <= 0) {
            sendToBot({ action: 'game_over' });
        }
    }, 1000);
}

// Update timer display
function updateTimer() {
    const minutes = Math.floor(gameState.timeLeft / 60);
    const seconds = gameState.timeLeft % 60;
    if (minutes > 0) {
        timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
        timerEl.textContent = seconds;
    }
}

// Update team display
function updateTeamDisplay() {
    currentTeamEl.textContent = `Команда ${gameState.team}`;
    teamAScoreEl.textContent = gameState.teamAScore;
    teamBScoreEl.textContent = gameState.teamBScore;
}

// Handle guessed
function handleGuessed() {
    if (gameState.team === 'A') {
        gameState.teamAScore++;
    } else {
        gameState.teamBScore++;
    }
    updateTeamDisplay();
    sendToBot({ action: 'guessed' });
}

// Handle skipped
function handleSkipped() {
    sendToBot({ action: 'skipped' });
}

// Switch team
function switchTeam() {
    gameState.team = gameState.team === 'A' ? 'B' : 'A';
    updateTeamDisplay();
}

// Show results
function showResults() {
    clearInterval(gameState.timerId);
    
    finalTeamAEl.textContent = gameState.teamAScore;
    finalTeamBEl.textContent = gameState.teamBScore;
    
    if (gameState.teamAScore > gameState.teamBScore) {
        winnerEl.textContent = '🏆 Победила Команда А!';
        winnerEl.className = 'winner team-a';
    } else if (gameState.teamBScore > gameState.teamAScore) {
        winnerEl.textContent = '🏆 Победила Команда Б!';
        winnerEl.className = 'winner team-b';
    } else {
        winnerEl.textContent = '🤝 Ничья!';
        winnerEl.className = 'winner draw';
    }
    
    showResult();
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

// Double click on team name to switch (during game)
currentTeamEl.addEventListener('dblclick', switchTeam);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('Alias Game initialized');
    showWelcome();
    updateTimeDisplay();
});