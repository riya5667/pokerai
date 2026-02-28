import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const API_BASE_URL = "http://localhost:5000";

const SUIT_SYMBOL = { S: "\u2660", H: "\u2665", D: "\u2666", C: "\u2663" };

const TABLE_POSITIONS = [
  { top: "11%", left: "50%" },
  { top: "24%", left: "82%" },
  { top: "52%", left: "86%" },
  { top: "80%", left: "74%" },
  { top: "80%", left: "26%" },
  { top: "52%", left: "14%" },
];

const TOTAL_ROUNDS = 3;
const TURN_REVEAL_MS = 900;
const ROUND_BANNER_MS = 1000;
const BETWEEN_ROUND_MS = 700;
const STAGE_BANNER_MS = 800;

const STAGE_COLORS = {
  "Pre-Flop": "text-cyan-200",
  "Flop": "text-emerald-300",
  "Turn": "text-amber-300",
  "River": "text-rose-300",
};

function normalizeResult(raw) {
  const playersRaw = Array.isArray(raw?.players) ? raw.players : [];
  const gameLogRaw = Array.isArray(raw?.gameLog) ? raw.gameLog : [];
  const stageSummaryRaw = Array.isArray(raw?.stageSummary) ? raw.stageSummary : [];

  const winnerName =
    typeof raw?.winner === "string" ? raw.winner
    : typeof raw?.winner?.name === "string" ? raw.winner.name
    : "Unknown";

  const players = playersRaw.map((p, idx) => ({
    name: p?.name || `Player ${idx + 1}`,
    cards: Array.isArray(p?.cards) ? p.cards : [],
    action: p?.action || "call",
    contribution: Number.isFinite(p?.contribution) ? p.contribution : 0,
    folded: Boolean(p?.folded),
    handRank: p?.handRank || "High Card",
  }));

  const gameLog = gameLogRaw.map((item, idx) => ({
    agentName: item?.agentName || `Player ${idx + 1}`,
    actionText: item?.actionText || "Acted",
    stage: item?.stage || "Pre-Flop",
    potAfterAction: Number.isFinite(item?.potAfterAction) ? item.potAfterAction : 0,
  }));

  return {
    winner: winnerName,
    finalPot: Number.isFinite(raw?.finalPot) ? raw.finalPot : 0,
    communityCards: Array.isArray(raw?.communityCards) ? raw.communityCards : [],
    stageCards: raw?.stageCards || {},
    winningReason: raw?.winningReason || "",
    players,
    gameLog,
    stageSummary: stageSummaryRaw,
  };
}

function formatCard(card) {
  const suit = card.slice(-1);
  const rank = card.slice(0, -1);
  return { rank, suit, symbol: SUIT_SYMBOL[suit] || suit };
}

