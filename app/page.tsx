"use client";

import Link from "next/link";
import { useState } from "react";
import { Geist } from "next/font/google";
import MedievalButton from "./components/MedievalButton";
import { signIn } from "next-auth/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export default function Home() {
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    try {
      await signIn("resend", { email, callbackUrl: "/space" });
    } catch (error) {
      console.error("Login failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={`relative min-h-screen flex flex-col items-center justify-center overflow-hidden ${geistSans.className}`}>

      {/* Intro Screen - Video Background */}
      {!showLogin && (
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

            <div onClick={() => setShowLogin(true)}>
              <MedievalButton className="text-lg px-12 py-4">
                Entrar
              </MedievalButton>
            </div>
          </div>
        </div>
      )}

      {/* Login Screen (Existing Implementation) */}
      {showLogin && (
        <>
          {/* Background Portal Effect - Kept from original to maintain atmosphere behind the card */}
          <div className="portal-container animate-fade-in-slow">
            <div className="portal-ring"></div>
            <div className="portal-ring-outer"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(59,130,246,0.15)_0%,transparent_70%)]"></div>
          </div>

          {/* Decorative Overlays */}
          <div className="fixed inset-0 pointer-events-none border-[32px] border-black/20 z-0"></div>
          <div className="fixed inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20 z-0"></div>

          {/* Login Card */}
          <div className="relative z-20 bg-white rounded-[32px] p-12 w-full max-w-[480px] shadow-2xl flex flex-col items-center text-center animate-slide-up">

            {/* Header */}
            <h1 className="text-3xl font-semibold text-black mb-4">Entrar ou cadastrar-se</h1>

            <p className="text-gray-500 text-sm mb-8 leading-relaxed max-w-[340px]">
              Digite seu e-mail para receber um link de acesso mágico.
            </p>

            {/* Auth Buttons Stack - Original buttons kept as visual placeholders or future implementation */}
            {/* ... keeping other buttons if desired, or simplifying to just Email for now as requested. I'll keep the email part as primary. */}

            <form onSubmit={handleLogin} className="w-full">
              {/* Email Input */}
              <div className="w-full mb-4">
                <input
                  type="email"
                  placeholder="Endereço de e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-12 px-4 rounded-full border border-gray-300 focus:outline-none focus:border-black transition-colors text-black placeholder:text-gray-400"
                />
              </div>

              {/* Continue Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-full bg-black text-white font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {isLoading ? "Enviando..." : "Continuar com Email"}
              </button>
            </form>

            <div className="mt-6 text-xs text-gray-400">
              Ao continuar, você concorda com os Termos de Serviço.
            </div>

          </div>
        </>
      )}

    </main>
  );
}
