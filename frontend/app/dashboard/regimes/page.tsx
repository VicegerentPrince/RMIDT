"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useRegimes } from "@/hooks/useRegimes";
import { cn, REGIME_BG } from "@/lib/utils";
import { Globe2, AlertTriangle, TrendingUp, TrendingDown, Minus, ArrowUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Leaflet must be dynamically imported (no SSR)
const RegimeMap = dynamic(() => import("@/components/RegimeMap"), { ssr: false, loading: () => (
  <div className="w-full h-105 glass rounded-2xl flex items-center justify-center">
    <div className="text-gray-500 text-sm animate-pulse">Loading map...</div>
  </div>
) });

const REGIME_ICONS: Record<string, React.ElementType> = {
  Expansion: TrendingUp,
  Peak: ArrowUp,
  Contraction: TrendingDown,
  Crisis: AlertTriangle,
  Recovery: Minus,
};

const REGIMES = ["Expansion", "Peak", "Contraction", "Crisis", "Recovery"];

const FLAGS: Record<string, string> = { US: "🇺🇸", EU: "🇪🇺", PK: "🇵🇰", CN: "🇨🇳", GLOBAL: "🌍" };

export default function RegimesPage() {
  const { data: regimes, loading } = useRegimes();

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Globe2 className="w-5 h-5 text-blue-400" />
          Economic Regime Map
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          ML-classified regime states per economy · RandomForest on 7 macro indicators
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {REGIMES.map(r => {
          const Icon = REGIME_ICONS[r] ?? Minus;
          return (
            <div key={r} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium", REGIME_BG[r])}>
              <Icon className="w-3 h-3" />
              {r}
            </div>
          );
        })}
      </div>

      {/* Map */}
      <RegimeMap regimes={regimes} />

      {/* Economy detail cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {loading
          ? [...Array(5)].map((_, i) => <div key={i} className="glass rounded-2xl h-40 animate-pulse" />)
          : regimes.map((r, i) => {
            const Icon = REGIME_ICONS[r.regime] ?? Minus;
            const f = r.feature_snapshot ?? {};
            return (
              <motion.div
                key={r.economy}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="glass rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{FLAGS[r.economy] ?? "🌐"}</span>
                  <span className="font-semibold text-white text-sm">{r.economy}</span>
                </div>
                <div className={cn("flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-semibold w-fit", REGIME_BG[r.regime])}>
                  <Icon className="w-3 h-3" />
                  {r.regime}
                </div>
                <div className="space-y-1.5">
                  {[
                    { k: "GDP Growth", v: f.gdp_growth },
                    { k: "CPI", v: f.cpi_yoy },
                    { k: "Unemployment", v: f.unemployment },
                    { k: "Yield Spread", v: f.yield_spread },
                  ].map(({ k, v }) => (
                    <div key={k} className="flex justify-between text-xs">
                      <span className="text-gray-500">{k}</span>
                      <span className="text-gray-200 font-mono">{v != null ? `${v.toFixed(1)}%` : "—"}</span>
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-gray-600">
                  Confidence: {(r.confidence * 100).toFixed(0)}% ·{" "}
                  {formatDistanceToNow(new Date(r.classified_at), { addSuffix: true })}
                </div>
              </motion.div>
            );
          })
        }
      </div>
    </div>
  );
}
