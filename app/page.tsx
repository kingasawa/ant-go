"use client";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { GLASS } from "@/lib/glass";
import LanguageToggle from "@/app/components/LanguageToggle";

const NAV_GLASS: React.CSSProperties = {
  backdropFilter: "blur(20px) saturate(160%)",
  WebkitBackdropFilter: "blur(20px) saturate(160%)",
  background: "rgba(255,255,255,0.07)",
  borderBottom: "1px solid rgba(255,255,255,0.11)",
};

const HIGHLIGHT_GLASS: React.CSSProperties = {
  backdropFilter: "blur(18px) saturate(180%)",
  WebkitBackdropFilter: "blur(18px) saturate(180%)",
  background: "rgb(var(--tw-accent) / 0.18)",
  border: "1px solid rgb(var(--tw-accent-light) / 0.45)",
  boxShadow:
    "inset 0px -10px 20px rgba(0,0,0,0.3), inset 0px 2px 20px rgb(var(--tw-accent-light) / 0.15), 0px 5px 30px rgba(0,0,0,0.4)",
};

type TSegment = { text: string; cls: string };
type TLine = {
  type: "cmd" | "output";
  raw: string;
  segments?: TSegment[];
  outputCls?: string;
};

type TActiveLine = { type: string; raw: string; segments?: TSegment[]; outputCls?: string; partial?: string; done?: boolean };

