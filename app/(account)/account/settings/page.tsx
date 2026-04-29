"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { GLASS } from "@/lib/glass";

/* ─── Reusable iOS-style primitives ──────────────────────────────────────── */

function Section({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      {label && (
        <p className="text-xs font-semibold text-white/50 uppercase tracking-wider px-1 mb-1">
          {label}
        </p>
      )}
      <div className="rounded-2xl overflow-hidden divide-y divide-white/10" style={GLASS}>
        {children}
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  sublabel,
  right,
  danger,
  onClick,
}: {
  icon: string;
  label: string;
  sublabel?: string;
  right?: React.ReactNode;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 ${onClick ? "cursor-pointer active:bg-white/10" : ""}`}
    >
      <span className="text-lg w-6 text-center flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${danger ? "text-red-400" : "text-white"}`}>
          {label}
        </p>
        {sublabel && <p className="text-xs text-white/50 mt-0.5">{sublabel}</p>}
      </div>
      {right ?? (
        onClick && (
          <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )
      )}
    </div>
  );
}

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${enabled ? "bg-indigo-500" : "bg-white/20"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${enabled ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}

/* ─── Theme picker ────────────────────────────────────────────────────────── */

type ThemeOption = { id: string; label: string; icon: string; desc: string };

const THEME_OPTIONS: ThemeOption[] = [
  { id: "light", label: "Light", icon: "☀️", desc: "Always light" },
  { id: "dark",  label: "Dark",  icon: "🌙", desc: "Always dark" },
  { id: "system", label: "Auto", icon: "⚙️", desc: "Follow system setting" },
];

function ThemePicker() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="px-4 py-3">
      <p className="text-sm font-medium text-white mb-3 flex items-center gap-2">
        🎨 <span>Appearance</span>
      </p>
      <div className="grid grid-cols-3 gap-2">
        {THEME_OPTIONS.map((opt) => {
          const active = theme === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setTheme(opt.id)}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all
                ${active
                  ? "border-indigo-400 bg-indigo-500/20"
                  : "border-white/20 hover:border-white/40"
                }`}
            >
              <span className="text-2xl">{opt.icon}</span>
              <span className={`text-xs font-semibold ${active ? "text-indigo-300" : "text-white/60"}`}>
                {opt.label}
              </span>
              {opt.id === "system" && mounted && (
                <span className="text-[10px] text-white/40">({resolvedTheme})</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function SettingsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [buildAlerts, setBuildAlerts] = useState(true);

  return (
    <div className="max-w-xl mx-auto">
      {/* Title */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-white/50 text-sm mt-1">Manage your preferences</p>
      </div>

      {/* Appearance */}
      <Section label="Appearance">
        <ThemePicker />
      </Section>

      {/* Notifications */}
      <Section label="Notifications">
        <Row
          icon="🔔"
          label="Push Notifications"
          sublabel="Receive alerts for build events"
          right={<Toggle enabled={notifications} onToggle={() => setNotifications((v) => !v)} />}
        />
        <Row
          icon="🚨"
          label="Build Failure Alerts"
          sublabel="Notify when a build fails"
          right={<Toggle enabled={buildAlerts} onToggle={() => setBuildAlerts((v) => !v)} />}
        />
      </Section>

      {/* Account */}
      <Section label="Account">
        <Row icon="👤" label="Display Name" sublabel={user?.displayName ?? "—"} />
        <Row icon="📧" label="Email" sublabel={user?.email ?? "—"} />
        <Row icon="🔑" label="Authentication" sublabel="Google Sign-In" />
      </Section>

      {/* About */}
      <Section label="About">
        <Row icon="📦" label="Version" right={<span className="text-sm text-gray-400">1.0.0</span>} />
        <Row icon="📄" label="Privacy Policy" onClick={() => {}} />
        <Row icon="📃" label="Terms of Service" onClick={() => {}} />
        <Row icon="⭐" label="GitHub Repository" onClick={() => window.open("https://github.com", "_blank")} />
      </Section>

      {/* Danger zone */}
      <Section label="Danger Zone">
        <Row icon="🗑️" label="Delete Account" danger onClick={() => {}} />
      </Section>
    </div>
  );
}

