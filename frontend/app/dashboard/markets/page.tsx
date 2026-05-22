"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Activity, DollarSign, BarChart2, Bitcoin } from "lucide-react";
import { useMarketData } from "@/hooks/useMarketData";
import { useCrypto } from "@/hooks/useCrypto";
import { cn, formatPrice, formatPct, formatLargeNumber } from "@/lib/utils";

type Tab = "equities" | "forex" | "commodities" | "crypto";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "equities", label: "Equities", icon: TrendingUp },
  { id: "forex", label: "Forex", icon: DollarSign },
  { id: "commodities", label: "Commodities", icon: BarChart2 },
  { id: "crypto", label: "Crypto", icon: Bitcoin },
];

function PctBadge({ value }: { value: number | null }) {
  const v = value ?? 0;
  const up = v >= 0;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono",
      up ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
    )}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {formatPct(value)}
    </span>
  );
}

function DataRow({ row, i }: {
  row: { symbol: string; name?: string; price: number | null; change_pct: number | null; volume?: number | null };
  i: number;
}) {
  return (
    <motion.tr
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.04 }}
      className={cn(
        "border-b border-white/5 hover:bg-white/3 transition-colors",
        (row.change_pct ?? 0) > 1 && "bg-emerald-500/3",
        (row.change_pct ?? 0) < -1 && "bg-red-500/3",
      )}
    >
      <td className="px-4 py-3">
        <div className="font-mono text-xs text-gray-400">{row.symbol.replace("=X", "").replace("=F", "").replace("^", "")}</div>
        {row.name && <div className="text-sm text-white">{row.name}</div>}
      </td>
      <td className="px-4 py-3 text-right font-mono text-sm text-white">{formatPrice(row.price)}</td>
      <td className="px-4 py-3 text-right"><PctBadge value={row.change_pct} /></td>
      <td className="px-4 py-3 text-right text-xs text-gray-500">{formatLargeNumber(row.volume ?? null)}</td>
    </motion.tr>
  );
}

function CryptoRow({ c, i }: {
  c: { coin_id: string; name: string; symbol: string; current_price: number | null; price_change_24h: number | null; market_cap: number | null; total_volume: number | null };
  i: number;
}) {
  return (
    <motion.tr
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.04 }}
      className="border-b border-white/5 hover:bg-white/3 transition-colors"
    >
      <td className="px-4 py-3">
        <div className="text-[10px] text-gray-500 font-mono">{i + 1}</div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm text-white font-medium">{c.name}</div>
        <div className="text-[10px] text-gray-500 font-mono">{c.symbol}</div>
      </td>
      <td className="px-4 py-3 text-right font-mono text-sm text-white">{formatPrice(c.current_price)}</td>
      <td className="px-4 py-3 text-right"><PctBadge value={c.price_change_24h} /></td>
      <td className="px-4 py-3 text-right text-xs text-gray-500">{formatLargeNumber(c.market_cap)}</td>
      <td className="px-4 py-3 text-right text-xs text-gray-500">{formatLargeNumber(c.total_volume)}</td>
    </motion.tr>
  );
}

export default function MarketsPage() {
  const [tab, setTab] = useState<Tab>("equities");
  const { data: market, loading } = useMarketData();
  const { data: crypto, loading: cryptoLoading } = useCrypto();

  const byCategory = (cat: string) =>
    [...market.filter(r => r.category === cat)].sort((a, b) => Math.abs(b.change_pct ?? 0) - Math.abs(a.change_pct ?? 0));

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Live Markets</h1>
        <p className="text-sm text-gray-500 mt-1">Real-time prices via yfinance · updated every 15 minutes</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === id ? "text-white" : "text-gray-500 hover:text-gray-300"
            )}
          >
            {tab === id && (
              <motion.div
                layoutId="tab-bg"
                className="absolute inset-0 bg-blue-600/30 border border-blue-500/30 rounded-lg"
              />
            )}
            <Icon className="w-4 h-4 relative z-10" />
            <span className="relative z-10">{label}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {tab === "crypto" ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-4 py-3 text-left text-[10px] text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-left text-[10px] text-gray-500 uppercase tracking-wider">Asset</th>
                    <th className="px-4 py-3 text-right text-[10px] text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-4 py-3 text-right text-[10px] text-gray-500 uppercase tracking-wider">24h</th>
                    <th className="px-4 py-3 text-right text-[10px] text-gray-500 uppercase tracking-wider">Mkt Cap</th>
                    <th className="px-4 py-3 text-right text-[10px] text-gray-500 uppercase tracking-wider">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {cryptoLoading
                    ? [...Array(6)].map((_, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td colSpan={6} className="px-4 py-4"><div className="h-4 bg-white/5 rounded animate-pulse" /></td>
                      </tr>
                    ))
                    : crypto.map((c, i) => <CryptoRow key={c.coin_id} c={c} i={i} />)
                  }
                </tbody>
              </table>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-4 py-3 text-left text-[10px] text-gray-500 uppercase tracking-wider">Symbol / Name</th>
                    <th className="px-4 py-3 text-right text-[10px] text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-4 py-3 text-right text-[10px] text-gray-500 uppercase tracking-wider">Change</th>
                    <th className="px-4 py-3 text-right text-[10px] text-gray-500 uppercase tracking-wider">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? [...Array(5)].map((_, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td colSpan={4} className="px-4 py-4"><div className="h-4 bg-white/5 rounded animate-pulse" /></td>
                      </tr>
                    ))
                    : byCategory(tab === "equities" ? "equity" : tab).map((r, i) => (
                      <DataRow key={r.id} row={r} i={i} />
                    ))
                  }
                </tbody>
              </table>
            )}
          </motion.div>
        </AnimatePresence>

        {!loading && tab !== "crypto" && byCategory(tab === "equities" ? "equity" : tab).length === 0 && (
          <div className="p-8 text-center text-gray-500 text-sm">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No {tab} data yet — run the pipeline to fetch live prices
          </div>
        )}
      </div>
    </div>
  );
}
