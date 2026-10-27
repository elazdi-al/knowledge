import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import { CommandMenu } from "@/components/CommandMenu";
import { Header } from "@/components/Header";
import { ThemeInitScript, ThemeToggle } from "@/components/ThemeToggle";
import "katex/dist/katex.min.css";
import "./globals.css";

const inter = Inter({
  // greek covers the σ/π/δ the diagram labels use; math glyphs Inter lacks
  // (⋈, ∈, ⟨⟩) fall back to the system stack by design.
  subsets: ["latin", "greek"],
  // opsz lets the browser pick the text cut for body sizes and the tighter
  // display cut for headings (font-optical-sizing: auto).
  axes: ["opsz"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

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
      // Lets Next turn the CSS smooth scroll off during route changes.
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeInitScript />
      </head>
      <body>
        <div className="layout-shell mx-auto px-6 w-full max-w-page">
          <Header />
          <main className="pb-32">{children}</main>
        </div>
        <ThemeToggle />
        <CommandMenu />
      </body>
    </html>
  );
}
