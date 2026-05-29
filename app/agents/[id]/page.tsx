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
import ExternalConnectionsPanel from "@/app/components/ExternalConnectionsPanel";
import FavoritePersonaButton from "@/app/components/FavoritePersonaButton";
import SharePersonaButton from "@/app/components/SharePersonaButton";
import SourcesPanelButton from "@/app/components/SourcesPanelButton";
import { useLanguage } from "@/app/components/LanguageProvider";
import { useParams } from "next/navigation";
import { ENTITIES, PERSONAS } from "../../data/entities";

const soberEmojis: Record<string, string> = {
    "Não-Lugar": "🌌", "Labirinto": "🌀", "Arquivo": "📁", "Porão": "🕳️", "Masmorra": "⛓️", 
    "Biblioteca": "📚", "Claustro": "🧘", "Galeria": "🖼️", "Oficina": "🛠️", "Teatro": "🎭", 
    "Mercado Real": "⚖️", "Núcleo": "🧬", "Tribunal": "🏛️", "Jardim": "🌳", "Observatório": "🔭", 
    "Mosteiro": "🕯️", "Portal": "🚪", "Torreão": "🏰", "Campanário": "🔔", "Sala do Trono": "👑", 
    "Ponte": "🌉", "Solar": "☀️",
    "Adjunto": "💼", "Advogado": "⚖️", "Aprovisionador": "🔋", "Arauto": "📢", "Arqueólogo": "🔍", 
    "Artista": "🎨", "Astrônomo": "🌌", "Autor": "✍️", "Bobo da Corte": "🃏", "Bruto": "🛡️", 
    "Bruxo": "🧪", "Burguês": "💰", "Cientista": "🔬", "Cigana": "🔮", "Comandante": "🎖️", 
    "Confessor 2.0": "🕯️", "Coveiro": "⚰️", "Curador": "📋", "Custódio": "🔑", "Desejo": "⚡", 
    "Dor": "🩸", "Engenheiro": "⚙️", "Espelho": "🪞", "Espião": "🕵️", "Estrategista": "♟️", 
    "Executor": "🔨", "Exorcista": "✝️", "Fantasma": "👻", "Filósofo": "📖", "Fúria": "🔥", 
    "Guardião": "🏰", "Guru": "🕉️", "Herdeiro": "👑", "Inimigo": "⚔️", "Instrutor": "🎓", 
    "Juiz": "⚖️", "Louco": "🤪", "Luz": "💡", "Médico": "🩺", "Mentor": "🧠", "Mentorzinho": "🧒", 
    "Mestre": "🎖️", "Mordomo": "🤵", "Narrador": "🎙️", "Orquestrador-Arquiteto": "🏛️", 
    "Princesa": "👸", "Promotor": "⚖️", "Psicólogo": "🗣️", "Sócio": "🤝", "Sombra": "👤", 
    "Terapeuta": "🛋️", "Treinador": "🏋️", "Vazio": "🕳️", "Vidente": "🔮", "Vigia": "👁️", 
    "Vingador": "⚔️"
};

