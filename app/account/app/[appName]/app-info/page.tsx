"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { GLASS } from "@/lib/glass";

interface AppDoc {
  id: string;
  name: string;
  scheme?: string;
  bundleId?: string;
  platform?: string;
  createdAt?: { seconds: number } | null;
}

export default function AppInfoPage() {
  const { appName } = useParams<{ appName: string }>();
  const decodedName = decodeURIComponent(appName);
  const { user } = useAuth();
  const [app, setApp] = useState<AppDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "apps"),
      where("userId", "==", user.uid),
      where("name", "==", decodedName)
    );
    getDocs(q).then((snap) => {
      if (!snap.empty) {
        const d = snap.docs[0];
        setApp({ id: d.id, ...d.data() } as AppDoc);
      }
      setLoading(false);
    });
  }, [user, decodedName]);

  if (loading) return <div className="text-white/40 animate-pulse">Loading…</div>;
  if (!app) return <div className="text-white/40">App not found.</div>;

  const rows = [
    { label: "Name", value: app.name },
    { label: "Scheme", value: app.scheme ?? "—" },
    { label: "Bundle ID", value: app.bundleId ?? "—" },
    { label: "Platform", value: app.platform ?? "—" },
    {
      label: "Created",
      value: app.createdAt?.seconds
        ? new Date(app.createdAt.seconds * 1000).toLocaleDateString()
        : "—",
    },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-1">App info</h1>
      <p className="text-sm text-white/50 mb-6">Thông tin chi tiết của app.</p>

      <div className="rounded-2xl divide-y divide-white/10" style={GLASS}>
        {rows.map(({ label, value }) => (
          <div key={label} className="flex items-center px-5 py-3.5 gap-4">
            <span className="w-32 text-sm text-white/50 flex-shrink-0">{label}</span>
            <span className="text-sm font-medium text-white font-mono">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
