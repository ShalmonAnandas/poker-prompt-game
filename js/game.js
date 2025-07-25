// --- GAME STATE ---
let gameState = {};
let personalitiesInitialized = false;
let tournamentState = {
    inProgress: false,
    handNumber: 0,
    eliminatedPlayers: [],
    dealerPosition: 0  // Track dealer button position
};

// Initialize side pot system
function initializeSidePots() {
    gameState.sidePots = [];
    gameState.mainPot = 0;
}

function createSidePot(amount, eligiblePlayers) {
    return {
        amount: amount,
        eligiblePlayers: eligiblePlayers.map(p => p.id),
        contributors: new Set()
    };
}

function handleAllInScenario() {
    if (!gameState.players.some(p => p.isAllIn)) return;
    
    // Sort players by chips contributed (for side pot calculation)
    const activePlayers = gameState.players.filter(p => !p.hasFolded);
    const sortedByContribution = activePlayers.sort((a, b) => a.bet - b.bet);
    
    let lastContribution = 0;
    gameState.sidePots = [];
    
    for (let i = 0; i < sortedByContribution.length; i++) {
        const currentContribution = sortedByContribution[i].bet;
        if (currentContribution > lastContribution) {
            const potAmount = (currentContribution - lastContribution) * (sortedByContribution.length - i);
            const eligiblePlayers = sortedByContribution.slice(i);
            gameState.sidePots.push(createSidePot(potAmount, eligiblePlayers));
            lastContribution = currentContribution;
        }
    }
}

