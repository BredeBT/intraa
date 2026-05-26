import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { OrgProvider } from "@/lib/context/OrgContext";
import Providers from "@/components/Providers";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display-serif for overskrifter på landing-page. Gir karakter og bryter
// med Geist-default som hvert AI-generert SaaS-site bruker.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight:   "400",
  style:    ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Intraa",
  description: "Din arbeidsplass. Din community.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="no"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased bg-zinc-950`}
    >
      <head>
        {/* Setter data-theme før hydrering så vi unngår «flash of wrong theme»
            ved første sideinnlasting. Leser fra localStorage + OS-pref. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var c=localStorage.getItem('theme')||'system';var t=c==='system'?(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):c;document.documentElement.setAttribute('data-theme',t);document.documentElement.classList.add(t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-zinc-950">
        <ServiceWorkerRegister />
        <Providers><ThemeProvider><OrgProvider>{children}</OrgProvider></ThemeProvider></Providers>
      </body>
    </html>
  );
}
