"use client";
import { useEffect, useState } from "react";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { UserProfile } from "@/lib/createUserProfile";

const PLAN_BADGE: Record<string, string> = {
  free: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
  pro: "bg-indigo-100 dark:bg-indigo-600/30 text-indigo-600 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700",
  enterprise: "bg-yellow-50 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700",
};

const PLAN_ICON: Record<string, string> = {
  free: "🆓",
  pro: "⚡",
  enterprise: "🏢",
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
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-gray-400 animate-pulse">Loading profile…</div>
      </div>
    );
  }

  if (!profile || !user) {
    return (
      <div className="flex items-center justify-center py-32 text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-3">😕</div>
          <p>Profile not found in Firestore.</p>
        </div>
      </div>
    );
  }

  const freeUsed = 10 - profile.freeBuildsRemaining;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
        <p className="text-gray-400 text-sm mt-1">Your account information synced from Firestore</p>
      </div>

      {/* Avatar + identity */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 flex items-center gap-6">
        <img
          src={profile.photoURL ?? "/avatar.png"}
          alt={profile.displayName ?? "User"}
          className="w-20 h-20 rounded-full border-2 border-gray-200 dark:border-gray-700 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white truncate">{profile.displayName ?? "—"}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm truncate">{profile.email ?? "—"}</p>
          <p className="text-gray-400 text-xs font-mono mt-1 truncate">uid: {profile.uid}</p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${PLAN_BADGE[profile.plan] ?? PLAN_BADGE.free}`}>
          {PLAN_ICON[profile.plan]} {profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1)}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Builds" value={profile.builds} sub="All time" />
        <StatCard label="Free Credits Left" value={profile.freeBuildsRemaining} sub={`${freeUsed} of 10 used`} />
        <StatCard label="Current Plan" value={profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1)} sub={profile.plan === "free" ? "Upgrade to unlock more" : "Active"} />
      </div>

      {/* Free credit usage bar */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-900 dark:text-white">Free Build Credits</p>
          <p className="text-sm text-gray-400">{freeUsed} / 10 used</p>
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all ${freeUsed >= 10 ? "bg-red-500" : freeUsed >= 7 ? "bg-yellow-500" : "bg-indigo-500"}`}
            style={{ width: `${Math.min((freeUsed / 10) * 100, 100)}%` }}
          />
        </div>
        {profile.freeBuildsRemaining === 0 && (
          <p className="text-xs text-red-500 mt-2">⚠ Free credits exhausted. Upgrade your plan to continue building.</p>
        )}
      </div>

      {/* Account details */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Account Details</h3>
        {[
          { label: "Display Name", value: profile.displayName ?? "—" },
          { label: "Email", value: profile.email ?? "—" },
          { label: "User ID", value: profile.uid, mono: true },
          { label: "Plan", value: `${PLAN_ICON[profile.plan]} ${profile.plan}` },
          { label: "Member Since", value: formatTimestamp(profile.createdAt) },
          { label: "Last Updated", value: formatTimestamp(profile.updatedAt) },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <span className="text-sm text-gray-400">{row.label}</span>
            <span className={`text-sm text-gray-700 dark:text-gray-200 max-w-[60%] truncate text-right ${row.mono ? "font-mono text-xs" : ""}`}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
