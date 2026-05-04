"use client";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { UserProfile } from "@/lib/createUserProfile";
import Link from "next/link";
import { GLASS } from "@/lib/glass";
import PageLoader from "@/app/components/PageLoader";
import { HiOutlineCube, HiOutlineDevicePhoneMobile, HiOutlineCheckCircle, HiOutlineCreditCard, HiOutlineChevronRight } from "react-icons/hi2";

interface Build {
  id: string;
  status: string;
  schemeName?: string;
  createdAt?: { seconds: number } | null;
}

interface AppDoc {
  id: string;
  name: string;
  scheme?: string;
}

function StatCard({
  label, value, sub, href, bgIcon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  href?: string;
  bgIcon: React.ReactNode;
}) {
  const inner = (
    <div
      className="relative overflow-hidden rounded-2xl p-5 transition-all duration-300 ease-out hover:scale-[1.025] cursor-default"
      style={GLASS}
    >
      {/* SVG watermark background — right half, full height, tilted 30° */}
      <div className="pointer-events-none absolute top-0 right-0 w-1/2 h-full text-white/20 opacity-40">
        <div
          className="w-full h-full [&_svg]:w-full [&_svg]:h-full [&_svg]:stroke-current"
          style={{ transform: "rotate(30deg) scale(1.4)", transformOrigin: "center" }}
        >
          {bgIcon}
        </div>
      </div>

      {/* Content */}
      <div className="relative">
        <p className="text-3xl font-bold text-white">{value}</p>
        <p className="text-sm font-medium text-white/70 mt-1">{label}</p>
        {sub && <p className="text-xs text-white/50 mt-0.5">{sub}</p>}
        {href && (
          <div className="mt-3 flex items-center gap-1 text-xs text-accent-light font-medium">
            Xem chi tiết
            <HiOutlineChevronRight className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}

const BgBuilds  = () => <HiOutlineCube />;
const BgApps    = () => <HiOutlineDevicePhoneMobile />;
const BgSuccess = () => <HiOutlineCheckCircle />;
const BgPlan    = () => <HiOutlineCreditCard />;

const STATUS_COLOR: Record<string, string> = {
  pending:     "bg-yellow-500/20 text-yellow-600 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700",
  in_progress: "bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-300 dark:border-blue-700",
  success:     "bg-green-500/20 text-green-600 dark:text-green-300 border-green-300 dark:border-green-700",
  failed:      "bg-red-500/20 text-red-600 dark:text-red-300 border-red-300 dark:border-red-700",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [builds, setBuilds] = useState<Build[]>([]);
  const [apps, setApps] = useState<AppDoc[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recentBuilds, setRecentBuilds] = useState<Build[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let buildsReady = false, appsReady = false, profileReady = false;
    const checkDone = () => { if (buildsReady && appsReady && profileReady) setLoading(false); };

    const qBuilds = query(collection(db, "builds"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
    const unsubBuilds = onSnapshot(qBuilds, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Build));
      setBuilds(data);
      setRecentBuilds(data.slice(0, 5));
      buildsReady = true; checkDone();
    }, () => { buildsReady = true; checkDone(); });

    const qApps = query(collection(db, "apps"), where("userId", "==", user.uid));
    const unsubApps = onSnapshot(qApps, (snap) => {
      setApps(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppDoc)));
      appsReady = true; checkDone();
    }, () => { appsReady = true; checkDone(); });

    const unsubProfile = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) setProfile(snap.data() as UserProfile);
      profileReady = true; checkDone();
    }, () => { profileReady = true; checkDone(); });

    return () => { unsubBuilds(); unsubApps(); unsubProfile(); };
  }, [user]);

  const successCount    = builds.filter((b) => b.status === "success").length;
  const failedCount     = builds.filter((b) => b.status === "failed").length;
  const inProgressCount = builds.filter((b) => b.status === "in_progress" || b.status === "pending").length;
  const successRate     = builds.length > 0 ? Math.round((successCount / builds.length) * 100) : 0;

  if (loading) return <PageLoader label="Đang tải overview…" />;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          👋 Xin chào, {user?.displayName?.split(" ")[0]}!
        </h1>
        <p className="text-white/50 text-sm mt-1">Đây là tổng quan tài khoản của bạn.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Builds"  value={builds.length}  sub="Tất cả thời gian"  href="/account/builds"  bgIcon={<BgBuilds />} />
        <StatCard label="Apps"          value={apps.length}    sub="Đã tạo"             href="/account/apps"    bgIcon={<BgApps />} />
        <StatCard label="Success Rate"  value={`${successRate}%`} sub={`${successCount} thành công`}            bgIcon={<BgSuccess />} />
        <StatCard label="Plan"          value={profile?.plan ? profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1) : "—"} sub={(profile as any)?.planCredits === -1 ? "Unlimited credits" : `${(profile as any)?.credits ?? "—"} credits còn lại`} href="/account/usage" bgIcon={<BgPlan />} />
      </div>

      {/* Build status breakdown + Recent builds */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Status breakdown */}
        <div className="rounded-2xl p-5" style={GLASS}>
          <h2 className="text-sm font-semibold text-white/80 mb-4">Build Status</h2>
          <div className="space-y-3">
            {([
              { status: "success",     label: "Success",     count: successCount },
              { status: "failed",      label: "Failed",      count: failedCount },
              { status: "in_progress", label: "In Progress", count: builds.filter((b) => b.status === "in_progress").length },
              { status: "pending",     label: "Pending",     count: builds.filter((b) => b.status === "pending").length },
            ] as const).map(({ status, label, count }) => (
                <div key={status} className="flex items-center gap-3">
                <span className={`inline-block border text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[status]}`}>{label}</span>
                  <div className="flex-1 bg-white/10 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${status === "success" ? "bg-green-400" : status === "failed" ? "bg-red-400" : status === "in_progress" ? "bg-blue-400" : "bg-yellow-400"}`}
                      style={{ width: builds.length ? `${(count / builds.length) * 100}%` : "0%" }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-white/80 w-6 text-right">{count}</span>
                </div>
            ))}
          </div>
          {/* Credit bar */}
          {profile && (() => {
            const p = profile as any;
            const credits: number = p.credits ?? 0;
            const planCredits: number = p.planCredits ?? 15;
            const isUnlimited = planCredits === -1;
            const used = isUnlimited ? 0 : planCredits - credits;
            const pct = isUnlimited ? 0 : Math.max(0, Math.min(100, (used / planCredits) * 100));
            const low = !isUnlimited && credits / planCredits < 0.2;
            return (
              <div className="mt-5 pt-4 border-t border-white/15">
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs text-white/50">Build Credits</span>
                  <span className="text-xs text-white/50">
                    {isUnlimited ? "Unlimited" : `${credits.toFixed(1)} / ${planCredits} còn lại`}
                  </span>
                </div>
                {!isUnlimited && (
                  <div className="w-full bg-white/10 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${low ? "bg-red-400" : credits / planCredits < 0.5 ? "bg-yellow-400" : "bg-accent-light"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Recent builds */}
        <div className="lg:col-span-2 rounded-2xl p-5" style={GLASS}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white/80">Recent Builds</h2>
            <Link href="/account/builds" className="text-xs text-accent-light hover:underline">Xem tất cả →</Link>
          </div>
          {recentBuilds.length === 0 ? (
            <div className="text-center py-8 text-white/40">
              <p className="text-sm">Chưa có build nào.</p>
              <p className="text-xs mt-1">Tạo App và bắt đầu build đầu tiên!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentBuilds.map((build) => (
                <Link key={build.id} href="/account/builds"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition"
                >
                  <span className={`inline-block border text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLOR[build.status] ?? "bg-white/10 text-white/50 border-white/20"}`}>
                    {build.status}
                  </span>
                  <span className="text-sm text-white/80 flex-1 truncate">{build.schemeName ?? build.id}</span>
                  <span className="text-xs text-white/40 flex-shrink-0">
                    {build.createdAt?.seconds ? new Date(build.createdAt.seconds * 1000).toLocaleDateString() : "—"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Apps overview */}
      <div className="rounded-2xl p-5" style={GLASS}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white/80">Apps</h2>
          <Link href="/account/apps" className="text-xs text-accent-light hover:underline">Quản lý →</Link>
        </div>
        {apps.length === 0 ? (
          <div className="text-center py-6 text-white/40">
            <p className="text-sm">Chưa có App nào.</p>
            <Link href="/account/apps" className="text-xs text-accent-light hover:underline mt-1 inline-block">Tạo App đầu tiên →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {apps.map((app) => (
              <Link key={app.id} href={`/account/app/${encodeURIComponent(app.name)}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/15 hover:border-accent/60 hover:bg-white/10 transition"
              >
                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {app.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white/90 truncate">{app.name}</p>
                  {app.scheme && <p className="text-xs text-white/50 font-mono truncate">{app.scheme}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
