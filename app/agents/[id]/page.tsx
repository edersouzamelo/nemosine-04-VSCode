"use client";

import React, { useState } from "react";
import Navbar from "../../components/Navbar";
import RetractablePanel from "@/app/components/RetractablePanel";
import ChatHistoryList from "@/app/components/ChatHistoryList";
import MedievalChat from "@/app/components/MedievalChat";
import TimekeeperWidget from "@/app/components/TimekeeperWidget";
import { useParams } from "next/navigation";
import { ENTITIES } from "../../data/entities";

export default function AgentDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
    const [refreshHistory, setRefreshHistory] = useState(0);

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

    const toggleAudio = () => {
        if (!audioRef.current || !entity.audio) return;

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play().catch(e => console.error("Audio playback failed:", e));
            setIsPlaying(true);
        }
    };

    return (
        <main className="relative h-screen bg-[#050507] text-[#e1e1e6] flex flex-col overflow-hidden">
            {/* Dark Immersive Background */}
            <div className="fixed inset-0 z-0">
                <div className="absolute inset-0 bg-black/80 z-10 backdrop-blur-[4px]"></div>
                <div className="w-full h-full bg-[#0a0a0c] bg-[url('https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=2000')] bg-cover bg-center opacity-10 mix-blend-screen"></div>
            </div>

            <div className="relative z-20">
                <Navbar />
            </div>

            {/* CONTENT LAYOUT - Fixed Height calculated */}
            <div className="relative z-10 flex-1 flex flex-col lg:flex-row h-[calc(100vh-80px)] overflow-hidden">

                {/* LEFT: VISUALS & HISTORY */}
                <div className="lg:w-1/3 p-6 flex flex-col items-center border-r border-[#c5a059]/10 bg-black/20 overflow-y-auto scrollbar-thin scrollbar-thumb-[#c5a059]/20">
                    <div
                        className="relative w-full aspect-square max-w-[300px] glass-medieval overflow-hidden group cursor-pointer shadow-2xl rounded-lg shrink-0"
                        onClick={toggleAudio}
                    >
                        {/* Hidden Audio */}
                        {entity.audio && (
                            <audio
                                ref={audioRef}
                                src={entity.audio}
                                onEnded={() => setIsPlaying(false)}
                                onPause={() => setIsPlaying(false)}
                                onPlay={() => setIsPlaying(true)}
                            />
                        )}

                        {(entity.landscapeImage || entity.image) && (
                            <img
                                src={entity.landscapeImage || entity.image}
                                alt={entity.name}
                                className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-105 opacity-80' : 'group-hover:scale-105'}`}
                            />
                        )}

                        {/* Audio Indicator Overlay */}
                        <div className="absolute bottom-4 right-4 z-20">
                            {isPlaying ? (
                                <div className="flex gap-1 items-end h-6 bg-black/60 p-2 rounded-lg backdrop-blur text-[#c5a059]">
                                    <div className="w-1 h-3 bg-[#c5a059] animate-[bounce_0.6s_infinite]"></div>
                                    <div className="w-1 h-6 bg-[#c5a059] animate-[bounce_0.8s_infinite]"></div>
                                    <div className="w-1 h-3 bg-[#c5a059] animate-[bounce_0.6s_infinite]"></div>
                                </div>
                            ) : (
                                <div className="bg-black/60 p-2 rounded-full text-[#c5a059] opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* HISTORY LIST */}
                    <ChatHistoryList
                        personaId={entity.name}
                        currentThreadId={currentThreadId}
                        onSelectThread={setCurrentThreadId}
                        refreshTrigger={refreshHistory}
                    />
                </div>

                {/* CENTER/RIGHT: CHAT (The Main Focus) */}
                <div className="flex-1 p-4 flex flex-col w-full max-w-4xl mx-auto h-full overflow-hidden">
                    <MedievalChat
                        personaId={entity.name}
                        currentThreadId={currentThreadId}
                        onThreadCreated={(id) => {
                            setCurrentThreadId(id);
                            setRefreshHistory(prev => prev + 1);
                        }}
                        onNewChat={() => setCurrentThreadId(null)}
                    />
                    {/* Special Widget for Arauto */}
                    {entity.name.toLowerCase() === 'arauto' && <TimekeeperWidget />}
                </div>

                {/* LATERAL PANEL: DETAILS */}
                <RetractablePanel title={entity.type === 'place' ? "Dossiê do Lugar" : "Dossiê do Agente"}>
                    {/* Identity Card */}
                    <div className="space-y-2">
                        <span className="text-[10px] uppercase tracking-[0.3em] text-[#c5a059]/60 font-serif block">
                            Identificação
                        </span>
                        <h2 className="text-3xl font-serif text-[#e1e1e6] uppercase">{entity.name}</h2>
                        <div className="h-[1px] w-12 bg-[#c5a059] my-4"></div>
                        <p className="text-xl font-serif text-[#c5a059] italic">
                            "{entity.phrase}"
                        </p>
                    </div>

                    {/* Script / Description */}
                    <div className="mt-8 space-y-4">
                        <span className="text-[10px] uppercase tracking-[0.3em] text-[#c5a059]/60 font-serif block">
                            Protocolo & Roteiro
                        </span>
                        <p className="text-sm font-light leading-relaxed text-[#e1e1e6]/80 whitespace-pre-line">
                            {entity.script || entity.transcription}
                        </p>
                    </div>
                </RetractablePanel>

            </div>
        </main>
    );
}
