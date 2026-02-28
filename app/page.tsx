"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Geist } from "next/font/google";
import MedievalButton from "./components/MedievalButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export default function Home() {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleEnter = () => {
    setIsNavigating(true);
    // Fake a small delay for the aesthetic animation, then redirect
    setTimeout(() => {
      router.push("/space");
    }, 800);
  };

  return (
    <main className={`relative min-h-screen flex flex-col items-center justify-center overflow-hidden ${geistSans.className}`}>
      {/* Intro Screen - Video Background (The Vortex) */}
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black">
        {/* Video Background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        >
          <source src="/assets/background.mp4" type="video/mp4" />
          {/* Fallback if video is missing or loading */}
          <div className="absolute inset-0 bg-gradient-to-b from-black via-[#1a0f0a] to-black"></div>
        </video>

        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col items-center gap-6 text-center px-6 animate-fade-in">
          <div className="mt-8">
            <img
              src="/assets/nemosine-logo.png"
              alt="Nemosine Nous"
              className="w-full max-w-3xl h-auto object-contain drop-shadow-[0_0_25px_rgba(197,160,89,0.4)] animate-fade-in"
            />
          </div>

          <div onClick={handleEnter} className="cursor-pointer">
            <MedievalButton className="text-lg px-12 py-4">
              {isNavigating ? "Conectando..." : "Entrar"}
            </MedievalButton>
          </div>
        </div>
      </div>
    </main>
  );
}
