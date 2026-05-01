"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { GLASS } from "@/lib/glass";
import PageLoader from "@/app/components/PageLoader";
import { FaGithub } from "react-icons/fa";
import { HiOutlineDocumentDuplicate, HiOutlineCheck } from "react-icons/hi2";

interface AppDoc {
  id: string;
  name: string;
  githubRepo?: string | null;
  createdAt?: { seconds: number } | null;
}

function parseGithubUrl(input: string): string | null {
  const cleaned = input
    .trim()
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/^github\.com\//i, "")
    .replace(/\.git$/, "")
    .replace(/\/$/, "");
  return /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(cleaned) ? cleaned : null;
}

function toDisplayUrl(repo: string) {
  return `https://github.com/${repo}`;
}

export default function AppInfoPage() {
  const { appName } = useParams<{ appName: string }>();
  const decodedName = decodeURIComponent(appName);
  const { user } = useAuth();
  const [app, setApp] = useState<AppDoc | null>(null);
  const [loading, setLoading] = useState(true);

  const [repoInput, setRepoInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "apps"),
      where("userId", "==", user.uid),
      where("name", "==", decodedName)
    );
    getDocs(q).then((snap) => {
      if (!snap.empty) {
        const d = snap.docs[0];
        const data = { id: d.id, ...d.data() } as AppDoc;
        setApp(data);
        setRepoInput(data.githubRepo ? toDisplayUrl(data.githubRepo) : "");
      }
      setLoading(false);
    });
  }, [user, decodedName]);

  async function saveGithubRepo(repoFullName: string | null) {
    if (!user || !app) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/apps/${app.id}/github`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repoFullName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error ?? "Có lỗi xảy ra");
      } else {
        setApp((prev) => (prev ? { ...prev, githubRepo: repoFullName } : prev));
        setRepoInput(repoFullName ? toDisplayUrl(repoFullName) : "");
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch {
      setSaveError("Không thể kết nối đến server");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoader label="Đang tải thông tin app…" />;
  if (!app) return <div className="text-white/40">App not found.</div>;

  const rows = [
    { label: "Name", value: app.name },
    { label: "App ID", value: app.id },
    {
      label: "Created",
      value: app.createdAt?.seconds
        ? new Date(app.createdAt.seconds * 1000).toLocaleDateString()
        : "—",
    },
  ];

  const isConnected = Boolean(app.githubRepo);
  const parsedInput = parseGithubUrl(repoInput);
  const isDirty = parsedInput !== (app.githubRepo ?? null);
  const isInvalidUrl = repoInput.trim() !== "" && parsedInput === null;

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-1">App info</h1>
      <p className="text-sm text-white/50 mb-6">Thông tin chi tiết của app.</p>

      <div className="rounded-2xl divide-y divide-white/10 max-w-sm" style={GLASS}>
        {rows.map(({ label, value }) => (
          <div key={label} className="flex items-center px-5 py-3.5 gap-4">
            <span className="w-32 text-sm text-white/50 flex-shrink-0">{label}</span>
            <span className="text-sm font-medium text-white font-mono flex-1">{value}</span>
            {label === "App ID" && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(value);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center gap-1 text-white/30 hover:text-white/70 transition flex-shrink-0"
              >
                {copied ? (
                  <HiOutlineCheck className="w-4 h-4 text-green-400" />
                ) : (
                  <HiOutlineDocumentDuplicate className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* GitHub Repository section */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-1">
          <FaGithub className="w-4 h-4 text-white/60" />
          <h2 className="text-sm font-semibold text-white">GitHub Repository</h2>
        </div>
        <p className="text-xs text-white/40 mb-3">
          Mỗi app chỉ connect được với 1 repo. Build sẽ tự động kích hoạt khi có push hoặc pull request.
        </p>

        <div className="rounded-2xl overflow-hidden" style={GLASS}>
          {/* Status row */}
          <div className="flex items-center px-5 py-3.5 gap-4 border-b border-white/10">
            <span className="w-32 text-sm text-white/50 flex-shrink-0">Trạng thái</span>
            {isConnected ? (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                <a
                  href={`https://github.com/${app.githubRepo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-white font-mono hover:underline"
                >
                  {app.githubRepo}
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white/20 flex-shrink-0" />
                <span className="text-sm text-white/40">Chưa kết nối</span>
              </div>
            )}
          </div>

          {/* Input row */}
          <div className="px-5 py-4">
            <label className="text-xs text-white/50 block mb-2">Repository URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={repoInput}
                onChange={(e) => {
                  setRepoInput(e.target.value);
                  setSaveError(null);
                }}
                placeholder="https://github.com/acme/my-ios-app"
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-white/40 font-mono"
              />
              <button
                onClick={() => saveGithubRepo(parsedInput)}
                disabled={saving || !isDirty || isInvalidUrl}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-accent/20 text-accent-light hover:bg-accent/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Connecting..." : saveSuccess ? "Connected!" : "Connect"}
              </button>
              {isConnected && (
                <button
                  onClick={() => saveGithubRepo(null)}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Disconnect
                </button>
              )}
            </div>
            {isInvalidUrl
              ? <p className="mt-2 text-xs text-red-400">URL không hợp lệ. Ví dụ: https://github.com/acme/my-app</p>
              : <p className="mt-2 text-xs text-white/30">Paste URL của repo trên GitHub vào đây.</p>
            }
            {saveError && <p className="mt-2 text-xs text-red-400">{saveError}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
