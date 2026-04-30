"use client";
import { useState } from "react";
import { usePathname, useParams } from "next/navigation";
import Link from "next/link";
import SidebarUserCard from "@/app/components/SidebarUserCard";
import { HiOutlineChevronLeft, HiOutlineInformationCircle, HiOutlineChartBar, HiOutlineCodeBracket, HiOutlineCube, HiOutlineBars3 } from "react-icons/hi2";

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
        { href: `${base}/app-info`, label: "App info", Icon: HiOutlineInformationCircle },
        { href: `${base}/usage`, label: "Usage", Icon: HiOutlineChartBar },
      ],
    },
    {
      title: "DEVELOP",
      items: [
        { href: `${base}/workflows`, label: "Workflows", Icon: HiOutlineCodeBracket },
        { href: `${base}/builds`, label: "Builds", Icon: HiOutlineCube },
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
          <HiOutlineChevronLeft className="w-4 h-4" />
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
                        ? "bg-accent/20 text-accent-light font-medium"
                        : "text-white/50 hover:bg-white/10 hover:text-white"
                      }`}
                  >
                    <Icon className="w-4 h-4" />
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
            <HiOutlineBars3 className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-white">{decodedName}</span>
        </header>

        <main className="flex-1 px-6 py-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
