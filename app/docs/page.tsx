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
  { id: "install",    label: "Cài đặt" },
  { id: "build",      label: "Build" },
  { id: "status",     label: "Status" },
  { id: "add-device", label: "Add device" },
  { id: "ant-json",   label: "Ant.json" },
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

            <p className="text-gray-400 text-sm mt-6 mb-4">Kiểm tra cài đặt thành công:</p>
            <Terminal title="Terminal">
              <div>
                <span className="text-gray-500 select-none">$ </span>
                <span className="text-white">ant-go --version</span>
              </div>
              <div className="text-gray-400 mt-1">1.0.0</div>
            </Terminal>
          </Section>

          {/* ── build ── */}
          <Section id="build" title="ant-go build">
            <p className="text-gray-400 text-sm mb-4">
              Lệnh chính — nén project, upload lên build server và gửi yêu cầu build iOS. Sau khi submit, theo dõi tiến trình tại web console.
            </p>

            <Terminal title="Terminal — build iOS production">
              <div>
                <span className="text-gray-500 select-none">$ </span>
                <span className="text-yellow-300">ant-go</span>
                <span className="text-white"> build</span>
                <span className="text-blue-400"> --platform</span>
                <span className="text-orange-300"> ios</span>
              </div>
              <div className="mt-3 space-y-0.5 text-cyan-300">
                <div>{"========================================"}</div>
                <div>{"== Ant Go CLI : v1.0                  =="}</div>
                <div>{"== Project ID : my-app-prod           =="}</div>
                <div>{"== Bundle ID  : com.myorg.myapp       =="}</div>
                <div>{"== Profile    : production  (store)   =="}</div>
                <div>{"========================================"}</div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="text-gray-400">{"? "}Đăng nhập tài khoản Apple Developer</div>
                <div className="text-green-400">{"  ❯ "}Đăng nhập  tài khoản <span className="text-white">dev@example.com</span> (TEAMID123)</div>
                <div className="mt-1 text-green-400">✔ Đăng nhập thành công</div>
                <div className="text-green-400">✔ Distribution Certificate (reused): CERTID</div>
                <div className="text-green-400">✔ App Store Provisioning Profile OK</div>
                <div className="text-green-400">✔ Credentials đã cache tại: <span className="text-gray-500">~/.ant-go/creds-production.json</span></div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="text-green-400">✔ Job tạo thành công: <span className="text-indigo-300">abc123xyz</span></div>
                <div className="text-green-400">✔ Project đã nén: <span className="text-white">12.4 MB</span></div>
                <div className="text-green-400">✔ Upload ios.tar.gz hoàn tất</div>
                <div className="text-green-400">✔ Upload credentials.json hoàn tất</div>
                <div className="text-green-400">✔ Đã kiểm tra đầy đủ files</div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="text-white font-semibold">Build đã được gửi lên server!</div>
                <div className="mt-1 text-gray-400">{"   "}Theo dõi tiến trình tại:</div>
                <div className="text-blue-400 underline">{"   "}https://ant-go.app/account/app/MyApp/builds/abc123xyz</div>
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

            <div className="mt-6 border border-gray-800 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Options</p>
              <Option flag="--platform <platform>" desc="Nền tảng build: ios hoặc android" />
              <Option flag="--profile <profile>"   desc="Build profile trong ant.json (mặc định: production)" />
              <Option flag="--project <path>"      desc="Override đường dẫn project" />
              <Option flag="--reauth"              desc="Đăng nhập lại Apple Developer, bỏ qua session cache" />
              <Option flag="--refresh-profile"     desc="Tạo lại Provisioning Profile (khi thay đổi Capabilities)" />
            </div>
          </Section>

          {/* ── status ── */}
          <Section id="status" title="ant-go status">
            <p className="text-gray-400 text-sm mb-4">
              Xem trạng thái của một build job theo Job ID.
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
                <div>{"  "}Status:   <span className="text-green-400 font-bold">SUCCESS</span></div>
                <div>{"  "}Created:  <span>4/27/2026, 10:30:00 AM</span></div>
                <div>{"  "}Updated:  <span>4/27/2026, 10:45:12 AM</span></div>
                <div>{"  "}IPA:      <span className="text-blue-400 underline">https://storage.googleapis.com/.../MyApp.ipa</span></div>
              </div>
            </Terminal>

            <div className="mt-5 border border-gray-800 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Trạng thái</p>
              <div className="space-y-2">
                {[
                  { status: "PENDING",     color: "text-yellow-400", desc: "Đang chờ build server nhận job" },
                  { status: "RUNNING",     color: "text-blue-400",   desc: "Build server đang xử lý" },
                  { status: "SUCCESS",     color: "text-green-400",  desc: "Build thành công, IPA đã sẵn sàng" },
                  { status: "FAILED",      color: "text-red-400",    desc: "Build thất bại, xem logs để biết chi tiết" },
                ].map((s) => (
                  <div key={s.status} className="flex items-center gap-3 py-1.5 border-b border-gray-800/60 last:border-0">
                    <span className={`text-xs font-bold font-mono w-24 ${s.color}`}>{s.status}</span>
                    <span className="text-gray-400 text-sm">{s.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* ── add device ── */}
          <Section id="add-device" title="Add device">
            <p className="text-gray-400 text-sm mb-4">
              Khi build với profile có <Code>distribution: internal</Code> (ví dụ: <Code>development</Code>, <Code>preview</Code>), CLI tự động kích hoạt luồng đăng ký device. iPhone của bạn sẽ được thêm vào Apple Developer Portal để Provisioning Profile có thể cài trực tiếp lên thiết bị.
            </p>

            <Terminal title="Terminal — device enrollment">
              <div>
                <span className="text-gray-500 select-none">$ </span>
                <span className="text-yellow-300">ant-go</span>
                <span className="text-white"> build</span>
                <span className="text-blue-400"> --platform</span>
                <span className="text-orange-300"> ios</span>
                <span className="text-blue-400"> --profile</span>
                <span className="text-orange-300"> development</span>
              </div>
              <div className="mt-3 space-y-1">
                <div className="text-gray-500">...</div>
                <div className="text-cyan-300">📱{"  "}Đăng ký device để cài app development</div>
                <div className="text-gray-500">{"   "}iPhone sẽ tự động gửi UDID khi quét mã QR bên dưới</div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="text-white font-semibold">Quét QR code bằng Camera app trên iPhone:</div>
                <div className="mt-1 text-gray-500 font-mono text-xs leading-4">
                  {"  ▄▄▄▄▄▄▄ ▄  ▄▄  ▄▄▄▄▄▄▄"}<br />
                  {"  █ ▄▄▄ █ ▀▄▄▀▄ █ ▄▄▄ █"}<br />
                  {"  █ ███ █ ██▀▀█ █ ███ █"}<br />
                  {"  ▀▀▀▀▀▀▀ ▀ ▀ ▀ ▀▀▀▀▀▀▀"}
                </div>
                <div className="mt-1 text-gray-500">Hoặc mở URL: <span className="text-indigo-300 underline">https://ant-go.app/enroll/xxxxxxxx</span></div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="text-yellow-400">Đang chờ iPhone xác nhận...</div>
                <div className="text-gray-500">⠿ Chờ iPhone quét QR... (còn 9 phút)</div>
                <div className="text-green-400">✔ Device đã xác nhận: iPhone 15 Pro{"  "}(00008110-001234ABCDEF)</div>
              </div>
              <div className="mt-2 space-y-1">
                <div className="text-gray-400">{"? "}Tên device (để dễ nhận biết): <span className="text-white">My iPhone</span></div>
                <div className="text-green-400">✔ Device đã đăng ký: My iPhone</div>
              </div>
            </Terminal>

            <div className="mt-5 border border-gray-800 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Quy trình</p>
              {[
                { step: "1", desc: "CLI gọi server tạo enrollment session — sinh URL + token." },
                { step: "2", desc: "CLI hiển thị QR code. Quét bằng Camera app (không cần app riêng)." },
                { step: "3", desc: "iPhone tải .mobileconfig → nhắc cài profile → gửi UDID về server." },
                { step: "4", desc: "CLI nhận UDID, kiểm tra và đăng ký device trên Apple Developer Portal." },
                { step: "5", desc: "Tiếp tục build với Provisioning Profile đã bao gồm device mới." },
              ].map((item) => (
                <div key={item.step} className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 text-xs font-bold">
                    {item.step}
                  </span>
                  <p className="text-sm text-gray-400 pt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>

            <p className="text-gray-500 text-xs mt-4">
              Nếu UDID đã được đăng ký trước đó trên Apple Developer Portal, bước đăng ký device sẽ bị bỏ qua.
            </p>
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
