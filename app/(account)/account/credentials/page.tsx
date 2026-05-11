"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import PageLoader from "@/app/components/PageLoader";
import {
  HiOutlineArrowUpTray,
  HiOutlineTrash,
} from "react-icons/hi2";

interface AscKey {
  teamId:    string;
  keyId:     string | null;
  issuerId:  string | null;
  teamName:  string | null;
  updatedAt: string | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function TableShell({ cols, children }: { cols: string[]; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--dash-card, rgba(255,255,255,0.04))", border: "1px solid var(--dash-border)" }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: "var(--dash-border)" }}>
            {cols.map((c) => (
              <th key={c} className="px-5 py-3 text-left text-[11px] font-semibold text-white/40 uppercase tracking-widest">
                {c}
              </th>
            ))}
            <th className="w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          {children}
        </tbody>
      </table>
    </div>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan + 1} className="px-5 py-12 text-center text-sm text-white/25">
        {label}
      </td>
    </tr>
  );
}

function SectionHeader({ title, onUpload, uploadLabel }: { title: string; onUpload?: () => void; uploadLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {onUpload && (
        <button
          onClick={onUpload}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white/60 border border-white/15 hover:bg-white/8 hover:text-white transition"
        >
          <HiOutlineArrowUpTray className="w-4 h-4" />
          {uploadLabel}
        </button>
      )}
    </div>
  );
}

function RowMenu({ onDelete, deleteLabel }: { onDelete: () => void; deleteLabel: string }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  return (
    <div>
      <button
        onClick={(e) => {
          if (pos) { setPos(null); } else {
            const rect = e.currentTarget.getBoundingClientRect();
            setPos({ x: rect.right, y: rect.bottom + 4 });
          }
        }}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/8 transition"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>
      {pos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPos(null)} />
          <div
            className="fixed z-50 w-36 rounded-xl overflow-hidden shadow-2xl"
            style={{ top: pos.y, right: `calc(100vw - ${pos.x}px)`, background: "var(--dash-modal)", border: "1px solid var(--dash-border)" }}
          >
            <button
              onClick={() => { setPos(null); onDelete(); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition"
            >
              <HiOutlineTrash className="w-4 h-4" />
              {deleteLabel}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function CredentialsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [ascKeys, setAscKeys]   = useState<AscKey[]>([]);
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    if (!user) return;
    const token = await user.getIdToken();
    const res   = await fetch("/api/credentials", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setAscKeys(data.ascKeys ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [user]);

  async function deleteAscKey(teamId: string) {
    if (!user) return;
    setDeleting(teamId);
    try {
      const token = await user.getIdToken();
      await fetch(`/api/credentials?teamId=${encodeURIComponent(teamId)}&type=ascKey`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setAscKeys((prev) => prev.filter((k) => k.teamId !== teamId));
    } finally {
      setDeleting(null);
    }
  }

  if (loading) return <PageLoader label={t("credentialsLoading")} />;

  return (
    <div className="max-w-5xl space-y-14">
      <div>
        <h1 className="text-2xl font-bold text-white">{t("credentialsTitle")}</h1>
        <p className="text-white/40 text-sm mt-1">{t("credentialsSubtitle")}</p>
      </div>

      <section>
        <SectionHeader title="App Store Connect API Keys" uploadLabel={t("upload")} />
        <TableShell cols={["Issuer ID", "Key ID", "Team", "Uploaded at"]}>
          {ascKeys.length === 0 ? (
            <EmptyRow colSpan={4} label={t("credentialsNone")} />
          ) : (
            ascKeys.map((key) => (
              <tr
                key={key.teamId}
                className={`transition hover:bg-white/[0.03] ${deleting === key.teamId ? "opacity-40" : ""}`}
              >
                <td className="px-5 py-4">
                  <p className="text-white/85 font-mono text-xs">{key.issuerId ?? "—"}</p>
                </td>
                <td className="px-5 py-4">
                  <span className="text-white/70 font-mono text-sm">{key.keyId ?? "—"}</span>
                </td>
                <td className="px-5 py-4">
                  <p className="text-white/80 text-sm">{key.teamName ?? "—"}</p>
                  <p className="text-white/35 text-xs font-mono mt-0.5">ID: {key.teamId}</p>
                </td>
                <td className="px-5 py-4 text-white/45 text-sm">{formatDate(key.updatedAt)}</td>
                <td className="px-3 py-4">
                  <RowMenu deleteLabel={t("delete")} onDelete={() => deleteAscKey(key.teamId)} />
                </td>
              </tr>
            ))
          )}
        </TableShell>
      </section>

      <section>
        <SectionHeader title="Apple Teams" />
        <TableShell cols={["ID", "Name"]}>
          {ascKeys.length === 0 ? (
            <EmptyRow colSpan={2} label={t("credentialsNone")} />
          ) : (
            ascKeys.map((key) => (
              <tr key={key.teamId} className="transition hover:bg-white/[0.03]">
                <td className="px-5 py-4">
                  <span className="text-white/70 font-mono text-sm">{key.teamId}</span>
                </td>
                <td className="px-5 py-4">
                  {key.teamName
                    ? <span className="text-white/80 text-sm">{key.teamName}</span>
                    : <span className="text-white/25 text-sm italic">—</span>
                  }
                </td>
                <td className="px-3 py-4" />
              </tr>
            ))
          )}
        </TableShell>
      </section>
    </div>
  );
}
