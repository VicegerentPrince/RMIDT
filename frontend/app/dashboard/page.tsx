"use client";

import { motion } from "framer-motion";
import { useMarketData } from "@/hooks/useMarketData";
import { useRegimes } from "@/hooks/useRegimes";
import { usePredictions } from "@/hooks/usePredictions";
import { useCrypto } from "@/hooks/useCrypto";
import { cn, formatPrice, formatPct, REGIME_BG, REGIME_COLORS } from "@/lib/utils";
import { TrendingUp, TrendingDown, Brain, Clock, AlertTriangle, Shield } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ── Ticker Strip ─────────────────────────────────────────────────────────────

function TickerStrip() {
  const { data: market } = useMarketData();
  const { data: crypto } = useCrypto();

  const items = [
    ...market.filter(r => ["^GSPC", "^IXIC", "^GDAXI", "^N225", "^KSE", "GC=F", "CL=F"].includes(r.symbol)),
    ...crypto.slice(0, 5).map(c => ({
      symbol: c.symbol,
      name: c.name,
      price: c.current_price,
      change_pct: c.price_change_24h,
      category: "crypto" as const,
    })),
  ];

  if (!items.length) return null;

  const doubled = [...items, ...items];

  return (
    <div className="w-full overflow-hidden border-b border-white/5 bg-[#0d1221]/60">
      <div className="flex">
        <div className="ticker-track flex gap-8 py-2.5 px-4 whitespace-nowrap">
          {doubled.map((item, i) => {
            const up = (item.change_pct ?? 0) >= 0;
            return (
              <span key={i} className="flex items-center gap-2 text-xs">
                <span className="font-mono text-gray-400">{item.symbol?.replace("=X", "").replace("=F", "").replace("^", "")}</span>
                <span className="text-white font-medium">{formatPrice(item.price)}</span>
                <span className={cn("font-mono", up ? "text-emerald-400" : "text-red-400")}>
                  {up ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />}
                  {" "}{formatPct(item.change_pct)}
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Economy Card ─────────────────────────────────────────────────────────────

function EconomyCard({ regime }: { regime: { economy: string; regime: string; confidence: number; feature_snapshot: Record<string, number>; classified_at: string } }) {
  const f = regime.feature_snapshot ?? {};
  const label = regime.regime || "Unknown";

  const flags: Record<string, string> = { US: "🇺🇸", EU: "🇪🇺", PK: "🇵🇰", CN: "🇨🇳", GLOBAL: "🌍" };

  return (
    <motion.div
      layout
      className="glass rounded-2xl p-5 flex flex-col gap-4"
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{flags[regime.economy] ?? "🌐"}</span>
          <div>
            <div className="text-sm font-semibold text-white">{regime.economy}</div>
            <div className="text-[10px] text-gray-500">Economy</div>
          </div>
        </div>
        <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border", REGIME_BG[label])}>
          {label}
        </span>
      </div>

      {/* Confidence bar */}
      <div>
        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
          <span>Confidence</span>
          <span className="text-white">{(regime.confidence * 100).toFixed(0)}%</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: REGIME_COLORS[label] ?? "#3b82f6" }}
            initial={{ width: 0 }}
            animate={{ width: `${regime.confidence * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "GDP Growth", value: f.gdp_growth != null ? `${f.gdp_growth.toFixed(1)}%` : "—" },
          { label: "CPI", value: f.cpi_yoy != null ? `${f.cpi_yoy.toFixed(1)}%` : "—" },
          { label: "Unemployment", value: f.unemployment != null ? `${f.unemployment.toFixed(1)}%` : "—" },
          { label: "Equity Δ", value: f.equity_change_1m != null ? formatPct(f.equity_change_1m) : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white/3 rounded-xl p-2.5">
            <div className="text-[10px] text-gray-500">{label}</div>
            <div className="text-xs font-semibold text-white mt-0.5">{value}</div>
          </div>
        ))}
      </div>

      <div className="text-[10px] text-gray-600 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {formatDistanceToNow(new Date(regime.classified_at), { addSuffix: true })}
      </div>
    </motion.div>
  );
}

// ── Prediction Card ───────────────────────────────────────────────────────────

function PredictionCard({ p, i }: { p: { economy: string; regime: string; verdict: string; confidence: number; recommendation: string; created_at: string }; i: number }) {
  const label = p.regime || "Unknown";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.06 }}
      className="glass rounded-xl p-4 flex gap-4"
    >
      <div className="mt-0.5">
        <Brain className="w-4 h-4 text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold border", REGIME_BG[label])}>
            {p.economy} · {label}
          </span>
          <span className="text-[10px] text-gray-500 ml-auto shrink-0">
            {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm text-gray-200 line-clamp-2">{p.verdict}</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${p.confidence * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-400 shrink-0">{(p.confidence * 100).toFixed(0)}%</span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const { data: regimes, loading: regimesLoading } = useRegimes();
  const { data: predictions, loading: predictionsLoading } = usePredictions(5);
  const { data: crypto } = useCrypto();

  const globalRegime = regimes.find(r => r.economy === "GLOBAL");

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <TickerStrip />

      {/* Global status banner */}
      {globalRegime && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn("rounded-2xl p-4 border flex items-center gap-4", REGIME_BG[globalRegime.regime])}
        >
          {globalRegime.regime === "Crisis" ? (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          ) : (
            <Shield className="w-5 h-5 shrink-0" />
          )}
          <div>
            <div className="font-semibold">Global Economy: {globalRegime.regime}</div>
            <div className="text-xs opacity-75">Classifier confidence: {(globalRegime.confidence * 100).toFixed(0)}%</div>
          </div>
        </motion.div>
      )}

      {/* Economy cards */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Economic Regimes</h2>
        {regimesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="glass rounded-2xl p-5 h-52 animate-pulse bg-white/3" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {regimes.map(r => <EconomyCard key={r.economy} regime={r} />)}
          </div>
        )}
      </div>

      {/* Predictions + Crypto */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent predictions */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Latest AI Predictions</h2>
          {predictionsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="glass rounded-xl h-20 animate-pulse" />)}
            </div>
          ) : predictions.length === 0 ? (
            <div className="glass rounded-xl p-6 text-center text-gray-500 text-sm">
              No predictions yet — run the pipeline to generate analysis
            </div>
          ) : (
            <div className="space-y-3">
              {predictions.map((p, i) => <PredictionCard key={p.id} p={p} i={i} />)}
            </div>
          )}
        </div>

        {/* Crypto strip */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Crypto Markets</h2>
          <div className="glass rounded-2xl overflow-hidden">
            {crypto.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">No crypto data yet</div>
            ) : (
              <div className="divide-y divide-white/5">
                {crypto.slice(0, 8).map((c, i) => {
                  const up = (c.price_change_24h ?? 0) >= 0;
                  return (
                    <motion.div
                      key={c.coin_id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-gray-400">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white">{c.name}</div>
                        <div className="text-[10px] text-gray-500">{c.symbol}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono text-white">{formatPrice(c.current_price)}</div>
                        <div className={cn("text-xs font-mono", up ? "text-emerald-400" : "text-red-400")}>
                          {formatPct(c.price_change_24h)}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
