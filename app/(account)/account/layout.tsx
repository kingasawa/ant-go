"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import SidebarUserCard from "@/app/components/SidebarUserCard";

function IconOverview() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>; }
function IconApps() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 8.25h3m-3 3h3m-3 3h3" /></svg>; }
function IconProfile() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>; }
function IconSettings() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>; }
function IconBilling() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>; }

const navItems = [
	{ href: "/account/overview", label: "Overview", Icon: IconOverview },
	{ href: "/account/apps",     label: "Apps",     Icon: IconApps },
	{ href: "/account/profile",  label: "Profile",  Icon: IconProfile },
	{ href: "/account/settings", label: "Settings", Icon: IconSettings },
	{ href: "/account/billing",  label: "Billing",  Icon: IconBilling },
];

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
			<div className="min-h-screen bg-gray-950 flex items-center justify-center">
				<div className="text-white/40 text-lg animate-pulse">Loading…</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen relative text-white flex">
			{/* Fixed grayscale background */}
			<div
				className="fixed inset-0 bg-cover bg-center"
				style={{
					backgroundImage: "url('/assets/images/bgimg1.jpg')",
					filter: "grayscale(1) brightness(0.4)",
				}}
			/>
			<div className="fixed inset-0 bg-black/50" />

			{/* Sidebar */}
			<aside
				className={`fixed inset-y-0 left-0 z-40 w-60 flex flex-col transform transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:flex`}
				style={SIDEBAR}
			>
				{/* Logo */}
				<div className="px-5 py-5 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
					<Link href="/">
						<img src="/assets/images/logo-text.png" alt="Logo" className="w-auto h-auto" style={{ filter: "brightness(0) invert(1)" }} />
					</Link>
				</div>

				{/* Nav items — scrollable */}
				<nav className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5">
					{navItems.map(({ href, label, Icon }) => {
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
								<Icon />
								{label}
							</Link>
						);
					})}
				</nav>

				{/* User section — fixed at bottom */}
				<SidebarUserCard />
			</aside>

			{/* Overlay (mobile) */}
			{sidebarOpen && (
				<div
					className="fixed inset-0 z-30 bg-black/50 lg:hidden"
					onClick={() => setSidebarOpen(false)}
				/>
			)}

			{/* Main content */}
			<div className="relative flex-1 flex flex-col min-w-0">
				{/* Mobile topbar */}
				<header className="lg:hidden flex items-center justify-between px-4 py-3" style={TOPBAR}>
					<button
						onClick={() => setSidebarOpen(true)}
						className="text-white/60 hover:text-white p-1 transition"
					>
						<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
						</svg>
					</button>
					<img src="/assets/images/logo-full.png" alt="Logo" className="h-8 w-auto" style={{ filter: "brightness(0) invert(1)" }} />
					<img
						src={user.photoURL ?? "/avatar.png"}
						alt=""
						className="w-8 h-8 rounded-full border border-white/20"
					/>
				</header>

				{/* Page slot */}
				<main className="flex-1 px-6 py-8 overflow-auto">{children}</main>
			</div>
		</div>
	);
}
