"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, AlertTriangle, Shield, GitBranch, Clock, Loader2 } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const PRESETS = [
  "Fed hikes interest rates by 300bps overnight",
  "China invades Taiwan — full-scale military conflict",
  "Pakistan sovereign debt default and IMF bailout collapse",
  "Global oil embargo — OPEC cuts supply by 40%",
  "US banking crisis — three major banks fail simultaneously",
  "European sovereign debt crisis reignites in Italy",
];

interface StressResult {
  scenario_text: string;
  affected_markets: { market: string; impact: string; severity: number }[];
  contagion_path: { step: number; event: string; timeframe: string }[];
  safe_havens: string[];
  historical_analogs: { period: string; similarity: string; resolution: string }[];
  full_analysis: string;
  confidence: number;
}

function SeverityBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value));
  const color = pct >= 0.7 ? "#ef4444" : pct >= 0.4 ? "#f97316" : "#f59e0b";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-mono text-gray-400">{(pct * 100).toFixed(0)}%</span>
    </div>
  );
}

export default function StressTestPage() {
  const [scenario, setScenario] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StressResult | null>(null);

  async function runTest() {
    if (!scenario.trim()) {
      toast.error("Enter a scenario first");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/stress-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <Toaster position="top-right" toastOptions={{ style: { background: "#111827", color: "#f9fafb", border: "1px solid #1f2937" } }} />

      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          Macro Stress Tester
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Simulate hypothetical economic shocks · Gemini 2.5 Flash cascade analysis
        </p>
      </div>

      {/* Input */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
            Shock Scenario
          </label>
          <textarea
            value={scenario}
            onChange={e => setScenario(e.target.value)}
            placeholder="Describe your hypothetical economic shock scenario in detail..."
            rows={4}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 transition-all text-sm resize-none"
          />
        </div>

        {/* Presets */}
        <div>
          <div className="text-xs text-gray-500 mb-2">Quick scenarios:</div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(p => (
              <button
                key={p}
                onClick={() => setScenario(p)}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-amber-500/10 border border-white/10 hover:border-amber-500/30 text-xs text-gray-400 hover:text-amber-300 transition-all"
              >
                {p.length > 45 ? p.slice(0, 42) + "..." : p}
              </button>
            ))}
          </div>
        </div>

        <motion.button
          onClick={runTest}
          disabled={loading || !scenario.trim()}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-600/80 hover:bg-amber-500/80 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {loading ? "Simulating..." : "Run Simulation"}
        </motion.button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="glass rounded-2xl p-8 flex flex-col items-center gap-4">
          <div className="flex gap-2">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="w-3 h-3 rounded-full bg-amber-400"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
              />
            ))}
          </div>
          <p className="text-gray-400 text-sm">Gemini is simulating cascade effects...</p>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-5"
          >
            {/* Scenario + confidence */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Scenario Analyzed</span>
                <span className="text-sm font-mono text-amber-400">{(result.confidence * 100).toFixed(0)}% confidence</span>
              </div>
              <p className="text-white text-sm">{result.scenario_text}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Affected markets */}
              <div className="glass rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-semibold text-white">Affected Markets</span>
                </div>
                <div className="space-y-3">
                  {result.affected_markets.map((m, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-200">{m.market}</span>
                        <span className="text-[10px] text-gray-500">{m.impact}</span>
                      </div>
                      <SeverityBar value={m.severity} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Safe havens */}
              <div className="glass rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-white">Safe Havens</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.safe_havens.map((h, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
                      {h}
                    </span>
                  ))}
                </div>

                {/* Historical analogs */}
                <div className="mt-5">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Historical Analogs</div>
                  {result.historical_analogs.map((a, i) => (
                    <div key={i} className="border-l-2 border-blue-500/40 pl-3 mb-3">
                      <div className="text-sm font-semibold text-white">{a.period}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{a.similarity}</div>
                      <div className="text-xs text-blue-300 mt-0.5">{a.resolution}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Contagion path */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <GitBranch className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-semibold text-white">Contagion Path</span>
              </div>
              <div className="space-y-2">
                {result.contagion_path.map((step, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-300 text-xs font-bold flex items-center justify-center shrink-0">
                        {step.step}
                      </div>
                      {i < result.contagion_path.length - 1 && (
                        <div className="w-0.5 h-6 bg-orange-500/20 mt-1" />
                      )}
                    </div>
                    <div className="pb-2">
                      <div className="text-sm text-gray-200">{step.event}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-gray-500" />
                        <span className="text-[10px] text-gray-500">{step.timeframe}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Full analysis */}
            <div className="glass rounded-2xl p-5">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Full Analysis</div>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{result.full_analysis}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
