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
    const thoughtPrompt = `You are the poker player ${player.name}. Your persona is: "${player.prompt}".
    ${gameStatePrompt}
    Based on this, what is your thought process for your next move? Explain your reasoning in one or two concise sentences.`;
    
    try {
        return await callGeminiAPI(thoughtPrompt);
    } catch (error) {
        console.error('Error getting thought process:', error);
        return "The AI is having trouble thinking right now.";
    }
}

async function getAIMove(player) {
    const gameStatePrompt = getGameStateForPrompt(player);
    const canCheck = (gameState.currentBet - player.bet) <= 0;
    const callAmount = gameState.currentBet - player.bet;
    const maxBet = Math.min(player.chips, gameState.currentBet + 100); // Reasonable max bet
    
    const movePrompt = `You are a Texas Hold'em poker player. Your persona: "${player.prompt}".
    ${gameStatePrompt}
    
    Available Actions:
    - "fold" (lose your hand)
    ${canCheck ? '- "check" (no bet, see next card)' : ''}
    ${callAmount > 0 ? `- "call" (match bet of ${callAmount})` : ''}
    - "bet [amount]" (bet between 1 and ${player.chips})
    - "raise [amount]" (increase bet, min ${gameState.currentBet + 1}, max ${maxBet})
    
    IMPORTANT: You MUST respond in valid JSON format. Examples:
    {"action": "fold"}
    {"action": "check"}  
    {"action": "call"}
    {"action": "bet", "amount": 50}
    {"action": "raise", "amount": 100}`;
    
    try {
        const responseText = await callGeminiAPI(movePrompt, true);
        let move;
        
        try {
            move = JSON.parse(responseText);
        } catch (parseError) {
            console.warn('Failed to parse AI response, trying to extract action:', responseText);
            // Fallback parsing for non-JSON responses
            const lowerResponse = responseText.toLowerCase();
            if (lowerResponse.includes('fold')) move = { action: 'fold' };
            else if (lowerResponse.includes('check') && canCheck) move = { action: 'check' };
            else if (lowerResponse.includes('call')) move = { action: 'call' };
            else move = { action: canCheck ? 'check' : 'call' };
        }
        
        // Validate and sanitize the move
        const validActions = ['fold', 'check', 'call', 'bet', 'raise'];
        if (!validActions.includes(move.action)) {
            return { action: canCheck ? 'check' : 'call' };
        }
        
        if ((move.action === 'bet' || move.action === 'raise')) {
            if (!move.amount || move.amount <= 0 || move.amount > player.chips) {
                return { action: canCheck ? 'check' : 'call' };
            }
            // Ensure minimum raise
            if (move.action === 'raise' && move.amount <= gameState.currentBet) {
                move.amount = Math.min(gameState.currentBet + 10, player.chips);
            }
        }
        
        return move;
    } catch (error) {
        console.error('Error in getAIMove:', error);
        // Safe fallback - always fold on critical errors
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