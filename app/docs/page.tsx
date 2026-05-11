"use client";
import Link from "next/link";
import React, { useState, useRef, useEffect } from "react";
import { GLASS } from "@/lib/glass";
import { useLanguage } from "@/context/LanguageContext";
import LanguageToggle from "@/app/components/LanguageToggle";

const HEADER_STYLE: React.CSSProperties = {
  background: "rgba(18,18,24,0.97)",
  borderBottom: "1px solid rgba(255,255,255,0.1)",
};

function Terminal({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "rgba(20,20,20,0.85)", border: "1px solid rgba(255,255,255,0.1)" }}>
      <div className="flex items-center gap-2 px-4 py-3" style={{ background: "rgba(40,40,40,0.9)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
        <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        {title && <span className="ml-3 text-xs text-white/40 font-medium tracking-wide">{title}</span>}
      </div>
      <div className="px-5 py-4 font-mono text-sm leading-7 text-gray-200 overflow-x-auto">
        {children}
      </div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded-md text-accent-light font-mono text-[13px]"
      style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}>
      {children}
    </code>
  );
}

const GLASS_SECTION = { ...GLASS, boxShadow: "0 4px 24px rgba(0,0,0,0.35)" };

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 mb-12">
      <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-3 px-1">
        <span className="w-1 h-6 bg-accent-light rounded-full inline-block" />
        {title}
      </h2>
      <div className="rounded-2xl p-6" style={GLASS_SECTION}>
        {children}
      </div>
    </section>
  );
}

function Option({ flag, desc }: { flag: string; desc: string }) {
  return (
    <div className="flex gap-4 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
      <Code>{flag}</Code>
      <span className="text-white/50 text-sm">{desc}</span>
    </div>
  );
}

