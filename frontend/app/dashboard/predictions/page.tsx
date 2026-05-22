"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePredictions } from "@/hooks/usePredictions";
import { cn, REGIME_BG } from "@/lib/utils";
import { Brain, ChevronDown, Download, Clock, AlertCircle, Shield, Zap } from "lucide-react";
import { format } from "date-fns";
import type { PredictionRow } from "@/hooks/usePredictions";

const ECONOMIES = ["All", "US", "EU", "PK", "CN", "GLOBAL"];
const REGIMES = ["All", "Expansion", "Peak", "Contraction", "Crisis", "Recovery"];

function ConfidenceArc({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value));
  const circumference = 2 * Math.PI * 28;
  const offset = circumference * (1 - pct);

  const color = pct >= 0.7 ? "#10b981" : pct >= 0.4 ? "#f59e0b" : "#ef4444";

  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="shrink-0">
      <circle cx="36" cy="36" r="28" fill="none" stroke="#1f2937" strokeWidth="6" />
      <circle
        cx="36" cy="36" r="28"
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 36 36)"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text x="36" y="40" textAnchor="middle" fill="white" fontSize="14" fontWeight="700" fontFamily="monospace">
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}

function PredictionCard({ p }: { p: PredictionRow }) {
  const [expanded, setExpanded] = useState(false);
  const label = p.regime || "Unknown";

  return (
    <motion.div
      layout
      className="glass rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-start gap-4 p-5 hover:bg-white/3 transition-colors text-left"
      >
        <ConfidenceArc value={p.confidence} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold border", REGIME_BG[label])}>
              {p.economy} · {label}
            </span>
            <span className="text-[10px] text-gray-500 font-mono">{p.model_version}</span>
            {p.timeframe && (
              <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                {p.timeframe}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-200 font-medium line-clamp-2">{p.verdict}</p>
          <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-500">
            <Clock className="w-3 h-3" />
            {format(new Date(p.created_at), "MMM d, yyyy · HH:mm")} UTC
          </div>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-gray-500 shrink-0 mt-1 transition-transform", expanded && "rotate-180")} />
      </button>

      {/* Expanded */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/5 p-5 space-y-5">
              {/* Chain of thought */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Reasoning Chain</span>
                </div>
                <div className="bg-white/3 rounded-xl p-4 text-sm text-gray-300 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {p.reasoning_chain}
                </div>
              </div>

              {/* Triggers */}
              {p.trigger_conditions && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Accelerators</span>
                    </div>
                    <ul className="space-y-1.5">
                      {(p.trigger_conditions.accelerate ?? []).map((t, i) => (
                        <li key={i} className="flex gap-2 text-xs text-gray-300">
                          <span className="text-red-400 mt-0.5">•</span>{t}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Preventers</span>
                    </div>
                    <ul className="space-y-1.5">
                      {(p.trigger_conditions.prevent ?? []).map((t, i) => (
                        <li key={i} className="flex gap-2 text-xs text-gray-300">
                          <span className="text-emerald-400 mt-0.5">•</span>{t}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Historical analogs */}
              {p.historical_analogs?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Historical Analogs</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {p.historical_analogs.map((a, i) => (
                      <div key={i} className="bg-white/3 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-white">{a.period}</span>
                          <span className="text-[10px] text-gray-500">{(a.similarity_score * 100).toFixed(0)}% similar</span>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full mb-2">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${a.similarity_score * 100}%` }} />
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">{a.outcome}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendation */}
              {p.recommendation && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">Actionable Recommendation</div>
                  <p className="text-sm text-gray-200">{p.recommendation}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function PredictionsPage() {
  const { data: predictions, loading } = usePredictions(50);
  const [econFilter, setEconFilter] = useState("All");
  const [regimeFilter, setRegimeFilter] = useState("All");

  const filtered = predictions.filter(p => {
    if (econFilter !== "All" && p.economy !== econFilter) return false;
    if (regimeFilter !== "All" && p.regime !== regimeFilter) return false;
    return true;
  });

  function exportJSON() {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rmidt-predictions-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-400" />
            Prediction Audit Log
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Every AI analysis stored permanently · {predictions.length} entries
          </p>
        </div>
        <button
          onClick={exportJSON}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-gray-300 transition-all"
        >
          <Download className="w-4 h-4" />
          Export JSON
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
          {ECONOMIES.map(e => (
            <button
              key={e}
              onClick={() => setEconFilter(e)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                econFilter === e ? "bg-blue-600/30 text-blue-300 border border-blue-500/30" : "text-gray-500 hover:text-gray-300"
              )}
            >{e}</button>
          ))}
        </div>
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl flex-wrap">
          {REGIMES.map(r => (
            <button
              key={r}
              onClick={() => setRegimeFilter(r)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                regimeFilter === r ? "bg-blue-600/30 text-blue-300 border border-blue-500/30" : "text-gray-500 hover:text-gray-300"
              )}
            >{r}</button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="glass rounded-2xl h-28 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <AlertCircle className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No predictions yet. Run the pipeline to generate AI analysis.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(p => <PredictionCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}
