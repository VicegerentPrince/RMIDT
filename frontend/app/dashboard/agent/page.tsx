"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Zap, ChevronDown, Clock, AlertCircle, Loader2, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import toast, { Toaster } from "react-hot-toast";

const PRESET_TASKS = [
  "Analyze the current global macro regime and recommend one trade with the highest conviction.",
  "Is Pakistan's economy in crisis? What historical periods does it resemble most?",
  "Compare the US and EU macro regimes. Which has the better risk/reward for equities?",
  "Identify the top 3 systemic risks right now and rank them by probability.",
  "What does the yield curve signal for the next 12 months across tracked economies?",
];

interface ToolStep {
  thought: string;
  tool: string | null;
  observation: string | null;
}

interface AgentAnswer {
  verdict?: string;
  key_insight?: string;
  recommendation?: string;
  confidence?: number;
  economies_analyzed?: string[];
  risk_factors?: string[];
}

interface AgentResult {
  tool_trace: ToolStep[];
  answer: AgentAnswer;
  task: string;
  model_version: string;
  elapsed_ms: number;
  generated_at: string;
}

function ToolStepCard({ step, index, total }: { step: ToolStep; index: number; total: number }) {
  const [open, setOpen] = useState(index === 0);

  return (
    <div className="relative">
      {/* Connector line */}
      {index < total - 1 && (
        <div className="absolute left-[18px] top-10 bottom-0 w-0.5 bg-gradient-to-b from-blue-500/30 to-transparent" />
      )}

      <div className="flex gap-3">
        {/* Step badge */}
        <div className="w-9 h-9 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center flex-shrink-0 z-10">
          <span className="text-xs font-bold text-blue-300">{index + 1}</span>
        </div>

        <div className="flex-1 pb-4">
          {/* Thought */}
          <div className="text-xs text-gray-400 italic mb-2 leading-relaxed">
            💭 {step.thought}
          </div>

          {step.tool && (
            <button
              onClick={() => setOpen(v => !v)}
              className="w-full glass rounded-xl overflow-hidden hover:bg-white/3 transition-colors text-left"
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <Cpu className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <code className="text-xs text-emerald-300 font-mono flex-1">{step.tool}</code>
                <ChevronDown className={cn("w-3.5 h-3.5 text-gray-500 transition-transform", open && "rotate-180")} />
              </div>

              <AnimatePresence>
                {open && step.observation && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-white/5 px-4 py-3 text-xs text-gray-400 leading-relaxed bg-white/2">
                      <span className="text-gray-600 font-semibold uppercase tracking-wide text-[10px]">Observation </span>
                      {step.observation}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AnswerCard({ answer, elapsed_ms }: { answer: AgentAnswer; elapsed_ms: number }) {
  const conf = answer.confidence ?? 0;
  const color = conf >= 0.7 ? "text-emerald-400" : conf >= 0.4 ? "text-amber-400" : "text-red-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="glass rounded-2xl p-6 space-y-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-white">Agent Conclusion</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className={cn("font-mono font-bold", color)}>
            {Math.round(conf * 100)}% confidence
          </span>
          <span className="text-gray-600 font-mono">{elapsed_ms}ms</span>
        </div>
      </div>

      {answer.verdict && (
        <div className="bg-blue-500/8 border border-blue-500/20 rounded-xl p-4">
          <div className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider mb-1">Verdict</div>
          <p className="text-sm text-white leading-relaxed">{answer.verdict}</p>
        </div>
      )}

      {answer.key_insight && (
        <div>
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Key Insight</div>
          <p className="text-sm text-gray-300 leading-relaxed">{answer.key_insight}</p>
        </div>
      )}

      {answer.recommendation && (
        <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-4">
          <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-1">Recommendation</div>
          <p className="text-sm text-gray-200 leading-relaxed">{answer.recommendation}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {answer.economies_analyzed && answer.economies_analyzed.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Economies Analyzed</div>
            <div className="flex flex-wrap gap-1.5">
              {answer.economies_analyzed.map((e, i) => (
                <span key={i} className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300">{e}</span>
              ))}
            </div>
          </div>
        )}

        {answer.risk_factors && answer.risk_factors.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Risk Factors</div>
            <ul className="space-y-1">
              {answer.risk_factors.map((r, i) => (
                <li key={i} className="flex gap-2 text-xs text-gray-400">
                  <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function AgentPage() {
  const [task, setTask] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AgentResult | null>(null);

  async function runAgent(taskText: string) {
    if (!taskText.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: taskText }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: AgentResult = await res.json();
      setResult(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Agent failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <Toaster position="top-right" toastOptions={{ style: { background: "#111827", color: "#f9fafb", border: "1px solid #1f2937" } }} />

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-400" />
          Macro Intelligence Agent
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          ReAct-architecture agent · reasons step-by-step with tools · powered by Gemini 2.5 Flash
        </p>
      </div>

      {/* Task input */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
            Agent Task
          </label>
          <textarea
            value={task}
            onChange={e => setTask(e.target.value)}
            placeholder="Give the agent a macro analysis task..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-all text-sm resize-none"
          />
        </div>

        <div>
          <div className="text-xs text-gray-500 mb-2">Preset tasks:</div>
          <div className="flex flex-wrap gap-2">
            {PRESET_TASKS.map(p => (
              <button
                key={p}
                onClick={() => setTask(p)}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-blue-500/10 border border-white/10 hover:border-blue-500/30 text-xs text-gray-400 hover:text-blue-300 transition-all text-left"
              >
                {p.length > 60 ? p.slice(0, 57) + "..." : p}
              </button>
            ))}
          </div>
        </div>

        <motion.button
          onClick={() => runAgent(task)}
          disabled={loading || !task.trim()}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600/80 hover:bg-blue-500/80 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {loading ? "Agent running..." : "Run Agent"}
        </motion.button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="glass rounded-2xl p-8 flex flex-col items-center gap-4">
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-blue-400"
                animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
              />
            ))}
          </div>
          <p className="text-gray-400 text-sm">Agent is reasoning through the data...</p>
          <p className="text-gray-600 text-xs">Pre-fetching Supabase context → running k-NN search → generating ReAct trace</p>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {/* Task recap */}
            <div className="glass rounded-2xl px-5 py-4 flex items-start gap-3">
              <Clock className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-[10px] text-gray-600 uppercase tracking-wide font-semibold mb-1">Task</div>
                <p className="text-sm text-gray-300">{result.task}</p>
              </div>
            </div>

            {/* Tool call trace */}
            {result.tool_trace.length > 0 && (
              <div className="glass rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-5">
                  <Cpu className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-semibold text-white">Agent Reasoning Trace</span>
                  <span className="text-xs text-gray-600 ml-auto">{result.tool_trace.length} steps</span>
                </div>
                <div>
                  {result.tool_trace.map((step, i) => (
                    <ToolStepCard
                      key={i}
                      step={step}
                      index={i}
                      total={result.tool_trace.length}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Final answer */}
            {result.answer && Object.keys(result.answer).length > 0 && (
              <AnswerCard answer={result.answer} elapsed_ms={result.elapsed_ms} />
            )}

            <div className="text-center text-[10px] text-gray-700 font-mono">
              {result.model_version} · {result.generated_at?.slice(0, 19).replace("T", " ")} UTC
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
