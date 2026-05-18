import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import { Header } from "@/components/Header";
import { Toaster } from "@/components/Toaster";
import "katex/dist/katex.min.css";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
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
      className={`${inter.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable}`}
    >
      <body>
        <div className="mx-auto px-6 w-full max-w-[var(--container-prose)]">
          <Header />
          <main className="pb-32">{children}</main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
