"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface BuildInfo {
  appName: string | null;
  schemeName: string | null;
  bundleId: string | null;
  status: string | null;
  manifestUrl: string | null;
  distribution: string | null;
  developmentClient: boolean;
  ipaUrl: string | null;
}

type PageState = "loading" | "ready" | "unavailable" | "error";

export default function InstallPage() {
  const { buildId } = useParams<{ buildId: string }>();
  const [build, setBuild]     = useState<BuildInfo | null>(null);
  const [state, setState]     = useState<PageState>("loading");
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    fetch(`/api/builds/${buildId}`)
      .then(r => r.json())
      .then((d) => {
        if (d.error) { setState("error"); return; }
        if (d.status !== "success" || !d.manifestUrl || d.distribution !== "internal") {
          setState("unavailable"); return;
        }
        setBuild(d);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [buildId]);

  function handleInstall() {
    if (!build?.manifestUrl) return;
    const url = `itms-services://?action=download-manifest&url=${encodeURIComponent(build.manifestUrl)}`;
    window.location.href = url;
    setTimeout(() => setInstalled(true), 800);
  }

  const appName = build?.appName || build?.schemeName || "App";

  const containerStyle: React.CSSProperties = {
    minHeight: "100dvh",
    background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  };

  if (state === "loading") {
    return (
      <div style={containerStyle}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            border: "3px solid rgba(255,255,255,0.15)",
            borderTopColor: "rgba(255,255,255,0.7)",
            animation: "spin 0.8s linear infinite",
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (state === "unavailable" || state === "error") {
    return (
      <div style={containerStyle}>
        <div style={{ width: "100%", maxWidth: 360, textAlign: "center" }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <svg width="24" height="24" fill="none" stroke="#f87171" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: "0 0 10px" }}>
            Không thể cài app
          </h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, lineHeight: 1.6 }}>
            {state === "error"
              ? "Không tìm thấy build hoặc có lỗi xảy ra."
              : "Build này chưa hoàn thành hoặc không hỗ trợ cài OTA."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
        {/* App icon placeholder */}
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.12)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
        }}>
          <svg width="36" height="36" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-6.75 9h7.5" />
          </svg>
        </div>

        <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>
          {appName}
        </h1>
        {build?.bundleId && (
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, fontFamily: "monospace", margin: "0 0 8px" }}>
            {build.bundleId}
          </p>
        )}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 32 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
            background: "rgba(99,102,241,0.2)", color: "#a5b4fc",
            border: "1px solid rgba(99,102,241,0.3)",
          }}>
            Ad Hoc
          </span>
          {build?.developmentClient && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
              background: "rgba(16,185,129,0.15)", color: "#6ee7b7",
              border: "1px solid rgba(16,185,129,0.25)",
            }}>
              Dev Client
            </span>
          )}
        </div>

        {/* Install button */}
        {!installed ? (
          <button
            onClick={handleInstall}
            style={{
              width: "100%", padding: "16px", borderRadius: 14,
              border: "none", background: "#fff", color: "#111",
              fontSize: 17, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            }}
          >
            <svg width="20" height="20" fill="none" stroke="#111" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Cài app lên iPhone
          </button>
        ) : (
          <div style={{
            width: "100%", padding: "16px", borderRadius: 14,
            background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)",
            color: "#4ade80", fontSize: 16, fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}>
            <svg width="20" height="20" fill="none" stroke="#4ade80" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Đang cài... kiểm tra màn hình
          </div>
        )}

        <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 12, marginTop: 16, lineHeight: 1.6 }}>
          iOS sẽ hỏi xác nhận cài app. Nhấn <strong style={{ color: "rgba(255,255,255,0.5)" }}>Install</strong> để tiếp tục.
        </p>

        {/* Dev client instructions */}
        {build?.developmentClient && (
          <div style={{
            marginTop: 28,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 14, padding: "16px 18px",
            textAlign: "left",
          }}>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Sau khi cài xong
            </p>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, lineHeight: 1.6, margin: "0 0 10px" }}>
              App dùng <span style={{ color: "rgba(255,255,255,0.75)", fontFamily: "monospace" }}>expo-dev-client</span> — cần Metro chạy trên máy dev.
            </p>
            <code style={{
              display: "block",
              background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, padding: "10px 14px",
              fontSize: 13, color: "#a5f3fc", fontFamily: "monospace",
            }}>
              npx expo start --dev-client
            </code>
          </div>
        )}

        {/* Manual download fallback */}
        {build?.ipaUrl && (
          <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 12, marginTop: 20 }}>
            Cần cài thủ công?{" "}
            <a href={build.ipaUrl} style={{ color: "rgba(255,255,255,0.4)", textDecoration: "underline" }}>
              Download .ipa
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
