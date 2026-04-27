"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { createUserProfileIfNeeded } from "@/lib/createUserProfile";
import Link from "next/link";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Already logged in → redirect
  if (!loading && user) {
    router.replace("/account/overview");
    return null;
  }

  const handleGoogleLogin = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await createUserProfileIfNeeded(result.user);
      router.push("/account/overview");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      {/* Back link */}
      <Link href="/" className="absolute top-6 left-6 text-gray-400 hover:text-white text-sm flex items-center gap-1">
        ← Home
      </Link>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-10 w-full max-w-md text-center">
        {/* Logo */}
        <div className="text-5xl mb-4">⚙️</div>
        <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
        <p className="text-gray-400 text-sm mb-8">
          Sign in to access the <span className="text-indigo-400 font-medium">eas-clone</span> build dashboard
        </p>

        {/* Google Sign In */}
        <button
          onClick={handleGoogleLogin}
          disabled={busy || loading}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3 px-6 rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {/* Google SVG */}
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {busy ? "Signing in…" : "Continue with Google"}
        </button>

        {error && (
          <p className="mt-4 text-red-400 text-sm bg-red-900/30 border border-red-800 rounded-lg px-4 py-2">
            {error}
          </p>
        )}

        <p className="mt-6 text-gray-600 text-xs">
          Only Google sign-in is supported. Your account must be authorised to view builds.
        </p>
      </div>
    </main>
  );
}

