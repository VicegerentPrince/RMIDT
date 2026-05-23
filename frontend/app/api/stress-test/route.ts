import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const CACHE_TTL_HOURS = 24;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const scenario: string = body.scenario;

  const cutoff = new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString();
  const { data: cached } = await supabase
    .from("stress_tests")
    .select("*")
    .eq("user_id", user.id)
    .eq("scenario_text", scenario)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }

  const backendUrl = process.env.FASTAPI_INTERNAL_URL ?? "http://localhost:8000";
  const geminiKey = request.headers.get("x-gemini-api-key") ?? "";
  const res = await fetch(`${backendUrl}/stress-test`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(geminiKey && { "X-Gemini-API-Key": geminiKey }) },
    body: JSON.stringify({ scenario, user_id: user.id }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
