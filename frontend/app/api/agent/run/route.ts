import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const CACHE_TTL_HOURS = 2;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const task: string = body.task;

  const cutoff = new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString();
  const { data: cached } = await supabase
    .from("agent_runs")
    .select("*")
    .eq("user_id", user.id)
    .eq("task", task)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached) {
    return NextResponse.json({
      task: cached.task,
      tool_trace: cached.tool_trace,
      answer: cached.answer,
      model_version: cached.model_version,
      elapsed_ms: cached.elapsed_ms,
      generated_at: cached.created_at,
      cached: true,
    });
  }

  const backendUrl = process.env.FASTAPI_INTERNAL_URL ?? "http://localhost:8000";
  const geminiKey = request.headers.get("x-gemini-api-key") ?? "";
  const res = await fetch(`${backendUrl}/agent/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(geminiKey && { "X-Gemini-API-Key": geminiKey }) },
    body: JSON.stringify({ task }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: await res.text() }, { status: res.status });
  }

  const data = await res.json();

  await supabase.from("agent_runs").insert({
    user_id: user.id,
    task: data.task ?? task,
    tool_trace: data.tool_trace ?? [],
    answer: data.answer ?? {},
    model_version: data.model_version ?? null,
    elapsed_ms: data.elapsed_ms ?? null,
  });

  return NextResponse.json(data);
}
