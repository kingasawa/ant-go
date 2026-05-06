import type { Metadata } from "next";
import { Tomorrow, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "next-themes";
import TopLoader from "@/app/components/TopLoader";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const tomorrow = Tomorrow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-tomorrow",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ANT GO WORK — CI/CD for React Native apps",
  description: "An Application Services for iOS and Android builds",
  icons: { icon: "/assets/images/favicon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${jakarta.variable} ${tomorrow.variable} font-sans antialiased`}>
        <TopLoader />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
