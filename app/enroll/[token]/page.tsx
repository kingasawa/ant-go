"use client";
import { useState } from "react";
import { useParams } from "next/navigation";

type Step = "ready" | "downloaded";

export default function EnrollPage() {
  const { token } = useParams<{ token: string }>();
  const [step, setStep] = useState<Step>("ready");

  function downloadProfile() {
    window.location.href = `/api/device-enroll/${token}/profile`;
    setTimeout(() => setStep("downloaded"), 1500);
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 360, textAlign: "center" }}>
        {/* Logo */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: "rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
          }}
        >
          <svg width="32" height="32" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3" />
          </svg>
        </div>

        {step === "ready" ? (
          <>
            <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: "0 0 10px" }}>
              Đăng ký thiết bị
            </h1>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.6, margin: "0 0 32px" }}>
              Nhấn nút bên dưới để tải hồ sơ đăng ký từ Ant Go.
              iOS sẽ yêu cầu bạn xác nhận tải về.
            </p>

            <button
              onClick={downloadProfile}
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: 14,
                border: "none",
                background: "#fff",
                color: "#111",
                fontSize: 16,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Tải hồ sơ
            </button>

            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 12, marginTop: 16, lineHeight: 1.5 }}>
              Hồ sơ này chỉ dùng để lấy UDID thiết bị.
              Nó sẽ không kiểm soát hoặc theo dõi điện thoại của bạn.
            </p>
          </>
        ) : (
          <>
            {/* Downloaded state */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(34,197,94,0.15)",
                border: "1px solid rgba(34,197,94,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <svg width="28" height="28" fill="none" stroke="#4ade80" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: "0 0 10px" }}>
              Hồ sơ đã tải xong
            </h1>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.6, margin: "0 0 28px" }}>
              Mở <strong style={{ color: "rgba(255,255,255,0.8)" }}>Settings</strong> để hoàn tất cài đặt hồ sơ.
            </p>

            {/* Steps */}
            <div
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 14,
                padding: "16px 20px",
                marginBottom: 24,
                textAlign: "left",
              }}
            >
              {[
                "Mở Settings",
                "Chọn General (Cài đặt chung)",
                "Chọn VPN & Device Management",
                'Nhấn "Ant Go Device Registration"',
                "Nhấn Install (Cài đặt)",
              ].map((text, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "8px 0",
                    borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.6)",
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}
            </div>

            {/* Open Settings button — works in Safari on iOS */}
            <a
              href="App-prefs:root=General&path=ManagedConfigurationList"
              style={{
                display: "block",
                width: "100%",
                padding: "16px",
                borderRadius: 14,
                background: "#fff",
                color: "#111",
                fontSize: 16,
                fontWeight: 700,
                textDecoration: "none",
                boxSizing: "border-box",
              }}
            >
              Mở Settings ngay
            </a>

            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 12, marginTop: 14, lineHeight: 1.5 }}>
              Sau khi cài đặt xong, trang đăng ký trên máy tính sẽ tự động cập nhật.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
