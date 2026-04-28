import Link from "next/link";

/* ─── Apple-style Terminal Window ──────────────────────────────────────────── */
function Terminal({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-700/60 shadow-2xl shadow-black/40 bg-[#1e1e1e]">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#2d2d2d] border-b border-gray-700/60">
        <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
        <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        {title && (
          <span className="ml-3 text-xs text-gray-400 font-medium tracking-wide">{title}</span>
        )}
      </div>
      {/* Content */}
      <div className="px-5 py-4 font-mono text-sm leading-7 text-gray-200 overflow-x-auto">
        {children}
      </div>
    </div>
  );
}

/* ─── Inline code ───────────────────────────────────────────────────────────── */
function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded-md bg-gray-800 border border-gray-700 text-indigo-300 font-mono text-[13px]">
      {children}
    </code>
  );
}

/* ─── Section ───────────────────────────────────────────────────────────────── */
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 mb-16">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
        <span className="w-1 h-6 bg-indigo-500 rounded-full inline-block" />
        {title}
      </h2>
      {children}
    </section>
  );
}

/* ─── Option row ────────────────────────────────────────────────────────────── */
function Option({ flag, desc }: { flag: string; desc: string }) {
  return (
    <div className="flex gap-4 py-2.5 border-b border-gray-800 last:border-0">
      <Code>{flag}</Code>
      <span className="text-gray-400 text-sm">{desc}</span>
    </div>
  );
}

/* ─── Sidebar nav ───────────────────────────────────────────────────────────── */
const navItems = [
  { id: "install",   label: "Cài đặt" },
  { id: "configure", label: "configure" },
  { id: "build",     label: "build" },
  { id: "status",    label: "status" },
  { id: "ant-json",  label: "ant.json" },
  { id: "workflow",  label: "Workflow" },
];

