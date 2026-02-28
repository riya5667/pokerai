import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import AgentForm from "./components/AgentForm";
import AgentList from "./components/AgentList";
import Poker from "./components/Poker";

const navClassName = ({ isActive }) =>
  `rounded-full border px-3 py-1.5 text-sm transition-all duration-300 ${
    isActive
      ? "border-cyan-300 bg-cyan-300/10 text-cyan-100 shadow-[0_0_18px_rgba(56,189,248,0.4)]"
      : "border-white/15 text-slate-200 hover:border-cyan-300/80 hover:text-cyan-100"
  }`;

const features = [
  {
    title: "AI vs AI Simulation Engine",
    text: "Run autonomous high-stakes poker rounds with multi-agent decision dynamics.",
  },
  {
    title: "Real-Time Strategic Learning",
    text: "Watch adaptation patterns emerge from live betting, bluffing, and risk logic.",
  },
  {
    title: "Agent Customization & Training",
    text: "Design agent personas, tune strategies, and evolve behavior over time.",
  },
  {
    title: "Performance Analytics Dashboard",
    text: "Track win rates, aggression metrics, and decision quality at every table stage.",
  },
];

const timeline = [
  {
    step: "01",
    title: "Initialize Minds",
    text: "Define goals, temperament, and risk appetite for each autonomous poker agent.",
  },
  {
    step: "02",
    title: "Simulate Evolution",
    text: "Agents adapt to pressure, reads, and pot dynamics during every decision cycle.",
  },
  {
    step: "03",
    title: "Extract Intelligence",
    text: "Capture complete action traces for strategy tuning and meta-learning loops.",
  },
];

const archetypes = [
  { name: "Quantum Bluffer", style: "High-volatility deception patterns", glow: "from-cyan-400/40 to-violet-400/30" },
  { name: "Cold Solver", style: "Game-theory pressure with precise bet sizing", glow: "from-emerald-400/35 to-cyan-400/25" },
  { name: "Predator Sentinel", style: "Patient trap architecture and late-round strikes", glow: "from-amber-300/35 to-rose-400/25" },
];

const heroCoins = [
  { top: "10%", left: "10%", size: "h-6 w-6", delay: 0.1, duration: 4.8 },
  { top: "18%", left: "40%", size: "h-8 w-8", delay: 0.4, duration: 5.6 },
  { top: "12%", left: "72%", size: "h-7 w-7", delay: 0.2, duration: 5.2 },
  { top: "34%", left: "86%", size: "h-9 w-9", delay: 0.6, duration: 6.2 },
  { top: "66%", left: "8%", size: "h-8 w-8", delay: 0.3, duration: 5.4 },
  { top: "74%", left: "52%", size: "h-6 w-6", delay: 0.5, duration: 4.9 },
  { top: "82%", left: "90%", size: "h-7 w-7", delay: 0.8, duration: 6.1 },
];

