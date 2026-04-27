"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection, query, where,
  onSnapshot, addDoc, deleteDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { AppDoc, AppFormData, APP_FORM_FIELDS } from "@/lib/appTypes";

/* ─── Empty form ─────────────────────────────────────────────────────────── */
const emptyForm = (): AppFormData => ({
  name: "", bundleId: "", teamId: "", scheme: "", xcworkspace: "", xcodeproj: "",
});

/* ─── Create / Edit Modal ────────────────────────────────────────────────── */
function AppModal({
  onClose,
  onSave,
  saving,
}: {
  onClose: () => void;
  onSave: (data: AppFormData) => Promise<void>;
  saving: boolean;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Tên App là bắt buộc"); return; }
    await onSave({ name: name.trim(), bundleId: "", teamId: "", scheme: "", xcworkspace: "", xcodeproj: "" });
  };

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">📱 Tạo App mới</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Tên App <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            placeholder="My Awesome App"
            className={`w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none transition
              ${error
                ? "border-red-400 dark:border-red-600 focus:ring-2 focus:ring-red-300"
                : "border-gray-200 dark:border-gray-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300/30"
              }`}
          />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          <p className="text-xs text-gray-400 mt-2">Các thông tin còn lại (Bundle ID, Team ID, Scheme…) sẽ được cập nhật sau.</p>
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            Huỷ
          </button>
          <button onClick={handleSubmit as unknown as React.MouseEventHandler} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-semibold transition">
            {saving ? "Đang lưu…" : "Tạo App"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Delete Confirm ──────────────────────────────────────────────────────── */
function DeleteConfirm({ app, onClose, onConfirm }: { app: AppDoc; onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="text-4xl mb-3">🗑️</div>
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Xoá App</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Bạn có chắc muốn xoá <strong className="text-gray-800 dark:text-gray-200">{app.name}</strong>?
          Hành động này không thể hoàn tác.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            Huỷ
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition">
            Xoá
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── App Card ────────────────────────────────────────────────────────────── */
function AppCard({ app, onDelete }: { app: AppDoc; onDelete: (app: AppDoc) => void }) {
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
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:border-indigo-300 dark:hover:border-indigo-700 transition group flex items-center gap-4 cursor-pointer"
    >
      {/* Icon / Avatar */}
      <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-300 font-bold text-lg select-none">
        {initial}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{app.name}</h3>
        {app.scheme && (
          <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">{app.scheme}</p>
        )}
        <div className="flex items-center gap-1 mt-0.5">
          <p className="text-xs text-gray-300 dark:text-gray-600 font-mono break-all leading-relaxed">{app.id}</p>
          <button
            onClick={handleCopy}
            title="Copy UUID"
            className="flex-shrink-0 text-gray-300 dark:text-gray-600 hover:text-indigo-500 dark:hover:text-indigo-400 transition"
          >
            {copied ? (
              <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Delete button */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(app); }}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition flex-shrink-0"
        title="Xoá app"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

/* ─── Apps Page ───────────────────────────────────────────────────────────── */
export default function AppsPage() {
  const { user } = useAuth();
  const [apps, setApps] = useState<AppDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AppDoc | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    // Không dùng orderBy để tránh cần composite index trong lúc index đang build
    // Sort phía client thay thế
    const q = query(
      collection(db, "apps"),
      where("userId", "==", user.uid),
    );
    return onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppDoc));
        // Sort mới nhất lên đầu phía client
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
    try {
      await addDoc(collection(db, "apps"), {
        ...data,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setShowCreate(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi khi tạo app");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, "apps", deleteTarget.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi khi xoá app");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Apps</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Quản lý các iOS app của bạn ·{" "}
            <span className="text-indigo-600 dark:text-indigo-400">{apps.length} app</span>
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tạo App
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          <p className="text-sm text-red-600 dark:text-red-400 font-mono">{error}</p>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center py-24 text-gray-400 animate-pulse">Loading…</div>
      ) : apps.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <div className="text-6xl mb-4">📱</div>
          <p className="text-lg font-medium text-gray-600 dark:text-gray-300">Chưa có App nào</p>
          <p className="text-sm mt-2 mb-6">Tạo app đầu tiên để bắt đầu build.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tạo App đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {apps.map((app) => (
            <AppCard key={app.id} app={app} onDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      {/* Modals */}
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
