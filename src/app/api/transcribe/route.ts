import { NextRequest } from "next/server";
import { hasOpenAIKey, transcribe } from "@/lib/ai/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!hasOpenAIKey()) {
    return Response.json(
      { error: "OPENAI_API_KEY is not set. Voice input needs Whisper." },
      { status: 503 },
    );
  }
  const form = await req.formData();
  const file = form.get("audio");
  if (!(file instanceof Blob)) {
    return Response.json({ error: "Missing 'audio' field." }, { status: 400 });
  }
  try {
    const text = await transcribe(file, "voice.webm");
    return Response.json({ text });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Transcription failed." },
      { status: 502 },
    );
  }
}
