"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onTranscript: (text: string) => void;
  className?: string;
};

export function VoiceButton({ onTranscript, className }: Props) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream, { mimeType: pickMime() });
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        await upload(blob);
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mic access denied.");
    }
  }

  function stop() {
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
    setRecording(false);
  }

  async function upload(blob: Blob) {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("audio", blob, "voice.webm");
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? `Transcribe failed (${res.status})`);
        return;
      }
      const data = (await res.json()) as { text: string };
      if (data.text) onTranscript(data.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={recording ? stop : start}
        disabled={busy}
        className={cn(
          "rounded p-1 transition-colors",
          recording
            ? "bg-destructive text-destructive-foreground"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
          busy && "opacity-50",
          className,
        )}
        title={recording ? "Stop recording" : "Voice input"}
        aria-label={recording ? "Stop recording" : "Record voice"}
      >
        {recording ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-4 w-4" />}
      </button>
      {busy && <span className="text-[11px] text-muted-foreground">transcribing…</span>}
      {error && (
        <span className="max-w-[18ch] truncate text-[11px] text-destructive" title={error}>
          {error}
        </span>
      )}
    </span>
  );
}

function pickMime() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const m of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) return m;
  }
  return "";
}
