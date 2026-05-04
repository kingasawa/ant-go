"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import SidebarUserCard from "@/app/components/SidebarUserCard";
import { HiOutlineSquares2X2, HiOutlineDevicePhoneMobile, HiOutlineDeviceTablet, HiOutlineUser, HiOutlineCog6Tooth, HiOutlineCreditCard, HiOutlineBars3, HiMiniDevicePhoneMobile, HiOutlineChartBar } from "react-icons/hi2";
import { AiOutlineAppstoreAdd } from "react-icons/ai";

const navItems = [
	{ href: "/account/overview", label: "Overview", Icon: HiOutlineSquares2X2 },
	{ href: "/account/apps",     label: "Apps",     Icon: AiOutlineAppstoreAdd },
	{ href: "/account/devices",  label: "Devices",  Icon: HiMiniDevicePhoneMobile },
	{ href: "/account/usage",    label: "Usage",    Icon: HiOutlineChartBar },
	{ href: "/account/profile",  label: "Profile",  Icon: HiOutlineUser },
	{ href: "/account/settings", label: "Settings", Icon: HiOutlineCog6Tooth },
	{ href: "/account/billing",  label: "Billing",  Icon: HiOutlineCreditCard },
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
			{/* Background */}
			<div
				className="fixed inset-0 bg-cover bg-center bg-no-repeat"
				style={{ backgroundImage: "url('/assets/images/bgimg1.jpg')" }}
			/>
			<div className="fixed inset-0 bg-black/65" />

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
								<Icon className="w-5 h-5" />
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
						<HiOutlineBars3 className="w-6 h-6" />
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
