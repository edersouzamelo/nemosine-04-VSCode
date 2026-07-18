"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import InstitutionalFooter from "../components/InstitutionalFooter";
import Navbar from "../components/Navbar";
import OnboardingTour from "../components/OnboardingTour";
import { routeInitialIntent } from "../lib/onboardingRouting";
import { useLanguage } from "../components/LanguageProvider";
import { SYSTEM_VERSION_NAME, SYSTEM_VERSION_UPDATED_AT, getSystemBuildId } from "../lib/system_version";

const introductoryVideos = [
  {
    title: "O que é isso",
    href: "https://www.youtube.com/watch?v=1i1FseMXJ_A",
    thumbnail: "https://img.youtube.com/vi/1i1FseMXJ_A/hqdefault.jpg"
  },
  {
    title: "Pra que serve isso",
    href: "https://www.youtube.com/watch?v=AeDa1qsa7Ng",
    thumbnail: "https://img.youtube.com/vi/AeDa1qsa7Ng/hqdefault.jpg"
  },
  {
    title: "Por que ele é assim",
    href: "https://www.youtube.com/watch?v=HiK2IUreYM0",
    thumbnail: "https://img.youtube.com/vi/HiK2IUreYM0/hqdefault.jpg"
  },
  {
    title: "Trailer",
    href: "https://www.youtube.com/watch?v=J6P2EmmubAo",
    thumbnail: "https://img.youtube.com/vi/J6P2EmmubAo/hqdefault.jpg"
  }
];

const systemVersion = SYSTEM_VERSION_NAME;
const systemUpdatedAt = SYSTEM_VERSION_UPDATED_AT;
const systemBuild = getSystemBuildId();

