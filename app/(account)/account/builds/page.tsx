"use client";
import { useEffect, useState, useRef } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { GLASS, MODAL_BG } from "@/lib/glass";
import PageLoader from "@/app/components/PageLoader";

export interface Build {
  id: string;
  projectId?: string;
  userId?: string;
  status: string;
  step?: string;
  createdAt?: { seconds: number } | null;
  startedAt?: string;
  completedAt?: string;
  bundleId?: string;
  schemeName?: string;
  ipaUrl?: string;
  errorMessage?: string;
}

interface AppOption {
  id: string;
  name: string;
}

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
  pod_install:    "pod install",
  building:       "Building with Fastlane",
  uploading:      "Uploading artifact",
};

function formatDate(build: Build) {
  const ts = build.createdAt?.seconds;
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleString();
}


/* ─── Build Detail Drawer ─────────────────────────────────────────────────── */
function BuildDetailDrawer({ build, onClose }: { build: Build; onClose: () => void }) {
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Job ID",       value: <span className="font-mono text-xs">{build.id}</span> },
    { label: "Status",       value: <span className={`inline-block border text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[build.status] ?? "bg-white/10 text-white/60 border-white/20"}`}>{build.status}</span> },
    { label: "Current Step", value: build.step ? (STEP_LABEL[build.step] ?? build.step) : "—" },
    { label: "App Scheme",   value: build.schemeName ?? "—" },
    { label: "Bundle ID",    value: <span className="font-mono text-xs">{build.bundleId ?? "—"}</span> },
    { label: "Project ID",   value: <span className="font-mono text-xs">{build.projectId ?? "—"}</span> },
    { label: "Created",      value: formatDate(build) },
    { label: "Started",      value: build.startedAt ?? "—" },
    { label: "Completed",    value: build.completedAt ?? "—" },
    ...(build.errorMessage ? [{ label: "Error", value: <span className="text-red-400 text-xs">{build.errorMessage}</span> }] : []),
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md flex flex-col" style={MODAL_BG}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
          <h2 className="text-base font-semibold text-white">Build Detail</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white transition p-1 rounded-lg hover:bg-white/10">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div className="rounded-2xl overflow-hidden divide-y" style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.1)" }}>
            {rows.map((r) => (
              <div key={r.label} className="flex items-start justify-between gap-4 px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                <span className="text-xs text-white/50 flex-shrink-0 pt-0.5">{r.label}</span>
                <span className="text-sm text-white/90 text-right">{r.value}</span>
              </div>
            ))}
          </div>
          {build.ipaUrl && (
            <div className="rounded-2xl p-4" style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)" }}>
              <p className="text-xs font-semibold text-green-300 uppercase tracking-wider mb-3">📦 Artifact</p>
              <a href={build.ipaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-green-300 hover:underline mb-3">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download .ipa
              </a>
              <button onClick={() => setShowConfirm(true)} className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent text-accent-contrast text-sm font-semibold py-2.5 rounded-xl transition">
                🚀 Submit to App Store Connect
              </button>
            </div>
          )}
        </div>
      </aside>
      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowConfirm(false)} />
          <div className="relative rounded-2xl w-full max-w-sm p-6 text-center" style={MODAL_BG}>
            <div className="text-4xl mb-3">🚀</div>
            <h3 className="text-base font-bold text-white mb-2">Submit to App Store Connect</h3>
            <p className="text-sm text-white/60 mb-6">
              Hành động này sẽ submit bản build{" "}
              <strong className="text-white">{build.schemeName ?? build.id}</strong>{" "}
              lên <strong className="text-white">Apple App Store Connect</strong> để review.
              Bạn có chắc chắn muốn tiếp tục?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 transition" style={{ border: "1px solid rgba(255,255,255,0.2)" }}>Cancel</button>
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent text-accent-contrast text-sm font-semibold transition">OK</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Builds Page ─────────────────────────────────────────────────────────── */
export default function BuildsPage() {
  const { user } = useAuth();
  const [apps, setApps] = useState<AppOption[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>("all");
  const [builds, setBuilds] = useState<Build[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [selectedBuild, setSelectedBuild] = useState<Build | null>(null);

  // Cleanup ref cho builds listener khi selectedAppId thay đổi
  const buildsUnsubRef = useRef<(() => void) | null>(null);

  // Load danh sách apps của user
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "apps"), where("userId", "==", user.uid));
    return onSnapshot(q, (snap) => {
      setApps(snap.docs.map((d) => ({ id: d.id, name: d.data().name as string })));
    }, () => {});
  }, [user]);

  // Load builds theo app được chọn — realtime
  useEffect(() => {
    if (!user || apps.length === 0) return;

    // Cleanup listener cũ
    if (buildsUnsubRef.current) { buildsUnsubRef.current(); buildsUnsubRef.current = null; }
    setDataLoading(true);
    setBuilds([]);
    setError(null);

    let q;
    if (selectedAppId === "all") {
      // Tất cả apps của user — dùng "in" với danh sách projectId
      const allIds = apps.map((a) => a.id);
      // Firestore "in" tối đa 30 — nếu > 30 sẽ cần chunk, tạm thời slice 30
      q = query(collection(db, "builds"), where("projectId", "in", allIds.slice(0, 30)));
    } else {
      q = query(collection(db, "builds"), where("projectId", "==", selectedAppId));
    }

    buildsUnsubRef.current = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Build));
        data.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
        setBuilds(data);
        setDataLoading(false);
      },
      (err) => { setError(err.message); setDataLoading(false); }
    );

    return () => {
      if (buildsUnsubRef.current) { buildsUnsubRef.current(); buildsUnsubRef.current = null; }
    };
  }, [user, selectedAppId, apps]);

  const filteredBuilds = statusFilter === "all"
    ? builds
    : builds.filter((b) => b.status === statusFilter);

  const selectedApp = apps.find((a) => a.id === selectedAppId);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Builds</h1>
          <p className="text-white/50 text-sm mt-1">
            {selectedAppId === "all" ? "Tất cả apps" : selectedApp?.name ?? selectedAppId}
            {" · "}
            <span className="text-accent-light">{builds.length} builds</span>
          </p>
        </div>

        {/* App selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40 flex-shrink-0">App:</span>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedAppId("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition border
                ${selectedAppId === "all"
                  ? "bg-accent text-accent-contrast border-accent"
                  : "bg-white/10 text-white/60 border-white/20 hover:border-white/40"
                }`}
            >
              All
            </button>
            {apps.map((app) => (
              <button
                key={app.id}
                onClick={() => setSelectedAppId(app.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition border
                  ${selectedAppId === app.id
                    ? "bg-accent text-accent-contrast border-accent"
                    : "bg-white/10 text-white/60 border-white/20 hover:border-white/40"
                  }`}
              >
                <span className="w-4 h-4 rounded bg-white/15 text-white flex items-center justify-center font-bold text-[10px]">
                  {app.name.charAt(0).toUpperCase()}
                </span>
                {app.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="hidden md:flex gap-3 mb-6">
        {(["pending", "in_progress", "success", "failed"] as const).map((s) => (
          <div key={s} className="text-center rounded-xl px-4 py-2" style={GLASS}>
            <p className="text-xl font-bold text-white">{builds.filter((b) => b.status === s).length}</p>
            <p className="text-xs text-white/50 capitalize">{s.replace("_", " ")}</p>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 rounded-xl px-4 py-3" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <p className="text-sm font-semibold text-red-300 mb-1">⚠ Failed to load builds</p>
          <p className="text-xs text-red-300/70 font-mono break-all">{error}</p>
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {["all", "pending", "in_progress", "success", "failed"].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border
              ${statusFilter === s
                ? "bg-accent text-accent-contrast border-accent"
                : "bg-white/10 text-white/60 border-white/20 hover:border-white/40"
              }`}
          >
            {s === "all" ? "All" : s.replace("_", " ")}
            <span className="ml-1.5 opacity-70">
              {s === "all" ? builds.length : builds.filter((b) => b.status === s).length}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      {dataLoading ? (
        <PageLoader label="Đang tải builds…" />
      ) : filteredBuilds.length === 0 ? (
        <div className="text-center py-24 text-white/40">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-lg">No builds yet.</p>
          <p className="text-sm mt-2">Build jobs will appear here once the server picks them up.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl" style={GLASS}>
          <table className="w-full text-sm">
            <thead className="text-white/50 uppercase text-xs tracking-wider" style={{ background: "rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <tr>
                <th className="px-4 py-3 text-left">Job ID</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Step</th>
                <th className="px-4 py-3 text-left">App</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-left">Artifact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredBuilds.map((build) => (
                <tr key={build.id} onClick={() => setSelectedBuild(build)}
                  className="hover:bg-white/10 transition cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono text-xs text-white/60 max-w-[120px] truncate">{build.id}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block border text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[build.status] ?? "bg-white/10 text-white/60 border-white/20"}`}>
                      {build.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/50 text-xs">
                    {build.step ? (STEP_LABEL[build.step] ?? build.step) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <p className="font-medium text-white/80">{build.schemeName ?? "—"}</p>
                    <p className="text-white/40">{build.bundleId ?? ""}</p>
                  </td>
                  <td className="px-4 py-3 text-white/50 text-xs whitespace-nowrap">{formatDate(build)}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedBuild && (
        <BuildDetailDrawer build={selectedBuild} onClose={() => setSelectedBuild(null)} />
      )}
    </div>
  );
}