function SidebarNav({ activeId, navGroups }: { activeId: string | null; navGroups: { label: string; items: { id: string; label: string }[] }[] }) {
  return (
    <div>
      {navGroups.map((group, gi) => (
        <React.Fragment key={group.label}>
          <p className={`text-[10px] font-semibold uppercase tracking-widest text-white/35 mb-2 px-3 ${gi === 0 ? "mt-1" : "mt-5"}`}>
            {group.label}
          </p>
          {group.items.map((n) => {
            const isActive = activeId === n.id;
            return (
              <a
                key={n.id}
                href={`#${n.id}`}
                className="block text-sm py-2 px-3 rounded-lg hover:text-white"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(n.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                style={{
                  color: isActive ? "rgb(var(--tw-accent-light))" : "rgba(255,255,255,0.45)",
                  fontWeight: isActive ? 600 : undefined,
                  background: isActive ? "rgb(var(--tw-accent) / 0.12)" : undefined,
                }}
              >
                {n.label}
              </a>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function DocPage() {
  const { t } = useLanguage();
  const [activeId, setActiveId] = useState<string | null>("install");

  const navGroups = [
    {
      label: t("docsNavGenerals"),
      items: [
        { id: "install",    label: t("docsNavInstall") },
        { id: "build",      label: t("docsNavBuild") },
        { id: "status",     label: t("docsNavStatus") },
        { id: "add-device", label: t("docsNavAddDevice") },
        { id: "ant-json",   label: t("docsNavProfiles") },
      ],
    },
    {
      label: t("docsNavAuth"),
      items: [
        { id: "auth-login",  label: t("docsNavLogin") },
        { id: "auth-logout", label: t("docsNavLogout") },
        { id: "auth-whoami", label: t("docsNavWhoami") },
      ],
    },
    {
      label: t("docsNavSettings"),
      items: [
        { id: "set-lang", label: t("docsNavLanguage") },
      ],
    },
  ];

  const allNavItems = navGroups.flatMap((g) => g.items);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    allNavItems.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const profiles = [
    {
      name: "production", color: "text-green-300", badge: "store",
      badgeStyle: { background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" },
      badgeText: "text-green-400",
      desc: t("docsProfileProdDesc"),
      items: ["🔑 Distribution Certificate", "📋 App Store Provisioning Profile", t("docsProfileItemNoDevice")],
      note: t("docsProfileProdNote"),
    },
    {
      name: "development", color: "text-blue-300", badge: "internal",
      badgeStyle: { background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)" },
      badgeText: "text-blue-400",
      desc: t("docsProfileDevDesc"),
      items: ["🔑 Development Certificate", "📋 Development Provisioning Profile", t("docsProfileItemNeedDevice")],
      note: t("docsProfileDevNote"),
    },
    {
      name: "preview", color: "text-orange-300", badge: "internal",
      badgeStyle: { background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.3)" },
      badgeText: "text-orange-400",
      desc: t("docsProfilePreviewDesc"),
      items: ["🔑 Distribution Certificate (Ad Hoc)", "📋 Ad Hoc Provisioning Profile", t("docsProfileItemNeedDevice")],
      note: t("docsProfilePreviewNote"),
    },
  ];

  const deviceSteps = [
    { step: "1", desc: t("docsDeviceStep1") },
    { step: "2", desc: t("docsDeviceStep2") },
    { step: "3", desc: t("docsDeviceStep3") },
    { step: "4", desc: t("docsDeviceStep4") },
    { step: "5", desc: t("docsDeviceStep5") },
  ];

  const statusItems = [
    { status: "PENDING", color: "text-yellow-400", desc: t("docsStatusPending") },
    { status: "RUNNING", color: "text-blue-400",   desc: t("docsStatusRunning") },
    { status: "SUCCESS", color: "text-green-400",  desc: t("docsStatusSuccess") },
    { status: "FAILED",  color: "text-red-400",    desc: t("docsStatusFailed") },
  ];

  return (
    <div className="min-h-screen relative text-white" style={{ backgroundColor: "var(--dash-bg)" }}>

      {/* Top nav */}
      <header className="fixed top-0 left-0 right-0 z-30" style={HEADER_STYLE}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/assets/images/logo-full.png" alt="Logo" className="h-10 w-auto" style={{ filter: "brightness(0) invert(1)" }} />
            <span className="text-xs font-semibold text-white/35 tracking-widest uppercase">docs</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link
              href="/login"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-accent/80 hover:bg-accent text-accent-contrast transition"
              style={{ border: "1px solid rgba(255,255,255,0.15)" }}
            >
              {t("docsConsoleBtn")}
            </Link>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-10 flex gap-8">

        <aside className="hidden lg:block w-48 flex-shrink-0">
          <div className="sticky top-24">
            <SidebarNav activeId={activeId} navGroups={navGroups} />
          </div>
        </aside>

        <div className="flex-1 min-w-0">

          {/* Hero */}
          <div className="mb-10">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-accent-light text-xs font-semibold mb-4"
              style={{ background: "rgb(var(--tw-accent) / 0.15)", border: "1px solid rgb(var(--tw-accent) / 0.35)" }}
            >
              CLI v1.0
            </div>
            <h1 className="text-4xl font-extrabold text-white mb-4 leading-tight">ant-go CLI</h1>
            <p className="text-lg text-white/55 max-w-xl">{t("docsHeroDesc")}</p>
          </div>

          {/* Install */}
          <Section id="install" title={t("docsInstallTitle")}>
            <p className="text-white/55 text-sm mb-4">
              {t("docsInstallDesc").split("ant-go").map((part, i, arr) =>
                i < arr.length - 1
                  ? <span key={i}>{part}<Code>ant-go</Code></span>
                  : <span key={i}>{part}</span>
              )}
            </p>
            <Terminal title="Terminal">
              <div>
                <span className="text-white/30 select-none">$ </span>
                <span className="text-green-400">npm</span>
                <span className="text-gray-200"> install -g ant-go</span>
              </div>
            </Terminal>
            <p className="text-white/55 text-sm mt-6 mb-4">{t("docsInstallVerify")}</p>
            <Terminal title="Terminal">
              <div>
                <span className="text-white/30 select-none">$ </span>
                <span className="text-white">ant --version</span>
              </div>
              <div className="text-white/40 mt-1">0.1.0</div>
            </Terminal>
          </Section>

          {/* Build */}
          <Section id="build" title={t("docsBuildTitle")}>
            <p className="text-white/55 text-sm mb-4">{t("docsBuildDesc")}</p>
            <Terminal title="Terminal — build iOS production">
              <div>
                <span className="text-white/30 select-none">$ </span>
                <span className="text-yellow-300">ant</span>
                <span className="text-white"> build</span>
                <span className="text-blue-400"> --platform</span>
                <span className="text-orange-300"> ios</span>
              </div>
              <div className="mt-3 space-y-0.5 text-accent-light">
                <div>{"========================================"}</div>
                <div>{"== Ant Go CLI : v0.1.0                =="}</div>
                <div>{"== Project ID : my-app-prod           =="}</div>
                <div>{"== Bundle ID  : com.myorg.myapp       =="}</div>
                <div>{"== Profile    : production  (store)   =="}</div>
                <div>{"========================================"}</div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="text-green-400">✔ Job: <span className="text-accent-light">abc123xyz</span></div>
                <div className="text-green-400">✔ ASC API Key (cached): <span className="text-accent-light">XXXXXXXXXX</span></div>
                <div className="text-green-400">✔ Distribution Certificate (reused): CERTID</div>
                <div className="text-green-400">✔ App Store Provisioning Profile OK</div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="text-green-400">✔ Project packed: <span className="text-white">12.4 MB</span></div>
                <div className="text-green-400">✔ Upload ios.tar.gz done</div>
                <div className="text-green-400">✔ Upload credentials.json done</div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="text-white font-semibold">Build sent to server!</div>
                <div className="mt-1 text-white/40">{"   "}Track progress:</div>
                <div className="text-blue-400 underline">{"   "}https://antgo.work/account/app/MyApp/builds/abc123xyz</div>
              </div>
            </Terminal>

            <p className="text-white/55 text-sm mt-8 mb-3">{t("docsBuildProfileDesc").split("ant.json").map((part, i, arr) =>
              i < arr.length - 1 ? <span key={i}>{part}<Code>ant.json</Code></span> : <span key={i}>{part}</span>
            )}</p>
            <Terminal title="Terminal">
              <div>
                <span className="text-white/30 select-none">$ </span>
                <span className="text-yellow-300">ant</span>
                <span className="text-white"> build</span>
                <span className="text-blue-400"> --platform</span>
                <span className="text-orange-300"> ios</span>
                <span className="text-blue-400"> --profile</span>
                <span className="text-orange-300"> development</span>
              </div>
            </Terminal>

            <p className="text-white/55 text-sm mt-6 mb-3">{t("docsBuildSubmitDesc")}</p>
            <Terminal title="Terminal">
              <div>
                <span className="text-white/30 select-none">$ </span>
                <span className="text-yellow-300">ant</span>
                <span className="text-white"> build</span>
                <span className="text-blue-400"> --platform</span>
                <span className="text-orange-300"> ios</span>
                <span className="text-blue-400"> --auto-submit</span>
              </div>
              <div className="mt-2 space-y-1 text-sm">
                <div className="text-white/30">...</div>
                <div className="text-white font-semibold">Build sent to server!</div>
                <div className="text-white/40">{"   "}✈{"  "}Auto Submit: on</div>
              </div>
            </Terminal>
            <p className="text-white/30 text-xs mt-2">{t("docsBuildAutoSubmitNote")}</p>

            <p className="text-white/55 text-sm mt-6 mb-3">{t("docsBuildReauthDesc")}</p>
            <Terminal title="Terminal">
              <div>
                <span className="text-white/30 select-none">$ </span>
                <span className="text-yellow-300">ant</span>
                <span className="text-white"> build</span>
                <span className="text-blue-400"> --platform</span>
                <span className="text-orange-300"> ios</span>
                <span className="text-blue-400"> --reauth</span>
              </div>
            </Terminal>

            <div className="mt-6 rounded-xl p-4" style={GLASS}>
              <p className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-3">{t("docsOptions")}</p>
              <Option flag="--platform &lt;platform&gt;" desc={t("docsBuildOptPlatform")} />
              <Option flag="--profile &lt;profile&gt;"   desc={t("docsBuildOptProfile")} />
              <Option flag="--project &lt;path&gt;"      desc={t("docsBuildOptProject")} />
              <Option flag="--reauth"                    desc={t("docsBuildOptReauth")} />
              <Option flag="--refresh-profile"           desc={t("docsBuildOptRefreshProfile")} />
              <Option flag="--auto-submit"               desc={t("docsBuildOptAutoSubmit")} />
            </div>
          </Section>

          {/* Status */}
          <Section id="status" title={t("docsStatusTitle")}>
            <p className="text-white/55 text-sm mb-4">{t("docsStatusDesc")}</p>
            <Terminal title="Terminal — ant status">
              <div>
                <span className="text-white/30 select-none">$ </span>
                <span className="text-yellow-300">ant</span>
                <span className="text-white"> status</span>
                <span className="text-orange-300"> abc123xyz</span>
              </div>
              <div className="mt-3 space-y-1 text-white/40">
                <div>{"  "}Job ID:   <span className="text-white font-bold">abc123xyz</span></div>
                <div>{"  "}Status:   <span className="text-green-400 font-bold">SUCCESS</span></div>
                <div>{"  "}Created:  <span>4/27/2026, 10:30:00 AM</span></div>
                <div>{"  "}Updated:  <span>4/27/2026, 10:45:12 AM</span></div>
                <div>{"  "}IPA:      <span className="text-blue-400 underline">https://storage.googleapis.com/.../MyApp.ipa</span></div>
              </div>
            </Terminal>

            <div className="mt-5 rounded-xl p-4" style={GLASS}>
              <p className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-3">{t("docsStatusHeader")}</p>
              <div className="space-y-2">
                {statusItems.map((s) => (
                  <div key={s.status} className="flex items-center gap-3 py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    <span className={`text-xs font-bold font-mono w-24 ${s.color}`}>{s.status}</span>
                    <span className="text-white/50 text-sm">{s.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* Add device */}
          <Section id="add-device" title={t("docsDeviceTitle")}>
            <div className="mb-5 p-4 rounded-xl" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.25)" }}>
              <p className="text-sm text-white font-semibold mb-1">{t("docsDeviceIOSOnly")}</p>
              <p className="text-sm text-white/55">{t("docsDeviceIOSOnlyDesc")}</p>
            </div>

            <p className="text-white/55 text-sm mb-5">{t("docsDeviceInternalDesc")}</p>

            <Terminal title="Terminal — device enrollment">
              <div>
                <span className="text-white/30 select-none">$ </span>
                <span className="text-yellow-300">ant</span>
                <span className="text-white"> build</span>
                <span className="text-blue-400"> --platform</span>
                <span className="text-orange-300"> ios</span>
                <span className="text-blue-400"> --profile</span>
                <span className="text-orange-300"> development</span>
              </div>
              <div className="mt-3 space-y-1">
                <div className="text-white/30">...</div>
                <div className="text-accent-light">📱{"  "}Device enrollment</div>
                <div className="text-white/30">{"   "}iPhone will send UDID after scanning QR below</div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="text-white font-semibold">Scan QR with iPhone Camera:</div>
                <div className="mt-1 text-white/30 font-mono text-xs leading-4">
                  {"  ▄▄▄▄▄▄▄ ▄  ▄▄  ▄▄▄▄▄▄▄"}<br />
                  {"  █ ▄▄▄ █ ▀▄▄▀▄ █ ▄▄▄ █"}<br />
                  {"  █ ███ █ ██▀▀█ █ ███ █"}<br />
                  {"  ▀▀▀▀▀▀▀ ▀ ▀ ▀ ▀▀▀▀▀▀▀"}
                </div>
                <div className="mt-1 text-white/30">Or open: <span className="text-accent-light underline">https://antgo.work/enroll/xxxxxxxx</span></div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="text-yellow-400">Waiting for iPhone...</div>
                <div className="text-green-400">✔ Device confirmed: iPhone 15 Pro{"  "}(00008110-001234ABCDEF)</div>
              </div>
              <div className="mt-2 space-y-1">
                <div className="text-white/40">{"? "}Device name: <span className="text-white">My iPhone</span></div>
                <div className="text-green-400">✔ Device registered: My iPhone</div>
              </div>
            </Terminal>

            <div className="mt-5 rounded-xl p-4 space-y-3" style={GLASS}>
              <p className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-1">{t("docsDeviceFlowHeader")}</p>
              {deviceSteps.map((item) => (
                <div key={item.step} className="flex gap-3">
                  <span
                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-accent-light text-xs font-bold"
                    style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.4)" }}
                  >
                    {item.step}
                  </span>
                  <p className="text-sm text-white/55 pt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-white/25 text-xs mt-4">{t("docsDeviceNote")}</p>
          </Section>

          {/* Build Profiles */}
          <Section id="ant-json" title={t("docsProfilesTitle")}>
            <p className="text-white/55 text-sm mb-4">{t("docsProfilesDesc").split("ant build").map((part, i, arr) =>
              i < arr.length - 1 ? <span key={i}>{part}<Code>ant build</Code></span> : <span key={i}>{part}</span>
            )}</p>
            <Terminal title="ant.json">
              <div className="text-white/30">{"{"}</div>
              <div className="ml-4 text-blue-300">{'"build"'}<span className="text-gray-300">: {"{"}</span></div>
              <div className="ml-8">
                <div className="text-green-300">{'"production"'}<span className="text-gray-300">: {"{"}</span></div>
                <div className="ml-4"><span className="text-orange-300">{'"distribution"'}</span><span className="text-gray-300">: </span><span className="text-yellow-300">{'"store"'}</span></div>
                <div className="text-gray-300">{"}"}<span className="text-white/20">,</span></div>
              </div>
              <div className="ml-8 mt-1">
                <div className="text-green-300">{'"development"'}<span className="text-gray-300">: {"{"}</span></div>
                <div className="ml-4"><span className="text-orange-300">{'"developmentClient"'}</span><span className="text-gray-300">: </span><span className="text-blue-400">true</span><span className="text-white/20">,</span></div>
                <div className="ml-4"><span className="text-orange-300">{'"distribution"'}</span><span className="text-gray-300">: </span><span className="text-yellow-300">{'"internal"'}</span></div>
                <div className="text-gray-300">{"}"}<span className="text-white/20">,</span></div>
              </div>
              <div className="ml-8 mt-1">
                <div className="text-green-300">{'"preview"'}<span className="text-gray-300">: {"{"}</span></div>
                <div className="ml-4"><span className="text-orange-300">{'"distribution"'}</span><span className="text-gray-300">: </span><span className="text-yellow-300">{'"internal"'}</span></div>
                <div className="text-gray-300">{"}"}</div>
              </div>
              <div className="ml-4 text-gray-300">{"}"}</div>
              <div className="text-white/30">{"}"}</div>
            </Terminal>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {profiles.map((p) => (
                <div key={p.name} className="rounded-xl p-4 flex flex-col gap-2" style={GLASS}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`${p.color} font-bold font-mono text-sm`}>{p.name}</span>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${p.badgeText}`} style={p.badgeStyle}>{p.badge}</span>
                  </div>
                  <p className="text-xs text-white/50 leading-5">{p.desc}</p>
                  <ul className="mt-1 space-y-1 text-xs text-white/35">
                    {p.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                  <div className="mt-auto pt-3 text-xs text-white/25" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    {p.note}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl p-4" style={GLASS}>
              <p className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-3">{t("docsProfilesFieldsHeader")}</p>
              <Option flag="distribution"      desc={t("docsProfilesFieldDist")} />
              <Option flag="developmentClient" desc={t("docsProfilesFieldDevClient")} />
            </div>
          </Section>

          {/* Auth Login */}
          <Section id="auth-login" title={t("docsLoginTitle")}>
            <p className="text-white/55 text-sm mb-4">{t("docsLoginDesc").split("build").map((part, i, arr) =>
              i < arr.length - 1 ? <span key={i}>{part}<Code>build</Code></span> : <span key={i}>{part}</span>
            )}</p>

            <p className="text-white/55 text-sm mb-3">{t("docsLoginEmailDesc")}</p>
            <Terminal title="Terminal — ant auth login">
              <div>
                <span className="text-white/30 select-none">$ </span>
                <span className="text-yellow-300">ant</span>
                <span className="text-white"> auth login</span>
              </div>
              <div className="mt-3 space-y-1">
                <div className="text-white/40">{"? "}Email: <span className="text-white">dev@example.com</span></div>
                <div className="text-white/40">{"? "}Password: <span className="text-white">••••••••</span></div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="text-green-400">✔ Logged in!</div>
                <div className="text-white/40">{"  "}Name:   <span className="text-white">Nguyen Van A</span></div>
                <div className="text-white/40">{"  "}Email:  <span className="text-white">dev@example.com</span></div>
                <div className="text-white/40">{"  "}Plan:   <span className="text-accent-light">Pro</span></div>
                <div className="text-white/40">{"  "}Builds: <span className="text-white">47 / unlimited</span></div>
              </div>
            </Terminal>

            <p className="text-white/55 text-sm mt-6 mb-3">{t("docsLoginBrowserDesc")}</p>
            <Terminal title="Terminal — browser login">
              <div>
                <span className="text-white/30 select-none">$ </span>
                <span className="text-yellow-300">ant</span>
                <span className="text-white"> auth login</span>
                <span className="text-blue-400"> --browser</span>
              </div>
              <div className="mt-3 space-y-1">
                <div className="text-white/40">Opening browser...</div>
                <div className="text-blue-400 underline">{"  "}https://antgo.work/auth/cli?port=9005&state=xxxxxxxx</div>
                <div className="text-white/40 mt-2">Waiting for browser confirmation...</div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="text-green-400">✔ Logged in!</div>
                <div className="text-white/40">{"  "}Hi, <span className="text-white">Nguyen Van A</span></div>
              </div>
            </Terminal>

            <div className="mt-6 rounded-xl p-4" style={GLASS}>
              <p className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-3">{t("docsOptions")}</p>
              <Option flag="--browser" desc={t("docsLoginOptBrowser")} />
            </div>
          </Section>

          {/* Auth Logout */}
          <Section id="auth-logout" title={t("docsLogoutTitle")}>
            <p className="text-white/55 text-sm mb-4">{t("docsLogoutDesc")}</p>
            <Terminal title="Terminal — ant auth logout">
              <div>
                <span className="text-white/30 select-none">$ </span>
                <span className="text-yellow-300">ant</span>
                <span className="text-white"> auth logout</span>
              </div>
              <div className="mt-3 space-y-1">
                <div className="text-green-400">✔ Logged out.</div>
              </div>
            </Terminal>
          </Section>

          {/* Auth Whoami */}
          <Section id="auth-whoami" title={t("docsWhoamiTitle")}>
            <p className="text-white/55 text-sm mb-4">{t("docsWhoamiDesc")}</p>
            <Terminal title="Terminal — ant auth whoami">
              <div>
                <span className="text-white/30 select-none">$ </span>
                <span className="text-yellow-300">ant</span>
                <span className="text-white"> auth whoami</span>
              </div>
              <div className="mt-3 space-y-1">
                <div className="text-white/40">{"  "}Name:    <span className="text-white">Nguyen Van A</span></div>
                <div className="text-white/40">{"  "}Email:   <span className="text-white">dev@example.com</span></div>
                <div className="text-white/40">{"  "}Plan:    <span className="text-accent-light">free</span></div>
                <div className="text-white/40">{"  "}Credits: <span className="text-white">12/15</span></div>
                <div className="text-white/40">{"  "}Expires: <span className="text-yellow-300">2026-05-01 10:30:00</span></div>
              </div>
            </Terminal>
            <p className="text-white/25 text-xs mt-4">{t("docsWhoamiNote").split("ant auth login").map((part, i, arr) =>
              i < arr.length - 1 ? <span key={i}>{part}<Code>ant auth login</Code></span> : <span key={i}>{part}</span>
            )}</p>
          </Section>

          {/* Language */}
          <Section id="set-lang" title={t("docsLangTitle")}>
            <p className="text-white/55 text-sm mb-4">{t("docsLangDesc")}</p>
            <Terminal title="Terminal — ant set lang">
              <div>
                <span className="text-white/30 select-none">$ </span>
                <span className="text-yellow-300">ant</span>
                <span className="text-white"> set lang</span>
                <span className="text-orange-300"> vi</span>
              </div>
              <div className="mt-3 space-y-1">
                <div className="text-green-400">✔ Language set to: <span className="text-white">vi</span></div>
              </div>
            </Terminal>

            <Terminal title="Terminal — switch to English">
              <div>
                <span className="text-white/30 select-none">$ </span>
                <span className="text-yellow-300">ant</span>
                <span className="text-white"> set lang</span>
                <span className="text-orange-300"> en</span>
              </div>
              <div className="mt-3 space-y-1">
                <div className="text-green-400">✔ Language set to: <span className="text-white">en</span></div>
              </div>
            </Terminal>

            <div className="mt-5 rounded-xl p-4" style={GLASS}>
              <p className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-3">{t("docsLangValidHeader")}</p>
              <Option flag="vi" desc={t("docsLangVi")} />
              <Option flag="en" desc={t("docsLangEn")} />
            </div>
          </Section>

          {/* Footer */}
          <div className="pt-6 mt-2 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <p className="text-xs text-white/25">{t("docsFooter")}</p>
            <Link href="/login" className="text-xs text-accent hover:text-accent-light transition">
              {t("docsFooterConsole")}
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
