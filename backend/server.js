import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: ["https://pokerai-khaki.vercel.app", "http://localhost:5173"],
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
const RANK_VALUE = Object.fromEntries(RANKS.map((rank, i) => [rank, i + 2]));
const SUIT_SYMBOL = { S: "♠", H: "♥", D: "♦", C: "♣" };

const STARTING_STACK = 500;
const SMALL_BLIND = 10;
const BIG_BLIND = 20;
const RAISE_INCREMENT = 20;

const HAND_RANKS = {
  "Royal Flush": 9, "Straight Flush": 8, "Four of a Kind": 7,
  "Full House": 6, "Flush": 5, "Straight": 4,
  "Three of a Kind": 3, "Two Pair": 2, "Pair": 1, "High Card": 0,
};

app.get("/health", (_req, res) => res.json({ ok: true }));

function createDeck() {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit })));
}

function shuffleDeck(deck) {
  const copy = [...deck];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function dealCards(deck, players) {
  const dealt = players.map((p) => ({ ...p, cards: [] }));
  let cursor = 0;
  for (let i = 0; i < 2; i++) for (const p of dealt) p.cards.push(deck[cursor++]);
  return { players: dealt, remainingDeck: deck.slice(cursor) };
}

function cardToString(card) { return `${card.rank}${card.suit}`; }
function cardToPrettyString(card) { return `${card.rank}${SUIT_SYMBOL[card.suit] || card.suit}`; }

// ─── Full Hand Evaluator ──────────────────────────────────────────────────────

function getCombinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  return [
    ...getCombinations(rest, k - 1).map((c) => [first, ...c]),
    ...getCombinations(rest, k),
  ];
}

function evaluate5CardHand(cards) {
  const values = cards.map((c) => RANK_VALUE[c.rank]).sort((a, b) => b - a);
  const suits = cards.map((c) => c.suit);
  const rankCounts = {};
  for (const v of values) rankCounts[v] = (rankCounts[v] || 0) + 1;
  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  const uniqueVals = [...new Set(values)].sort((a, b) => b - a);

  const isFlush = suits.every((s) => s === suits[0]);
  const isStraight = uniqueVals.length === 5 && uniqueVals[0] - uniqueVals[4] === 4;
  const isWheel = uniqueVals.length === 5 && JSON.stringify(uniqueVals) === JSON.stringify([14, 5, 4, 3, 2]);
  const straightHigh = isWheel ? 5 : values[0];

  if (isFlush && isStraight && values[0] === 14) return { handRank: "Royal Flush", tiebreakers: [14] };
  if (isFlush && (isStraight || isWheel)) return { handRank: "Straight Flush", tiebreakers: [straightHigh] };
  if (counts[0] === 4) {
    const quad = +Object.keys(rankCounts).find((k) => rankCounts[k] === 4);
    const kicker = +Object.keys(rankCounts).find((k) => rankCounts[k] !== 4);
    return { handRank: "Four of a Kind", tiebreakers: [quad, kicker] };
  }
  if (counts[0] === 3 && counts[1] === 2) {
    const trip = +Object.keys(rankCounts).find((k) => rankCounts[k] === 3);
    const pair = +Object.keys(rankCounts).find((k) => rankCounts[k] === 2);
    return { handRank: "Full House", tiebreakers: [trip, pair] };
  }
  if (isFlush) return { handRank: "Flush", tiebreakers: values };
  if (isStraight || isWheel) return { handRank: "Straight", tiebreakers: [straightHigh] };
  if (counts[0] === 3) {
    const trip = +Object.keys(rankCounts).find((k) => rankCounts[k] === 3);
    return { handRank: "Three of a Kind", tiebreakers: [trip, ...values.filter((v) => v !== trip)] };
  }
  if (counts[0] === 2 && counts[1] === 2) {
    const pairs = Object.keys(rankCounts).filter((k) => rankCounts[k] === 2).map(Number).sort((a, b) => b - a);
    const kicker = values.find((v) => !pairs.includes(v));
    return { handRank: "Two Pair", tiebreakers: [...pairs, kicker] };
  }
  if (counts[0] === 2) {
    const pair = +Object.keys(rankCounts).find((k) => rankCounts[k] === 2);
    return { handRank: "Pair", tiebreakers: [pair, ...values.filter((v) => v !== pair)] };
  }
  return { handRank: "High Card", tiebreakers: values };
}

