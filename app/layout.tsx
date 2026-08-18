import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "FarmFinder CNY | Fresh food, close to home",
  description: "Discover active farm stands across Central New York.",
  applicationName: "FarmFinder CNY",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "FarmFinder" },
  formatDetection: { telephone: true },
};

export const viewport = { themeColor: "#183d2c" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${display.variable}`}><PwaRegister />{children}</body>
    </html>
  );
}
