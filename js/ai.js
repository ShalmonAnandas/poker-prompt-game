// --- AI INTEGRATION ---
async function callGeminiAPI(prompt, isJson = false) {
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
    const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    
    if (!response.ok) {
        const errorBody = await response.text();
        console.error("Gemini API Error:", errorBody);
        throw new Error(`API request failed`);
    }
    
    const result = await response.json();
    return result.candidates[0].content.parts[0].text;
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
    const movePrompt = `You are a Texas Hold'em poker player. Your persona: "${player.prompt}".
    ${gameStatePrompt}
    Available Actions: "fold", ${canCheck ? '"check", ' : ''}"call", "bet [amount]", "raise [amount]".
    You MUST respond in JSON format with your chosen action. Example: {"action": "raise", "amount": 50} or {"action": "fold"}`;
    
    try {
        const responseText = await callGeminiAPI(movePrompt, true);
        const move = JSON.parse(responseText);
        const validActions = ['fold', 'check', 'call', 'bet', 'raise'];
        if (!validActions.includes(move.action)) return { action: 'fold' };
        if ((move.action === 'bet' || move.action === 'raise') && (!move.amount || move.amount <= 0)) return { action: canCheck ? 'check' : 'call' };
        return move;
    } catch (error) {
        console.error('Error in getAIMove:', error);
        throw new Error('Failed to get move from AI.');
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