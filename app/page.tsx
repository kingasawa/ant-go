"use client";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { GLASS } from "@/lib/glass";

const features = [
  {
    title: "Giá thành rẻ",
    desc: "Không tính phí theo build minute. Trả phí gói cố định hàng tháng — build bao nhiêu tuỳ thích.",
  },
  {
    title: "Không phải chờ queue",
    desc: "Build chạy trên Mac server riêng của chúng tôi. Không có hàng chờ chung với hàng nghìn user khác.",
  },
  {
    title: "Real-time build log",
    desc: "Log stream trực tiếp lên dashboard trong khi build đang chạy. Xem từng bước Fastlane, Xcode, pod install theo thời gian thực.",
  },
  {
    title: "Tự động quản lý certificate",
    desc: "Tích hợp Apple Developer API — tự động tạo Distribution Certificate và Provisioning Profile, renew khi hết hạn.",
  },
  {
    title: "Dễ debug hơn",
    desc: "Full build log được lưu lại sau mỗi lần build. Xem lại log của bất kỳ build nào, bất kỳ lúc nào.",
  },
  {
    title: "IPA sẵn sàng tải về",
    desc: "File .ipa và .dSYM được lưu trữ sau mỗi build thành công, kèm link tải về và nút submit thẳng lên App Store Connect.",
  },
];

const steps = [
  { n: "1", label: "Đăng ký tài khoản và tạo project trên dashboard" },
  { n: "2", label: "Cài CLI: npm install -g ant-go, thêm projectId vào app.json" },
  { n: "3", label: "Chạy ant-go build — CLI tự pack project và upload lên server" },
  { n: "4", label: "Mac build server nhận job, build với Fastlane, stream log realtime" },
  { n: "5", label: "Build xong: IPA sẵn sàng tải về hoặc submit lên App Store Connect" },
];

const plans = [
  {
    name: "Starter",
    price: "$9",
    period: "/tháng",
    desc: "Phù hợp cho cá nhân và side project",
    features: ["50 build / tháng", "1 build song song", "Log lưu 7 ngày", "Email support"],
    highlight: false,
    cta: "Bắt đầu dùng",
  },
  {
    name: "Pro",
    price: "$29",
    period: "/tháng",
    desc: "Cho team đang phát triển sản phẩm",
    features: ["Unlimited build", "3 build song song", "Log lưu 30 ngày", "Priority support"],
    highlight: true,
    cta: "Dùng thử 14 ngày miễn phí",
  },
  {
    name: "Team",
    price: "$79",
    period: "/tháng",
    desc: "Cho team lớn, nhiều app",
    features: ["Unlimited build", "10 build song song", "Log lưu 90 ngày", "Slack support", "SLA 99.9%"],
    highlight: false,
    cta: "Liên hệ",
  },
];

const NAV_GLASS: React.CSSProperties = {
  backdropFilter: "blur(20px) saturate(160%)",
  WebkitBackdropFilter: "blur(20px) saturate(160%)",
  background: "rgba(255,255,255,0.07)",
  borderBottom: "1px solid rgba(255,255,255,0.11)",
};

