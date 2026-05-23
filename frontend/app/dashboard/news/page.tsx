"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Newspaper, ExternalLink, TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Sentiment = "all" | "positive" | "negative" | "neutral";

interface Headline {
  id: string;
  title: string;
  source_name: string;
  url: string;
  published_at: string | null;
  sentiment_label: "positive" | "negative" | "neutral";
  captured_at: string;
}

function relTime(ts: string | null): string {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

const SENTIMENT_CONFIG = {
  positive: { label: "Positive", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", dot: "bg-emerald-400", Icon: TrendingUp },
  negative: { label: "Negative", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", dot: "bg-red-400", Icon: TrendingDown },
  neutral:  { label: "Neutral",  color: "text-gray-400",  bg: "bg-white/5 border-white/10",        dot: "bg-gray-500", Icon: Minus },
};

function SentimentBadge({ label }: { label: "positive" | "negative" | "neutral" }) {
  const cfg = SENTIMENT_CONFIG[label];
  const { Icon } = cfg;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border", cfg.bg, cfg.color)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

export default function NewsPage() {
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Sentiment>("all");

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("news_headlines")
      .select("*")
      .order("captured_at", { ascending: false })
      .limit(60);
    if (data) setHeadlines(data as Headline[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = filter === "all" ? headlines : headlines.filter(h => h.sentiment_label === filter);

  const counts = {
    positive: headlines.filter(h => h.sentiment_label === "positive").length,
    negative: headlines.filter(h => h.sentiment_label === "negative").length,
    neutral:  headlines.filter(h => h.sentiment_label === "neutral").length,
  };

  const FILTERS: { id: Sentiment; label: string }[] = [
    { id: "all",      label: `All (${headlines.length})` },
    { id: "positive", label: `Positive (${counts.positive})` },
    { id: "negative", label: `Negative (${counts.negative})` },
    { id: "neutral",  label: `Neutral (${counts.neutral})` },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-blue-400" />
            Market News
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Business headlines · AI sentiment via Gemini · updated every 15 minutes
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-400 hover:text-gray-200 transition-all shrink-0 mt-1 disabled:opacity-40"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Sentiment summary */}
      {!loading && headlines.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {(["positive", "negative", "neutral"] as const).map(s => {
            const cfg = SENTIMENT_CONFIG[s];
            const pct = headlines.length ? Math.round((counts[s] / headlines.length) * 100) : 0;
            return (
              <div key={s} className="glass rounded-xl p-4">
                <div className={cn("text-xs font-semibold uppercase tracking-wider mb-1", cfg.color)}>{cfg.label}</div>
                <div className="text-2xl font-bold text-white">{counts[s]}</div>
                <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", cfg.dot)} style={{ width: `${pct}%` }} />
                </div>
                <div className="text-[10px] text-gray-600 mt-1">{pct}% of headlines</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-xl w-fit flex-wrap">
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={cn(
              "relative px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              filter === id ? "text-white" : "text-gray-500 hover:text-gray-300"
            )}
          >
            {filter === id && (
              <motion.div layoutId="news-filter-bg" className="absolute inset-0 bg-blue-600/30 border border-blue-500/30 rounded-lg" />
            )}
            <span className="relative z-10">{label}</span>
          </button>
        ))}
      </div>

      {/* News feed */}
      <div className="glass rounded-2xl overflow-hidden divide-y divide-white/5">
        {loading ? (
          [...Array(8)].map((_, i) => (
            <div key={i} className="px-5 py-4">
              <div className="h-4 bg-white/5 rounded animate-pulse mb-2 w-3/4" />
              <div className="h-3 bg-white/5 rounded animate-pulse w-1/4" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-500 text-sm">
            <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-30" />
            {headlines.length === 0
              ? "No news yet — run the pipeline to fetch headlines"
              : `No ${filter} headlines in the current batch`}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((h, i) => (
              <motion.div
                key={h.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="px-5 py-4 hover:bg-white/3 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className={cn("w-1.5 h-1.5 rounded-full mt-2 shrink-0", SENTIMENT_CONFIG[h.sentiment_label].dot)} />
                  <div className="flex-1 min-w-0">
                    {h.url ? (
                      <a
                        href={h.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-200 leading-snug group-hover:text-white transition-colors flex items-start gap-1.5"
                      >
                        <span>{h.title}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 mt-0.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                      </a>
                    ) : (
                      <p className="text-sm text-gray-200 leading-snug">{h.title}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <SentimentBadge label={h.sentiment_label} />
                      {h.source_name && (
                        <span className="text-[10px] text-gray-600 font-medium">{h.source_name}</span>
                      )}
                      <span className="text-[10px] text-gray-700">{relTime(h.published_at || h.captured_at)}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
