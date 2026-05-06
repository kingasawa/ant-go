"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import {
  HiOutlineSquares2X2, HiOutlineDevicePhoneMobile,
  HiOutlineUser, HiOutlineCog6Tooth, HiOutlineCreditCard,
  HiOutlineBars3, HiOutlineChartBar, HiOutlineXMark,
} from "react-icons/hi2";
import { AiOutlineAppstoreAdd } from "react-icons/ai";

const navItems = [
  { href: "/account/overview", label: "Overview", Icon: HiOutlineSquares2X2,  gradient: "icon-badge-purple" },
  { href: "/account/apps",     label: "Apps",     Icon: AiOutlineAppstoreAdd,  gradient: "icon-badge-orange" },
  { href: "/account/devices",  label: "Devices",  Icon: HiOutlineDevicePhoneMobile, gradient: "icon-badge-teal" },
  { href: "/account/usage",    label: "Usage",    Icon: HiOutlineChartBar,     gradient: "icon-badge-pink" },
  { href: "/account/profile",  label: "Profile",  Icon: HiOutlineUser,         gradient: "icon-badge-purple" },
  { href: "/account/settings", label: "Settings", Icon: HiOutlineCog6Tooth,    gradient: "icon-badge-orange" },
  { href: "/account/billing",  label: "Billing",  Icon: HiOutlineCreditCard,   gradient: "icon-badge-teal" },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:flex`}
        style={{
          background: "var(--dash-sidebar)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
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
          {navItems.map(({ href, label, Icon, gradient }) => {
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
                {/* Icon badge */}
                <span className={`icon-badge ${isActive ? gradient : "bg-white/10"} transition-all duration-150`}>
                  <Icon className="w-4 h-4 text-white" />
                </span>
                {label}
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-purple" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User card */}
        <div
          className="px-4 py-4 flex-shrink-0 flex items-center gap-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <img
            src={user.photoURL ?? "/avatar.png"}
            alt=""
            className="w-9 h-9 rounded-full object-cover border-2 border-purple/40"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {user.displayName ?? user.email}
            </p>
            <p className="text-xs text-white/40 truncate">{user.email}</p>
          </div>
        </div>
      </aside>

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
            borderBottom: "1px solid rgba(255,255,255,0.06)",
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

        {/* Desktop topbar */}
        <header
          className="hidden lg:flex items-center justify-between px-8 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div>
            <p className="text-xs text-white/30 uppercase tracking-widest font-tomorrow">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-white leading-none">{user.displayName ?? user.email}</p>
              <p className="text-xs text-white/35 mt-0.5">{user.email}</p>
            </div>
            <img
              src={user.photoURL ?? "/avatar.png"}
              alt=""
              className="w-9 h-9 rounded-full object-cover border-2 border-white/10"
            />
          </div>
        </header>

        {/* Page slot */}
        <main className="flex-1 px-8 py-7 overflow-auto text-white">
          {children}
        </main>
      </div>
    </div>
  );
}
