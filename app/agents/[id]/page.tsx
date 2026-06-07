"use client";

import React, { useState } from "react";
import Image from "next/image";
import Navbar from "../../components/Navbar";
import CollapsiblePanel from "@/app/components/CollapsiblePanel";
import ChatHistoryList from "@/app/components/ChatHistoryList";
import MedievalChat from "@/app/components/MedievalChat";
import TimekeeperWidget from "@/app/components/TimekeeperWidget";
import PrivateSpaceNotice from "@/app/components/PrivateSpaceNotice";
import ExternalConnectionsPanel from "@/app/components/ExternalConnectionsPanel";
import FavoritePersonaButton from "@/app/components/FavoritePersonaButton";
import SharePersonaButton from "@/app/components/SharePersonaButton";
import SourcesPanelButton from "@/app/components/SourcesPanelButton";
import OnboardingTour from "@/app/components/OnboardingTour";
import { useLanguage } from "@/app/components/LanguageProvider";
import { useParams, useSearchParams } from "next/navigation";
import { ENTITIES, PERSONAS } from "../../data/entities";
import { chatTourSteps } from "../../data/onboardingTours";

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

function AgentActionButton({
    icon,
    label,
    onClick,
    disabled = false,
}: {
    icon: string;
    label: string;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={label}
            aria-label={label}
            className="group/action relative flex h-10 w-full items-center gap-3 rounded-lg border border-[#c5a059]/25 bg-black/45 px-3 text-left text-[#c5a059]/75 transition-colors hover:border-[#c5a059]/60 hover:bg-[#c5a059]/10 hover:text-[#c5a059] disabled:cursor-not-allowed disabled:opacity-35 lg:w-10 lg:justify-center lg:gap-0 lg:px-0"
        >
            <span className="material-icons text-[18px]">{icon}</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] lg:hidden">{label}</span>
            <span className="pointer-events-none absolute left-1/2 top-full z-[80] mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-[#c5a059]/25 bg-[#07070a]/95 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-[#c5a059] opacity-0 shadow-xl transition-opacity group-hover/action:opacity-100 lg:block">
                {label}
            </span>
        </button>
    );
}

