// --- DOM ELEMENTS ---
const apiKeyInput = document.getElementById('apiKey');
const toggleApiVisibilityBtn = document.getElementById('toggleApiVisibility');
const startGameBtn = document.getElementById('startGameBtn');
const nextMoveBtn = document.getElementById('nextMoveBtn');
const actionLog = document.getElementById('actionLog');
const potEl = document.getElementById('pot');
const communityCardsEl = document.getElementById('community-cards');

const playerElements = Array.from({ length: 4 }, (_, i) => ({
    area: document.getElementById(`player-area-${i}`),
    cards: document.getElementById(`player-${i}-cards`),
    chips: document.getElementById(`player-${i}-chips`),
    bet: document.getElementById(`player-${i}-bet`),
    nameDisplay: document.getElementById(`player-${i}-name`),
    nameInput: document.getElementById(`player-${i}-name-input`),
    prompt: document.getElementById(`player-${i}-prompt`),
}));

// --- EVENT LISTENERS ---
startGameBtn.addEventListener('click', startGame);
nextMoveBtn.addEventListener('click', handleNextTurn);
document.querySelectorAll('.generate-prompt-btn').forEach(btn => {
    btn.addEventListener('click', generateAIPersona);
});

toggleApiVisibilityBtn.addEventListener('click', () => {
    apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
    toggleApiVisibilityBtn.textContent = apiKeyInput.type === 'password' ? 'Show' : 'Hide';
});

// Initialize UI
updateUI();