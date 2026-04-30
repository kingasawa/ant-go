"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Lock } from "lucide-react";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { createUserProfileIfNeeded } from "@/lib/createUserProfile";
import Link from "next/link";

type Mode = "login" | "register";

// Face style — transparent content container, no visual chrome
const FACE: React.CSSProperties = {
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
  position: "absolute",
  inset: 0,
  borderRadius: "1rem",
  padding: "2.25rem 2rem 4.5rem",
  overflowY: "auto",
};

// Static glass wrapper — owns ALL visual chrome (blur, tint, border, shadow)
// Always rendered outside the 3D transform so GPU never repaints it during flip
const BLUR_WRAPPER: React.CSSProperties = {
  backdropFilter: "blur(18px) saturate(180%)",
  WebkitBackdropFilter: "blur(18px) saturate(180%)",
  background: "rgba(255, 255, 255, 0.13)",
  border: "1px solid rgba(255, 255, 255, 0.25)",
  boxShadow: "inset 0px -10px 20px rgba(0, 0, 0, 0.3), inset 0px 2px 20px rgba(255, 255, 255, 0.5), 0px 5px 30px rgba(0, 0, 0, 0.4)",
  borderRadius: "1rem",
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
};

export default function AuthCard({ initialMode }: { initialMode: Mode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);

  // --- login state ---
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

  // --- register state ---
  const [displayName, setDisplayName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [regError, setRegError] = useState("");
  const [regBusy, setRegBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/account/overview");
  }, [user, loading, router]);

  if (!loading && user) return null;

  const flipTo = (toMode: Mode) => {
    if (mode === toMode) return;
    setMode(toMode);
    window.history.pushState(null, "", toMode === "login" ? "/login" : "/register");
  };

  const busy = loginBusy || regBusy;

  // ---- handlers ----
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginBusy(true);
    setLoginError("");
    try {
      const r = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      await createUserProfileIfNeeded(r.user);
      router.push("/account/overview");
    } catch (err) {
      setLoginError(mapError(err));
    } finally {
      setLoginBusy(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoginBusy(true);
    setLoginError("");
    try {
      const r = await signInWithPopup(auth, googleProvider);
      await createUserProfileIfNeeded(r.user);
      router.push("/account/overview");
    } catch (err) {
      setLoginError(mapError(err));
    } finally {
      setLoginBusy(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    if (!displayName.trim()) { setRegError("Please enter your display name."); return; }
    if (regPassword.length < 6) { setRegError("Password must be at least 6 characters."); return; }
    if (regPassword !== confirmPwd) { setRegError("Passwords do not match."); return; }
    setRegBusy(true);
    try {
      const r = await createUserWithEmailAndPassword(auth, regEmail, regPassword);
      await updateProfile(r.user, { displayName: displayName.trim() });
      await createUserProfileIfNeeded(r.user);
      router.push("/account/overview");
    } catch (err) {
      setRegError(mapError(err));
    } finally {
      setRegBusy(false);
    }
  };

  const handleGoogleRegister = async () => {
    setRegBusy(true);
    setRegError("");
    try {
      const r = await signInWithPopup(auth, googleProvider);
      await createUserProfileIfNeeded(r.user);
      router.push("/account/overview");
    } catch (err) {
      setRegError(mapError(err));
    } finally {
      setRegBusy(false);
    }
  };

  return (
    <main
      className="relative min-h-screen flex items-center justify-center px-4 py-10 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/assets/images/bgimg1.jpg')" }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40" />

      <Link
        href="/"
        className="absolute top-6 left-6 z-20 text-white/70 hover:text-white text-sm flex items-center gap-1 transition-colors"
      >
        ← Home
      </Link>

      {/* Perspective wrapper — must be the PARENT of the rotating element */}
      <div className="relative z-10 w-full max-w-sm" style={{ perspective: "1200px" }}>

        {/* Static blur layer — always rendered, never participates in 3D transform */}
        <div style={{ ...BLUR_WRAPPER, minHeight: "540px" }} />

        {/* Rotating card — both faces live inside here */}
        <div
          style={{
            transformStyle: "preserve-3d",
            transition: "transform 0.7s cubic-bezier(0.4, 0.2, 0.2, 1)",
            transform: mode === "register" ? "rotateY(180deg)" : "rotateY(0deg)",
            position: "relative",
            minHeight: "540px",
          }}
        >

          {/* ── FRONT FACE: Login ── */}
          <div style={FACE}>
            <h1 className="text-3xl font-bold text-white text-center mb-7 tracking-wide">Login</h1>

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <Field
                type="email"
                value={loginEmail}
                onChange={setLoginEmail}
                placeholder="Email"
                icon={<User size={16} />}
              />
              <Field
                type="password"
                value={loginPassword}
                onChange={setLoginPassword}
                placeholder="Password"
                icon={<Lock size={16} />}
              />

              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 text-white/65 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 accent-violet-400 cursor-pointer"
                  />
                  Remember me
                </label>
                <span className="text-white/55 text-sm hover:text-white/90 cursor-pointer transition-colors">
                  Forgot password?
                </span>
              </div>

              {loginError && <ErrorMsg msg={loginError} />}

              <button
                type="submit"
                disabled={busy || loading}
                className="w-full bg-white hover:bg-white/90 text-gray-900 font-bold py-3 rounded-xl transition-all disabled:opacity-55 disabled:cursor-not-allowed mt-1"
              >
                {loginBusy ? "Signing in…" : "Login"}
              </button>
            </form>

            <Divider />

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={busy || loading}
              className="w-full flex items-center justify-center gap-2.5 font-semibold text-sm text-white py-2.5 rounded-xl transition-all disabled:opacity-55 disabled:cursor-not-allowed"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)" }}
            >
              <GoogleIcon /> Continue with Google
            </button>

            <p className="absolute bottom-0 left-0 right-0 pb-6 text-center text-white/45 text-sm">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => flipTo("register")}
                className="text-white font-semibold hover:underline"
              >
                Register
              </button>
            </p>
          </div>

          {/* ── BACK FACE: Register ── */}
          <div style={{ ...FACE, transform: "rotateY(180deg)" }}>
            <h1 className="text-3xl font-bold text-white text-center mb-5 tracking-wide">Register</h1>

            <form onSubmit={handleEmailRegister} className="space-y-3">
              <Field type="text"     value={displayName}  onChange={setDisplayName}  placeholder="Full name"            icon={<User size={16} />} />
              <Field type="email"    value={regEmail}     onChange={setRegEmail}     placeholder="Email"                icon={<Mail size={16} />} />
              <Field type="password" value={regPassword}  onChange={setRegPassword}  placeholder="Password (min. 6)"    icon={<Lock size={16} />} />
              <Field type="password" value={confirmPwd}   onChange={setConfirmPwd}   placeholder="Confirm password"     icon={<Lock size={16} />} />

              {regError && <ErrorMsg msg={regError} />}

              <button
                type="submit"
                disabled={busy || loading}
                className="w-full bg-white hover:bg-white/90 text-gray-900 font-bold py-3 rounded-xl transition-all disabled:opacity-55 disabled:cursor-not-allowed mt-1"
              >
                {regBusy ? "Creating account…" : "Create Account"}
              </button>
            </form>

            <Divider />

            <button
              type="button"
              onClick={handleGoogleRegister}
              disabled={busy || loading}
              className="w-full flex items-center justify-center gap-2.5 font-semibold text-sm text-white py-2.5 rounded-xl transition-all disabled:opacity-55 disabled:cursor-not-allowed"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)" }}
            >
              <GoogleIcon /> Sign up with Google
            </button>

            <p className="absolute bottom-0 left-0 right-0 pb-6 text-center text-white/45 text-sm">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => flipTo("login")}
                className="text-white font-semibold hover:underline"
              >
                Login
              </button>
            </p>
          </div>

        </div>
      </div>
    </main>
  );
}

// ── Small helper components ──

function Field({
  type, value, onChange, placeholder, icon,
}: {
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="w-full rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-white/50 bg-white/10 border border-white/20 focus:outline-none focus:border-white/50 transition-colors"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">{icon}</span>
    </div>
  );
}

function Divider() {
  return (
    <div className="relative flex items-center my-4">
      <div className="flex-grow border-t border-white/15" />
      <span className="mx-3 text-white/35 text-xs uppercase tracking-widest">or</span>
      <div className="flex-grow border-t border-white/15" />
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <p className="text-red-300 text-sm bg-red-900/30 border border-red-400/25 rounded-xl px-4 py-2.5 text-center">
      {msg}
    </p>
  );
}


function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function mapError(e: unknown): string {
  if (!(e instanceof Error)) return "Something went wrong. Please try again.";
  const code = (e as { code?: string }).code ?? "";
  const map: Record<string, string> = {
    "auth/invalid-email": "Invalid email address.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/email-already-in-use": "This email is already registered.",
    "auth/weak-password": "Password is too weak (min. 6 characters).",
    "auth/popup-closed-by-user": "Sign-in popup was closed.",
    "auth/cancelled-popup-request": "",
  };
  return map[code] || e.message;
}
