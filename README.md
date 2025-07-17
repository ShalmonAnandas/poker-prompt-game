# Prompt Poker AI

A Texas Hold'em poker game where AI players with different personalities compete against each other. Each player is powered by Google's Gemini AI and can be customized with unique playing styles through natural language prompts.

## Features

- 4 AI players with customizable personalities
- Real-time poker gameplay with thinking process visualization
- Google Gemini AI integration for intelligent decision making
- Responsive design optimized for desktop and mobile
- Easy persona generation with AI assistance

## Quick Start

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fprompt-poker-ai)

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/your-username/prompt-poker-ai.git
cd prompt-poker-ai
```

2. Open `index.html` in your browser or serve it with a local server:
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .
```

3. Get a Google Gemini API key:
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Create a new API key
   - Enter it in the application

## How to Play

1. **Configure Players**: Customize each player's name and playing style using the prompt fields
2. **Set API Key**: Enter your Google Gemini API key
3. **Start Game**: Click "Start New Game" to begin
4. **Watch AI Play**: Click "Next AI Move" to see each player's turn
5. **Observe Thinking**: See each AI's thought process before they make their move

## Player Personas

The game comes with four default personas:

- **Aggressive Andy**: Plays aggressively, raises with decent hands, bluffs often
- **Cautious Carla**: Very conservative, only plays strong hands
- **Bluffing Ben**: Likes to steal pots when opponents seem weak
- **Thinking Tina**: Balanced tight-aggressive style

You can customize these or create entirely new personas using the "Generate" button or by writing your own prompts.

## Technical Details

### File Structure
```
├── index.html          # Main HTML file
├── styles.css          # CSS styles
├── js/
│   ├── main.js         # DOM elements and event listeners
│   ├── game.js         # Game logic and rules
│   ├── ai.js           # AI integration and API calls
│   └── ui.js           # UI rendering and updates
├── vercel.json         # Vercel deployment configuration
└── README.md           # This file
```

### Dependencies
- **Tailwind CSS**: For styling (loaded via CDN)
- **Google Gemini API**: For AI decision making
- **Modern Browser**: Supports ES6+ features

### API Usage
The application uses Google's Gemini 2.0 Flash model for:
- Making poker decisions based on game state
- Generating thought processes for transparency
- Creating new player personas

## Customization

### Creating New Personas
Write prompts that define:
- Playing style (aggressive, conservative, etc.)
- Betting patterns
- Bluffing tendencies
- Risk tolerance
- Personality traits

Example:
```
"You're a mathematician who calculates odds meticulously. Only bet when you have a statistical advantage. Fold weak hands immediately."
```

### Styling
Modify `styles.css` to change:
- Color schemes
- Table layout
- Card designs
- Animation effects

## Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Deploy automatically

### Other Platforms
The application is static and can be deployed to:
- Netlify
- GitHub Pages
- AWS S3
- Any static hosting service

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Open an issue on GitHub
- Check the Google AI Studio documentation for API-related questions

---

**Note**: You need a Google Gemini API key to use this application. The API key is stored locally in your browser and is not transmitted to any server except Google's API.