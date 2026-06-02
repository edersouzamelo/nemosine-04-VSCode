"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Geist } from "next/font/google";
import Navbar from "@/app/components/Navbar";
import InstitutionalFooter from "@/app/components/InstitutionalFooter";
import { ENTITIES, PERSONAS, PLACES } from "@/app/data/entities";
import { BACK_OF_CARD_IMAGE } from "@/lib/deck";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

type DifficultyId = "vassalo" | "cavaleiro" | "nobre" | "soberano";

type MemorySourceCard = {
    id: string;
    name: string;
    type: "persona" | "place";
    image?: string;
};

type MemoryCard = MemorySourceCard & {
    instanceId: string;
    pairId: string;
};

const DIFFICULTIES: Array<{
    id: DifficultyId;
    title: string;
    subtitle: string;
    pairs: number;
}> = [
    { id: "vassalo", title: "Vassalo", subtitle: "12 cartas", pairs: 6 },
    { id: "cavaleiro", title: "Cavaleiro", subtitle: "20 cartas", pairs: 10 },
    { id: "nobre", title: "Nobre", subtitle: "28 cartas", pairs: 14 },
    { id: "soberano", title: "Soberano", subtitle: "36 cartas", pairs: 18 },
];

function shuffle<T>(items: T[]): T[] {
    const next = [...items];
    for (let i = next.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
    }
    return next;
}

function slugify(name: string) {
    return name.toLowerCase().replace(/\s+/g, "-");
}

function buildSourceCards(): MemorySourceCard[] {
    const personaCards = PERSONAS.map((name) => {
        const entity = ENTITIES[slugify(name)];
        return {
            id: `persona-${slugify(name)}`,
            name,
            type: "persona" as const,
            image: entity?.image || entity?.landscapeImage,
        };
    });

    const placeCards = PLACES.map((name) => {
        const entity = ENTITIES[slugify(name)];
        return {
            id: `place-${slugify(name)}`,
            name,
            type: "place" as const,
            image: entity?.image || entity?.landscapeImage,
        };
    });

    return [...personaCards, ...placeCards];
}

function makeDeck(difficulty: DifficultyId): MemoryCard[] {
    const pairCount = DIFFICULTIES.find((item) => item.id === difficulty)?.pairs || 6;
    const selected = shuffle(buildSourceCards()).slice(0, pairCount);
    return shuffle(
        selected.flatMap((card) => [
            { ...card, pairId: card.id, instanceId: `${card.id}-a` },
            { ...card, pairId: card.id, instanceId: `${card.id}-b` },
        ])
    );
}

