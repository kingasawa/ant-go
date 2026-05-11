"use client";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { UserProfile } from "@/lib/createUserProfile";
import Link from "next/link";
import PageLoader from "@/app/components/PageLoader";
import {
  HiOutlineCube, HiOutlineDevicePhoneMobile,
  HiOutlineCheckCircle, HiOutlineCreditCard, HiOutlineChevronRight,
} from "react-icons/hi2";

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
  label, value, sub, href, badgeClass, Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  href?: string;
  badgeClass: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  const { t } = useLanguage();
  const inner = (
    <div className="dash-card p-5 flex items-start gap-4 cursor-default">
      <span className={`icon-badge ${badgeClass} mt-0.5`}>
        <Icon className="w-5 h-5 text-white" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-white leading-none">{value}</p>
        <p className="text-sm font-medium text-white/60 mt-1">{label}</p>
        {sub && <p className="text-xs text-white/35 mt-0.5">{sub}</p>}
        {href && (
          <div className="mt-2 flex items-center gap-1 text-xs text-purple font-medium">
            {t("overviewViewDetail")} <HiOutlineChevronRight className="w-3 h-3" />
          </div>
        )}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}

const STATUS_COLOR: Record<string, string> = {
  pending:     "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  in_progress: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  success:     "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  failed:      "bg-red-500/15 text-red-300 border-red-500/30",
};

