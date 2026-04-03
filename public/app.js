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
let difficulty = 'easy'; // Default, will be updated from URL params

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

// Words data - will be loaded from words.js via bot communication
// For now, we'll use a simplified version
const wordsData = {
    easy: [
        { word: "кот", action: "покажи как он мяукает" },
        { word: "собака", action: "изобрази лай" },
        { word: "пицца", action: "покажи как её ешь" },
        { word: "машина", action: "покрути руль" },
        { word: "телефон", action: "покажи звонок" },
        { word: "вода", action: "изобрази как пьёшь" },
        { word: "сон", action: "покажи как спишь" },
        { word: "школа", action: "изобрази урок" },
        { word: "учитель", action: "сделай строгий вид" },
        { word: "ребёнок", action: "изобрази каприз" }
    ],
    medium: [
        { word: "самолёт", action: "покажи полёт" },
        { word: "робот", action: "двигайся механически" },
        { word: "повар", action: "изобрази готовку" },
        { word: "доктор", action: "осмотри пациента" },
        { word: "шпион", action: "оглядывайся" }
    ],
    hard: [
        { word: "гравитация", action: "покажи притяжение" },
        { word: "инфляция", action: "изобрази рост цен" },
        { word: "иллюзия", action: "покажи обман зрения" },
        { word: "харизма", action: "изобрази уверенность" },
        { word: "логика", action: "покажи размышление" }
    ]
};

// Get difficulty from URL parameters
function getDifficultyFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('difficulty') || 'easy';
}

// Initialize game
function initGame() {
    difficulty = getDifficultyFromUrl();
    score = 0;
    timeLeft = 60;
    updateScore();
    updateTimer();
    showNextWord();
    startTimer();
    
    // Add event listeners
    guessedBtn.addEventListener('click', handleGuessed);
    skippedBtn.addEventListener('click', handleSkipped);
    playAgainBtn.addEventListener('click', restartGame);
}

// Handle guessed button
function handleGuessed() {
    score++;
    updateScore();
    showNextWord();
}

// Handle skipped button
function handleSkipped() {
    showNextWord();
}

// Show next word
function showNextWord() {
    const wordList = wordsData[difficulty];
    const randomIndex = Math.floor(Math.random() * wordList.length);
    const wordObj = wordList[randomIndex];
    
    currentWord = wordObj.word;
    currentAction = wordObj.action;
    
    wordEl.textContent = currentWord;
    actionEl.textContent = currentAction;
    
    // Add animation
    wordEl.style.animation = 'none';
    void wordEl.offsetWidth; // Trigger reflow
    wordEl.style.animation = 'pulse 0.5s';
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
            endGame();
        }
    }, 1000);
}

// End game
function endGame() {
    clearInterval(timerId);
    finalScoreEl.textContent = score;
    resultScreen.classList.remove('hidden');
    document.getElementById('game-screen').style.display = 'none';
}

// Restart game
function restartGame() {
    resultScreen.classList.add('hidden');
    document.getElementById('game-screen').style.display = 'block';
    initGame();
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initGame);

// Send data to bot when button is clicked
function sendToBot(action) {
    if (typeof tg !== 'undefined' && tg.WebApp) {
        tg.WebApp.sendData(JSON.stringify({ action, score }));
    }
}

// Override button handlers to send data to bot
guessedBtn.addEventListener('click', () => {
    handleGuessed();
    sendToBot('guessed');
});

skippedBtn.addEventListener('click', () => {
    handleSkipped();
    sendToBot('skipped');
});