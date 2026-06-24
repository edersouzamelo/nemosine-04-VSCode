"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LanguageSelector, useLanguage, AppTheme } from "../components/LanguageProvider";
import { NEMOSINE_LEGAL_CHECKBOX_LABEL } from "../lib/legalConsent";

const LOGIN_BACKGROUNDS = [
  "/assets/login-castle-door.png",
  "/assets/login-castle-sunrise.png",
  "/assets/login-castle-starry.png",
  "/assets/login-castle-eclipse.png",
  "/assets/login-castle-crimson.png"
];

function pickLoginBackground() {
  return LOGIN_BACKGROUNDS[Math.floor(Math.random() * LOGIN_BACKGROUNDS.length)];
}

export default function AccessPage() {
  const router = useRouter();
  const { t, theme, setTheme } = useLanguage();
  const [callbackUrl, setCallbackUrl] = useState("/inicio");
  const [showGrimoire, setShowGrimoire] = useState(false);
  const [loginBackground, setLoginBackground] = useState(() => pickLoginBackground());
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [vortexReady, setVortexReady] = useState(false);
  const [activeVortex, setActiveVortex] = useState(0);
  const vortexARef = useRef<HTMLVideoElement>(null);
  const vortexBRef = useRef<HTMLVideoElement>(null);
  const vortexTimerRef = useRef<number | null>(null);
  const vortexPauseTimerRef = useRef<number | null>(null);
  const vortexStartedRef = useRef(false);

  useEffect(() => {
    const target = new URLSearchParams(window.location.search).get("callbackUrl");
    if (target?.startsWith("/") && !target.startsWith("//")) {
      setCallbackUrl(target);
    }
  }, []);

  const clearVortexTimers = () => {
    if (vortexTimerRef.current) {
      window.clearTimeout(vortexTimerRef.current);
      vortexTimerRef.current = null;
    }
    if (vortexPauseTimerRef.current) {
      window.clearTimeout(vortexPauseTimerRef.current);
      vortexPauseTimerRef.current = null;
    }
  };

  const armVortexCrossfade = (currentIndex: number) => {
    if (vortexTimerRef.current) {
      window.clearTimeout(vortexTimerRef.current);
      vortexTimerRef.current = null;
    }
    if (showGrimoire) return;

    const currentVideo = currentIndex === 0 ? vortexARef.current : vortexBRef.current;
    if (!currentVideo || !Number.isFinite(currentVideo.duration) || currentVideo.duration <= 2) {
      vortexTimerRef.current = window.setTimeout(() => armVortexCrossfade(currentIndex), 300);
      return;
    }

    const crossfadeMs = 2200;
    const fadeLeadMs = 2600;
    const delayMs = Math.max(700, currentVideo.duration * 1000 - fadeLeadMs);

    vortexTimerRef.current = window.setTimeout(() => {
      const nextIndex = currentIndex === 0 ? 1 : 0;
      const nextVideo = nextIndex === 0 ? vortexARef.current : vortexBRef.current;
      if (!nextVideo) return;

      nextVideo.currentTime = 0;
      nextVideo.play().catch(() => undefined);
      setActiveVortex(nextIndex);

      vortexPauseTimerRef.current = window.setTimeout(() => {
        currentVideo.pause();
        currentVideo.currentTime = 0;
      }, crossfadeMs + 120);
      armVortexCrossfade(nextIndex);
    }, delayMs);
  };

  useEffect(() => {
    return () => clearVortexTimers();
  }, []);

  useEffect(() => {
    if (!showGrimoire) return;
    clearVortexTimers();
    vortexARef.current?.pause();
    vortexBRef.current?.pause();
  }, [showGrimoire]);

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
            ref={vortexARef}
            autoPlay
            muted
            playsInline
            preload="auto"
            onCanPlay={() => {
              setVortexReady(true);
              if (!vortexStartedRef.current) {
                vortexStartedRef.current = true;
                armVortexCrossfade(0);
              }
            }}
            onLoadedData={() => setVortexReady(true)}
            className={`nemosine-vortex-intro nemosine-vortex-layer absolute inset-0 h-full w-full object-cover ${vortexReady ? "nemosine-vortex-intro-ready" : ""} ${vortexReady && activeVortex === 0 ? "nemosine-vortex-layer-active" : ""}`}
          >
            <source src="/assets/background.mp4" type="video/mp4" />
          </video>
          <video
            ref={vortexBRef}
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
            className={`nemosine-vortex-intro nemosine-vortex-layer absolute inset-0 h-full w-full object-cover ${vortexReady ? "nemosine-vortex-intro-ready" : ""} ${vortexReady && activeVortex === 1 ? "nemosine-vortex-layer-active" : ""}`}
          >
            <source src="/assets/background.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-[#1a0f0a]/25 to-black/80" />
          <div className="relative z-10 mt-16 flex flex-col items-center gap-6 px-6 text-center animate-fade-in">
            <div className="nemosine-logo-shine w-full max-w-3xl drop-shadow-[0_0_25px_rgba(197,160,89,0.4)]">
              <img
                src="/assets/nemosine-logo.png"
                alt="Nemosine Nous"
                className="relative z-10 h-auto w-full object-contain animate-fade-in-slow"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setLoginBackground(pickLoginBackground());
                setShowGrimoire(true);
              }}
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
        <div className="login-screen login-castle-gate absolute inset-0 z-40 flex items-center justify-center overflow-y-auto p-4 font-serif text-stone-800 transition-colors duration-500 dark:text-stone-200 md:justify-start md:px-[clamp(2rem,6vw,6.5rem)] md:py-8">
          <div className="login-castle-stage" aria-hidden="true">
            <div
              className="login-castle-art"
              style={{ backgroundImage: `url("${loginBackground}")` }}
            />
          </div>

          <div className="login-form-shell relative z-10 w-full max-w-[22rem] py-5 sm:max-w-[23rem] md:max-w-[21.5rem] lg:max-w-[22.5rem]">
            <div className="grimoire-border access-grimoire-frame overflow-hidden rounded-md bg-[#c5a059]/20 p-1">
              <div className="access-grimoire-card relative flex flex-col justify-between rounded-md bg-[#fbf7ee]/95 px-5 py-6 shadow-2xl backdrop-blur-sm dark:bg-[#08090d]/92 sm:px-6 sm:py-7">
                <span className="material-icons absolute left-2 top-2 text-3xl text-primary opacity-60">auto_awesome</span>
                <span className="material-icons absolute right-2 top-2 scale-x-[-1] text-3xl text-primary opacity-60">auto_awesome</span>

                <div className="space-y-4 text-center">
                  <header>
                    <h1 className="gold-glow font-display mb-2 text-xl uppercase tracking-widest text-primary md:text-2xl">
                      Nemosine Nous
                    </h1>
                    <div className="mx-auto h-px w-24 bg-primary opacity-40" />
                  </header>
                  <div className="flex justify-center">
                    <LanguageSelector dark={theme === "dark"} />
                  </div>
                  <div className="space-y-2">
                    <h2 className="font-display text-lg font-bold uppercase tracking-widest text-[#72552c] dark:text-[#fde68a] md:text-xl">
                      {isRegistering ? t("registerTitle") : t("loginTitle")}
                    </h2>
                    <p className="text-[13px] italic text-stone-700 dark:text-[#eee8dc]/80">
                      {isRegistering ? t("registerPrompt") : t("loginPrompt")}
                    </p>
                  </div>

                  <form onSubmit={handleAuth} className="space-y-4 pt-2">
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
                          className="font-display flex w-full cursor-pointer items-center justify-center gap-3 border border-primary/40 bg-white/50 px-4 py-2.5 text-[11px] tracking-widest text-stone-900 shadow-sm transition-all duration-300 hover:border-primary hover:bg-white/80 disabled:cursor-wait disabled:opacity-50 dark:bg-stone-950/40 dark:text-stone-100 dark:hover:bg-stone-950/70 sm:text-xs"
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
                        className="font-display group/btn relative w-full cursor-pointer overflow-hidden border border-primary/50 bg-stone-900 px-5 py-3 text-xs tracking-widest text-primary shadow-lg transition-all duration-500 hover:bg-primary hover:text-stone-900 disabled:cursor-wait disabled:opacity-50 dark:bg-stone-950"
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
                        className="font-display w-full cursor-pointer overflow-hidden border border-[#c5a059]/40 bg-transparent px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-[#72552c] transition-all duration-300 hover:bg-[#c5a059]/10 disabled:cursor-wait disabled:opacity-50 dark:text-[#c5a059]"
                      >
                        {isRegistering ? t("haveAccess") : t("register")}
                      </button>
                    </div>
                  </form>
                </div>

                <footer className="relative z-10 mt-auto pt-5 text-center">
                  <p className="text-[11px] leading-5 tracking-wider text-stone-600 dark:text-[#eee8dc]/60">
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

          <div className="fixed right-4 top-4 z-20 sm:right-6 sm:top-6">
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
        className="peer w-full border-x-0 border-b-2 border-t-0 border-primary/30 bg-transparent py-2.5 text-base text-stone-900 transition-all duration-300 placeholder:italic placeholder:text-stone-500/50 dark:placeholder:text-[#eee8dc]/40 focus:border-primary focus:ring-0 dark:text-white"
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
