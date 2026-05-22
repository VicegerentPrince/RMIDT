"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface CryptoRow {
  id: string;
  coin_id: string;
  name: string;
  symbol: string;
  current_price: number | null;
  market_cap: number | null;
  price_change_24h: number | null;
  total_volume: number | null;
  captured_at: string;
}

export function useCrypto() {
  const [data, setData] = useState<CryptoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const sbRef = useRef<SupabaseClient>(createClient());

  const channelName = useRef(`crypto_realtime_${Math.random()}`);

  useEffect(() => {
    const sb = sbRef.current;

    async function load() {
      const { data: rows } = await sb
        .from("crypto_data")
        .select("*")
        .order("captured_at", { ascending: false })
        .limit(30);

      if (rows) setData(dedupeLatest(rows as CryptoRow[]));
      setLoading(false);
    }

    load();

    const channel = sb
      .channel(channelName.current)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "crypto_data" }, payload => {
        setData(prev => {
          const newRow = payload.new as CryptoRow;
          return [newRow, ...prev.filter(r => r.coin_id !== newRow.coin_id)];
        });
      })
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, []);

  return { data, loading };
}

function dedupeLatest(rows: CryptoRow[]): CryptoRow[] {
  const seen = new Set<string>();
  return rows.filter(r => {
    if (seen.has(r.coin_id)) return false;
    seen.add(r.coin_id);
    return true;
  });
}
