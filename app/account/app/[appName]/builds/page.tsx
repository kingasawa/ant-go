"use client";
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, query, where, onSnapshot, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
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
  createdAt?: { seconds: number } | null;
  updatedAt?: { seconds: number } | null;
  startedAt?: string;
  completedAt?: string;
}

function formatDuration(build: Build): string {
  const start = build.createdAt?.seconds;
  if (!start) return "—";
  const isDone = build.status === "success" || build.status === "failed";
  const endSec = isDone ? (build.updatedAt?.seconds ?? start) : Math.floor(Date.now() / 1000);
  const ms = (endSec - start) * 1000;
  if (ms < 1000) return "<1s";
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

const STATUS_COLOR: Record<string, string> = {
  pending:     "bg-yellow-500/20 text-yellow-300 border-yellow-700",
  in_progress: "bg-blue-500/20 text-blue-300 border-blue-700",
  success:     "bg-green-500/20 text-green-300 border-green-700",
  failed:      "bg-red-500/20 text-red-300 border-red-700",
};

const STEP_COLOR: Record<string, string> = {
  pending:     "text-yellow-500 dark:text-yellow-300",
  in_progress: "text-blue-500 dark:text-blue-300",
  success:     "text-green-500 dark:text-green-300",
  failed:      "text-red-500 dark:text-red-300",
};

const STEP_LABEL: Record<string, string> = {
  initialising:   "Initialising",
  downloading:    "Downloading files",
  extracting:     "Extracting archive",
  npm_install:    "npm install",
  setup_certs:    "Setting up certificates",
  setup_fastlane: "Configuring Fastlane",
  pod_install:    "pod install",
  building:       "Building with Fastlane",
  uploading:      "Uploading artifact",
};

function formatDate(build: Build) {
  const ts = build.createdAt?.seconds;
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleString();
}

/* ─── Build Logs ───────────────────────────────────────────────────────────── */
interface LogEntry { seq: number; lines: string[] }

function BuildLogs({ buildId, isActive }: { buildId: string; isActive: boolean }) {
  const [logs, setLogs]       = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const bottomRef             = useRef<HTMLDivElement>(null);
  const autoScroll            = useRef(true);
  const containerRef          = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLogs([]);
    setLoading(true);
    const q = query(
      collection(db, "builds", buildId, "logs"),
      orderBy("seq", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          const { seq, lines } = change.doc.data();
          setLogs((prev) => {
            if (prev.find((l) => l.seq === seq)) return prev;
            return [...prev, { seq, lines }].sort((a, b) => a.seq - b.seq);
          });
        }
      });
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [buildId]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Detect manual scroll up → pause auto-scroll
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    autoScroll.current = scrollHeight - scrollTop - clientHeight < 40;
  };

  const allLines = useMemo(() => logs.flatMap((e) => e.lines), [logs]);

  if (loading && allLines.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 text-xs text-gray-500">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse" />
        Đang chờ logs...
      </div>
    );
  }

  if (!loading && allLines.length === 0) {
    return (
      <div className="px-4 py-3 text-xs text-gray-500 italic">
        Chưa có log nào.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="overflow-y-auto max-h-[420px] bg-gray-950 rounded-xl p-4 font-mono text-[11px] leading-5 text-gray-200 space-y-0"
    >
      {allLines.map((line, i) => (
        <div key={i} className={`whitespace-pre-wrap break-all ${
          /error|fail|❌/i.test(line) ? "text-red-400" :
          /warn|⚠/i.test(line)       ? "text-yellow-400" :
          /success|✅|✔|done/i.test(line) ? "text-green-400" :
          /^\s*\$|▸|→/.test(line)    ? "text-blue-300" :
          "text-gray-200"
        }`}>{line || " "}</div>
      ))}
      {isActive && (
        <div className="flex items-center gap-1.5 mt-1 text-gray-500">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-pulse" />
          <span>đang chạy...</span>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

/* ─── Build Row ────────────────────────────────────────────────────────────── */
const BuildRow = React.memo(function BuildRow({ build, onClick, checked, onCheck, removing }: {
  build: Build;
  onClick: (b: Build) => void;
  checked: boolean;
  onCheck: (id: string, checked: boolean) => void;
  removing: boolean;
}) {
  return (
    <tr
      onClick={() => onClick(build)}
      className={`transition-all duration-300 cursor-pointer ${
        removing
          ? "opacity-0 scale-y-0 h-0 overflow-hidden"
          : checked
          ? "bg-indigo-950/30"
          : "hover:bg-white/10"
      }`}
    >
      <td className="pl-4 pr-2 py-3 text-center w-10" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheck(build.id, e.target.checked)}
          className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 accent-indigo-500 cursor-pointer"
        />
      </td>
      <td className="px-4 py-3 font-mono text-xs text-white/60 max-w-[120px] truncate">{build.id}</td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-block border text-xs font-semibold px-2 py-0.5 rounded-full uppercase ${STATUS_COLOR[build.status] ?? "bg-white/10 text-white/60 border-white/20"}`}>
          {build.status}
        </span>
      </td>
      <td className={`px-4 py-3 text-xs text-center uppercase ${STEP_COLOR[build.status] ?? "text-white/40"}`}>
        {build.step ? (STEP_LABEL[build.step] ?? build.step) : "—"}
      </td>
      <td className="px-4 py-3 text-white/50 text-xs whitespace-nowrap">{formatDate(build)}</td>
      <td className="px-4 py-3 text-white/50 text-xs font-mono whitespace-nowrap">{formatDuration(build)}</td>
      <td className="px-4 py-3">
        {build.ipaUrl ? (
          <span className="inline-flex items-center gap-1 text-green-400 text-xs font-medium">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            IPA ready
          </span>
        ) : build.status === "failed" && build.errorMessage ? (
          <span className="text-red-400 text-xs">⚠ Error</span>
        ) : (
          <span className="text-white/25 text-xs">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs">
        {build.ipaUrl ? (
          <a
            href={build.ipaUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center text-indigo-400 hover:text-indigo-300 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>
        ) : (
          <span className="text-white/25">—</span>
        )}
      </td>
    </tr>
  );
});

/* ─── Builds Page ──────────────────────────────────────────────────────────── */
export default function AppBuildsPage() {
  const { appName } = useParams<{ appName: string }>();
  const decodedName = decodeURIComponent(appName);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [builds, setBuilds] = useState<Build[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;

    const CACHE_KEY = `projectId:${user.uid}:${decodedName}`;

    const subscribeBuilds = (projectId: string) => {
      localStorage.setItem(CACHE_KEY, projectId);
      if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }

      const q = query(collection(db, "builds"), where("projectId", "==", projectId));
      unsubRef.current = onSnapshot(q, (snap) => {
        setBuilds((prev) => {
          let next = [...prev];
          snap.docChanges().forEach((change) => {
            const doc = { id: change.doc.id, ...change.doc.data() } as Build;
            if (change.type === "added") {
              if (!next.find((b) => b.id === doc.id)) next.push(doc);
            } else if (change.type === "modified") {
              next = next.map((b) => b.id === doc.id ? doc : b);
            } else if (change.type === "removed") {
              next = next.filter((b) => b.id !== doc.id);
              setRemovingIds((prev) => { const s = new Set(prev); s.delete(doc.id); return s; });
            }
          });
          return next.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
        });
        setDataLoading(false);
        setIsLive(true);
      }, (err) => {
        setError(err.message);
        setDataLoading(false);
        setIsLive(false);
      });
    };

    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      subscribeBuilds(cached);
      getDocs(query(collection(db, "apps"), where("userId", "==", user.uid), where("name", "==", decodedName)))
        .then((snap) => { if (!snap.empty && snap.docs[0].id !== cached) subscribeBuilds(snap.docs[0].id); })
        .catch(() => {});
    } else {
      getDocs(query(collection(db, "apps"), where("userId", "==", user.uid), where("name", "==", decodedName)))
        .then((snap) => {
          if (snap.empty) { setError("Không tìm thấy app."); setDataLoading(false); return; }
          subscribeBuilds(snap.docs[0].id);
        })
        .catch(() => { setError("Lỗi khi tải dữ liệu."); setDataLoading(false); });
    }

    return () => { if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; } };
  }, [user, authLoading, decodedName]);

  const filteredBuilds = useMemo(
    () => statusFilter === "all" ? builds : builds.filter((b) => b.status === statusFilter),
    [builds, statusFilter]
  );

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  // Reset về trang 1 khi đổi filter
  useEffect(() => { setPage(1); }, [statusFilter]);

  const totalPages   = Math.max(1, Math.ceil(filteredBuilds.length / PAGE_SIZE));
  const pagedBuilds  = filteredBuilds.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleRowClick = useCallback((build: Build) => {
    router.push(`/account/app/${appName}/builds/${build.id}`);
  }, [router, appName]);

  const [deleteTarget, setDeleteTarget]       = useState<Build | null>(null);
  const [deleting, setDeleting]               = useState(false);
  const [selectedIds, setSelectedIds]         = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting]       = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [removingIds, setRemovingIds]         = useState<Set<string>>(new Set());

  // Reset selection khi đổi filter / trang
  useEffect(() => { setSelectedIds(new Set()); }, [statusFilter, page]);

  const handleCheck = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  }, []);

  const allPageSelected  = pagedBuilds.length > 0 && pagedBuilds.every((b) => selectedIds.has(b.id));
  const somePageSelected = pagedBuilds.some((b) => selectedIds.has(b.id));

  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pagedBuilds.forEach((b) => checked ? next.add(b.id) : next.delete(b.id));
      return next;
    });
  }, [pagedBuilds]);

  // Hiệu ứng fade-out: set removingIds → chờ 300ms → gọi API
  const triggerDelete = useCallback(async (ids: string[], afterDelete: () => Promise<void>) => {
    setRemovingIds(new Set(ids));
    await new Promise((r) => setTimeout(r, 300));
    await afterDelete();
    // Không clear removingIds ở đây — sẽ clear từng id khi Firestore onSnapshot báo "removed"
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    setShowBulkConfirm(false);
    const ids = [...selectedIds];
    await triggerDelete(ids, async () => {
      await fetch("/api/builds/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      setSelectedIds(new Set());
    });
    setBulkDeleting(false);
  }, [selectedIds, triggerDelete]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteTarget(null);
    await triggerDelete([deleteTarget.id], async () => {
      await fetch(`/api/builds/${deleteTarget.id}`, { method: "DELETE" });
    });
    setDeleting(false);
  }, [deleteTarget, triggerDelete]);

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Builds</h1>
          {isLive && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] font-semibold uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </span>
          )}
        </div>
        <p className="text-white/50 text-sm mt-1">
          {decodedName}{" · "}
          <span className="text-indigo-300">{builds.length} builds</span>
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-xl px-4 py-3" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <p className="text-sm font-semibold text-red-300 mb-1">⚠ Failed to load builds</p>
          <p className="text-xs text-red-300/70 font-mono break-all">{error}</p>
        </div>
      )}

      {/* Status filter + bulk action */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {["all", "pending", "in_progress", "success", "failed"].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wide transition border
              ${statusFilter === s
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white/10 text-white/60 border-white/20 hover:border-white/40"
              }`}
          >
            {s === "all" ? "All" : s.replace("_", " ")}
            <span className="ml-1.5 opacity-70">
              {s === "all" ? builds.length : builds.filter((b) => b.status === s).length}
            </span>
          </button>
        ))}

        {selectedIds.size > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-white/40 font-medium">
              {selectedIds.size} build{selectedIds.size > 1 ? "s" : ""} được chọn
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-white/50 hover:text-white/80 transition"
            >
              Bỏ chọn
            </button>
            <button
              onClick={() => setShowBulkConfirm(true)}
              disabled={bulkDeleting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-700 hover:bg-red-600 text-white transition disabled:opacity-60"
            >
              {bulkDeleting ? (
                <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
              Xoá
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      {dataLoading ? (
        <div className="text-white/40 animate-pulse text-center py-16">Loading builds…</div>
      ) : filteredBuilds.length === 0 ? (
        <div className="text-center py-24 text-white/40">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-lg">No builds yet.</p>
          <p className="text-sm mt-2">Build jobs will appear here once the server picks them up.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl" style={GLASS}>
          <table className="w-full text-[11px]">
            <thead className="text-white/50 uppercase text-xs tracking-wider" style={{ background: "rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <tr>
                <th className="pl-4 pr-2 py-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    ref={(el) => { if (el) el.indeterminate = somePageSelected && !allPageSelected; }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 accent-indigo-500 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-left">Job ID</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Step</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-left">Duration</th>
                <th className="px-4 py-3 text-left">Artifact</th>
                <th className="px-4 py-3 text-left">IPA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {pagedBuilds.map((build) => (
                <BuildRow
                  key={build.id}
                  build={build}
                  onClick={handleRowClick}
                  checked={selectedIds.has(build.id)}
                  onCheck={handleCheck}
                  removing={removingIds.has(build.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!dataLoading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-white/40">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredBuilds.length)} / {filteredBuilds.length} builds
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1 text-xs rounded-lg border border-white/20 text-white/50 hover:border-white/40 disabled:opacity-30 disabled:cursor-not-allowed transition">«</button>
            <button onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="px-2 py-1 text-xs rounded-lg border border-white/20 text-white/50 hover:border-white/40 disabled:opacity-30 disabled:cursor-not-allowed transition">‹</button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === "…" ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-xs text-white/30">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition ${
                      page === p
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "border-white/20 text-white/50 hover:border-white/40"
                    }`}
                  >{p}</button>
                )
              )}

            <button onClick={() => setPage((p) => p + 1)} disabled={page === totalPages} className="px-2 py-1 text-xs rounded-lg border border-white/20 text-white/50 hover:border-white/40 disabled:opacity-30 disabled:cursor-not-allowed transition">›</button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2 py-1 text-xs rounded-lg border border-white/20 text-white/50 hover:border-white/40 disabled:opacity-30 disabled:cursor-not-allowed transition">»</button>
          </div>
        </div>
      )}

      {/* Bulk delete confirm modal */}
      {showBulkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4" style={GLASS}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-white">Xoá {selectedIds.size} build{selectedIds.size > 1 ? "s" : ""}?</h3>
            </div>
            <p className="text-xs text-white/60 mb-5 leading-relaxed">
              Toàn bộ <span className="text-white font-semibold">{selectedIds.size}</span> build và logs liên quan sẽ bị xoá vĩnh viễn. Hành động này <span className="text-red-400 font-semibold">không thể hoàn tác</span>.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowBulkConfirm(false)}
                disabled={bulkDeleting}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-white/70 hover:bg-white/10 transition disabled:opacity-50"
                style={{ border: "1px solid rgba(255,255,255,0.2)" }}
              >Huỷ</button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-red-700 hover:bg-red-600 text-white transition disabled:opacity-60"
              >
                {bulkDeleting ? (
                  <><span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />Đang xoá...</>
                ) : "Xoá"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
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
              Build <span className="text-white font-mono">{deleteTarget.id}</span> và toàn bộ logs sẽ bị xoá vĩnh viễn. Hành động này <span className="text-red-400 font-semibold">không thể hoàn tác</span>.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-white/70 hover:bg-white/10 transition disabled:opacity-50"
                style={{ border: "1px solid rgba(255,255,255,0.2)" }}
              >Huỷ</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-red-700 hover:bg-red-600 text-white transition disabled:opacity-60"
              >
                {deleting ? (
                  <><span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />Đang xoá...</>
                ) : "Xoá"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