export default function AgentDetailPage() {
    const params = useParams();
    const { t, entityName, recordCardUse, cognitiveMode } = useLanguage();
    const id = decodeURIComponent(params.id as string);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
    const [refreshHistory, setRefreshHistory] = useState(0);
    const [summonedPersona, setSummonedPersona] = useState("");

    const entity = ENTITIES[id];

    React.useEffect(() => {
        if (entity) {
            recordCardUse(entity.type === "place" ? "places" : "personas", entity.name);
        }
    // One visit should count once even when preferences rerender the provider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    React.useEffect(() => {
        setCurrentThreadId(null);
    }, [id, summonedPersona]);

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

    const displayedEntityName = entityName(entity.name);
    const activePersonaName = entity.type === "place" ? summonedPersona : entity.name;
    const conversationScope = entity.type === "place" && activePersonaName
        ? `${activePersonaName} @ ${entity.name}`
        : activePersonaName;
    const requiresPrivacyNotice =
        entity.name === "Confessor 2.0" || entity.name === "Porão" || activePersonaName === "Confessor 2.0";

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
        <main className="nemosine-main-container relative h-[100dvh] flex flex-col overflow-hidden">
            {/* Dark Immersive Background */}
            <div className="fixed inset-0 z-0">
                <div className="nemosine-bg-overlay absolute inset-0 z-10 backdrop-blur-[4px]"></div>
                <div className="nemosine-mental-castle-bg w-full h-full bg-[url('https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=2000')] bg-cover bg-center"></div>
            </div>

            <div className="navbar-container relative z-20 overflow-visible transition-all duration-300">
                <Navbar mobileCollapsible defaultMobileCollapsed />
            </div>

            {/* CONTENT LAYOUT - Mobile First */}
            <div className="relative z-10 flex-1 flex flex-col lg:flex-row overflow-hidden gap-0">

                {/* TOP: PERSONA IMAGE (Mobile) & RETRACTABLE MEMORIES */}
                <div className="lg:hidden flex items-center h-auto shrink-0 bg-black/20 border-b border-[#c5a059]/10 p-2 gap-2">
                    {/* Small Image for Mobile */}
                    {cognitiveMode === "sober" ? (
                        <div 
                            className="w-12 h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-2xl shrink-0 cursor-pointer shadow-sm select-none"
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
                            {soberEmojis[entity.name] || "👤"}
                        </div>
                    ) : (
                        <div
                            className={`relative w-12 ${entity.type === "place" ? "aspect-[3/4.35]" : "aspect-square"} glass-medieval overflow-hidden group cursor-pointer rounded-lg shrink-0 shadow-[0_4px_12px_rgba(0,0,0,0.3)]`}
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
                                        alt={displayedEntityName}
                                        fill
                                        className={`object-cover transition-transform duration-700 ${entity.type === "place" ? "scale-[1.15]" : ""} ${isPlaying ? 'scale-[1.08] opacity-80' : 'group-hover:scale-[1.08]'}`}
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
                    )}

                    {/* Memories in Retractable Panel (Mobile) */}
                    <CollapsiblePanel title={t("recentMemories")} defaultOpen={false} className="flex-1 min-w-0">
                        {conversationScope ? (
                            <ChatHistoryList
                                personaId={conversationScope}
                                currentThreadId={currentThreadId}
                                onSelectThread={setCurrentThreadId}
                                refreshTrigger={refreshHistory}
                            />
                        ) : (
                            <p className="mt-3 text-xs italic text-[#c5a059]/60">Convoque uma persona para iniciar uma memória neste lugar.</p>
                        )}
                    </CollapsiblePanel>
                </div>

                {/* LEFT: LARGE IMAGE & MEMORIES (Desktop Only) */}
                <div className="hidden lg:flex lg:w-1/4 p-6 flex-col items-center border-r border-[#c5a059]/10 bg-black/20 overflow-y-auto scrollbar-thin scrollbar-thumb-[#c5a059]/20 gap-6">
                    {/* Desktop Image */}
                    {cognitiveMode === "sober" ? (
                        <div 
                            className="w-[180px] h-[180px] rounded-2xl bg-[#fafafa] dark:bg-[#121214] border border-zinc-200 dark:border-zinc-850 flex items-center justify-center text-7xl cursor-pointer shadow-sm select-none shrink-0"
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
                            {soberEmojis[entity.name] || "👤"}
                        </div>
                    ) : (
                        <div
                            className={`relative w-full ${entity.type === "place" ? "aspect-[3/4.35]" : "aspect-square"} max-w-[220px] glass-medieval overflow-hidden group cursor-pointer shadow-[0_8px_24px_rgba(0,0,0,0.4)] rounded-lg shrink-0`}
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
                                        alt={displayedEntityName}
                                        fill
                                        className={`object-cover transition-transform duration-700 ${entity.type === "place" ? "scale-[1.15]" : ""} ${isPlaying ? 'scale-[1.08] opacity-80' : 'group-hover:scale-[1.08]'}`}
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
                    )}

                    {/* Desktop Memories Panel */}
                    <CollapsiblePanel title={t("recentMemories")} defaultOpen={false} className="w-full">
                        {conversationScope ? (
                            <ChatHistoryList
                                personaId={conversationScope}
                                currentThreadId={currentThreadId}
                                onSelectThread={setCurrentThreadId}
                                refreshTrigger={refreshHistory}
                            />
                        ) : (
                            <p className="mt-3 text-xs italic text-[#c5a059]/60">Convoque uma persona para iniciar uma memória neste lugar.</p>
                        )}
                    </CollapsiblePanel>
                </div>

                {/* CENTER/RIGHT: CHAT (The Main Focus - ~60%) */}
                <div className="flex-1 min-h-0 p-2 sm:p-4 lg:p-6 flex flex-col w-full overflow-hidden">
                    {entity.type === "place" && (
                        <div className="mb-2 shrink-0 rounded-xl border border-[#c5a059]/20 bg-black/35 p-3 sm:mb-4 sm:p-4">
                            <label htmlFor="summoned-persona" className="mb-2 block text-[10px] uppercase tracking-[0.28em] text-[#c5a059]/75">
                                Convocar uma persona em {displayedEntityName}
                            </label>
                            <select
                                id="summoned-persona"
                                value={summonedPersona}
                                onChange={(event) => setSummonedPersona(event.target.value)}
                                className="w-full rounded-lg border border-[#c5a059]/25 bg-[#0a0a0c] px-3 py-2.5 font-serif text-sm text-[#e1e1e6] outline-none focus:border-[#c5a059]/60"
                            >
                                <option value="">Escolha quem o acompanhará neste lugar...</option>
                                {PERSONAS.map((persona) => (
                                    <option key={persona} value={persona}>{entityName(persona)}</option>
                                ))}
                            </select>
                            <p className="mt-2 text-xs italic text-[#c5a059]/55">
                                O lugar oferece a atmosfera; a persona convocada oferece a voz.
                            </p>
                        </div>
                    )}
                    {activePersonaName ? (
                        <>
                            <ExternalConnectionsPanel personaName={activePersonaName} />
                            <MedievalChat
                                key={conversationScope}
                                personaId={activePersonaName}
                                placeId={entity.type === "place" ? entity.name : undefined}
                                currentThreadId={currentThreadId}
                                onThreadCreated={(id) => {
                                    setCurrentThreadId(id);
                                    setRefreshHistory(prev => prev + 1);
                                }}
                                onNewChat={() => setCurrentThreadId(null)}
                            />
                        </>
                    ) : (
                        <div className="flex flex-1 items-center justify-center rounded-xl border border-[#c5a059]/10 bg-black/20 p-8 text-center">
                            <p className="max-w-md font-serif text-sm italic leading-7 text-[#c5a059]/65">
                                Você entrou em {displayedEntityName}. Escolha uma persona para que sua voz se manifeste neste ambiente.
                            </p>
                        </div>
                    )}
                    {/* Special Widget for Arauto */}
                    {activePersonaName.toLowerCase() === 'arauto' && <TimekeeperWidget />}
                    {requiresPrivacyNotice && <PrivateSpaceNotice spaceName={displayedEntityName} />}
                </div>

                {/* RIGHT: LATERAL PANEL DETAILS */}
                <RetractablePanel
                    title={entity.type === 'place' ? t("dossierPlace") : t("dossierAgent")}
                    secondaryAction={entity.type === "persona" ? (
                        <>
                            <FavoritePersonaButton personaName={entity.name} />
                            <SourcesPanelButton personaName={entity.name} />
                            <SharePersonaButton title={displayedEntityName} />
                        </>
                    ) : <SharePersonaButton title={displayedEntityName} />}
                >
                    {/* Identity Card */}
                    <div className="space-y-2">
                        <span className="text-[10px] uppercase tracking-[0.3em] text-[#c5a059]/60 font-serif block">
                            {t("identification")}
                        </span>
                        <h2 className="text-3xl font-serif text-[#e1e1e6] uppercase">{displayedEntityName}</h2>
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
        </main>
    );
}
