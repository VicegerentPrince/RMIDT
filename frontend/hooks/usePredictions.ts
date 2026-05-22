"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface PredictionRow {
  id: string;
  economy: string;
  regime: string;
  reasoning_chain: string;
  verdict: string;
  confidence: number;
  timeframe: string;
  trigger_conditions: { accelerate: string[]; prevent: string[] };
  historical_analogs: { period: string; similarity_score: number; outcome: string }[];
  recommendation: string;
  model_version: string;
  created_at: string;
}

export function usePredictions(limit = 20) {
  const [data, setData] = useState<PredictionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const sbRef = useRef<SupabaseClient>(createClient());

  const channelName = useRef(`predictions_realtime_${Math.random()}`);

  useEffect(() => {
    const sb = sbRef.current;

    async function load() {
      const { data: rows } = await sb
        .from("predictions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (rows) setData(rows as PredictionRow[]);
      setLoading(false);
    }

    load();

    const channel = sb
      .channel(channelName.current)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "predictions" }, payload => {
        setData(prev => [payload.new as PredictionRow, ...prev].slice(0, limit));
      })
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, [limit]);

  return { data, loading };
}
