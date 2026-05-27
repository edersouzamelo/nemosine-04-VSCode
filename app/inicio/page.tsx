"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import { routeInitialIntent } from "../lib/onboardingRouting";

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

export default function InicioPage() {
  const router = useRouter();
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
    <main className="onboarding-page relative min-h-[100dvh] overflow-hidden bg-[#06070a] text-[#eee8dc]">
      <div className="onboarding-ambient absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(197,160,89,0.12),transparent_34%),linear-gradient(180deg,#0c0e13_0%,#06070a_58%,#030407_100%)]" />
      <div className="onboarding-ambient absolute inset-x-0 bottom-0 h-[42vh] opacity-25 bg-[radial-gradient(ellipse_at_bottom,rgba(70,64,59,0.42),transparent_65%)]" />
      <div className="onboarding-image absolute inset-0 opacity-[0.06] bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1600')] bg-cover bg-center mix-blend-screen" />

      <div className="relative z-[100]">
        <Navbar />
      </div>

      <section className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-5 py-9 sm:px-8 sm:py-12">
        <div className="onboarding-card w-full rounded-[28px] border border-[#c5a059]/15 bg-black/30 px-6 py-9 text-center shadow-[0_24px_90px_rgba(0,0,0,0.45)] backdrop-blur-md sm:px-14 sm:py-12">
          <h1 className="onboarding-heading font-serif text-4xl tracking-[0.12em] text-[#e7d4aa] sm:text-6xl">
            Nemosine Nous
          </h1>
          <h2 className="onboarding-heading mt-5 font-serif text-xl text-[#f1ece3] sm:text-2xl">
            Organize sua mente por vozes.
          </h2>
          <p className="onboarding-body mx-auto mt-6 max-w-xl text-sm leading-7 text-[#d7d1c8]/78 sm:text-base">
            Um sistema de personas para pensar melhor, decidir com mais clareza e transformar confusão em direção.
          </p>
          <p className="mx-auto mt-7 max-w-xl text-sm italic text-[#c5a059]/78">
            Entre pelo que você busca. O sistema encontra a voz certa.
          </p>

          <form onSubmit={handleStart} className="mx-auto mt-9 max-w-xl space-y-4">
            <input
              type="text"
              value={need}
              onChange={(event) => setNeed(event.target.value)}
              placeholder="O que você precisa agora?"
              className="onboarding-input w-full rounded-2xl border border-[#c5a059]/20 bg-black/35 px-5 py-4 text-base text-[#f1ece3] outline-none transition-colors placeholder:text-[#b8ad97]/45 focus:border-[#c5a059]/60"
            />
            <button
              type="submit"
              disabled={isRouting}
              className="w-full rounded-2xl bg-[#c5a059] px-5 py-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#111013] transition-colors hover:bg-[#d4b46f] disabled:cursor-wait disabled:opacity-70"
            >
              {isRouting ? "Conduzindo..." : "Começar"}
            </button>
          </form>

          <Link
            href="/agents"
            className="mt-7 inline-flex text-xs uppercase tracking-[0.2em] text-[#c5a059]/65 transition-colors hover:text-[#ddbd7a]"
          >
            Conhecer as personas
          </Link>
        </div>

        <div className="mt-6 grid w-full grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
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
      </section>

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
    </main>
  );
}
