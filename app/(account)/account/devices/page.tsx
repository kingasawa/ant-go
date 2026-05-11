"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { GLASS, MODAL_BG } from "@/lib/glass";

interface Device {
  udid: string;
  name: string | null;
  deviceProduct: string | null;
  deviceSerial: string | null;
  source: "dashboard" | "cli";
  addedAt: string | null;
  teamId: string | null;
  teamName: string | null;
}

type EnrollStep = "idle" | "creating" | "scanning" | "naming" | "saving" | "done" | "error" | "timeout";

function AddDeviceModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [step, setStep] = useState<EnrollStep>("idle");
  const [enrollUrl, setEnrollUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [enrollToken, setEnrollToken] = useState("");
  const [pendingDevice, setPendingDevice] = useState<{ udid: string; deviceProduct: string | null; deviceSerial: string | null } | null>(null);
  const [deviceName, setDeviceName] = useState("");
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  async function startEnrollment() {
    setStep("creating");
    setError("");
    try {
      const idToken = await user!.getIdToken();
      const res = await fetch("/api/device-enroll/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ source: "dashboard", origin: window.location.origin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("devicesErrorTitle"));

      const landingUrl = `${window.location.origin}/enroll/${data.token}`;
      setEnrollUrl(landingUrl);
      setEnrollToken(data.token);

      const QRCode = (await import("qrcode")).default;
      const dataUrl = await QRCode.toDataURL(landingUrl, { width: 220, margin: 2 });
      setQrDataUrl(dataUrl);
      setStep("scanning");

      pollRef.current = setInterval(() => pollStatus(data.token), 3000);

      timeoutRef.current = setTimeout(() => {
        if (pollRef.current) clearInterval(pollRef.current);
        setStep("timeout");
      }, 10 * 60 * 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("devicesErrorTitle"));
      setStep("error");
    }
  }

  async function pollStatus(token: string) {
    try {
      const res = await fetch(`/api/device-enroll/${token}/status`);
      const data = await res.json();

      if (data.status === "registered" && data.udid) {
        if (pollRef.current) clearInterval(pollRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setPendingDevice({ udid: data.udid, deviceProduct: data.deviceProduct, deviceSerial: data.deviceSerial });
        setDeviceName(data.deviceProduct ? formatProduct(data.deviceProduct) : "iPhone");
        setStep("naming");
      } else if (data.status === "expired") {
        if (pollRef.current) clearInterval(pollRef.current);
        setStep("timeout");
      }
    } catch {
      // network hiccup, tiếp tục poll
    }
  }

  async function saveDevice() {
    if (!pendingDevice || !deviceName.trim()) return;
    setStep("saving");
    try {
      const idToken = await user!.getIdToken();
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          udid: pendingDevice.udid,
          name: deviceName.trim(),
          deviceProduct: pendingDevice.deviceProduct,
          deviceSerial: pendingDevice.deviceSerial,
          source: "dashboard",
        }),
      });
      if (!res.ok) throw new Error(t("devicesSaving"));
      setStep("done");
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("devicesErrorTitle"));
      setStep("error");
    }
  }

  function copyUrl() {
    navigator.clipboard.writeText(enrollUrl).catch(() => {});
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm rounded-2xl p-6 text-white z-10" style={MODAL_BG}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">{t("devicesModalTitle")}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === "idle" && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3" />
              </svg>
            </div>
            <p className="text-sm text-white/60 mb-6 leading-relaxed">{t("devicesScanDesc")}</p>
            <button
              onClick={startEnrollment}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-white text-gray-900 hover:bg-white/90 transition"
            >
              {t("devicesStart")}
            </button>
          </div>
        )}

        {step === "creating" && (
          <div className="text-center py-6">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-white/60">{t("devicesCreating")}</p>
          </div>
        )}

        {step === "scanning" && (
          <div className="text-center">
            <p className="text-sm text-white/60 mb-4">
              {t("devicesScanInstruction")}
            </p>

            {qrDataUrl && (
              <div className="flex justify-center mb-4">
                <div className="p-2 bg-white rounded-xl inline-block">
                  <img src={qrDataUrl} alt="QR Code" width={200} height={200} />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 mb-4">
              <span className="text-xs text-white/50 truncate flex-1 font-mono">{enrollUrl}</span>
              <button onClick={copyUrl} className="text-white/40 hover:text-white transition flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-white/40">
              <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
              {t("devicesWaiting")}
            </div>
          </div>
        )}

        {step === "naming" && pendingDevice && (
          <div>
            <div className="flex items-center gap-3 bg-green-500/10 border border-green-400/20 rounded-xl px-4 py-3 mb-5">
              <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-green-300">{t("devicesDeviceReady")}</p>
                <p className="text-xs text-white/50 font-mono mt-0.5">{pendingDevice.udid}</p>
              </div>
            </div>

            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
              {t("devicesNameLabel")}
            </label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveDevice()}
              placeholder="My iPhone"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/50 mb-4"
            />

            <button
              onClick={saveDevice}
              disabled={!deviceName.trim()}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-white text-gray-900 hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {t("devicesSaveBtn")}
            </button>
          </div>
        )}

        {step === "saving" && (
          <div className="text-center py-6">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-white/60">{t("devicesSaving")}</p>
          </div>
        )}

        {step === "done" && (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-semibold text-white mb-1">{t("devicesDoneTitle")}</p>
            <p className="text-sm text-white/50 mb-5">{t("devicesDoneDesc")}</p>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-white text-gray-900 hover:bg-white/90 transition"
            >
              {t("close")}
            </button>
          </div>
        )}

        {step === "timeout" && (
          <div className="text-center py-4">
            <p className="text-white/70 mb-2 font-semibold">{t("devicesTimeoutTitle")}</p>
            <p className="text-sm text-white/50 mb-5">{t("devicesTimeoutDesc")}</p>
            <button
              onClick={() => { setStep("idle"); setQrDataUrl(""); setEnrollUrl(""); }}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-white text-gray-900 hover:bg-white/90 transition"
            >
              {t("retry")}
            </button>
          </div>
        )}

        {step === "error" && (
          <div className="text-center py-4">
            <p className="text-red-400 mb-2 font-semibold">{t("devicesErrorTitle")}</p>
            <p className="text-sm text-white/50 mb-5">{error}</p>
            <button
              onClick={() => setStep("idle")}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-white text-gray-900 hover:bg-white/90 transition"
            >
              {t("retry")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

let toastCounter = 0;

export default function DevicesPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deletingUdid, setDeletingUdid] = useState<string | null>(null);
  const [fadingUdids, setFadingUdids] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmDeleteUdid, setConfirmDeleteUdid] = useState<string | null>(null);
  const [openMenuUdid, setOpenMenuUdid] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  function showToast(message: string, type: "success" | "error") {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 3000);
  }

  const fetchDevices = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/devices", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDevices(data.devices ?? []);
    } catch {
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  async function deleteDevice(udid: string) {
    if (!user) return;
    setDeletingUdid(udid);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/devices?udid=${encodeURIComponent(udid)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error(t("devicesDeleteFailed"));

      setFadingUdids((prev) => new Set(prev).add(udid));
      setTimeout(() => {
        setDevices((prev) => prev.filter((d) => d.udid !== udid));
        setFadingUdids((prev) => { const s = new Set(prev); s.delete(udid); return s; });
      }, 400);

      showToast(t("devicesDeleteSuccess"), "success");
    } catch {
      showToast(t("devicesDeleteFailed"), "error");
    } finally {
      setDeletingUdid(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">{t("devicesTitle")}</h1>
          <p className="text-white/50 text-sm mt-1">{t("devicesSubtitle")}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-white text-gray-900 hover:bg-white/90 transition flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t("devicesRegisterBtn")}
        </button>
      </div>

      <div className="rounded-2xl overflow-hidden" style={GLASS}>
        {loading ? (
          <div className="text-center py-12 text-white/40">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">{t("devicesLoading")}</p>
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-14 px-6">
            <div className="w-14 h-14 rounded-2xl bg-white/8 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3" />
              </svg>
            </div>
            <p className="text-white/50 text-sm font-medium">{t("devicesNoDevices")}</p>
            <p className="text-white/30 text-xs mt-1">{t("devicesNoDevicesHint")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div
              className="grid grid-cols-[1fr_220px_120px_180px_44px] px-5 py-2.5"
              style={{ background: "var(--dash-border)" }}
            >
              <span className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">{t("devicesColDevice")}</span>
              <span className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">{t("devicesColTeam")}</span>
              <span className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">{t("devicesColType")}</span>
              <span className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">{t("devicesColCreatedAt")}</span>
              <span />
            </div>

            {devices.map((device) => (
              <div
                key={device.udid}
                className="grid grid-cols-[1fr_220px_120px_180px_44px] items-center px-5 py-4 border-b last:border-0 hover:bg-white/[0.03] transition-all"
                style={{
                  borderColor: "var(--dash-border)",
                  opacity: fadingUdids.has(device.udid) ? 0 : 1,
                  transform: fadingUdids.has(device.udid) ? "translateX(16px)" : "translateX(0)",
                  transitionDuration: "400ms",
                }}
              >
                <div className="min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-white truncate">{device.udid}</span>
                    <div className="group relative flex-shrink-0">
                      <svg className="w-4 h-4 text-white/30 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-6 hidden group-hover:block z-10 bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70 whitespace-nowrap shadow-xl">
                        UDID — Unique Device Identifier
                      </div>
                    </div>
                  </div>
                  {device.name && <p className="text-xs text-white/40 truncate mt-0.5">{device.name}</p>}
                </div>

                <div className="min-w-0">
                  {device.teamId ? (
                    <>
                      <p className="text-sm text-white/80 truncate">{device.teamName ?? "—"}</p>
                      <p className="text-xs text-white/40 mt-0.5 font-mono">ID: {device.teamId}</p>
                    </>
                  ) : (
                    <span className="text-sm text-white/30">—</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-white/50 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3" />
                  </svg>
                  <span className="text-sm text-white">{getDeviceClass(device.deviceProduct)}</span>
                </div>

                <div>
                  {device.addedAt ? (
                    <span className="text-sm text-white/60">{formatDateTime(device.addedAt)}</span>
                  ) : (
                    <span className="text-sm text-white/30">—</span>
                  )}
                </div>

                <div className="flex items-center justify-center">
                  <button
                    onClick={(e) => {
                      if (openMenuUdid === device.udid) {
                        setOpenMenuUdid(null);
                      } else {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMenuPos({ x: rect.right, y: rect.bottom + 4 });
                        setOpenMenuUdid(device.udid);
                      }
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-xl px-4 py-3 bg-white/5 border border-white/10">
        <p className="text-xs text-white/40 leading-relaxed">
          {t("devicesInfo")}{" "}
          <code className="text-white/60 bg-white/10 px-1 py-0.5 rounded">ant-go build --profile development</code>.
        </p>
      </div>

      {openMenuUdid && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpenMenuUdid(null)} />
          <div
            className="fixed z-50 w-36 rounded-xl py-1 shadow-xl border border-white/10 bg-gray-900"
            style={{ top: menuPos.y, right: `calc(100vw - ${menuPos.x}px)` }}
          >
            <button
              onClick={() => { setOpenMenuUdid(null); setConfirmDeleteUdid(openMenuUdid); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-white/5 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {t("delete")}
            </button>
          </div>
        </>
      )}

      {showModal && (
        <AddDeviceModal
          onClose={() => setShowModal(false)}
          onAdded={() => { setShowModal(false); fetchDevices(); }}
        />
      )}

      {confirmDeleteUdid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDeleteUdid(null)} />
          <div className="relative w-full max-w-xs rounded-2xl p-6 text-white z-10" style={MODAL_BG}>
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-white text-center mb-1">{t("devicesConfirmDelete")}</h3>
            <p className="text-sm text-white/50 text-center mb-1">
              {devices.find((d) => d.udid === confirmDeleteUdid)?.name ?? "Device"}
            </p>
            <p className="text-xs text-white/30 font-mono text-center truncate mb-5">{confirmDeleteUdid}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDeleteUdid(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/70 bg-white/10 hover:bg-white/15 transition"
              >
                {t("cancel")}
              </button>
              <button
                onClick={() => { const u = confirmDeleteUdid; setConfirmDeleteUdid(null); deleteDevice(u); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500/80 hover:bg-red-500 transition"
              >
                {t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-white shadow-lg backdrop-blur-md border transition-all duration-300 ${
              toast.type === "success"
                ? "bg-green-500/20 border-green-400/30"
                : "bg-red-500/20 border-red-400/30"
            }`}
          >
            {toast.type === "success" ? (
              <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}

function getDeviceClass(deviceProduct: string | null): string {
  if (!deviceProduct) return "iOS Device";
  if (deviceProduct.startsWith("iPad")) return "iPad";
  if (deviceProduct.startsWith("iPhone")) return "iPhone";
  if (deviceProduct.startsWith("Mac")) return "Mac";
  return "iOS Device";
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function formatProduct(raw: string): string {
  const map: Record<string, string> = {
    "iPhone17,4": "iPhone 16e",
    "iPhone17,1": "iPhone 16 Pro Max",
    "iPhone17,2": "iPhone 16 Pro",
    "iPhone17,3": "iPhone 16 Plus",
    "iPhone17,5": "iPhone 16",
    "iPhone16,1": "iPhone 15 Pro",
    "iPhone16,2": "iPhone 15 Pro Max",
    "iPhone15,4": "iPhone 15",
    "iPhone15,5": "iPhone 15 Plus",
    "iPhone14,6": "iPhone SE (3rd gen)",
  };
  return map[raw] ?? raw;
}
