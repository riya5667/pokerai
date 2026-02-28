import { useState } from "react";
import { motion } from "framer-motion";

function AgentForm({ onAddAgent }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [personality, setPersonality] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!name.trim() || !personality.trim()) return;

    onAddAgent({
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description.trim(),
      personality: personality.trim(),
    });

    setName("");
    setDescription("");
    setPersonality("");
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="casino-card p-6"
    >
      <h3 className="mb-4 text-xl font-bold uppercase tracking-wide text-amber-200">Register Agent</h3>

      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block space-y-2.5">
          <span className="text-xs uppercase tracking-[0.18em] text-slate-300">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Strategist Sam"
            className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm outline-none ring-amber-300 placeholder:text-slate-500 focus:ring-2"
          />
        </label>

        <label className="block space-y-2.5">
          <span className="text-xs uppercase tracking-[0.18em] text-slate-300">Description</span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Analyzes trade-offs and long-term impact"
            className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm outline-none ring-amber-300 placeholder:text-slate-500 focus:ring-2"
          />
        </label>

        <label className="block space-y-2.5">
          <span className="text-xs uppercase tracking-[0.18em] text-slate-300">Personality Prompt</span>
          <textarea
            rows={4}
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            placeholder="Calm, concise, and data-driven. Questions weak assumptions."
            className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm outline-none ring-amber-300 placeholder:text-slate-500 focus:ring-2"
          />
          <p className="text-xs text-slate-400">
            This defines how the agent behaves at the poker table.
          </p>
        </label>

        <button
          type="submit"
          className="w-full rounded-full bg-amber-300 px-4 py-3 text-sm font-bold uppercase tracking-wider text-slate-950 transition hover:brightness-110"
        >
          Add Agent
        </button>
      </form>
    </motion.section>
  );
}

export default AgentForm;
