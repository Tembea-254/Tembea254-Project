"use client";

import { Camera, CheckCircle2, Circle, Link2, Loader2, Square, Upload, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Submit } from "@/components/admin/client";
import { uploadFile } from "@/lib/upload-client";
import { cn } from "@/lib/utils";

type Mode = "record" | "upload" | "link";
const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

/**
 * Hand in a Scout job: record in the app with the phone camera (with a timer against the
 * required length), upload a file from the gallery or a 360° camera, or paste a link.
 */
export function ScoutSubmit({ claimId, minMinutes, requirements, is360, action }: { claimId: string; minMinutes: number; requirements: string[]; is360: boolean; action: (f: FormData) => void }) {
  const [mode, setMode] = useState<Mode>(is360 ? "upload" : "record");
  const [url, setUrl] = useState("");
  const [duration, setDuration] = useState(0);
  const [inApp, setInApp] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ticks, setTicks] = useState<boolean[]>(requirements.map(() => false));
  const minSec = minMinutes * 60;

  async function send(file: File, sec: number, recordedHere: boolean) {
    setError(null);
    setUploadPct(0);
    try {
      const u = await uploadFile(file, setUploadPct);
      setUrl(u);
      setDuration(Math.round(sec));
      setInApp(recordedHere);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Check your connection and try again.");
    } finally {
      setUploadPct(null);
    }
  }

  const allTicked = ticks.every(Boolean);
  const short = duration > 0 && duration < minSec;

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="claimId" value={claimId} />
      <input type="hidden" name="videoUrl" value={mode === "link" ? "" : url} />
      <input type="hidden" name="durationSec" value={duration || ""} />
      <input type="hidden" name="inApp" value={inApp ? "1" : "0"} />

      <div className="grid grid-cols-3 gap-2">
        {(
          [
            { id: "record", label: "Record now", icon: Camera },
            { id: "upload", label: "Upload file", icon: Upload },
            { id: "link", label: "Paste link", icon: Link2 },
          ] as const
        ).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={cn("flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 font-display text-xs font-semibold sm:text-sm", mode === m.id ? "border-ink bg-ink text-white" : "border-ink/10 bg-white text-ink-soft")}
          >
            <m.icon className="h-5 w-5" /> {m.label}
          </button>
        ))}
      </div>
      {is360 && mode === "record" && <p className="rounded-2xl bg-ochre-50 p-3 text-sm text-ochre-700">This job needs a 360° camera. Record with the camera&apos;s own app, then upload the exported file here.</p>}

      {mode === "record" && <Recorder minSec={minSec} disabled={uploadPct != null} onDone={(file, sec) => send(file, sec, true)} />}

      {mode === "upload" && (
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-ink/15 bg-sand-50 px-4 py-8 text-center hover:border-savanna-500">
          <Video className="h-8 w-8 text-savanna-600" />
          <span className="font-display font-semibold">Choose the video</span>
          <span className="text-xs text-ink-muted">From your gallery, a 360° camera export or a drone. Large files are fine on Wi-Fi.</span>
          <input
            type="file"
            accept="video/*"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              const sec = await videoDuration(file);
              await send(file, sec, false);
            }}
          />
        </label>
      )}

      {mode === "link" && (
        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Link to the video</span>
            <input name="link" type="url" placeholder="https://drive.google.com/… or https://youtu.be/…" className="h-11 w-full rounded-2xl border border-ink/10 bg-white px-3.5 text-sm outline-none focus:border-savanna-500" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Length (min)</span>
            <input type="number" min={0} step="0.5" onChange={(e) => setDuration(Math.round(Number(e.target.value) * 60))} className="h-11 w-full rounded-2xl border border-ink/10 bg-white px-3.5 text-sm outline-none focus:border-savanna-500" />
          </label>
          <p className="text-xs text-ink-muted sm:col-span-2">Make sure the link is shared as &quot;Anyone with the link can view&quot;.</p>
        </div>
      )}

      {uploadPct != null && (
        <div className="rounded-2xl bg-white p-3 shadow-card">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Loader2 className="h-4 w-4 animate-spin" /> Uploading… {uploadPct}%
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-sand-100">
            <div className="h-full rounded-full bg-savanna-500 transition-all" style={{ width: `${uploadPct}%` }} />
          </div>
          <p className="mt-2 text-xs text-ink-muted">Keep this page open until it finishes.</p>
        </div>
      )}
      {error && <p className="rounded-2xl bg-maasai-50 p-3 text-sm text-maasai-600">{error}</p>}
      {url && mode !== "link" && (
        <div className="rounded-3xl bg-white p-3 shadow-card">
          <video src={url} controls preload="metadata" className="aspect-video w-full rounded-2xl bg-ink" />
          <p className={cn("mt-2 text-sm", short ? "text-maasai-600" : "text-savanna-700")}>
            {short ? `This clip is ${fmt(duration)} long; the job asks for at least ${minMinutes} minutes. Short clips are usually not approved.` : `Uploaded · ${fmt(duration)} long`}
          </p>
        </div>
      )}

      {requirements.length > 0 && (
        <fieldset className="rounded-3xl bg-white p-4 shadow-card">
          <legend className="sr-only">Checklist</legend>
          <p className="mb-2 font-display text-sm font-bold">Check before you submit</p>
          <ul className="space-y-1.5">
            {requirements.map((r, i) => (
              <li key={r}>
                <button type="button" onClick={() => setTicks(ticks.map((t, j) => (j === i ? !t : t)))} className="flex w-full items-start gap-2 text-left text-sm">
                  {ticks[i] ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-savanna-600" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-ink/30" />}
                  <span className={ticks[i] ? "text-ink" : "text-ink-soft"}>{r}</span>
                </button>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Note for the reviewer (optional)</span>
        <textarea name="note" rows={2} className="w-full rounded-2xl border border-ink/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-savanna-500" placeholder="Time you filmed, camera used, anything we should know" />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="confirm" required className="mt-1 accent-savanna-600" />
        <span>I filmed this myself for this job, and Tembea may use it in the app with credit to me once it&apos;s approved and paid.</span>
      </label>
      {!allTicked && requirements.length > 0 && <p className="text-xs text-ink-muted">Tick every item on the checklist so you know the recording will pass review.</p>}
      <Submit className="h-12 w-full px-8 sm:w-auto">Submit for review</Submit>
    </form>
  );
}

function videoDuration(file: File) {
  return new Promise<number>((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      const d = Number.isFinite(v.duration) ? v.duration : 0;
      URL.revokeObjectURL(v.src);
      resolve(d);
    };
    v.onerror = () => resolve(0);
    v.src = URL.createObjectURL(file);
  });
}

/** In-app camera recorder with a running timer against the job's minimum length. */
function Recorder({ minSec, onDone, disabled }: { minSec: number; onDone: (file: File, sec: number) => void; disabled: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const started = useRef(0);
  const lock = useRef<{ release: () => Promise<void> } | null>(null);
  const [state, setState] = useState<"idle" | "preview" | "recording">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (state !== "recording") return;
    const t = window.setInterval(() => setElapsed((Date.now() - started.current) / 1000), 500);
    return () => window.clearInterval(t);
  }, [state]);
  useEffect(() => () => stopStream(), []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    lock.current?.release().catch(() => {});
    lock.current = null;
  }

  async function openCamera() {
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setState("preview");
    } catch {
      setErr("We couldn't open the camera. Allow camera and microphone access, or use Upload file instead.");
    }
  }

  async function start() {
    const stream = streamRef.current;
    if (!stream) return;
    const type = ["video/mp4", "video/webm;codecs=vp9", "video/webm"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
    const rec = new MediaRecorder(stream, { mimeType: type || undefined, videoBitsPerSecond: 1_800_000 });
    chunks.current = [];
    rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    rec.onstop = () => {
      const sec = (Date.now() - started.current) / 1000;
      const mime = rec.mimeType || "video/webm";
      const file = new File(chunks.current, `scout-${Date.now()}.${mime.includes("mp4") ? "mp4" : "webm"}`, { type: mime });
      stopStream();
      setState("idle");
      onDone(file, sec);
    };
    rec.start(5000);
    recRef.current = rec;
    started.current = Date.now();
    setElapsed(0);
    setState("recording");
    try {
      lock.current = await (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request("screen") ?? null;
    } catch {
      /* the screen may dim; recording continues */
    }
  }

  const pct = Math.min(100, (elapsed / minSec) * 100);
  return (
    <div className="overflow-hidden rounded-3xl bg-ink text-white shadow-card">
      <div className="relative aspect-video bg-black">
        <video ref={videoRef} muted playsInline className={cn("h-full w-full object-cover", state === "idle" && "hidden")} />
        {state === "idle" && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div>
              <Camera className="mx-auto h-10 w-10 text-savanna-400" />
              <p className="mt-2 font-display font-semibold">Record with your phone camera</p>
              <p className="mt-1 text-xs text-white/60">Landscape, steady, natural sound. Keep the screen on and the phone charged.</p>
            </div>
          </div>
        )}
        {state === "recording" && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-maasai-500 px-2.5 py-1 font-display text-xs font-bold">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> REC {fmt(elapsed)}
          </span>
        )}
      </div>
      <div className="space-y-3 p-4">
        {state === "recording" && (
          <div>
            <div className="mb-1 flex justify-between text-xs text-white/70">
              <span>{elapsed >= minSec ? "Minimum reached. Stop whenever you're ready." : `Keep going: ${fmt(Math.max(0, minSec - elapsed))} to the minimum`}</span>
              <span>{fmt(minSec)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/15">
              <div className={cn("h-full rounded-full transition-all", elapsed >= minSec ? "bg-savanna-400" : "bg-ochre-400")} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
        {err && <p className="text-sm text-maasai-300">{err}</p>}
        <div className="flex flex-wrap gap-2">
          {state === "idle" && (
            <button type="button" disabled={disabled} onClick={openCamera} className="inline-flex h-11 items-center gap-2 rounded-full bg-savanna-500 px-5 font-display text-sm font-semibold disabled:opacity-50">
              <Camera className="h-4 w-4" /> Open camera
            </button>
          )}
          {state === "preview" && (
            <button type="button" onClick={start} className="inline-flex h-11 items-center gap-2 rounded-full bg-maasai-500 px-5 font-display text-sm font-semibold">
              <span className="h-3 w-3 rounded-full bg-white" /> Start recording
            </button>
          )}
          {state === "recording" && (
            <button type="button" onClick={() => recRef.current?.stop()} className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 font-display text-sm font-semibold text-ink">
              <Square className="h-4 w-4 fill-current" /> Stop and upload
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
