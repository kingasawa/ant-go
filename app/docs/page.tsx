"use client";
import Link from "next/link";
import React, { useState, useRef } from "react";

/* ─── Glass style constants ─────────────────────────────────────────────────── */
const GLASS = {
  backdropFilter: "blur(18px) saturate(160%)",
  WebkitBackdropFilter: "blur(18px) saturate(160%)",
  background: "rgba(255,255,255,0.09)",
  border: "1px solid rgba(255,255,255,0.16)",
} satisfies React.CSSProperties;

const GLASS_STRONG = {
  backdropFilter: "blur(22px) saturate(160%)",
  WebkitBackdropFilter: "blur(22px) saturate(160%)",
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.2)",
} satisfies React.CSSProperties;

/* ─── Apple-style Terminal Window ───────────────────────────────────────────── */
function Terminal({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden shadow-2xl shadow-black/50" style={{ background: "rgba(20,20,20,0.85)", border: "1px solid rgba(255,255,255,0.1)" }}>
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

/* ─── Inline code ────────────────────────────────────────────────────────────── */
function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded-md text-accent-light font-mono text-[13px]"
      style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}>
      {children}
    </code>
  );
}

/* ─── Section — each has its own glass box ───────────────────────────────────── */
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 mb-6">
      <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-3 px-1">
        <span className="w-1 h-6 bg-accent-light rounded-full inline-block" />
        {title}
      </h2>
      <div className="rounded-2xl p-6" style={{ ...GLASS, boxShadow: "0 4px 24px rgba(0,0,0,0.35)" }}>
        {children}
      </div>
    </section>
  );
}

/* ─── Option row ─────────────────────────────────────────────────────────────── */
function Option({ flag, desc }: { flag: string; desc: string }) {
  return (
    <div className="flex gap-4 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
      <Code>{flag}</Code>
      <span className="text-white/50 text-sm">{desc}</span>
    </div>
  );
}

/* ─── Sidebar nav items ──────────────────────────────────────────────────────── */
const navItems = [
  { id: "install",    label: "Installation" },
  { id: "build",      label: "Command" },
  { id: "status",     label: "Status" },
  { id: "add-device", label: "Add device" },
  { id: "ant-json",   label: "Profiles" },
];

