"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { GLASS } from "@/lib/glass";

interface Submission {
  id: string;
  buildId: string;
  buildNumber: number | null;
  version: string | null;
  status: "pending" | "uploading" | "processing" | "done" | "failed";
  errorMessage: string | null;
  testflightBuildId: string | null;
  createdAt: string | null;
  completedAt: string | null;
}

const STATUS_CONFIG: Record<Submission["status"], { label: string; cls: string; pulse?: boolean }> = {
  pending:    { label: "Pending",    cls: "bg-yellow-500/20 text-yellow-300 border-yellow-600/40" },
  uploading:  { label: "Uploading",  cls: "bg-blue-500/20 text-blue-300 border-blue-600/40", pulse: true },
  processing: { label: "Processing", cls: "bg-blue-500/20 text-blue-300 border-blue-600/40", pulse: true },
  done:       { label: "Done",       cls: "bg-green-500/20 text-green-300 border-green-600/40" },
  failed:     { label: "Failed",     cls: "bg-red-500/20 text-red-300 border-red-600/40" },
};

const ACTIVE = new Set<Submission["status"]>(["pending", "uploading", "processing"]);

export default function SubmissionPage() {
  const { appName } = useParams<{ appName: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading]         = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSubmissions = useCallback(async () => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/apps/${encodeURIComponent(appName)}/submissions`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setSubmissions(data.submissions ?? []);
    } finally {
      setLoading(false);
    }
  }, [user, appName]);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchSubmissions();
  }, [user, authLoading, fetchSubmissions]);

  // Poll mỗi 5s khi có submission đang active
  useEffect(() => {
    const hasActive = submissions.some((s) => ACTIVE.has(s.status));
    if (hasActive) {
      if (!pollRef.current) {
        pollRef.current = setInterval(fetchSubmissions, 5000);
      }
    } else {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [submissions, fetchSubmissions]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Submission</h1>
          <p className="text-sm text-white/50 mt-0.5">Lịch sử submit lên TestFlight.</p>
        </div>
        {submissions.length > 0 && (
          <span className="text-xs text-white/40 bg-white/10 px-2.5 py-1 rounded-full">
            {submissions.length} bản
          </span>
        )}
      </div>

      <div className="rounded-2xl overflow-hidden" style={GLASS}>
        {loading ? (
          <div className="text-center py-12 text-white/40">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Đang tải...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-14 px-6">
            <div className="w-12 h-12 rounded-2xl bg-white/8 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </div>
            <p className="text-white/50 text-sm font-medium">Chưa có bản build nào được submit</p>
            <p className="text-white/30 text-xs mt-1 max-w-xs mx-auto">
              Vào trang <strong className="text-white/50">Builds</strong>, chọn build thành công và nhấn{" "}
              <strong className="text-white/50">Submit to TestFlight</strong>.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/8">
            {submissions.map((sub) => {
              const cfg = STATUS_CONFIG[sub.status];
              return (
                <li key={sub.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: version + build */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">
                          {sub.version ? `v${sub.version}` : "—"}
                          {sub.buildNumber != null && (
                            <span className="text-white/40 font-normal ml-1">(build {sub.buildNumber})</span>
                          )}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
                          {cfg.pulse && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                          {cfg.label}
                        </span>
                      </div>

                      {sub.createdAt && (
                        <p className="text-xs text-white/35 mt-0.5">
                          {new Date(sub.createdAt).toLocaleString("vi-VN")}
                          {sub.completedAt && sub.status === "done" && (
                            <span className="ml-1">
                              · hoàn thành {new Date(sub.completedAt).toLocaleString("vi-VN")}
                            </span>
                          )}
                        </p>
                      )}

                      {sub.status === "failed" && sub.errorMessage && (
                        <p className="text-xs text-red-400 mt-1 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">
                          {sub.errorMessage}
                        </p>
                      )}

                      {sub.status === "done" && sub.testflightBuildId && (
                        <p className="text-xs text-green-400/70 mt-0.5">
                          TestFlight ID: {sub.testflightBuildId}
                        </p>
                      )}
                    </div>

                    {/* Right: link to build */}
                    <button
                      onClick={() => router.push(`/account/app/${appName}/builds/${sub.buildId}`)}
                      className="text-white/30 hover:text-white/70 transition flex-shrink-0 mt-0.5"
                      title="Xem build"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="text-xs text-white/25 mt-4 leading-relaxed">
        Sau khi upload xong, Apple cần 5–15 phút để xử lý build trước khi xuất hiện trên TestFlight.
      </p>
    </div>
  );
}
