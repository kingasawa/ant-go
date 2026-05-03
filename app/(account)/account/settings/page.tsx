﻿"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { GLASS } from "@/lib/glass";
import {
  HiOutlineBell, HiOutlineExclamationTriangle, HiOutlineUser, HiOutlineEnvelope, HiOutlineKey,
  HiOutlineCube, HiOutlineDocument, HiOutlineDocumentText, HiOutlineTrash,
  HiOutlineChevronRight, HiOutlineSun, HiOutlineMoon, HiOutlineComputerDesktop, HiOutlineSwatch,
  HiOutlineCheckCircle, HiOutlinePencilSquare, HiOutlineXCircle,
} from "react-icons/hi2";

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
        <p className={`text-sm font-medium ${danger ? "text-red-400" : "text-white"}`}>
          {label}
        </p>
        {sublabel && <p className="text-xs text-white/50 mt-0.5">{sublabel}</p>}
      </div>
      {right ?? (
        onClick && <HiOutlineChevronRight className="w-4 h-4 text-white/40" />
      )}
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

/* ─── Theme picker ────────────────────────────────────────────────────────── */

type ThemeOption = { id: string; label: string; icon: React.ReactNode; desc: string };

const THEME_OPTIONS: ThemeOption[] = [
  { id: "light",  label: "Light", icon: <HiOutlineSun              className="w-6 h-6" />, desc: "Always light" },
  { id: "dark",   label: "Dark",  icon: <HiOutlineMoon             className="w-6 h-6" />, desc: "Always dark" },
  { id: "system", label: "Auto",  icon: <HiOutlineComputerDesktop  className="w-6 h-6" />, desc: "Follow system setting" },
];

