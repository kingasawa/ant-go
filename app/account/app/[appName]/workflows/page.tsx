"use client";

export default function WorkflowsPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Workflows</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Quản lý workflow CI/CD của app.</p>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-10 text-center text-gray-400">
        <p className="text-sm">Chưa có workflow nào.</p>
        <p className="text-xs mt-1">Tính năng đang được phát triển.</p>
      </div>
    </div>
  );
}

