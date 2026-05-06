"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { GLASS } from "@/lib/glass";
import PageLoader from "@/app/components/PageLoader";
import { HiOutlineDocumentDuplicate, HiOutlineCheck } from "react-icons/hi2";

interface AppDoc {
  id: string;
  name: string;
  createdAt?: { seconds: number } | null;
}

export default function AppInfoPage() {
  const { appName } = useParams<{ appName: string }>();
  const decodedName = decodeURIComponent(appName);
  const { user } = useAuth();
  const [app, setApp] = useState<AppDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    getDocs(
      query(
        collection(db, "apps"),
        where("userId", "==", user.uid),
        where("name", "==", decodedName)
      )
    ).then((snap) => {
      if (!snap.empty) {
        const d = snap.docs[0];
        setApp({ id: d.id, ...d.data() } as AppDoc);
      }
      setLoading(false);
    });
  }, [user, decodedName]);

  if (loading) return <PageLoader label="Đang tải thông tin app…" />;
  if (!app) return <div className="text-white/40">App not found.</div>;

  const rows = [
    { label: "Name", value: app.name },
    { label: "App ID", value: app.id },
    {
      label: "Created",
      value: app.createdAt?.seconds
        ? new Date(app.createdAt.seconds * 1000).toLocaleDateString()
        : "—",
    },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-1">App Info</h1>
      <p className="text-sm text-white/50 mb-6">Thông tin chi tiết của app.</p>

      <div className="rounded-2xl divide-y divide-white/10 max-w-sm" style={GLASS}>
        {rows.map(({ label, value }) => (
          <div key={label} className="flex items-center px-5 py-3.5 gap-4">
            <span className="w-24 text-sm text-white/50 flex-shrink-0">{label}</span>
            <span className="text-sm font-medium text-white font-mono flex-1 truncate">{value}</span>
            {label === "App ID" && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(value);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="text-white/30 hover:text-white/70 transition flex-shrink-0"
              >
                {copied
                  ? <HiOutlineCheck className="w-4 h-4 text-green-400" />
                  : <HiOutlineDocumentDuplicate className="w-4 h-4" />
                }
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
