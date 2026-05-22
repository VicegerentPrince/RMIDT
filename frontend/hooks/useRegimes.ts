"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface RegimeRow {
  id: string;
  economy: string;
  regime: string;
  confidence: number;
  feature_snapshot: Record<string, number>;
  classified_at: string;
}

export function useRegimes() {
  const [data, setData] = useState<RegimeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const sbRef = useRef<SupabaseClient>(createClient());

  const channelName = useRef(`regimes_realtime_${Math.random()}`);

  useEffect(() => {
    const sb = sbRef.current;

    async function load() {
      const { data: rows } = await sb
        .from("regime_classifications")
        .select("*")
        .order("classified_at", { ascending: false })
        .limit(20);

      if (rows) setData(dedupeLatest(rows as RegimeRow[]));
      setLoading(false);
    }

    load();

    const channel = sb
      .channel(channelName.current)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "regime_classifications" }, payload => {
        setData(prev => {
          const newRow = payload.new as RegimeRow;
          return [newRow, ...prev.filter(r => r.economy !== newRow.economy)];
        });
      })
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, []);

  return { data, loading };
}

function dedupeLatest(rows: RegimeRow[]): RegimeRow[] {
  const seen = new Set<string>();
  return rows.filter(r => {
    if (seen.has(r.economy)) return false;
    seen.add(r.economy);
    return true;
  });
}
