import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = request.nextUrl.searchParams.get("limit") ?? "20";
  const backendUrl = process.env.FASTAPI_INTERNAL_URL ?? "http://localhost:8000";

  const res = await fetch(`${backendUrl}/predictions/latest?limit=${limit}`, {
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