// --- CONSTANTS ---
const SUITS = ['♥', '♦', '♣', '♠'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const STARTING_CHIPS = 1000;
const SMALL_BLIND = 10;
const BIG_BLIND = 20;

// --- PREMADE PERSONALITIES ---
const PREMADE_PERSONALITIES = [
    {
        name: "Aggressive Andy",
        prompt: "Always play aggressively. Raise if you have anything decent. Bluff often and never back down from a fight."
    },
    {
        name: "Cautious Carla",
        prompt: "Be very cautious. Only play very strong hands like high pairs or better. Fold otherwise."
    },
    {
        name: "Bluffing Ben",
        prompt: "You like to bluff. If the other players seem weak (checking or folding), try to steal the pot with a bet, even with a bad hand."
    },
    {
        name: "Mathematical Mike",
        prompt: "You're a mathematician who calculates odds meticulously. Only bet when you have a statistical advantage. Fold weak hands immediately."
    },
    {
        name: "Lucky Lucy",
        prompt: "You believe in luck and intuition. Play hands that 'feel' right, even if they're not mathematically strong. Trust your gut instincts."
    },
    {
        name: "Cowboy Clint",
        prompt: "You're a gunslinger from the old west, never backing down from a fight. You raise with any pair and are known for your fearless bluffs."
    },
    {
        name: "Corporate Kate",
        prompt: "You approach poker like a business deal. Calculate risks carefully, but when you see an opportunity, strike decisively."
    },
    {
        name: "Rookie Ryan",
        prompt: "You're new to poker and tend to play too many hands. You get excited by face cards and suited connectors, often calling when you should fold."
    },
    {
        name: "Veteran Victor",
        prompt: "You've seen it all. Play a tight, disciplined game but know when to make big moves. You can read other players like a book."
    },
    {
        name: "Emotional Emma",
        prompt: "Your emotions drive your play. When winning, you get overconfident. When losing, you play too aggressively to get even."
    },
    {
        name: "Silent Sam",
        prompt: "You're the strong silent type. Play a balanced, unpredictable style. Sometimes tight, sometimes loose, keeping opponents guessing."
    },
    {
        name: "Gambler Gary",
        prompt: "You live for the thrill. Love drawing to long shots and making big bets. If there's even a small chance, you'll chase it."
    },
    {
        name: "Professor Phil",
        prompt: "You analyze every situation deeply. Consider pot odds, implied odds, and opponent tendencies before every decision."
    },
    {
        name: "Wild West Wendy",
        prompt: "You're unpredictable and chaotic. Mix up your play constantly - sometimes ultra-tight, sometimes ultra-loose. Keep everyone on their toes."
    },
    {
        name: "Ice Cold Ivan",
        prompt: "You never show emotion and play with machine-like precision. Stick to optimal strategy regardless of the situation."
    }
];

// --- UTILITY FUNCTIONS ---
function getNextActivePlayerIndex(startIndex) {
    let index = startIndex;
    const activePlayers = gameState.players.filter(p => !p.isEliminated);
    if (activePlayers.length <= 1) return startIndex;
    
    for (let i = 0; i < gameState.players.length; i++) {
        index = (index + 1) % gameState.players.length;
        if (!gameState.players[index].isEliminated) {
            return index;
        }
    }
    return startIndex;
}

function postBlinds() {
    const activePlayers = gameState.players.filter(p => !p.isEliminated);
    if (activePlayers.length < 2) return;
    
    // Get positions for dealer, small blind, and big blind
    let dealerIndex = tournamentState.dealerPosition;
    
    // Ensure dealer is active
    while (gameState.players[dealerIndex].isEliminated) {
        dealerIndex = getNextActivePlayerIndex(dealerIndex);
    }
    tournamentState.dealerPosition = dealerIndex;
    
    let smallBlindIndex, bigBlindIndex;
    
    if (activePlayers.length === 2) {
        // Heads-up: dealer posts small blind
        smallBlindIndex = dealerIndex;
        bigBlindIndex = getNextActivePlayerIndex(dealerIndex);
    } else {
        // Normal play: first player after dealer is small blind
        smallBlindIndex = getNextActivePlayerIndex(dealerIndex);
        bigBlindIndex = getNextActivePlayerIndex(smallBlindIndex);
    }
    
    // Post small blind
    const smallBlindPlayer = gameState.players[smallBlindIndex];
    const smallBlindAmount = Math.min(SMALL_BLIND, smallBlindPlayer.chips);
    smallBlindPlayer.chips -= smallBlindAmount;
    smallBlindPlayer.bet = smallBlindAmount;
    if (smallBlindPlayer.chips === 0) smallBlindPlayer.isAllIn = true;
    
    // Post big blind
    const bigBlindPlayer = gameState.players[bigBlindIndex];
    const bigBlindAmount = Math.min(BIG_BLIND, bigBlindPlayer.chips);
    bigBlindPlayer.chips -= bigBlindAmount;
    bigBlindPlayer.bet = bigBlindAmount;
    if (bigBlindPlayer.chips === 0) bigBlindPlayer.isAllIn = true;
    
    // Set current bet to big blind amount
    gameState.currentBet = bigBlindAmount;
    
    // Set starting position for betting (first player after big blind)
    gameState.currentPlayerIndex = getNextActivePlayerIndex(bigBlindIndex);
    
    // Mark positions for UI display
    gameState.dealerIndex = dealerIndex;
    gameState.smallBlindIndex = smallBlindIndex;
    gameState.bigBlindIndex = bigBlindIndex;
    
    logAction(`Dealer: ${gameState.players[dealerIndex].name}`, 'analysis');
    logAction(`${smallBlindPlayer.name} posts small blind of ${smallBlindAmount}`, 'analysis');
    logAction(`${bigBlindPlayer.name} posts big blind of ${bigBlindAmount}`, 'analysis');
}

function getRandomPersonalities() {
    // Shuffle the array and take first 7 for 8-player game
    const shuffled = [...PREMADE_PERSONALITIES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 7);
}

function setPlayerPersonalities() {
    const randomPersonalities = getRandomPersonalities();
    
    // Set first 7 players with random personalities
    for (let i = 0; i < 7; i++) {
        const personality = randomPersonalities[i];
        playerElements[i].nameInput.value = personality.name;
        playerElements[i].prompt.value = personality.prompt;
    }
    
    // Eighth player keeps user-defined personality or gets a default
    if (!playerElements[7].nameInput.value.trim()) {
        playerElements[7].nameInput.value = "Custom Player";
    }
    if (!playerElements[7].prompt.value.trim()) {
        playerElements[7].prompt.value = "Play your own unique style. Be creative and unpredictable.";
    }
    
    personalitiesInitialized = true;
}

function initializePersonalitiesOnPageLoad() {
    if (!personalitiesInitialized) {
        setPlayerPersonalities();
    }
}
// --- GAME LOGIC ---
function createDeck() { 
    return SUITS.flatMap(suit => RANKS.map(rank => ({ suit, rank }))); 
}

function shuffleDeck(deck) {
    // Fisher-Yates shuffle with multiple passes for better randomization
    for (let pass = 0; pass < 3; pass++) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    }
}

