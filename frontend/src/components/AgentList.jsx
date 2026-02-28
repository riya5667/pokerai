import { AnimatePresence, motion } from "framer-motion";

function getInitials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getAvatarStyle(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;

  return {
    background: `linear-gradient(140deg, hsl(${hue} 70% 55%), hsl(${(hue + 60) % 360} 78% 48%))`,
  };
}

function AgentList({ agents }) {
  return (
    <section className="casino-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-xl font-bold uppercase tracking-wide text-white">Registered Agents</h3>
        <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-sm text-slate-100">
          {agents.length}
        </span>
      </div>

      {agents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/25 bg-black/20 p-5 text-sm text-slate-400">
          No agents yet. Add at least one agent to open the table.
        </div>
      ) : (
        <ul className="space-y-3.5">
          <AnimatePresence>
            {agents.map((agent, index) => (
              <motion.li
                key={agent.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.04 }}
                className="rounded-xl border border-white/15 bg-slate-950/45 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-amber-200/50 hover:shadow-[0_10px_35px_rgba(0,0,0,0.35)]"
              >
                <div className="flex items-start gap-3">
                  <div
                    style={getAvatarStyle(agent.name)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-lg"
                  >
                    {getInitials(agent.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-amber-200">{agent.name}</p>
                    <p className="mt-1 text-sm text-slate-300">{agent.description || "No description"}</p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">
                      Personality: {agent.personality}
                    </p>
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}

export default AgentList;
