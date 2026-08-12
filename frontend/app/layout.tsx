import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "CAIRA — Confidence-aware Adaptive Incident Response Agent",
  description: "Evidence-gated AI cybersecurity incident response and evaluation platform for SOCs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${mono.variable}`}>
      <body className="bg-slate-950 text-slate-100 font-sans antialiased min-h-screen flex selection:bg-cyan-500 selection:text-slate-950">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          <Topbar />
          <main className="flex-1 p-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
