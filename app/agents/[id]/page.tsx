"use client";

import React, { useState } from "react";
import Navbar from "../../components/Navbar";
import MedievalChat from "../../components/MedievalChat";
import { useParams } from "next/navigation";
import { ENTITIES } from "../../data/entities";

export default function AgentDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const [isPlaying, setIsPlaying] = useState(false);

    const entity = ENTITIES[id];

    if (!entity) {
        return (
            <main className="min-h-screen bg-[#050507] text-[#e1e1e6] flex flex-col items-center justify-center p-8">
                <h1 className="text-4xl font-serif medieval-text-gold mb-4 uppercase tracking-widest">Frequência Perdida</h1>
                <p className="text-[#c5a059]/60 italic mb-8 font-serif text-center max-w-md">
                    "Esta entidade não pôde ser manifestada. Ela permanece oculta nas dobras da consciência ou ainda não foi convocada ao plano material."
                </p>
                <a href="/agents" className="glass-medieval px-8 py-3 text-[10px] uppercase tracking-[0.2em] font-bold text-[#c5a059] hover:bg-[#c5a059]/10 transition-all">
                    Retornar ao Painel
                </a>
            </main>
        );
    }

    return (
        <main className="relative min-h-screen bg-[#050507] text-[#e1e1e6] pb-20">
            {/* Dark Immersive Background */}
            <div className="fixed inset-0 z-0">
                <div className="absolute inset-0 bg-black/80 z-10 backdrop-blur-[4px]"></div>
                <div className="w-full h-full bg-[#0a0a0c] bg-[url('https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=2000')] bg-cover bg-center opacity-10 mix-blend-screen"></div>
            </div>

            <Navbar />

            <div className="relative z-10 max-w-7xl mx-auto px-6 pt-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                    {/* Left/Main Column: Media Presentation */}
                    <div className="lg:col-span-8 flex flex-col gap-8">
                        <div
                            className="relative aspect-video w-full glass-medieval overflow-hidden group cursor-pointer"
                            onClick={() => setIsPlaying(!isPlaying)}
                        >
                            <div className="absolute inset-0 bg-[#c5a059]/5 z-10 pointer-events-none"></div>

                            {/* Media Placeholder Image or Character Art */}
                            <div className="w-full h-full bg-[#1e1b4b]/30 flex items-center justify-center">
                                {entity.image && !isPlaying ? (
                                    <img src={entity.image} alt={entity.name} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" />
                                ) : (
                                    <div className="text-center px-12">
                                        <div className={`w-20 h-20 border-2 border-[#c5a059]/40 rounded-full mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform ${isPlaying ? "animate-pulse border-[#c5a059]" : ""}`}>
                                            {isPlaying ? (
                                                <div className="flex gap-1 items-end h-6">
                                                    <div className="w-1 h-3 bg-[#c5a059] animate-[bounce_0.6s_infinite]"></div>
                                                    <div className="w-1 h-6 bg-[#c5a059] animate-[bounce_0.8s_infinite]"></div>
                                                    <div className="w-1 h-4 bg-[#c5a059] animate-[bounce_0.5s_infinite]"></div>
                                                </div>
                                            ) : (
                                                <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[16px] border-l-[#c5a059]/60 border-b-[10px] border-b-transparent ml-2"></div>
                                            )}
                                        </div>
                                        <p className="medieval-text-gold text-sm opacity-60">
                                            {isPlaying ? "Narração em progresso..." : "Toque para ouvir a apresentação"}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Decorative Frame */}
                            <div className="absolute inset-4 border border-[#c5a059]/10 pointer-events-none"></div>
                        </div>

                        {/* Chat Box below media */}
                        <div className="mt-4">
                            <h3 className="text-[10px] uppercase tracking-[0.4em] text-[#c5a059]/50 font-bold mb-4">Interação Direta</h3>
                            <MedievalChat />
                        </div>
                    </div>

                    {/* Right Column: Info Panels */}
                    <div className="lg:col-span-4 flex flex-col gap-8">
                        {/* Persona Identifier */}
                        <div className="glass-medieval p-8 border-l-4 border-l-[#c5a059]">
                            <span className="text-[10px] uppercase tracking-[0.3em] text-[#c5a059]/60 font-serif mb-2 block">
                                {entity.type === "persona" ? "Agente Identificado" : "Cenário Detectado"}
                            </span>
                            <h2 className="text-4xl font-serif text-[#e1e1e6] uppercase tracking-tighter mb-6">{entity.name}</h2>
                            <div className="h-[1px] w-12 bg-[#c5a059] mb-6"></div>
                            <p className="text-2xl md:text-3xl font-serif text-[#c5a059] leading-tight italic drop-shadow-[0_0_10px_rgba(197,160,89,0.3)]">
                                "{entity.phrase}"
                            </p>
                        </div>

                        {/* Transcription Panel */}
                        <div className="glass-medieval p-8 bg-black/30">
                            <span className="text-[10px] uppercase tracking-[0.3em] text-[#c5a059]/50 font-bold mb-4 block">Transcrição Arcona</span>
                            <div className="text-sm md:text-base text-[#e1e1e6]/80 leading-relaxed font-serif italic space-y-4">
                                <p>{entity.transcription}</p>
                                <div className="flex justify-end opacity-20">
                                    <svg className="w-8 h-8 text-[#c5a059]" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M14.017 21L14.017 18C14.017 16.8954 13.1216 16 12.017 16H9.01705C7.91248 16 7.01705 16.8954 7.01705 18V21H14.017ZM12.017 14C14.7784 14 17.017 11.7614 17.017 9C17.017 6.23858 14.7784 4 12.017 4C9.25558 4 7.01705 6.23858 7.01705 9C7.01705 11.7614 9.25558 14 12.017 14Z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Navigation hint */}
                        <div className="mt-auto px-4 opacity-40">
                            <p className="text-[9px] uppercase tracking-widest text-center">Nemosine v0.4.0 • Visão Detalhada</p>
                        </div>
                    </div>

                </div>
            </div>
        </main>
    );
}