export default function MemoryGamePage() {
    const [isEmbedded, setIsEmbedded] = useState(false);
    const [difficulty, setDifficulty] = useState<DifficultyId>("vassalo");
    const [deck, setDeck] = useState<MemoryCard[]>([]);
    const [flipped, setFlipped] = useState<string[]>([]);
    const [matched, setMatched] = useState<Set<string>>(new Set());
    const [moves, setMoves] = useState(0);
    const [startedAt, setStartedAt] = useState<number | null>(null);
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setIsEmbedded(window.location.search.includes("embed=true") || window.self !== window.top);
        }
    }, []);

    const currentDifficulty = useMemo(
        () => DIFFICULTIES.find((item) => item.id === difficulty) || DIFFICULTIES[0],
        [difficulty]
    );

    const startGame = (nextDifficulty = difficulty) => {
        setDifficulty(nextDifficulty);
        setDeck(makeDeck(nextDifficulty));
        setFlipped([]);
        setMatched(new Set());
        setMoves(0);
        setElapsed(0);
        setStartedAt(Date.now());
    };

    useEffect(() => {
        startGame("vassalo");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!startedAt || matched.size === deck.length / 2) return;
        const timer = window.setInterval(() => {
            setElapsed(Math.floor((Date.now() - startedAt) / 1000));
        }, 1000);
        return () => window.clearInterval(timer);
    }, [startedAt, matched.size, deck.length]);

    const handleCardClick = (card: MemoryCard) => {
        if (matched.has(card.pairId) || flipped.includes(card.instanceId) || flipped.length >= 2) return;

        const nextFlipped = [...flipped, card.instanceId];
        setFlipped(nextFlipped);

        if (nextFlipped.length !== 2) return;

        setMoves((current) => current + 1);
        const first = deck.find((item) => item.instanceId === nextFlipped[0]);
        const second = deck.find((item) => item.instanceId === nextFlipped[1]);

        if (first && second && first.pairId === second.pairId) {
            window.setTimeout(() => {
                setMatched((current) => new Set(current).add(first.pairId));
                setFlipped([]);
            }, 360);
            return;
        }

        window.setTimeout(() => setFlipped([]), 820);
    };

    const pairsFound = matched.size;
    const totalPairs = deck.length / 2;
    const isComplete = deck.length > 0 && pairsFound === totalPairs;
    const minuteLabel = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
    const embeddedColumns = currentDifficulty.pairs <= 6
        ? "repeat(6, minmax(0, 1fr))"
        : currentDifficulty.pairs <= 10
            ? "repeat(10, minmax(0, 1fr))"
            : currentDifficulty.pairs <= 14
                ? "repeat(7, minmax(0, 1fr))"
                : "repeat(9, minmax(0, 1fr))";
    const gridClass = isEmbedded
        ? ""
        : currentDifficulty.pairs <= 6
            ? "grid-cols-3 sm:grid-cols-4"
            : currentDifficulty.pairs <= 10
                ? "grid-cols-4 sm:grid-cols-5"
                : "grid-cols-4 sm:grid-cols-6 lg:grid-cols-7";

    return (
        <main className={`min-h-screen bg-[#07070a] text-[#e8dcc2] ${geistSans.className} ${isEmbedded ? "overflow-hidden" : ""}`}>
            {!isEmbedded && (
                <div className="sticky top-0 z-50">
                    <Navbar />
                </div>
            )}

            <div className={`mx-auto flex w-full max-w-6xl flex-col ${isEmbedded ? "h-screen gap-2 px-3 py-2" : "gap-5 px-4 py-8"}`}>
                {!isEmbedded && (
                    <Link href="/space/dominios" className="w-fit text-xs uppercase tracking-[0.24em] text-[#c5a059]/65 hover:text-[#c5a059]">
                        Voltar ao Sovereign
                    </Link>
                )}

                <section className={`rounded-2xl border border-[#c5a059]/20 bg-black/35 shadow-[0_20px_60px_rgba(0,0,0,0.28)] ${isEmbedded ? "p-3" : "p-4 sm:p-5"}`}>
                    <div className={`flex flex-col lg:flex-row lg:items-end lg:justify-between ${isEmbedded ? "gap-2" : "gap-4"}`}>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.34em] text-[#c5a059]/60">Sovereign Games</p>
                            <h1 className={`mt-1 font-serif uppercase tracking-[0.12em] text-[#c5a059] ${isEmbedded ? "text-xl" : "text-3xl sm:text-4xl"}`}>
                                Jogo da Memoria
                            </h1>
                            <p className={`mt-1 max-w-2xl text-[#e8dcc2]/68 ${isEmbedded ? "hidden" : "text-sm leading-6"}`}>
                                Vire as cartas dos personagens e lugares da mente, encontre os pares e treine reconhecimento visual.
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center sm:flex">
                            <div className={`rounded-xl border border-[#c5a059]/15 bg-black/35 ${isEmbedded ? "px-3 py-1" : "px-4 py-2"}`}>
                                <p className="text-[9px] uppercase tracking-widest text-[#c5a059]/55">Pares</p>
                                <p className="font-serif text-xl text-[#f1d58d]">{pairsFound}/{totalPairs}</p>
                            </div>
                            <div className={`rounded-xl border border-[#c5a059]/15 bg-black/35 ${isEmbedded ? "px-3 py-1" : "px-4 py-2"}`}>
                                <p className="text-[9px] uppercase tracking-widest text-[#c5a059]/55">Jogadas</p>
                                <p className="font-serif text-xl text-[#f1d58d]">{moves}</p>
                            </div>
                            <div className={`rounded-xl border border-[#c5a059]/15 bg-black/35 ${isEmbedded ? "px-3 py-1" : "px-4 py-2"}`}>
                                <p className="text-[9px] uppercase tracking-widest text-[#c5a059]/55">Tempo</p>
                                <p className="font-serif text-xl text-[#f1d58d]">{minuteLabel}</p>
                            </div>
                        </div>
                    </div>

                    <div className={`flex flex-wrap gap-2 ${isEmbedded ? "mt-2" : "mt-5"}`}>
                        {DIFFICULTIES.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => startGame(item.id)}
                                className={`rounded-xl border text-left transition-colors ${isEmbedded ? "px-2 py-1.5" : "px-3 py-2"} ${
                                    difficulty === item.id
                                        ? "border-[#c5a059] bg-[#c5a059]/15 text-[#f1d58d]"
                                        : "border-[#c5a059]/20 bg-black/35 text-[#e8dcc2]/70 hover:border-[#c5a059]/55 hover:text-[#f1d58d]"
                                }`}
                            >
                                <span className="block text-[10px] font-bold uppercase tracking-[0.22em]">{item.title}</span>
                                <span className="block text-[10px] text-[#c5a059]/55">{item.subtitle}</span>
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => startGame()}
                            className={`ml-auto rounded-xl border border-[#c5a059]/35 bg-[#c5a059]/10 text-[10px] font-bold uppercase tracking-[0.22em] text-[#c5a059] transition-colors hover:bg-[#c5a059]/20 ${isEmbedded ? "px-3 py-1.5" : "px-4 py-2"}`}
                        >
                            Nova partida
                        </button>
                    </div>
                </section>

                {isComplete && (
                    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                        Partida concluida em {moves} jogadas e {minuteLabel}. Escolha outro nivel ou embaralhe novamente.
                    </div>
                )}

                <section
                    className={`grid ${gridClass} ${isEmbedded ? "min-h-0 flex-1 gap-1.5" : "gap-2 sm:gap-3"}`}
                    style={isEmbedded ? { gridTemplateColumns: embeddedColumns } : undefined}
                >
                    {deck.map((card) => {
                        const isFaceUp = flipped.includes(card.instanceId) || matched.has(card.pairId);
                        return (
                            <button
                                key={card.instanceId}
                                type="button"
                                onClick={() => handleCardClick(card)}
                                className={`group relative aspect-[3/4] overflow-hidden rounded-xl border transition-all duration-300 ${
                                    isFaceUp
                                        ? "border-[#c5a059]/65 bg-[#120f09] shadow-[0_0_22px_rgba(197,160,89,0.18)]"
                                        : "border-[#c5a059]/18 bg-black/70 hover:border-[#c5a059]/55"
                                }`}
                                aria-label={isFaceUp ? card.name : "Carta virada"}
                            >
                                <div
                                    className="absolute inset-0 transition-transform duration-500"
                                    style={{
                                        transformStyle: "preserve-3d",
                                        transform: isFaceUp ? "rotateY(180deg)" : "rotateY(0deg)",
                                    }}
                                >
                                    <div className="absolute inset-0 overflow-hidden rounded-xl" style={{ backfaceVisibility: "hidden" }}>
                                        <Image src={BACK_OF_CARD_IMAGE} alt="" fill className="object-cover" sizes="160px" />
                                        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent" />
                                    </div>

                                    <div
                                        className="absolute inset-0 overflow-hidden rounded-xl bg-[#0b0b0e]"
                                        style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                                    >
                                        {card.image ? (
                                            <Image src={card.image} alt={card.name} fill className="object-cover" sizes="180px" />
                                        ) : (
                                            <div className="flex h-full items-center justify-center bg-[#14100a] px-2 text-center font-serif text-lg text-[#c5a059]">
                                                {card.name}
                                            </div>
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent p-2">
                                            <p className="truncate font-serif text-[11px] font-bold uppercase tracking-[0.1em] text-[#f1d58d] sm:text-xs">
                                                {card.name}
                                            </p>
                                            <p className="text-[8px] uppercase tracking-[0.18em] text-[#c5a059]/70">
                                                {card.type === "persona" ? "Persona" : "Lugar"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </section>
            </div>

            {!isEmbedded && <InstitutionalFooter />}
        </main>
    );
}
