"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { createUserProfileIfNeeded } from "@/lib/createUserProfile";
import SceneBackground from "@/app/components/SceneBackground";
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

  useEffect(() => {
    if (!loading && user) router.replace("/account/overview");
  }, [user, loading, router]);

  if (!loading && user) return null;

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!displayName.trim()) {
      setError("Please enter your display name.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
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
    <main className="relative min-h-screen overflow-hidden flex items-center justify-center px-4 py-10">
      <SceneBackground />

      <Link
        href="/"
        className="absolute top-6 left-6 z-20 text-white/60 hover:text-white text-sm flex items-center gap-1 transition-colors"
      >
        ← Home
      </Link>

      {/* Glass card */}
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl px-8 py-9"
        style={{
          backdropFilter: "blur(22px) saturate(160%)",
          WebkitBackdropFilter: "blur(22px) saturate(160%)",
          background: "rgba(255, 255, 255, 0.10)",
          border: "1px solid rgba(255, 255, 255, 0.22)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.15)",
        }}
      >
        <h1 className="text-3xl font-bold text-white text-center mb-7 tracking-wide">
          Register
        </h1>

        {/* Google sign-up */}
        <button
          type="button"
          onClick={handleGoogleRegister}
          disabled={busy || loading}
          className="w-full flex items-center justify-center gap-2.5 font-semibold text-sm text-white py-2.5 rounded-xl transition-all disabled:opacity-55 disabled:cursor-not-allowed"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.18)",
          }}
        >
          <GoogleIcon />
          Sign up with Google
        </button>

        {/* Divider */}
        <div className="relative flex items-center my-5">
          <div className="flex-grow border-t border-white/15" />
          <span className="mx-3 text-white/35 text-xs uppercase tracking-widest">or</span>
          <div className="flex-grow border-t border-white/15" />
        </div>

        <form onSubmit={handleEmailRegister} className="space-y-3.5">
          {/* Display name */}
          <div className="relative">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Full name"
              required
              className="w-full rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-white/50 bg-white/10 border border-white/20 focus:outline-none focus:border-white/50 transition-colors"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
              <UserIcon />
            </span>
          </div>

          {/* Email */}
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-white/50 bg-white/10 border border-white/20 focus:outline-none focus:border-white/50 transition-colors"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
              <MailIcon />
            </span>
          </div>

          {/* Password */}
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min. 6 chars)"
              required
              className="w-full rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-white/50 bg-white/10 border border-white/20 focus:outline-none focus:border-white/50 transition-colors"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
              <LockIcon />
            </span>
          </div>

          {/* Confirm password */}
          <div className="relative">
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              required
              className="w-full rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-white/50 bg-white/10 border border-white/20 focus:outline-none focus:border-white/50 transition-colors"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
              <LockIcon />
            </span>
          </div>

          {error && (
            <p className="text-red-300 text-sm bg-red-900/30 border border-red-400/25 rounded-xl px-4 py-2.5 text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || loading}
            className="w-full bg-white hover:bg-white/90 text-gray-900 font-bold py-3 rounded-xl transition-all disabled:opacity-55 disabled:cursor-not-allowed mt-1"
          >
            {busy ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-white/45 text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-white font-semibold hover:underline">
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 12c2.67 0 4.8-2.13 4.8-4.8S14.67 2.4 12 2.4 7.2 4.53 7.2 7.2 9.33 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
    </svg>
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
  if (!(e instanceof Error)) return "Something went wrong. Please try again.";
  const code = (e as { code?: string }).code ?? "";
  const map: Record<string, string> = {
    "auth/email-already-in-use": "This email is already registered.",
    "auth/invalid-email": "Invalid email address.",
    "auth/weak-password": "Password is too weak (min. 6 characters).",
    "auth/popup-closed-by-user": "Sign-up popup was closed.",
    "auth/cancelled-popup-request": "",
  };
  return map[code] || e.message;
}