/* ─── Sidebar Nav with sliding glass hover ───────────────────────────────────── */
function SidebarNav() {
  const [highlight, setHighlight] = useState<{ top: number; height: number } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const itemRect = e.currentTarget.getBoundingClientRect();
    setHighlight({ top: itemRect.top - containerRect.top, height: itemRect.height });
    setActiveId(id);
  };

  const handleMouseLeave = () => {
    setHighlight(null);
    setActiveId(null);
  };

  return (
    <div ref={containerRef} className="relative" onMouseLeave={handleMouseLeave}>
      {/* Sliding glass pill */}
      <div
        className="absolute left-0 right-0 rounded-lg pointer-events-none"
        style={{
          top: highlight?.top ?? 0,
          height: highlight?.height ?? 36,
          opacity: highlight ? 1 : 0,
          backdropFilter: "blur(14px) saturate(160%)",
          WebkitBackdropFilter: "blur(14px) saturate(160%)",
          background: "rgba(255,255,255,0.09)",
          border: "1px solid rgba(255,255,255,0.16)",
          transition: "top 0.18s cubic-bezier(0.4,0,0.2,1), opacity 0.15s ease",
        }}
      />

      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35 mb-2 px-3">
        Generals
      </p>
      {navItems.map((n) => (
        <a
          key={n.id}
          href={`#${n.id}`}
          className="relative z-10 block text-sm py-2 px-3 rounded-lg"
          style={{
            color: activeId === n.id ? "rgb(var(--tw-accent-light))" : "rgba(255,255,255,0.55)",
            transition: "color 0.15s",
            // boxShadow: activeId === n.id ? "inset 0px -2px 20px rgba(0, 0, 0, 0.3), inset 0px 10px 20px rgba(255, 255, 255, 0.5)" : "",
          }}
          onMouseEnter={(e) => handleMouseEnter(e, n.id)}
        >
          {n.label}
        </a>
      ))}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */
export default function DocPage() {
  return (
    <div className="min-h-screen relative text-white">

      {/* Fixed grayscale background */}
      <div
        className="fixed inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/assets/images/bgimg1.jpg')",
          filter: "grayscale(1) brightness(0.45)",
        }}
      />
      {/* Dark overlay */}
      <div className="fixed inset-0 bg-black/50" />

      {/* ── Sticky top nav ── */}
      <header
        className="sticky top-0 z-30"
        style={{ ...GLASS_STRONG, borderLeft: "none", borderRight: "none", borderTop: "none" }}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/assets/images/logo-full.png"
              alt="Logo"
              className="h-10 w-auto"
              style={{ filter: "brightness(0) invert(1)" }}
            />
            <span className="text-xs font-semibold text-white/35 tracking-widest uppercase">docs</span>
          </Link>
          <Link
            href="/login"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-accent/80 hover:bg-accent text-accent-contrast transition"
            style={{ border: "1px solid rgba(255,255,255,0.15)" }}
          >
            Console →
          </Link>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="relative max-w-6xl mx-auto px-6 py-10 flex gap-8">

        {/* Sidebar — glass panel, hover effect per item */}
        <aside className="hidden lg:block w-48 flex-shrink-0">
          <div className="sticky top-24 rounded-2xl p-3" style={GLASS}>
            <SidebarNav />
          </div>
        </aside>

        {/* Main content — each section in its own glass box */}
        <div className="flex-1 min-w-0">

          {/* Hero — free, no glass box */}
          <div className="mb-10">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-accent-light text-xs font-semibold mb-4"
              style={{ background: "rgb(var(--tw-accent) / 0.15)", border: "1px solid rgb(var(--tw-accent) / 0.35)" }}
            >
              CLI v1.0
            </div>
            <h1 className="text-4xl font-extrabold text-white mb-4 leading-tight">ant-go CLI</h1>
            <p className="text-lg text-white/55 max-w-xl">
              Build app iOS và Android nhanh chóng chỉ với một lệnh — không cần cấu hình CI/CD phức tạp.
            </p>
          </div>

          {/* ── Cài đặt ── */}
          <Section id="install" title="Cài đặt">
            <p className="text-white/55 text-sm mb-4">
              Cài đặt <Code>ant-go</Code> globally qua npm để dùng như một lệnh hệ thống:
            </p>
            <Terminal title="Terminal">
              <div>
                <span className="text-white/30 select-none">$ </span>
                <span className="text-green-400">npm</span>
                <span className="text-gray-200"> install -g ant-go</span>
              </div>
            </Terminal>
            <p className="text-white/55 text-sm mt-6 mb-4">Kiểm tra cài đặt thành công:</p>
            <Terminal title="Terminal">
              <div>
                <span className="text-white/30 select-none">$ </span>
                <span className="text-white">ant-go --version</span>
              </div>
              <div className="text-white/40 mt-1">1.0.0</div>
            </Terminal>
          </Section>

          {/* ── build ── */}
          <Section id="build" title="Build Command">
            <p className="text-white/55 text-sm mb-4">
              Lệnh chính — nén project, upload lên build server và gửi yêu cầu build theo platform đã chọn. Sau khi submit, theo dõi tiến trình tại web console.
            </p>
            <Terminal title="Terminal — build iOS production">
              <div>
                <span className="text-white/30 select-none">$ </span>
                <span className="text-yellow-300">ant-go</span>
                <span className="text-white"> build</span>
                <span className="text-blue-400"> --platform</span>
                <span className="text-orange-300"> ios</span>
              </div>
              <div className="mt-3 space-y-0.5 text-accent-light">
                <div>{"========================================"}</div>
                <div>{"== Ant Go CLI : v1.0                  =="}</div>
                <div>{"== Project ID : my-app-prod           =="}</div>
                <div>{"== Bundle ID  : com.myorg.myapp       =="}</div>
                <div>{"== Profile    : production  (store)   =="}</div>
                <div>{"========================================"}</div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="text-white/40">{"? "}Đăng nhập tài khoản Apple Developer</div>
                <div className="text-green-400">{"  ❯ "}Đăng nhập tài khoản <span className="text-white">dev@example.com</span> (TEAMID123)</div>
                <div className="mt-1 text-green-400">✔ Đăng nhập thành công</div>
                <div className="text-green-400">✔ Distribution Certificate (reused): CERTID</div>
                <div className="text-green-400">✔ App Store Provisioning Profile OK</div>
                <div className="text-green-400">✔ Credentials đã cache tại: <span className="text-white/40">~/.ant-go/creds-production.json</span></div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="text-green-400">✔ Job tạo thành công: <span className="text-accent-light">abc123xyz</span></div>
                <div className="text-green-400">✔ Project đã nén: <span className="text-white">12.4 MB</span></div>
                <div className="text-green-400">✔ Upload ios.tar.gz hoàn tất</div>
                <div className="text-green-400">✔ Upload credentials.json hoàn tất</div>
                <div className="text-green-400">✔ Đã kiểm tra đầy đủ files</div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="text-white font-semibold">Build đã được gửi lên server!</div>
                <div className="mt-1 text-white/40">{"   "}Theo dõi tiến trình tại:</div>
                <div className="text-blue-400 underline">{"   "}https://ant-go.app/account/app/MyApp/builds/abc123xyz</div>
              </div>
            </Terminal>

            <p className="text-white/55 text-sm mt-8 mb-3">Dùng build profile từ <Code>ant.json</Code>:</p>
            <Terminal title="Terminal">
              <div>
                <span className="text-white/30 select-none">$ </span>
                <span className="text-yellow-300">ant-go</span>
                <span className="text-white"> build</span>
                <span className="text-blue-400"> --platform</span>
                <span className="text-orange-300"> ios</span>
                <span className="text-blue-400"> --profile</span>
                <span className="text-orange-300"> development</span>
              </div>
            </Terminal>

            <p className="text-white/55 text-sm mt-6 mb-3">Tự động submit lên TestFlight sau khi build xong:</p>
            <Terminal title="Terminal">
              <div>
                <span className="text-white/30 select-none">$ </span>
                <span className="text-yellow-300">ant-go</span>
                <span className="text-white"> build</span>
                <span className="text-blue-400"> --platform</span>
                <span className="text-orange-300"> ios</span>
                <span className="text-blue-400"> --auto-submit</span>
              </div>
              <div className="mt-2 space-y-1 text-sm">
                <div className="text-white/30">...</div>
                <div className="text-white font-semibold">Build đã được gửi lên server!</div>
                <div className="text-white/40">{"   "}✈{"  "}Auto Submit: bật — IPA sẽ tự động được gửi lên TestFlight sau khi build xong.</div>
              </div>
            </Terminal>

            <p className="text-white/55 text-sm mt-6 mb-3">Force đăng nhập lại Apple Developer (bỏ cache):</p>
            <Terminal title="Terminal">
              <div>
                <span className="text-white/30 select-none">$ </span>
                <span className="text-yellow-300">ant-go</span>
                <span className="text-white"> build</span>
                <span className="text-blue-400"> --platform</span>
                <span className="text-orange-300"> ios</span>
                <span className="text-blue-400"> --reauth</span>
              </div>
            </Terminal>
            <p className="text-white/30 text-xs mt-2">
              Chỉ dùng được với profile có <Code>distribution: store</Code>. Dùng với <Code>distribution: internal</Code> sẽ báo lỗi.
            </p>

            <div className="mt-6 rounded-xl p-4" style={GLASS}>
              <p className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-3">Options</p>
              <Option flag="--platform &lt;platform&gt;" desc="Nền tảng build: ios hoặc android" />
              <Option flag="--profile &lt;profile&gt;"   desc="Build profile trong ant.json (mặc định: production)" />
              <Option flag="--project &lt;path&gt;"      desc="Override đường dẫn project" />
              <Option flag="--reauth"              desc="Đăng nhập lại Apple Developer, bỏ qua session cache" />
              <Option flag="--refresh-profile"     desc="Tạo lại Provisioning Profile (khi thay đổi Capabilities)" />
              <Option flag="--auto-submit"         desc="Tự động submit IPA lên TestFlight sau khi build xong" />
            </div>
          </Section>

          {/* ── status ── */}
          <Section id="status" title="Build Status">
            <p className="text-white/55 text-sm mb-4">Xem trạng thái của một build job theo Job ID.</p>
            <Terminal title="Terminal — ant-go status">
              <div>
                <span className="text-white/30 select-none">$ </span>
                <span className="text-yellow-300">ant-go</span>
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
              <p className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-3">Trạng thái</p>
              <div className="space-y-2">
                {[
                  { status: "PENDING", color: "text-yellow-400", desc: "Đang chờ build server nhận job" },
                  { status: "RUNNING", color: "text-blue-400",   desc: "Build server đang xử lý" },
                  { status: "SUCCESS", color: "text-green-400",  desc: "Build thành công, IPA đã sẵn sàng" },
                  { status: "FAILED",  color: "text-red-400",    desc: "Build thất bại, xem logs để biết chi tiết" },
                ].map((s) => (
                  <div key={s.status} className="flex items-center gap-3 py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    <span className={`text-xs font-bold font-mono w-24 ${s.color}`}>{s.status}</span>
                    <span className="text-white/50 text-sm">{s.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* ── add device ── */}
          <Section id="add-device" title="Add device">
            <div className="mb-5 p-4 rounded-xl" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.25)" }}>
              <p className="text-sm text-white font-semibold mb-1">Chỉ áp dụng cho iOS</p>
              <p className="text-sm text-white/55">
                Android không cần đăng ký device — file <Code>.apk</Code> có thể cài trực tiếp trên bất kỳ thiết bị nào. iOS thì khác: Apple bắt buộc mọi thiết bị chạy app ngoài App Store phải được đăng ký UDID trước trong Apple Developer Portal.
              </p>
            </div>

            <p className="text-white/55 text-sm mb-5">
              Khi build với <Code>distribution: internal</Code>, iOS app được ký bằng <strong className="text-white/80">Development / Ad Hoc Provisioning Profile</strong>. Profile này chứa danh sách UDID các thiết bị được phép cài. Nếu UDID của thiết bị không có trong profile, iOS sẽ từ chối cài app.
            </p>

            <Terminal title="Terminal — device enrollment">
              <div>
                <span className="text-white/30 select-none">$ </span>
                <span className="text-yellow-300">ant-go</span>
                <span className="text-white"> build</span>
                <span className="text-blue-400"> --platform</span>
                <span className="text-orange-300"> ios</span>
                <span className="text-blue-400"> --profile</span>
                <span className="text-orange-300"> development</span>
              </div>
              <div className="mt-3 space-y-1">
                <div className="text-white/30">...</div>
                <div className="text-accent-light">📱{"  "}Đăng ký device để cài app development</div>
                <div className="text-white/30">{"   "}iPhone sẽ tự động gửi UDID khi quét mã QR bên dưới</div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="text-white font-semibold">Quét QR code bằng Camera app trên iPhone:</div>
                <div className="mt-1 text-white/30 font-mono text-xs leading-4">
                  {"  ▄▄▄▄▄▄▄ ▄  ▄▄  ▄▄▄▄▄▄▄"}<br />
                  {"  █ ▄▄▄ █ ▀▄▄▀▄ █ ▄▄▄ █"}<br />
                  {"  █ ███ █ ██▀▀█ █ ███ █"}<br />
                  {"  ▀▀▀▀▀▀▀ ▀ ▀ ▀ ▀▀▀▀▀▀▀"}
                </div>
                <div className="mt-1 text-white/30">Hoặc mở URL: <span className="text-accent-light underline">https://ant-go.app/enroll/xxxxxxxx</span></div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="text-yellow-400">Đang chờ iPhone xác nhận...</div>
                <div className="text-white/30">⠿ Chờ iPhone quét QR... (còn 9 phút)</div>
                <div className="text-green-400">✔ Device đã xác nhận: iPhone 15 Pro{"  "}(00008110-001234ABCDEF)</div>
              </div>
              <div className="mt-2 space-y-1">
                <div className="text-white/40">{"? "}Tên device: <span className="text-white">My iPhone</span></div>
                <div className="text-green-400">✔ Device đã đăng ký: My iPhone</div>
              </div>
            </Terminal>

            <div className="mt-5 rounded-xl p-4 space-y-3" style={GLASS}>
              <p className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-1">Quy trình</p>
              {[
                { step: "1", desc: "CLI gọi server tạo enrollment session — sinh URL + token." },
                { step: "2", desc: "CLI hiển thị QR code. Quét bằng Camera app (không cần app riêng)." },
                { step: "3", desc: "iPhone tải .mobileconfig → nhắc cài profile → gửi UDID về server." },
                { step: "4", desc: "CLI nhận UDID, kiểm tra và đăng ký device trên Apple Developer Portal." },
                { step: "5", desc: "Tiếp tục build với Provisioning Profile đã bao gồm device mới." },
              ].map((item) => (
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
            <p className="text-white/25 text-xs mt-4">
              Nếu UDID đã được đăng ký trước đó trên Apple Developer Portal, bước đăng ký device sẽ bị bỏ qua.
            </p>
          </Section>

          {/* ── ant.json ── */}
          <Section id="ant-json" title="Build Profiles">
            <p className="text-white/55 text-sm mb-4">
              File cấu hình build profiles đặt ở root của project. Nếu chưa có, <Code>ant-go build</Code> sẽ tự tạo với các profile mặc định.
            </p>
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
              {[
                {
                  name: "production", color: "text-green-300", badge: "store",
                  badgeStyle: { background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" },
                  badgeText: "text-green-400",
                  desc: "Submit lên App Store hoặc phân phối qua TestFlight.",
                  items: ["🔑 Distribution Certificate", "📋 App Store Provisioning Profile", "✗ Không cần add device"],
                  note: "Dùng khi release chính thức hoặc gửi beta qua TestFlight",
                },
                {
                  name: "development", color: "text-blue-300", badge: "internal",
                  badgeStyle: { background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)" },
                  badgeText: "text-blue-400",
                  desc: "Cài trực tiếp lên thiết bị để debug và develop. Hỗ trợ kết nối Metro bundler.",
                  items: ["🔑 Development Certificate", "📋 Development Provisioning Profile", "⚠ Cần add device (UDID)"],
                  note: "Dùng trong quá trình phát triển, cần debug trên thiết bị thật",
                },
                {
                  name: "preview", color: "text-orange-300", badge: "internal",
                  badgeStyle: { background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.3)" },
                  badgeText: "text-orange-400",
                  desc: "Chia sẻ bản test với QA / stakeholders mà không cần qua App Store.",
                  items: ["🔑 Distribution Certificate (Ad Hoc)", "📋 Ad Hoc Provisioning Profile", "⚠ Cần add device (UDID)"],
                  note: "Dùng khi cần share bản test nội bộ trước khi lên store",
                },
              ].map((p) => (
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
              <p className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-3">Profile fields</p>
              <Option flag="distribution"      desc='"store" → App Store/TestFlight · "internal" → cài thẳng lên device' />
              <Option flag="developmentClient" desc="true → build Expo development client, hỗ trợ kết nối Metro bundler" />
            </div>
          </Section>

          {/* Footer */}
          <div className="pt-6 mt-2 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <p className="text-xs text-white/25">ant-go CLI v1.0 · Build automation service</p>
            <Link href="/login" className="text-xs text-accent hover:text-accent-light transition">
              Mở Console →
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