function AnimatedTerminal({ uploadDone, buildSent }: { uploadDone: string; buildSent: string }) {
  const [lines, setLines] = useState<TActiveLine[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const TERMINAL_LINES: TLine[] = [
    {
      type: "cmd", raw: "npm install -g ant-go",
      segments: [
        { text: "npm",      cls: "text-yellow-300" },
        { text: " install", cls: "text-white/80" },
        { text: " -g",      cls: "text-blue-400" },
        { text: " ant-go",  cls: "text-accent font-semibold" },
      ],
    },
    { type: "output", raw: "added 42 packages in 3s",  outputCls: "text-white/35" },
    {
      type: "cmd", raw: "ant build",
      segments: [
        { text: "ant",   cls: "text-accent font-semibold" },
        { text: " build", cls: "text-green-300" },
      ],
    },
    { type: "output", raw: "✔ Project packed: 12.4 MB", outputCls: "text-green-400" },
    { type: "output", raw: uploadDone,                  outputCls: "text-green-400" },
    { type: "output", raw: buildSent,                   outputCls: "text-emerald-300" },
    {
      type: "cmd", raw: "ant status abc123xyz",
      segments: [
        { text: "ant",        cls: "text-accent font-semibold" },
        { text: " status",    cls: "text-white/80" },
        { text: " abc123xyz", cls: "text-yellow-300" },
      ],
    },
    { type: "output", raw: "Status: SUCCESS · IPA ready", outputCls: "text-white/50" },
  ];

  useEffect(() => {
    startedRef.current = false;
    setLines([]);
  }, [uploadDone, buildSent]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadDone, buildSent]);

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

function StepsList({ steps }: { steps: string[] }) {
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
        {steps.map((label, idx) => (
          <li key={idx} className="step-item reveal flex items-start gap-4">
            <span className="flex-shrink-0 w-9 h-9 rounded-full bg-accent flex items-center justify-center font-bold text-sm shadow-lg shadow-accent/40">
              {idx + 1}
            </span>
            <p className="text-white/75 leading-relaxed pt-1">{label}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function FeatureGrid({ features }: { features: { title: string; desc: string }[] }) {
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
        <div key={f.title} className="reveal card-glow rounded-2xl p-6" style={GLASS}>
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

const CLI_TEXT = "$ npm install -g ant-go && ant build";

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
  const { t, lang } = useLanguage();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const features = [
    { title: t("feature1Title"), desc: t("feature1Desc") },
    { title: t("feature2Title"), desc: t("feature2Desc") },
    { title: t("feature3Title"), desc: t("feature3Desc") },
    { title: t("feature4Title"), desc: t("feature4Desc") },
    { title: t("feature5Title"), desc: t("feature5Desc") },
    { title: t("feature6Title"), desc: t("feature6Desc") },
  ];

  const steps = [t("step1"), t("step2"), t("step3"), t("step4")];

  const plans = [
    {
      name: "Starter",
      planKey: "starter",
      price: "$9",
      period: t("planPeriod"),
      desc: t("planStarterDesc"),
      features: [t("planStarterF1"), t("planStarterF2"), t("planStarterF3"), t("planStarterF4")],
      highlight: false,
      cta: t("planStarterCta"),
    },
    {
      name: "Pro",
      planKey: "pro",
      price: "$29",
      period: t("planPeriod"),
      desc: t("planProDesc"),
      features: [t("planProF1"), t("planProF2"), t("planProF3"), t("planProF4")],
      highlight: true,
      cta: t("planProCta"),
    },
    {
      name: "Team",
      planKey: "team",
      price: "$79",
      period: t("planPeriod"),
      desc: t("planTeamDesc"),
      features: [t("planTeamF1"), t("planTeamF2"), t("planTeamF3"), t("planTeamF4"), t("planTeamF5")],
      highlight: false,
      cta: t("planTeamCta"),
    },
  ];

  async function handleSubscribe(planKey: string) {
    if (planKey === "team") {
      window.location.href = "mailto:support@antgo.work";
      return;
    }
    if (!user) {
      router.push("/login");
      return;
    }
    setCheckoutLoading(planKey);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setCheckoutLoading(null);
    }
  }

  const dropdownRef = useRef<HTMLDivElement>(null);
  const { displayed: cliText, done: cliDone } = useTypewriter(CLI_TEXT);
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setNavVisible(y < lastScrollY.current || y < 64);
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main
      className="relative min-h-screen text-white overflow-x-hidden"
      style={{ backgroundColor: "var(--dash-bg)" }}
    >
      {/* Floating logo (hiện khi nav ẩn) */}
      <div
        className="fixed top-4 left-8 z-40 pointer-events-none"
        style={{
          opacity: navVisible ? 0 : 1,
          transform: navVisible ? "translateY(-8px)" : "translateY(0)",
          transition: "opacity 0.3s ease, transform 0.3s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <img
          src="/assets/images/logo-full.png"
          alt="Logo"
          className="h-10 w-auto"
          style={{ filter: "brightness(0) invert(1)" }}
        />
      </div>

      <div className="relative z-10 pt-20">
        {/* Nav */}
        <nav
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
          style={{
            ...NAV_GLASS,
            transform: navVisible ? "translateY(0)" : "translateY(-100%)",
            transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <Link href="/">
            <img src="/assets/images/logo-full.png" alt="Logo" className="h-12 w-auto" style={{ filter: "brightness(0) invert(1)" }} />
          </Link>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link
              href="/docs"
              className="border border-white/20 hover:border-accent text-white/70 hover:text-white text-sm font-medium px-5 py-2 rounded-lg transition"
            >
              {t("homeNavDocs")}
            </Link>
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="flex items-center gap-2 bg-accent hover:bg-accent text-accent-contrast text-sm font-medium px-5 py-2 rounded-lg transition"
                >
                  <span className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-xs font-bold uppercase">
                    {(user.displayName || user.email || "U")[0]}
                  </span>
                  <span className="max-w-[120px] truncate">{user.displayName || user.email}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div
                  className="absolute right-0 mt-1 w-full rounded-xl shadow-2xl z-50 overflow-hidden border border-white/10"
                  style={{
                    background: "var(--dash-modal)",
                    maxHeight: dropdownOpen ? "120px" : "0px",
                    opacity: dropdownOpen ? 1 : 0,
                    transition: "max-height 0.2s ease, opacity 0.15s ease",
                  }}
                >
                  <button
                    onClick={() => { setDropdownOpen(false); router.push("/account/overview"); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 transition"
                  >
                    {t("homeNavConsole")}
                  </button>
                  <button
                    onClick={async () => { setDropdownOpen(false); await signOut(auth); router.push("/login"); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 transition"
                  >
                    {t("homeNavLogout")}
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                className="bg-accent hover:bg-accent text-accent-contrast text-sm font-medium px-5 py-2 rounded-lg transition"
              >
                {t("homeNavSignIn")}
              </Link>
            )}
          </div>
        </nav>

        {/* Hero */}
        <section className="max-w-4xl mx-auto text-center py-28 px-6">
          <span className="fade-up inline-block text-accent-light text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-widest" style={{ background: "rgb(var(--tw-accent) / 0.15)", border: "1px solid rgb(var(--tw-accent) / 0.35)", animationDelay: "0ms" }}>
            {t("homeHeroBadge")}
          </span>
          <h1 className="fade-up text-5xl md:text-6xl font-extrabold leading-tight mb-6" style={{ animationDelay: "100ms" }}>
            {t("homeHeroTitle1")}{" "}
            <span className="shimmer-text">{t("homeHeroShimmer")}</span>
            {t("homeHeroTitle2")}
          </h1>
          <p className="fade-up text-white/60 text-lg md:text-xl max-w-2xl mx-auto mb-4" style={{ animationDelay: "200ms" }}>
            {t("homeHeroDesc")}
          </p>
          <p className="fade-up text-white/30 text-sm mb-10 font-mono" style={{ animationDelay: "300ms" }}>
            {cliText}
            {!cliDone && <span className="inline-block w-[2px] h-[1em] bg-white/50 ml-0.5 align-middle animate-pulse" />}
          </p>
          <div className="fade-up flex flex-col sm:flex-row gap-4 justify-center" style={{ animationDelay: "400ms" }}>
            <Link
              href="/login"
              className="btn-pulse bg-accent hover:bg-accent text-accent-contrast font-semibold px-8 py-3 rounded-xl transition text-lg shadow-lg shadow-accent/40"
            >
              {t("homeHeroCta")}
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-center mb-12">{t("homeFeaturesTitle")}</h2>
          <FeatureGrid features={features} />
        </section>

        {/* How it works */}
        <section className="py-16">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center mb-12">{t("homeHowTitle")}</h2>
            <StepsList steps={steps} />
          </div>
        </section>

        {/* CLI Install */}
        <section className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-center mb-4">{t("homeCLITitle")}</h2>
          <p className="text-white/50 text-center text-sm mb-8">{t("homeCLIDesc")}</p>
          <AnimatedTerminal
            uploadDone={t("terminalUploadDone")}
            buildSent={t("terminalBuildSent")}
          />
        </section>

        {/* Pricing */}
        <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-3">{t("homePricingTitle")}</h2>
            <p className="text-white/50 text-center text-sm mb-12">{t("homePricingDesc")}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className="relative rounded-2xl p-6 flex flex-col transition-all duration-300 hover:scale-[1.02]"
                  style={plan.highlight ? HIGHLIGHT_GLASS : GLASS}
                >
                  {plan.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-contrast text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                      {t("planMostPopular")}
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
                        <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleSubscribe(plan.planKey)}
                    disabled={checkoutLoading === plan.planKey}
                    className={`w-full text-center py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-60 ${
                      plan.highlight
                        ? "bg-accent hover:opacity-90 text-accent-contrast"
                        : "hover:bg-white/10 text-white/80 hover:text-white"
                    }`}
                    style={plan.highlight ? {} : { border: "1px solid rgba(255,255,255,0.2)" }}
                  >
                    {checkoutLoading === plan.planKey ? t("processing") : plan.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 text-center px-6">
          <div className="max-w-2xl mx-auto rounded-3xl p-12" style={HIGHLIGHT_GLASS}>
            <h2 className="text-3xl font-bold mb-4">{t("homeCtaTitle")}</h2>
            <p className="text-white/60 mb-8">{t("homeCtaDesc")}</p>
            <Link
              href="/login"
              className="bg-accent hover:bg-accent text-accent-contrast font-semibold px-10 py-3 rounded-xl transition text-lg shadow-lg shadow-accent/40"
            >
              {t("homeCtaButton")}
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
