"use client";

import { useState, useEffect } from "react";
import { DECK, shuffleDeck, Card, BACK_OF_CARD_IMAGE, CardSuit } from "@/lib/deck";
import Link from "next/link";
import { Geist } from "next/font/google";
import MedievalButton from "@/app/components/MedievalButton";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

type CardLocation = { type: 'stock' | 'waste' | 'foundation' | 'tableau', index: number };
type MinCard = Card & { faceUp: boolean };

export default function SolitairePage() {
    const [stock, setStock] = useState<MinCard[]>([]);
    const [waste, setWaste] = useState<MinCard[]>([]);
    const [foundations, setFoundations] = useState<MinCard[][]>([[], [], [], []]); // 4 piles
    const [tableau, setTableau] = useState<MinCard[][]>([[], [], [], [], [], [], []]); // 7 cols
    const [selected, setSelected] = useState<{ loc: CardLocation, card: MinCard } | null>(null);
    const [message, setMessage] = useState<string>("");

    useEffect(() => { startNewGame(); }, []);

    const startNewGame = () => {
        const deck = shuffleDeck(DECK).filter(c => c.rank !== 'JOKER').map(c => ({ ...c, faceUp: false })); // No jokers in Solitaire
        const newTableau: MinCard[][] = [[], [], [], [], [], [], []];
        let cardIdx = 0;

        for (let i = 0; i < 7; i++) {
            for (let j = i; j < 7; j++) {
                const card = deck[cardIdx++];
                if (i === j) card.faceUp = true;
                newTableau[j].push(card);
            }
        }

        setStock(deck.slice(cardIdx));
        setWaste([]);
        setFoundations([[], [], [], []]);
        setTableau(newTableau);
        setSelected(null);
        setMessage("Novo jogo iniciado!");
        setTimeout(() => setMessage(""), 3000);
    };

    const handleStockClick = () => {
        if (stock.length === 0) {
            // Recycle waste to stock
            if (waste.length === 0) return;
            const newStock = [...waste].reverse().map(c => ({ ...c, faceUp: false }));
            setStock(newStock);
            setWaste([]);
        } else {
            // Draw card
            const newStock = [...stock];
            const card = newStock.pop()!;
            card.faceUp = true;
            setStock(newStock);
            setWaste([...waste, card]);
        }
        setSelected(null);
    };

    const isColorAlt = (a: Card, b: Card) => {
        const isRed = (s: string) => s === '♥️' || s === '♦️';
        return isRed(a.suit) !== isRed(b.suit);
    };

    const getRankValue = (rank: string) => {
        const map: { [key: string]: number } = { 'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13 };
        return map[rank] || 0;
    };

    const handleCardClick = (card: MinCard, loc: CardLocation) => {
        // If clicking face down card in tableau (and it's the top one), flip it? No, game rules handle flipping.
        // Actually, if we click a face down card that is exposed, we flip it.
        if (loc.type === 'tableau') {
            const col = tableau[loc.index];
            const isTop = col.indexOf(card) === col.length - 1;
            if (!card.faceUp && isTop) {
                const newTableau = [...tableau];
                newTableau[loc.index][newTableau[loc.index].length - 1].faceUp = true;
                setTableau(newTableau);
                return;
            }
        }

        if (!card.faceUp) return; // Can't select face down

        if (selected) {
            // Attempt move
            if (selected.card.id === card.id) {
                setSelected(null); // Deselect
                return;
            }
            attemptMove(selected, { loc, card });
        } else {
            // Select source
            // Can only select from waste top, foundation top, or tableau (any face up)
            if (loc.type === 'waste' && card !== waste[waste.length - 1]) return;
            if (loc.type === 'foundation') return; // Usually don't move FROM foundation
            setSelected({ loc, card });
        }
    };

    const handleEmptyTableauClick = (colIdx: number) => {
        if (selected && selected.card.rank === 'K') {
            moveCardsToTableau(selected, colIdx);
        }
    };

    const attemptMove = (source: { loc: CardLocation, card: MinCard }, target: { loc: CardLocation, card: MinCard }) => {
        // To Tableau
        if (target.loc.type === 'tableau') {
            // Must be alternate color and rank - 1
            if (isColorAlt(source.card, target.card) && getRankValue(source.card.rank) === getRankValue(target.card.rank) - 1) {
                // Valid move
                moveCardsToTableau(source, target.loc.index);
            } else {
                setMessage("Movimento inválido: Cores devem alternar e valor decrescer.");
                setTimeout(() => setMessage(""), 2000);
            }
        }
        // To Foundation
        else if (target.loc.type === 'foundation') {
            // Must be same suit and rank + 1
            if (source.card.suit === target.card.suit && getRankValue(source.card.rank) === getRankValue(target.card.rank) + 1) {
                moveToFoundation(source, target.loc.index);
            }
        }
    };

    const handleEmptyFoundationClick = (fIdx: number) => {
        if (selected && selected.card.rank === 'A') {
            moveToFoundation(selected, fIdx);
        }
    };

    const moveCardsToTableau = (source: { loc: CardLocation, card: MinCard }, colIdx: number) => {
        let cardsToMove: MinCard[] = [];

        // Remove from source
        if (source.loc.type === 'waste') {
            setWaste(prev => prev.slice(0, -1));
            cardsToMove = [source.card];
        } else if (source.loc.type === 'tableau') {
            const col = tableau[source.loc.index];
            const idx = col.findIndex(c => c.id === source.card.id);
            cardsToMove = col.slice(idx);
            const newTableau = [...tableau];
            newTableau[source.loc.index] = col.slice(0, idx);
            // Auto flip new top
            if (newTableau[source.loc.index].length > 0) {
                // newTableau[source.loc.index][newTableau[source.loc.index].length - 1].faceUp = true; 
                // Logic handled in click, or auto here? Let's keep it manual click-to-flip or auto check?
                // Standard is auto-flip.
            }
            setTableau(newTableau);
        } else if (source.loc.type === 'foundation') {
            const newFoundations = [...foundations];
            newFoundations[source.loc.index].pop();
            setFoundations(newFoundations);
            cardsToMove = [source.card];
        }

        // Add to target
        const newTableau = [...tableau];
        newTableau[colIdx] = [...newTableau[colIdx], ...cardsToMove];
        setTableau(newTableau);
        setSelected(null);
    };

    const moveToFoundation = (source: { loc: CardLocation, card: MinCard }, fIdx: number) => {
        // SÓ PODE MOVER UMA CARTA PRA FUNDAÇÃO
        if (source.loc.type === 'tableau') {
            const col = tableau[source.loc.index];
            // Verifique se é a última
            if (col[col.length - 1].id !== source.card.id) return; // Só pode mover a do topo
        }

        let cardToMove: MinCard | null = null;

        if (source.loc.type === 'waste') {
            setWaste(prev => prev.slice(0, -1));
            cardToMove = source.card;
        } else if (source.loc.type === 'tableau') {
            const newTableau = [...tableau];
            cardToMove = newTableau[source.loc.index].pop()!;
            setTableau(newTableau);
        }

        if (cardToMove) {
            const newFoundations = [...foundations];
            newFoundations[fIdx].push(cardToMove);
            setFoundations(newFoundations);
            setSelected(null);

            // Check Win
            if (newFoundations.every(f => f.length === 13)) {
                setMessage("VOCÊ VENCEU! O GRIMÓRIO ESTÁ COMPLETO.");
            }
        }
    };


    return (
        <main className={`min-h-screen bg-[#0a0a0a] text-[#E5D0A1] ${geistSans.className} p-4 overflow-hidden select-none`}>
            {/* Header */}
            <div className="flex justify-between items-center mb-4 max-w-6xl mx-auto border-b border-[#333] pb-2">
                <div className="flex items-center gap-4">
                    <Link href="/space/games" className="text-gray-500 hover:text-[#C5A059] text-sm">← Sair</Link>
                    <h1 className="text-xl medieval-header text-[#C5A059]">Paciência Nemosine</h1>
                </div>
                <div className="flex gap-4 items-center">
                    <span className="text-[#C5A059] text-sm animate-pulse">{message}</span>
                    <MedievalButton onClick={startNewGame} className="text-xs px-4 py-1">Reiniciar</MedievalButton>
                </div>
            </div>

            <div className="max-w-6xl mx-auto min-h-[80vh]">

                {/* Top Area */}
                <div className="flex justify-between mb-8">

                    {/* Stock & Waste */}
                    <div className="flex gap-4">
                        <div className="w-24 h-36 rounded-lg border border-[#333] bg-[#111] cursor-pointer hover:border-[#C5A059] transition-colors relative" onClick={handleStockClick}>
                            {stock.length > 0 ? (
                                <img src={BACK_OF_CARD_IMAGE} className="w-full h-full object-cover rounded-lg" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl text-gray-700">↺</div>
                            )}
                            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-600">Monte</span>
                        </div>

                        <div className="w-24 h-36 rounded-lg border border-[#333] relative">
                            {waste.map((card, idx) => (
                                <div key={card.id}
                                    className={`absolute inset-0 cursor-pointer ${selected?.card.id === card.id ? 'ring-2 ring-[#C5A059] scale-105 z-10' : ''}`}
                                    onClick={() => handleCardClick(card, { type: 'waste', index: 0 })}
                                >
                                    <img src={card.imagePath} className="w-full h-full object-contain drop-shadow-md" />
                                </div>
                            ))}
                            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-600">Descarte</span>
                        </div>
                    </div>

                    {/* Foundations */}
                    <div className="flex gap-4">
                        {foundations.map((pile, idx) => (
                            <div key={idx}
                                className={`w-24 h-36 rounded-lg border border-[#333] bg-[#050505] flex items-center justify-center relative cursor-pointer ${selected?.card.id === pile[pile.length - 1]?.id ? 'ring-2 ring-[#C5A059]' : ''}`}
                                onClick={() => {
                                    if (pile.length > 0) handleCardClick(pile[pile.length - 1], { type: 'foundation', index: idx });
                                    else handleEmptyFoundationClick(idx);
                                }}
                            >
                                {pile.length === 0 ? (
                                    <span className="text-3xl opacity-20 text-[#C5A059]">{['♠️', '♣️', '♥️', '♦️'][idx]}</span>
                                ) : (
                                    <img src={pile[pile.length - 1].imagePath} className="w-full h-full object-contain" />
                                )}
                            </div>
                        ))}
                    </div>

                </div>

                {/* Tableau */}
                <div className="flex justify-between">
                    {tableau.map((col, colIdx) => (
                        <div key={colIdx} className="w-24 min-h-[400px] relative" onClick={() => col.length === 0 && handleEmptyTableauClick(colIdx)}>
                            {col.map((card, cardIdx) => (
                                <div key={card.id}
                                    className={`absolute w-full transition-all duration-300 cursor-pointer hover:brightness-110 
                                         ${selected?.card.id === card.id ? 'ring-2 ring-[#C5A059] z-50 scale-105' : 'z-auto'}
                                     `}
                                    style={{ top: `${cardIdx * 30}px` }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCardClick(card, { type: 'tableau', index: colIdx });
                                    }}
                                >
                                    {card.faceUp ? (
                                        <img src={card.imagePath} className="w-full h-auto drop-shadow-md rounded-lg" />
                                    ) : (
                                        <img src={BACK_OF_CARD_IMAGE} className="w-full h-auto drop-shadow-md rounded-lg" />
                                    )}
                                </div>
                            ))}
                            {col.length === 0 && (
                                <div className="w-full h-36 rounded-lg border border-dashed border-[#333] flex items-center justify-center">
                                    <span className="text-xs text-gray-700">K</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

            </div>
        </main>
    );
}
