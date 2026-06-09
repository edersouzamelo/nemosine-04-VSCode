"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "./LanguageProvider";
import Navbar from "./Navbar";
import InstitutionalFooter from "./InstitutionalFooter";

export default function PlacesLevelGate({ children }: { children: React.ReactNode }) {
    const { language, level, t } = useLanguage();
    // Guard against the hydration race: localStorage is read inside a useEffect in
    // LanguageProvider, so on the very first render `level` is still "Peregrino".
    // We wait one tick after mount before enforcing the gate.
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        // This runs after LanguageProvider has already applied the stored level.
        setHydrated(true);
    }, []);

    // While hydrating show nothing (avoids flash of wrong content).
    if (!hydrated) return null;
    if (level !== "Soberano") {
        const copy = language === "es"
            ? {
                eyebrow: "Umbral sellado",
                title: "Los Lugares aun no despiertan.",
                body: "Para cruzar este portico y acceder a los Lugares de la Mente, debes alcanzar el nivel Soberano.",
                cta: "Seguir la Travesia",
            }
            : language.startsWith("pt")
                ? {
                    eyebrow: "Limiar selado",
                    title: "Os Lugares ainda nao despertaram.",
                    body: "Para atravessar este portico e acessar os Lugares da Mente, voce precisa ser do nivel Soberano.",
                    cta: "Seguir a Travessia",
                }
                : {
                    eyebrow: "Sealed threshold",
                    title: "The Places have not awakened yet.",
                    body: "To cross this gate and access the Places of the Mind, you need to reach the Sovereign level.",
                    cta: "Continue the Crossing",
                };

        return (
            <main className="nemosine-main-container relative min-h-screen overflow-hidden">
                <div className="fixed inset-0 z-0">
                    <div className="absolute inset-0 bg-[#050507]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(197,160,89,0.12),transparent_34%),linear-gradient(180deg,rgba(5,5,7,0.96),rgba(10,10,12,1))]" />
                </div>

                <Navbar />

                <section className="relative z-10 flex min-h-[72vh] items-center justify-center px-4 py-16">
                    <div className="w-full max-w-3xl border-y border-[#c5a059]/30 bg-black/55 px-6 py-12 text-center shadow-[0_0_60px_rgba(0,0,0,0.55)] backdrop-blur-md sm:px-10">
                        <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.35em] text-[#c5a059]/55">
                            {copy.eyebrow}
                        </p>
                        <h1 className="font-display text-3xl uppercase tracking-[0.16em] text-[#c5a059] sm:text-5xl">
                            {copy.title}
                        </h1>
                        <p className="mx-auto mt-6 max-w-xl font-body text-sm leading-7 text-[#eee8dc]/75 sm:text-base">
                            {copy.body}
                        </p>
                        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                            <Link
                                href="/space/travessia"
                                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#c5a059]/45 bg-[#c5a059]/10 px-5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#c5a059] transition-all hover:border-[#c5a059] hover:bg-[#c5a059]/20"
                            >
                                {copy.cta}
                            </Link>
                            <Link
                                href="/agents"
                                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/10 bg-black/35 px-5 text-[10px] font-bold uppercase tracking-[0.22em] text-white/55 transition-all hover:border-white/25 hover:text-white/80"
                            >
                                {t("personas")}
                            </Link>
                        </div>
                    </div>
                </section>

                <InstitutionalFooter />
            </main>
        );
    }

    return children;
}
