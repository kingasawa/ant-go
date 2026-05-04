"use client";
import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot, where, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { GLASS } from "@/lib/glass";
import Link from "next/link";
import PageLoader from "@/app/components/PageLoader";
import { PLAN_APP_LIMIT } from "@/lib/createUserProfile";

interface CreditHistory {
  id: string;
  buildId: string;
  amount: number;
  reason: "success" | "failed_fast" | "failed_slow";
  balanceBefore: number;
  balanceAfter: number;
  createdAt?: { seconds: number } | null;
}

interface UserData {
  plan: string;
  credits: number;
  planCredits: number;
  creditsResetAt?: { seconds: number } | null;
}

const REASON_LABELS: Record<string, { label: string; color: string }> = {
  success:     { label: "Thành công",       color: "text-green-400" },
  failed_fast: { label: "Thất bại < 3 phút", color: "text-yellow-400" },
  failed_slow: { label: "Thất bại ≥ 3 phút", color: "text-red-400" },
};

function formatDate(seconds: number): string {
  return new Date(seconds * 1000).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function UsagePage() {
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [history, setHistory] = useState<CreditHistory[]>([]);
  const [appCount, setAppCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Listen user profile
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setUserData({
          plan:           d.plan           ?? "free",
          credits:        d.credits        ?? 0,
          planCredits:    d.planCredits    ?? 15,
          creditsResetAt: d.creditsResetAt ?? null,
        });
      }
      setLoading(false);
    });
  }, [user]);

  // Listen credit history
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "creditHistory"),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    return onSnapshot(q, (snap) => {
      setHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CreditHistory)));
    });
  }, [user]);

  // Count apps
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "apps"), where("userId", "==", user.uid));
    return onSnapshot(q, (snap) => setAppCount(snap.size));
  }, [user]);

  if (loading || !userData) return <PageLoader />;

  const { plan, credits, planCredits, creditsResetAt } = userData;
  const isUnlimited = planCredits === -1;
  const creditPct = isUnlimited ? 100 : Math.max(0, Math.min(100, (credits / planCredits) * 100));
  const creditLow = !isUnlimited && creditPct < 20;

  const appLimit = PLAN_APP_LIMIT[plan] ?? 3;
  const appLimitUnlimited = appLimit === -1;
  const appPct = appLimitUnlimited ? 0 : Math.max(0, Math.min(100, (appCount / appLimit) * 100));
  const appNearLimit = !appLimitUnlimited && appCount >= appLimit - 1;

  const resetDate = creditsResetAt?.seconds
    ? new Date(creditsResetAt.seconds * 1000).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
    : null;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Usage</h1>
        <p className="text-white/50 text-sm mt-1">Thống kê sử dụng tài nguyên của tài khoản</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">

        {/* Credit Card */}
        <div className="rounded-2xl p-6" style={{ ...GLASS, boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-white/60 uppercase tracking-wider">Build Credits</p>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider"
              style={{ background: "rgba(var(--tw-accent) / 0.15)", border: "1px solid rgb(var(--tw-accent) / 0.3)", color: "rgb(var(--tw-accent-light))" }}
            >
              {plan}
            </span>
          </div>

          <div className="flex items-end gap-2 mb-3">
            <span className="text-4xl font-bold text-white">{isUnlimited ? "∞" : credits.toFixed(1)}</span>
            {!isUnlimited && (
              <span className="text-white/40 text-lg mb-1">/ {planCredits}</span>
            )}
          </div>

          {/* Progress bar */}
          {!isUnlimited && (
            <div className="w-full rounded-full h-2 mb-3" style={{ background: "rgba(255,255,255,0.1)" }}>
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${creditPct}%`,
                  background: creditLow
                    ? "linear-gradient(90deg, #ef4444, #f87171)"
                    : "linear-gradient(90deg, rgb(var(--tw-accent)), rgb(var(--tw-accent-light)))",
                }}
              />
            </div>
          )}

          {creditLow && (
            <p className="text-xs text-red-400 mb-2">⚠ Credit sắp hết — nâng cấp để tránh bị gián đoạn</p>
          )}

          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-white/40">
              {resetDate ? `Reset vào ${resetDate}` : "Reset đầu mỗi tháng"}
            </p>
            {creditLow && (
              <Link href="/account/billing" className="text-xs text-accent-light hover:underline font-medium">
                Nâng cấp →
              </Link>
            )}
          </div>
        </div>

        {/* App Limit Card */}
        <div className="rounded-2xl p-6" style={{ ...GLASS, boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-white/60 uppercase tracking-wider">Apps</p>
            {appNearLimit && !appLimitUnlimited && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-yellow-400 uppercase tracking-wider"
                style={{ background: "rgba(234,179,8,0.15)", border: "1px solid rgba(234,179,8,0.3)" }}>
                Gần giới hạn
              </span>
            )}
          </div>

          <div className="flex items-end gap-2 mb-3">
            <span className="text-4xl font-bold text-white">{appCount}</span>
            <span className="text-white/40 text-lg mb-1">/ {appLimitUnlimited ? "∞" : appLimit}</span>
          </div>

          {!appLimitUnlimited && (
            <div className="w-full rounded-full h-2 mb-3" style={{ background: "rgba(255,255,255,0.1)" }}>
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${appPct}%`,
                  background: appNearLimit
                    ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                    : "linear-gradient(90deg, rgb(var(--tw-accent)), rgb(var(--tw-accent-light)))",
                }}
              />
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-white/40">
              {appLimitUnlimited ? "Không giới hạn số app" : `Tối đa ${appLimit} app với plan ${plan.toUpperCase()}`}
            </p>
            {appNearLimit && !appLimitUnlimited && (
              <Link href="/account/billing" className="text-xs text-accent-light hover:underline font-medium">
                Nâng cấp →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Credit History */}
      <div className="rounded-2xl p-6" style={{ ...GLASS, boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}>
        <h2 className="text-base font-semibold text-white mb-4">Lịch sử trừ credit</h2>

        {history.length === 0 ? (
          <p className="text-white/40 text-sm py-8 text-center">Chưa có lịch sử trừ credit</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <th className="text-left text-white/40 font-medium pb-3 pr-4">Thời gian</th>
                  <th className="text-left text-white/40 font-medium pb-3 pr-4">Build ID</th>
                  <th className="text-left text-white/40 font-medium pb-3 pr-4">Kết quả</th>
                  <th className="text-right text-white/40 font-medium pb-3 pr-4">Credit trừ</th>
                  <th className="text-right text-white/40 font-medium pb-3">Số dư sau</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => {
                  const info = REASON_LABELS[h.reason] ?? { label: h.reason, color: "text-white/60" };
                  return (
                    <tr
                      key={h.id}
                      style={{ borderBottom: i < history.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
                    >
                      <td className="py-3 pr-4 text-white/50 whitespace-nowrap">
                        {h.createdAt?.seconds ? formatDate(h.createdAt.seconds) : "—"}
                      </td>
                      <td className="py-3 pr-4">
                        <Link
                          href={`/account/app/unknown/builds/${h.buildId}`}
                          className="text-accent-light hover:underline font-mono text-xs"
                        >
                          {h.buildId.slice(0, 12)}…
                        </Link>
                      </td>
                      <td className={`py-3 pr-4 ${info.color}`}>{info.label}</td>
                      <td className="py-3 pr-4 text-right font-mono text-red-400">
                        {h.amount.toFixed(1)}
                      </td>
                      <td className="py-3 text-right font-mono text-white/70">
                        {h.balanceAfter.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}




