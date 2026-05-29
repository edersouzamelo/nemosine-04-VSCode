"use client";

import { useMemo, useRef, useState } from "react";
import CardCollectionGrid from "../components/CardCollectionGrid";
import Navbar from "../components/Navbar";
import InstitutionalFooter from "../components/InstitutionalFooter";
import PlacesLevelGate from "../components/PlacesLevelGate";
import { ENTITIES, PLACES } from "../data/entities";
import { useLanguage } from "../components/LanguageProvider";
import AgentCard from "../components/AgentCard";

export default function PlacesPage() {
    const { language, entityName, t } = useLanguage();
    const [carouselMode, setCarouselMode] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const placesItems = useMemo(() => {
        return [...PLACES].sort((a, b) => {
            if (a === "Não-Lugar") return 1;
            if (b === "Não-Lugar") return -1;
            return 0;
        }).map((name) => {
            const slug = name.toLowerCase().replace(/\s+/g, "-");
            return { name, image: ENTITIES[slug]?.image, href: `/agents/${slug}` };
        });
    }, []);

    const scrollLeft = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: -300, behavior: "smooth" });
        }
    };

    const scrollRight = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: 300, behavior: "smooth" });
        }
    };

    return (
        <PlacesLevelGate>
            <main className="nemosine-main-container relative min-h-screen">
                {/* Dark Immersive Background */}
                <div className="fixed inset-0 z-0">
                    <div className="nemosine-bg-overlay absolute inset-0 z-10 backdrop-blur-[2px]"></div>
                    {/* Immersive placeholder background */}
                    <div className="nemosine-mental-castle-bg w-full h-full bg-[url('https://images.unsplash.com/photo-1505664194779-8beaceb93744?q=80&w=2000')] bg-cover bg-center"></div>
                </div>

                <Navbar />

                {/* Dashboard Grid */}
                <section className="relative z-10 p-4 md:p-8 lg:p-12">
                    <div className="max-w-[1600px] mx-auto">
                        <header className="mb-12 text-center relative flex flex-col items-center justify-center">
                            <h2 className="text-4xl font-display text-[#c5a059] mb-2 uppercase tracking-widest">{t("places")}</h2>
                            <p className="text-[10px] uppercase tracking-[0.3em] text-[#c5a059]/40">
                                {language.startsWith("pt") ? "Cenários de Processamento Cognitivo" : language === "es" ? "Escenarios de Procesamiento Cognitivo" : "Cognitive Processing Scenarios"}
                            </p>
                            
                            <div className="absolute right-0 bottom-0 pr-2">
                                <button
                                    type="button"
                                    onClick={() => setCarouselMode(!carouselMode)}
                                    title={carouselMode ? (language.startsWith("pt") ? "Ver em Grade" : language === "es" ? "Ver en Cuadrícula" : "View in Grid") : (language.startsWith("pt") ? "Ver em Carrossel" : language === "es" ? "Ver en Carrusel" : "View in Carousel")}
                                    className="flex items-center justify-center rounded-lg border border-[#c5a059]/40 bg-black/45 w-10 h-10 text-[#c5a059] transition-all hover:border-[#c5a059] hover:bg-[#c5a059]/10 cursor-pointer font-bold"
                                >
                                    <span className="material-icons text-xl">{carouselMode ? "grid_on" : "view_carousel"}</span>
                                </button>
                            </div>
                        </header>

                        {carouselMode ? (
                            <div className="relative group/carousel max-w-full">
                                {/* Navigation Buttons (desktop only) */}
                                <button
                                    type="button"
                                    onClick={scrollLeft}
                                    className="absolute left-[-20px] top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-10 h-10 rounded-full border border-[#c5a059]/40 bg-[#0a0a0c]/90 text-[#c5a059] hover:border-[#c5a059] hover:bg-[#c5a059]/10 transition-all cursor-pointer shadow-[0_0_15px_rgba(0,0,0,0.6)] focus:outline-none"
                                    aria-label="Scroll Left"
                                >
                                    <span className="text-xl">←</span>
                                </button>
                                
                                <button
                                    type="button"
                                    onClick={scrollRight}
                                    className="absolute right-[-20px] top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-10 h-10 rounded-full border border-[#c5a059]/40 bg-[#0a0a0c]/90 text-[#c5a059] hover:border-[#c5a059] hover:bg-[#c5a059]/10 transition-all cursor-pointer shadow-[0_0_15px_rgba(0,0,0,0.6)] focus:outline-none"
                                    aria-label="Scroll Right"
                                >
                                    <span className="text-xl">→</span>
                                </button>

                                {/* Horizontal Scroll Track */}
                                <div
                                    key="places-carousel-track"
                                    ref={scrollRef}
                                    className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-8 pt-4 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                                    style={{ paddingLeft: "calc(50% - 44vw)", paddingRight: "calc(50% - 44vw)" }}
                                >
                                    {placesItems.map((item) => (
                                        <div key={item.name} className="shrink-0 w-[65vw] sm:w-[180px] md:w-[200px] max-w-[220px] snap-center">
                                            <AgentCard
                                                name={item.name}
                                                displayName={entityName(item.name)}
                                                image={item.image}
                                                href={item.href}
                                                label="Lugar"
                                                className="aspect-[4/7]"
                                                flipOnMount={true}
                                                index={placesItems.indexOf(item)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <CardCollectionGrid collection="places" items={placesItems} />
                        )}
                    </div>
                </section>

                {/* Footer */}
                <footer className="relative z-20 p-8 border-t border-[#c5a059]/10 bg-black/60 text-center">
                    <p className="text-[10px] medieval-text-gold opacity-40 italic">
                        {language.startsWith("pt") ? '"Cada lugar abriga um segredo, e cada segredo é uma chave para o entendimento."' : language === "es" ? '"Cada lugar alberga un secreto, y cada secreto es una llave para el entendimiento."' : '"Each place harbors a secret, and each secret is a key to understanding."'}
                    </p>
                </footer>
                <InstitutionalFooter />
            </main>
        </PlacesLevelGate>
    );
}
