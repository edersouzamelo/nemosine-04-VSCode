"use client";

import { useState } from "react";
import { DECK, shuffleDeck, Card, BACK_OF_CARD_IMAGE } from "@/lib/deck";
import MedievalButton from "@/app/components/MedievalButton";
import Link from "next/link";
import { Geist } from "next/font/google";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

export default function OraclePage() {
    const [currentCard, setCurrentCard] = useState<Card | null>(null);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isShuffling, setIsShuffling] = useState(false);

    const drawCard = () => {
        if (isShuffling) return;

        setIsFlipped(false);
        setIsShuffling(true);

        // Simulate shuffling time
        setTimeout(() => {
            const shuffled = shuffleDeck(DECK);
            const randomCard = shuffled[0];
            setCurrentCard(randomCard);
            setIsShuffling(false);

            // Auto flip after shuffle
            setTimeout(() => setIsFlipped(true), 100);
        }, 800);
    };

    return (
        <main className={`min-h-screen bg-[#0a0a0a] text-[#E5D0A1] ${geistSans.className} flex flex-col items-center justify-center p-4`}>

            <header className="absolute top-6 left-6 flex items-center gap-4">
                <Link href="/space/games" className="text-gray-500 hover:text-[#C5A059] transition-colors">
                    ← Voltar à Sala
                </Link>
            </header>

            <div className="text-center mb-8 animate-fade-in">
                <h1 className="text-3xl md:text-5xl medieval-header text-[#C5A059] mb-2">Oráculo dos Personas</h1>
                <p className="text-gray-400 max-w-md mx-auto">Concentre-se em uma questão e retire uma carta.</p>
            </div>

            <div className="relative w-64 h-96 perspective-1000 cursor-pointer group" onClick={drawCard}>
                <div className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${isFlipped ? "rotate-y-180" : ""}`}>

                    {/* Front (Card Back Image) */}
                    <div className="absolute inset-0 backface-hidden rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-[#333] overflow-hidden group-hover:shadow-[0_0_40px_rgba(197,160,89,0.3)] transition-shadow">
                        <img src={BACK_OF_CARD_IMAGE} alt="Verso" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-colors">
                            <span className={`text-[#C5A059] bg-black/80 px-4 py-2 rounded-full text-xs uppercase tracking-widest ${isShuffling ? "animate-pulse" : ""}`}>
                                {isShuffling ? "Embaralhando..." : "Toque para Tirar"}
                            </span>
                        </div>
                    </div>

                    {/* Back (The Revealed Card) */}
                    <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-xl shadow-[0_0_50px_rgba(197,160,89,0.4)] border border-[#C5A059] overflow-hidden bg-black">
                        {currentCard ? (
                            <>
                                <img src={currentCard.imagePath} alt={currentCard.name} className="w-full h-full object-contain p-2" />
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 text-center">
                                    <h2 className="text-2xl font-bold text-[#C5A059] drop-shadow-md">{currentCard.name}</h2>
                                    <p className="text-xs text-gray-300 uppercase tracking-widest">{currentCard.suit} {currentCard.rank}</p>
                                </div>
                            </>
                        ) : (
                            <div className="w-full h-full bg-gray-900"></div>
                        )}
                    </div>

                </div>
            </div>

            <div className="mt-12 opacity-80">
                <MedievalButton onClick={drawCard} disabled={isShuffling}>
                    {isShuffling ? "Consultando..." : "Nova Tiragem"}
                </MedievalButton>
            </div>

        </main>
    );
}
