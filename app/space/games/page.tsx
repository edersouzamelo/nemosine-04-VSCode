"use client";

import { useRef } from "react";
import Link from "next/link";
import MedievalButton from "@/app/components/MedievalButton";
import Navbar from "@/app/components/Navbar";
import InstitutionalFooter from "@/app/components/InstitutionalFooter";

const ACTIVE_GAMES = [
    {
        id: "oracle",
        title: "Oráculo dos Personas",
        description: "Tire uma carta e descubra qual arquétipo rege seu momento atual. Uma leitura simples para reflexão rápida.",
        emoji: "🔮",
        href: "/space/games/oracle",
        bgUrl: "/assets/cards/Anverso%20padrão.png",
    },
    {
        id: "solitaire",
        title: "Paciência Nemosine",
        description: "O clássico jogo de cartas, reimaginado com o baralho Nemosine. Organize seus pensamentos e ordene os arquétipos.",
        emoji: "🃏",
        href: "/space/games/solitaire",
        bgUrl: "/assets/cards/Anverso%20padrão.png",
    }
];

const UPCOMING_GAMES = [
    {
        id: "castelo",
        title: "Castelo da Mente",
        description: "Explore as fortificações do seu próprio palácio de memória. Defenda seus ideais contra as invasões do caos cognitivo.",
        emoji: "🏰",
        bgUrl: "/assets/cards/Anverso%20padrão.png",
    },
    {
        id: "conselho",
        title: "Simulador do Conselho",
        description: "Reúna as 56 personas em um debate transcendental. Tome decisões difíceis ouvindo as vozes da razão, emoção e intuição.",
        emoji: "👑",
        bgUrl: "/assets/cards/Anverso%20padrão.png",
    },
    {
        id: "surv",
        title: "Torreão da sobrevivência",
        description: "Um teste de resiliência psicológica e foco nas profundezas do calabouço simbólico. Quanto tempo você resistirá?",
        emoji: "🛡️",
        bgUrl: "/assets/cards/Anverso%20padrão.png",
    },
    {
        id: "market",
        title: "Mercado Simulador Estratégico",
        description: "Negocie conceitos, ideias e influência na ágora da mente. A economia da atenção sob a lógica medieval-futurista.",
        emoji: "⚖️",
        bgUrl: "/assets/cards/Anverso%20padrão.png",
    },
    {
        id: "tribunal",
        title: "Tribunal Interno",
        description: "Julgue seus próprios conflitos morais e dilemas existenciais. Coloque a sombra e a luz frente a frente diante da balança.",
        emoji: "🏛️",
        bgUrl: "/assets/cards/Anverso%20padrão.png",
    },
    {
        id: "xadrez",
        title: "Xadrez contra o Inimigo",
        description: "O clássico jogo de estratégia medieval, enfrentando o mais sagaz dos oponentes: a sua própria mente oculta.",
        emoji: "♟️",
        bgUrl: "/assets/cards/Anverso%20padrão.png",
    }
];

