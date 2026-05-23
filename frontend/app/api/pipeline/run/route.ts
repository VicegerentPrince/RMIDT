import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const backendUrl = process.env.FASTAPI_INTERNAL_URL ?? "http://localhost:8000";
  const geminiKey = request.headers.get("x-gemini-api-key") ?? "";

  const res = await fetch(`${backendUrl}/pipeline/run`, {
    headers: geminiKey ? { "X-Gemini-API-Key": geminiKey } : {},
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
