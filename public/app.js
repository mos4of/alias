// Initialize Telegram WebApp
if (typeof tg !== 'undefined' && tg.WebApp) {
    tg.WebApp.ready();
    tg.WebApp.expand();
}

// Game state
let score = 0;
let timeLeft = 60;
let timerId = null;
let currentWord = null;
let currentAction = null;
let difficulty = 'easy';

// DOM elements
const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const wordEl = document.getElementById('word');
const actionEl = document.getElementById('action');
const guessedBtn = document.getElementById('guessed-btn');
const skippedBtn = document.getElementById('skipped-btn');
const resultScreen = document.getElementById('result-screen');
const finalScoreEl = document.getElementById('final-score');
const playAgainBtn = document.getElementById('play-again-btn');

// Get difficulty from URL parameters
function getDifficultyFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('difficulty') || 'easy';
}

// Send message to bot
function sendToBot(data) {
    if (typeof tg !== 'undefined' && tg.WebApp) {
        tg.WebApp.sendData(JSON.stringify(data));
    }
}

// Receive message from bot
function handleBotResponse(data) {
    if (data.action === 'new_word') {
        currentWord = data.word;
        currentAction = data.action_text;
        wordEl.textContent = currentWord;
        actionEl.textContent = currentAction;
        
        // Add animation
        wordEl.style.animation = 'none';
        void wordEl.offsetWidth;
        wordEl.style.animation = 'pulse 0.5s';
    } else if (data.action === 'game_over') {
        clearInterval(timerId);
        score = data.final_score || score;
        finalScoreEl.textContent = score;
        resultScreen.classList.remove('hidden');
        document.getElementById('game-screen').style.display = 'none';
    }
}

// Initialize WebApp
if (typeof tg !== 'undefined' && tg.WebApp) {
    tg.WebApp.onEvent('web_app_data', handleBotResponse);
}

// Start game by sending request to bot
function startGame() {
    difficulty = getDifficultyFromUrl();
    score = 0;
    timeLeft = 60;
    
    updateScore();
    updateTimer();
    
    // Send start request to bot
    sendToBot({
        action: 'start_game',
        difficulty: difficulty
    });
    
    // Start timer
    startTimer();
}

// Handle guessed button
function handleGuessed() {
    sendToBot({ action: 'guessed' });
}

// Handle skipped button
function handleSkipped() {
    sendToBot({ action: 'skipped' });
}

// Update score display
function updateScore() {
    scoreEl.textContent = score;
}

// Update timer display
function updateTimer() {
    timerEl.textContent = timeLeft;
}

// Start timer
function startTimer() {
    timerId = setInterval(() => {
        timeLeft--;
        updateTimer();
        
        if (timeLeft <= 0) {
            sendToBot({ action: 'game_over' });
        }
    }, 1000);
}

// Restart game
function restartGame() {
    resultScreen.classList.add('hidden');
    document.getElementById('game-screen').style.display = 'block';
    startGame();
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Add event listeners
    guessedBtn.addEventListener('click', handleGuessed);
    skippedBtn.addEventListener('click', handleSkipped);
    playAgainBtn.addEventListener('click', restartGame);
    
    // Start the game
    startGame();
});