const HIGHLIGHT_GLASS: React.CSSProperties = {
  backdropFilter: "blur(18px) saturate(180%)",
  WebkitBackdropFilter: "blur(18px) saturate(180%)",
  background: "rgba(99, 102, 241, 0.25)",
  border: "1px solid rgba(129, 140, 248, 0.5)",
  boxShadow:
    "inset 0px -10px 20px rgba(0,0,0,0.3), inset 0px 2px 20px rgba(129,140,248,0.2), 0px 5px 30px rgba(0,0,0,0.4)",
};

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <main className="relative min-h-screen text-white overflow-x-hidden">
      {/* Fixed background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/assets/images/bgimg1.jpg')" }}
      />
      <div className="fixed inset-0 bg-black/65" />

      {/* Content — all relative z-10 */}
      <div className="relative z-10">
        {/* Nav */}
        <nav className="sticky top-0 z-50 flex items-center justify-between px-8 py-4" style={NAV_GLASS}>
          <Link href="/">
            <img src="/assets/images/logo-full.png" alt="Logo" className="h-12 w-auto" style={{ filter: "brightness(0) invert(1)" }} />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/docs"
              className="border border-white/20 hover:border-indigo-400 text-white/70 hover:text-white text-sm font-medium px-5 py-2 rounded-lg transition"
            >
              Docs
            </Link>
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2 rounded-lg transition"
                >
                  <span className="w-6 h-6 rounded-full bg-indigo-400 flex items-center justify-center text-xs font-bold uppercase">
                    {(user.displayName || user.email || "U")[0]}
                  </span>
                  <span className="max-w-[120px] truncate">{user.displayName || user.email}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-44 rounded-xl shadow-xl z-50 overflow-hidden" style={GLASS}>
                    <button
                      onClick={() => { setDropdownOpen(false); router.push("/account/overview"); }}
                      className="w-full text-left px-4 py-3 text-sm text-white/80 hover:bg-white/10 transition"
                    >
                      🖥️ Console
                    </button>
                    <button
                      onClick={async () => { setDropdownOpen(false); await signOut(auth); router.push("/login"); }}
                      className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-white/10 transition"
                    >
                      🚪 Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2 rounded-lg transition"
              >
                Sign In
              </Link>
            )}
          </div>
        </nav>

        {/* Hero */}
        <section className="max-w-4xl mx-auto text-center py-28 px-6">
          <span className="inline-block text-indigo-300 text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-widest" style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.4)" }}>
            MULTIPLE PLATFORM · IOS/ANDROID
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-6">
            Build iOS app{" "}
            <span className="text-indigo-400">nhanh hơn</span>,
            <br />rẻ hơn bao giờ hết
          </h1>
          <p className="text-white/60 text-lg md:text-xl max-w-2xl mx-auto mb-4">
            Dịch vụ build iOS và Android cho React Native / Expo — Không subscription theo phút, không chờ lâu, log stream realtime, dễ dàng debug.
          </p>
          <p className="text-white/30 text-sm mb-10 font-mono">
            $ npm install -g ant-go &nbsp;&&nbsp; ant-go build
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3 rounded-xl transition text-lg shadow-lg shadow-indigo-900/40"
            >
              Vào Dashboard →
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-center mb-12">Tại sao dùng Ant Go?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300"
                style={GLASS}
              >
                <h3 className="text-lg font-semibold mb-2 text-white">{f.title}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="py-16">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center mb-12">Hoạt động như thế nào?</h2>
            <div className="rounded-2xl p-8" style={GLASS}>
              <ol className="space-y-5">
                {steps.map((s) => (
                  <li key={s.n} className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-sm shadow-lg shadow-indigo-900/40">
                      {s.n}
                    </span>
                    <p className="text-white/75 leading-relaxed pt-1">{s.label}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* CLI Install */}
        <section className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-center mb-4">Cài đặt CLI</h2>
          <p className="text-white/50 text-center text-sm mb-8">
            CLI chạy trên máy developer — không cần cài gì thêm trên server.
          </p>
          {/* Terminal — giữ dark để dễ đọc code */}
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.15)", boxShadow: "0 5px 30px rgba(0,0,0,0.5)" }}>
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700">
              <span className="w-3 h-3 rounded-full bg-red-500/70" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <span className="w-3 h-3 rounded-full bg-green-500/70" />
              <span className="ml-3 text-xs text-gray-400 font-mono">terminal</span>
            </div>
            <div className="bg-gray-950 px-6 py-5 space-y-3 font-mono text-sm">
              <p><span className="text-white/30 select-none"># Cài CLI (một lần duy nhất)</span></p>
              <p><span className="text-indigo-400 select-none">$ </span><span className="text-white">npm install -g ant-go</span></p>
              <p className="pt-2"><span className="text-white/30 select-none"># Trigger build từ thư mục project</span></p>
              <p><span className="text-indigo-400 select-none">$ </span><span className="text-white">ant-go build</span></p>
              <p className="pt-2 text-white/30 select-none"># Xem trạng thái build</p>
              <p><span className="text-indigo-400 select-none">$ </span><span className="text-white">ant-go status &lt;jobId&gt;</span></p>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-3">Pricing</h2>
            <p className="text-white/50 text-center text-sm mb-12">
              Build iOS app nhanh hơn, rẻ hơn bao giờ hết.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className="relative rounded-2xl p-6 flex flex-col transition-all duration-300 hover:scale-[1.02]"
                  style={plan.highlight ? HIGHLIGHT_GLASS : GLASS}
                >
                  {plan.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                      Phổ biến nhất
                    </span>
                  )}
                  <p className="text-sm font-semibold text-white/60 mb-1">{plan.name}</p>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                    <span className="text-white/40 text-sm mb-1">{plan.period}</span>
                  </div>
                  <p className="text-white/40 text-xs mb-6">{plan.desc}</p>
                  <ul className="space-y-2 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-white/80">
                        <svg className="w-4 h-4 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/login"
                    className={`w-full text-center py-2.5 rounded-xl text-sm font-semibold transition ${
                      plan.highlight
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                        : "hover:bg-white/10 text-white/80 hover:text-white"
                    }`}
                    style={plan.highlight ? {} : { border: "1px solid rgba(255,255,255,0.2)" }}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 text-center px-6">
          <div className="max-w-2xl mx-auto rounded-3xl p-12" style={HIGHLIGHT_GLASS}>
            <h2 className="text-3xl font-bold mb-4">Sẵn sàng build?</h2>
            <p className="text-white/60 mb-8">Đăng nhập để vào dashboard, tạo project và lấy Project ID cho CLI.</p>
            <Link
              href="/login"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-10 py-3 rounded-xl transition text-lg shadow-lg shadow-indigo-900/40"
            >
              Đăng nhập →
            </Link>
          </div>
        </section>

        <footer className="text-center text-white/25 text-sm py-8">
          © {new Date().getFullYear()} Ant Go · MULTIPLE PLATFORM · IOS/ANDROID
        </footer>
      </div>
    </main>
  );
}
