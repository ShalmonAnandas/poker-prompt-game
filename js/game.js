// --- GAME STATE ---
let gameState = {};

// --- CONSTANTS ---
const SUITS = ['♥', '♦', '♣', '♠'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const STARTING_CHIPS = 1000;

// --- GAME LOGIC ---
function createDeck() { 
    return SUITS.flatMap(suit => RANKS.map(rank => ({ suit, rank }))); 
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function startGame() {
    actionLog.innerHTML = '';
    logAction("Starting a new game...");
    startGameBtn.disabled = true;
    nextMoveBtn.disabled = false;
    const deck = createDeck();
    shuffleDeck(deck);

    gameState = {
        deck,
        players: playerElements.map((el, i) => ({
            id: i,
            name: el.nameInput.value || `Player ${i + 1}`,
            chips: STARTING_CHIPS,
            cards: [],
            bet: 0,
            prompt: el.prompt.value,
            hasActed: false,
            isAllIn: false,
            hasFolded: false,
        })),
        communityCards: [],
        pot: 0,
        currentPlayerIndex: 0,
        currentBet: 0,
        gamePhase: 'pre-flop',
        gameOver: false,
    };

    for (let i = 0; i < gameState.players.length; i++) {
        gameState.players[i].cards = [gameState.deck.pop(), gameState.deck.pop()];
    }
    logAction(`${gameState.players[gameState.currentPlayerIndex].name}'s turn to act.`);
    updateUI();
}

async function handleNextTurn() {
    if (gameState.gameOver) return;

    nextMoveBtn.disabled = true;

    if (shouldEndRound()) {
        await endRoundAndProceed();
        if (!gameState.gameOver) nextMoveBtn.disabled = false;
        return;
    }

    let currentPlayer = gameState.players[gameState.currentPlayerIndex];

    if (currentPlayer.hasFolded || (currentPlayer.isAllIn && currentPlayer.hasActed)) {
        moveToNextPlayer();
        if (!gameState.gameOver) {
            logAction(`${gameState.players[gameState.currentPlayerIndex].name}'s turn to act.`);
            nextMoveBtn.disabled = false;
        }
        return;
    }
    
    updateUI();
    
    try {
        const thought = await getAIThoughtProcess(currentPlayer);
        logAction(`${currentPlayer.name} thinks: "${thought}"`, 'thinking');

        const move = await getAIMove(currentPlayer);
        processPlayerAction(currentPlayer, move.action, move.amount);
    } catch (error) {
        logAction(`Error for ${currentPlayer.name}: ${error.message}. Folding.`);
        processPlayerAction(currentPlayer, 'fold');
    }
    
    updateUI();

    const activePlayers = gameState.players.filter(p => !p.hasFolded).length;
    if (activePlayers <= 1) {
        await endRoundByFold();
        return;
    }
    
    moveToNextPlayer();

    if (!gameState.gameOver) {
         if(shouldEndRound()){
            logAction("Betting round is over. Click 'Next AI Move' to deal cards.", 'analysis');
         } else {
            logAction(`${gameState.players[gameState.currentPlayerIndex].name}'s turn to act.`);
         }
         nextMoveBtn.disabled = false;
    }
}

function moveToNextPlayer() {
    let attempts = 0;
    do {
        gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
        attempts++;
    } while ((gameState.players[gameState.currentPlayerIndex].hasFolded || (gameState.players[gameState.currentPlayerIndex].isAllIn && attempts < gameState.players.length * 2)))
}

function shouldEndRound() {
     const activePlayers = gameState.players.filter(p => !p.hasFolded);
     if (activePlayers.length <= 1) return true;
     const playersWhoCanAct = activePlayers.filter(p => !p.isAllIn);
     if (playersWhoCanAct.length === 0) return true;
     const allActed = playersWhoCanAct.every(p => p.hasActed);
     const betsEqual = playersWhoCanAct.every(p => p.bet === gameState.currentBet);
     return allActed && betsEqual;
}

async function endRoundAndProceed() {
    logAction("Betting round concluded.", "analysis");
    collectBets();
    gameState.players.forEach(p => { if (!p.hasFolded && !p.isAllIn) p.hasActed = false; });
    const nextPhaseMap = { 'pre-flop': 'flop', 'flop': 'turn', 'turn': 'river', 'river': 'showdown' };
    const cardsToDeal = { 'flop': 3, 'turn': 1, 'river': 1 };
    const nextPhase = nextPhaseMap[gameState.gamePhase];
    gameState.gamePhase = nextPhase;
    if (cardsToDeal[nextPhase]) {
        dealCommunityCards(cardsToDeal[nextPhase]);
        logAction(`Dealing the ${nextPhase}.`, "analysis");
        updateUI();
        gameState.currentBet = 0;
        gameState.players.forEach(p => p.bet = 0);
        moveToNextPlayer();
        logAction(`${gameState.players[gameState.currentPlayerIndex].name}'s turn to act.`);
    } else if (nextPhase === 'showdown') {
        await handleShowdown();
    }
}

function dealCommunityCards(count) {
    for(let i=0; i<count; i++) {
        if(gameState.deck.length > 0) gameState.communityCards.push(gameState.deck.pop());
    }
}

function collectBets() {
    gameState.players.forEach(player => {
        gameState.pot += player.bet;
        player.bet = 0;
    });
}

async function handleShowdown() {
    logAction("Showdown!", "analysis");
    updateUI(true); 

    const winner = determineWinner(); 
    const winnerName = winner ? winner.name : "No one (tie)";
    
    if (winner) {
        logAction(`${winner.name} wins the pot of ${gameState.pot}!`);
        winner.chips += gameState.pot;
    } else {
        logAction("It's a tie! The pot is split.");
        const activePlayers = gameState.players.filter(p => !p.hasFolded);
        const potPerPlayer = Math.floor(gameState.pot / activePlayers.length);
        activePlayers.forEach(p => p.chips += potPerPlayer);
    }
    gameState.gameOver = true;
    nextMoveBtn.disabled = true;
    startGameBtn.disabled = false;
}

function determineWinner() {
    const cardValue = (card) => RANKS.indexOf(card.rank);
    const handValue = (cards) => {
        if (!cards || cards.length === 0) return -1;
        return Math.max(...cards.map(cardValue));
    }
    const contenders = gameState.players.filter(p => !p.hasFolded);
    if (contenders.length === 0) return null;
    if (contenders.length === 1) return contenders[0];
    
    let bestHandValue = -1;
    let winners = [];

    for(const player of contenders) {
        const value = handValue(player.cards);
        if (value > bestHandValue) {
            bestHandValue = value;
            winners = [player];
        } else if (value === bestHandValue) {
            winners.push(player);
        }
    }
    return winners.length === 1 ? winners[0] : null;
}

function processPlayerAction(player, action, amount = 0) {
    player.hasActed = true;
    const actionText = `${player.name} chooses to ${action.toUpperCase()}${amount > 0 ? ' ' + amount : ''}.`;
    logAction(actionText);

    switch (action) {
        case 'fold': player.hasFolded = true; break;
        case 'check':
            if (player.bet < gameState.currentBet) {
                logAction(`${player.name} cannot check, folding instead.`);
                player.hasFolded = true;
            }
            break;
        case 'call':
            const callAmount = Math.min(gameState.currentBet - player.bet, player.chips);
            if (callAmount > 0) {
                player.chips -= callAmount;
                player.bet += callAmount;
                if (player.chips === 0) player.isAllIn = true;
            }
            break;
        case 'bet': case 'raise':
            const finalAmount = Math.min(amount, player.chips);
            if (finalAmount > 0) {
                player.chips -= finalAmount;
                player.bet += finalAmount;
                gameState.currentBet = player.bet;
                if (player.chips === 0) player.isAllIn = true;
                gameState.players.forEach(p => { if (p.id !== player.id && !p.hasFolded && !p.isAllIn) p.hasActed = false; });
            }
            break;
    }
}

async function endRoundByFold() {
    const winner = gameState.players.find(p => !p.hasFolded);
    if(winner) {
        collectBets();
        logAction(`${winner.name} wins the pot of ${gameState.pot} as everyone else folded.`, 'analysis');
        winner.chips += gameState.pot;
        gameState.pot = 0;
        gameState.gameOver = true;
        nextMoveBtn.disabled = true;
        startGameBtn.disabled = false;
    }
}