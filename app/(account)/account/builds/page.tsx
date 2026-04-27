"use client";
import { useEffect, useState, useRef } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

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
    { label: "Status",       value: <span className={`inline-block border text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[build.status] ?? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-700"}`}>{build.status}</span> },
    { label: "Current Step", value: build.step ? (STEP_LABEL[build.step] ?? build.step) : "—" },
    { label: "App Scheme",   value: build.schemeName ?? "—" },
    { label: "Bundle ID",    value: <span className="font-mono text-xs">{build.bundleId ?? "—"}</span> },
    { label: "Project ID",   value: <span className="font-mono text-xs">{build.projectId ?? "—"}</span> },
    { label: "Created",      value: formatDate(build) },
    { label: "Started",      value: build.startedAt ?? "—" },
    { label: "Completed",    value: build.completedAt ?? "—" },
    ...(build.errorMessage ? [{ label: "Error", value: <span className="text-red-500 text-xs">{build.errorMessage}</span> }] : []),
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Build Detail</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/50">
            {rows.map((r) => (
              <div key={r.label} className="flex items-start justify-between gap-4 px-4 py-3">
                <span className="text-xs text-gray-400 flex-shrink-0 pt-0.5">{r.label}</span>
                <span className="text-sm text-gray-800 dark:text-gray-200 text-right">{r.value}</span>
              </div>
            ))}
          </div>
          {build.ipaUrl && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4">
              <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider mb-3">📦 Artifact</p>
              <a href={build.ipaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300 hover:underline mb-3">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download .ipa
              </a>
              <button onClick={() => setShowConfirm(true)} className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-2.5 rounded-xl transition">
                🚀 Submit to App Store Connect
              </button>
            </div>
          )}
        </div>
      </aside>
      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowConfirm(false)} />
          <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="text-4xl mb-3">🚀</div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Submit to App Store Connect</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Hành động này sẽ submit bản build{" "}
              <strong className="text-gray-700 dark:text-gray-300">{build.schemeName ?? build.id}</strong>{" "}
              lên <strong className="text-gray-700 dark:text-gray-300">Apple App Store Connect</strong> để review.
              Bạn có chắc chắn muốn tiếp tục?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition">OK</button>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Builds</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {selectedAppId === "all" ? "Tất cả apps" : selectedApp?.name ?? selectedAppId}
            {" · "}
            <span className="text-indigo-600 dark:text-indigo-400">{builds.length} builds</span>
          </p>
        </div>

        {/* App selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 flex-shrink-0">App:</span>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedAppId("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition border
                ${selectedAppId === "all"
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-indigo-400"
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
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-indigo-400"
                  }`}
              >
                <span className="w-4 h-4 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-[10px]">
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
          <div key={s} className="text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2">
            <p className="text-xl font-bold text-gray-900 dark:text-white">{builds.filter((b) => b.status === s).length}</p>
            <p className="text-xs text-gray-400 capitalize">{s.replace("_", " ")}</p>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1">⚠ Failed to load builds</p>
          <p className="text-xs text-red-500 dark:text-red-400 font-mono break-all">{error}</p>
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {["all", "pending", "in_progress", "success", "failed"].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border
              ${statusFilter === s
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-indigo-400"
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
        <div className="text-gray-400 animate-pulse text-center py-16">Loading builds…</div>
      ) : filteredBuilds.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-lg">No builds yet.</p>
          <p className="text-sm mt-2">Build jobs will appear here once the server picks them up.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Job ID</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Step</th>
                <th className="px-4 py-3 text-left">App</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-left">Artifact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredBuilds.map((build) => (
                <tr key={build.id} onClick={() => setSelectedBuild(build)}
                  className="bg-white dark:bg-gray-950 hover:bg-indigo-50/50 dark:hover:bg-gray-900/60 transition cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-300 max-w-[120px] truncate">{build.id}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block border text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[build.status] ?? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-700"}`}>
                      {build.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                    {build.step ? (STEP_LABEL[build.step] ?? build.step) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <p className="font-medium text-gray-800 dark:text-gray-300">{build.schemeName ?? "—"}</p>
                    <p className="text-gray-400">{build.bundleId ?? ""}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">{formatDate(build)}</td>
                  <td className="px-4 py-3">
                    {build.ipaUrl ? (
                      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-medium">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        IPA ready
                      </span>
                    ) : build.status === "failed" && build.errorMessage ? (
                      <span className="text-red-500 text-xs">⚠ Error</span>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
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
