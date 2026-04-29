"use client";
import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
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

type TSegment = { text: string; cls: string };
type TLine = {
  type: "cmd" | "output";
  raw: string;
  segments?: TSegment[];
  outputCls?: string;
};

const TERMINAL_LINES: TLine[] = [
  {
    type: "cmd", raw: "npm install -g ant-go",
    segments: [
      { text: "npm",      cls: "text-yellow-300" },
      { text: " install", cls: "text-white/80" },
      { text: " -g",      cls: "text-blue-400" },
      { text: " ant-go",  cls: "text-indigo-400 font-semibold" },
    ],
  },
  { type: "output", raw: "added 42 packages in 3s",      outputCls: "text-white/35" },
  {
    type: "cmd", raw: "ant-go build",
    segments: [
      { text: "ant-go", cls: "text-indigo-400 font-semibold" },
      { text: " build",  cls: "text-green-300" },
    ],
  },
  { type: "output", raw: "✔ Project packed: 12.4 MB",    outputCls: "text-green-400" },
  { type: "output", raw: "✔ Upload hoàn tất",             outputCls: "text-green-400" },
  { type: "output", raw: "✔ Build đã gửi lên server!",   outputCls: "text-emerald-300" },
  {
    type: "cmd", raw: "ant-go status abc123xyz",
    segments: [
      { text: "ant-go",     cls: "text-indigo-400 font-semibold" },
      { text: " status",    cls: "text-white/80" },
      { text: " abc123xyz", cls: "text-yellow-300" },
    ],
  },
  { type: "output", raw: "Status: SUCCESS · IPA ready",  outputCls: "text-white/50" },
];

type TActiveLine = { type: string; raw: string; segments?: TSegment[]; outputCls?: string; partial?: string; done?: boolean };

function AnimatedTerminal() {
  const [lines, setLines] = useState<TActiveLine[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          observer.disconnect();
          runAnimation();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function runAnimation() {
    let lineIndex = 0;

    function nextLine() {
      if (lineIndex >= TERMINAL_LINES.length) return;
      const line = TERMINAL_LINES[lineIndex];
      lineIndex++;

      if (line.type === "output") {
        setTimeout(() => {
          setLines((prev) => [...prev, { ...line, done: true }]);
          nextLine();
        }, 300);
      } else {
        setLines((prev) => [...prev, { ...line, partial: "", done: false }]);
        let charIndex = 0;
        const interval = setInterval(() => {
          charIndex++;
          setLines((prev) =>
            prev.map((l, i) =>
              i === prev.length - 1 ? { ...l, partial: line.raw.slice(0, charIndex) } : l
            )
          );
          if (charIndex >= line.raw.length) {
            clearInterval(interval);
            setLines((prev) =>
              prev.map((l, i) => (i === prev.length - 1 ? { ...l, done: true } : l))
            );
            setTimeout(nextLine, 500);
          }
        }, 40);
      }
    }

    setTimeout(nextLine, 300);
  }

  return (
    <div ref={containerRef} className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.15)", boxShadow: "0 5px 30px rgba(0,0,0,0.5)" }}>
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700">
        <span className="w-3 h-3 rounded-full bg-red-500/70" />
        <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <span className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-3 text-xs text-gray-400 font-mono">terminal</span>
      </div>
      <div className="bg-gray-950 px-6 py-5 font-mono text-sm min-h-[200px] space-y-1.5">
        {lines.map((line, i) => (
          <p key={i}>
            {line.type === "cmd" ? (
              <>
                <span className="text-green-400/60 select-none">~/project</span>
                <span className="text-white/30 select-none"> $ </span>
                {line.done && line.segments
                  ? line.segments.map((seg, j) => (
                      <span key={j} className={seg.cls}>{seg.text}</span>
                    ))
                  : <span className="text-white/90">{line.partial}</span>
                }
                {!line.done && (
                  <span className="inline-block w-[2px] h-[1em] bg-white/60 ml-0.5 align-middle animate-pulse" />
                )}
              </>
            ) : (
              <span className={`pl-4 ${line.outputCls ?? "text-white/50"}`}>{line.raw}</span>
            )}
          </p>
        ))}
      </div>
    </div>
  );
}

