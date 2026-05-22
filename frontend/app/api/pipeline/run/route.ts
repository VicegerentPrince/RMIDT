import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const backendUrl = process.env.FASTAPI_INTERNAL_URL ?? "http://localhost:8000";

  const res = await fetch(`${backendUrl}/pipeline/run`, {
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
