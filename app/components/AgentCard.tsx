"use client";
 
import Link from "next/link";
import React from "react";
import Image from "next/image";
 
interface AgentCardProps {
    name: string;
    displayName?: string;
    label?: string;
    image?: string;
    className?: string;
    href?: string;
    flipOnMount?: boolean;
    index?: number;
    summary?: string;
}
 
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

import { useLanguage } from "./LanguageProvider";

function cleanTooltipSummary(value: string) {
    const withoutGreeting = value
        .replace(/\s+/g, " ")
        .split(/Saudações\.?|Saudacoes\.?/i)[0]
        .trim();
    const withoutQuotes = withoutGreeting.replace(/[“”"]/g, "").trim();
    if (withoutQuotes.length <= 92) return withoutQuotes;
    return `${withoutQuotes.slice(0, 89).trim()}...`;
}

export default function AgentCard({ name, displayName, label = "Persona", image, className = "", href, flipOnMount = false, index = 0, summary }: AgentCardProps) {
    const { cognitiveMode } = useLanguage();
    const cardDisplayName = displayName ?? name;
    const [isRevealed, setIsRevealed] = React.useState(!flipOnMount);
    const rawTooltipText = summary || (label === "Lugar"
        ? "Modulo de contexto para orientar a experiencia mental. Ajuda a situar o pensamento no lugar certo."
        : "Persona de apoio cognitivo para interpretar demandas. Ajuda a escolher a melhor forma de agir.");
    const tooltipText = cleanTooltipSummary(rawTooltipText);
    const tooltipSideOffset = index % 2 === 0 ? "left-[56%]" : "left-[44%]";
    const tooltipTilt = index % 2 === 0 ? "group-hover:rotate-[0.5deg]" : "group-hover:-rotate-[0.5deg]";

    React.useEffect(() => {
        if (flipOnMount) {
            const timer = setTimeout(() => {
                setIsRevealed(true);
            }, 150 + index * 80);
            return () => clearTimeout(timer);
        }
    }, [flipOnMount, index]);

    const cleanCard = (
        <div className="relative flex h-full flex-col justify-between border border-zinc-200 dark:border-zinc-800 bg-[#fafafa] dark:bg-[#18181b] p-4 rounded-xl hover:border-zinc-400 dark:hover:border-zinc-600 transition-all select-none cursor-pointer group shadow-sm min-h-[135px]">
            <div className="flex items-center gap-3">
                <span className="text-3xl flex items-center justify-center shrink-0 w-12 h-12 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg group-hover:scale-105 transition-transform duration-300">{soberEmojis[name] || "?"}</span>
                <div className="min-w-0">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-semibold block">{label === "Lugar" ? "Modulo" : "Perfil"}</span>
                    <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate transition-colors">
                        {cardDisplayName}
                    </h3>
                </div>
            </div>
            <div className="mt-3">
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {tooltipText}
                </p>
            </div>
            <div className={`pointer-events-none absolute ${tooltipSideOffset} top-full z-[999] mt-3 w-56 -translate-x-1/2 translate-y-2 rounded-lg border border-[#c5a059]/45 bg-[#07070a]/95 px-3 py-2 text-center font-serif text-[13px] leading-snug text-[#d8b766] opacity-0 shadow-[0_18px_45px_rgba(0,0,0,0.75)] backdrop-blur-md transition-all duration-300 ease-out group-hover:translate-y-0 ${tooltipTilt} group-hover:opacity-100`}>
                {tooltipText}
            </div>
        </div>
    );

    if (cognitiveMode === "sober") {
        if (href) {
            return (
                <Link href={href} className="block w-full h-full">
                    {cleanCard}
                </Link>
            );
        }
        return cleanCard;
    }

    const cardContent = (
        <div className="group relative z-0 flex h-full select-none flex-col gap-2 cursor-pointer hover:z-[90]" style={{ perspective: "1000px" }}>
            <div 
                className="relative aspect-[3/4.35] transition-transform duration-700"
                style={{
                    transformStyle: "preserve-3d",
                    transform: isRevealed ? "rotateY(180deg)" : "rotateY(0deg)"
                }}
            >
                {/* Back Face (Verso - visible initially at rotateY(0)) */}
                <div
                    className="absolute inset-0 rounded-xl overflow-hidden glass-medieval border-2 border-[#c5a059]/40 z-20"
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(0deg)" }}
                >
                    <Image
                        src="/assets/cards/Anverso padrão.png"
                        alt="Verso"
                        fill
                        sizes="(max-width: 640px) 25vw, (max-width: 768px) 33vw, (max-width: 1200px) 25vw, 20vw"
                        className="object-cover"
                        draggable={false}
                    />
                </div>

                {/* Front Face (Actual Character/Place - visible when flipped at rotateY(180)) */}
                <div
                    className={`absolute inset-0 overflow-hidden glass-medieval transition-all duration-500 z-10 ${className}`}
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                    {/* Card Content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-end p-4">
                        {/* Placeholder for Character Art */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-transparent to-transparent opacity-80 z-10"></div>
 
                        {/* Decorative Frame Inner */}
                        <div className="absolute inset-2 border border-[#c5a059]/20 pointer-events-none group-hover:border-[#c5a059]/50 transition-colors"></div>
 
                        {/* Character Image Placeholder */}
                        {!image ? (
                            <div className="w-full h-full bg-[#1e1b4b]/40 flex items-center justify-center relative">
                                <span className="text-[#c5a059]/10 text-4xl font-serif select-none">?</span>
                            </div>
                        ) : (
                            <div className="absolute inset-0 w-full h-full overflow-hidden">
                                <Image 
                                    src={image} 
                                    alt={cardDisplayName}
                                    draggable={false}
                                    fill
                                    sizes="(max-width: 640px) 25vw, (max-width: 768px) 33vw, (max-width: 1200px) 25vw, 20vw"
                                    className={`object-cover transition-transform duration-700 group-hover:scale-110 ${label === "Lugar" ? "scale-[1.05]" : ""}`} 
                                />
                            </div>
                        )}
 
                        {/* Name Tag - Used inside the frame only for missing artwork. */}
                        {!image && (
                            <div className="relative z-20 w-full text-center">
                                <p className="text-[10px] medieval-text-gold font-bold mb-1 opacity-60 group-hover:opacity-100 transition-opacity">{label}</p>
                                <h3 className="text-xs md:text-sm font-serif text-[#e1e1e6] uppercase tracking-widest break-words leading-tight">
                                    {cardDisplayName}
                                </h3>
                            </div>
                        )}
                    </div>
 
                    {/* Hover Glow */}
                    <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                </div>
            </div>
            <div className="px-1 pb-1 text-center">
                <h3 className="text-[9px] sm:text-[11px] md:text-xs font-sans font-medium text-[#c5a059]/80 uppercase tracking-[0.06em] sm:tracking-[0.16em] leading-tight sm:leading-relaxed group-hover:text-[#e4c476] transition-colors">
                    {cardDisplayName}
                </h3>
            </div>
            <div className={`pointer-events-none absolute ${tooltipSideOffset} top-full z-[999] mt-2 w-60 -translate-x-1/2 translate-y-2 rounded-lg border border-[#c5a059]/45 bg-[#07070a]/95 px-4 py-3 text-center font-serif text-[13px] leading-snug text-[#d8b766] opacity-0 shadow-[0_18px_45px_rgba(0,0,0,0.75)] backdrop-blur-md transition-all duration-300 ease-out group-hover:translate-y-0 ${tooltipTilt} group-hover:opacity-100`}>
                <span className="mb-1 block font-sans text-[8px] font-bold uppercase tracking-[0.24em] text-[#c5a059]/70">{label}</span>
                {tooltipText}
            </div>
        </div>
    );
 
    if (href) {
        return (
            <Link href={href} className="block w-full h-full">
                {cardContent}
            </Link>
        );
    }
 
    return cardContent;
}