export default function AgentDetailPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const { t, entityName, recordCardUse, cognitiveMode } = useLanguage();
    const id = decodeURIComponent(params.id as string);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isEmbedded, setIsEmbedded] = useState(false);

    React.useEffect(() => {
        if (typeof window !== "undefined") {
            setIsEmbedded(window.location.search.includes("embed=true") || window.self !== window.top);
        }
    }, []);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
    const [refreshHistory, setRefreshHistory] = useState(0);
    const [summonedPersona, setSummonedPersona] = useState("");
    const [dossierOpen, setDossierOpen] = useState(false);
    const [chatGuideAutoStart, setChatGuideAutoStart] = useState(false);

    const entity = ENTITIES[id];
    const activePersonaName = entity?.type === "place" ? summonedPersona : entity?.name || "";

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

    React.useEffect(() => {
        const threadId = searchParams.get("threadId");
        if (threadId) setCurrentThreadId(threadId);
    }, [searchParams]);

    React.useEffect(() => {
        let cameFromOrigins = false;
        try {
            const stored = window.localStorage.getItem("nemosine-onboarding-entry");
            if (stored) {
                const entry = JSON.parse(stored) as { destination?: string; text?: string };
                cameFromOrigins = entry.destination === activePersonaName && Boolean(entry.text?.trim());
            }
        } catch {
            cameFromOrigins = false;
        }
        setChatGuideAutoStart(!cameFromOrigins);
    }, [activePersonaName]);

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

    const getThreadUrl = () => {
        if (typeof window === "undefined" || !currentThreadId) return "";
        const url = new URL(window.location.href);
        url.searchParams.set("threadId", currentThreadId);
        return url.toString();
    };

    const shareChat = async () => {
        if (!currentThreadId) {
            alert("Inicie ou selecione uma conversa antes de compartilhar o chat.");
            return;
        }

        try {
            const response = await fetch("/api/chat/share", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ threadId: currentThreadId }),
            });
            const data = await response.json();
            if (!response.ok || !data.url) {
                throw new Error(data.error || "Erro ao compartilhar chat.");
            }

            const shareUrl = `${window.location.origin}${data.url}`;
            const payload = {
                title: `Conversa com ${activePersonaName}`,
                text: `Conversa compartilhada do Nemosine com ${activePersonaName}.`,
                url: shareUrl,
            };

            if (navigator.share) {
                try {
                    await navigator.share(payload);
                    return;
                } catch {
                    // User may cancel the native share sheet.
                }
            }

            await navigator.clipboard?.writeText(shareUrl);
            alert("Link do chat copiado para a área de transferência.");
        } catch (error) {
            console.error("Erro ao compartilhar chat:", error);
            alert("Não foi possível compartilhar este chat agora.");
        }
    };

    const registerChat = async () => {
        if (!currentThreadId) {
            alert("Inicie ou selecione uma conversa antes de registrar.");
            return;
        }

        try {
            const response = await fetch(`/api/chat?threadId=${encodeURIComponent(currentThreadId)}`);
            const data = await response.json();
            if (!response.ok || !data.thread) {
                throw new Error(data.error || "Conversa não encontrada.");
            }

            const messages = Array.isArray(data.thread.messages) ? data.thread.messages : [];
            const usefulMessages = messages
                .filter((message: any) => message.role !== "system")
                .slice(-6)
                .map((message: any) => `${message.role === "user" ? "Usuário" : activePersonaName}: ${String(message.content || "").replace(/\[MEMORY:\s*.*?\]/ig, "").trim()}`)
                .filter(Boolean);
            const summary = usefulMessages.join("\n\n").slice(0, 1800);
            const idea = summary || `Conversa com ${activePersonaName}`;

            const registry = {
                id: crypto.randomUUID(),
                idea,
                chat_origin_id: currentThreadId,
                persona: activePersonaName,
                status: "Pendente",
                last_interaction: new Date().toISOString().split("T")[0],
                next_deadline: "",
                external_links: getThreadUrl(),
                custom_columns: "{}",
            };

            const registryResponse = await fetch("/api/space/registros", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(registry),
            });

            if (!registryResponse.ok) {
                const errorData = await registryResponse.json().catch(() => ({}));
                throw new Error(errorData.error || "Erro ao registrar conversa.");
            }

            alert("Conversa registrada em Memórias > Registros.");
        } catch (error) {
            console.error("Erro ao registrar conversa:", error);
            alert("Não foi possível registrar este chat agora.");
        }
    };

    const actionButtons = (
        <>
            <AgentActionButton icon="article" label={entity.type === "place" ? "Dossiê do lugar" : "Dossiê do agente"} onClick={() => setDossierOpen(true)} />
            {entity.type === "persona" && <FavoritePersonaButton personaName={entity.name} variant="icon" />}
            {entity.type === "persona" && <SourcesPanelButton personaName={entity.name} variant="icon" />}
            <SharePersonaButton title={displayedEntityName} variant="icon" />
            <AgentActionButton icon="ios_share" label="Compartilhar chat" onClick={shareChat} disabled={!currentThreadId} />
            <AgentActionButton icon="playlist_add_check" label="Registrar" onClick={registerChat} disabled={!currentThreadId} />
        </>
    );

    const dossierContent = (
        <>
            <div className="space-y-2">
                <span className="block font-serif text-[10px] uppercase tracking-[0.3em] text-[#c5a059]/60">
                    {t("identification")}
                </span>
                <h2 className="font-serif text-3xl uppercase text-[#e1e1e6]">{displayedEntityName}</h2>
                <div className="my-4 h-[1px] w-12 bg-[#c5a059]" />
                <p className="font-serif text-xl italic text-[#c5a059]">
                    "{entity.phrase}"
                </p>
            </div>

            <div className="mt-8 space-y-4">
                <span className="block font-serif text-[10px] uppercase tracking-[0.3em] text-[#c5a059]/60">
                    {t("protocol")}
                </span>
                <p className="whitespace-pre-line text-sm font-light leading-relaxed text-[#e1e1e6]/80">
                    {entity.script || entity.transcription}
                </p>
            </div>
        </>
    );

    return (
        <main className="nemosine-main-container relative h-[100dvh] flex flex-col overflow-hidden">
            {/* Dark Immersive Background */}
            <div className="fixed inset-0 z-0">
                <div className="nemosine-bg-overlay absolute inset-0 z-10 bg-[#050507]/72 backdrop-blur-[3px]"></div>
                <div className="nemosine-mental-castle-bg h-full w-full bg-[url('https://images.unsplash.com/photo-1505664194779-8beaceb93744?q=80&w=2000')] bg-cover bg-center"></div>
            </div>

            {!isEmbedded && (
                <div className="navbar-container relative z-20 overflow-visible transition-all duration-300">
                    <Navbar mobileCollapsible defaultMobileCollapsed />
                </div>
            )}

            {/* CONTENT LAYOUT - Mobile First */}
            <div className="relative z-10 flex-1 flex flex-col lg:flex-row overflow-hidden gap-0">

                {/* TOP: PERSONA IMAGE (Mobile) & RETRACTABLE MEMORIES */}
                {!isEmbedded && (
                    <div className="lg:hidden flex items-center h-auto shrink-0 bg-black/20 border-b border-[#c5a059]/10 p-2 gap-2">
                    {/* Small Image for Mobile */}
                    {cognitiveMode === "sober" ? (
                        <div
                            data-tour="chat-persona-card"
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
                            data-tour="chat-persona-card"
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
                                        className={`object-cover transition-transform duration-700 ${entity.type === "place" ? "scale-[1.25]" : ""} ${isPlaying ? 'scale-[1.08] opacity-80' : 'group-hover:scale-[1.08]'}`}
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
                    <div data-tour="chat-history" className="flex-1 min-w-0">
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
                    </div >
                )}

                {/* LEFT: LARGE IMAGE & MEMORIES (Desktop Only) */}
                {!isEmbedded && (
                    <div className="hidden lg:flex lg:w-1/4 p-6 flex-col items-center border-r border-[#c5a059]/10 bg-black/20 overflow-y-auto scrollbar-thin scrollbar-thumb-[#c5a059]/20 gap-6">
                    <div className="flex w-full items-start justify-center gap-3">
                    {/* Desktop Image */}
                    {cognitiveMode === "sober" ? (
                        <div
                            data-tour="chat-persona-card"
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
                            data-tour="chat-persona-card"
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
                                        className={`object-cover transition-transform duration-700 ${entity.type === "place" ? "scale-[1.25]" : ""} ${isPlaying ? 'scale-[1.08] opacity-80' : 'group-hover:scale-[1.08]'}`}
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
                    </div>

                    {/* Desktop Memories Panel */}
                    <div data-tour="chat-history" className="w-full">
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
                    </div>
                )}

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
                                actionMenu={actionButtons}
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

            </div>

            <div className={`fixed right-0 top-0 z-50 h-full w-full max-w-[400px] transform border-l border-[#c5a059]/30 bg-[#050507]/95 shadow-2xl backdrop-blur-xl transition-transform duration-500 ease-in-out ${dossierOpen ? "translate-x-0" : "translate-x-full"}`}>
                <button
                    type="button"
                    onClick={() => setDossierOpen(false)}
                    className="absolute left-6 top-6 text-[#c5a059] transition-colors hover:text-white"
                    aria-label="Fechar dossiê"
                >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <div className="h-full overflow-y-auto p-8 pt-20">
                    <h2 className="mb-8 border-b border-[#c5a059]/20 pb-4 font-serif text-2xl text-[#c5a059]">
                        {entity.type === "place" ? t("dossierPlace") : t("dossierAgent")}
                    </h2>
                    <div className="space-y-6 text-[#e1e1e6]">
                        {dossierContent}
                    </div>
                </div>
            </div>
            {dossierOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                    onClick={() => setDossierOpen(false)}
                />
            )}
            <OnboardingTour
                tourId="chat"
                storageKey="nemosine_onboarding_chat_completed"
                steps={chatTourSteps}
                autoStart={chatGuideAutoStart && Boolean(activePersonaName)}
            />
        </main>
    );
}