export default function GamesHubPage() {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scrollLeft = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: -360, behavior: "smooth" });
        }
    };

    const scrollRight = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: 360, behavior: "smooth" });
        }
    };

    return (
        <main className="min-h-screen bg-[#050507] text-[#e1e1e6]">
            <div className="sticky top-0 z-50">
                <Navbar />
            </div>
            <div className="max-w-7xl mx-auto p-8 pt-12 min-h-[calc(100vh-220px)] flex flex-col justify-center">
                <header className="mb-12 text-center relative">
                    <h1 className="mb-2 font-display text-4xl uppercase tracking-widest text-[#c5a059]">Jogos</h1>
                    <p className="font-body text-base italic text-[#c5a059]/60">
                        Um espaço para descanso e reflexão através da mente e do destino
                    </p>
                </header>

                {/* Carousel Wrapper */}
                <div className="relative group/carousel max-w-full px-4">
                    {/* Navigation Buttons (desktop only) */}
                    <button
                        onClick={scrollLeft}
                        className="absolute left-[-20px] top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-12 h-12 rounded-full border border-[#c5a059]/40 bg-[#0a0a0c]/90 text-[#c5a059] hover:border-[#c5a059] hover:bg-[#c5a059]/10 transition-all cursor-pointer shadow-[0_0_15px_rgba(0,0,0,0.6)] focus:outline-none"
                        aria-label="Scroll Left"
                    >
                        <span className="text-xl">←</span>
                    </button>
                    
                    <button
                        onClick={scrollRight}
                        className="absolute right-[-20px] top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-12 h-12 rounded-full border border-[#c5a059]/40 bg-[#0a0a0c]/90 text-[#c5a059] hover:border-[#c5a059] hover:bg-[#c5a059]/10 transition-all cursor-pointer shadow-[0_0_15px_rgba(0,0,0,0.6)] focus:outline-none"
                        aria-label="Scroll Right"
                    >
                        <span className="text-xl">→</span>
                    </button>

                    {/* Horizontal Scroll Track */}
                    <div
                        ref={scrollRef}
                        className="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-8 pt-4 px-2 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                    >
                        {/* Active Games */}
                        {ACTIVE_GAMES.map((game) => (
                            <Link 
                                key={game.id} 
                                href={game.href} 
                                className="group/card shrink-0 w-[290px] sm:w-[320px] md:w-[340px] snap-start"
                            >
                                <div className="bg-[#0c0d11]/85 border border-[#c5a059]/30 rounded-xl overflow-hidden hover:border-[#C5A059] transition-all duration-300 hover:shadow-[0_0_30px_rgba(197,160,89,0.15)] h-[480px] flex flex-col relative">
                                    {/* Card Header Background */}
                                    <div className="h-44 bg-black relative flex items-center justify-center overflow-hidden border-b border-[#c5a059]/10">
                                        <div className="absolute inset-0 opacity-25 bg-[url('/assets/cards/Anverso%20padrão.png')] bg-cover bg-center group-hover/card:scale-105 transition-transform duration-700"></div>
                                        {/* Golden circular glow behind emoji */}
                                        <div className="absolute w-24 h-24 rounded-full bg-[#c5a059]/5 blur-md"></div>
                                        <span className="text-6xl drop-shadow-[0_0_15px_rgba(197,160,89,0.3)] transition-transform duration-500 group-hover/card:scale-110 relative z-10">
                                            {game.emoji}
                                        </span>
                                    </div>
                                    
                                    {/* Card Body */}
                                    <div className="p-6 flex-1 flex flex-col justify-between">
                                        <div>
                                            <h3 className="text-lg font-display uppercase tracking-widest text-[#C5A059] mb-3 transition-colors duration-300 group-hover/card:text-[#f3d38c]">
                                                {game.title}
                                            </h3>
                                            <p className="font-body text-[#e1e1e6]/75 text-base leading-relaxed">
                                                {game.description}
                                            </p>
                                        </div>
                                        <MedievalButton className="w-full text-xs tracking-widest py-3 mt-4">
                                            Jogar
                                        </MedievalButton>
                                    </div>
                                </div>
                            </Link>
                        ))}

                        {/* Upcoming Games */}
                        {UPCOMING_GAMES.map((game) => (
                            <div 
                                key={game.id} 
                                className="group/card shrink-0 w-[290px] sm:w-[320px] md:w-[340px] snap-start opacity-70 hover:opacity-95 transition-opacity duration-300"
                            >
                                <div className="bg-[#07070a]/60 border border-[#333]/60 rounded-xl overflow-hidden hover:border-[#c5a059]/20 transition-all duration-300 h-[480px] flex flex-col relative">
                                    {/* "Em Breve" Badge */}
                                    <span className="absolute top-4 right-4 z-20 bg-amber-500/10 border border-amber-500/40 text-amber-500 font-display text-[9px] tracking-widest uppercase px-2.5 py-1 rounded shadow-[0_0_10px_rgba(245,158,11,0.15)]">
                                        Em Breve
                                    </span>

                                    {/* Card Header Background (Grayscale & Slightly Faded) */}
                                    <div className="h-44 bg-black/80 relative flex items-center justify-center overflow-hidden border-b border-[#333]/20 grayscale">
                                        <div className="absolute inset-0 opacity-15 bg-[url('/assets/cards/Anverso%20padrão.png')] bg-cover bg-center"></div>
                                        <span className="text-6xl opacity-40 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                                            {game.emoji}
                                        </span>
                                    </div>
                                    
                                    {/* Card Body */}
                                    <div className="p-6 flex-1 flex flex-col justify-between">
                                        <div>
                                            <h3 className="text-lg font-display uppercase tracking-widest text-stone-400 mb-3">
                                                {game.title}
                                            </h3>
                                            <p className="font-body text-[#e1e1e6]/45 text-base leading-relaxed">
                                                {game.description}
                                            </p>
                                        </div>
                                        <MedievalButton disabled variant="secondary" className="w-full text-xs tracking-widest py-3 mt-4 opacity-40 cursor-not-allowed border-[#333] text-stone-500 hover:bg-transparent hover:border-[#333] hover:text-stone-500">
                                            Em Breve
                                        </MedievalButton>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <InstitutionalFooter />
        </main>
    );
}