function StepsList() {
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const items = listRef.current?.querySelectorAll<HTMLElement>(".step-item");
    if (!items) return;
    const observers: IntersectionObserver[] = [];
    items.forEach((item, i) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => item.classList.add("visible"), i * 120);
            observer.disconnect();
          }
        },
        { threshold: 0.2 }
      );
      observer.observe(item);
      observers.push(observer);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <div className="rounded-2xl p-8" style={GLASS}>
      <ol ref={listRef} className="space-y-5">
        {steps.map((s) => (
          <li key={s.n} className="step-item reveal flex items-start gap-4">
            <span className="flex-shrink-0 w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-sm shadow-lg shadow-indigo-900/40">
              {s.n}
            </span>
            <p className="text-white/75 leading-relaxed pt-1">{s.label}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function FeatureGrid() {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cards = gridRef.current?.querySelectorAll<HTMLElement>(".reveal");
    if (!cards) return;
    const observers: IntersectionObserver[] = [];
    cards.forEach((card, i) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => card.classList.add("visible"), i * 80);
            observer.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(card);
      observers.push(observer);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {features.map((f) => (
        <div
          key={f.title}
          className="reveal card-glow rounded-2xl p-6"
          style={GLASS}
        >
          <h3 className="text-lg font-semibold mb-2 text-white">{f.title}</h3>
          <p className="text-white/55 text-sm leading-relaxed">{f.desc}</p>
        </div>
      ))}
    </div>
  );
}

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("visible"); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

const CLI_TEXT = "$ npm install -g ant-go && ant-go build";

function useTypewriter(text: string, speed = 45, startDelay = 900) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) { clearInterval(interval); setDone(true); }
      }, speed);
      return () => clearInterval(interval);
    }, startDelay);
    return () => clearTimeout(timeout);
  }, [text, speed, startDelay]);

  return { displayed, done };
}

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { displayed: cliText, done: cliDone } = useTypewriter(CLI_TEXT);

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
          <span className="fade-up inline-block text-indigo-300 text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-widest" style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.4)", animationDelay: "0ms" }}>
            MULTIPLE PLATFORM · IOS/ANDROID
          </span>
          <h1 className="fade-up text-5xl md:text-6xl font-extrabold leading-tight mb-6" style={{ animationDelay: "100ms" }}>
            Build iOS app{" "}
            <span className="shimmer-text">nhanh hơn</span>,
            <br />rẻ hơn bao giờ hết
          </h1>
          <p className="fade-up text-white/60 text-lg md:text-xl max-w-2xl mx-auto mb-4" style={{ animationDelay: "200ms" }}>
            Dịch vụ build iOS và Android cho React Native / Expo — Không subscription theo phút, không chờ lâu, log stream realtime, dễ dàng debug.
          </p>
          <p className="fade-up text-white/30 text-sm mb-10 font-mono" style={{ animationDelay: "300ms" }}>
            {cliText}
            {!cliDone && <span className="inline-block w-[2px] h-[1em] bg-white/50 ml-0.5 align-middle animate-pulse" />}
          </p>
          <div className="fade-up flex flex-col sm:flex-row gap-4 justify-center" style={{ animationDelay: "400ms" }}>
            <Link
              href="/login"
              className="btn-pulse bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3 rounded-xl transition text-lg shadow-lg shadow-indigo-900/40"
            >
              Vào Dashboard →
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-center mb-12">Tại sao dùng Ant Go?</h2>
          <FeatureGrid />
        </section>

        {/* How it works */}
        <section className="py-16">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center mb-12">Hoạt động như thế nào?</h2>
            <StepsList />
          </div>
        </section>

        {/* CLI Install */}
        <section className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-center mb-4">Cài đặt CLI</h2>
          <p className="text-white/50 text-center text-sm mb-8">
            CLI chạy trên máy developer — không cần cài gì thêm trên server.
          </p>
          <AnimatedTerminal />
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
