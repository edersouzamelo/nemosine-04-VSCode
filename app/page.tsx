"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { routeInitialIntent } from "./lib/onboardingRouting";

export default function Home() {
  const router = useRouter();
  const [need, setNeed] = useState("");
  const [sensitiveRoute, setSensitiveRoute] = useState<{ href: string; name: string } | null>(null);

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

  const handleStart = (event: FormEvent) => {
    event.preventDefault();
    const destination = routeInitialIntent(need);
    if (destination.requiresNotice) {
      setSensitiveRoute({ href: destination.href, name: destination.entityName });
      return;
    }
    continueToRoute(destination.href, destination.entityName);
  };

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#06070a] text-[#eee8dc]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(197,160,89,0.12),transparent_34%),linear-gradient(180deg,#0c0e13_0%,#06070a_58%,#030407_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[42vh] opacity-25 bg-[radial-gradient(ellipse_at_bottom,rgba(70,64,59,0.42),transparent_65%)]" />
      <div className="absolute inset-0 opacity-[0.06] bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1600')] bg-cover bg-center mix-blend-screen" />

      <section className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-3xl items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full rounded-[28px] border border-[#c5a059]/15 bg-black/30 px-6 py-10 text-center shadow-[0_24px_90px_rgba(0,0,0,0.45)] backdrop-blur-md sm:px-14 sm:py-14">
          <p className="mb-8 text-[10px] uppercase tracking-[0.42em] text-[#c5a059]/70">
            Narrador
          </p>

          <h1 className="font-serif text-4xl tracking-[0.12em] text-[#e7d4aa] sm:text-6xl">
            Nemosine Nous
          </h1>
          <h2 className="mt-5 font-serif text-xl text-[#f1ece3] sm:text-2xl">
            Organize sua mente por vozes.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-[#d7d1c8]/78 sm:text-base">
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
              className="w-full rounded-2xl border border-[#c5a059]/20 bg-black/35 px-5 py-4 text-base text-[#f1ece3] outline-none transition-colors placeholder:text-[#b8ad97]/45 focus:border-[#c5a059]/60"
            />
            <button
              type="submit"
              className="w-full rounded-2xl bg-[#c5a059] px-5 py-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#111013] transition-colors hover:bg-[#d4b46f]"
            >
              Começar
            </button>
          </form>

          <Link
            href="/agents"
            className="mt-7 inline-flex text-xs uppercase tracking-[0.2em] text-[#c5a059]/65 transition-colors hover:text-[#ddbd7a]"
          >
            Conhecer as personas
          </Link>
        </div>
      </section>

      {sensitiveRoute && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm">
          <div className="max-w-md rounded-2xl border border-[#c5a059]/25 bg-[#0c0d11] p-6 text-left shadow-2xl">
            <p className="text-sm leading-6 text-[#e5ddd0]">
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