export default function InicioPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [need, setNeed] = useState("");
  const [sensitiveRoute, setSensitiveRoute] = useState<{ href: string; name: string } | null>(null);
  const [isRouting, setIsRouting] = useState(false);

  const continueToRoute = (href: string, name: string) => {
    const text = need.trim();
    if (text) {
      window.localStorage.setItem("nemosine-onboarding-entry", JSON.stringify({
        destination: name,
        text
      }));
    } else {
      window.localStorage.removeItem("nemosine-onboarding-entry");
    }
    router.push(href);
  };

  const handleStart = async (event: FormEvent) => {
    event.preventDefault();
    setIsRouting(true);
    let destination = routeInitialIntent(need);
    try {
      const response = await fetch("/api/onboarding-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ need })
      });
      if (response.ok) {
        destination = await response.json();
      }
    } catch {
      // Local routing remains available when the orchestration service is unavailable.
    } finally {
      setIsRouting(false);
    }
    if (destination.requiresNotice) {
      setSensitiveRoute({ href: destination.href, name: destination.entityName });
      return;
    }
    continueToRoute(destination.href, destination.entityName);
  };

  return (
    <main className="onboarding-page relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#06070a] text-[#eee8dc]">
      <div className="onboarding-ambient absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(197,160,89,0.12),transparent_34%),linear-gradient(180deg,#0c0e13_0%,#06070a_58%,#030407_100%)]" />
      <div className="onboarding-ambient absolute inset-x-0 bottom-0 h-[42vh] opacity-25 bg-[radial-gradient(ellipse_at_bottom,rgba(70,64,59,0.42),transparent_65%)]" />
      <div className="onboarding-image nemosine-mental-castle-bg absolute inset-0 bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1600')] bg-cover bg-center" />

      <div className="relative z-[100]">
        <Navbar />
      </div>

      <section className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-5 py-9 sm:px-8 sm:py-12 onboarding-container">
        <div className="onboarding-card w-full rounded-[28px] border-2 border-[#c5a059]/35 bg-black/60 px-6 py-9 text-center shadow-[0_35px_100px_rgba(0,0,0,0.9),0_0_50px_rgba(197,160,89,0.08)] backdrop-blur-xl sm:px-14 sm:py-12 relative overflow-hidden">
          {/* Inner Golden Sacred Frame */}
          <div className="absolute inset-3 rounded-[20px] border border-[#c5a059]/15 pointer-events-none z-0" />

          {/* Elegant Medieval Gothic Ornaments */}
          <div className="absolute top-5 left-5 w-8 h-8 border-t border-l border-[#c5a059]/50 pointer-events-none z-10" />
          <div className="absolute top-5 right-5 w-8 h-8 border-t border-r border-[#c5a059]/50 pointer-events-none z-10" />
          <div className="absolute bottom-5 left-5 w-8 h-8 border-b border-l border-[#c5a059]/50 pointer-events-none z-10" />
          <div className="absolute bottom-5 right-5 w-8 h-8 border-b border-r border-[#c5a059]/50 pointer-events-none z-10" />

          {/* Subtle gold circular blur behind logo */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-[#c5a059]/5 blur-3xl pointer-events-none" />

          <h1 className="flex justify-center relative z-10">
            <img
              src="/assets/nemosine-logo.png"
              alt="Nemosine Nous"
              className="h-24 w-auto object-contain sm:h-32 drop-shadow-[0_0_25px_rgba(197,160,89,0.3)]"
            />
          </h1>
          <h2 className="onboarding-heading mt-8 font-display text-3xl uppercase tracking-[0.18em] text-[#c5a059] sm:text-4xl drop-shadow-[0_2px_8px_rgba(197,160,89,0.4)] relative z-10">
            {t("welcomeTitle")}
          </h2>
          <p className="mx-auto mt-6 max-w-xl font-body text-xl font-light leading-relaxed text-[#eee8dc]/90 sm:text-2xl italic relative z-10">
            {t("welcomeSubtitle")}
          </p>
          <p className="mx-auto mt-4 max-w-xl font-display text-xs uppercase tracking-[0.25em] text-[#c5a059]/80 relative z-10">
            {t("welcomeHelper")}
          </p>

          <form onSubmit={handleStart} className="mx-auto mt-10 max-w-xl flex flex-col gap-5 relative z-10">
            <input
              type="text"
              value={need}
              onChange={(event) => setNeed(event.target.value)}
              placeholder={t("searchPlaceholder")}
              data-tour="travessia-input"
              className="onboarding-input w-full rounded-xl border border-[#c5a059]/25 bg-black/55 px-5 py-4 font-body text-lg text-[#eee8dc] outline-none transition-all placeholder:text-[#b8ad97]/30 focus:border-[#c5a059]/60 focus:bg-black/75 shadow-[inset_0_2px_5px_rgba(0,0,0,0.7)]"
            />
            
            <div className="relative group overflow-hidden rounded-xl border border-[#c5a059]/40 hover:border-[#c5a059]/85 shadow-[0_0_20px_rgba(197,160,89,0.1)] hover:shadow-[0_0_35px_rgba(197,160,89,0.3)] transition-all duration-300">
              {/* Solemn Glow Behind */}
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/15 via-red-700/25 to-amber-500/15 opacity-70 blur-md group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              
              <button
                type="submit"
                disabled={isRouting}
                data-tour="iniciar-travessia"
                className="w-full relative px-8 py-5 font-display font-bold uppercase tracking-[0.35em] text-xs sm:text-sm bg-gradient-to-r from-[#6b1e0f] via-[#993b1b] to-[#6b1e0f] text-[#fde68a] hover:from-[#7f2412] hover:via-[#ad431f] hover:to-[#7f2412] hover:text-[#fffbeb] border-y-2 border-[#c5a059] transition-all duration-300 disabled:cursor-wait disabled:opacity-70 cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
              >
                <span className="relative z-10 flex items-center justify-center gap-3 drop-shadow-[0_0_6px_rgba(253,230,138,0.4)]">
                  <span className="text-sm sm:text-base animate-pulse">⚜️</span>
                  {isRouting ? t("processing") : t("initiate")}
                  <span className="text-sm sm:text-base animate-pulse">⚜️</span>
                </span>
                
                {/* Decorative gold metal corners */}
                <div className="absolute top-0.5 left-0.5 w-2 h-2 border-t-2 border-l-2 border-[#fde68a] opacity-60"></div>
                <div className="absolute top-0.5 right-0.5 w-2 h-2 border-t-2 border-r-2 border-[#fde68a] opacity-60"></div>
                <div className="absolute bottom-0.5 left-0.5 w-2 h-2 border-b-2 border-l-2 border-[#fde68a] opacity-60"></div>
                <div className="absolute bottom-0.5 right-0.5 w-2 h-2 border-b-2 border-r-2 border-[#fde68a] opacity-60"></div>
                
                {/* Golden flare transition effect */}
                <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-[#fde68a]/20 to-transparent"></div>
              </button>
            </div>

            <Link
              href="/agents"
              className="self-center font-display text-xs uppercase tracking-[0.25em] text-[#c5a059]/70 transition-all duration-300 hover:text-[#fde68a] hover:scale-105"
            >
              {t("explorePersonas")}
            </Link>
          </form>
        </div>

        <div className="mt-6 grid w-full grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4 video-grid-container">
          {introductoryVideos.map((video) => (
            <a
              key={video.href}
              href={video.href}
              target="_blank"
              rel="noopener noreferrer"
              className="video-card group overflow-hidden rounded-xl border border-[#c5a059]/15 bg-black/30 transition-colors hover:border-[#c5a059]/45"
            >
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="h-full w-full object-cover opacity-72 transition-all group-hover:scale-105 group-hover:opacity-95"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <span className="material-icons rounded-full bg-black/55 p-1.5 text-lg text-[#e7d4aa] sm:text-2xl">
                    play_arrow
                  </span>
                </span>
              </div>
              <p className="onboarding-body px-2 py-2 text-center text-[10px] uppercase tracking-[0.1em] text-[#d7d1c8]/78 sm:px-3 sm:text-xs">
                {video.title}
              </p>
            </a>
          ))}
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @media (min-width: 900px) {
            .onboarding-container {
              flex-direction: row !important;
              max-width: 1250px !important;
              align-items: stretch !important;
              justify-content: center !important;
              gap: 28px !important;
              padding-top: 24px !important;
              padding-bottom: 24px !important;
              height: auto !important;
              min-height: 0 !important;
            }
            .onboarding-card {
              flex: 1 !important;
              height: 520px !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: center !important;
              padding: 36px 48px !important;
              border-radius: 24px !important;
            }
            .onboarding-card h1 img {
              height: 78px !important;
              margin: 0 auto !important;
            }
            .onboarding-heading {
              font-size: 2.25rem !important;
              margin-top: 15px !important;
            }
            .onboarding-card p {
              margin-top: 8px !important;
              font-size: 16.5px !important;
              line-height: 1.5 !important;
            }
            .onboarding-card p.italic {
              font-size: 21px !important;
            }
            .onboarding-card form {
              margin-top: 24px !important;
              gap: 15px !important;
            }
            .onboarding-card form input {
              padding: 14px 20px !important;
              font-size: 18px !important;
            }
            .onboarding-card form button {
              padding: 16px 28px !important;
            }
            .onboarding-card a.mt-8 {
              margin-top: 18px !important;
              font-size: 14px !important;
            }
            .video-grid-container {
              display: flex !important;
              flex-direction: column !important;
              width: 360px !important;
              gap: 10px !important;
              margin-top: 0 !important;
              flex-shrink: 0 !important;
              height: 520px !important;
              max-height: 520px !important;
              overflow-y: auto !important;
              padding-right: 6px !important;
            }
            /* Custom scrollbar for video column */
            .video-grid-container::-webkit-scrollbar {
              width: 5px;
            }
            .video-grid-container::-webkit-scrollbar-thumb {
              background: rgba(197, 160, 89, 0.35);
              border-radius: 5px;
            }
            .video-card {
              display: flex !important;
              flex-direction: row !important;
              align-items: center !important;
              gap: 14px !important;
              padding: 10px !important;
              text-align: left !important;
              background: rgba(0, 0, 0, 0.5) !important;
              border-radius: 12px !important;
              height: 118px !important;
              flex-shrink: 0 !important;
            }
            .video-card .relative {
              width: 130px !important;
              height: 73px !important;
              flex-shrink: 0 !important;
              aspect-ratio: auto !important;
              border-radius: 8px !important;
              overflow: hidden !important;
            }
            .video-card p {
              padding: 0 4px !important;
              text-align: left !important;
              font-size: 15px !important;
              line-height: 1.4 !important;
              color: rgba(231, 212, 170, 0.9) !important;
            }
          }

          /* Sophisticated entry and float animations */
          @keyframes subtle-float-up {
            0% {
              opacity: 0;
              transform: translateY(18px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .onboarding-card {
            animation: subtle-float-up 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            transition: border-color 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .onboarding-card:hover {
            border-color: rgba(197, 160, 89, 0.65) !important;
            box-shadow: 0 45px 120px rgba(0,0,0,0.92), 0 0 60px rgba(197,160,89,0.15) !important;
            transform: translateY(-2px);
          }

          .video-card {
            opacity: 0;
            animation: subtle-float-up 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            transition: border-color 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .video-card:nth-child(1) { animation-delay: 0.15s; }
          .video-card:nth-child(2) { animation-delay: 0.3s; }
          .video-card:nth-child(3) { animation-delay: 0.45s; }
          .video-card:nth-child(4) { animation-delay: 0.6s; }

          .video-card:hover {
            border-color: rgba(197, 160, 89, 0.55) !important;
            transform: translateY(-3px) scale(1.015);
            box-shadow: 0 12px 30px rgba(0,0,0,0.65), 0 0 20px rgba(197,160,89,0.12) !important;
          }
        `}} />
      </section>

      <div className="relative z-10 mx-auto mb-8 flex w-full max-w-5xl flex-wrap items-center justify-center gap-3 px-5 text-center font-display text-[10px] uppercase tracking-[0.22em] text-[#c5a059]/70">
        <span className="rounded-full border border-[#c5a059]/20 bg-black/35 px-4 py-2">
          {systemVersion}
        </span>
        <span className="rounded-full border border-[#c5a059]/20 bg-black/35 px-4 py-2">
          Atualizado em {systemUpdatedAt}
        </span>
        <span className="rounded-full border border-[#c5a059]/20 bg-black/35 px-4 py-2">
          Status: {process.env.NEXT_PUBLIC_VERCEL_ENV || "Local"}
        </span>
        <span className="rounded-full border border-[#c5a059]/20 bg-black/35 px-4 py-2 text-[#c8bfaf]/55">
          Build {systemBuild}
        </span>
      </div>

      {sensitiveRoute && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm">
          <div className="onboarding-card max-w-md rounded-2xl border border-[#c5a059]/25 bg-[#0c0d11] p-6 text-left shadow-2xl">
            <p className="onboarding-body text-sm leading-6 text-[#e5ddd0]">
              Este espaço é simbólico e reservado, mas não substitui proteção técnica real de dados.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setSensitiveRoute(null)}
                className="flex-1 rounded-xl border border-[#c5a059]/25 px-4 py-3 text-xs uppercase tracking-widest text-[#c5a059]/75"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => continueToRoute(sensitiveRoute.href, sensitiveRoute.name)}
                className="flex-1 rounded-xl bg-[#c5a059] px-4 py-3 text-xs font-bold uppercase tracking-widest text-black"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      <InstitutionalFooter />
      <OnboardingTour />
    </main>
  );
}
