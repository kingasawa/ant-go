"use client";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

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
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-800">
        <span className="text-xl font-bold text-indigo-400">ant-go</span>
        <div className="flex items-center gap-3">
          <Link
            href="/docs"
            className="border border-gray-700 hover:border-indigo-500 text-gray-300 hover:text-white text-sm font-medium px-5 py-2 rounded-lg transition"
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
                <div className="absolute right-0 mt-2 w-44 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                  <button
                    onClick={() => { setDropdownOpen(false); router.push("/account/overview"); }}
                    className="w-full text-left px-4 py-3 text-sm text-gray-200 hover:bg-gray-800 transition"
                  >
                    🖥️ Console
                  </button>
                  <button
                    onClick={async () => { setDropdownOpen(false); await signOut(auth); router.push("/login"); }}
                    className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-gray-800 transition"
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
      <section className="max-w-4xl mx-auto text-center py-24 px-6">
        <span className="inline-block bg-indigo-900/50 text-indigo-300 text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-widest">
          MULTIPLE PLATFORM · IOS/ANDROID
        </span>
        <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-6">
          Build iOS app{" "}
          <span className="text-indigo-400">nhanh hơn</span>,
          <br />rẻ hơn bao giờ hết
        </h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-4">
          Dịch vụ build iOS và Android cho React Native / Expo — Không subscription theo phút, không chờ lâu, log stream realtime, dễ dàng debug.
        </p>
        <p className="text-gray-600 text-sm mb-10 font-mono">
          $ npm install -g ant-go &nbsp;&&nbsp; ant-go build
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3 rounded-xl transition text-lg"
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
              className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-indigo-700 transition"
            >
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-900 py-16">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Hoạt động như thế nào?</h2>
          <ol className="space-y-4">
            {steps.map((s) => (
              <li key={s.n} className="flex items-start gap-4">
                <span className="flex-shrink-0 w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-sm">
                  {s.n}
                </span>
                <p className="text-gray-300 leading-relaxed pt-1">{s.label}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CLI Install */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-4">Cài đặt CLI</h2>
        <p className="text-gray-400 text-center text-sm mb-8">
          CLI chạy trên máy developer — không cần cài gì thêm trên server.
        </p>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700">
            <span className="w-3 h-3 rounded-full bg-red-500/70" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <span className="w-3 h-3 rounded-full bg-green-500/70" />
            <span className="ml-3 text-xs text-gray-400 font-mono">terminal</span>
          </div>
          <div className="px-6 py-5 space-y-3 font-mono text-sm">
            <p>
              <span className="text-gray-500 select-none"># Cài CLI (một lần duy nhất)</span>
            </p>
            <p>
              <span className="text-indigo-400 select-none">$ </span>
              <span className="text-white">npm install -g ant-go</span>
            </p>
            <p className="pt-2">
              <span className="text-gray-500 select-none"># Trigger build từ thư mục project</span>
            </p>
            <p>
              <span className="text-indigo-400 select-none">$ </span>
              <span className="text-white">ant-go build</span>
            </p>
            <p className="pt-2 text-gray-500 select-none"># Xem trạng thái build</p>
            <p>
              <span className="text-indigo-400 select-none">$ </span>
              <span className="text-white">ant-go status &lt;jobId&gt;</span>
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-900 py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3">Pricing</h2>
          <p className="text-gray-400 text-center text-sm mb-12">
            Build iOS app nhanh hơn, rẻ hơn bao giờ hết.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-6 flex flex-col ${
                  plan.highlight
                    ? "bg-indigo-950/60 border-indigo-600 shadow-lg shadow-indigo-900/30"
                    : "bg-gray-950 border-gray-800"
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                    Phổ biến nhất
                  </span>
                )}
                <p className="text-sm font-semibold text-gray-400 mb-1">{plan.name}</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                  <span className="text-gray-500 text-sm mb-1">{plan.period}</span>
                </div>
                <p className="text-gray-500 text-xs mb-6">{plan.desc}</p>
                <ul className="space-y-2 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
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
                      : "border border-gray-700 hover:border-indigo-500 text-gray-300 hover:text-white"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-900/30 border-y border-indigo-800/40 py-16 text-center px-6">
        <h2 className="text-3xl font-bold mb-4">Sẵn sàng build?</h2>
        <p className="text-gray-400 mb-8">Đăng nhập để vào dashboard, tạo project và lấy Project ID cho CLI.</p>
        <Link
          href="/login"
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-10 py-3 rounded-xl transition text-lg"
        >
          Đăng nhập →
        </Link>
      </section>

      <footer className="text-center text-gray-600 text-sm py-8">
        © {new Date().getFullYear()} Ant Go · MULTIPLE PLATFORM · IOS/ANDROID
      </footer>
    </main>
  );
}