const STATUS_BAR: Record<string, string> = {
  success:     "bg-emerald-400",
  failed:      "bg-red-400",
  in_progress: "bg-blue-400",
  pending:     "bg-yellow-400",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
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
      setBuilds(data); setRecentBuilds(data.slice(0, 5));
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
  const successRate     = builds.length > 0 ? Math.round((successCount / builds.length) * 100) : 0;

  if (loading) return <PageLoader label={t("overviewLoadingLabel")} />;

  const p = profile as any;
  const credits: number = p?.credits ?? 0;
  const planCredits: number = p?.planCredits ?? 15;
  const isUnlimited = planCredits === -1;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-7 lg:hidden">
        <h1 className="text-xl font-bold text-white">
          {user?.displayName?.split(" ")[0] ?? "there"} 👋
        </h1>
        <p className="text-white/40 text-sm mt-1">{t("overviewHappening")}</p>
      </div>
      <div className="mb-7 hidden lg:block">
        <h1 className="text-xl font-bold text-white">{t("overviewTitle")}</h1>
        <p className="text-white/40 text-sm mt-0.5">{t("overviewHappening")}</p>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label={t("overviewTotalBuilds")} value={builds.length}     sub={t("overviewAllTime")}       href="/account/builds"  badgeClass="icon-badge-purple" Icon={HiOutlineCube} />
        <StatCard label={t("overviewApps")}        value={apps.length}       sub={t("overviewCreated")}       href="/account/apps"    badgeClass="icon-badge-orange" Icon={HiOutlineDevicePhoneMobile} />
        <StatCard label={t("overviewSuccessRate")} value={`${successRate}%`} sub={`${successCount} ${t("overviewSuccessful")}`}       badgeClass="icon-badge-teal"   Icon={HiOutlineCheckCircle} />
        <StatCard
          label={t("overviewPlan")}
          value={p?.plan ? p.plan.toUpperCase() : "—"}
          sub={isUnlimited ? t("overviewUnlimitedCredits") : `${credits.toFixed ? credits.toFixed(1) : credits} ${t("overviewCreditsLeft")}`}
          href="/account/usage"
          badgeClass="icon-badge-pink"
          Icon={HiOutlineCreditCard}
        />
      </div>

      {/* ── Two-column layout ─────────────────────────────────────── */}
      <div className="xl:grid xl:grid-cols-4 xl:gap-4 flex flex-col gap-6">

        <div className="xl:col-span-3 flex flex-col gap-6">

          {/* Recent builds */}
          <div className="dash-card p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-white/70">{t("overviewRecentBuilds")}</h2>
              <Link href="/account/builds" className="text-xs text-purple hover:text-accent-light transition">
                {t("overviewViewAll")}
              </Link>
            </div>
            {recentBuilds.length === 0 ? (
              <div className="text-center py-10 text-white/30">
                <HiOutlineCube className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{t("overviewNoBuilds")}</p>
                <p className="text-xs mt-1">{t("overviewCreateApp")}</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {recentBuilds.map((build) => (
                  <Link
                    key={build.id}
                    href="/account/builds"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.06] transition"
                  >
                    <span className={`border text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLOR[build.status] ?? "bg-white/10 text-white/40 border-white/15"}`}>
                      {build.status}
                    </span>
                    <span className="text-sm text-white/75 flex-1 truncate font-medium">
                      {build.schemeName ?? build.id}
                    </span>
                    <span className="text-xs text-white/35 flex-shrink-0">
                      {build.createdAt?.seconds
                        ? new Date(build.createdAt.seconds * 1000).toLocaleDateString()
                        : "—"}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Apps */}
          <div className="dash-card p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-white/70">{t("overviewAppsTitle")}</h2>
              <Link href="/account/apps" className="text-xs text-purple hover:text-accent-light transition">
                {t("overviewManage")}
              </Link>
            </div>
            {apps.length === 0 ? (
              <div className="text-center py-8 text-white/30">
                <HiOutlineDevicePhoneMobile className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{t("overviewNoApps")}</p>
                <Link href="/account/apps" className="text-xs text-purple hover:underline mt-1 inline-block">
                  {t("overviewCreateFirstApp")}
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {apps.map((app) => (
                  <Link
                    key={app.id}
                    href={`/account/app/${encodeURIComponent(app.name)}`}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl border transition-all duration-150"
                    style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(158,62,191,0.4)";
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                    }}
                  >
                    <span className="icon-badge icon-badge-purple flex-shrink-0">
                      <span className="text-sm font-bold text-white">{app.name.charAt(0).toUpperCase()}</span>
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{app.name}</p>
                      {app.scheme && <p className="text-xs text-white/35 font-mono truncate">{app.scheme}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="hidden xl:flex xl:col-span-1 flex-col gap-4">

          {/* Build Status */}
          <div className="dash-card p-5">
            <h2 className="text-sm font-semibold text-white/70 mb-4">{t("overviewBuildStatus")}</h2>
            <div className="space-y-3.5">
              {([
                { status: "success",     label: t("overviewSuccess"),    count: successCount },
                { status: "failed",      label: t("overviewFailed"),     count: failedCount },
                { status: "in_progress", label: t("overviewInProgress"), count: builds.filter((b) => b.status === "in_progress").length },
                { status: "pending",     label: t("overviewPending"),    count: builds.filter((b) => b.status === "pending").length },
              ] as const).map(({ status, label, count }) => (
                <div key={status}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className={`border text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[status]}`}>{label}</span>
                    <span className="text-sm font-semibold text-white/60">{count}</span>
                  </div>
                  <div className="w-full rounded-full h-1" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div
                      className={`h-1 rounded-full ${STATUS_BAR[status]}`}
                      style={{ width: builds.length ? `${(count / builds.length) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {!isUnlimited && (
              <div className="mt-5 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs text-white/40">{t("overviewCredits")}</span>
                  <span className="text-xs text-white/40">{credits.toFixed ? credits.toFixed(1) : credits} / {planCredits}</span>
                </div>
                <div className="w-full rounded-full h-1" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div
                    className={`h-1 rounded-full ${credits / planCredits < 0.2 ? "bg-red-400" : credits / planCredits < 0.5 ? "bg-yellow-400" : "bg-purple"}`}
                    style={{ width: `${Math.max(0, Math.min(100, (credits / planCredits) * 100))}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Quick links */}
          <div className="dash-card p-5">
            <h2 className="text-sm font-semibold text-white/70 mb-4">{t("overviewQuickActions")}</h2>
            <div className="space-y-2">
              {[
                { href: "/account/apps",    label: t("overviewNewApp"),       icon: "＋" },
                { href: "/account/devices", label: t("overviewAddDevice"),    icon: "📱" },
                { href: "/account/billing", label: t("overviewUpgradePlan"),  icon: "⚡" },
                { href: "/account/profile", label: t("overviewEditProfile"),  icon: "✏️" },
              ].map(({ href, label, icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/[0.06] transition"
                >
                  <span className="text-base w-5 text-center">{icon}</span>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
