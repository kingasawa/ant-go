"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { createUserProfileIfNeeded } from "@/lib/createUserProfile";
import Link from "next/link";

export default function RegisterPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && user) {
    router.replace("/account/overview");
    return null;
  }

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!displayName.trim()) {
      setError("Vui lòng nhập tên hiển thị.");
      return;
    }
    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setBusy(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: displayName.trim() });
      await createUserProfileIfNeeded(result.user);
      router.push("/account/overview");
    } catch (e: unknown) {
      setError(mapFirebaseError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleRegister = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await createUserProfileIfNeeded(result.user);
      router.push("/account/overview");
    } catch (e: unknown) {
      setError(mapFirebaseError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      <Link
        href="/"
        className="absolute top-6 left-6 text-gray-400 hover:text-white text-sm flex items-center gap-1"
      >
        ← Home
      </Link>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">⚙️</div>
          <h1 className="text-2xl font-bold text-white mb-1">Tạo tài khoản</h1>
          <p className="text-gray-400 text-sm">
            Đăng ký để truy cập{" "}
            <span className="text-indigo-400 font-medium">eas-clone</span> build dashboard
          </p>
        </div>

        {/* Google Sign Up */}
        <button
          type="button"
          onClick={handleGoogleRegister}
          disabled={busy || loading}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-semibold py-2.5 px-6 rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed mb-4"
        >
          <GoogleIcon />
          {busy ? "Đang xử lý…" : "Đăng ký với Google"}
        </button>

        {/* Divider */}
        <div className="relative flex items-center my-4">
          <div className="flex-grow border-t border-gray-700" />
          <span className="mx-3 text-gray-500 text-xs uppercase tracking-wider">hoặc</span>
          <div className="flex-grow border-t border-gray-700" />
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailRegister} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Tên hiển thị</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nguyễn Văn A"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ít nhất 6 ký tự"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Xác nhận mật khẩu</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition text-sm"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-900/30 border border-red-800 rounded-lg px-4 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-6 rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy ? "Đang tạo tài khoản…" : "Đăng ký"}
          </button>
        </form>

        <p className="mt-5 text-center text-gray-500 text-sm">
          Đã có tài khoản?{" "}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
            Đăng nhập
          </Link>
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function mapFirebaseError(e: unknown): string {
  if (!(e instanceof Error)) return "Có lỗi xảy ra. Vui lòng thử lại.";
  const code = (e as { code?: string }).code ?? "";
  const map: Record<string, string> = {
    "auth/email-already-in-use": "Email này đã được sử dụng.",
    "auth/invalid-email": "Email không hợp lệ.",
    "auth/weak-password": "Mật khẩu quá yếu. Vui lòng dùng ít nhất 6 ký tự.",
    "auth/popup-closed-by-user": "Bạn đã đóng cửa sổ đăng nhập.",
    "auth/cancelled-popup-request": "",
  };
  return map[code] || e.message;
}
