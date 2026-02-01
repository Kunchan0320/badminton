// Game State
let state = {
    scoreA: 0,
    scoreB: 0,
    // Players: [Name, isEvenCourt]
    // We store who is in the Even court for each team. The other is in Odd.
    // playersA: ['A1', 'A2'] -> teamA[0] is initial even, teamA[1] is initial odd
    playersA: ['A1', 'A2'],
    playersB: ['B1', 'B2'],

    // Team Names
    teamNameA: "Team A",
    teamNameB: "Team B",

    // Who is currently in the EVEN court? (Index 0 or 1 of players array)
    // Initially A1 (0) in Even, A2 (1) in Odd.
    evenCourtPlayerIndexA: 0,
    evenCourtPlayerIndexB: 0,

    // Server state
    servingTeam: 'A', // 'A' or 'B'
    initialServerIndexA: 0, // Who served first for A?
    initialServerIndexB: 0, // Who served first for B?

    history: [], // Stack for undo
    gameEnded: false,
    editingNames: false
};

const MAX_SCORE = 30; // Maximum cap
const RULES = {
    standardWin: 21,
    deuceDiff: 2
};

// DOM Elements
const scoreElA = document.getElementById('score-a');
const scoreElB = document.getElementById('score-b');

const nameInputA1 = document.getElementById('name-a1');
const nameInputA2 = document.getElementById('name-a2');
const nameInputB1 = document.getElementById('name-b1');
const nameInputB2 = document.getElementById('name-b2');

// Server Dots
const dotAEven = document.getElementById('server-a-even');
const dotAOdd = document.getElementById('server-a-odd');
const dotBEven = document.getElementById('server-b-even');
const dotBOdd = document.getElementById('server-b-odd');

const modal = document.getElementById('winner-modal');
const winnerText = document.getElementById('winner-text');
const finalScore = document.getElementById('final-score');

// Initialization
function init() {
    render();
}

// Logic: Who is serving?
// In Doubles:
// Warning: This logic is complex.
// Simplified tracked state: 
// We just need to know who is standing where.
// The Server is ALWAYS determined by the score of the serving team.
// If score is Even -> Person in Even court serves.
// If score is Odd -> Person in Odd court serves.

function getCurrentServerIndex(team) {
    // Return index of player (0 or 1) who is currently serving for this team
    // Based on CURRENT score and their positions

    // Logic: The server is the person standing in the court corresponding to the score.
    // Score Even -> Even Court Player
    // Score Odd -> Odd Court Player
    // But we track `evenCourtPlayerIndex`.
    // If score is Even, the server is `evenCourtPlayerIndex`.
    // If score is Odd, the server is the OTHER player (1 - evenCourtPlayerIndex).

    const score = team === 'A' ? state.scoreA : state.scoreB;
    const isScoreEven = score % 2 === 0;
    const evenPlayerIndex = team === 'A' ? state.evenCourtPlayerIndexA : state.evenCourtPlayerIndexB;

    if (isScoreEven) return evenPlayerIndex;
    return 1 - evenPlayerIndex;
}

