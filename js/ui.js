// --- UI RENDERING ---
function logAction(message, type = 'action') {
    const p = document.createElement('p');
    p.textContent = type === 'action' ? `> ${message}` : message;
    p.className = `log-${type}`;
    actionLog.appendChild(p);
    actionLog.scrollTop = actionLog.scrollHeight;
}

function renderCard(card, faceUp = false) {
    if (!card) return '';
    const colorClass = (card.suit === '♥' || card.suit === '♦') ? 'red' : 'black';
    return `<div class="card ${colorClass} card-enter"><div>${card.rank}<span class="card-suit">${card.suit}</span></div><div class="text-center text-xl">${card.suit}</div><div class="text-right transform rotate-180">${card.rank}<span class="card-suit">${card.suit}</span></div></div>`;
}

function animatePotIncrease() {
    const potArea = document.querySelector('.pot-area');
    potArea.classList.add('pot-grow');
    setTimeout(() => potArea.classList.remove('pot-grow'), 400);
}

function highlightWinner(playerIndex) {
    const playerArea = playerElements[playerIndex].area;
    playerArea.classList.add('winner-highlight');
    setTimeout(() => playerArea.classList.remove('winner-highlight'), 3000);
}

function updateUI(showdown = false) {
    if (!gameState.players) return;
    potEl.textContent = gameState.pot;
    gameState.players.forEach((player, index) => {
        const el = playerElements[index];
        el.chips.textContent = player.chips;
        
        // Clear previous position classes
        el.area.classList.remove('dealer', 'small-blind', 'big-blind');
        
        // Add position indicators
        if (gameState.dealerIndex === index) {
            el.area.classList.add('dealer');
        }
        if (gameState.smallBlindIndex === index) {
            el.area.classList.add('small-blind');
        }
        if (gameState.bigBlindIndex === index) {
            el.area.classList.add('big-blind');
        }
        
        // Animate chip changes
        if (player.bet > 0) {
            el.bet.textContent = `Bet: ${player.bet}`;
            el.bet.classList.add('chip-animation');
            setTimeout(() => el.bet.classList.remove('chip-animation'), 300);
        } else {
            el.bet.textContent = '';
        }
        
        el.nameDisplay.textContent = player.name;
        el.cards.innerHTML = player.cards.map(card => renderCard(card, true)).join('');
        el.area.classList.toggle('active', index === gameState.currentPlayerIndex && !gameState.gameOver);
        
        if (player.isEliminated) {
            el.area.style.opacity = '0.3';
            el.cards.innerHTML = '<div class="w-full h-full flex items-center justify-center text-lg font-bold text-red-600">ELIMINATED</div>';
        } else if (player.hasFolded) {
            el.area.style.opacity = '0.5';
            el.cards.innerHTML = '<div class="w-full h-full flex items-center justify-center text-lg font-bold text-red-400">FOLDED</div>';
        } else {
             el.area.style.opacity = '1';
        }
    });
    communityCardsEl.innerHTML = gameState.communityCards.map(card => renderCard(card, true)).join('');
}