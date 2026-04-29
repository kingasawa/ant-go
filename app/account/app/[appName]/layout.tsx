"use client";
import { useState } from "react";
import { usePathname, useParams } from "next/navigation";
import Link from "next/link";
import SidebarUserCard from "@/app/components/SidebarUserCard";

function IconBack() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}
function IconAppInfo() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  );
}
function IconUsage() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}
function IconWorkflows() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
    </svg>
  );
}
function IconBuilds() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M2.25 12.75v6A2.25 2.25 0 004.5 21h15a2.25 2.25 0 002.25-2.25v-6" />
      <path d="M2.25 12.75L6 7.5h5.25v5.25" />
      <path d="M21.75 12.75L18 7.5h-5.25v5.25" />
      <path d="M11.25 12.75h1.5V21" />
    </svg>
  );
}

const SIDEBAR: React.CSSProperties = {
  backdropFilter: "blur(20px) saturate(160%)",
  WebkitBackdropFilter: "blur(20px) saturate(160%)",
  background: "rgba(255,255,255,0.07)",
  borderRight: "1px solid rgba(255,255,255,0.11)",
};

const TOPBAR: React.CSSProperties = {
  backdropFilter: "blur(20px) saturate(160%)",
  WebkitBackdropFilter: "blur(20px) saturate(160%)",
  background: "rgba(255,255,255,0.07)",
  borderBottom: "1px solid rgba(255,255,255,0.11)",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { appName } = useParams<{ appName: string }>();
  const decodedName = decodeURIComponent(appName ?? "");
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const base = `/account/app/${appName}`;

  const sections = [
    {
      title: "PROJECT",
      items: [
        { href: `${base}/app-info`, label: "App info", Icon: IconAppInfo },
        { href: `${base}/usage`, label: "Usage", Icon: IconUsage },
      ],
    },
    {
      title: "DEVELOP",
      items: [
        { href: `${base}/workflows`, label: "Workflows", Icon: IconWorkflows },
        { href: `${base}/builds`, label: "Builds", Icon: IconBuilds },
      ],
    },
  ];

  const sidebarContent = (
    <>
      {/* App name header */}
      <div className="px-5 py-5 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {decodedName.charAt(0).toUpperCase()}
          </div>
          <p className="text-sm font-semibold text-white truncate">{decodedName}</p>
        </div>
      </div>

      {/* Back link */}
      <div className="px-2 pt-3">
        <Link
          href="/account/overview"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white/50 hover:bg-white/10 hover:text-white transition"
        >
          <IconBack />
          Account
        </Link>
      </div>

      {/* Sections */}
      <nav className="flex-1 px-2 py-2 space-y-4 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-3 mb-1 text-[10px] font-semibold tracking-wider text-white/30 uppercase">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ href, label, Icon }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition
                      ${isActive
                        ? "bg-indigo-600/20 text-indigo-300 font-medium"
                        : "text-white/50 hover:bg-white/10 hover:text-white"
                      }`}
                  >
                    <Icon />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User section */}
      <SidebarUserCard />
    </>
  );

  return (
    <div className="min-h-screen relative text-white flex">
      {/* Fixed background */}
      <div
        className="fixed inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/assets/images/bgimg1.jpg')" }}
      />
      <div className="fixed inset-0 bg-black/60" />

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex relative z-10 w-60 flex-shrink-0 flex-col" style={SIDEBAR}>
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-40 w-60 flex flex-col lg:hidden" style={SIDEBAR}>
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Main */}
      <div className="relative flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3" style={TOPBAR}>
          <button onClick={() => setSidebarOpen(true)} className="text-white/60 hover:text-white p-1 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-white">{decodedName}</span>
        </header>

        <main className="flex-1 px-6 py-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