function LandingPage({ agentCount }) {
  const navigate = useNavigate();

  return (
    <section className="space-y-8 pb-8">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="promo-hero relative overflow-hidden rounded-[20px] border border-emerald-200/20 p-5 md:p-7"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(110,231,183,0.08),transparent_35%),linear-gradient(145deg,#0d4b4e_0%,#113b55_42%,#202747_100%)]" />
        {heroCoins.map((coin, index) => (
          <motion.span
            key={`hero-coin-${index}`}
            animate={{ y: [0, -8, 0], rotate: [0, 180, 360] }}
            transition={{
              repeat: Infinity,
              duration: coin.duration,
              delay: coin.delay,
              ease: "easeInOut",
            }}
            style={{ top: coin.top, left: coin.left }}
            className={`pointer-events-none absolute ${coin.size} rounded-full border border-amber-100/45 bg-gradient-to-br from-amber-200 via-yellow-300 to-amber-500 shadow-[0_0_18px_rgba(251,191,36,0.4)]`}
          />
        ))}
        <div className="relative z-10">
          <div className="grid items-center gap-8 md:grid-cols-[1fr_1.1fr]">
            <div className="max-w-md space-y-5">
              <h2 className="text-4xl font-black leading-[1.05] text-amber-300 md:text-5xl">
                Take a gamble and win big at our casino night!
              </h2>
              <p className="text-lg font-semibold text-amber-100">
                Sunday, 23 June 2023 <span className="px-2 text-amber-300">|</span> Start at 7 PM
              </p>
              <p className="text-sm text-slate-200/90">
                Massa tempor nec feugiat nisl pretium fusce id velit ut tortor pretium viverra
                suspendisse purus potenti faucibus.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => navigate("/agents")}
                  className="rounded-full bg-gradient-to-r from-orange-300 to-rose-300 px-6 py-2.5 text-sm font-bold text-slate-900 transition hover:brightness-110"
                >
                  Register Now
                </button>
              </div>
            </div>

            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 5.5, ease: "easeInOut" }}
              className="relative"
            >
              <img src="/67.png" alt="casino cards and chips" className="w-full max-w-[520px] drop-shadow-[0_22px_30px_rgba(2,6,23,0.55)]" />
            </motion.div>
          </div>
        </div>
      </motion.section>

      <section className="casino-card overflow-hidden py-3">
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
          className="flex w-[200%] gap-8 px-6 text-xs font-semibold uppercase tracking-[0.26em] text-cyan-100"
        >
          {Array.from({ length: 16 }).map((_, index) => (
            <span key={`ticker-${index}`} className="shrink-0">
              Neural Stakes • Quantum Bluff Engine • Autonomous Table Intelligence •
            </span>
          ))}
        </motion.div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {features.map((item, index) => (
          <motion.article
            key={item.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: index * 0.08 }}
            className="casino-card border-cyan-300/20 p-5 hover:shadow-[0_0_26px_rgba(34,211,238,0.2)]"
          >
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Feature {index + 1}</p>
            <h3 className="mt-2 text-xl font-bold text-white">{item.title}</h3>
            <p className="mt-2 text-sm text-slate-300">{item.text}</p>
          </motion.article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <motion.article
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          className="casino-card p-6"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-violet-100">Evolution Sequence</p>
          <h3 className="mt-2 text-2xl font-black text-white md:text-3xl">Neural Decision Pipeline</h3>
          <div className="mt-5 space-y-4">
            {timeline.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="rounded-xl border border-cyan-300/20 bg-black/20 p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
                  Stage {item.step}
                </p>
                <p className="mt-1 text-lg font-bold text-white">{item.title}</p>
                <p className="mt-1 text-sm text-slate-300">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          className="casino-card overflow-hidden p-6"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.2),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(167,139,250,0.18),transparent_45%)]" />
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-100">Live Stats</p>
            <h3 className="mt-2 text-2xl font-black text-white">Strategic Throughput</h3>
            <div className="mt-5 space-y-4">
              {[
                { label: "Decision Tick Rate", value: "2400/s", width: "w-[88%]" },
                { label: "Adaptive Weight Updates", value: "1.7M", width: "w-[72%]" },
                { label: "Bluff Signal Confidence", value: "93%", width: "w-[93%]" },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex items-center justify-between text-xs uppercase tracking-wider text-slate-300">
                    <span>{row.label}</span>
                    <span>{row.value}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-900/80">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: "100%" }}
                      viewport={{ once: true }}
                      className={`${row.width} h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-violet-300`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.article>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {archetypes.map((item, index) => (
          <motion.article
            key={item.name}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: index * 0.1 }}
            className="casino-card group overflow-hidden p-5"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${item.glow} opacity-0 transition duration-300 group-hover:opacity-100`} />
            <div className="relative">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Archetype</p>
              <h3 className="mt-2 text-2xl font-black text-white">{item.name}</h3>
              <p className="mt-2 text-sm text-slate-200">{item.style}</p>
            </div>
          </motion.article>
        ))}
      </section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        className="casino-card overflow-hidden border-cyan-300/25 p-6 md:p-7"
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(34,211,238,0.1),transparent_35%,rgba(168,85,247,0.12))]" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-violet-100">Live Neural Arena</p>
            <p className="mt-2 text-2xl font-black text-white md:text-3xl">
              {agentCount} Active AI Minds Ready To Play
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Train agents, launch rounds, and monitor strategic evolution in real time.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(agentCount > 0 ? "/play" : "/agents")}
            className="home-cta-secondary rounded-full px-6 py-3 text-sm font-bold uppercase tracking-[0.12em] text-cyan-100"
          >
            {agentCount > 0 ? "Open Table" : "Create Agents"}
          </button>
        </div>
      </motion.section>
    </section>
  );
}

function AgentsPage({ agents, addAgent }) {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Agent Control</p>
        <h2 className="mt-2 text-3xl font-black text-white md:text-4xl">Register AI Players</h2>
        <p className="mt-2 text-sm text-slate-300">
          Define personalities and stack your table before the game begins.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
        <AgentForm onAddAgent={addAgent} />
        <AgentList agents={agents} />
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-cyan-300/15 bg-black/30 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-100">Pokerverse</p>
          <p className="text-xs text-slate-400">Cybernetic Multi-Agent Poker Intelligence</p>
        </div>
        <div className="flex items-center gap-4 text-xs uppercase tracking-wider text-slate-400">
          <span>Home</span>
          <span>Agents</span>
          <span>Play</span>
        </div>
      </div>
    </footer>
  );
}

function App() {
  const [agents, setAgents] = useState([]);

  const addAgent = (agent) => {
    setAgents((current) => [...current, agent]);
  };
  const agentCount = useMemo(() => agents.length, [agents.length]);

  return (
    <div className="min-h-screen bg-transparent text-slate-100">
      <header className="sticky top-0 z-40 border-b border-cyan-300/15 bg-black/35 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-black uppercase tracking-[0.16em] text-cyan-100">Pokerverse</h1>
            <p className="text-xs text-slate-400">AI Multi-Agent Poker Arena</p>
          </div>
          <nav className="flex items-center gap-2">
            <NavLink to="/" className={navClassName} end>
              Home
            </NavLink>
            <NavLink to="/agents" className={navClassName}>
              Agents
            </NavLink>
            <NavLink to="/play" className={navClassName}>
              Play Table
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <Routes>
          <Route path="/" element={<LandingPage agentCount={agentCount} />} />
          <Route path="/agents" element={<AgentsPage agents={agents} addAgent={addAgent} />} />
          <Route
            path="/play"
            element={
              <section className="space-y-5">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Game Arena</p>
                    <h2 className="mt-2 text-3xl font-black text-white md:text-4xl">
                      Casino Table Simulation
                    </h2>
                    <p className="mt-2 text-sm text-slate-300">
                      Start a round and inspect every move in the action feed.
                    </p>
                  </div>
                  <div className="casino-card px-4 py-3 text-right">
                    <p className="text-xs uppercase tracking-widest text-slate-400">Active Players</p>
                    <p className="text-2xl font-bold text-white">{agentCount}</p>
                  </div>
                </div>
                <Poker agents={agents} />
              </section>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <SiteFooter />
    </div>
  );
}

export default App;
