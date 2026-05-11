"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { GLASS } from "@/lib/glass";
import {
  HiOutlineBell, HiOutlineExclamationTriangle, HiOutlineUser, HiOutlineEnvelope, HiOutlineKey,
  HiOutlineCube, HiOutlineDocument, HiOutlineDocumentText, HiOutlineTrash,
  HiOutlineChevronRight, HiOutlineSun, HiOutlineMoon, HiOutlineComputerDesktop, HiOutlineSwatch,
} from "react-icons/hi2";

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
  icon, label, sublabel, right, danger, onClick,
}: {
  icon: React.ReactNode;
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
      <span className="w-6 flex items-center justify-center flex-shrink-0 text-white/60">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${danger ? "text-red-400" : "text-white"}`}>{label}</p>
        {sublabel && <p className="text-xs text-white/50 mt-0.5">{sublabel}</p>}
      </div>
      {right ?? (onClick && <HiOutlineChevronRight className="w-4 h-4 text-white/40" />)}
    </div>
  );
}

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${enabled ? "bg-accent" : "bg-white/20"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${enabled ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}

function ThemePicker() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const THEME_OPTIONS = [
    { id: "light",  label: t("settingsLight"), icon: <HiOutlineSun             className="w-6 h-6" />, desc: t("settingsAlwaysLight") },
    { id: "dark",   label: t("settingsDark"),  icon: <HiOutlineMoon            className="w-6 h-6" />, desc: t("settingsAlwaysDark") },
    { id: "system", label: t("settingsAuto"),  icon: <HiOutlineComputerDesktop className="w-6 h-6" />, desc: t("settingsFollowSystem") },
  ];

  return (
    <div className="px-4 py-3">
      <p className="text-sm font-medium text-white mb-3 flex items-center gap-2">
        <HiOutlineSwatch className="w-4 h-4" /> <span>{t("settingsAppearance")}</span>
      </p>
      <div className="grid grid-cols-3 gap-2">
        {THEME_OPTIONS.map((opt) => {
          const active = theme === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setTheme(opt.id)}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all
                ${active ? "border-accent bg-accent/20" : "border-white/20 hover:border-white/40"}`}
            >
              <span className={active ? "text-accent-light" : "text-white/60"}>{opt.icon}</span>
              <span className={`text-xs font-semibold ${active ? "text-accent-light" : "text-white/60"}`}>
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

export default function SettingsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState(true);
  const [buildAlerts, setBuildAlerts] = useState(true);

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{t("settingsTitle")}</h1>
        <p className="text-white/50 text-sm mt-1">{t("settingsSubtitle")}</p>
      </div>

      <Section label={t("settingsAppearance")}>
        <ThemePicker />
      </Section>

      <Section label={t("settingsNotifications")}>
        <Row
          icon={<HiOutlineBell className="w-5 h-5" />}
          label={t("settingsPushNotif")}
          sublabel={t("settingsPushNotifDesc")}
          right={<Toggle enabled={notifications} onToggle={() => setNotifications((v) => !v)} />}
        />
        <Row
          icon={<HiOutlineExclamationTriangle className="w-5 h-5" />}
          label={t("settingsBuildAlerts")}
          sublabel={t("settingsBuildAlertsDesc")}
          right={<Toggle enabled={buildAlerts} onToggle={() => setBuildAlerts((v) => !v)} />}
        />
      </Section>

      <Section label={t("settingsAccount")}>
        <Row icon={<HiOutlineUser className="w-5 h-5" />} label={t("settingsDisplayName")} sublabel={user?.displayName ?? "—"} />
        <Row icon={<HiOutlineEnvelope className="w-5 h-5" />} label={t("settingsEmail")} sublabel={user?.email ?? "—"} />
        <Row icon={<HiOutlineKey className="w-5 h-5" />} label={t("settingsAuth")} sublabel={t("settingsGoogleSignIn")} />
      </Section>

      <Section label={t("settingsAbout")}>
        <Row icon={<HiOutlineCube className="w-5 h-5" />} label={t("settingsVersion")} right={<span className="text-sm text-gray-400">1.0.0</span>} />
        <Row icon={<HiOutlineDocument className="w-5 h-5" />} label={t("settingsPrivacy")} onClick={() => {}} />
        <Row icon={<HiOutlineDocumentText className="w-5 h-5" />} label={t("settingsTerms")} onClick={() => {}} />
      </Section>

      <Section label={t("settingsDangerZone")}>
        <Row icon={<HiOutlineTrash className="w-5 h-5" />} label={t("settingsDeleteAccount")} danger onClick={() => {}} />
      </Section>
    </div>
  );
}
