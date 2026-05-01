"use client";
import { useState, useEffect, useRef } from "react";
import { usePathname, useParams, useRouter } from "next/navigation";
import Link from "next/link";
import SidebarUserCard from "@/app/components/SidebarUserCard";
import { HiOutlineChevronLeft, HiOutlineChartBar, HiOutlineCodeBracket, HiOutlineCube, HiOutlineBars3, HiOutlineChevronUpDown, HiOutlineCog6Tooth, HiOutlineCloud } from "react-icons/hi2";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

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

interface AppDoc { id: string; name: string; }

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
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const base = `/account/app/${appName}`;

  const sections = [
    {
      title: "PROJECT",
      items: [
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
    {
      title: "XCODE CLOUD",
      items: [
        { href: `${base}/xcode-cloud`, label: "Info", Icon: HiOutlineCloud },
      ],
    },
    {
      title: "CONFIG",
      items: [
        { href: `${base}/app-info`, label: "Settings", Icon: HiOutlineCog6Tooth },
      ],
    },
  ];

  // Derive current tab suffix (e.g. /builds) to switch app while keeping tab
  const tabSuffix = (() => {
    const suffixes = ["/builds", "/workflows", "/usage", "/xcode-cloud", "/app-info"];
    for (const s of suffixes) {
      if (pathname.startsWith(base + s)) return s;
    }
    return "/builds";
  })();

  const sidebarContent = (
    <>
      {/* App dropdown header */}
      <div className="px-3 py-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 transition text-left"
          >
            <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
              {decodedName.charAt(0).toUpperCase()}
            </div>
            <p className="text-sm font-semibold text-white truncate flex-1">{decodedName}</p>
            <HiOutlineChevronUpDown className="w-4 h-4 text-white/40 flex-shrink-0" />
          </button>

          {dropdownOpen && (
            <div
              className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-50 shadow-xl"
              style={{ background: "rgba(20,20,30,0.95)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              {apps.length === 0 && (
                <p className="px-4 py-3 text-xs text-white/40">Không có app nào</p>
              )}
              {apps.map((app) => {
                const encodedName = encodeURIComponent(app.name);
                const isSelected = app.name === decodedName;
                return (
                  <button
                    key={app.id}
                    onClick={() => {
                      setDropdownOpen(false);
                      router.push(`/account/app/${encodedName}${tabSuffix}`);
                    }}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition hover:bg-white/10 text-left ${isSelected ? "text-accent-light font-medium" : "text-white/70"}`}
                  >
                    <div className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {app.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate">{app.name}</span>
                    {isSelected && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-light flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Back link */}
      <div className="px-2 pt-3">
        <Link
          href="/account/apps"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white/50 hover:bg-white/10 hover:text-white transition"
        >
          <HiOutlineChevronLeft className="w-4 h-4" />
          Apps
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
                const isActive = pathname === href || pathname.startsWith(href + "/");
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