function compareHandResults(a, b) {
  const diff = HAND_RANKS[a.handRank] - HAND_RANKS[b.handRank];
  if (diff !== 0) return diff;
  for (let i = 0; i < Math.max(a.tiebreakers.length, b.tiebreakers.length); i++) {
    const d = (a.tiebreakers[i] || 0) - (b.tiebreakers[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

function getBestHand(holeCards, communityCards) {
  const all = [...holeCards, ...communityCards];
  if (all.length < 5) return evaluate5CardHand(all.length >= 2 ? all : holeCards);
  const combos = getCombinations(all, 5);
  return combos.reduce((best, combo) => {
    const result = evaluate5CardHand(combo);
    return compareHandResults(result, best) > 0 ? result : best;
  }, evaluate5CardHand(combos[0]));
}

function determineWinner(players, communityCards, pot) {
  const active = players.filter((p) => !p.folded);
  if (active.length === 1) return { winners: [active[0]], winningReason: "All other players folded.", winningAmountEach: pot, isSplit: false };
  if (active.length === 0) return { winners: [players[0]], winningReason: "All players folded.", winningAmountEach: pot, isSplit: false };

  for (const p of active) p.bestHand = getBestHand(p.cards, communityCards);

  let best = active[0];
  for (const p of active.slice(1)) if (compareHandResults(p.bestHand, best.bestHand) > 0) best = p;

  const winners = active.filter((p) => compareHandResults(p.bestHand, best.bestHand) === 0);
  const runnerUp = active.filter((p) => compareHandResults(p.bestHand, best.bestHand) < 0)
    .sort((a, b) => compareHandResults(b.bestHand, a.bestHand))[0];

  const isSplit = winners.length > 1;
  const winningAmountEach = isSplit ? Math.floor(pot / winners.length) : pot;
  const winningReason = isSplit
    ? `Split pot — both have ${best.bestHand.handRank}`
    : runnerUp
      ? `${best.bestHand.handRank} beats ${runnerUp.bestHand.handRank}`
      : `Wins with ${best.bestHand.handRank}`;

  return { winners, winningReason, winningAmountEach, isSplit };
}

// ─── Betting ──────────────────────────────────────────────────────────────────

function normalizeAction(rawText, canCheck) {
  const lower = String(rawText || "").trim().toLowerCase();
  if (lower.includes("fold")) return "fold";
  if (lower.includes("raise")) return "raise";
  if (lower.includes("check") && canCheck) return "check";
  if (lower.includes("call")) return "call";
  return canCheck ? "check" : "call";
}

function sanitizeAction(action, tableState, player) {
  const toCall = Math.max(0, tableState.currentBet - player.stageBet);
  const canCheck = toCall === 0;
  const canCall = toCall > 0 && player.stack >= toCall;
  const canRaise = player.stack >= toCall + RAISE_INCREMENT;
  if (action === "fold") return "fold";
  if (action === "check" && canCheck) return "check";
  if (action === "raise" && canRaise) return "raise";
  if (action === "call" && canCall) return "call";
  if (canCheck) return "check";
  if (canCall) return "call";
  return "fold";
}

function applyBettingAction(player, action, tableState) {
  const toCall = Math.max(0, tableState.currentBet - player.stageBet);

  if (action === "fold") {
    player.folded = true;
    return { action, actionText: "Folded 🃏", betAfterAction: tableState.currentBet, potAfterAction: tableState.pot };
  }
  if (action === "check") {
    return { action, actionText: "Checked ✋", betAfterAction: tableState.currentBet, potAfterAction: tableState.pot };
  }
  if (action === "call") {
    const pay = Math.min(player.stack, toCall);
    player.stack -= pay; player.contribution += pay; player.stageBet += pay; tableState.pot += pay;
    return { action, actionText: `Called ${tableState.currentBet} 📞`, betAfterAction: tableState.currentBet, potAfterAction: tableState.pot };
  }
  // raise
  const newBet = tableState.currentBet + RAISE_INCREMENT;
  const pay = Math.min(player.stack, newBet - player.stageBet);
  player.stack -= pay; player.contribution += pay; player.stageBet += pay;
  tableState.currentBet = player.stageBet; tableState.pot += pay;
  return { action: "raise", actionText: `Raised to ${tableState.currentBet} 📈`, betAfterAction: tableState.currentBet, potAfterAction: tableState.pot };
}

async function getAgentAction(player, tableState, gameLog, stage, communityCards) {
  const toCall = Math.max(0, tableState.currentBet - player.stageBet);
  const canCheck = toCall === 0;
  const availableActions = canCheck ? "check, raise, fold" : "call, raise, fold";
  const communityStr = communityCards.length > 0 ? communityCards.map(cardToPrettyString).join(", ") : "None yet";
  const recentActions = gameLog.slice(-4).map((e) => `${e.agentName}: ${e.action}`).join(", ") || "None";

  const completion = await openai.chat.completions.create({
    model: "llama-3.1-8b-instant",
    temperature: 0.5,
    messages: [
      {
        role: "system",
        content: `You are ${player.name}, a poker AI with personality: ${player.personality}. Play Texas Hold'em strategically.`,
      },
      {
        role: "user",
        content: `Stage: ${stage}
Hole Cards: ${cardToPrettyString(player.cards[0])}, ${cardToPrettyString(player.cards[1])}
Community Cards: ${communityStr}
Current Bet: ${tableState.currentBet} | Your Bet This Stage: ${player.stageBet} | To Call: ${toCall}
Pot: ${tableState.pot} | Your Stack: ${player.stack}
Active Players: ${tableState.players.filter((p) => !p.folded).length}
Recent Actions: ${recentActions}
Available: ${availableActions}

Respond with ONLY one word: ${availableActions.split(", ").join(" or ")}.`,
      },
    ],
  });

  const raw = completion.choices?.[0]?.message?.content?.trim() || "";
  return normalizeAction(raw, canCheck);
}

async function runBettingStage(players, tableState, gameLog, stage, communityCards) {
  const stageLogs = [];
  tableState.currentBet = stage === "Pre-Flop" ? BIG_BLIND : 0;
  for (const p of players) p.stageBet = 0;

  // Post blinds pre-flop
  if (stage === "Pre-Flop" && players.length >= 2) {
    const sb = players[0];
    const bb = players[1];
    const sbPay = Math.min(sb.stack, SMALL_BLIND);
    sb.stack -= sbPay; sb.contribution += sbPay; sb.stageBet = sbPay; tableState.pot += sbPay;
    const sbLog = { agentName: sb.name, action: "blind", actionText: `Posts Small Blind ${SMALL_BLIND} 🔵`, stage, currentBet: BIG_BLIND, potAfterAction: tableState.pot };
    gameLog.push(sbLog); stageLogs.push(sbLog);

    const bbPay = Math.min(bb.stack, BIG_BLIND);
    bb.stack -= bbPay; bb.contribution += bbPay; bb.stageBet = bbPay; tableState.pot += bbPay;
    const bbLog = { agentName: bb.name, action: "blind", actionText: `Posts Big Blind ${BIG_BLIND} 🔴`, stage, currentBet: BIG_BLIND, potAfterAction: tableState.pot };
    gameLog.push(bbLog); stageLogs.push(bbLog);
  }

  // Betting order: after blinds pre-flop, otherwise from index 0
  const startIdx = stage === "Pre-Flop" ? 2 % players.length : 0;
  const ordered = [...players.slice(startIdx), ...players.slice(0, startIdx)];

  // Track who has acted since the last raise
  // We keep looping until all active players have called/checked the current bet
  // Cap at MAX_RAISES total raises per stage to avoid infinite loops
  const MAX_RAISES = 4;
  let raiseCount = 0;
  let lastRaiserIndex = -1; // index in `ordered` of the last player who raised
  let actedSinceLastRaise = new Set(); // player names who acted since last raise

  let i = 0;
  while (i < ordered.length) {
    const player = ordered[i];

    const activePlayers = players.filter((p) => !p.folded);
    if (activePlayers.length <= 1) break;
    if (player.folded || player.stack === 0) { i++; continue; }

    // Skip if this player already matched the current bet AND we haven't raised since they last acted
    const alreadyActed = actedSinceLastRaise.has(player.name);
    const owesNothing = player.stageBet >= tableState.currentBet;
    if (alreadyActed && owesNothing) { i++; continue; }

    const llmAction = await getAgentAction(player, tableState, gameLog, stage, communityCards);
    const action = sanitizeAction(llmAction, tableState, player);
    player.action = action;

    const applied = applyBettingAction(player, action, tableState);
    const logEntry = {
      agentName: player.name, action: applied.action, actionText: applied.actionText,
      stage, currentBet: applied.betAfterAction, potAfterAction: applied.potAfterAction,
    };
    gameLog.push(logEntry); stageLogs.push(logEntry);

    if (action === "raise" && raiseCount < MAX_RAISES) {
      // Someone raised — reset so everyone else must act again
      raiseCount++;
      lastRaiserIndex = i;
      actedSinceLastRaise = new Set([player.name]); // only raiser has acted
      // Restart loop from beginning so others can respond
      i = 0;
      continue;
    }

    actedSinceLastRaise.add(player.name);
    i++;
  }

  return stageLogs;
}

// ─── Route ────────────────────────────────────────────────────────────────────

app.post("/play-poker", async (req, res) => {
  try {
    const { agents } = req.body ?? {};
    if (!Array.isArray(agents) || agents.length === 0) return res.status(400).json({ error: "At least one agent is required." });
    if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: "GROQ_API_KEY is not configured." });

    const basePlayers = agents.map((agent) => ({
      id: agent.id, name: agent.name,
      personality: agent.personality || "Balanced and strategic",
      cards: [], stack: STARTING_STACK, contribution: 0, stageBet: 0,
      action: null, folded: false, bestHand: null,
    }));

    const deck = shuffleDeck(createDeck());
    const { players, remainingDeck } = dealCards(deck, basePlayers);
    const flopCards = remainingDeck.slice(0, 3);
    const turnCard = remainingDeck[3];
    const riverCard = remainingDeck[4];
    const allCommunityCards = [...flopCards, turnCard, riverCard];
    const tableState = { currentBet: BIG_BLIND, pot: 0, players };
    const gameLog = [];

    const preFlopLogs = await runBettingStage(players, tableState, gameLog, "Pre-Flop", []);
    const flopLogs    = await runBettingStage(players, tableState, gameLog, "Flop",     flopCards);
    const turnLogs    = await runBettingStage(players, tableState, gameLog, "Turn",     [...flopCards, turnCard]);
    const riverLogs   = await runBettingStage(players, tableState, gameLog, "River",    allCommunityCards);

    tableState.pot = players.reduce((sum, p) => sum + p.contribution, 0);
    const winnerResult = determineWinner(players, allCommunityCards, tableState.pot);
    const winnerNames = winnerResult.winners.map((w) => w.name);

    return res.json({
      finalPot: tableState.pot,
      currentBet: tableState.currentBet,
      communityCards: allCommunityCards.map(cardToString),
      stageCards: {
        preFlop: [],
        flop: flopCards.map(cardToString),
        turn: [...flopCards, turnCard].map(cardToString),
        river: allCommunityCards.map(cardToString),
      },
      winner: winnerNames.length === 1 ? winnerNames[0] : winnerNames.join(" & "),
      winningReason: winnerResult.winningReason,
      winningAmount: winnerResult.winningAmountEach,
      splitPot: winnerResult.isSplit,
      players: players.map((p) => ({
        name: p.name, cards: p.cards.map(cardToString),
        action: p.action || "fold", contribution: p.contribution,
        handRank: p.bestHand?.handRank || "High Card", folded: p.folded,
      })),
      gameLog,
      stageSummary: [
        { stage: "Pre-Flop", logs: preFlopLogs, communityCards: [] },
        { stage: "Flop",     logs: flopLogs,    communityCards: flopCards.map(cardToString) },
        { stage: "Turn",     logs: turnLogs,    communityCards: [...flopCards, turnCard].map(cardToString) },
        { stage: "River",    logs: riverLogs,   communityCards: allCommunityCards.map(cardToString) },
      ],
    });
  } catch (error) {
    return res.status(error?.status || 500).json({ error: error?.message || "Failed to simulate poker game." });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));