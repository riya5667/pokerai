import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  })
);
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const SUITS = ["S", "H", "D", "C"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const RANK_VALUE = Object.fromEntries(RANKS.map((rank, index) => [rank, index + 2]));
const VALUE_TO_RANK = Object.fromEntries(RANKS.map((rank, index) => [index + 2, rank]));
const SUIT_SYMBOL = { S: "\u2660", H: "\u2665", D: "\u2666", C: "\u2663" };

const STARTING_STACK = 100;
const MIN_BET = 10;
const RAISE_INCREMENT = 10;

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

function shuffleDeck(deck) {
  const copy = [...deck];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function dealCards(deck, players, cardsPerPlayer = 2) {
  const dealtPlayers = players.map((player) => ({ ...player, cards: [] }));
  let cursor = 0;

  for (let i = 0; i < cardsPerPlayer; i += 1) {
    for (const player of dealtPlayers) {
      player.cards.push(deck[cursor]);
      cursor += 1;
    }
  }

  return { players: dealtPlayers, remainingDeck: deck.slice(cursor) };
}

function cardToString(card) {
  return `${card.rank}${card.suit}`;
}

function cardToPrettyString(card) {
  return `${card.rank}${SUIT_SYMBOL[card.suit] || card.suit}`;
}

function normalizeAction(rawText) {
  const lower = String(rawText || "").trim().toLowerCase();
  if (lower.includes("fold")) return "fold";
  if (lower.includes("raise")) return "raise";
  if (lower.includes("call")) return "call";
  return "call";
}

function getAllowedActions(currentBet, player) {
  const toCall = Math.max(0, currentBet - player.contribution);
  const canCall = toCall > 0 && player.stack >= toCall;
  const canRaise = player.stack >= toCall + RAISE_INCREMENT;
  const canFold = true;

  return {
    canFold,
    canCall,
    canRaise,
    toCall,
  };
}

function sanitizeAction(action, currentBet, player) {
  const { canCall, canRaise, toCall } = getAllowedActions(currentBet, player);

  if (action === "fold") return "fold";
  if (action === "raise" && canRaise) return "raise";
  if (action === "call" && canCall) return "call";

  if (canCall) return "call";
  if (canRaise && toCall === 0) return "raise";
  return "fold";
}

function applyBettingAction(player, action, tableState) {
  const next = { ...tableState };
  const toCall = Math.max(0, next.currentBet - player.contribution);

  if (action === "fold") {
    player.folded = true;
    return {
      action,
      actionText: "Folded",
      betAfterAction: next.currentBet,
      potAfterAction: next.pot,
    };
  }

  if (action === "call") {
    const pay = Math.min(player.stack, toCall);
    player.stack -= pay;
    player.contribution += pay;
    next.pot += pay;

    return {
      action,
      actionText: `Called ${next.currentBet}`,
      betAfterAction: next.currentBet,
      potAfterAction: next.pot,
    };
  }

  const newBet = Math.max(next.currentBet + RAISE_INCREMENT, MIN_BET);
  const raiseToPay = Math.max(0, newBet - player.contribution);
  const pay = Math.min(player.stack, raiseToPay);
  player.stack -= pay;
  player.contribution += pay;
  next.currentBet = player.contribution;
  next.pot += pay;

  return {
    action: "raise",
    actionText: `Raised the bet to ${next.currentBet}`,
    betAfterAction: next.currentBet,
    potAfterAction: next.pot,
  };
}

function evaluateHand(cards) {
  const values = cards
    .map((card) => RANK_VALUE[card.rank] || 0)
    .sort((a, b) => b - a);

  const isPair = values[0] === values[1];
  return {
    handRank: isPair ? "Pair" : "High Card",
    pairValue: isPair ? values[0] : 0,
    highCards: values,
  };
}

function compareHands(aHand, bHand) {
  if (aHand.handRank === "Pair" && bHand.handRank !== "Pair") return 1;
  if (aHand.handRank !== "Pair" && bHand.handRank === "Pair") return -1;

  if (aHand.handRank === "Pair" && bHand.handRank === "Pair") {
    if (aHand.pairValue > bHand.pairValue) return 1;
    if (aHand.pairValue < bHand.pairValue) return -1;
    return 0;
  }

  if (aHand.highCards[0] > bHand.highCards[0]) return 1;
  if (aHand.highCards[0] < bHand.highCards[0]) return -1;
  if (aHand.highCards[1] > bHand.highCards[1]) return 1;
  if (aHand.highCards[1] < bHand.highCards[1]) return -1;
  return 0;
}

function describeWinningReason(winners, runnerUp, singleByFold = false) {
  if (singleByFold) {
    return "All other players folded.";
  }

  if (winners.length > 1) {
    return "Tie on hand strength. Pot is split.";
  }

  const winner = winners[0];
  if (!runnerUp) {
    return "Best hand at showdown.";
  }

  if (winner.hand.handRank === "Pair" && runnerUp.hand.handRank === "Pair") {
    return `Pair of ${VALUE_TO_RANK[winner.hand.pairValue]}s beats pair of ${VALUE_TO_RANK[runnerUp.hand.pairValue]}s`;
  }

  if (winner.hand.handRank === "Pair" && runnerUp.hand.handRank === "High Card") {
    return `Pair of ${VALUE_TO_RANK[winner.hand.pairValue]}s beats ${VALUE_TO_RANK[runnerUp.hand.highCards[0]]} high`;
  }

  return `${VALUE_TO_RANK[winner.hand.highCards[0]]} high beats ${VALUE_TO_RANK[runnerUp.hand.highCards[0]]} high`;
}

function determineWinner(players, pot) {
  const activePlayers = players.filter((player) => !player.folded);

  if (activePlayers.length === 1) {
    const only = activePlayers[0];
    return {
      winners: [only],
      winningReason: describeWinningReason([only], null, true),
      winningAmountEach: pot,
      isSplit: false,
    };
  }

  if (activePlayers.length === 0) {
    const fallback = players[0];
    return {
      winners: [fallback],
      winningReason: "All players folded. First player receives pot.",
      winningAmountEach: pot,
      isSplit: false,
    };
  }

  for (const player of activePlayers) {
    player.hand = evaluateHand(player.cards);
  }

  let best = activePlayers[0];
  for (const player of activePlayers.slice(1)) {
    if (compareHands(player.hand, best.hand) > 0) {
      best = player;
    }
  }

  const winners = activePlayers.filter(
    (player) => compareHands(player.hand, best.hand) === 0
  );

  const runnerUp = activePlayers
    .filter((player) => compareHands(player.hand, best.hand) < 0)
    .sort((a, b) => compareHands(b.hand, a.hand))[0];

  const isSplit = winners.length > 1;
  const winningAmountEach = isSplit ? Math.floor(pot / winners.length) : pot;

  return {
    winners,
    winningReason: describeWinningReason(winners, runnerUp, false),
    winningAmountEach,
    isSplit,
  };
}

function getOtherActionsSummary(gameLog) {
  if (gameLog.length === 0) {
    return "None";
  }
  return gameLog.map((entry) => `${entry.agentName} ${entry.action}`).join(", ");
}

async function getAgentAction(player, tableState, gameLog) {
  const activePlayers = tableState.players.filter((p) => !p.folded).length;
  const userPrompt = `Your Cards: ${cardToPrettyString(player.cards[0])}, ${cardToPrettyString(player.cards[1])}
Current Bet: ${tableState.currentBet}
Pot: ${tableState.pot}
Active Players: ${activePlayers}
Your Stack: ${player.stack}
Available Actions: fold, call, raise
Other Players Actions: ${getOtherActionsSummary(gameLog)}

Rules:
- Respond with ONLY one word: fold, call, or raise.
- No explanation.`;

  const completion = await openai.chat.completions.create({
    model: "llama-3.1-8b-instant",
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: `You are ${player.name}. Personality: ${player.personality}. You are playing poker strategically.`,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
  });

  const raw = completion.choices?.[0]?.message?.content?.trim() || "";
  return normalizeAction(raw);
}

app.post("/play-poker", async (req, res) => {
  try {
    const { agents } = req.body ?? {};

    if (!Array.isArray(agents) || agents.length === 0) {
      return res
        .status(400)
        .json({ error: "At least one agent is required to play poker." });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: "GROQ_API_KEY is not configured." });
    }

    const basePlayers = agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      personality: agent.personality || "Balanced and strategic",
      cards: [],
      stack: STARTING_STACK,
      contribution: 0,
      action: null,
      folded: false,
      hand: null,
    }));

    const deck = shuffleDeck(createDeck());
    const { players, remainingDeck } = dealCards(deck, basePlayers, 2);
    const communityCards = remainingDeck.slice(0, 5);

    const tableState = {
      currentBet: MIN_BET,
      pot: 0,
      players,
    };
    const gameLog = [];

    for (const player of tableState.players) {
      if (tableState.players.filter((p) => !p.folded).length <= 1) {
        break;
      }

      const llmAction = await getAgentAction(player, tableState, gameLog);
      const action = sanitizeAction(llmAction, tableState.currentBet, player);
      player.action = action;

      const applied = applyBettingAction(player, action, tableState);
      tableState.currentBet = applied.betAfterAction;
      tableState.pot = applied.potAfterAction;

      gameLog.push({
        agentName: player.name,
        action: applied.action,
        actionText: applied.actionText,
        currentBet: applied.betAfterAction,
        potAfterAction: applied.potAfterAction,
      });
    }

    const contributionSum = tableState.players.reduce(
      (sum, player) => sum + player.contribution,
      0
    );
    tableState.pot = contributionSum;

    const winnerResult = determineWinner(tableState.players, tableState.pot);
    const winnerNames = winnerResult.winners.map((w) => w.name);

    return res.json({
      pot: tableState.pot,
      finalPot: tableState.pot,
      currentBet: tableState.currentBet,
      communityCards: communityCards.map(cardToString),
      winner: winnerNames.length === 1 ? winnerNames[0] : winnerNames.join(" & "),
      winningReason: winnerResult.winningReason,
      winningAmount: winnerResult.winningAmountEach,
      splitPot: winnerResult.isSplit,
      players: tableState.players.map((player) => ({
        name: player.name,
        cards: player.cards.map(cardToString),
        action: player.action || "fold",
        contribution: player.contribution,
        handRank: player.hand?.handRank || "High Card",
      })),
      gameLog,
    });
  } catch (error) {
    const status = error?.status || 500;
    const message = error?.message || "Failed to simulate poker game.";
    return res.status(status).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
