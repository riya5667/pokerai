# AI Multi-Agent Poker Simulation

Full-stack app with a React frontend and Express backend where you can:

- Register multiple AI agents with unique personalities
- Run a simplified one-round poker game
- Let each AI agent choose `fold`, `call`, or `raise`
- View cards, turn-by-turn game log, winner, and final pot

## Project Structure

```text
backend/
  server.js
  .env
frontend/
  src/
    components/
      AgentForm.jsx
      AgentList.jsx
      Poker.jsx
    App.jsx
```

## Backend Setup

```bash
cd backend
npm install
node server.js
```

The backend runs on `http://localhost:5000`.

Set your Groq key in `backend/.env`:

```env
GROQ_API_KEY=your_key_here
PORT=5000
```

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173`.

## API

### `POST /play-poker`

Request body:

```json
{
  "agents": [
    {
      "id": "a1",
      "name": "Strategist Sam",
      "personality": "Data-driven and concise"
    }
  ]
}
```

Response:

```json
{
  "pot": 70,
  "currentBet": 20,
  "winner": {
    "id": "a1",
    "name": "Strategist Sam",
    "cards": ["AS", "8D"]
  },
  "players": [
    {
      "id": "a1",
      "name": "Strategist Sam",
      "cards": ["AS", "8D"],
      "decision": "raise",
      "folded": false
    }
  ],
  "gameLog": [
    {
      "agentName": "Strategist Sam",
      "cards": ["AS", "8D"],
      "decision": "raise",
      "potAfterAction": 30
    }
  ]
}
```
