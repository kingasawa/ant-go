"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, doc, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { GLASS } from "@/lib/glass";

interface Build {
  id: string;
  status: string;
  step?: string;
  schemeName?: string;
  bundleId?: string;
  projectId?: string;
  errorMessage?: string;
  ipaUrl?: string;
  buildLogUrl?: string;
  distribution?: string;
  manifestUrl?: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
  startedAt?: string;
  completedAt?: string;
}

interface LogEntry { seq: number; step?: string; lines: string[] }

const STATUS_COLOR: Record<string, string> = {
  pending:     "bg-yellow-500/20 text-yellow-300 border-yellow-700",
  in_progress: "bg-blue-500/20 text-blue-300 border-blue-700",
  success:     "bg-green-500/20 text-green-300 border-green-700",
  failed:      "bg-red-500/20 text-red-300 border-red-700",
};

const STEP_LABEL: Record<string, string> = {
  initialising:   "Initialising",
  downloading:    "Downloading files",
  extracting:     "Extracting archive",
  npm_install:    "npm install",
  setup_certs:    "Setting up certificates",
  setup_fastlane: "Configuring Fastlane",
  bundle_install: "bundle install (Ruby gems)",
  fastlane_build: "Building with Fastlane / Xcode",
  uploading_ipa:  "Uploading IPA",
  done:           "Done",
  error:          "Build failed",
};

function formatDate(ts?: { seconds: number } | null) {
  if (!ts?.seconds) return "—";
  return new Date(ts.seconds * 1000).toLocaleString();
}

function formatMs(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

/* ─── Step parsing — dùng field `step` từ Firestore thay vì parse text ────── */
interface StepSection {
  id: string;
  label: string;
  status?: string;
  durationMs?: number;
  error?: string;
  lines: string[];
  ended: boolean;
  firstSeq: number;
}

const STEP_START_PREFIX = "##[STEP_START]";
const STEP_END_PREFIX   = "##[STEP_END]";

function groupLogsByStep(logs: LogEntry[]): { preLines: string[]; steps: StepSection[] } {
  const stepMap = new Map<string, StepSection>();
  const preLines: string[] = [];
  let currentStepId: string | null = null;

  for (const entry of logs) {
    for (const line of entry.lines) {
      if (line.startsWith(STEP_START_PREFIX)) {
        try {
          const meta = JSON.parse(line.slice(STEP_START_PREFIX.length).trim());
          currentStepId = meta.id;
          if (!stepMap.has(currentStepId!)) {
            stepMap.set(currentStepId!, {
              id:       currentStepId!,
              label:    meta.label || STEP_LABEL[currentStepId!] || currentStepId!,
              lines:    [],
              ended:    false,
              firstSeq: entry.seq,
            });
          }
        } catch { /* ignore */ }
      } else if (line.startsWith(STEP_END_PREFIX)) {
        try {
          const meta = JSON.parse(line.slice(STEP_END_PREFIX.length).trim());
          const section = stepMap.get(meta.id);
          if (section) {
            section.status     = meta.status;
            section.durationMs = meta.durationMs;
            section.error      = meta.error;
            section.ended      = true;
          }
        } catch { /* ignore */ }
      } else {
        if (currentStepId && stepMap.has(currentStepId)) {
          stepMap.get(currentStepId)!.lines.push(line);
        } else {
          preLines.push(line);
        }
      }
    }
  }

  const steps = Array.from(stepMap.values()).sort((a, b) => a.firstSeq - b.firstSeq);
  return { preLines, steps };
}

/* ─── Line color ─────────────────────────────────────────────────────────── */
function lineColor(line: string) {
  if (/error|fail|❌/i.test(line))          return "text-red-400";
  if (/warn|warning|⚠/i.test(line))        return "text-yellow-400";
  if (/success|✅|✔|done|succeed/i.test(line)) return "text-green-400";
  if (/\[RUN]|^\$\s/.test(line))           return "text-blue-300 font-semibold";
  return "text-gray-300";
}

/* ─── Elapsed timer ──────────────────────────────────────────────────────── */
function useElapsed(startSeconds?: number | null, stopped?: boolean) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startSeconds) return;
    const tick = () => setElapsed(Math.floor(Date.now() / 1000) - startSeconds);
    tick();
    if (stopped) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startSeconds, stopped]);

  return elapsed;
}

