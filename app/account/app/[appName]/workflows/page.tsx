"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { GLASS } from "@/lib/glass";
import PageLoader from "@/app/components/PageLoader";
import { FaGithub } from "react-icons/fa";
import {
  HiOutlinePlusCircle, HiOutlineWrenchScrewdriver,
  HiOutlineCheck, HiOutlineExclamationTriangle,
} from "react-icons/hi2";

interface AppDoc {
  id: string;
  name: string;
  githubRepo?: string | null;
  githubInstallationId?: number | null;
}

function parseGithubUrl(input: string): string | null {
  const cleaned = input.trim()
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/^github\.com\//i, "")
    .replace(/\.git$/, "")
    .replace(/\/$/, "");
  return /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(cleaned) ? cleaned : null;
}

const ERROR_MESSAGES: Record<string, string> = {
  repo_not_accessible: "Repo không được tìm thấy trong installation. Nếu là private repo, hãy đảm bảo chọn đúng repo khi cài GitHub App.",
  state_expired: "Phiên kết nối đã hết hạn. Vui lòng thử lại.",
  invalid_state: "Yêu cầu không hợp lệ. Vui lòng thử lại.",
  callback_failed: "Có lỗi xảy ra khi xác nhận với GitHub. Vui lòng thử lại.",
  missing_params: "Thiếu thông tin từ GitHub. Vui lòng thử lại.",
};

