"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection, query, where,
  onSnapshot, addDoc, deleteDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { AppDoc, AppFormData, APP_FORM_FIELDS } from "@/lib/appTypes";
import { GLASS, MODAL_BG } from "@/lib/glass";
import PageLoader from "@/app/components/PageLoader";

const emptyForm = (): AppFormData => ({
  name: "", bundleId: "", teamId: "", scheme: "", xcworkspace: "", xcodeproj: "",
});

function AppModal({
  onClose,
  onSave,
  saving,
}: {
  onClose: () => void;
  onSave: (data: AppFormData) => Promise<void>;
  saving: boolean;
}) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError(t("appsNameRequired")); return; }
    await onSave({ name: name.trim(), bundleId: "", teamId: "", scheme: "", xcworkspace: "", xcodeproj: "" });
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative rounded-2xl w-full max-w-sm flex flex-col" style={MODAL_BG}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
          <h2 className="text-base font-semibold text-white">{t("appsModalTitle")}</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/10 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5">
          <label className="block text-xs font-medium text-white/60 mb-1">
            {t("appsNameLabel")} <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            placeholder={t("appsNamePlaceholder")}
            className={`w-full px-3 py-2 rounded-xl border text-sm bg-white/10 text-white placeholder-white/30 outline-none transition
              ${error
                ? "border-red-400/60 focus:ring-2 focus:ring-red-300/30"
                : "border-white/20 focus:border-white/50 focus:ring-2 focus:ring-white/10"
              }`}
          />
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
          <p className="text-xs text-white/40 mt-2">{t("appsNameHint")}</p>
        </form>

        <div className="flex gap-3 px-6 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}>
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 transition" style={{ border: "1px solid rgba(255,255,255,0.2)" }}>
            {t("cancel")}
          </button>
          <button onClick={handleSubmit as unknown as React.MouseEventHandler} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent disabled:opacity-60 text-accent-contrast text-sm font-semibold transition">
            {saving ? t("saving") : t("appsCreateBtn")}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirm({ app, onClose, onConfirm }: { app: AppDoc; onClose: () => void; onConfirm: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative rounded-2xl w-full max-w-sm p-6 text-center" style={MODAL_BG}>
        <div className="text-4xl mb-3">🗑️</div>
        <h3 className="text-base font-bold text-white mb-2">{t("appsDeleteTitle")}</h3>
        <p className="text-sm text-white/60 mb-6">
          {t("appsDeleteConfirmPre")} <strong className="text-white">{app.name}</strong>{t("appsDeleteConfirmPost")}{" "}
          {t("appsDeleteWarning")}
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 transition" style={{ border: "1px solid rgba(255,255,255,0.2)" }}>
            {t("cancel")}
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition">
            {t("appsDeleteBtn")}
          </button>
        </div>
      </div>
    </div>
  );
}

function AppCard({ app, onDelete }: { app: AppDoc; onDelete: (app: AppDoc) => void }) {
  const { t } = useLanguage();
  const router  = useRouter();
  const initial = app.name.trim().charAt(0).toUpperCase();
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(app.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={() => router.push(`/account/app/${encodeURIComponent(app.name)}`)}
      className="rounded-2xl p-5 hover:scale-[1.01] transition-all group flex items-center gap-4 cursor-pointer"
      style={GLASS}
    >
      <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0 text-white font-bold text-lg select-none">
        {initial}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-white truncate">{app.name}</h3>
        {app.scheme && (
          <p className="text-xs text-white/50 font-mono mt-0.5 truncate">{app.scheme}</p>
        )}
        <div className="flex items-center gap-1 mt-0.5">
          <p className="text-xs text-white/25 font-mono break-all leading-relaxed">{app.id}</p>
          <button
            onClick={handleCopy}
            title="Copy UUID"
            className="flex-shrink-0 text-white/30 hover:text-accent-light transition"
          >
            {copied ? (
              <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onDelete(app); }}
        className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/20 transition flex-shrink-0"
        title={t("appsDeleteTitle")}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

export default function AppsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [apps, setApps] = useState<AppDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AppDoc | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "apps"), where("userId", "==", user.uid));
    return onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppDoc));
        data.sort((a, b) => {
          const aTs = a.createdAt?.seconds ?? 0;
          const bTs = b.createdAt?.seconds ?? 0;
          return bTs - aTs;
        });
        setApps(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
  }, [user]);

  const handleCreate = async (data: AppFormData) => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/apps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ name: data.name }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? t("appsErrCreate"));
        return;
      }
      setShowCreate(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("appsErrCreate"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, "apps", deleteTarget.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("appsErrDelete"));
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">{t("appsTitle")}</h1>
          <p className="text-white/50 text-sm mt-1">
            {t("appsSubtitle")} ·{" "}
            <span className="text-accent-light">{apps.length} {t("appsApp")}</span>
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-accent hover:bg-accent text-accent-contrast text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t("appsCreateBtn")}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl px-4 py-3" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <p className="text-sm text-red-300 font-mono">{error}</p>
        </div>
      )}

      {loading ? (
        <PageLoader label={t("appsLoading")} />
      ) : apps.length === 0 ? (
        <div className="text-center py-24 text-white/40">
          <div className="text-6xl mb-4">📱</div>
          <p className="text-lg font-medium text-white/70">{t("appsNoApps")}</p>
          <p className="text-sm mt-2 mb-6">{t("appsNoAppsHint")}</p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent text-accent-contrast text-sm font-semibold px-5 py-2.5 rounded-xl transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t("appsCreateFirst")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {apps.map((app) => (
            <AppCard key={app.id} app={app} onDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      {showCreate && (
        <AppModal
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
          saving={saving}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          app={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
