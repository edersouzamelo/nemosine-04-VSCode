"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function Home() {
  const [step, setStep] = useState<1 | 2>(1);
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
      setIsLoading(false);
    }
  };

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
  };

  return (
    <main className="bg-background-light dark:bg-background-dark text-stone-800 dark:text-stone-200 min-h-screen flex items-center justify-center p-4 font-serif transition-colors duration-500 overflow-hidden relative">
      <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-40">
        <img alt="Mystical night sky" className="w-full h-full object-cover mix-blend-overlay" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAf4KTqlc_zrjm3r5WSX6BLbpWo7nCC8Mb6B2-6czh6WCjOMAgK6wmjnbJRJJk3n4P_jkvym2qFJNbq-6np4-GFZ8UahS9tt4eSCYG-icUeZF9nEXFGaWXtTviDaATpaBg3MlKOg3gKbsxlMo4dqr_uYaOeAaSh2eAz6g9Vmu_czi1yNPOl8oWghUNmore69ir2POv86ulmjwkdtctqXm1pNp72YBikSg8hKT3i8uPVJpPNwAoWOb0DkG0s9J-pY0HSH0YdUpMJ91Tp" />
      </div>

      <div className="relative w-full max-w-md z-10 transition-all duration-700 ease-in-out">
        {step === 1 && (
          <div className="grimoire-border bg-parchment dark:bg-parchment-dark rounded-lg overflow-hidden p-1 animate-fade-in">
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
                  <div className="relative group">
                    <input
                      className="w-full bg-transparent border-t-0 border-x-0 border-b-2 border-primary/30 focus:border-primary focus:ring-0 text-stone-900 dark:text-stone-100 placeholder:text-stone-500/50 placeholder:italic transition-all duration-300 py-4 text-lg"
                      placeholder="seu-email@dominio.com"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                    <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-500 group-focus-within:w-full"></div>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full group relative overflow-hidden py-4 px-6 border border-primary/50 bg-stone-900 dark:bg-stone-950 text-primary font-display tracking-widest hover:text-stone-900 hover:bg-primary transition-all duration-500 shadow-lg disabled:opacity-50 cursor-pointer"
                  >
                    <span className="relative z-10">{isLoading ? "CONECTANDO..." : "CONTINUAR"}</span>
                    <div className="absolute inset-0 bg-primary translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
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
        )}

        {step === 2 && (
          <div className="grimoire-border bg-parchment dark:bg-parchment-dark rounded-lg overflow-hidden p-1 animate-fade-in">
            <div className="parchment-texture px-8 py-16 relative filigree min-h-[500px] flex flex-col items-center justify-center space-y-8">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
                <div className="relative w-20 h-20 rounded-full border-2 border-primary flex items-center justify-center text-primary">
                  <span className="material-icons text-4xl">mark_email_unread</span>
                </div>
              </div>
              <div className="text-center space-y-4 max-w-sm">
                <h2 className="font-display text-2xl text-primary gold-glow font-bold">
                  Verifique seu E-mail
                </h2>
                <p className="text-stone-700 dark:text-stone-300 leading-relaxed italic animate-fade-in">
                  Uma chave de acesso foi enviada para sua conta. <br />
                  Acesse o link para manifestar seu espaço local no Nemosine.
                </p>
              </div>
              <div className="pt-8">
                <button
                  className="text-sm font-display tracking-widest text-primary/70 hover:text-primary flex items-center space-x-2 transition-all group cursor-pointer"
                  onClick={() => setStep(1)}
                >
                  <span className="material-icons text-sm group-hover:-translate-x-1 transition-transform">west</span>
                  <span>VOLTAR AO INÍCIO</span>
                </button>
              </div>
              <div className="absolute bottom-6 w-full text-center">
                <p className="text-[11px] font-mono text-primary/40 animate-pulse">
                  Esperando conexão neural...
                </p>
              </div>
            </div>
          </div>
        )}
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

    </main>
  );
}