// Actions
function handleScore(team, delta) {
    if (state.gameEnded) return;

    // Push state to history for undo
    pushHistory();

    const currentScore = team === 'A' ? state.scoreA : state.scoreB;
    const newScore = currentScore + delta;

    // Prevent negative scores
    if (newScore < 0) return;

    // Logic for Position Swapping (Doubles)
    // Only swap if the SCORING team was ALREADY Serving and delta is positive (won a point)
    // If receiving team wins point, NO swap, just Side Out (change serving team).

    if (delta > 0) {
        if (state.servingTeam === team) {
            // Serving team won point -> SAME server continues, but SWAP courts (positions)
            // To swap courts, we just toggle the `evenCourtPlayerIndex`
            if (team === 'A') {
                state.evenCourtPlayerIndexA = 1 - state.evenCourtPlayerIndexA;
            } else {
                state.evenCourtPlayerIndexB = 1 - state.evenCourtPlayerIndexB;
            }
            // Score goes up
        } else {
            // Receiving team won point -> Side Out.
            // NO POSITION SWAP for anyone.
            // Just change serving team.
            state.servingTeam = team;
        }
    } else {
        // Subtraction (correction)
        // This is tricky. We need to reverse the logic. 
        // Simplest way is to just rely on History Undo, but if we support manual minus:
        // We probably need to revert position swap if it was a serving team point.
        // But since we don't store "who won last point" in simple state, minus button might desync positions if we don't use full history.
        // For this simple implementation, Manual Minus effectively just reduces score without fixing positions intelligently unless we assume last action was a point.
        // Recommendation: Use Undo for corrections. Minus button purely for score adjustment?
        // Let's make Minus button purely score adjustment, but warn user or maybe disable position swap?
        // Actually, for "Correction", usually you want to undo everything.
        // Let's just adjust score. User can manually swap if needed or use Undo.
    }

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
    let hasWinner = false;
    let winnerName = "";
    if (scoreA >= 21 || scoreB >= 21) {
        const diff = Math.abs(scoreA - scoreB);
        if (scoreA === MAX_SCORE) { hasWinner = true; winnerName = state.teamNameA; }
        else if (scoreB === MAX_SCORE) { hasWinner = true; winnerName = state.teamNameB; }
        else if (diff >= 2) {
            hasWinner = true;
            winnerName = scoreA > scoreB ? state.teamNameA : state.teamNameB;
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
    // Restore all properties
    state.scoreA = lastState.scoreA;
    state.scoreB = lastState.scoreB;
    state.servingTeam = lastState.servingTeam;
    state.evenCourtPlayerIndexA = lastState.evenCourtPlayerIndexA;
    state.evenCourtPlayerIndexB = lastState.evenCourtPlayerIndexB;
    state.playersA = [...lastState.playersA]; // copy back
    state.playersB = [...lastState.playersB];
    state.teamNameA = lastState.teamNameA;
    state.teamNameB = lastState.teamNameB;

    state.gameEnded = false;
    modal.classList.add('hidden');
    render();
}

function resetGame() {
    pushHistory();
    state.scoreA = 0;
    state.scoreB = 0;
    state.gameEnded = false;
    // Reset positions to initial? Or keep current names?
    // Usually names stay, positions reset to standard (0 in even)
    state.evenCourtPlayerIndexA = 0;
    state.evenCourtPlayerIndexB = 0;
    state.servingTeam = 'A'; // Default to A first? Or random? Let's say A.
    // Reset names? Maybe not if user edited them (if we allowed editing).
    // But since we just swap, maybe we should reset to default "Team A"/"Team B" if physically reset?
    // User expectation for "Reset": New Game.
    // If they swapped, maybe they want to keep the swap?
    // Let's keep current names as is, just reset scores.

    render();
}

function swapSides() {
    pushHistory();
    // Swap Scores
    const tempScore = state.scoreA;
    state.scoreA = state.scoreB;
    state.scoreB = tempScore;

    // Swap Names/Players Arrays
    const tempPlayers = [...state.playersA];
    state.playersA = [...state.playersB];
    state.playersB = tempPlayers;

    // Swap Team Names
    const tempName = state.teamNameA;
    state.teamNameA = state.teamNameB;
    state.teamNameB = tempName;

    // Swap Positions indices
    const tempIndex = state.evenCourtPlayerIndexA;
    state.evenCourtPlayerIndexA = state.evenCourtPlayerIndexB;
    state.evenCourtPlayerIndexB = tempIndex;

    // Swap Serving Status
    if (state.servingTeam === 'A') state.servingTeam = 'B';
    else state.servingTeam = 'A';

    render();
}

const teamInputA = document.getElementById('team-name-a');
const teamInputB = document.getElementById('team-name-b');

function toggleEditNames() {
    state.editingNames = !state.editingNames;
    const inputs = document.querySelectorAll('.player-name, .team-label'); // Select both players and team names

    inputs.forEach(input => {
        if (state.editingNames) {
            input.classList.add('editable');
            input.removeAttribute('readonly');
        } else {
            input.classList.remove('editable');
            input.setAttribute('readonly', true);
        }
    });

    // Save on close
    if (!state.editingNames) {
        // Save Team Names
        state.teamNameA = teamInputA.value;
        state.teamNameB = teamInputB.value;

        // Save Player Names (Map input back to correct index)
        state.playersA[state.evenCourtPlayerIndexA] = nameInputA1.value;
        state.playersA[1 - state.evenCourtPlayerIndexA] = nameInputA2.value;

        state.playersB[state.evenCourtPlayerIndexB] = nameInputB1.value;
        state.playersB[1 - state.evenCourtPlayerIndexB] = nameInputB2.value;
    }
}

// Helpers
function pushHistory() {
    state.history.push({
        scoreA: state.scoreA,
        scoreB: state.scoreB,
        servingTeam: state.servingTeam,
        evenCourtPlayerIndexA: state.evenCourtPlayerIndexA,
        evenCourtPlayerIndexB: state.evenCourtPlayerIndexB,
        playersA: [...state.playersA],
        playersB: [...state.playersB]
    });
    if (state.history.length > 50) state.history.shift();
}

function showWinModal(winner, sA, sB) {
    winnerText.textContent = `${winner} Wins!`;
    finalScore.textContent = `${sA} - ${sB}`;
    modal.classList.remove('hidden');
}

function closeModalAndReset() {
    modal.classList.add('hidden');
    resetGame();
}

const serverBtnA = document.getElementById('server-btn-a');
const serverBtnB = document.getElementById('server-btn-b');

function setServingTeam(team) {
    if (state.servingTeam === team) return;

    pushHistory();
    state.servingTeam = team;
    render();
}

function render() {
    scoreElA.innerText = state.scoreA;
    scoreElB.innerText = state.scoreB;

    // Update Names values if not editing (to sync with state)
    if (!state.editingNames) {
        if (teamInputA) teamInputA.value = state.teamNameA;
        if (teamInputB) teamInputB.value = state.teamNameB;

        // Render Players based on Position
        nameInputA1.value = state.playersA[state.evenCourtPlayerIndexA];
        nameInputA2.value = state.playersA[1 - state.evenCourtPlayerIndexA];

        nameInputB1.value = state.playersB[state.evenCourtPlayerIndexB];
        nameInputB2.value = state.playersB[1 - state.evenCourtPlayerIndexB];
    }

    // Server Indicator - Header Buttons
    if (serverBtnA && serverBtnB) {
        if (state.servingTeam === 'A') {
            serverBtnA.classList.add('active');
            serverBtnB.classList.remove('active');
        } else {
            serverBtnA.classList.remove('active');
            serverBtnB.classList.add('active');
        }
    }

    // Server Dot (On Court)
    dotAEven.classList.add('hidden');
    dotAOdd.classList.add('hidden');
    dotBEven.classList.add('hidden');
    dotBOdd.classList.add('hidden');

    if (state.servingTeam === 'A') {
        if (state.scoreA % 2 === 0) dotAEven.classList.remove('hidden');
        else dotAOdd.classList.remove('hidden');
    } else {
        if (state.scoreB % 2 === 0) dotBEven.classList.remove('hidden');
        else dotBOdd.classList.remove('hidden');
    }
}

// Menu Toggle Logic
function toggleMenu() {
    const menu = document.getElementById('control-menu');
    menu.classList.toggle('expanded');
    menu.classList.toggle('minimized');
}

// Close menu when clicking outside
document.addEventListener('click', function (event) {
    const menu = document.getElementById('control-menu');
    const toggleBtn = document.querySelector('.menu-toggle');

    // If click is outside menu and toggle button, and menu is expanded
    if (menu.classList.contains('expanded') &&
        !menu.contains(event.target) &&
        !toggleBtn.contains(event.target)) {
        toggleMenu();
    }
});

// Run
init();