function ThemePicker() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="px-4 py-3">
      <p className="text-sm font-medium text-white mb-3 flex items-center gap-2">
        <HiOutlineSwatch className="w-4 h-4" /> <span>Appearance</span>
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
                  ? "border-accent bg-accent/20"
                  : "border-white/20 hover:border-white/40"
                }`}
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

/* ─── Apple Developer Credentials ────────────────────────────────────────── */

interface AscStatus {
  hasKey: boolean;
  keyId: string | null;
  issuerId: string | null;
}

function AscCredentialsSection() {
  const { user } = useAuth();
  const [status, setStatus]     = useState<AscStatus | null>(null);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState(false);
  const [keyId, setKeyId]       = useState("");
  const [issuerId, setIssuerId] = useState("");
  const [saving, setSaving]     = useState(false);
  const [saveOk, setSaveOk]     = useState(false);
  const [error, setError]       = useState("");

  async function loadStatus() {
    if (!user) return;
    setLoading(true);
    try {
      const idToken = await user.getIdToken();
      const res  = await fetch("/api/user/asc-credentials", { headers: { Authorization: `Bearer ${idToken}` } });
      const data = await res.json();
      setStatus({ hasKey: data.hasKey ?? false, keyId: data.keyId ?? null, issuerId: data.issuerId ?? null });
      setKeyId(data.keyId ?? "");
      setIssuerId(data.issuerId ?? "");
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadStatus(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!keyId.trim() || !issuerId.trim()) { setError("Key ID và Issuer ID là bắt buộc"); return; }
    setSaving(true); setError("");
    try {
      const idToken = await user!.getIdToken();
      const res = await fetch("/api/user/asc-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ keyId: keyId.trim(), issuerId: issuerId.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Lỗi không xác định");
      setSaveOk(true);
      setEditing(false);
      await loadStatus();
      setTimeout(() => setSaveOk(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi không xác định");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Section label="Apple Developer">
        <Row icon={<HiOutlineKey className="w-5 h-5" />} label="App Store Connect Key" sublabel="Đang tải..." />
      </Section>
    );
  }

  return (
    <Section label="Apple Developer">
      {/* p8 status — luôn hidden, chỉ hiện trạng thái */}
      <Row
        icon={<HiOutlineKey className="w-5 h-5" />}
        label="Private Key (.p8)"
        sublabel={status?.hasKey
          ? "Đã cấu hình qua CLI"
          : "Chưa có — chạy: ant-go auth login"}
        right={
          status?.hasKey
            ? <HiOutlineCheckCircle className="w-5 h-5 text-green-400" />
            : <HiOutlineXCircle className="w-5 h-5 text-amber-400" />
        }
      />

      {/* Key ID */}
      {editing ? (
        <div className="px-4 py-3 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1">Key ID</label>
            <input
              value={keyId}
              onChange={(e) => setKeyId(e.target.value)}
              placeholder="VD: 2X9R4HXF34"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/50 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1">Issuer ID</label>
            <input
              value={issuerId}
              onChange={(e) => setIssuerId(e.target.value)}
              placeholder="VD: 69a6de70-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/50 font-mono"
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => { setEditing(false); setError(""); setKeyId(status?.keyId ?? ""); setIssuerId(status?.issuerId ?? ""); }}
              className="flex-1 py-2 rounded-xl text-sm font-semibold text-white/60 bg-white/10 hover:bg-white/15 transition"
            >Huỷ</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 rounded-xl text-sm font-semibold bg-white text-gray-900 hover:bg-white/90 disabled:opacity-40 transition"
            >{saving ? "Đang lưu..." : "Lưu"}</button>
          </div>
        </div>
      ) : (
        <>
          <Row
            icon={<HiOutlineCube className="w-5 h-5" />}
            label="Key ID"
            sublabel={status?.keyId ?? "Chưa có"}
            right={
              <button onClick={() => setEditing(true)} className="text-white/40 hover:text-white transition">
                <HiOutlinePencilSquare className="w-4 h-4" />
              </button>
            }
          />
          <Row
            icon={<HiOutlineCube className="w-5 h-5" />}
            label="Issuer ID"
            sublabel={status?.issuerId ?? "Chưa có"}
            right={
              !editing && (
                <button onClick={() => setEditing(true)} className="text-white/40 hover:text-white transition">
                  <HiOutlinePencilSquare className="w-4 h-4" />
                </button>
              )
            }
          />
        </>
      )}
      {saveOk && (
        <div className="px-4 py-2 flex items-center gap-2 text-green-400 text-xs">
          <HiOutlineCheckCircle className="w-4 h-4" /> Đã lưu thành công
        </div>
      )}
    </Section>
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
          icon={<HiOutlineBell className="w-5 h-5" />}
          label="Push Notifications"
          sublabel="Receive alerts for build events"
          right={<Toggle enabled={notifications} onToggle={() => setNotifications((v) => !v)} />}
        />
        <Row
          icon={<HiOutlineExclamationTriangle className="w-5 h-5" />}
          label="Build Failure Alerts"
          sublabel="Notify when a build fails"
          right={<Toggle enabled={buildAlerts} onToggle={() => setBuildAlerts((v) => !v)} />}
        />
      </Section>

      {/* Apple Developer Credentials */}
      <AscCredentialsSection />

      {/* Account */}
      <Section label="Account">
        <Row icon={<HiOutlineUser className="w-5 h-5" />} label="Display Name" sublabel={user?.displayName ?? "—"} />
        <Row icon={<HiOutlineEnvelope className="w-5 h-5" />} label="Email" sublabel={user?.email ?? "—"} />
        <Row icon={<HiOutlineKey className="w-5 h-5" />} label="Authentication" sublabel="Google Sign-In" />
      </Section>

      {/* About */}
      <Section label="About">
        <Row icon={<HiOutlineCube className="w-5 h-5" />} label="Version" right={<span className="text-sm text-gray-400">1.0.0</span>} />
        <Row icon={<HiOutlineDocument className="w-5 h-5" />} label="Privacy Policy" onClick={() => {}} />
        <Row icon={<HiOutlineDocumentText className="w-5 h-5" />} label="Terms of Service" onClick={() => {}} />
      </Section>

      {/* Danger zone */}
      <Section label="Danger Zone">
        <Row icon={<HiOutlineTrash className="w-5 h-5" />} label="Delete Account" danger onClick={() => {}} />
      </Section>
    </div>
  );
}

