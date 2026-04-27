"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

interface Build {
  id: string;
  status: string;
  createdAt?: { seconds: number } | null;
}

export default function UsagePage() {
  const { appName } = useParams<{ appName: string }>();
  const decodedName = decodeURIComponent(appName);
  const { user } = useAuth();
  const [builds, setBuilds] = useState<Build[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "builds"),
      where("userId", "==", user.uid),
      where("appName", "==", decodedName),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snap) => {
      setBuilds(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Build)));
    }, () => {});
  }, [user, decodedName]);

  const success = builds.filter((b) => b.status === "success").length;
  const failed  = builds.filter((b) => b.status === "failed").length;
  const rate    = builds.length > 0 ? Math.round((success / builds.length) * 100) : 0;

  const stats = [
    { label: "Total Builds", value: builds.length },
    { label: "Success", value: success },
    { label: "Failed", value: failed },
    { label: "Success Rate", value: `${rate}%` },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Usage</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Thống kê sử dụng của app.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value }) => (
          <div key={label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
