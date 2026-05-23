import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const question: string = body.question;

  const backendUrl = process.env.FASTAPI_INTERNAL_URL ?? "http://localhost:8000";
  const geminiKey = request.headers.get("x-gemini-api-key") ?? "";
  const res = await fetch(`${backendUrl}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(geminiKey && { "X-Gemini-API-Key": geminiKey }) },
    body: JSON.stringify({ question }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: await res.text() }, { status: res.status });
  }

  const data = await res.json();

  await supabase.from("chat_messages").insert({
    user_id: user.id,
    question,
    answer: data.answer ?? "",
    key_points: data.key_points ?? [],
    relevant_data: data.relevant_data ?? {},
    caveats: data.caveats ?? "",
    model_version: data.model_version ?? null,
  });

  return NextResponse.json(data);
}
