// --- DOM ELEMENTS ---
const apiKeyInput = document.getElementById('apiKey');
const toggleApiVisibilityBtn = document.getElementById('toggleApiVisibility');
const startGameBtn = document.getElementById('startGameBtn');
const restartGameBtn = document.getElementById('restartGameBtn');
const nextHandBtn = document.getElementById('nextHandBtn');
const nextMoveBtn = document.getElementById('nextMoveBtn');
const nextMoveText = document.getElementById('nextMoveText');
const thinkingAnimation = document.getElementById('thinkingAnimation');
const actionLog = document.getElementById('actionLog');
const potEl = document.getElementById('pot');
const communityCardsEl = document.getElementById('community-cards');

// UI Configuration Elements
const togglePlayerConfigBtn = document.getElementById('togglePlayerConfig');
const playerConfigSection = document.getElementById('playerConfigSection');
const randomizeAllBtn = document.getElementById('randomizeAllBtn');
const resetToDefaultsBtn = document.getElementById('resetToDefaultsBtn');

const playerElements = Array.from({ length: 8 }, (_, i) => ({
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
restartGameBtn.addEventListener('click', () => {
    restartGame();
});
nextHandBtn.addEventListener('click', startNextHand);
nextMoveBtn.addEventListener('click', handleNextTurn);

// UI Configuration Event Listeners
togglePlayerConfigBtn.addEventListener('click', () => {
    const isHidden = playerConfigSection.style.display === 'none';
    playerConfigSection.style.display = isHidden ? 'block' : 'none';
    togglePlayerConfigBtn.textContent = isHidden ? 'Hide Configuration' : 'Show Configuration';
});

randomizeAllBtn.addEventListener('click', () => {
    personalitiesInitialized = false;
    setPlayerPersonalities();
});

resetToDefaultsBtn.addEventListener('click', () => {
    personalitiesInitialized = false;
    initializePersonalitiesOnPageLoad();
});

document.querySelectorAll('.generate-prompt-btn').forEach(btn => {
    btn.addEventListener('click', generateAIPersona);
});

toggleApiVisibilityBtn.addEventListener('click', () => {
    apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
    toggleApiVisibilityBtn.textContent = apiKeyInput.type === 'password' ? 'Show' : 'Hide';
});

// --- ANIMATION FUNCTIONS ---
function showThinkingAnimation() {
    nextMoveText.style.display = 'none';
    thinkingAnimation.classList.remove('hidden');
}

function hideThinkingAnimation() {
    nextMoveText.style.display = 'inline';
    thinkingAnimation.classList.add('hidden');
}

// Initialize UI
initializePersonalitiesOnPageLoad();
updateUI();