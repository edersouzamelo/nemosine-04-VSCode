"use client";

import React, { useState } from "react";
import Image from "next/image";
import Navbar from "../../components/Navbar";
import RetractablePanel from "@/app/components/RetractablePanel";
import CollapsiblePanel from "@/app/components/CollapsiblePanel";
import ChatHistoryList from "@/app/components/ChatHistoryList";
import MedievalChat from "@/app/components/MedievalChat";
import TimekeeperWidget from "@/app/components/TimekeeperWidget";
import PrivateSpaceNotice from "@/app/components/PrivateSpaceNotice";
import { useLanguage } from "@/app/components/LanguageProvider";
import { useParams } from "next/navigation";
import { ENTITIES } from "../../data/entities";

export default function AgentDetailPage() {
    const params = useParams();
    const { t } = useLanguage();
    const id = decodeURIComponent(params.id as string);
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

    const requiresPrivacyNotice =
        entity.name === "Confessor 2.0" || entity.name === "Porão";

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

            <div className="navbar-container relative z-20 transition-transform duration-300">
                <Navbar />
            </div>

            {/* CONTENT LAYOUT - Mobile First */}
            <div className="relative z-10 flex-1 flex flex-col lg:flex-row h-[calc(100vh-80px)] overflow-hidden gap-0">

                {/* TOP: PERSONA IMAGE (Mobile) & RETRACTABLE MEMORIES */}
                <div className="lg:hidden flex flex-col h-auto shrink-0 bg-black/20 border-b border-[#c5a059]/10 p-4 space-y-4">
                    {/* Small Image for Mobile */}
                    <div
                        className="relative w-20 h-20 glass-medieval overflow-hidden group cursor-pointer rounded-lg shrink-0 shadow-[0_4px_12px_rgba(0,0,0,0.3)] self-center"
                        onClick={toggleAudio}
                    >
                        {entity.audio && (
                            <audio
                                ref={audioRef}
                                src={entity.audio}
                                onEnded={() => setIsPlaying(false)}
                                onPause={() => setIsPlaying(false)}
                                onPlay={() => setIsPlaying(true)}
                                onError={(e) => {
                                    e.preventDefault();
                                    setIsPlaying(false);
                                }}
                            />
                        )}

                        {(entity.landscapeImage || entity.image) && (
                            <div className="absolute inset-0 w-full h-full overflow-hidden">
                                <Image
                                    src={entity.landscapeImage || entity.image || ''}
                                    alt={entity.name}
                                    fill
                                    className={`object-cover transition-transform duration-700 ${isPlaying ? 'scale-105 opacity-80' : 'group-hover:scale-105'}`}
                                />
                            </div>
                        )}

                        {/* Audio Indicator */}
                        <div className="absolute bottom-1 right-1 z-20">
                            {isPlaying ? (
                                <div className="flex gap-0.5 items-end h-4 bg-black/60 p-1 rounded text-[#c5a059] text-xs">
                                    <div className="w-0.5 h-2 bg-[#c5a059] animate-[bounce_0.6s_infinite]"></div>
                                    <div className="w-0.5 h-3 bg-[#c5a059] animate-[bounce_0.8s_infinite]"></div>
                                </div>
                            ) : (
                                <div className="bg-black/60 p-1 rounded text-[#c5a059] opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Memories in Retractable Panel (Mobile) */}
                    <CollapsiblePanel title={t("recentMemories")} defaultOpen={false} className="w-full">
                        <ChatHistoryList
                            personaId={entity.name}
                            currentThreadId={currentThreadId}
                            onSelectThread={setCurrentThreadId}
                            refreshTrigger={refreshHistory}
                        />
                    </CollapsiblePanel>
                </div>

                {/* LEFT: LARGE IMAGE & MEMORIES (Desktop Only) */}
                <div className="hidden lg:flex lg:w-1/4 p-6 flex-col items-center border-r border-[#c5a059]/10 bg-black/20 overflow-y-auto scrollbar-thin scrollbar-thumb-[#c5a059]/20 gap-6">
                    {/* Desktop Image */}
                    <div
                        className="relative w-full aspect-square max-w-[220px] glass-medieval overflow-hidden group cursor-pointer shadow-[0_8px_24px_rgba(0,0,0,0.4)] rounded-lg shrink-0"
                        onClick={toggleAudio}
                    >
                        {entity.audio && (
                            <audio
                                ref={audioRef}
                                src={entity.audio}
                                onEnded={() => setIsPlaying(false)}
                                onPause={() => setIsPlaying(false)}
                                onPlay={() => setIsPlaying(true)}
                                onError={(e) => {
                                    e.preventDefault();
                                    setIsPlaying(false);
                                }}
                            />
                        )}

                        {(entity.landscapeImage || entity.image) && (
                            <div className="absolute inset-0 w-full h-full overflow-hidden">
                                <Image
                                    src={entity.landscapeImage || entity.image || ''}
                                    alt={entity.name}
                                    fill
                                    className={`object-cover transition-transform duration-700 ${isPlaying ? 'scale-105 opacity-80' : 'group-hover:scale-105'}`}
                                />
                            </div>
                        )}

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

                    {/* Desktop Memories Panel */}
                    <CollapsiblePanel title={t("recentMemories")} defaultOpen={false} className="w-full">
                        <ChatHistoryList
                            personaId={entity.name}
                            currentThreadId={currentThreadId}
                            onSelectThread={setCurrentThreadId}
                            refreshTrigger={refreshHistory}
                        />
                    </CollapsiblePanel>
                </div>

                {/* CENTER/RIGHT: CHAT (The Main Focus - ~60%) */}
                <div className="flex-1 p-4 lg:p-6 flex flex-col w-full h-full overflow-hidden">
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
                    {requiresPrivacyNotice && <PrivateSpaceNotice spaceName={entity.name} />}
                </div>

                {/* RIGHT: LATERAL PANEL DETAILS (Desktop) */}
                <div className="hidden lg:block">
                    <RetractablePanel title={entity.type === 'place' ? t("dossierPlace") : t("dossierAgent")}>
                        {/* Identity Card */}
                        <div className="space-y-2">
                            <span className="text-[10px] uppercase tracking-[0.3em] text-[#c5a059]/60 font-serif block">
                                {t("identification")}
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
                                {t("protocol")}
                            </span>
                            <p className="text-sm font-light leading-relaxed text-[#e1e1e6]/80 whitespace-pre-line">
                                {entity.script || entity.transcription}
                            </p>
                        </div>
                    </RetractablePanel>
                </div>

            </div>
        </main>
    );
}
