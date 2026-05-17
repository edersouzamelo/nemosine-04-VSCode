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
  const [showGrimoire, setShowGrimoire] = useState(false);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleEnterVortex = () => {
    setShowGrimoire(true);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);

    // Bypass NextAuth entirely to satisfy user request for instant access
    // Fake a small delay for the aesthetic animation, then redirect
    setTimeout(() => {
      router.push("/space");
    }, 800);
  };

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
  };

  return (
    <main className={`relative min-h-screen flex flex-col items-center justify-center overflow-hidden ${geistSans.className}`}>

      {/* Intro Screen - Video Background (The Vortex) */}
      {!showGrimoire && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black animate-fade-in">
          {/* Video Background */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          >
            <source src="/assets/background.mp4" type="video/mp4" />
            <div className="absolute inset-0 bg-gradient-to-b from-black via-[#1a0f0a] to-black"></div>
          </video>

          {/* Content Overlay */}
          <div className="relative z-10 flex flex-col items-center gap-6 text-center px-6 animate-fade-in mt-16">
            <div className="mt-8">
              <img
                src="/assets/nemosine-logo.png"
                alt="Nemosine Nous"
                className="w-full max-w-3xl h-auto object-contain drop-shadow-[0_0_25px_rgba(197,160,89,0.4)] animate-fade-in"
              />
            </div>

            <div onClick={handleEnterVortex} className="cursor-pointer">
              <MedievalButton className="text-lg px-12 py-4">
                Entrar
              </MedievalButton>
            </div>
          </div>
        </div>
      )}

      {/* Login Screen - Grimório */}
      {showGrimoire && (
        <div className="absolute inset-0 z-40 bg-background-light dark:bg-background-dark text-stone-800 dark:text-stone-200 flex items-center justify-center p-4 font-serif transition-colors duration-500 overflow-hidden">
          <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-40">
            <img alt="Mystical night sky" className="w-full h-full object-cover mix-blend-overlay" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAf4KTqlc_zrjm3r5WSX6BLbpWo7nCC8Mb6B2-6czh6WCjOMAgK6wmjnbJRJJk3n4P_jkvym2qFJNbq-6np4-GFZ8UahS9tt4eSCYG-icUeZF9nEXFGaWXtTviDaATpaBg3MlKOg3gKbsxlMo4dqr_uYaOeAaSh2eAz6g9Vmu_czi1yNPOl8oWghUNmore69ir2POv86ulmjwkdtctqXm1pNp72YBikSg8hKT3i8uPVJpPNwAoWOb0DkG0s9J-pY0HSH0YdUpMJ91Tp" />
          </div>

          <div className="relative w-full max-w-md z-10 transition-all duration-700 ease-in-out animate-fade-in group">
            <div className="grimoire-border bg-parchment dark:bg-parchment-dark rounded-lg overflow-hidden p-1">
              <div className="parchment-texture px-8 py-12 relative filigree min-h-[500px] flex flex-col justify-between">
                <div className="absolute top-2 left-2 text-primary opacity-60">
                  <span className="material-icons text-3xl">auto_awesome</span>
                </div>
                <div className="absolute top-2 right-2 text-primary opacity-60 scale-x-[-1]">
                  <span className="material-icons text-3xl">auto_awesome</span>
                </div>
                <div className="text-center space-y-6">
                  <header>
                    <h1 className="font-display text-2xl md:text-3xl text-primary gold-glow mb-2 uppercase tracking-widest">
                      Nemosine Nous
                    </h1>
                    <div className="h-px w-24 bg-primary mx-auto opacity-40"></div>
                  </header>
                  <div className="space-y-2">
                    <h2 className="text-xl md:text-2xl font-display text-stone-900 dark:text-stone-100 italic">
                      Entrar no Grimório
                    </h2>
                    <p className="text-sm text-stone-600 dark:text-stone-400 italic">
                      Insira seu endereço de email para manifestar o portal.
                    </p>
                  </div>

                  <form onSubmit={handleLogin} className="mt-10 space-y-8">
                    <div className="relative">
                      <input
                        className="w-full bg-transparent border-t-0 border-x-0 border-b-2 border-primary/30 focus:border-primary focus:ring-0 text-stone-900 dark:text-stone-100 placeholder:text-stone-500/50 placeholder:italic transition-all duration-300 py-4 text-lg peer"
                        placeholder="seu-email@dominio.com"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                      <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-500 peer-focus:w-full"></div>
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full group/btn relative overflow-hidden py-4 px-6 border border-primary/50 bg-stone-900 dark:bg-stone-950 text-primary font-display tracking-widest hover:text-stone-900 hover:bg-primary transition-all duration-500 shadow-lg disabled:opacity-50 cursor-pointer"
                    >
                      <span className="relative z-10">{isLoading ? "CONECTANDO..." : "CONTINUAR"}</span>
                      <div className="absolute inset-0 bg-primary translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
                    </button>
                  </form>

                </div>
                <footer className="mt-auto pt-8 text-center bg-transparent relative z-10">
                  <p className="text-[10px] uppercase tracking-tighter text-stone-500 dark:text-stone-600">
                    Ao prosseguir, você concorda com as <br />
                    <a className="underline hover:text-primary transition-colors" href="#">Leis de Serviço do Sistema</a>
                  </p>
                </footer>
              </div>
            </div>

            <div className="fixed bottom-6 left-6 z-20">
              <button className="w-10 h-10 rounded-full bg-stone-900 border border-primary/40 flex items-center justify-center text-primary hover:border-primary transition-colors shadow-2xl cursor-pointer">
                <span className="font-display font-bold">N</span>
              </button>
            </div>

            <div className="fixed top-6 right-6 z-20">
              <button
                className="p-2 text-primary/60 hover:text-primary transition-colors cursor-pointer"
                onClick={toggleDarkMode}
              >
                <span className="material-icons">settings_brightness</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
