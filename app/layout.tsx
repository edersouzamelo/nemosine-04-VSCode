import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nemosine | Sistema Nous",
  description: "Sistema de Cartas das Personas de Nemosine Nous",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nemosine",
  },
  icons: {
    icon: "/assets/nemosine-cube-v2.png",
    apple: "/assets/nemosine-cube-v2.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#c5a059",
};

import { Providers } from "./providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Cormorant+Garamond:wght@300;400;600&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link rel="icon" href="/assets/nemosine-cube-v2.png" />
        <link rel="apple-touch-icon" href="/assets/nemosine-cube-v2.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
