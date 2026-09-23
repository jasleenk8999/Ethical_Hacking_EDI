import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CAIRA — SOC Incident Response Agent",
  description:
    "Evidence-gated AI cybersecurity incident response platform for Security Operations Centers.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var origSetAttr = Element.prototype.setAttribute;
                  Element.prototype.setAttribute = function(name, val) {
                    if (name === 'bis_skin_checked') return;
                    return origSetAttr.apply(this, arguments);
                  };
                  if (typeof MutationObserver !== 'undefined') {
                    new MutationObserver(function(mutations) {
                      for (var i = 0; i < mutations.length; i++) {
                        var m = mutations[i];
                        if (m.type === 'attributes' && m.attributeName === 'bis_skin_checked' && m.target) {
                          m.target.removeAttribute('bis_skin_checked');
                        }
                        if (m.addedNodes) {
                          for (var j = 0; j < m.addedNodes.length; j++) {
                            var n = m.addedNodes[j];
                            if (n.nodeType === 1) {
                              if (n.hasAttribute('bis_skin_checked')) n.removeAttribute('bis_skin_checked');
                              var nested = n.querySelectorAll ? n.querySelectorAll('[bis_skin_checked]') : [];
                              for (var k = 0; k < nested.length; k++) {
                                nested[k].removeAttribute('bis_skin_checked');
                              }
                            }
                          }
                        }
                      }
                    }).observe(document.documentElement, { attributes: true, subtree: true, childList: true });
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        style={{
          backgroundColor: "var(--bg-base)",
          color: "var(--text-primary)",
          fontFamily: "var(--font-sans), Inter, system-ui, sans-serif",
          margin: 0,
          padding: 0,
          minHeight: "100vh",
          display: "flex",
          overflowX: "hidden",
        }}
      >
        <Sidebar />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: "100vh" }}>
          <Topbar />
          <main style={{ flex: 1, padding: "24px 28px", overflowY: "auto" }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