export default function WorkflowsPage() {
  const { appName } = useParams<{ appName: string }>();
  const searchParams = useSearchParams();
  const decodedName = decodeURIComponent(appName);
  const { user } = useAuth();

  const [app, setApp] = useState<AppDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [repoInput, setRepoInput] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [showComingSoon, setShowComingSoon] = useState(false);

  const githubConnected = searchParams.get("github_connected") === "1";
  const githubError = searchParams.get("github_error");
  const callbackError = githubError ? (ERROR_MESSAGES[githubError] ?? "Có lỗi xảy ra từ GitHub.") : null;

  useEffect(() => {
    if (!user) return;
    getDocs(query(collection(db, "apps"), where("userId", "==", user.uid), where("name", "==", decodedName)))
      .then((snap) => {
        if (!snap.empty) {
          const d = snap.docs[0];
          const data = { id: d.id, ...d.data() } as AppDoc;
          setApp(data);
          setRepoInput(data.githubRepo ? `https://github.com/${data.githubRepo}` : "");
        }
        setLoading(false);
      });
  }, [user, decodedName]);

  async function handleConnect() {
    if (!user || !app) return;
    const parsed = parseGithubUrl(repoInput);
    if (!parsed) return;
    setConnecting(true);
    setConnectError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/github/connect-init", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          antgoAppId: app.id,
          repoFullName: parsed,
          redirectAfter: `/account/app/${encodeURIComponent(app.name)}/workflows`,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setConnectError(data.error ?? "Có lỗi xảy ra"); return; }
      window.location.href = data.redirectUrl;
    } catch {
      setConnectError("Không thể kết nối đến server");
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!user || !app) return;
    setConnecting(true);
    setConnectError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/apps/${app.id}/github`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ repoFullName: null }),
      });
      if (res.ok) {
        setApp((prev) => prev ? { ...prev, githubRepo: null, githubInstallationId: null } : prev);
        setRepoInput("");
      }
    } catch {
      setConnectError("Không thể kết nối đến server");
    } finally {
      setConnecting(false);
    }
  }

  if (loading) return <PageLoader label="Đang tải workflows…" />;

  const isConnected = Boolean(app?.githubRepo);
  const parsedInput = parseGithubUrl(repoInput);
  const isInvalidUrl = repoInput.trim() !== "" && parsedInput === null;
  const isDirty = parsedInput !== null && parsedInput !== (app?.githubRepo ?? null);

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-1">Workflows</h1>
      <p className="text-sm text-white/50 mb-6">Quản lý workflow CI/CD của app.</p>

      {/* ── GitHub Repository connect ────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <FaGithub className="w-4 h-4 text-white/60" />
          <h2 className="text-sm font-semibold text-white">GitHub Repository</h2>
        </div>
        <p className="text-xs text-white/40 mb-3">
          Mỗi app chỉ connect được với 1 repo. Build sẽ tự động kích hoạt khi có push hoặc pull request.
        </p>

        {/* Callback feedback */}
        {githubConnected && (
          <div className="mb-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/15 border border-green-500/30">
            <HiOutlineCheck className="w-4 h-4 text-green-400 flex-shrink-0" />
            <p className="text-xs text-green-400">Kết nối GitHub thành công!</p>
          </div>
        )}
        {callbackError && (
          <div className="mb-3 flex items-start gap-2 px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30">
            <HiOutlineExclamationTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-400">{callbackError}</p>
          </div>
        )}

        {isConnected ? (
          <div className="rounded-2xl overflow-hidden" style={GLASS}>
            <div className="flex items-center justify-between px-5 py-4 gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <FaGithub className="w-5 h-5 text-white/70 flex-shrink-0" />
                <div className="min-w-0">
                  <a
                    href={`https://github.com/${app?.githubRepo}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-sm font-medium text-white font-mono hover:underline truncate block"
                  >
                    {app?.githubRepo}
                  </a>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                    <span className="text-xs text-green-400">Active</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                disabled={connecting}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition disabled:opacity-50 flex-shrink-0"
              >
                {connecting ? "..." : "Disconnect"}
              </button>
            </div>
            {connectError && <div className="px-5 pb-4"><p className="text-xs text-red-400">{connectError}</p></div>}
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={GLASS}>
            <div className="px-5 py-4">
              <label className="text-xs text-white/50 block mb-2">Repository URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={repoInput}
                  onChange={(e) => { setRepoInput(e.target.value); setConnectError(null); }}
                  placeholder="https://github.com/acme/my-ios-app"
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-white/40 font-mono"
                />
                <button
                  onClick={handleConnect}
                  disabled={connecting || !isDirty || isInvalidUrl}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-accent/20 text-accent-light hover:bg-accent/30 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {connecting ? "Đang xử lý..." : "Connect"}
                </button>
              </div>
              {isInvalidUrl
                ? <p className="mt-2 text-xs text-red-400">URL không hợp lệ. Ví dụ: https://github.com/acme/my-app</p>
                : <p className="mt-2 text-xs text-white/30">Paste URL của repo trên GitHub vào đây.</p>
              }
              {connectError && <p className="mt-2 text-xs text-red-400">{connectError}</p>}
            </div>
            <div className="px-5 py-3.5 border-t border-white/10 flex items-start gap-2">
              <HiOutlineExclamationTriangle className="w-3.5 h-3.5 text-yellow-400/70 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-white/30 leading-relaxed">
                <span className="text-white/50">Private repo:</span> Khi GitHub mở trang cài đặt, chọn{" "}
                <span className="text-white/50">"Only select repositories"</span> và chọn đúng repo này.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Workflows list ───────────────────────────────────────── */}
      {isConnected && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white/70">Workflow list</h2>
            <button
              onClick={() => { setShowComingSoon(true); setTimeout(() => setShowComingSoon(false), 3000); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-accent/20 text-accent-light hover:bg-accent/30 transition"
            >
              <HiOutlinePlusCircle className="w-4 h-4" />
              Tạo Workflow
            </button>
          </div>

          {showComingSoon && (
            <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-white/10 border border-white/20">
              <HiOutlineWrenchScrewdriver className="w-4 h-4 text-white/60 flex-shrink-0" />
              <p className="text-sm text-white/70">Tính năng này đang được xây dựng.</p>
            </div>
          )}

          <div className="rounded-2xl p-10 text-center text-white/40" style={GLASS}>
            <p className="text-sm">Chưa có workflow nào.</p>
          </div>
        </div>
      )}
    </div>
  );
}
