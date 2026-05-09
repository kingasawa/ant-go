"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import {
  HiOutlineSquares2X2, HiOutlineDevicePhoneMobile,
  HiOutlineUser, HiOutlineCog6Tooth, HiOutlineCreditCard,
  HiOutlineBars3, HiOutlineChartBar, HiOutlineXMark, HiOutlineKey,
} from "react-icons/hi2";
import { AiOutlineAppstoreAdd } from "react-icons/ai";

const navItems = [
  { href: "/account/overview",     label: "Overview",     Icon: HiOutlineSquares2X2,       gradient: "icon-badge-purple", dot: "#9E3EBF" },
  { href: "/account/apps",         label: "Apps",         Icon: AiOutlineAppstoreAdd,       gradient: "icon-badge-orange", dot: "#FD951A" },
  { href: "/account/devices",      label: "Devices",      Icon: HiOutlineDevicePhoneMobile, gradient: "icon-badge-teal",   dot: "#2DD4BF" },
  { href: "/account/credentials",  label: "Credentials",  Icon: HiOutlineKey,               gradient: "icon-badge-blue",   dot: "#3B82F6" },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--dash-bg)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-purple/40 border-t-purple animate-spin" />
          <span className="text-white/40 text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: "var(--dash-bg)" }}>

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 flex flex-col transform transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:flex lg:sticky lg:top-0 lg:h-screen`}
        style={{
          background: "var(--dash-sidebar)",
          borderRight: "1px solid var(--dash-border)",
        }}
      >
        {/* Logo */}
        <div className="px-6 py-6 flex-shrink-0 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/assets/images/logo-text.png"
              alt="Logo"
              className="h-7 w-auto"
              style={{ filter: "brightness(0) invert(1)" }}
            />
          </Link>
          <button
            className="lg:hidden text-white/40 hover:text-white transition p-1"
            onClick={() => setSidebarOpen(false)}
          >
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
          <p className="text-xs font-semibold text-white/25 uppercase tracking-widest px-3 mb-3 mt-2">
            Main Menu
          </p>
          {navItems.map(({ href, label, Icon, gradient, dot }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                  ${isActive
                    ? "bg-white/10 text-white"
                    : "text-white/45 hover:text-white hover:bg-white/[0.06]"
                  }`}
              >
                <span className={`icon-badge ${isActive ? gradient : "bg-white/10"} transition-all duration-150`}>
                  <Icon className="w-4 h-4 text-white" />
                </span>
                {label}
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User card */}
        <div
          ref={userMenuRef}
          className="relative px-4 py-4 flex-shrink-0 flex items-center gap-3"
          style={{ borderTop: "1px solid var(--dash-border)" }}
        >
          <img
            src={user.photoURL ?? "/avatar.png"}
            alt=""
            className="w-9 h-9 rounded-full object-cover border-2 border-purple/40 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {user.displayName ?? user.email}
            </p>
            <p className="text-xs text-white/40 truncate">{user.email}</p>
          </div>
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white border border-white/15 hover:border-white/30 hover:bg-white/10 transition"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>

        </div>
      </aside>

      {/* User popup */}
      {userMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-start pb-4 pl-4 lg:pb-6 lg:pl-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setUserMenuOpen(false)} />
          <div
            className="relative w-56 rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
            style={{ background: "var(--dash-modal)" }}
          >
            {/* User info */}
            <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <img
                src={user.photoURL ?? "/avatar.png"}
                alt=""
                className="w-10 h-10 rounded-full object-cover border-2 border-purple/40 flex-shrink-0"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user.displayName ?? user.email}</p>
                <p className="text-xs text-white/40 truncate">{user.email}</p>
              </div>
            </div>
            {/* Actions */}
            <div className="py-1">
              <button onClick={() => { setUserMenuOpen(false); router.push("/account/profile"); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Profile
              </button>
              <button onClick={() => { setUserMenuOpen(false); router.push("/account/usage"); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                Usage
              </button>
              <button onClick={() => { setUserMenuOpen(false); router.push("/account/settings"); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Settings
              </button>
              <button onClick={() => { setUserMenuOpen(false); router.push("/account/billing"); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                Billing
              </button>
              <button onClick={() => { setUserMenuOpen(false); signOut(auth).then(() => router.replace("/login")); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="relative flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <header
          className="lg:hidden flex items-center justify-between px-4 py-3"
          style={{
            background: "var(--dash-sidebar)",
            borderBottom: "1px solid var(--dash-border)",
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white/50 hover:text-white p-1 transition"
          >
            <HiOutlineBars3 className="w-6 h-6" />
          </button>
          <img
            src="/assets/images/logo-text.png"
            alt="Logo"
            className="h-6 w-auto"
            style={{ filter: "brightness(0) invert(1)" }}
          />
          <img
            src={user.photoURL ?? "/avatar.png"}
            alt=""
            className="w-8 h-8 rounded-full border-2 border-purple/40 object-cover"
          />
        </header>

        {/* Page slot */}
        <main className="flex-1 px-8 py-7 overflow-auto text-white">
          {children}
        </main>
      </div>
    </div>
  );
}
