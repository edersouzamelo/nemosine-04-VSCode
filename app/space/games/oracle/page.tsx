"use client";

import { useState, useEffect } from "react";
import { DECK, shuffleDeck, Card, BACK_OF_CARD_IMAGE } from "@/lib/deck";
import MedievalButton from "@/app/components/MedievalButton";
import Link from "next/link";
import { Geist } from "next/font/google";
import Navbar from "@/app/components/Navbar";
import InstitutionalFooter from "@/app/components/InstitutionalFooter";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

export default function OraclePage() {
    const [currentCard, setCurrentCard] = useState<Card | null>(null);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isShuffling, setIsShuffling] = useState(false);
    const shuffleDuration = 1120;

    const [isEmbedded, setIsEmbedded] = useState(false);
    useEffect(() => {
        if (typeof window !== "undefined") {
            setIsEmbedded(window.location.search.includes("embed=true") || window.self !== window.top);
        }
    }, []);

    const getPersonaSlug = (name: string) => {
        if (name === 'Bobo') return 'bobo-da-corte';
        if (name === 'Confessor') return 'confessor-2.0';
        if (name === 'Orquestrador') return 'orquestrador-arquiteto';
        return name.toLowerCase().replace(/\s+/g, '-');
    };

    const drawCard = () => {
        if (isShuffling) return;

        setIsFlipped(false);
        setIsShuffling(true);

        // Keep the draw hidden while the physical shuffle motion plays.
        setTimeout(() => {
            const shuffled = shuffleDeck(DECK);
            const randomCard = shuffled[0];
            setCurrentCard(randomCard);
            setIsShuffling(false);

            // Auto flip after shuffle
            setTimeout(() => setIsFlipped(true), 100);
        }, shuffleDuration);
    };

    return (
        <main className={`min-h-screen bg-[#0a0a0a] text-[#E5D0A1] ${geistSans.className} ${isEmbedded ? "p-0 overflow-y-auto" : ""}`}>
            {!isEmbedded && (
                <div className="sticky top-0 z-50">
                    <Navbar />
                </div>
            )}
            <div className={`relative flex flex-col items-center justify-center p-4 ${isEmbedded ? "min-h-full py-6" : "min-h-[calc(100vh-80px)]"}`}>

            {!isEmbedded && (
                <header className="absolute top-6 left-6 flex items-center gap-4">
                    <Link href="/space/games" className="text-gray-500 hover:text-[#C5A059] transition-colors">
                        ← Voltar à Sala
                    </Link>
                </header>
            )}

            <div className="text-center mb-8 animate-fade-in">
                <h1 className="text-3xl md:text-5xl medieval-header text-[#C5A059] mb-2">Oráculo dos Personas</h1>
                <p className="text-gray-400 max-w-md mx-auto">Concentre-se em uma questão e retire uma carta.</p>
            </div>

            <div
                className="oracle-deck relative isolate w-64 h-96 cursor-pointer group"
                style={{ perspective: '1000px' }}
                onClick={!isFlipped ? drawCard : undefined}
                aria-busy={isShuffling}
            >
                {isShuffling && (
                    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                        <div className="oracle-shuffle-card oracle-shuffle-card-left">
                            <img src={BACK_OF_CARD_IMAGE} alt="" className="h-full w-full rounded-xl object-cover" />
                        </div>
                        <div className="oracle-shuffle-card oracle-shuffle-card-right">
                            <img src={BACK_OF_CARD_IMAGE} alt="" className="h-full w-full rounded-xl object-cover" />
                        </div>
                        <div className="oracle-shuffle-glow" />
                    </div>
                )}
                <div
                    className={`relative w-full h-full transition-transform duration-700 ${isShuffling ? "oracle-shuffle-main" : ""}`}
                    style={{
                        transformStyle: 'preserve-3d',
                        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                    }}
                >

                    {/* Front (Card Back Image) */}
                    <div
                        className="absolute inset-0 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-[#333] overflow-hidden group-hover:shadow-[0_0_40px_rgba(197,160,89,0.3)] transition-shadow"
                        style={{ backfaceVisibility: 'hidden' }}
                    >
                        <img src={BACK_OF_CARD_IMAGE} alt="Verso" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-colors">
                            <span className={`text-[#C5A059] bg-black/80 px-4 py-2 rounded-full text-xs uppercase tracking-widest ${isShuffling ? "animate-pulse" : ""}`}>
                                {isShuffling ? "Embaralhando..." : "Toque para Tirar"}
                            </span>
                        </div>
                    </div>

                    {/* Back (The Revealed Card) */}
                    <div
                        className="absolute inset-0 rounded-xl shadow-[0_0_50px_rgba(197,160,89,0.4)] border border-[#C5A059] overflow-hidden bg-black"
                        style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                    >
                        {currentCard ? (
                            isEmbedded ? (
                                <a 
                                    href={`/agents/${getPersonaSlug(currentCard.name)}?embed=true`} 
                                    className="w-full h-full relative group/card block"
                                >
                                    <img src={currentCard.imagePath} alt={currentCard.name} className="w-full h-full object-contain p-2" />
                                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 z-10">
                                        <span className="bg-black/90 text-[#C5A059] px-4 py-2 rounded-full text-xs font-bold border border-[#C5A059] shadow-[0_0_15px_rgba(197,160,89,0.5)]">
                                            Falar com {currentCard.name}
                                        </span>
                                    </div>
                                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 text-center">
                                        <h2 className="text-2xl font-bold text-[#C5A059] drop-shadow-md group-hover/card:text-white transition-colors">{currentCard.name}</h2>
                                        <p className="text-xs text-gray-300 uppercase tracking-widest">{currentCard.suit} {currentCard.rank}</p>
                                    </div>
                                </a>
                            ) : (
                                <Link href={`/agents/${getPersonaSlug(currentCard.name)}`} className="w-full h-full relative group/card block">
                                    <img src={currentCard.imagePath} alt={currentCard.name} className="w-full h-full object-contain p-2" />
                                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 z-10">
                                        <span className="bg-black/90 text-[#C5A059] px-4 py-2 rounded-full text-xs font-bold border border-[#C5A059] shadow-[0_0_15px_rgba(197,160,89,0.5)]">
                                            Falar com {currentCard.name}
                                        </span>
                                    </div>
                                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 text-center">
                                        <h2 className="text-2xl font-bold text-[#C5A059] drop-shadow-md group-hover/card:text-white transition-colors">{currentCard.name}</h2>
                                        <p className="text-xs text-gray-300 uppercase tracking-widest">{currentCard.suit} {currentCard.rank}</p>
                                    </div>
                                </Link>
                            )
                        ) : (
                            <div className="w-full h-full bg-gray-900"></div>
                        )}
                    </div>

                </div>
            </div>

            <div className="mt-12 opacity-80">
                <MedievalButton onClick={drawCard} disabled={isShuffling}>
                    {isShuffling ? "Embaralhando..." : "Nova Tiragem"}
                </MedievalButton>
            </div>

            </div>
            {!isEmbedded && <InstitutionalFooter />}
        </main>
    );
}
