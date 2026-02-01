// Game State
let state = {
    scoreA: 0,
    scoreB: 0,
    history: [], // Stack for undo
    gameEnded: false
};

const MAX_SCORE = 30; // Maximum cap
const RULES = {
    standardWin: 21,
    deuceDiff: 2
};

// DOM Elements
const scoreElA = document.getElementById('score-a');
const scoreElB = document.getElementById('score-b');
const areaA = document.getElementById('team-a-area');
const areaB = document.getElementById('team-b-area'); // Although we score by clicking
const modal = document.getElementById('winner-modal');
const winnerText = document.getElementById('winner-text');
const finalScore = document.getElementById('final-score');
const nameInputA = document.getElementById('name-a');
const nameInputB = document.getElementById('name-b');

// Initialization
function init() {
    render();
}

// Actions
function handleScore(team, delta) {
    if (state.gameEnded) return;

    const currentScore = team === 'A' ? state.scoreA : state.scoreB;
    const newScore = currentScore + delta;

    // Prevent negative scores
    if (newScore < 0) return;

    // Push state to history for undo BEFORE updating
    pushHistory();

    if (team === 'A') {
        state.scoreA = newScore;
    } else {
        state.scoreB = newScore;
    }

    checkWinner();
    render();
}

function checkWinner() {
    const { scoreA, scoreB } = state;

    // Standard rule: 21 points, must lead by 2
    // If deuce (20-20), continue until lead by 2 or reach 30

    let hasWinner = false;
    let winnerName = "";

    if (scoreA >= 21 || scoreB >= 21) {
        const diff = Math.abs(scoreA - scoreB);

        // Reached 30 (Hard cap)
        if (scoreA === MAX_SCORE) {
            hasWinner = true;
            winnerName = getName('A');
        } else if (scoreB === MAX_SCORE) {
            hasWinner = true;
            winnerName = getName('B');
        }
        // Lead by 2
        else if (diff >= 2) {
            if (scoreA > scoreB) {
                hasWinner = true;
                winnerName = getName('A');
            } else {
                hasWinner = true;
                winnerName = getName('B');
            }
        }
    }

    if (hasWinner) {
        state.gameEnded = true;
        showWinModal(winnerName, scoreA, scoreB);
    }
}

function undoLastAction() {
    if (state.history.length === 0) return;

    const lastState = state.history.pop();
    state.scoreA = lastState.scoreA;
    state.scoreB = lastState.scoreB;
    state.gameEnded = false; // Resume game if it was ended

    modal.classList.add('hidden'); // Hide modal if open
    render();
}

function resetGame() {
    // Confirm? Maybe too annoying for simple app, direct reset is faster but creating a history point before reset is safer
    pushHistory();

    state.scoreA = 0;
    state.scoreB = 0;
    state.gameEnded = false;
    state.history = []; // Clear history on full reset? Or keep it? Let's clear for fresh start.

    render();
}

function swapSides() {
    // Visual swap? Or data swap? 
    // Usually in casual apps, swapping sides means swapping the scores displayed on top/bottom
    // Actually, physically swapping the phone is easier, but if we want to swap the "Team A" and "Team B" positions:

    pushHistory();

    const tempScore = state.scoreA;
    state.scoreA = state.scoreB;
    state.scoreB = tempScore;

    const tempName = nameInputA.value;
    nameInputA.value = nameInputB.value;
    nameInputB.value = tempName;

    render();
}

// Helpers
function pushHistory() {
    // Deep copy necessary state
    state.history.push({
        scoreA: state.scoreA,
        scoreB: state.scoreB
    });

    // Limit history size to save memory? Not really needed for simple app
    if (state.history.length > 50) state.history.shift();
}

function getName(team) {
    return team === 'A' ? nameInputA.value : nameInputB.value;
}

function showWinModal(winner, sA, sB) {
    winnerText.textContent = `${winner} Wins!`;
    finalScore.textContent = `${sA} - ${sB}`;
    modal.classList.remove('hidden');
}

function closeModalAndReset() {
    modal.classList.add('hidden');
    // Start new game but keep names
    state.scoreA = 0;
    state.scoreB = 0;
    state.gameEnded = false;
    state.history = [];
    render();
}

function render() {
    scoreElA.innerText = state.scoreA;
    scoreElB.innerText = state.scoreB;
}

// Run
init();