function startNextHand() {
    if (!tournamentState.inProgress) return;
    
    // Check for eliminated players (0 chips)
    const eliminatedThisHand = gameState.players.filter(p => p.chips <= 0 && !p.isEliminated);
    eliminatedThisHand.forEach(player => {
        player.isEliminated = true;
        tournamentState.eliminatedPlayers.push(player.name);
        logAction(`${player.name} has been eliminated from the tournament!`, 'analysis');
    });
    
    // Get remaining active players
    const activePlayers = gameState.players.filter(p => !p.isEliminated);
    
    // Check for tournament winner
    if (activePlayers.length <= 1) {
        endTournament(activePlayers[0]);
        return;
    }
    
    // Start next hand
    tournamentState.handNumber++;
    
    // Advance dealer button to next active player
    tournamentState.dealerPosition = getNextActivePlayerIndex(tournamentState.dealerPosition);
    
    const deck = createDeck();
    shuffleDeck(deck);
    
    // Reset game state for new hand
    gameState.deck = deck;
    gameState.communityCards = [];
    gameState.pot = 0;
    gameState.sidePots = [];
    gameState.currentPlayerIndex = 0;
    gameState.currentBet = 0;
    gameState.gamePhase = 'pre-flop';
    gameState.gameOver = false;
    
    // Reset player states and deal cards to active players
    gameState.players.forEach(player => {
        if (!player.isEliminated) {
            // Reset player state for new hand
            player.hasFolded = false;
            player.hasActed = false;
            player.isAllIn = false;
            player.bet = 0;
            player.cards = [deck.pop(), deck.pop()];
        }
    });
    
    // Post blinds and set starting position
    postBlinds();
    
    logAction(`Hand ${tournamentState.handNumber} begins! ${activePlayers.length} players remaining.`, 'analysis');
    logAction(`${gameState.players[gameState.currentPlayerIndex].name}'s turn to act.`);
    
    // Update button states
    nextHandBtn.disabled = true;
    nextMoveBtn.disabled = false;
    
    updateUI();
}

function endTournament(winner) {
    tournamentState.inProgress = false;
    
    if (winner) {
        logAction(`🏆 TOURNAMENT WINNER: ${winner.name}! 🏆`, 'analysis');
        logAction(`Tournament completed after ${tournamentState.handNumber} hands.`, 'analysis');
        
        // Highlight the winner
        const winnerIndex = gameState.players.findIndex(p => p.id === winner.id);
        if (winnerIndex !== -1) {
            highlightWinner(winnerIndex);
        }
    } else {
        logAction("Tournament ended with no clear winner.", 'analysis');
    }
    
    // Reset button states
    gameState.gameOver = true;
    nextHandBtn.disabled = true;
    nextMoveBtn.disabled = true;
    startGameBtn.disabled = false;
    
    updateUI();
}

function restartGame() {
    // Reset all game state
    gameState = {};
    
    // Reset tournament state
    tournamentState.inProgress = false;
    tournamentState.handNumber = 0;
    tournamentState.eliminatedPlayers = [];
    tournamentState.dealerPosition = 0;
    
    // Clear UI
    actionLog.innerHTML = '';
    
    // Reset player displays
    playerElements.forEach((el, i) => {
        el.chips.textContent = STARTING_CHIPS;
        el.bet.textContent = '';
        el.cards.innerHTML = '';
        el.area.classList.remove('active');
        el.area.style.opacity = '1';
    });
    
    // Reset community cards and pot
    communityCardsEl.innerHTML = '';
    potEl.textContent = '0';
    
    // Reset buttons
    startGameBtn.disabled = false;
    restartGameBtn.disabled = true;
    nextHandBtn.disabled = true;
    nextMoveBtn.disabled = true;
    
    logAction("Game restarted! Player configurations preserved. Start when ready.");
}

