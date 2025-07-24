// --- AI INTEGRATION ---
async function callGeminiAPI(prompt, isJson = false, retries = 3) {
    const apiKey = apiKeyInput.value;
    if (!apiKey) throw new Error("API Key is missing.");

    const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
    if(isJson) {
        payload.generationConfig = {
            responseMimeType: "application/json",
            responseSchema: { type: "OBJECT", properties: { "action": { "type": "STRING" }, "amount": { "type": "NUMBER" } } }
        }
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(apiUrl, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(30000) // 30 second timeout
            });
            
            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`Gemini API Error (attempt ${attempt}):`, errorBody);
                if (attempt === retries) {
                    throw new Error(`API request failed after ${retries} attempts`);
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
                continue;
            }
            
            const result = await response.json();
            return result.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error(`API call attempt ${attempt} failed:`, error);
            if (attempt === retries) {
                throw new Error(`API request failed: ${error.message}`);
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

function getGameStateForPrompt(player) {
    const otherPlayers = gameState.players.filter(p => p.id !== player.id).map(p => `- ${p.name} (chips: ${p.chips}, folded: ${p.hasFolded})`).join('\n');
    const callAmount = gameState.currentBet - player.bet;
    
    return `
    Game State:
    - Your cards: ${player.cards.map(c => c.rank + c.suit).join(', ')}
    - Community cards: ${gameState.communityCards.length > 0 ? gameState.communityCards.map(c => c.rank + c.suit).join(', ') : 'None'}
    - Your chips: ${player.chips}
    - Current pot size: ${gameState.pot}
    - Current bet to match: ${gameState.currentBet} (You have bet ${player.bet})
    - Amount to call: ${callAmount > 0 ? callAmount : 0}
    - Other players:\n${otherPlayers}`;
}

async function getAIThoughtProcess(player) {
    const gameStatePrompt = getGameStateForPrompt(player);
    const thoughtPrompt = `You are the poker player ${player.name}. 
    
    YOUR CORE PERSONALITY: "${player.prompt}"
    
    IMPORTANT: Stay true to your character throughout the entire game. Never deviate from your established personality traits and playing style.
    
    ${gameStatePrompt}
    
    Based on your established personality and this game state, what is your thought process for your next move? Explain your reasoning in one or two concise sentences while staying completely in character as ${player.name}.`;
    
    try {
        return await callGeminiAPI(thoughtPrompt);
    } catch (error) {
        console.error('Error getting thought process:', error);
        return `${player.name} is having trouble thinking right now.`;
    }
}

async function getAIMove(player) {
    const gameStatePrompt = getGameStateForPrompt(player);
    const canCheck = (gameState.currentBet - player.bet) <= 0;
    const callAmount = gameState.currentBet - player.bet;
    const minRaise = gameState.currentBet + BIG_BLIND; // Minimum raise is one big blind
    const maxBet = player.chips;
    
    const movePrompt = `You are a Texas Hold'em poker player named ${player.name}.
    
    YOUR CORE PERSONALITY AND PLAYING STYLE: "${player.prompt}"
    
    CRITICAL: You must ALWAYS play according to your established personality. Never change your playing style or deviate from your character traits.
    
    ${gameStatePrompt}
    
    ACTIONS AVAILABLE:
    1. FOLD - Give up your hand (respond with: {"action": "FOLD"})
    ${canCheck ? '2. CHECK - No bet required (respond with: {"action": "CHECK"})' : ''}
    ${callAmount > 0 ? `3. CALL - Match bet of ${callAmount} (respond with: {"action": "CALL"})` : ''}
    4. BET - Make first bet in round (respond with: {"action": "BET", "amount": [1-${maxBet}]})
    5. RAISE - Increase existing bet (respond with: {"action": "RAISE", "amount": [${minRaise}-${maxBet}]})
    
    CRITICAL INSTRUCTIONS:
    - You MUST respond with EXACT JSON format using CAPITAL action names
    - Use only these action words: FOLD, CHECK, CALL, BET, RAISE
    - For BET/RAISE, include valid "amount" field
    - Current persona: ${player.name} - ${player.prompt}
    
    EXAMPLES:
    {"action": "FOLD"}
    {"action": "CHECK"}  
    {"action": "CALL"}
    {"action": "BET", "amount": 50}
    {"action": "RAISE", "amount": 100}`;
    
    try {
        const responseText = await callGeminiAPI(movePrompt, true);
        let move;
        
        try {
            move = JSON.parse(responseText);
        } catch (parseError) {
            console.warn('Failed to parse AI response, trying to extract action:', responseText);
            // Improved fallback parsing with more specific patterns
            const upperResponse = responseText.toUpperCase();
            
            if (upperResponse.includes('FOLD')) {
                move = { action: 'FOLD' };
            } else if (upperResponse.includes('CHECK') && canCheck) {
                move = { action: 'CHECK' };
            } else if (upperResponse.includes('CALL')) {
                move = { action: 'CALL' };
            } else if (upperResponse.includes('RAISE')) {
                // Try to extract amount
                const amountMatch = responseText.match(/(\d+)/);
                const amount = amountMatch ? Math.min(parseInt(amountMatch[1]), maxBet) : minRaise;
                move = { action: 'RAISE', amount };
            } else if (upperResponse.includes('BET')) {
                // Try to extract amount
                const amountMatch = responseText.match(/(\d+)/);
                const amount = amountMatch ? Math.min(parseInt(amountMatch[1]), maxBet) : BIG_BLIND;
                move = { action: 'BET', amount };
            } else {
                // Ultimate fallback
                move = { action: canCheck ? 'CHECK' : 'CALL' };
            }
        }
        
        // Validate and sanitize the move
        const validActions = ['FOLD', 'CHECK', 'CALL', 'BET', 'RAISE'];
        if (!validActions.includes(move.action)) {
            console.warn(`Invalid action ${move.action}, defaulting to safe action`);
            return { action: canCheck ? 'CHECK' : 'CALL' };
        }
        
        // Convert to lowercase for internal processing
        move.action = move.action.toLowerCase();
        
        // Validate betting amounts
        if ((move.action === 'bet' || move.action === 'raise')) {
            if (!move.amount || move.amount <= 0 || move.amount > player.chips) {
                console.warn(`Invalid amount ${move.amount}, defaulting to safe action`);
                return { action: canCheck ? 'check' : 'call' };
            }
            
            // Ensure minimum raise for raise action
            if (move.action === 'raise' && move.amount < minRaise) {
                move.amount = Math.min(minRaise, player.chips);
            }
            
            // Ensure bet is at least the big blind
            if (move.action === 'bet' && move.amount < BIG_BLIND) {
                move.amount = Math.min(BIG_BLIND, player.chips);
            }
        }
        
        // Validate check action
        if (move.action === 'check' && !canCheck) {
            console.warn(`Player tried to check when they can't, defaulting to call`);
            return { action: 'call' };
        }
        
        return move;
    } catch (error) {
        console.error('Error in getAIMove:', error);
        // Safe fallback - fold on critical errors to prevent hangs
        return { action: 'fold' };
    }
}

async function generateAIPersona(event) {
    const button = event.target;
    button.disabled = true;
    button.textContent = 'Generating...';
    const playerIndex = button.dataset.playerIndex;
    const nameInput = playerElements[playerIndex].nameInput;
    const promptTextarea = playerElements[playerIndex].prompt;
    
    const personaPrompt = `Create a short, creative, and interesting poker player persona description for a player named "${nameInput.value}". The description should be a prompt that defines their playstyle for an AI. Be imaginative. For example, for "Cowboy Clint", you might write "You're a gunslinger from the old west, never backing down from a fight. You raise with any pair and are known for your fearless bluffs."`;

    try {
        const generatedText = await callGeminiAPI(personaPrompt);
        promptTextarea.value = generatedText;
    } catch (error) {
        promptTextarea.value = "Error generating persona. Please check API key and try again.";
    } finally {
        button.disabled = false;
        button.textContent = '✨ Generate';
    }
}