/* ─── Page ───────────────────────────────────────────────────────────────────── */
export default function DocPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Top nav */}
      <header className="sticky top-0 z-30 border-b border-gray-800 bg-gray-950/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-indigo-400 font-bold text-lg">
            <span>⚙️</span> ant-go
            <span className="ml-1 text-xs font-normal text-gray-500 tracking-widest uppercase">docs</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((n) => (
              <a key={n.id} href={`#${n.id}`} className="text-sm text-gray-400 hover:text-white transition">
                {n.label}
              </a>
            ))}
          </nav>
          <Link
            href="/login"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition"
          >
            Console →
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12 flex gap-10">
        {/* Sidebar */}
        <aside className="hidden lg:block w-48 flex-shrink-0">
          <div className="sticky top-24 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-3">
              Mục lục
            </p>
            {navItems.map((n) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                className="block text-sm text-gray-500 hover:text-indigo-400 py-1 transition"
              >
                {n.label}
              </a>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* Hero */}
          <div className="mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-4">
              CLI v1.0
            </div>
            <h1 className="text-4xl font-extrabold text-white mb-4 leading-tight">
              ant-go CLI
            </h1>
            <p className="text-lg text-gray-400 max-w-xl">
              Build iOS app lên App Store chỉ với một lệnh — không cần mở Xcode, không cần cấu hình CI/CD phức tạp.
            </p>
          </div>

          {/* ── Cài đặt ── */}
          <Section id="install" title="Cài đặt">
            <p className="text-gray-400 text-sm mb-4">
              Cài đặt <Code>ant-go</Code> globally qua npm để dùng như một lệnh hệ thống:
            </p>
            <Terminal title="Terminal">
              <div>
                <span className="text-gray-500 select-none">$ </span>
                <span className="text-green-400">npm</span>
                <span className="text-gray-200"> install -g ant-go</span>
              </div>
            </Terminal>

            <p className="text-gray-400 text-sm mt-6 mb-4">
              Hoặc clone repo và link local:
            </p>
            <Terminal title="Terminal">
              <div><span className="text-gray-500 select-none">$ </span><span className="text-green-400">git</span><span> clone https://github.com/your-org/ant-go</span></div>
              <div><span className="text-gray-500 select-none">$ </span><span className="text-green-400">cd</span><span> ant-go/cli</span></div>
              <div><span className="text-gray-500 select-none">$ </span><span className="text-green-400">npm</span><span> install</span></div>
              <div><span className="text-gray-500 select-none">$ </span><span className="text-green-400">npm</span><span> link</span></div>
            </Terminal>

            <p className="text-gray-400 text-sm mt-6 mb-4">Kiểm tra cài đặt thành công:</p>
            <Terminal title="Terminal">
              <div>
                <span className="text-gray-500 select-none">$ </span>
                <span className="text-white">ant-go --version</span>
              </div>
              <div className="text-gray-400 mt-1">1.0.0</div>
            </Terminal>
          </Section>

          {/* ── configure ── */}
          <Section id="configure" title="ant-go configure">
            <p className="text-gray-400 text-sm mb-4">
              Thiết lập đường dẫn iOS project. Nếu không cấu hình, mặc định sẽ dùng thư mục hiện tại khi chạy <Code>ant-go build</Code>.
            </p>
            <Terminal title="Terminal — ant-go configure">
              <div>
                <span className="text-gray-500 select-none">$ </span>
                <span className="text-yellow-300">ant-go</span>
                <span className="text-white"> configure</span>
              </div>
              <div className="mt-2 text-gray-500">
                <div>{"  "}Config:  <span className="text-gray-400">~/.ant-go/config.json</span></div>
                <div>{"  "}Server:  <span className="text-green-400">https://api.ant-go.dev</span> <span className="text-gray-600">(hardcoded)</span></div>
                <div>{"  "}Project: <span className="text-gray-500">(cwd khi chạy ant-go build)</span></div>
              </div>
            </Terminal>

            <p className="text-gray-400 text-sm mt-6 mb-3">Đặt đường dẫn project cụ thể:</p>
            <Terminal title="Terminal">
              <div>
                <span className="text-gray-500 select-none">$ </span>
                <span className="text-yellow-300">ant-go</span>
                <span className="text-white"> configure</span>
                <span className="text-blue-400"> --project</span>
                <span className="text-orange-300"> /path/to/MyApp</span>
              </div>
              <div className="mt-2 text-green-400">✔ Project: /path/to/MyApp</div>
            </Terminal>

            <div className="mt-5 border border-gray-800 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Options</p>
              <Option flag="--project <path>" desc="Đường dẫn tuyệt đối tới thư mục iOS project" />
            </div>
          </Section>

          {/* ── build ── */}
          <Section id="build" title="ant-go build">
            <p className="text-gray-400 text-sm mb-4">
              Lệnh chính — đóng gói project, upload lên server và kích hoạt quá trình build.
            </p>

            <Terminal title="Terminal — build iOS production">
              <div>
                <span className="text-gray-500 select-none">$ </span>
                <span className="text-yellow-300">ant-go</span>
                <span className="text-white"> build</span>
                <span className="text-blue-400"> --platform</span>
                <span className="text-orange-300"> ios</span>
              </div>
              <div className="mt-3 space-y-1">
                <div className="text-gray-500">⏳ Đang đăng nhập Apple Developer Portal...</div>
                <div className="text-gray-500">🔑 Certificate: MyApp Distribution (cached)</div>
                <div className="text-gray-500">📦 Provisioning Profile: AppStore_MyApp (reused)</div>
                <div className="text-gray-500">🗜  Packing project...</div>
                <div className="text-gray-500">☁️  Uploading ios.tar.gz → Firebase Storage</div>
                <div className="text-green-400">✔  Build submitted! Job ID: <span className="text-indigo-300">abc123xyz</span></div>
                <div className="mt-2 text-gray-500">⏳ Đang chờ build server xử lý...</div>
                <div className="text-gray-500">🔧 Đang khởi tạo...</div>
                <div className="text-gray-500">💎 Đang cài Ruby gems...</div>
                <div className="text-gray-500">🏗️  Đang build IPA (Fastlane)...</div>
                <div className="mt-2 text-green-400 font-semibold">✅ Build thành công!</div>
                <div className="text-blue-400 underline">https://storage.googleapis.com/.../MyApp.ipa</div>
              </div>
            </Terminal>

            <p className="text-gray-400 text-sm mt-8 mb-3">
              Dùng build profile từ <Code>ant.json</Code>:
            </p>
            <Terminal title="Terminal">
              <div>
                <span className="text-gray-500 select-none">$ </span>
                <span className="text-yellow-300">ant-go</span>
                <span className="text-white"> build</span>
                <span className="text-blue-400"> --platform</span>
                <span className="text-orange-300"> ios</span>
                <span className="text-blue-400"> --profile</span>
                <span className="text-orange-300"> development</span>
              </div>
            </Terminal>

            <p className="text-gray-400 text-sm mt-6 mb-3">
              Force đăng nhập lại Apple Developer (bỏ cache):
            </p>
            <Terminal title="Terminal">
              <div>
                <span className="text-gray-500 select-none">$ </span>
                <span className="text-yellow-300">ant-go</span>
                <span className="text-white"> build</span>
                <span className="text-blue-400"> --platform</span>
                <span className="text-orange-300"> ios</span>
                <span className="text-blue-400"> --reauth</span>
              </div>
            </Terminal>

            <p className="text-gray-400 text-sm mt-6 mb-3">
              Submit build mà không chờ kết quả (non-blocking):
            </p>
            <Terminal title="Terminal">
              <div>
                <span className="text-gray-500 select-none">$ </span>
                <span className="text-yellow-300">ant-go</span>
                <span className="text-white"> build</span>
                <span className="text-blue-400"> --platform</span>
                <span className="text-orange-300"> ios</span>
                <span className="text-blue-400"> --no-watch</span>
              </div>
              <div className="mt-2 text-green-400">✔  Build submitted! Job ID: <span className="text-indigo-300">abc123xyz</span></div>
            </Terminal>

            <div className="mt-6 border border-gray-800 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Options</p>
              <Option flag="--platform <platform>" desc="Nền tảng build: ios hoặc android" />
              <Option flag="--profile <profile>"   desc="Build profile trong ant.json (mặc định: production)" />
              <Option flag="--project <path>"      desc="Override đường dẫn project (bỏ qua cấu hình configure)" />
              <Option flag="--reauth"              desc="Đăng nhập lại Apple Developer, bỏ qua session cache" />
              <Option flag="--refresh-profile"     desc="Tạo lại Provisioning Profile (khi thay đổi Capabilities)" />
              <Option flag="--no-watch"            desc="Không theo dõi tiến trình sau khi submit" />
            </div>
          </Section>

          {/* ── status ── */}
          <Section id="status" title="ant-go status">
            <p className="text-gray-400 text-sm mb-4">
              Xem trạng thái của một build job theo Job ID. Nếu job đang chạy, CLI sẽ tự động theo dõi realtime.
            </p>
            <Terminal title="Terminal — ant-go status">
              <div>
                <span className="text-gray-500 select-none">$ </span>
                <span className="text-yellow-300">ant-go</span>
                <span className="text-white"> status</span>
                <span className="text-orange-300"> abc123xyz</span>
              </div>
              <div className="mt-3 space-y-1 text-gray-400">
                <div>{"  "}Job ID:   <span className="text-white font-bold">abc123xyz</span></div>
                <div>{"  "}Status:   <span className="text-green-400 font-bold">success</span></div>
                <div>{"  "}Created:  <span>4/27/2026, 10:30:00 AM</span></div>
                <div>{"  "}Updated:  <span>4/27/2026, 10:45:12 AM</span></div>
                <div>{"  "}IPA:      <span className="text-blue-400 underline">https://storage.googleapis.com/.../MyApp.ipa</span></div>
              </div>
            </Terminal>

            <div className="mt-5 border border-gray-800 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Trạng thái</p>
              <div className="space-y-2">
                {[
                  { status: "pending",     color: "text-yellow-400", desc: "Đang chờ build server nhận job" },
                  { status: "in_progress", color: "text-blue-400",   desc: "Build server đang xử lý" },
                  { status: "success",     color: "text-green-400",  desc: "Build thành công, IPA đã sẵn sàng" },
                  { status: "failed",      color: "text-red-400",    desc: "Build thất bại, xem logs để biết chi tiết" },
                ].map((s) => (
                  <div key={s.status} className="flex items-center gap-3 py-1.5 border-b border-gray-800/60 last:border-0">
                    <span className={`text-xs font-bold font-mono w-24 ${s.color}`}>{s.status}</span>
                    <span className="text-gray-400 text-sm">{s.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* ── ant.json ── */}
          <Section id="ant-json" title="ant.json — Build Profiles">
            <p className="text-gray-400 text-sm mb-4">
              File cấu hình build profiles đặt ở root của project. Nếu chưa có, <Code>ant-go build</Code> sẽ tự tạo với các profile mặc định.
            </p>
            <Terminal title="ant.json">
              <div className="text-gray-500">{"{"}</div>
              <div className="ml-4 text-blue-300">{'"build"'}<span className="text-gray-300">: {"{"}</span></div>
              <div className="ml-8">
                <div className="text-green-300">{'"production"'}<span className="text-gray-300">: {"{"}</span></div>
                <div className="ml-4 text-gray-400">
                  <span className="text-orange-300">{'"distribution"'}</span>
                  <span className="text-gray-300">: </span>
                  <span className="text-yellow-300">{'"store"'}</span>
                </div>
                <div className="text-gray-300">{"}"}<span className="text-gray-600">,</span></div>
              </div>
              <div className="ml-8 mt-1">
                <div className="text-green-300">{'"development"'}<span className="text-gray-300">: {"{"}</span></div>
                <div className="ml-4 text-gray-400">
                  <span className="text-orange-300">{'"developmentClient"'}</span>
                  <span className="text-gray-300">: </span>
                  <span className="text-blue-400">true</span>
                  <span className="text-gray-600">,</span>
                </div>
                <div className="ml-4 text-gray-400">
                  <span className="text-orange-300">{'"distribution"'}</span>
                  <span className="text-gray-300">: </span>
                  <span className="text-yellow-300">{'"internal"'}</span>
                </div>
                <div className="text-gray-300">{"}"}<span className="text-gray-600">,</span></div>
              </div>
              <div className="ml-8 mt-1">
                <div className="text-green-300">{'"preview"'}<span className="text-gray-300">: {"{"}</span></div>
                <div className="ml-4 text-gray-400">
                  <span className="text-orange-300">{'"distribution"'}</span>
                  <span className="text-gray-300">: </span>
                  <span className="text-yellow-300">{'"internal"'}</span>
                </div>
                <div className="text-gray-300">{"}"}</div>
              </div>
              <div className="ml-4 text-gray-300">{"}"}</div>
              <div className="text-gray-500">{"}"}</div>
            </Terminal>

            <div className="mt-5 border border-gray-800 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Profile fields</p>
              <Option flag="distribution"      desc='"store" (App Store) hoặc "internal" (Ad Hoc / TestFlight)' />
              <Option flag="developmentClient" desc="true → build development client (không submit lên store)" />
            </div>
          </Section>

          {/* ── Workflow ── */}
          <Section id="workflow" title="Workflow nội bộ">
            <p className="text-gray-400 text-sm mb-6">
              Khi chạy <Code>ant-go build</Code>, CLI thực hiện tuần tự các bước sau:
            </p>
            <div className="space-y-4">
              {[
                { step: "1", icon: "📄", title: "Đọc cấu hình", desc: <>Đọc <Code>app.json</Code> → lấy <Code>projectId</Code>, bundleId, scheme, xcworkspace. Resolve build profile từ <Code>ant.json</Code>.</> },
                { step: "2", icon: "🍎", title: "Apple credentials", desc: "Đăng nhập Apple Developer Portal. Session được cache — chỉ cần 2FA lần đầu. Certificate p12 được cache tại .cert-cache.json." },
                { step: "3", icon: "🗜", title: "Pack & Upload", desc: <>Pack toàn bộ project thành <Code>ios.tar.gz</Code>. Upload lên Firebase Storage cùng với credentials JSON.</> },
                { step: "4", icon: "🚀", title: "Submit build", desc: <>POST <Code>/builds</Code> → nhận <Code>jobId</Code>. POST <Code>/builds/:id/start</Code> để Mac build server nhận job.</> },
                { step: "5", icon: "🏗️", title: "Mac Server build", desc: "Server giải nén, chạy bundle install, chạy Fastlane → build IPA → upload IPA lên Firebase Storage." },
                { step: "6", icon: "📊", title: "Realtime watch", desc: <>CLI poll Firestore realtime, hiển thị từng bước. Kết thúc khi status là <Code>success</Code> hoặc <Code>failed</Code>.</> },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 text-xs font-bold">
                    {item.step}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-sm font-semibold text-white mb-1">
                      {item.icon} {item.title}
                    </p>
                    <p className="text-sm text-gray-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <p className="text-gray-400 text-sm mb-4">Toàn bộ flow rút gọn:</p>
              <Terminal title="Terminal — full flow">
                <div className="text-gray-500 text-xs mb-3">
                  # Lần đầu — sẽ hỏi Apple ID + 2FA
                </div>
                <div><span className="text-gray-500 select-none">$ </span><span className="text-yellow-300">ant-go</span><span> build --platform ios</span></div>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="text-gray-500">📄 Reading app.json...</div>
                  <div className="text-gray-500">🍎 Apple ID: <span className="text-white">dev@example.com</span></div>
                  <div className="text-gray-500">🔐 Password: <span className="text-gray-600">••••••••</span></div>
                  <div className="text-gray-500">📱 2FA Code: <span className="text-white">123456</span></div>
                  <div className="text-gray-500">✔  Session cached</div>
                  <div className="text-gray-500">🔑 Certificate: creating new...</div>
                  <div className="text-gray-500">📋 Provisioning Profile: AppStore_MyApp ✓</div>
                  <div className="text-gray-500">🗜  Packing 1,243 files...</div>
                  <div className="text-gray-500">☁️  Uploading (12.4 MB)...</div>
                  <div className="text-green-400">✔  Submitted → Job: <span className="text-indigo-300">abc123</span></div>
                  <div className="text-gray-500">🔧 initialising...</div>
                  <div className="text-gray-500">💎 bundle install...</div>
                  <div className="text-gray-500">🏗️  fastlane build...</div>
                  <div className="mt-1 text-green-400 font-bold">✅ Build thành công!</div>
                  <div className="text-blue-400 underline text-xs">https://storage.googleapis.com/eba-cli.../MyApp.ipa</div>
                </div>
              </Terminal>
            </div>
          </Section>

          {/* Footer */}
          <div className="border-t border-gray-800 pt-8 mt-4 flex items-center justify-between">
            <p className="text-xs text-gray-600">ant-go CLI v1.0 · iOS build automation</p>
            <Link href="/login" className="text-xs text-indigo-400 hover:text-indigo-300 transition">
              Mở Console →
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}

