import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import { CommandMenu } from "@/components/CommandMenu";
import { Header } from "@/components/Header";
import { ThemeToggle } from "@/components/ThemeToggle";
import "katex/dist/katex.min.css";
import "./globals.css";

const inter = Inter({
  // greek covers the σ/π/δ the diagram labels use; math glyphs Inter lacks
  // (⋈, ∈, ⟨⟩) fall back to the system stack by design.
  subsets: ["latin", "greek"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

// Runs synchronously in <head>, before paint, so the correct palette is
// applied without a flash on first render.
const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export const metadata: Metadata = {
  title: {
    default: "knowledge",
    template: "%s · knowledge",
  },
  description: "A quiet, local-first knowledge renderer.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <div className="mx-auto px-6 w-full max-w-[var(--container-prose)]">
          <Header />
          <main className="pb-32">{children}</main>
        </div>
        <ThemeToggle />
        <CommandMenu />
      </body>
    </html>
  );
}
