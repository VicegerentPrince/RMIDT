"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface MarketRow {
  id: string;
  symbol: string;
  name: string;
  category: "equity" | "forex" | "commodity";
  price: number | null;
  change_pct: number | null;
  volume: number | null;
  currency: string;
  captured_at: string;
}

export function useMarketData() {
  const [data, setData] = useState<MarketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const sbRef = useRef<SupabaseClient>(createClient());

  const channelName = useRef(`market_data_realtime_${Math.random()}`);

  useEffect(() => {
    const sb = sbRef.current;

    async function load() {
      const { data: rows } = await sb
        .from("market_data")
        .select("*")
        .order("captured_at", { ascending: false })
        .limit(100);

      if (rows) setData(dedupeLatest(rows as MarketRow[]));
      setLoading(false);
    }

    load();

    const channel = sb
      .channel(channelName.current)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "market_data" }, payload => {
        setData(prev => {
          const newRow = payload.new as MarketRow;
          return [newRow, ...prev.filter(r => r.symbol !== newRow.symbol)].slice(0, 100);
        });
      })
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, []);

  return { data, loading };
}

function dedupeLatest(rows: MarketRow[]): MarketRow[] {
  const seen = new Set<string>();
  return rows.filter(r => {
    if (seen.has(r.symbol)) return false;
    seen.add(r.symbol);
    return true;
  });
}
