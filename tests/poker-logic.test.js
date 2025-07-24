// Basic poker logic tests
// These tests can be run in a browser console or Node.js environment

class PokerTests {
    constructor() {
        this.passed = 0;
        this.failed = 0;
    }

    assert(condition, message) {
        if (condition) {
            console.log(`✅ PASS: ${message}`);
            this.passed++;
        } else {
            console.error(`❌ FAIL: ${message}`);
            this.failed++;
        }
    }

    assertEqual(actual, expected, message) {
        this.assert(actual === expected, `${message} (expected: ${expected}, got: ${actual})`);
    }

    // Test card value function
    testCardValues() {
        console.log('\n=== Testing Card Values ===');
        const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        
        function getCardValue(rank) {
            return RANKS.indexOf(rank);
        }
        
        this.assertEqual(getCardValue('2'), 0, 'Deuce should be 0');
        this.assertEqual(getCardValue('A'), 12, 'Ace should be 12');
        this.assertEqual(getCardValue('K'), 11, 'King should be 11');
        this.assertEqual(getCardValue('J'), 9, 'Jack should be 9');
    }

    // Test hand evaluation
    testHandEvaluation() {
        console.log('\n=== Testing Hand Evaluation ===');
        
        // Mock hand evaluation function (simplified)
        function evaluateTestHand(holeCards, communityCards) {
            const allCards = [...holeCards, ...communityCards];
            const ranks = allCards.map(c => c.rank);
            const suits = allCards.map(c => c.suit);
            
            // Check for pair
            const rankCounts = {};
            ranks.forEach(rank => {
                rankCounts[rank] = (rankCounts[rank] || 0) + 1;
            });
            
            const counts = Object.values(rankCounts).sort((a, b) => b - a);
            
            if (counts[0] === 4) return { rank: 7, name: "Four of a Kind" };
            if (counts[0] === 3 && counts[1] === 2) return { rank: 6, name: "Full House" };
            if (counts[0] === 3) return { rank: 3, name: "Three of a Kind" };
            if (counts[0] === 2 && counts[1] === 2) return { rank: 2, name: "Two Pair" };
            if (counts[0] === 2) return { rank: 1, name: "One Pair" };
            return { rank: 0, name: "High Card" };
        }
        
        // Test pair detection
        const pairHand = evaluateTestHand(
            [{ rank: 'A', suit: '♠' }, { rank: 'A', suit: '♥' }],
            [{ rank: '2', suit: '♣' }, { rank: '3', suit: '♦' }, { rank: '4', suit: '♠' }]
        );
        this.assertEqual(pairHand.rank, 1, 'Should detect pair of Aces');
        this.assertEqual(pairHand.name, 'One Pair', 'Should name pair correctly');
        
        // Test two pair
        const twoPairHand = evaluateTestHand(
            [{ rank: 'A', suit: '♠' }, { rank: 'A', suit: '♥' }],
            [{ rank: '2', suit: '♣' }, { rank: '2', suit: '♦' }, { rank: '4', suit: '♠' }]
        );
        this.assertEqual(twoPairHand.rank, 2, 'Should detect two pair');
        this.assertEqual(twoPairHand.name, 'Two Pair', 'Should name two pair correctly');
    }

    // Test blind logic
    testBlindLogic() {
        console.log('\n=== Testing Blind Logic ===');
        
        const SMALL_BLIND = 10;
        const BIG_BLIND = 20;
        
        // Mock player structure
        const mockPlayers = [
            { id: 0, chips: 1000, isEliminated: false },
            { id: 1, chips: 1000, isEliminated: false },
            { id: 2, chips: 1000, isEliminated: false }
        ];
        
        function getNextActivePlayerIndex(startIndex, players) {
            let index = startIndex;
            for (let i = 0; i < players.length; i++) {
                index = (index + 1) % players.length;
                if (!players[index].isEliminated) {
                    return index;
                }
            }
            return startIndex;
        }
        
        // Test dealer button advancement
        let dealerIndex = 0;
        dealerIndex = getNextActivePlayerIndex(dealerIndex, mockPlayers);
        this.assertEqual(dealerIndex, 1, 'Dealer button should advance to next player');
        
        dealerIndex = getNextActivePlayerIndex(dealerIndex, mockPlayers);
        this.assertEqual(dealerIndex, 2, 'Dealer button should advance to player 2');
        
        dealerIndex = getNextActivePlayerIndex(dealerIndex, mockPlayers);
        this.assertEqual(dealerIndex, 0, 'Dealer button should wrap around to player 0');
    }

