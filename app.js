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
        const response = await fetch('words.json');
        if (!response.ok) {
            throw new Error('Failed to load words.json');
        }
        words = await response.json();
        wordsLoaded = true;
        console.log('Words loaded successfully');
        return true;
    } catch (error) {
        console.error('Error loading words:', error);
        return false;
    }
}

// Game state
let gameState = {
    team: 'A',
    difficulty: 'easy',
    roundTime: 60,
    teamAScore: 0,
    teamBScore: 0,
    currentWord: null,
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

// Pick next word from words.json database
function pickNextWord() {
    if (!wordsLoaded || !words) {
        console.error('Words not loaded yet');
        return;
    }
    
    const wordList = words[gameState.difficulty];
    const availableWords = wordList.filter(w => !gameState.usedWords.has(w));
    
    if (availableWords.length === 0) {
        // All words used - end game
        sendToBot({ action: 'game_over' });
        showResults();
        return;
    }
    
    const randomIndex = Math.floor(Math.random() * availableWords.length);
    const word = availableWords[randomIndex];
    
    gameState.currentWord = word;
    gameState.usedWords.add(word);
    
    wordEl.textContent = gameState.currentWord;
    
    // Animation
    wordEl.style.animation = 'none';
    void wordEl.offsetWidth;
    wordEl.style.animation = 'pulse 0.5s';
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
    if (!wordsLoaded || !words) {
        alert('Слова еще не загружены. Пожалуйста, подождите.');
        return;
    }
    
    // Reset state
    gameState.teamAScore = 0;
    gameState.teamBScore = 0;
    gameState.usedWords = new Set();
    gameState.timeLeft = gameState.roundTime;
    gameState.team = 'A'; // Reset to team A
    
    updateTeamDisplay();
    updateTimer();
    
    // Send start to bot
    sendToBot({
        action: 'start_game',
        difficulty: gameState.difficulty,
        roundTime: gameState.roundTime
    });
    
    // Pick and show first word
    pickNextWord();
    
    // Start timer
    startTimer();
    
    // Switch screens
    showGame();
}

// Timer
function startTimer() {
    clearInterval(gameState.timerId);
    gameState.timerId = setInterval(() => {
        if (gameState.timeLeft > 0) {
            gameState.timeLeft--;
            updateTimer();
        }
        
        if (gameState.timeLeft <= 0) {
            clearInterval(gameState.timerId);
            gameState.timeLeft = 0;
            updateTimer();
            sendToBot({ action: 'game_over' });
            showResults();
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
    // Add point to current team
    if (gameState.team === 'A') {
        gameState.teamAScore++;
    } else {
        gameState.teamBScore++;
    }
    updateTeamDisplay();
    
    // Send to bot with team info
    sendToBot({ action: 'guessed', team: gameState.team });
    
    // Switch team
    gameState.team = gameState.team === 'A' ? 'B' : 'A';
    updateTeamDisplay();
    
    // Pick next word
    pickNextWord();
}

// Handle skipped
function handleSkipped() {
    // Send to bot with team info
    sendToBot({ action: 'skipped', team: gameState.team });
    
    // Switch team
    gameState.team = gameState.team === 'A' ? 'B' : 'A';
    updateTeamDisplay();
    
    // Pick next word
    pickNextWord();
}

// Switch team (double click)
function switchTeam() {
    gameState.team = gameState.team === 'A' ? 'B' : 'A';
    updateTeamDisplay();
}

// Show results
function showResults() {
    clearInterval(gameState.timerId);
    
    // Update final scores
    finalTeamAEl.textContent = gameState.teamAScore;
    finalTeamBEl.textContent = gameState.teamBScore;
    
    // Calculate total words used
    const totalWords = gameState.usedWords.size;
    const totalPossible = wordsLoaded && words ? words[gameState.difficulty].length : 0;
    
    // Determine winner and set messages
    let winnerMessage = '';
    let resultTitle = '🎉 Поздравляем!';
    let trophyClass = '';
    
    if (gameState.teamAScore > gameState.teamBScore) {
        winnerMessage = '🏆 Победила Команда А!';
        winnerMessageEl.className = 'winner team-a';
        trophyClass = 'trophy-a';
        resultTitle = '🎉 Команда А — чемпионы!';
    } else if (gameState.teamBScore > gameState.teamAScore) {
        winnerMessage = '🏆 Победила Команда Б!';
        winnerMessageEl.className = 'winner team-b';
        trophyClass = 'trophy-b';
        resultTitle = '🎉 Команда Б — чемпионы!';
    } else {
        winnerMessage = '🤝 Ничья!';
        winnerMessageEl.className = 'winner draw';
        trophyClass = 'trophy-draw';
        resultTitle = '🤝 Одинаково сильные команды!';
    }
    
    winnerMessageEl.textContent = winnerMessage;
    resultTitleEl.textContent = resultTitle;
    
    // Update stats
    const difficultyText = {
        'easy': 'Лёгкая',
        'medium': 'Средняя',
        'hard': 'Сложная'
    };
    
    statsEl.innerHTML = `
        <p>📚 Сложность: <strong>${difficultyText[gameState.difficulty]}</strong></p>
        <p>⏱ Время: <strong>${gameState.roundTime} секунд</strong></p>
        <p>📖 Использовано слов: <strong>${totalWords} из ${totalPossible}</strong></p>
    `;
    
    // Animate trophy
    trophyAnimEl.className = 'trophy-animation ' + trophyClass;
    // Trigger animation
    setTimeout(() => {
        trophyAnimEl.classList.add('active');
    }, 100);
    
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