/* ─── StepBlock ──────────────────────────────────────────────────────────── */
function StepBlock({ step, isRunning, defaultOpen }: {
  step: StepSection; isRunning: boolean; defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => { if (isRunning) setOpen(true); }, [isRunning]);

  const borderColor =
    !step.ended && isRunning ? "border-blue-700/50"   :
    step.status === "success" ? "border-green-800/40"  :
    step.status === "failed"  ? "border-red-800/40"    :
    "border-gray-700/40";

  const headerBg =
    !step.ended && isRunning ? "bg-blue-950/50"   :
    step.status === "success" ? "bg-green-950/30"  :
    step.status === "failed"  ? "bg-red-950/30"    :
    "bg-gray-900/50";

  return (
    <div className={`rounded-lg border overflow-hidden mb-1.5 ${borderColor}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left ${headerBg} hover:brightness-110 transition`}
      >
        {/* Status icon */}
        {step.ended ? (
          step.status === "failed" ? (
            <span className="text-red-400 text-sm flex-shrink-0 leading-none">✖</span>
          ) : (
            <span className="text-green-400 text-sm flex-shrink-0 leading-none font-bold">✔</span>
          )
        ) : isRunning ? (
          <span className="w-3.5 h-3.5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin flex-shrink-0" />
        ) : (
          <span className="w-3 h-3 rounded-full bg-gray-600 flex-shrink-0" />
        )}

        <span className="flex-1 text-xs font-semibold text-gray-200 truncate">{step.label}</span>

        {step.durationMs != null && (
          <span className="text-[10px] text-gray-500 flex-shrink-0 mr-2">
            {formatMs(step.durationMs)}
          </span>
        )}

        <svg
          className={`w-3 h-3 text-gray-600 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="bg-gray-950 border-t border-gray-800/50 px-4 py-2">
          {step.lines.length === 0 && !step.error ? (
            <p className="text-gray-600 italic text-[11px] font-mono">No output.</p>
          ) : (
            step.lines.map((line, i) => (
              <div key={i} className={`whitespace-pre-wrap break-all text-[11px] leading-[18px] font-mono ${lineColor(line)}`}>
                {line || " "}
              </div>
            ))
          )}
          {step.error && (
            <div className="mt-1.5 pt-1.5 border-t border-red-900/40 text-red-400 text-[11px] font-mono">
              ✖ {step.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Parse raw build.log file from Storage ──────────────────────────────── */
function parseLogFile(text: string): { preLines: string[]; steps: StepSection[] } {
  const stepMap = new Map<string, StepSection>();
  const preLines: string[] = [];
  let currentStepId: string | null = null;
  let seq = 0;

  for (const line of text.split('\n')) {
    if (!line.trim()) continue;

    if (line.startsWith(STEP_START_PREFIX)) {
      try {
        const meta = JSON.parse(line.slice(STEP_START_PREFIX.length).trim());
        currentStepId = meta.id;
        if (!stepMap.has(currentStepId!)) {
          stepMap.set(currentStepId!, {
            id:       currentStepId!,
            label:    meta.label || STEP_LABEL[currentStepId!] || currentStepId!,
            lines:    [],
            ended:    false,
            firstSeq: seq++,
          });
        }
      } catch { /* ignore malformed marker */ }
    } else if (line.startsWith(STEP_END_PREFIX)) {
      try {
        const meta = JSON.parse(line.slice(STEP_END_PREFIX.length).trim());
        const section = stepMap.get(meta.id);
        if (section) {
          section.status     = meta.status;
          section.durationMs = meta.durationMs;
          section.error      = meta.error;
          section.ended      = true;
        }
      } catch { /* ignore malformed marker */ }
    } else {
      if (currentStepId && stepMap.has(currentStepId)) {
        stepMap.get(currentStepId)!.lines.push(line);
      } else {
        preLines.push(line);
      }
    }
  }

  const steps = Array.from(stepMap.values()).sort((a, b) => a.firstSeq - b.firstSeq);
  return { preLines, steps };
}

/* ─── Build Logs ─────────────────────────────────────────────────────────── */
function BuildLogs({ buildId, isActive, buildStatus }: {
  buildId: string;
  isActive: boolean;
  buildStatus: string | undefined;
}) {
  const [parsed, setParsed]     = useState<{ preLines: string[]; steps: StepSection[] }>({ preLines: [], steps: [] });
  const [loading, setLoading]   = useState(true);
  const [logError, setLogError] = useState<string | null>(null);

  // Live mode — onSnapshot khi build đang chạy
  useEffect(() => {
    if (!isActive) return;
    let entries: LogEntry[] = [];
    setLoading(true);
    setLogError(null);
    setParsed({ preLines: [], steps: [] });

    return onSnapshot(
      query(collection(db, "builds", buildId, "logs")),
      (snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type === "added") {
            const { seq, step, lines } = change.doc.data();
            if (!entries.find((l) => l.seq === seq)) {
              entries = [...entries, {
                seq,
                step,
                lines: Array.isArray(lines) ? lines : [String(lines)],
              }].sort((a, b) => a.seq - b.seq);
            }
          }
        });
        setParsed(groupLogsByStep(entries));
        setLoading(false);
      },
      (err) => { setLogError(err.message); setLoading(false); }
    );
  }, [buildId, isActive]);

  // Historical mode — chỉ chạy khi build đã done hẳn (success/failed)
  const isDoneStatus = buildStatus === "success" || buildStatus === "failed";
  useEffect(() => {
    if (!isDoneStatus) return;

    setLoading(true);
    setLogError(null);
    setParsed({ preLines: [], steps: [] });

    let cancelled = false;
    const delays = [2000, 4000, 8000, 15000]; // retry intervals ms

    async function fetchWithRetry(attempt: number) {
      if (cancelled) return;
      try {
        const r = await fetch(`/api/builds/${buildId}/log`);
        if (cancelled) return;
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          const msg: string = body.error ?? `HTTP ${r.status}`;
          if (attempt < delays.length && (r.status === 404 || msg.toLowerCase().includes("not available"))) {
            setTimeout(() => fetchWithRetry(attempt + 1), delays[attempt]);
            return;
          }
          if (!cancelled) { setLogError(msg); setLoading(false); }
          return;
        }
        const text = await r.text();
        if (!cancelled) { setParsed(parseLogFile(text)); setLoading(false); }
      } catch (err: unknown) {
        if (!cancelled) {
          setLogError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      }
    }

    fetchWithRetry(0);
    return () => { cancelled = true; };
  }, [buildId, isDoneStatus]);

  const { preLines, steps } = parsed;
  const allLines = useMemo(() => [...preLines, ...steps.flatMap((s) => s.lines)], [preLines, steps]);

  return (
    <div className="flex flex-col h-full">
      {/* Terminal chrome */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-t-xl border-b border-gray-700 flex-shrink-0">
        <span className="w-3 h-3 rounded-full bg-red-500/70" />
        <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <span className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-3 text-xs text-gray-400 font-mono">build log</span>
        {isActive && (
          <span className="ml-auto flex items-center gap-1.5 text-[10px] text-green-400 font-semibold uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live
          </span>
        )}
      </div>

      {/* Log content */}
      <div className="flex-1 overflow-y-auto bg-gray-950 rounded-b-xl p-4">
        {logError ? (
          <div className="text-red-400 text-xs font-mono">
            <p className="font-semibold mb-1">⚠ Không thể tải logs:</p>
            <p className="break-all">{logError}</p>
          </div>
        ) : loading && allLines.length === 0 ? (
          <div className="flex items-center gap-2 text-gray-500 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-pulse" />
            {isActive ? "Đang chờ logs..." : "Đang tải log file..."}
          </div>
        ) : allLines.length === 0 ? (
          <div className="text-gray-600 italic text-xs font-mono">Chưa có log nào.</div>
        ) : (
          <>
            {/* Pre-step lines */}
            {preLines.map((line, i) => (
              <div key={i} className={`whitespace-pre-wrap break-all text-[11px] leading-[18px] font-mono mb-0.5 ${lineColor(line)}`}>
                {line || " "}
              </div>
            ))}

            {preLines.length > 0 && steps.length > 0 && (
              <div className="my-3 border-t border-gray-800" />
            )}

            {/* Step sections */}
            {steps.map((step, idx) => {
              const stepIsRunning = isActive && !step.ended;
              return (
                <StepBlock
                  key={`${step.id}-${idx}`}
                  step={step}
                  isRunning={stepIsRunning}
                  defaultOpen={stepIsRunning || idx === steps.length - 1}
                />
              );
            })}

            {isActive && (
              <div className="mt-2">
                <span className="inline-block w-2 h-3 bg-gray-500 animate-pulse rounded-sm" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Install Tab (internal distribution) ───────────────────────────────── */
function InstallTab({ build }: { build: Build }) {
  const installUrl = `itms-services://?action=download-manifest&url=${encodeURIComponent(build.manifestUrl!)}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(installUrl)}`;
  const isDevClient = build.step === "done"; // truthy proxy — ideally store developmentClient field

  return (
    <div className="space-y-6 overflow-y-auto pb-4">
      {/* QR card */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col sm:flex-row gap-8 items-center">
        <div className="flex-shrink-0 bg-white rounded-xl p-2 shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrSrc} alt="Install QR code" width={220} height={220} className="rounded-lg" />
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-gray-200">Cài app lên device</p>
          <ol className="space-y-2 text-sm text-gray-400 list-none">
            {[
              "Mở Camera app trên iPhone",
              "Quét QR code bên trái",
              "Nhấn vào thông báo hiện lên → iOS sẽ hỏi cài app",
              "Nhấn Install → chờ cài xong",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <a
            href={installUrl}
            className="mt-1 inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Hoặc nhấn link cài thẳng (trên iPhone)
          </a>
        </div>
      </div>

      {/* Metro instructions (dev client) */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Chạy Metro sau khi cài app</p>
        <p className="text-xs text-gray-500 mb-3">
          App này dùng <span className="text-gray-300 font-mono">expo-dev-client</span> — cần Metro đang chạy trên máy để load JS bundle.
        </p>
        <code className="block bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-sm text-indigo-300 font-mono select-all">
          npx expo start --dev-client
        </code>
        <p className="text-xs text-gray-600 mt-2">
          Mở app trên device → nhập địa chỉ Metro (hoặc app tự phát hiện qua LAN).
        </p>
      </div>

      {/* Download IPA */}
      {build.ipaUrl && (
        <div className="flex items-center gap-3 text-xs text-gray-500 px-1">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            Cần cài thủ công?{" "}
            <a href={build.ipaUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
              Download .ipa
            </a>{" "}
            rồi dùng Apple Configurator 2 hoặc Xcode.
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── Build Detail Page ──────────────────────────────────────────────────── */
export default function BuildDetailPage() {
  const { appName, buildId } = useParams<{ appName: string; buildId: string }>();
  const router = useRouter();
  const [build, setBuild]     = useState<Build | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [buildLoading, setBuildLoading] = useState(true);
  const [tab, setTab]           = useState<"logs" | "info" | "install">("logs");

  useEffect(() => {
    setBuildLoading(true);
    setBuildError(null);
    return onSnapshot(
      doc(db, "builds", buildId),
      (snap) => {
        setBuildLoading(false);
        if (snap.exists()) {
          setBuild({ id: snap.id, ...snap.data() } as Build);
        } else {
          setBuildError(`Build "${buildId}" không tồn tại.`);
        }
      },
      (err) => {
        setBuildLoading(false);
        setBuildError(err.message);
      }
    );
  }, [buildId]);

  const isActive       = build?.status === "in_progress" || build?.status === "pending";
  const isDone         = build?.status === "success" || build?.status === "failed";
  const canRebuild     = build?.status === "success" || (build?.status === "failed" && build?.step === "error");
  const isInternal     = build?.distribution === "internal";
  const showInstallTab = isInternal && build?.status === "success" && !!build?.manifestUrl;
  const elapsed        = useElapsed(build?.createdAt?.seconds, isDone);

  // ── Server & build heartbeat ────────────────────────────────────────────
  const SERVER_DEAD_MS  = 90_000;
  const BUILD_WARN_MS   = 2 * 60_000;  // 2 phút → hiện cảnh báo
  const BUILD_FAIL_MS   = 5 * 60_000;  // 5 phút → auto set failed

  const [serverStatus, setServerStatus] = useState<"online" | "offline" | "unknown">("unknown");
  const [buildHanging, setBuildHanging] = useState(false);

  // Lắng nghe trạng thái server
  useEffect(() => {
    return onSnapshot(doc(db, "server_status", "mac_builder"), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const lastHb = data?.lastHeartbeat?.toMillis?.();
      const isAlive = data?.alive && lastHb && (Date.now() - lastHb < SERVER_DEAD_MS);
      setServerStatus(isAlive ? "online" : "offline");
    });
  }, []);

  // Lắng nghe heartbeat của build đang chạy — warn sau 2p, auto-fail sau 5p
  useEffect(() => {
    if (!isActive || build?.status !== "in_progress") {
      setBuildHanging(false);
      return;
    }
    const check = async () => {
      const lastHb = (build as any)?.lastHeartbeat?.toMillis?.();
      if (!lastHb) return;
      const elapsed = Date.now() - lastHb;
      if (elapsed > BUILD_FAIL_MS) {
        // Auto mark failed
        await fetch(`/api/builds/${buildId}/mark-failed`, { method: "POST" });
      } else if (elapsed > BUILD_WARN_MS) {
        setBuildHanging(true);
      } else {
        setBuildHanging(false);
      }
    };
    check();
    const id = setInterval(check, 15_000);
    return () => clearInterval(id);
  }, [build, isActive, buildId]);

  const isStuck = buildHanging || (build?.status === "in_progress" && serverStatus === "offline");

  const [showConfirm, setShowConfirm]         = useState(false);
  const [rebuilding, setRebuilding]           = useState(false);
  const [warnDismissed, setWarnDismissed]     = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting]               = useState(false);

  // Reset cảnh báo khi isStuck chuyển sang false rồi lại true
  useEffect(() => {
    if (!isStuck) setWarnDismissed(false);
  }, [isStuck]);

  async function handleRebuild() {
    if (!buildId) return;
    setRebuilding(true);
    setWarnDismissed(true);
    try {
      const r = await fetch(`/api/builds/${buildId}/rebuild`, { method: "POST" });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${r.status}`);
      }
    } catch (err: unknown) {
      console.error("Rebuild failed:", err);
    } finally {
      setRebuilding(false);
      setShowConfirm(false);
    }
  }

  async function handleDelete() {
    if (!buildId) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/builds/${buildId}`, { method: "DELETE" });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${r.status}`);
      }
      router.push(`/account/app/${appName}/builds`);
    } catch (err: unknown) {
      console.error("Delete failed:", err);
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  const infoRows = build ? [
    { label: "Job ID",       value: <span className="font-mono text-xs">{build.id}</span> },
    { label: "Status",       value: <span className={`inline-block border text-xs font-semibold px-2 py-0.5 rounded-full uppercase ${STATUS_COLOR[build.status] ?? ""}`}>{build.status}</span> },
    { label: "Current Step", value: build.step ? (STEP_LABEL[build.step] ?? build.step) : "—" },
    { label: "App Scheme",   value: build.schemeName ?? "—" },
    { label: "Bundle ID",    value: <span className="font-mono text-xs">{build.bundleId ?? "—"}</span> },
    { label: "Project ID",   value: <span className="font-mono text-xs">{build.projectId ?? "—"}</span> },
    { label: "Created",      value: formatDate(build.createdAt) },
    { label: "Started",      value: build.startedAt ?? "—" },
    { label: "Completed",    value: build.completedAt ?? "—" },
    ...(build.errorMessage ? [{ label: "Error", value: <span className="text-red-500 text-xs">{build.errorMessage}</span> }] : []),
  ] : [];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 flex-shrink-0 flex-wrap">
        <Link
          href={`/account/app/${appName}/builds`}
          className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Builds
        </Link>
        <span className="text-white/30">/</span>
        <span className="text-sm font-mono text-white/50 truncate max-w-[180px]">{buildId}</span>

        {buildLoading && (
          <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-transparent animate-spin" />
        )}

        {build && (
          <span className={`inline-block border text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${STATUS_COLOR[build.status] ?? "bg-white/10 text-white/60 border-white/20"}`}>
            {build.status}
          </span>
        )}

        {isActive && (
          <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live
          </span>
        )}

        {serverStatus !== "unknown" && (
          <span className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ${serverStatus === "online" ? "text-green-400" : "text-red-400"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${serverStatus === "online" ? "bg-green-400" : "bg-red-400 animate-pulse"}`} />
            Server {serverStatus === "online" ? "Online" : "Offline"}
          </span>
        )}

        <div className="ml-auto flex items-center gap-3">
          {canRebuild && (
            <button
              onClick={() => setShowConfirm(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Rebuild
            </button>
          )}
          {build && !isActive && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-700/80 hover:bg-red-600 text-white transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Xoá build
            </button>
          )}
          {build?.createdAt?.seconds && (
            <span className="flex items-center gap-1.5 text-xs text-white/50 font-mono">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatMs(elapsed * 1000)}
              {isActive && <span className="text-green-400 animate-pulse ml-0.5">·</span>}
            </span>
          )}
        </div>
      </div>

      {/* Build doc error */}
      {buildError && (
        <div className="mb-4 rounded-xl px-4 py-3" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <p className="text-sm font-semibold text-red-300 mb-1">⚠ Không thể tải build</p>
          <p className="text-xs text-red-300/70 font-mono break-all">{buildError}</p>
        </div>
      )}

      {/* Pending notice */}
      {build?.status === "pending" && (
        <div className="mb-4 flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "rgba(234,179,8,0.12)", border: "1px solid rgba(234,179,8,0.3)" }}>
          <span className="w-4 h-4 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin flex-shrink-0" />
          <p className="text-sm text-yellow-300">
            Đang chờ Mac build server nhận job...
          </p>
        </div>
      )}

      {/* Stuck build warning */}
      {isStuck && !warnDismissed && (
        <div className="mb-4 flex items-start gap-3 rounded-xl px-4 py-3" style={{ background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.3)" }}>
          <svg className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-semibold text-orange-300 mb-0.5">Build có thể bị treo</p>
            <p className="text-xs text-orange-300/70">
              {serverStatus === "offline"
                ? "Mac build server không còn online. Build có thể đã bị gián đoạn."
                : "Build server không phản hồi trong hơn 2 phút. Build có thể đã bị treo hoặc crash."}
            </p>
          </div>
          <button
            onClick={() => setWarnDismissed(true)}
            className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-orange-700/60 hover:bg-orange-700 text-orange-200 transition"
          >
            Ẩn cảnh báo
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex mb-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
        {(["logs", showInstallTab ? "install" : null, "info"] as const).filter(Boolean).map((t) => (
          <button
            key={t!}
            onClick={() => setTab(t as "logs" | "info" | "install")}
            className={`py-2.5 mr-6 text-xs font-semibold uppercase tracking-wide border-b-2 transition -mb-px ${
              tab === t
                ? "border-indigo-400 text-indigo-300"
                : "border-transparent text-white/40 hover:text-white/70"
            }`}
          >
            {t === "logs" ? "Logs" : t === "install" ? "Install" : "Info"}
          </button>
        ))}
      </div>

      {tab === "logs" ? (
        <div className="flex-1 min-h-0">
          <BuildLogs buildId={buildId} isActive={isActive} buildStatus={build?.status} />
        </div>
      ) : tab === "install" && build?.manifestUrl ? (
        <InstallTab build={build} />
      ) : (
        <div className="space-y-5 overflow-y-auto">
          {buildLoading ? (
            <div className="text-center py-16 text-white/40 animate-pulse text-sm">Đang tải...</div>
          ) : (
            <>
              <div className="rounded-2xl overflow-hidden divide-y divide-white/10" style={GLASS}>
                {infoRows.map((r) => (
                  <div key={r.label} className="flex items-start justify-between gap-4 px-5 py-3.5">
                    <span className="text-xs text-white/50 flex-shrink-0 pt-0.5 w-28">{r.label}</span>
                    <span className="text-sm text-white/90 text-right">{r.value}</span>
                  </div>
                ))}
              </div>
              {build?.ipaUrl && build?.distribution !== "internal" && (
                <div className="rounded-2xl p-5" style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)" }}>
                  <p className="text-xs font-semibold text-green-300 uppercase tracking-wider mb-3">📦 Artifact</p>
                  <a href={build.ipaUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-green-300 hover:underline"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download .ipa
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4" style={GLASS}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-white">Xoá build?</h3>
            </div>
            <p className="text-xs text-white/60 mb-5 leading-relaxed">
              Build <span className="text-white font-mono">{buildId}</span> và toàn bộ logs sẽ bị xoá vĩnh viễn. Hành động này <span className="text-red-400 font-semibold">không thể hoàn tác</span>.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeleteConfirm(false)} disabled={deleting}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-white/70 hover:bg-white/10 transition disabled:opacity-50"
                style={{ border: "1px solid rgba(255,255,255,0.2)" }}>Huỷ</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-red-700 hover:bg-red-600 text-white transition disabled:opacity-60">
                {deleting ? (<><span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />Đang xoá...</>) : "Xoá"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rebuild confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4" style={GLASS}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-white">Xác nhận Rebuild</h3>
            </div>
            <p className="text-xs text-white/60 mb-5 leading-relaxed">
              Build này sẽ được đặt lại về trạng thái <span className="text-yellow-400 font-semibold">pending</span> và Mac build server sẽ tự động nhận job. Bạn có chắc muốn tiếp tục?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowConfirm(false)} disabled={rebuilding}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-white/70 hover:bg-white/10 transition disabled:opacity-50"
                style={{ border: "1px solid rgba(255,255,255,0.2)" }}>Huỷ</button>
              <button onClick={handleRebuild} disabled={rebuilding}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-60">
                {rebuilding ? (<><span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />Đang xử lý...</>) : "Rebuild"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