    // Test all-in scenarios
    testAllInScenarios() {
        console.log('\n=== Testing All-In Scenarios ===');
        
        // Mock game state for all-in scenario
        const mockGameState = {
            players: [
                { id: 0, chips: 0, bet: 100, isAllIn: true, hasFolded: false, isEliminated: false },
                { id: 1, chips: 0, bet: 100, isAllIn: true, hasFolded: false, isEliminated: false },
                { id: 2, chips: 900, bet: 100, isAllIn: false, hasFolded: false, isEliminated: false }
            ]
        };
        
        function shouldEndRound(gameState) {
            const activePlayers = gameState.players.filter(p => !p.hasFolded && !p.isEliminated);
            if (activePlayers.length <= 1) return true;
            
            const playersWhoCanAct = activePlayers.filter(p => !p.isAllIn);
            if (playersWhoCanAct.length === 0) return true;
            
            return false;
        }
        
        const shouldEnd = shouldEndRound(mockGameState);
        this.assert(shouldEnd === false, 'Round should NOT end when one player can still act');
        
        // Test scenario where all players are all-in
        mockGameState.players[2].isAllIn = true;
        mockGameState.players[2].chips = 0;
        
        const shouldEndAllIn = shouldEndRound(mockGameState);
        this.assert(shouldEndAllIn === true, 'Round should end when all players are all-in');
    }

    // Test AI response parsing
    testAIResponseParsing() {
        console.log('\n=== Testing AI Response Parsing ===');
        
        function parseAIResponse(response) {
            try {
                return JSON.parse(response);
            } catch (parseError) {
                const upperResponse = response.toUpperCase();
                
                if (upperResponse.includes('FOLD')) {
                    return { action: 'FOLD' };
                } else if (upperResponse.includes('CHECK')) {
                    return { action: 'CHECK' };
                } else if (upperResponse.includes('CALL')) {
                    return { action: 'CALL' };
                } else if (upperResponse.includes('RAISE')) {
                    const amountMatch = response.match(/(\d+)/);
                    const amount = amountMatch ? parseInt(amountMatch[1]) : 50;
                    return { action: 'RAISE', amount };
                } else if (upperResponse.includes('BET')) {
                    const amountMatch = response.match(/(\d+)/);
                    const amount = amountMatch ? parseInt(amountMatch[1]) : 20;
                    return { action: 'BET', amount };
                } else {
                    return { action: 'CHECK' };
                }
            }
        }
        
        // Test valid JSON
        const validJson = parseAIResponse('{"action": "FOLD"}');
        this.assertEqual(validJson.action, 'FOLD', 'Should parse valid JSON correctly');
        
        // Test fallback parsing
        const invalidJson = parseAIResponse('I want to fold this hand');
        this.assertEqual(invalidJson.action, 'FOLD', 'Should extract FOLD from text');
        
        const raiseText = parseAIResponse('I will raise to 100 chips');
        this.assertEqual(raiseText.action, 'RAISE', 'Should extract RAISE from text');
        this.assertEqual(raiseText.amount, 100, 'Should extract amount from text');
    }

    // Test folded player reset logic
    testFoldedPlayerReset() {
        console.log('\n=== Testing Folded Player Reset ===');
        
        // Mock player state
        const mockPlayers = [
            { id: 0, hasFolded: true, hasActed: true, isAllIn: false, bet: 50, isEliminated: false },
            { id: 1, hasFolded: false, hasActed: true, isAllIn: true, bet: 100, isEliminated: false },
            { id: 2, hasFolded: true, hasActed: true, isAllIn: false, bet: 25, isEliminated: false }
        ];
        
        // Simulate the reset logic from startNextHand
        mockPlayers.forEach(player => {
            if (!player.isEliminated) {
                player.hasFolded = false;
                player.hasActed = false;
                player.isAllIn = false;
                player.bet = 0;
            }
        });
        
        this.assert(!mockPlayers[0].hasFolded, 'Folded player 0 should be reset to not folded');
        this.assert(!mockPlayers[0].hasActed, 'Player 0 hasActed should be reset');
        this.assert(!mockPlayers[0].isAllIn, 'Player 0 isAllIn should be reset');
        this.assertEqual(mockPlayers[0].bet, 0, 'Player 0 bet should be reset to 0');
        
        this.assert(!mockPlayers[1].hasFolded, 'Player 1 hasFolded should be reset');
        this.assert(!mockPlayers[1].hasActed, 'All-in player 1 hasActed should be reset');
        this.assert(!mockPlayers[1].isAllIn, 'All-in player 1 isAllIn should be reset');
        
        this.assert(!mockPlayers[2].hasFolded, 'Folded player 2 should be reset to not folded');
    }

    // Run all tests
    runAll() {
        console.log('🎯 Starting Poker Game Test Suite...\n');
        
        this.testCardValues();
        this.testHandEvaluation();
        this.testBlindLogic();
        this.testAllInScenarios();
        this.testAIResponseParsing();
        this.testFoldedPlayerReset();
        
        console.log(`\n🎯 Test Results: ${this.passed} passed, ${this.failed} failed`);
        
        if (this.failed === 0) {
            console.log('🎉 All tests passed!');
        } else {
            console.log('❌ Some tests failed. Please review.');
        }
        
        return this.failed === 0;
    }
}

// Run tests if in browser environment
if (typeof window !== 'undefined') {
    window.runPokerTests = () => {
        const tests = new PokerTests();
        return tests.runAll();
    };
    console.log('Poker tests loaded. Run with: runPokerTests()');
}

// Export for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PokerTests;
}