function startGame() {
    actionLog.innerHTML = '';
    logAction("Starting a new tournament...");
    startGameBtn.disabled = true;
    restartGameBtn.disabled = false;
    nextMoveBtn.disabled = false;
    
    // Initialize tournament
    tournamentState.inProgress = true;
    tournamentState.handNumber = 1;
    tournamentState.eliminatedPlayers = [];
    tournamentState.dealerPosition = Math.floor(Math.random() * 8); // Random starting dealer
    
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
            isEliminated: false,
        })),
        communityCards: [],
        pot: 0,
        sidePots: [],
        currentPlayerIndex: 0,
        currentBet: 0,
        gamePhase: 'pre-flop',
        gameOver: false,
    };

    for (let i = 0; i < gameState.players.length; i++) {
        gameState.players[i].cards = [gameState.deck.pop(), gameState.deck.pop()];
    }
    
    // Post blinds
    postBlinds();
    
    logAction(`Hand ${tournamentState.handNumber} - ${gameState.players[gameState.currentPlayerIndex].name}'s turn to act.`);
    updateUI();
}

async function handleNextTurn() {
    if (gameState.gameOver) return;

    // Show thinking animation
    showThinkingAnimation();
    nextMoveBtn.disabled = true;

    try {
        if (shouldEndRound()) {
            await endRoundAndProceed();
            hideThinkingAnimation();
            if (!gameState.gameOver) nextMoveBtn.disabled = false;
            return;
        }

        let currentPlayer = gameState.players[gameState.currentPlayerIndex];

        if (currentPlayer.hasFolded || currentPlayer.isEliminated || (currentPlayer.isAllIn && currentPlayer.hasActed)) {
            moveToNextPlayer();
            hideThinkingAnimation();
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
        
        hideThinkingAnimation();
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
    } catch (error) {
        hideThinkingAnimation();
        logAction(`Critical error: ${error.message}. Restarting game.`, 'analysis');
        setTimeout(() => restartGame(), 2000);
    }
}

function moveToNextPlayer() {
    let attempts = 0;
    const maxAttempts = gameState.players.length * 2; // Prevent infinite loops
    
    do {
        gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
        attempts++;
        
        // Safety check to prevent infinite loops
        if (attempts >= maxAttempts) {
            logAction("Error: Unable to find next player. Ending round.", 'analysis');
            gameState.gamePhase = 'showdown';
            return;
        }
    } while ((gameState.players[gameState.currentPlayerIndex].hasFolded || 
              gameState.players[gameState.currentPlayerIndex].isEliminated ||
              (gameState.players[gameState.currentPlayerIndex].isAllIn && 
               gameState.players[gameState.currentPlayerIndex].hasActed)) && 
               attempts < maxAttempts);
}

function shouldEndRound() {
     const activePlayers = gameState.players.filter(p => !p.hasFolded && !p.isEliminated);
     if (activePlayers.length <= 1) return true;
     
     const playersWhoCanAct = activePlayers.filter(p => !p.isAllIn);
     
     // If all players are all-in, we should automatically deal to showdown
     if (playersWhoCanAct.length === 0) return true;
     
     // If only one player can act and all others are all-in, and that player has acted
     if (playersWhoCanAct.length === 1 && playersWhoCanAct[0].hasActed) return true;
     
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
    
    // Check if all remaining players are all-in - if so, deal all remaining cards to showdown
    const activePlayers = gameState.players.filter(p => !p.hasFolded && !p.isEliminated);
    const playersWhoCanAct = activePlayers.filter(p => !p.isAllIn);
    
    if (playersWhoCanAct.length === 0 && activePlayers.length > 1) {
        // All players are all-in, deal straight to showdown
        logAction("All players are all-in. Dealing remaining cards to showdown.", "analysis");
        
        // Deal all remaining community cards at once
        while (gameState.communityCards.length < 5 && gameState.deck.length > 0) {
            gameState.communityCards.push(gameState.deck.pop());
        }
        
        gameState.gamePhase = 'showdown';
        logAction("All community cards dealt. Proceeding to showdown.", "analysis");
        updateUI();
        await handleShowdown();
        return;
    }
    
    gameState.gamePhase = nextPhase;
    if (cardsToDeal[nextPhase]) {
        dealCommunityCards(cardsToDeal[nextPhase]);
        logAction(`Dealing the ${nextPhase}.`, "analysis");
        updateUI();
        gameState.currentBet = 0;
        gameState.players.forEach(p => p.bet = 0);
        
        // Find next player who can act
        moveToNextPlayer();
        
        // If no one can act after dealing, proceed to next phase
        if (playersWhoCanAct.length === 0) {
            logAction("No players can act. Automatically proceeding to next phase.", "analysis");
            setTimeout(() => endRoundAndProceed(), 1000);
        } else {
            logAction(`${gameState.players[gameState.currentPlayerIndex].name}'s turn to act.`);
        }
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
    // Handle side pots if there are all-in players
    if (gameState.players.some(p => p.isAllIn)) {
        handleAllInScenario();
    }
    
    gameState.players.forEach(player => {
        gameState.pot += player.bet;
        player.bet = 0;
    });
    // Animate pot increase
    animatePotIncrease();
}

async function handleShowdown() {
    logAction("Showdown!", "analysis");
    updateUI(true); 

    const winner = determineWinner(); 
    const winnerName = winner ? winner.name : "No one (tie)";
    
    if (winner) {
        const handInfo = gameState.winningHand ? ` with ${gameState.winningHand.name}` : "";
        logAction(`${winner.name} wins the pot of ${gameState.pot}${handInfo}!`);
        winner.chips += gameState.pot;
        
        // Highlight the winner
        const winnerIndex = gameState.players.findIndex(p => p.id === winner.id);
        if (winnerIndex !== -1) {
            highlightWinner(winnerIndex);
        }
    } else {
        logAction("It's a tie! The pot is split.");
        const activePlayers = gameState.players.filter(p => !p.hasFolded);
        const potPerPlayer = Math.floor(gameState.pot / activePlayers.length);
        activePlayers.forEach(p => p.chips += potPerPlayer);
    }
    
    // Show all player hands in showdown
    const contenders = gameState.players.filter(p => !p.hasFolded);
    contenders.forEach(player => {
        const hand = evaluateHand(player.cards, gameState.communityCards);
        logAction(`${player.name} shows: ${hand.name}`, 'analysis');
    });
    
    gameState.gameOver = true;
    nextMoveBtn.disabled = true;
    
    // Check if tournament is in progress
    if (tournamentState.inProgress) {
        // Enable Next Hand button for tournament
        nextHandBtn.disabled = false;
        logAction("Hand complete! Click 'Next Hand' to continue the tournament.", 'analysis');
    } else {
        // Single game mode - enable start button
        startGameBtn.disabled = false;
    }
    
    updateUI();
}

function determineWinner() {
    const contenders = gameState.players.filter(p => !p.hasFolded);
    if (contenders.length === 0) return null;
    if (contenders.length === 1) return contenders[0];
    
    // Evaluate all hands
    const evaluatedHands = contenders.map(player => ({
        player: player,
        hand: evaluateHand(player.cards, gameState.communityCards)
    }));
    
    // Find the best hand(s)
    let bestHands = [evaluatedHands[0]];
    
    for (let i = 1; i < evaluatedHands.length; i++) {
        const comparison = compareHands(evaluatedHands[i].hand, bestHands[0].hand);
        if (comparison > 0) {
            bestHands = [evaluatedHands[i]];
        } else if (comparison === 0) {
            bestHands.push(evaluatedHands[i]);
        }
    }
    
    // Store winning hand info for display
    gameState.winningHand = bestHands[0].hand;
    
    return bestHands.length === 1 ? bestHands[0].player : null;
}
function getCardValue(rank) {
    return RANKS.indexOf(rank);
}

function evaluateHand(holeCards, communityCards) {
    const allCards = [...holeCards, ...communityCards];
    const sortedCards = allCards.sort((a, b) => getCardValue(b.rank) - getCardValue(a.rank));
    
    // Count ranks and suits
    const rankCounts = {};
    const suitCounts = {};
    
    sortedCards.forEach(card => {
        rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
        suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
    });
    
    const ranks = Object.keys(rankCounts).sort((a, b) => getCardValue(b) - getCardValue(a));
    const counts = Object.values(rankCounts).sort((a, b) => b - a);
    const isFlush = Object.values(suitCounts).some(count => count >= 5);
    
    // Check for straight
    let isStraight = false;
    let straightHigh = -1;
    
    // Check for regular straight
    for (let i = 0; i <= ranks.length - 5; i++) {
        let consecutive = true;
        for (let j = 0; j < 4; j++) {
            if (getCardValue(ranks[i + j]) - getCardValue(ranks[i + j + 1]) !== 1) {
                consecutive = false;
                break;
            }
        }
        if (consecutive) {
            isStraight = true;
            straightHigh = getCardValue(ranks[i]);
            break;
        }
    }
    
    // Check for A-2-3-4-5 straight (wheel)
    if (!isStraight && ranks.includes('A') && ranks.includes('2') && ranks.includes('3') && ranks.includes('4') && ranks.includes('5')) {
        isStraight = true;
        straightHigh = 3; // 5-high straight
    }
    
    // Determine hand rank (higher number = better hand)
    let handRank = 0;
    let handName = "";
    let kickers = [];
    
    if (isStraight && isFlush) {
        handRank = 8;
        handName = "Straight Flush";
        kickers = [straightHigh];
    } else if (counts[0] === 4) {
        handRank = 7;
        handName = "Four of a Kind";
        const quadRank = Object.keys(rankCounts).find(rank => rankCounts[rank] === 4);
        kickers = [getCardValue(quadRank)];
    } else if (counts[0] === 3 && counts[1] === 2) {
        handRank = 6;
        handName = "Full House";
        const tripRank = Object.keys(rankCounts).find(rank => rankCounts[rank] === 3);
        const pairRank = Object.keys(rankCounts).find(rank => rankCounts[rank] === 2);
        kickers = [getCardValue(tripRank), getCardValue(pairRank)];
    } else if (isFlush) {
        handRank = 5;
        handName = "Flush";
        kickers = ranks.slice(0, 5).map(rank => getCardValue(rank));
    } else if (isStraight) {
        handRank = 4;
        handName = "Straight";
        kickers = [straightHigh];
    } else if (counts[0] === 3) {
        handRank = 3;
        handName = "Three of a Kind";
        const tripRank = Object.keys(rankCounts).find(rank => rankCounts[rank] === 3);
        kickers = [getCardValue(tripRank)];
    } else if (counts[0] === 2 && counts[1] === 2) {
        handRank = 2;
        handName = "Two Pair";
        const pairs = Object.keys(rankCounts).filter(rank => rankCounts[rank] === 2)
            .map(rank => getCardValue(rank)).sort((a, b) => b - a);
        kickers = pairs;
    } else if (counts[0] === 2) {
        handRank = 1;
        handName = "One Pair";
        const pairRank = Object.keys(rankCounts).find(rank => rankCounts[rank] === 2);
        kickers = [getCardValue(pairRank)];
    } else {
        handRank = 0;
        handName = "High Card";
        kickers = ranks.slice(0, 5).map(rank => getCardValue(rank));
    }
    
    return {
        rank: handRank,
        name: handName,
        kickers: kickers,
        cards: sortedCards.slice(0, 5)
    };
}

function compareHands(hand1, hand2) {
    if (hand1.rank !== hand2.rank) {
        return hand1.rank - hand2.rank;
    }
    
    // Same hand rank, compare kickers
    for (let i = 0; i < Math.max(hand1.kickers.length, hand2.kickers.length); i++) {
        const kicker1 = hand1.kickers[i] || -1;
        const kicker2 = hand2.kickers[i] || -1;
        if (kicker1 !== kicker2) {
            return kicker1 - kicker2;
        }
    }
    
    return 0; // Tie
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
        
        // Check if tournament is in progress
        if (tournamentState.inProgress) {
            // Enable Next Hand button for tournament
            nextHandBtn.disabled = false;
            logAction("Hand complete! Click 'Next Hand' to continue the tournament.", 'analysis');
        } else {
            // Single game mode - enable start button
            startGameBtn.disabled = false;
        }
    }
}