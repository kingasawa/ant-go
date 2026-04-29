"use client";
import { GLASS } from "@/lib/glass";

export default function WorkflowsPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-1">Workflows</h1>
      <p className="text-sm text-white/50 mb-6">Quản lý workflow CI/CD của app.</p>
      <div className="rounded-2xl p-10 text-center text-white/40" style={GLASS}>
        <p className="text-sm">Chưa có workflow nào.</p>
        <p className="text-xs mt-1">Tính năng đang được phát triển.</p>
      </div>
    </div>
  );
}
