"use client";
import { useEffect, useState } from "react";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { UserProfile } from "@/lib/createUserProfile";
import { GLASS } from "@/lib/glass";
import PageLoader from "@/app/components/PageLoader";

const PLAN_BADGE: Record<string, string> = {
  free: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
  pro: "bg-accent/15 dark:bg-accent/30 text-accent dark:text-accent-light border border-accent dark:border-accent-dark",
  enterprise: "bg-yellow-50 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700",
};

function formatTimestamp(value: unknown): string {
  if (!value) return "—";
  if (value instanceof Timestamp) return value.toDate().toLocaleString();
  if (typeof value === "object" && value !== null && "seconds" in value) {
    return new Date((value as { seconds: number }).seconds * 1000).toLocaleString();
  }
  return "—";
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl p-5" style={GLASS}>
      <p className="text-xs text-white/50 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-white/40 mt-1">{sub}</p>}
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) setProfile(snap.data() as UserProfile);
      setLoading(false);
    });
  }, [user]);

  if (loading) return <PageLoader label={t("profileLoading")} />;

  if (!profile || !user) {
    return (
      <div className="flex items-center justify-center py-32 text-white/40">
        <div className="text-center">
          <div className="text-4xl mb-3">😕</div>
          <p>{t("profileNotFound")}</p>
        </div>
      </div>
    );
  }

  const p = profile as any;
  const credits: number = p.credits ?? 0;
  const planCredits: number = p.planCredits ?? 15;
  const isUnlimited = planCredits === -1;
  const creditsUsed = isUnlimited ? 0 : planCredits - credits;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">{t("profileTitle")}</h1>
        <p className="text-white/50 text-sm mt-1">{t("profileSubtitle")}</p>
      </div>

      <div className="rounded-2xl p-6 flex items-center gap-6" style={GLASS}>
        <img
          src={profile.photoURL ?? "/avatar.png"}
          alt={profile.displayName ?? "User"}
          className="w-20 h-20 rounded-full border-2 border-white/25 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-white truncate">{profile.displayName ?? "—"}</h2>
          <p className="text-white/60 text-sm truncate">{profile.email ?? "—"}</p>
          <p className="text-white/30 text-xs font-mono mt-1 truncate">uid: {profile.uid}</p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${PLAN_BADGE[profile.plan] ?? PLAN_BADGE.free}`}>
          {profile.plan.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label={t("profileTotalBuilds")} value={profile.builds} sub={t("profileAllTime")} />
        <StatCard
          label={t("profileCreditsLeft")}
          value={isUnlimited ? "∞" : credits.toFixed(1)}
          sub={isUnlimited ? t("profileUnlimitedPlan") : `${creditsUsed.toFixed(1)} of ${planCredits} used`}
        />
        <StatCard
          label={t("profileCurrentPlan")}
          value={profile.plan.toUpperCase()}
          sub={profile.plan === "free" ? t("profileUpgrade") : t("profileActive")}
        />
      </div>

      <div className="rounded-2xl p-6" style={GLASS}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-white">{t("profileBuildCredits")}</p>
          <p className="text-sm text-white/50">
            {isUnlimited ? t("profileUnlimited") : `${credits.toFixed(1)} / ${planCredits} ${t("profileCreditsRemaining")}`}
          </p>
        </div>
        {!isUnlimited && (
          <div className="w-full bg-white/10 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${credits <= 0 ? "bg-red-400" : credits / planCredits < 0.2 ? "bg-yellow-400" : "bg-accent-light"}`}
              style={{ width: `${Math.min((creditsUsed / planCredits) * 100, 100)}%` }}
            />
          </div>
        )}
        {credits <= 0 && !isUnlimited && (
          <p className="text-xs text-red-400 mt-2">{t("profileCreditsExhausted")}</p>
        )}
      </div>

      <div className="rounded-2xl p-6 space-y-4" style={GLASS}>
        <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">{t("profileAccountDetails")}</h3>
        {[
          { label: t("profileDisplayName"), value: profile.displayName ?? "—" },
          { label: t("profileEmail"),       value: profile.email ?? "—" },
          { label: t("profileUserId"),      value: profile.uid, mono: true },
          { label: t("profilePlan"),        value: profile.plan.toUpperCase() },
          { label: t("profileMemberSince"), value: formatTimestamp(profile.createdAt) },
          { label: t("profileLastUpdated"), value: formatTimestamp(profile.updatedAt) },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between py-2 last:border-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <span className="text-sm text-white/50">{row.label}</span>
            <span className={`text-sm text-white/90 max-w-[60%] truncate text-right ${row.mono ? "font-mono text-xs" : ""}`}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
