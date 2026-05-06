"use client";
import { useState, useEffect, useRef } from "react";
import { usePathname, useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import {
  HiOutlineChevronLeft, HiOutlineChartBar, HiOutlineCodeBracket,
  HiOutlineCube, HiOutlineBars3, HiOutlineChevronUpDown,
  HiOutlineCog6Tooth, HiOutlineCloud, HiOutlinePaperAirplane, HiOutlineXMark,
} from "react-icons/hi2";

interface AppDoc { id: string; name: string; }

const sections = (base: string) => [
  {
    title: "PROJECT",
    items: [
      { href: `${base}/usage`,      label: "Usage",      Icon: HiOutlineChartBar },
    ],
  },
  {
    title: "DEVELOP",
    items: [
      { href: `${base}/builds`,     label: "Builds",     Icon: HiOutlineCube },
      { href: `${base}/submission`, label: "Submission",  Icon: HiOutlinePaperAirplane },
    ],
  },
  {
    title: "XCODE CLOUD",
    items: [
      { href: `${base}/xcode-cloud`, label: "Info",      Icon: HiOutlineCloud },
      { href: `${base}/workflows`,   label: "Workflows", Icon: HiOutlineCodeBracket },
    ],
  },
  {
    title: "CONFIG",
    items: [
      { href: `${base}/app-info`,   label: "Settings",   Icon: HiOutlineCog6Tooth },
    ],
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { appName } = useParams<{ appName: string }>();
  const decodedName = decodeURIComponent(appName ?? "");
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apps, setApps] = useState<AppDoc[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const base = `/account/app/${appName}`;

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "apps"), where("userId", "==", user.uid));
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, name: d.data().name as string }));
      data.sort((a, b) => a.name.localeCompare(b.name));
      setApps(data);
    });
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const tabSuffix = (() => {
    const suffixes = ["/builds", "/workflows", "/usage", "/submission", "/xcode-cloud", "/app-info"];
    for (const s of suffixes) {
      if (pathname.startsWith(base + s)) return s;
    }
    return "/builds";
  })();

  const sidebarContent = (
    <>
      {/* App dropdown */}
      <div className="px-3 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--dash-border)" }}>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/10 transition text-left"
          >
            <span className="icon-badge icon-badge-purple flex-shrink-0 !w-8 !h-8 !rounded-lg">
              <span className="text-xs font-bold text-white">{decodedName.charAt(0).toUpperCase()}</span>
            </span>
            <p className="text-sm font-semibold text-white truncate flex-1">{decodedName}</p>
            <HiOutlineChevronUpDown className="w-4 h-4 text-white/40 flex-shrink-0" />
          </button>

          {dropdownOpen && (
            <div
              className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-50"
              style={{ background: "var(--dash-modal)", border: "1px solid var(--dash-border)" }}
            >
              {apps.length === 0 && (
                <p className="px-4 py-3 text-xs text-white/40">Không có app nào</p>
              )}
              {apps.map((app) => {
                const isSelected = app.name === decodedName;
                return (
                  <button
                    key={app.id}
                    onClick={() => { setDropdownOpen(false); router.push(`/account/app/${encodeURIComponent(app.name)}${tabSuffix}`); }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition hover:bg-white/10 text-left ${isSelected ? "text-purple font-medium" : "text-white/70"}`}
                  >
                    <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 bg-white/10">
                      {app.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate">{app.name}</span>
                    {isSelected && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-purple flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Back */}
      <div className="px-2 pt-3">
        <Link
          href="/account/apps"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white/50 hover:bg-white/10 hover:text-white transition"
        >
          <HiOutlineChevronLeft className="w-4 h-4" />
          All Apps
        </Link>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 px-2 py-2 space-y-4 overflow-y-auto">
        {sections(base).map((section) => (
          <div key={section.title}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold tracking-widest text-white/25 uppercase">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ href, label, Icon }) => {
                const isActive = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                      ${isActive ? "bg-white/10 text-white" : "text-white/45 hover:text-white hover:bg-white/[0.06]"}`}
                  >
                    <span className={`icon-badge ${isActive ? "icon-badge-purple" : "bg-white/10"} !w-7 !h-7 !rounded-lg transition-all`}>
                      <Icon className="w-3.5 h-3.5 text-white" />
                    </span>
                    {label}
                    {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-purple" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User card */}
      {user && (
        <div className="px-4 py-4 flex-shrink-0 flex items-center gap-3" style={{ borderTop: "1px solid var(--dash-border)" }}>
          <img src={user.photoURL ?? "/avatar.png"} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-purple/40 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user.displayName ?? user.email}</p>
            <p className="text-xs text-white/40 truncate">{user.email}</p>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen flex" style={{ background: "var(--dash-bg)" }}>

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex w-60 flex-shrink-0 flex-col"
        style={{ background: "var(--dash-sidebar)", borderRight: "1px solid var(--dash-border)" }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/60 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside
            className="fixed inset-y-0 left-0 z-40 w-60 flex flex-col lg:hidden"
            style={{ background: "var(--dash-sidebar)", borderRight: "1px solid var(--dash-border)" }}
          >
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop topbar */}
        <header
          className="hidden lg:flex items-center justify-between px-8 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--dash-border)" }}
        >
          <p className="text-xs text-white/30 uppercase tracking-widest font-tomorrow">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
          {user && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-white leading-none">{user.displayName ?? user.email}</p>
                <p className="text-xs text-white/35 mt-0.5">{user.email}</p>
              </div>
              <img src={user.photoURL ?? "/avatar.png"} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-white/10" />
            </div>
          )}
        </header>

        {/* Mobile topbar */}
        <header
          className="lg:hidden flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{ background: "var(--dash-sidebar)", borderBottom: "1px solid var(--dash-border)" }}
        >
          <button onClick={() => setSidebarOpen(true)} className="text-white/50 hover:text-white transition p-1">
            <HiOutlineBars3 className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-white flex-1 truncate">{decodedName}</span>
          <button onClick={() => setSidebarOpen(false)} className="text-white/30 lg:hidden">
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </header>

        <main className="flex-1 px-8 py-7 overflow-auto text-white">{children}</main>
      </div>
    </div>
  );
}
