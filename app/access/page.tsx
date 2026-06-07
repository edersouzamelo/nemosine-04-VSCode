"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LanguageSelector, useLanguage, AppTheme } from "../components/LanguageProvider";
import { NEMOSINE_LEGAL_CHECKBOX_LABEL } from "../lib/legalConsent";

export default function AccessPage() {
  const router = useRouter();
  const { t, theme, setTheme } = useLanguage();
  const [callbackUrl, setCallbackUrl] = useState("/inicio");
  const [showGrimoire, setShowGrimoire] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [vortexReady, setVortexReady] = useState(false);

  useEffect(() => {
    const target = new URLSearchParams(window.location.search).get("callbackUrl");
    if (target?.startsWith("/") && !target.startsWith("//")) {
      setCallbackUrl(target);
    }
  }, []);

  const handleGoogleAuth = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError("");

    try {
      await signIn("google", { redirectTo: callbackUrl });
    } catch {
      setError("Não foi possível iniciar o acesso com Google.");
      setIsLoading(false);
    }
  };

  const handleAuth = async (event: FormEvent) => {
    event.preventDefault();
    if (!email || !password || isLoading) return;
    if (isRegistering && !termsAccepted) {
      setError("E necessario aceitar os termos para criar sua conta.");
      return;
    }
    setIsLoading(true);
    setError("");

    try {
      if (isRegistering) {
        const registration = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, termsAccepted })
        });
        const data = await registration.json();
        if (!registration.ok) {
          setError(data.message || "Não foi possível criar sua conta.");
          setIsLoading(false);
          return;
        }
      }

      const result = await signIn("credentials", {
        redirect: false,
        email,
        password
      });

      if (result?.error) {
        setError("E-mail ou senha incorretos.");
        setIsLoading(false);
        return;
      }
      router.push(callbackUrl);
    } catch {
      setError("Não foi possível concluir o acesso agora.");
      setIsLoading(false);
    }
  };

  return (
    <main className="relative min-h-[100dvh] overflow-hidden">
      {!showGrimoire && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black animate-fade-in">
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onCanPlay={() => setVortexReady(true)}
            onLoadedData={() => setVortexReady(true)}
            className={`nemosine-vortex-intro absolute inset-0 h-full w-full object-cover ${vortexReady ? "nemosine-vortex-intro-ready" : ""}`}
          >
            <source src="/assets/background.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-[#1a0f0a]/25 to-black/80" />
          <div className="relative z-10 mt-16 flex flex-col items-center gap-6 px-6 text-center animate-fade-in">
            <img
              src="/assets/nemosine-logo.png"
              alt="Nemosine Nous"
              className="h-auto w-full max-w-3xl object-contain drop-shadow-[0_0_25px_rgba(197,160,89,0.4)] animate-fade-in-slow"
            />
            <button
              type="button"
              onClick={() => setShowGrimoire(true)}
              className="access-entry-button group"
            >
              <span className="access-entry-corner access-entry-corner-tl" />
              <span className="access-entry-corner access-entry-corner-tr" />
              <span className="access-entry-corner access-entry-corner-bl" />
              <span className="access-entry-corner access-entry-corner-br" />
              <span className="relative z-10 flex items-center justify-center gap-5">
                <span className="text-base text-[#ffd36b] transition-transform duration-500 group-hover:scale-110">✦</span>
                <span>{t("enter")}</span>
                <span className="text-base text-[#ffd36b] transition-transform duration-500 group-hover:scale-110">✦</span>
              </span>
            </button>
          </div>
        </div>
      )}

      {showGrimoire && (
        <div className="login-screen absolute inset-0 z-40 flex items-center justify-center overflow-y-auto bg-background-light p-4 font-serif text-stone-800 transition-colors duration-500 dark:bg-background-dark dark:text-stone-200">
          <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-40">
            <img
              alt="Paisagem do castelo mental"
              className="h-full w-full object-cover mix-blend-overlay"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAf4KTqlc_zrjm3r5WSX6BLbpWo7nCC8Mb6B2-6czh6WCjOMAgK6wmjnbJRJJk3n4P_jkvym2qFJNbq-6np4-GFZ8UahS9tt4eSCYG-icUeZF9nEXFGaWXtTviDaATpaBg3MlKOg3gKbsxlMo4dqr_uYaOeAaSh2eAz6g9Vmu_czi1yNPOl8oWghUNmore69ir2POv86ulmjwkdtctqXm1pNp72YBikSg8hKT3i8uPVJpPNwAoWOb0DkG0s9J-pY0HSH0YdUpMJ91Tp"
            />
          </div>

          <div className="relative z-10 w-full max-w-md animate-fade-in py-4">
            <div className="grimoire-border overflow-hidden rounded-lg bg-[#c5a059]/20 p-1">
              <div className="relative flex min-h-[500px] flex-col justify-between px-7 py-9 sm:px-8 sm:py-11 bg-[#fdfbf7] dark:bg-[#0c0d12] rounded-lg">
                <span className="material-icons absolute left-2 top-2 text-3xl text-primary opacity-60">auto_awesome</span>
                <span className="material-icons absolute right-2 top-2 scale-x-[-1] text-3xl text-primary opacity-60">auto_awesome</span>

                <div className="space-y-5 text-center">
                  <header>
                    <h1 className="gold-glow font-display mb-2 text-2xl uppercase tracking-widest text-primary md:text-3xl">
                      Nemosine Nous
                    </h1>
                    <div className="mx-auto h-px w-24 bg-primary opacity-40" />
                  </header>
                  <div className="flex justify-center">
                    <LanguageSelector dark={theme === "dark"} />
                  </div>
                  <div className="space-y-2">
                    <h2 className="font-display text-xl font-bold uppercase tracking-widest text-[#72552c] dark:text-[#fde68a] md:text-2xl">
                      {isRegistering ? t("registerTitle") : t("loginTitle")}
                    </h2>
                    <p className="text-sm italic text-stone-700 dark:text-[#eee8dc]/80">
                      {isRegistering ? t("registerPrompt") : t("loginPrompt")}
                    </p>
                  </div>

                  <form onSubmit={handleAuth} className="space-y-5 pt-3">
                    {error && (
                      <div className="border border-red-500/50 bg-red-900/30 p-3 text-sm text-red-200">
                        {error}
                      </div>
                    )}

                    {!isRegistering && (
                      <>
                        <button
                          type="button"
                          onClick={handleGoogleAuth}
                          disabled={isLoading}
                          className="font-display flex w-full cursor-pointer items-center justify-center gap-3 border border-primary/40 bg-white/50 px-6 py-3 text-sm tracking-widest text-stone-900 shadow-sm transition-all duration-300 hover:border-primary hover:bg-white/80 disabled:cursor-wait disabled:opacity-50 dark:bg-stone-950/40 dark:text-stone-100 dark:hover:bg-stone-950/70"
                        >
                          <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 18 18">
                            <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.23-.16-1.8H9v3.4h4.84a4.14 4.14 0 0 1-1.8 2.72v2.25h2.92c1.7-1.57 2.68-3.88 2.68-6.57Z" />
                            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.25c-.81.54-1.84.86-3.04.86-2.35 0-4.34-1.58-5.05-3.72H.93v2.32A9 9 0 0 0 9 18Z" />
                            <path fill="#FBBC05" d="M3.95 10.71A5.42 5.42 0 0 1 3.67 9c0-.6.1-1.17.28-1.71V4.97H.93A9 9 0 0 0 0 9c0 1.45.35 2.82.93 4.03l3.02-2.32Z" />
                            <path fill="#EA4335" d="M9 3.57c1.32 0 2.5.45 3.44 1.34l2.58-2.58C13.46.88 11.43 0 9 0A9 9 0 0 0 .93 4.97l3.02 2.32C4.66 5.15 6.65 3.57 9 3.57Z" />
                          </svg>
                          <span>{isLoading ? t("processing") : t("continueWithGoogle")}</span>
                        </button>

                        <div className="flex items-center gap-3 text-[10px] tracking-widest text-[#72552c]/70 dark:text-[#fde68a]/60">
                          <div className="h-px flex-1 bg-[#c5a059]/30" />
                          <span>{t("or")}</span>
                          <div className="h-px flex-1 bg-[#c5a059]/30" />
                        </div>
                      </>
                    )}

                    {isRegistering && (
                      <LoginInput value={name} onChange={setName} placeholder={t("namePlaceholder")} disabled={isLoading} />
                    )}
                    <LoginInput value={email} onChange={setEmail} placeholder="seu-email@dominio.com" type="email" disabled={isLoading} />
                    <LoginInput value={password} onChange={setPassword} placeholder={t("passwordPlaceholder")} type="password" disabled={isLoading} />

                    {isRegistering && (
                      <label className="flex cursor-pointer items-start gap-3 rounded border border-[#c5a059]/25 bg-[#c5a059]/5 p-3 text-left text-xs leading-5 text-stone-700 transition-colors hover:border-[#c5a059]/45 dark:text-[#eee8dc]/75">
                        <input
                          type="checkbox"
                          checked={termsAccepted}
                          onChange={(event) => setTermsAccepted(event.target.checked)}
                          required
                          disabled={isLoading}
                          className="mt-1 h-4 w-4 shrink-0 accent-[#c5a059]"
                        />
                        <span>{NEMOSINE_LEGAL_CHECKBOX_LABEL}</span>
                      </label>
                    )}

                    <div className="space-y-3 pt-2">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="font-display group/btn relative w-full cursor-pointer overflow-hidden border border-primary/50 bg-stone-900 px-6 py-4 tracking-widest text-primary shadow-lg transition-all duration-500 hover:bg-primary hover:text-stone-900 disabled:cursor-wait disabled:opacity-50 dark:bg-stone-950"
                      >
                        <span className="relative z-10">{isLoading ? t("processing") : t("continue")}</span>
                      </button>
                      
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => {
                          setIsRegistering((current) => {
                            const next = !current;
                            if (!next) setTermsAccepted(false);
                            return next;
                          });
                          setError("");
                        }}
                        className="font-display w-full cursor-pointer overflow-hidden border border-[#c5a059]/40 bg-transparent px-6 py-3.5 tracking-widest text-[#72552c] dark:text-[#c5a059] hover:bg-[#c5a059]/10 transition-all duration-300 disabled:cursor-wait disabled:opacity-50 text-xs uppercase font-bold"
                      >
                        {isRegistering ? t("haveAccess") : t("register")}
                      </button>
                    </div>
                  </form>
                </div>

                <footer className="relative z-10 mt-auto pt-7 text-center">
                  <p className="text-xs leading-5 tracking-wider text-stone-600 dark:text-[#eee8dc]/60">
                    Ao continuar, você declara que leu e concorda com os{" "}
                    <Link href="/legal/termos-de-uso" className="underline transition-colors hover:text-[#c5a059]">
                      Termos de Uso
                    </Link>
                    , a{" "}
                    <Link href="/legal/privacidade" className="underline transition-colors hover:text-[#c5a059]">
                      Política de Privacidade
                    </Link>{" "}
                    e o{" "}
                    <Link href="/legal/uso-de-ia" className="underline transition-colors hover:text-[#c5a059]">
                      Aviso de Uso de Inteligência Artificial
                    </Link>{" "}
                    do Sistema Nemosine.
                  </p>
                </footer>
              </div>
            </div>
          </div>

          <div className="fixed right-6 top-6 z-20">
            <button
              className="cursor-pointer p-2 text-primary/60 transition-colors hover:text-primary"
              onClick={() => {
                const themes: AppTheme[] = ["dark", "light", "luanova", "crepusculo"];
                const nextIdx = (themes.indexOf(theme) + 1) % themes.length;
                setTheme(themes[nextIdx]);
              }}
              aria-label="Alternar tema"
            >
              <span className="material-icons">settings_brightness</span>
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function LoginInput({
  value,
  onChange,
  placeholder,
  type = "text",
  disabled
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  disabled: boolean;
}) {
  return (
    <div className="relative">
      <input
        className="peer w-full border-x-0 border-b-2 border-t-0 border-primary/30 bg-transparent py-3 text-lg text-stone-900 transition-all duration-300 placeholder:italic placeholder:text-stone-500/50 dark:placeholder:text-[#eee8dc]/40 focus:border-primary focus:ring-0 dark:text-white"
        placeholder={placeholder}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        disabled={disabled}
      />
      <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary transition-all duration-500 peer-focus:w-full" />
    </div>
  );
}