function getInitials(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatAction(action) {
  return String(action || "call").charAt(0).toUpperCase() + String(action || "call").slice(1);
}

function cardTiltSeed(value = "") {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = value.charCodeAt(i) + ((hash << 5) - hash);
  return ((hash % 9) - 4) * 0.9;
}

function PlayingCard({ value, delay = 0, mini = false, hidden = false }) {
  if (!value || hidden) {
    return (
      <motion.div
        initial={{ rotateY: 92, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ duration: 0.32, delay }}
        style={{ transformStyle: "preserve-3d" }}
        className={`${mini ? "h-10 w-7" : "h-[98px] w-[70px]"} poker-card-back flex items-center justify-center rounded-md border border-amber-100/20`}
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-100/70">AI</span>
      </motion.div>
    );
  }
  const { rank, suit, symbol } = formatCard(value);
  const isRed = suit === "H" || suit === "D";
  const tilt = cardTiltSeed(value);
  return (
    <motion.div
      initial={{ rotateY: 95, opacity: 0, y: -8 }}
      animate={{ rotateY: tilt, opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.34, delay }}
      style={{ transformStyle: "preserve-3d" }}
      className={`${mini ? "h-10 w-7 text-[10px]" : "h-[98px] w-[70px] text-[2rem]"} poker-real-card flex items-center justify-center rounded-md border border-slate-300/30 bg-[#f7f5ef] font-extrabold`}
    >
      <span className={isRed ? "text-red-600" : "text-neutral-900"}>{rank}{symbol}</span>
    </motion.div>
  );
}

function ChipStack({ className = "" }) {
  return <div className={`chip-stack ${className}`}><span /><span /><span /></div>;
}

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

function Poker({ agents }) {
  const [result, setResult] = useState(null);
  const [displayedLog, setDisplayedLog] = useState([]);
  const [currentStage, setCurrentStage] = useState("");
  const [visibleCommunityCards, setVisibleCommunityCards] = useState([]);
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [roundNumber, setRoundNumber] = useState(0);
  const [roundSummaries, setRoundSummaries] = useState([]);
  const [roundBanner, setRoundBanner] = useState("");
  const [showRoundBanner, setShowRoundBanner] = useState(false);
  const [overallWinner, setOverallWinner] = useState("");
  const [livePot, setLivePot] = useState(0);
  const runIdRef = useRef(0);

  const canStart = useMemo(
    () => agents.length > 0 && phase !== "dealing" && phase !== "revealing" && phase !== "round-break",
    [agents.length, phase]
  );

  useEffect(() => () => { runIdRef.current = -1; }, []);

  const showBanner = async (text, runId) => {
    if (runId !== runIdRef.current) return;
    setRoundBanner(text);
    setShowRoundBanner(true);
    setPhase("round-break");
    await wait(ROUND_BANNER_MS);
    if (runId !== runIdRef.current) return;
    setShowRoundBanner(false);
  };

  const revealRound = async (normalized, runId) => {
    if (runId !== runIdRef.current) return;
    setResult(normalized);
    setDisplayedLog([]);
    setVisibleCommunityCards([]);
    setCurrentStage("Pre-Flop");
    setLivePot(0);
    setPhase("revealing");

    for (const stageData of normalized.stageSummary) {
      if (runId !== runIdRef.current) return;
      setCurrentStage(stageData.stage);
      setRoundBanner(stageData.stage);
      setShowRoundBanner(true);
      await wait(STAGE_BANNER_MS);
      if (runId !== runIdRef.current) return;
      setShowRoundBanner(false);

      if (stageData.communityCards?.length > 0) {
        setVisibleCommunityCards(stageData.communityCards);
        await wait(500);
      }

      for (const entry of stageData.logs) {
        if (runId !== runIdRef.current) return;
        await wait(TURN_REVEAL_MS);
        setDisplayedLog((cur) => [...cur, entry]);
        setLivePot(entry.potAfterAction);
      }
      await wait(400);
    }
    setVisibleCommunityCards(normalized.communityCards);
    setLivePot(normalized.finalPot);
  };

  const computeOverallWinner = (winsMap) => {
    const entries = Object.entries(winsMap);
    if (!entries.length) return "";
    const top = Math.max(...entries.map(([, w]) => w));
    return entries.filter(([, w]) => w === top).map(([n]) => n).sort().join(" & ");
  };

  const handleStartPoker = async () => {
    runIdRef.current += 1;
    const runId = runIdRef.current;
    setError(""); setResult(null); setDisplayedLog([]); setVisibleCommunityCards([]);
    setCurrentStage(""); setRoundNumber(0); setRoundSummaries([]); setOverallWinner("");
    setLivePot(0); setPhase("dealing");

    try {
      const winsMap = {};
      const summaries = [];

      for (let round = 1; round <= TOTAL_ROUNDS; round++) {
        if (runId !== runIdRef.current) return;
        setRoundNumber(round);
        await showBanner(`Round ${round}`, runId);
        if (runId !== runIdRef.current) return;
        setPhase("dealing");

        const response = await fetch(`${API_BASE_URL}/play-poker`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agents: agents.map(({ id, name, personality }) => ({ id, name, personality })) }),
        });

        const rawBody = await response.text();
        const ct = response.headers.get("content-type") || "";
        const data = ct.includes("application/json") ? JSON.parse(rawBody || "{}") : { error: rawBody };
        if (!response.ok) throw new Error(data.error || `API failed (${response.status})`);

        const normalized = normalizeResult(data);
        await revealRound(normalized, runId);
        if (runId !== runIdRef.current) return;

        String(normalized.winner || "").split("&").map((n) => n.trim()).filter(Boolean)
          .forEach((name) => { winsMap[name] = (winsMap[name] || 0) + 1; });

        summaries.push({ round, winner: normalized.winner, finalPot: normalized.finalPot, winningReason: normalized.winningReason });
        setRoundSummaries([...summaries]);

        if (round < TOTAL_ROUNDS) {
          await showBanner(`Round ${round} Complete`, runId);
          if (runId !== runIdRef.current) return;
          await wait(BETWEEN_ROUND_MS);
        }
      }

      const finalWinner = computeOverallWinner(winsMap);
      setOverallWinner(finalWinner);
      await showBanner(`Final Winner: ${finalWinner || summaries[summaries.length - 1]?.winner || "Unknown"}`, runId);
      if (runId !== runIdRef.current) return;
      setPhase("done");
    } catch (err) {
      setError(err.message || "Unexpected error.");
      setPhase("idle");
    }
  };

  const players = result?.players || [];
  const currentTurn = phase === "revealing" && result?.gameLog?.[displayedLog.length]
    ? result.gameLog[displayedLog.length].agentName : "";
  const allCommunityCards = result?.communityCards?.slice(0, 5) || [];
  const winnerLabel = overallWinner || result?.winner || "";
  const winnerSet = new Set(String(winnerLabel).split("&").map((n) => n.trim()).filter(Boolean));
  const allCardsRevealed = allCommunityCards.length === 0 || visibleCommunityCards.length >= allCommunityCards.length;
  const allActionsRevealed = displayedLog.length >= (result?.gameLog?.length ?? 0);
  const canAnnounceWinner = phase === "done" && allCardsRevealed && allActionsRevealed && Boolean(winnerLabel);

  const stagePlayers = useMemo(() => {
    const source = players.length > 0 ? players : agents;
    return source.slice(0, 6).map((player, index) => {
      const live = players[index];
      return live || { name: player.name, cards: [], action: "waiting", contribution: 0, folded: false };
    });
  }, [players, agents]);

  const lastActor = displayedLog[displayedLog.length - 1]?.agentName;
  const lastActorIndex = stagePlayers.findIndex((p) => p?.name === lastActor);
  const flyFromPos = lastActorIndex >= 0 ? TABLE_POSITIONS[lastActorIndex] : null;

  const logByStage = displayedLog.reduce((acc, entry) => {
    const s = entry.stage || "Pre-Flop";
    if (!acc[s]) acc[s] = [];
    acc[s].push(entry);
    return acc;
  }, {});

  return (
    <div className="w-full space-y-4">
      {/* Status bar */}
      <div className="casino-card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Round Status</p>
          <p className="text-sm text-slate-100">
            {phase === "dealing" ? `Simulating round ${roundNumber || 1}...`
              : phase === "revealing" ? (
                <span>Round {roundNumber} — <span className={STAGE_COLORS[currentStage] || "text-cyan-200"}>{currentStage}</span>{currentTurn ? ` — Turn: ${currentTurn}` : ""}</span>
              ) : phase === "round-break" ? roundBanner || "Preparing..."
              : phase === "done" ? "3-round match completed"
              : "Waiting to start"}
          </p>
        </div>
        <button
          type="button"
          disabled={!canStart}
          onClick={handleStartPoker}
          className="rounded-full bg-emerald-300 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-emerald-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
        >
          {phase === "dealing" || phase === "revealing" ? "Game Running..." : "Start Poker Game"}
        </button>
      </div>

      {/* Stage progress bar */}
      {(phase === "revealing" || phase === "done") && (
        <div className="casino-card flex items-center justify-between gap-2 px-4 py-3">
          {["Pre-Flop", "Flop", "Turn", "River"].map((stage, idx) => {
            const order = ["Pre-Flop", "Flop", "Turn", "River"];
            const curIdx = order.indexOf(currentStage);
            const isDone = idx < curIdx || phase === "done";
            const isActive = stage === currentStage && phase === "revealing";
            return (
              <div key={stage} className="flex flex-1 flex-col items-center gap-1">
                <div className={`h-1.5 w-full rounded-full transition-all duration-500 ${isDone ? "bg-emerald-400" : isActive ? "bg-cyan-300" : "bg-slate-700"}`} />
                <p className={`text-[10px] font-semibold uppercase tracking-wider ${isActive ? STAGE_COLORS[stage] : isDone ? "text-emerald-400" : "text-slate-500"}`}>
                  {stage}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {error && <div className="rounded-xl border border-red-600/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">{error}</div>}
      {agents.length === 0 && <div className="rounded-xl border border-amber-300/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">Add agents first to start a game.</div>}

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* Table arena */}
        <section
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setParallax({ x: ((e.clientX - rect.left) / rect.width - 0.5) * 10, y: ((e.clientY - rect.top) / rect.height - 0.5) * 8 });
          }}
          onMouseLeave={() => setParallax({ x: 0, y: 0 })}
          className={`table-cinematic poker-arena-shell casino-card relative min-h-[650px] overflow-hidden p-4 md:p-6 ${canAnnounceWinner ? "winner-zoom" : ""}`}
        >
          <div className="table-spotlight table-spotlight-warm left-[-10%] top-[-22%]" />
          <div className="table-spotlight table-spotlight-cool right-[-8%] top-[-18%]" />
          <div className="arena-depth-blur" />
          <div className="table-vignette" />
          <ChipStack className="left-12 top-[74%] z-[3]" />
          <ChipStack className="right-12 top-[73%] z-[3]" />

          {canAnnounceWinner && (
            <div className="winner-cinematic absolute inset-0 z-20 pointer-events-none">
              <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.45 }}
                className="winner-lightburst absolute left-1/2 top-[47%] h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2" />
              <motion.div initial={{ y: -18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }}
                className="winner-banner absolute left-1/2 top-7 -translate-x-1/2 rounded-full border border-amber-200/70 bg-amber-300/15 px-6 py-2 text-center backdrop-blur">
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-100">Match Winner</p>
                <p className="text-sm font-black uppercase tracking-wide text-white">{winnerLabel}</p>
              </motion.div>
            </div>
          )}

          <AnimatePresence>
            {showRoundBanner && (
              <motion.div key={roundBanner}
                initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 1.03, y: -6 }}
                transition={{ duration: 0.3 }}
                className="round-banner absolute left-1/2 top-6 z-30 -translate-x-1/2 rounded-full px-5 py-2 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/90">Tournament Update</p>
                <p className="text-sm font-black uppercase tracking-wide text-white">{roundBanner}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div
            className="relative mx-auto mt-2 h-[610px] w-full max-w-[980px] transition-transform duration-300"
            style={{ transform: `translate3d(${parallax.x * 0.4}px, ${parallax.y * 0.4}px, 0)` }}
          >
            <div className="poker-table-shell absolute left-1/2 top-[52%] h-[420px] w-[96%] max-w-[860px] -translate-x-1/2 -translate-y-1/2 rounded-[44%] sm:h-[470px]">
              <div className="poker-table-rail absolute inset-0 rounded-[inherit]" />
              <div className="poker-table-felt absolute inset-[18px] rounded-[43%]" />

              {/* Stage label */}
              {currentStage && phase === "revealing" && (
                <div className="absolute left-1/2 top-[16%] z-10 -translate-x-1/2 rounded-full border border-white/10 bg-black/50 px-3 py-1 backdrop-blur">
                  <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${STAGE_COLORS[currentStage] || "text-cyan-200"}`}>{currentStage}</p>
                </div>
              )}

              {/* POT — moved above community cards, no overlap */}
              <div className="absolute left-1/2 top-[34%] z-10 -translate-x-1/2 rounded-full border border-amber-300/30 bg-black/60 px-4 py-1.5 backdrop-blur">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-100 text-center">Pot</p>
                <motion.p key={livePot} initial={{ opacity: 0.6, y: 2 }} animate={{ opacity: 1, y: 0 }} className="text-xl font-extrabold text-amber-200 text-center">
                  {livePot}
                </motion.p>
              </div>

              <div className={`table-energy-ring absolute left-1/2 top-1/2 h-[132px] w-[132px] -translate-x-1/2 -translate-y-1/2 rounded-full border-4 ${phase === "revealing" ? "is-active" : ""}`} />

              {/* Community cards — centered, no pot overlap */}
              <div className="absolute left-1/2 top-[54%] flex -translate-x-1/2 -translate-y-1/2 items-center gap-2">
                {[0, 1, 2, 3, 4].map((idx) => {
                  const card = allCommunityCards[idx];
                  const isRevealed = idx < visibleCommunityCards.length;
                  return (
                    <div key={`board-wrap-${idx}`} className="board-card-wrap">
                      <PlayingCard key={`board-${idx}-${isRevealed}`} value={card} hidden={!isRevealed} delay={0.06 * idx} />
                    </div>
                  );
                })}
              </div>
            </div>

            <AnimatePresence>
              {flyFromPos && phase === "revealing" && (
                <motion.div
                  key={`bet-fly-${displayedLog.length}`}
                  initial={{ top: flyFromPos.top, left: flyFromPos.left, scale: 0.9, opacity: 0.95 }}
                  animate={{ top: "52%", left: "50%", scale: 0.52, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.46, ease: "easeInOut" }}
                  className="chip-flight-token absolute z-10 h-6 w-6 rounded-full"
                />
              )}
            </AnimatePresence>

            {stagePlayers.map((player, index) => {
              const pos = TABLE_POSITIONS[index];
              if (!pos) return null;
              const isWinner = canAnnounceWinner && winnerSet.has(player.name);
              const isCurrent = currentTurn === player.name;
              const isReal = Boolean(players[index]);
              return (
                <motion.div
                  key={`${player.name}-${index}`}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: isWinner ? 1.07 : isCurrent ? 1.05 : 1 }}
                  transition={{ delay: 0.05 * index }}
                  style={{ top: pos.top, left: pos.left, transform: "translate(-50%, -50%)" }}
                  className={`seat-shell absolute w-[124px] rounded-2xl border px-3 py-2 text-center backdrop-blur sm:w-[138px] lg:w-[150px] ${
                    canAnnounceWinner && winnerSet.has(player.name) ? "seat-winner border-amber-200/75 bg-amber-300/18"
                    : isCurrent ? "seat-current border-cyan-300/70 bg-cyan-300/14 ai-seat-pulse"
                    : player.folded ? "border-red-500/30 bg-red-950/30 opacity-60"
                    : "seat-idle border-white/15 bg-black/35"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className={`seat-avatar-ring ai-seat-frame flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white ${isCurrent ? "is-current" : ""}`}>
                      {getInitials(player.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold uppercase tracking-wide text-white">{player.name}</p>
                      <p className={`text-[10px] ${player.folded ? "text-red-400" : "text-amber-100/85"}`}>
                        {isReal ? (player.folded ? "Folded" : formatAction(player.action)) : "Waiting"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-center gap-1">
                    <PlayingCard value={player.cards?.[0]} mini hidden={!isReal || player.folded} />
                    <PlayingCard value={player.cards?.[1]} mini hidden={!isReal || player.folded} />
                  </div>
                  {isReal && (
                    <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-cyan-100/90">
                      {player.folded ? "" : player.handRank}
                    </p>
                  )}
                  <motion.p
                    key={`${player.name}-${player.contribution}`}
                    initial={{ opacity: 0.5, y: 2 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-100/90"
                  >
                    Chips: {player.contribution ?? 0}
                  </motion.p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Sidebar */}
        <aside className="space-y-4">
          <section className="panel-frost casino-card p-4">
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Table Controls</h4>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <button className="ui-btn ui-btn-fold ui-btn-glass rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-wide">Fold</button>
              <button className="ui-btn ui-btn-call ui-btn-glass rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-wide">Call</button>
              <button className="ui-btn ui-btn-raise ui-btn-glass rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-wide">Raise</button>
            </div>
          </section>

          {canAnnounceWinner && (
            <section className="panel-frost casino-card p-4">
              <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Result</h4>
              <p className="winner-text-glow mt-2 text-sm font-semibold text-amber-200">Winner: {winnerLabel}</p>
              <p className="mt-1 text-xs text-slate-300">Final Pot: {result.finalPot}</p>
              {result.winningReason && <p className="mt-2 text-xs leading-relaxed text-slate-300">Reason: {result.winningReason}</p>}
              {/* Show final hand ranks */}
              <div className="mt-3 space-y-1">
                {result.players.filter((p) => !p.folded).map((p) => (
                  <div key={p.name} className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-300">{p.name}</span>
                    <span className={`font-semibold ${winnerSet.has(p.name) ? "text-amber-300" : "text-slate-400"}`}>{p.handRank}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {roundSummaries.length > 0 && (
            <section className="panel-frost casino-card p-4">
              <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Round Results</h4>
              <div className="mt-3 space-y-2">
                {roundSummaries.map((item) => (
                  <div key={`round-summary-${item.round}`} className="rounded-xl border border-white/10 bg-black/25 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100">Round {item.round}</p>
                    <p className="text-xs text-slate-200">Winner: {item.winner}</p>
                    <p className="text-[11px] text-slate-400">Pot: {item.finalPot}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Action feed grouped by stage */}
          <section className="panel-frost casino-card p-4">
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Action Feed</h4>
            <div className="mt-3 max-h-[320px] space-y-3 overflow-auto pr-1">
              <AnimatePresence>
                {Object.entries(logByStage).map(([stage, entries]) => (
                  <div key={stage}>
                    <p className={`mb-1 text-[10px] font-bold uppercase tracking-[0.2em] ${STAGE_COLORS[stage] || "text-cyan-200"}`}>— {stage} —</p>
                    {entries.map((item, index) => (
                      <motion.div
                        key={`${item.agentName}-${stage}-${index}`}
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.24 }}
                        className={`action-line mb-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 ${index === entries.length - 1 && stage === currentStage ? "is-new" : ""}`}
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-100">{item.agentName}</p>
                        <p className="text-xs text-slate-300">{item.actionText}</p>
                      </motion.div>
                    ))}
                  </div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default Poker;