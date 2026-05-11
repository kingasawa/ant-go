"use client";
import { useLanguage } from "@/context/LanguageContext";

export default function LanguageToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLanguage();

  return (
    <div
      className={`flex items-center rounded-lg overflow-hidden border border-white/20 text-xs font-semibold ${className}`}
      style={{ background: "rgba(255,255,255,0.07)" }}
    >
      <button
        onClick={() => setLang("vi")}
        className={`px-2.5 py-1.5 transition-colors ${
          lang === "vi"
            ? "bg-white/20 text-white"
            : "text-white/45 hover:text-white/80"
        }`}
      >
        VI
      </button>
      <span className="w-px h-4 bg-white/20" />
      <button
        onClick={() => setLang("en")}
        className={`px-2.5 py-1.5 transition-colors ${
          lang === "en"
            ? "bg-white/20 text-white"
            : "text-white/45 hover:text-white/80"
        }`}
      >
        EN
      </button>
    </div>
  );
}
