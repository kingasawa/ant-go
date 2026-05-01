"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { GLASS } from "@/lib/glass";
import PageLoader from "@/app/components/PageLoader";
import { FaGithub } from "react-icons/fa";
import { HiOutlinePlusCircle, HiOutlineWrenchScrewdriver } from "react-icons/hi2";

export default function WorkflowsPage() {
  const { appName } = useParams<{ appName: string }>();
  const decodedName = decodeURIComponent(appName);
  const { user } = useAuth();
  const router = useRouter();
  const [githubRepo, setGithubRepo] = useState<string | null | undefined>(undefined);
  const [appId, setAppId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showComingSoon, setShowComingSoon] = useState(false);

  useEffect(() => {
    if (!user) return;
    getDocs(
      query(collection(db, "apps"), where("userId", "==", user.uid), where("name", "==", decodedName))
    ).then((snap) => {
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setGithubRepo(data.githubRepo ?? null);
        setAppId(snap.docs[0].id);
      } else {
        setGithubRepo(null);
      }
      setLoading(false);
    });
  }, [user, decodedName]);

  if (loading) return <PageLoader label="Đang tải workflows…" />;

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-1">Workflows</h1>
      <p className="text-sm text-white/50 mb-6">Quản lý workflow CI/CD của app.</p>

      {githubRepo === null ? (
        /* ── Chưa connect GitHub ── */
        <div className="rounded-2xl p-8 flex flex-col items-center text-center gap-4" style={GLASS}>
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
            <FaGithub className="w-6 h-6 text-white/50" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Chưa kết nối GitHub</p>
            <p className="text-xs text-white/40 mt-1 max-w-xs">
              Workflow cần một GitHub repo để theo dõi thay đổi và tự động trigger build.
              Hãy connect repo trước khi tạo workflow.
            </p>
          </div>
          <button
            onClick={() => router.push(`/account/app/${appName}/app-info`)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-accent/20 text-accent-light hover:bg-accent/30 transition"
          >
            <FaGithub className="w-4 h-4" />
            Connect GitHub Repo
          </button>
        </div>
      ) : (
        /* ── Đã connect GitHub ── */
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs text-white/40">
              <FaGithub className="w-3.5 h-3.5" />
              <span className="font-mono">{githubRepo}</span>
            </div>
            <button
              onClick={() => {
                setShowComingSoon(true);
                setTimeout(() => setShowComingSoon(false), 3000);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-accent/20 text-accent-light hover:bg-accent/30 transition"
            >
              <HiOutlinePlusCircle className="w-4 h-4" />
              Tạo Workflow
            </button>
          </div>

          {showComingSoon && (
            <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-white/10 border border-white/20">
              <HiOutlineWrenchScrewdriver className="w-4 h-4 text-white/60 flex-shrink-0" />
              <p className="text-sm text-white/70">Tính năng này đang được xây dựng.</p>
            </div>
          )}

          <div className="rounded-2xl p-10 text-center text-white/40" style={GLASS}>
            <p className="text-sm">Chưa có workflow nào.</p>
          </div>
        </div>
      )}
    </div>
  );
}
