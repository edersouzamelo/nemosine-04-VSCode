import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SYSTEM_VERSION_NAME, getSystemBuildId } from "./lib/system_version";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL
  || "https://app.nemosinenous.com";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "Nemosine | Sistema Nous",
  description: "Sistema de Cartas das Personas de Nemosine Nous",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nemosine",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/icons/nemosine-icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#c5a059",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isPreview = process.env.VERCEL_ENV === "preview";
  const isProduction = process.env.VERCEL_ENV === "production";
  const shortSha = getSystemBuildId();
  const versionBadge = isPreview ? `Preview · ${shortSha}` : SYSTEM_VERSION_NAME;

  return (
    <html lang="pt-BR" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Cormorant+Garamond:wght@300;400;600&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
          {(isPreview || isProduction) && (
            <div className="pointer-events-none fixed bottom-2 left-2 z-[9999] rounded border border-amber-300/55 bg-black/90 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-200 shadow-lg">
              {versionBadge}
            </div>
          )}
        </Providers>
      </body>
    </html>
  );
}
