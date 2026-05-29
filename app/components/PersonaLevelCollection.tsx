"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLanguage } from "./LanguageProvider";
import PersonaCategoryExplorer from "./PersonaCategoryExplorer";
import AgentCard from "./AgentCard";

/** Renders §bold text§ as <strong> inline */
function renderBold(text: string) {
    const parts = text.split(/§([^§]+)§/);
    return parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i} className="text-[#fde68a] font-semibold">{part}</strong> : part
    );
}

interface PersonaItem {
    name: string;
    image?: string;
    href: string;
}

const PEREGRINO_AGENTS = [
    "Mentor", "Inimigo", "Bruxo", "Vidente", "Estrategista", "Cientista", "Narrador", "Psicólogo"
];

const VASSALO_AGENTS = [
    ...PEREGRINO_AGENTS,
    "Orquestrador-Arquiteto", "Vigia", "Executor", "Arauto", "Curador", "Artista", "Autor", "Espelho",
    "Sombra", "Desejo", "Dor", "Terapeuta", "Mordomo", "Mestre", "Sócio", "Burguês"
];

export default function PersonaLevelCollection({ items }: { items: PersonaItem[] }) {
    const { level, language, entityName } = useLanguage();
    const [carouselMode, setCarouselMode] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const allowedNames = useMemo(() => {
        return level === "Peregrino"
            ? PEREGRINO_AGENTS
            : level === "Vassalo"
                ? VASSALO_AGENTS
                : null;
    }, [level]);
            
    const visibleItems = useMemo(() => {
        return allowedNames
            ? allowedNames
                .map((name) => items.find((item) => item.name === name))
                .filter((item): item is PersonaItem => Boolean(item))
            : items;
    }, [allowedNames, items]);
        
    const showCategories = level === "Regente" || level === "Soberano";

    const scrollLeft = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: -300, behavior: "smooth" });
        }
    };

    const scrollRight = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: 300, behavior: "smooth" });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end pr-2">
                <button
                    type="button"
                    onClick={() => setCarouselMode(!carouselMode)}
                    title={carouselMode ? (language.startsWith("pt") ? "Ver em Grade" : "View in Grid") : (language.startsWith("pt") ? "Ver em Carrossel" : "View in Carousel")}
                    className="flex items-center justify-center rounded-lg border border-[#c5a059]/40 bg-black/45 w-10 h-10 text-[#c5a059] transition-all hover:border-[#c5a059] hover:bg-[#c5a059]/10 cursor-pointer font-bold"
                >
                    <span className="material-icons text-xl">{carouselMode ? "grid_on" : "view_carousel"}</span>
                </button>
            </div>

            {carouselMode ? (
                <div className="relative group/carousel max-w-full">
                    {/* Navigation Buttons (desktop only) */}
                    <button
                        type="button"
                        onClick={scrollLeft}
                        className="absolute left-[-20px] top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-10 h-10 rounded-full border border-[#c5a059]/40 bg-[#0a0a0c]/90 text-[#c5a059] hover:border-[#c5a059] hover:bg-[#c5a059]/10 transition-all cursor-pointer shadow-[0_0_15px_rgba(0,0,0,0.6)] focus:outline-none"
                        aria-label="Scroll Left"
                    >
                        <span className="text-xl">←</span>
                    </button>
                    
                    <button
                        type="button"
                        onClick={scrollRight}
                        className="absolute right-[-20px] top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-10 h-10 rounded-full border border-[#c5a059]/40 bg-[#0a0a0c]/90 text-[#c5a059] hover:border-[#c5a059]/10 transition-all cursor-pointer shadow-[0_0_15px_rgba(0,0,0,0.6)] focus:outline-none"
                        aria-label="Scroll Right"
                    >
                        <span className="text-xl">→</span>
                    </button>

                    {/* Horizontal Scroll Track */}
                    <div
                        ref={scrollRef}
                        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-8 pt-4 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                        style={{ paddingLeft: "calc(50% - 44vw)", paddingRight: "calc(50% - 44vw)" }}
                    >
                        {visibleItems.map((item) => (
                            <div key={item.name} className="shrink-0 w-[65vw] sm:w-[180px] md:w-[200px] max-w-[220px] snap-center">
                                <AgentCard
                                    name={item.name}
                                    displayName={entityName(item.name)}
                                    image={item.image}
                                    href={item.href}
                                    label="Persona"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <PersonaCategoryExplorer
                    key={level}
                    showCategories={showCategories}
                    initialCategory={level === "Regente" ? "all" : "strategic"}
                    items={visibleItems}
                />
            )}
        </div>
    );
}

const CHALLENGES_TRANSLATIONS: Record<string, Record<string, { label: string; quote: string; why: string }>> = {
    pt: {
        wisdom: {
            label: "Busco sabedoria para uma decisão de longo prazo",
            quote: "“Não procure apenas respostas rápidas — procure a cadência de quem já atravessou as eras. A sabedoria está em ver o fluxo contínuo.”",
            why: "O Mentor guia seus passos ajudando a identificar padrões ocultos e a cultivar a virtude da paciência antes de agir."
        },
        resilience: {
            label: "Preciso de resiliência ante o medo ou adversidade",
            quote: "“Eu não existo para destruir você. Existo para que você se levante mais forte do que quando começou. Sou seu espelho em chamas.”",
            why: "O Inimigo desafia seus limites e o força a confrontar seus pontos cegos, servindo como o catalisador ideal para a superação real."
        },
        possibilities: {
            label: "Desejo criar ou experimentar algo improvável",
            quote: "“Não me importo com regras estabelecidas. Eu misturo hipóteses e cozinho cenários em fogo lento. Vamos tentar o improvável?”",
            why: "O Bruxo é especialista em evocar realidades alternativas e propor ensaios criativos livres dos julgamentos da lógica pura."
        },
        foresight: {
            label: "Quero decifrar sinais sutis e antecipar o amanhã",
            quote: "“O amanhã deixa rastro no agora. Feche os olhos para o ruído da pressa e escute os murmúrios que habitam as fendas do tempo.”",
            why: "A Vidente amplia sua percepção intuitiva, ajudando a enxergar conexões sutis e tendências que a mente racional ignora."
        },
        strategy: {
            label: "Preciso estruturar metas e coordenar recursos",
            quote: "“A impulsividade é a aliada do erro. Nós desenhamos o tabuleiro completo, calculamos o custo e jogamos para vencer no longo prazo.”",
            why: "O Estrategista traz a visão panorâmica, mapeando riscos e estruturando caminhos racionais para alcançar a vitória com eficiência."
        },
        logic: {
            label: "Quero analisar dados frios de forma puramente racional",
            quote: "“Os sentimentos passam; os fatos permanecem. Deixe de lado as ilusões e observe a mecânica imutável da realidade observável.”",
            why: "O Cientista desconecta o drama emocional e foca em dados objetivos, leis universais e evidências empíricas sólidas."
        },
        storytelling: {
            label: "Desejo dar ordem e sentido ao caos da minha história",
            quote: "“A vida não é apenas um amontoado de fatos — é a história que você escolhe contar sobre eles. Qual o capítulo que inicia hoje?”",
            why: "O Narrador confere estrutura e perspectiva, transformando experiências dispersas em narrativas coerentes com propósito."
        },
        self_knowledge: {
            label: "Preciso harmonizar sentimentos ou dilemas internos",
            quote: "“Tudo o que você tenta esconder no porão de si mesmo cresce no escuro. Vamos sentar e escutar as vozes que você silenciou.”",
            why: "O Psicólogo decifra os mistérios do inconsciente, mediando conflitos entre sua sombra e luz com empatia profunda."
        }
    },
    es: {
        wisdom: {
            label: "Busco sabiduría para una decisión a largo plazo",
            quote: "“No busques solo respuestas rápidas; busca la cadencia de quien ya ha atravesado las eras. La sabiduría está en ver el flujo continuo.”",
            why: "El Mentor guía tus pasos ayudándote a identificar patrones ocultos y a cultivar la paciencia antes de actuar."
        },
        resilience: {
            label: "Necesito resiliencia ante el miedo o la adversidad",
            quote: "“No existo para destruirte. Existo para que te levantes más fuerte que cuando empezaste. Soy tu espejo en llamas.”",
            why: "El Enemigo desafía tus límites y te obliga a confrontar tus puntos ciegos, sirviendo como catalizador ideal para la superación."
        },
        possibilities: {
            label: "Deseo crear o experimentar algo improbable",
            quote: "“No me importan las reglas establecidas. Mezclo hipótesis y cocino escenarios a fuego lento. ¿Probamos lo improbable?”",
            why: "El Brujo es especialista en evocar realidades alternativas y proponer ensayos creativos libres de la lógica pura."
        },
        foresight: {
            label: "Quiero descifrar señales sutiles y anticipar el mañana",
            quote: "“El mañana deja rastro en el ahora. Cierra los ojos al ruido de la prisa y escucha los murmullos de las grietas del tiempo.”",
            why: "La Vidente amplía tu percepción intuitiva, ayudándote a ver conexiones sutiles y tendencias que la mente racional ignora."
        },
        strategy: {
            label: "Necesito estructurar metas y coordinar recursos",
            quote: "“La impulsividad es aliada del error. Diseñamos el tablero completo, calculamos el costo y jugamos para ganar a largo plazo.”",
            why: "El Estratega aporta una visión panorámica, mapeando riesgos y estructurando caminos racionales para lograr la victoria."
        },
        logic: {
            label: "Quiero analizar datos fríos de forma puramente racional",
            quote: "“Los sentimientos pasan; los hechos permanecen. Deja de lado las ilusiones y observa la mecánica de la realidad observable.”",
            why: "El Científico desconecta el drama emocional y se enfoca en datos objetivos, leyes universales y evidencia empírica."
        },
        storytelling: {
            label: "Deseo dar orden y sentido al caos de mi historia",
            quote: "“La vida no es solo un montón de hechos; es la historia que eliges contar sobre ellos. ¿Qué capítulo comienza hoy?”",
            why: "El Narrador otorga estructura y perspectiva, transformando experiencias dispersas en narrativas coherentes."
        },
        self_knowledge: {
            label: "Necesito armonizar sentimientos o dilemas internos",
            quote: "“Todo lo que intentas esconder en tu sótano crece en la oscuridad. Sentémonos y escuchemos las voces que silenciaste.”",
            why: "El Psicólogo descifra los misterios del inconsciente, mediando conflictos entre tu sombra y tu luz con empatía profunda."
        }
    },
    en: {
        wisdom: {
            label: "I seek wisdom for a long-term decision",
            quote: "“Do not just look for quick answers — seek the cadence of one who has crossed the eras. Wisdom lies in seeing the continuous flow.”",
            why: "The Mentor guides your steps by helping you identify hidden patterns and cultivate patience before taking action."
        },
        resilience: {
            label: "I need resilience in the face of fear or adversity",
            quote: "“I do not exist to destroy you. I exist so you stand up stronger than when you began. I am your mirror on fire.”",
            why: "The Enemy challenges your limits and forces you to confront your blind spots, serving as the perfect catalyst for growth."
        },
        possibilities: {
            label: "I want to create or experiment with something improbable",
            quote: "“I do not care for established rules. I mix hypotheses and cook scenarios over low heat. Shall we try the improbable?”",
            why: "The Sorcerer specializes in evoking alternative realities and proposing creative trials free from pure logic's bounds."
        },
        foresight: {
            label: "I want to decipher subtle signs and anticipate tomorrow",
            quote: "“Tomorrow leaves traces in the now. Close your eyes to the noise of haste and listen to the murmurs in the cracks of time.”",
            why: "The Watchman/Vidente expands your intuitive perception, helping you see subtle connections and trends pure reason misses."
        },
        strategy: {
            label: "I need to structure goals and coordinate resources",
            quote: "“Impulsiveness is the ally of error. We design the entire board, calculate the cost, and play to win in the long run.”",
            why: "The Strategist brings the bird's-eye view, mapping risks and structuring rational paths to achieve victory efficiently."
        },
        logic: {
            label: "I want to analyze cold data in a purely rational way",
            quote: "“Feelings pass; facts remain. Cast aside illusions and observe the unyielding mechanics of observable reality.”",
            why: "The Scientist disconnects emotional drama and focuses on objective data, universal laws, and solid empirical evidence."
        },
        storytelling: {
            label: "I want to give order and meaning to my chaotic story",
            quote: "“Life is not just a pile of facts — it is the story you choose to tell about them. What chapter begins today?”",
            why: "The Narrator provides structure and perspective, transforming scattered experiences into coherent narratives with purpose."
        },
        self_knowledge: {
            label: "I need to align inner feelings or personal conflicts",
            quote: "“Everything you try to hide in your basement grows in the dark. Let us sit and listen to the voices you silenced.”",
            why: "The Psychologist deciphers the mysteries of the unconscious, mediating conflicts between your shadow and light with deep empathy."
        }
    }
};

const CHALLENGES_METADATA: Record<string, { emoji: string; persona: string }> = {
    wisdom: { emoji: "🧭", persona: "Mentor" },
    resilience: { emoji: "🛡️", persona: "Inimigo" },
    possibilities: { emoji: "🧪", persona: "Bruxo" },
    foresight: { emoji: "👁️", persona: "Vidente" },
    strategy: { emoji: "♟️", persona: "Estrategista" },
    logic: { emoji: "🔬", persona: "Cientista" },
    storytelling: { emoji: "📖", persona: "Narrador" },
    self_knowledge: { emoji: "🧠", persona: "Psicólogo" }
};

export function PersonaLevelFooter() {
    const { level, language, t } = useLanguage();
    const [activeChallenge, setActiveChallenge] = useState<string | null>(null);

    const count = level === "Peregrino" ? PEREGRINO_AGENTS.length : level === "Vassalo" ? VASSALO_AGENTS.length : 56;

    if (level === "Peregrino") {
        const lang = language.startsWith("pt") ? "pt" : language === "es" ? "es" : "en";
        const challengeData = CHALLENGES_TRANSLATIONS[lang] || CHALLENGES_TRANSLATIONS.en;

        return (
            <div className="relative z-20 border-t border-[#c5a059]/10 bg-[#050507]/90 py-16 px-6 sm:px-12">
                <div className="max-w-5xl mx-auto space-y-16">
                    {/* Ornamental Divider */}
                    <div className="flex items-center justify-center gap-4 opacity-40">
                        <div className="h-px w-24 bg-gradient-to-r from-transparent to-[#c5a059]" />
                        <span className="text-[#c5a059] text-lg">⚜️</span>
                        <div className="h-px w-24 bg-gradient-to-l from-transparent to-[#c5a059]" />
                    </div>

                    {/* Section 1: Guide / Context */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                        <div className="space-y-6 text-left">
                            <span className="text-[10px] uppercase tracking-[0.25em] text-[#c5a059]/60 font-semibold block">{t("entryPortal")}</span>
                            <h3 className="font-display text-3xl uppercase tracking-widest text-[#c5a059]">{t("peregrinoPath")}</h3>
                            <p className="font-body text-base leading-relaxed text-[#eee8dc]/80">
                                {renderBold(t("peregrinoDesc"))}
                            </p>
                            <p className="font-body text-base leading-relaxed text-[#eee8dc]/70 italic">
                                {t("peregrinoQuote")}
                            </p>
                        </div>
                        <div className="glass-medieval rounded-2xl p-8 border border-[#c5a059]/20 bg-black/40 text-left space-y-4 shadow-[0_15px_30px_rgba(0,0,0,0.5)]">
                            <span className="text-[9px] uppercase tracking-[0.25em] text-amber-500 font-bold">{t("heuristicsTitle")}</span>
                            <ul className="space-y-3 font-body text-base text-[#eee8dc]/80">
                                <li className="flex gap-3">
                                    <span className="text-[#c5a059]">✦</span>
                                    <span>{t("heuristicStep1")}</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="text-[#c5a059]">✦</span>
                                    <span>{t("heuristicStep2")}</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="text-[#c5a059]">✦</span>
                                    <span>{t("heuristicStep3")}</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Interactive Section: Active Alignment Ritual */}
                    <div className="space-y-8 text-center pt-12 border-t border-[#c5a059]/10">
                        <div className="space-y-2">
                            <span className="text-[10px] uppercase tracking-[0.25em] text-amber-500 font-bold block">
                                {language.startsWith("pt") ? "RITUAL DE ALINHAMENTO ATIVO" : language === "es" ? "RITUAL DE ALINEACIÓN ACTIVA" : "ACTIVE ALIGNMENT RITUAL"}
                            </span>
                            <h3 className="font-display text-2xl sm:text-3xl uppercase tracking-widest text-[#c5a059]">
                                {language.startsWith("pt") ? "Com qual desafio você se depara no agora?" : language === "es" ? "¿Con qué desafío te enfrentas en el ahora?" : "What challenge do you face right now?"}
                            </h3>
                            <p className="font-body text-sm text-[#eee8dc]/70 max-w-xl mx-auto italic">
                                {language.startsWith("pt") 
                                    ? "Selecione seu momento atual para revelar a voz ativa do nível Peregrino recomendada para guiá-lo:" 
                                    : language === "es" 
                                        ? "Selecciona tu momento actual para revelar la voz activa del nivel Peregrino recomendada para guiarte:" 
                                        : "Select your current state to reveal the active Pilgrim-level voice recommended to guide you:"}
                            </p>
                        </div>

                        {/* Challenges Pill Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                            {Object.entries(challengeData).map(([id, item]) => {
                                const isSelected = activeChallenge === id;
                                return (
                                    <button
                                        key={id}
                                        onClick={() => setActiveChallenge(isSelected ? null : id)}
                                        className={`p-4 rounded-xl border text-center transition-all duration-300 flex flex-col items-center justify-center gap-2 cursor-pointer shadow-md group ${
                                            isSelected
                                                ? "border-[#c5a059] bg-[#c5a059]/15 shadow-[0_0_20px_rgba(197,160,89,0.25)] text-[#fde68a]"
                                                : "border-[#c5a059]/20 bg-black/45 text-[#eee8dc]/85 hover:border-[#c5a059]/50 hover:bg-black/60 hover:text-[#eee8dc]"
                                        }`}
                                    >
                                        <span className="text-2xl group-hover:scale-110 transition-transform duration-300">
                                            {CHALLENGES_METADATA[id]?.emoji}
                                        </span>
                                        <span className="font-body text-sm leading-snug font-semibold tracking-wide">
                                            {item.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Interactive Persona Recommendation Card */}
                        {activeChallenge && challengeData[activeChallenge] && (
                            <div className="glass-medieval rounded-2xl p-6 sm:p-8 border-2 border-[#c5a059]/40 bg-black/80 max-w-2xl mx-auto text-left shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative overflow-hidden animate-fade-in">
                                {/* Thin inner gold line */}
                                <div className="absolute inset-1.5 rounded-[12px] border border-[#c5a059]/10 pointer-events-none" />
                                
                                <div className="absolute -right-16 -bottom-16 w-48 h-48 rounded-full bg-[#c5a059]/5 blur-3xl pointer-events-none" />

                                <div className="relative z-10 space-y-5">
                                    <div className="flex justify-between items-start gap-4 border-b border-[#c5a059]/15 pb-4">
                                        <div>
                                            <span className="text-[9px] uppercase tracking-[0.25em] text-amber-500 font-bold block mb-1">
                                                {language.startsWith("pt") ? "CONSELHEIRO RECOMENDADO" : language === "es" ? "CONSEJERO RECOMENDADO" : "RECOMMENDED ADVISOR"}
                                            </span>
                                            <h4 className="font-display text-2xl uppercase tracking-widest text-[#c5a059]">
                                                {CHALLENGES_METADATA[activeChallenge]?.persona}
                                            </h4>
                                        </div>
                                        <button
                                            onClick={() => setActiveChallenge(null)}
                                            className="text-stone-500 hover:text-[#c5a059] transition-colors cursor-pointer text-xs uppercase tracking-widest px-2.5 py-1 rounded border border-[#c5a059]/15 bg-black/40"
                                        >
                                            ✕ {language.startsWith("pt") ? "Fechar" : language === "es" ? "Cerrar" : "Close"}
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <p className="font-body text-lg text-[#eee8dc]/95 italic leading-relaxed pl-4 border-l-2 border-[#c5a059]/50">
                                            {challengeData[activeChallenge].quote}
                                        </p>
                                        
                                        <div className="space-y-1">
                                            <h5 className="font-display text-[9px] uppercase tracking-widest text-[#c5a059]/80 font-bold">
                                                {language.startsWith("pt") ? "POR QUE EVOCAR:" : language === "es" ? "POR QUÉ INVOCAR:" : "WHY EVOKE:"}
                                            </h5>
                                            <p className="font-body text-sm leading-relaxed text-[#eee8dc]/75">
                                                {challengeData[activeChallenge].why}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pt-2 flex justify-end">
                                        <Link
                                            href={`/agents/${CHALLENGES_METADATA[activeChallenge]?.persona.toLowerCase()}`}
                                            className="inline-flex relative overflow-hidden rounded-lg border border-[#c5a059]/60 hover:border-[#c5a059] bg-[#c5a059]/10 hover:bg-[#c5a059]/20 px-6 py-2.5 font-display font-semibold uppercase tracking-[0.2em] text-[10px] text-[#fde68a] hover:text-[#fffbeb] transition-all duration-300 hover:shadow-[0_0_15px_rgba(197,160,89,0.2)] cursor-pointer"
                                        >
                                            {language.startsWith("pt") ? "Entrar em Diálogo" : language === "es" ? "Entrar en Diálogo" : "Enter Dialogue"}
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section 2: Mental Progression Grid (Levels) */}
                    <div className="space-y-8 text-center pt-8 border-t border-[#c5a059]/10">
                        <div className="space-y-2">
                            <span className="text-[10px] uppercase tracking-[0.25em] text-[#c5a059]/60 font-semibold">{t("ascensionTitle")}</span>
                            <h3 className="font-display text-2xl uppercase tracking-widest text-[#c5a059]">{t("levelsTitle")}</h3>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="glass-medieval rounded-xl p-6 border border-[#c5a059]/30 bg-[#c5a059]/5 text-center relative overflow-hidden group hover:border-[#c5a059]/60 transition-all duration-300 shadow-[0_10px_20px_rgba(0,0,0,0.4)]">
                                <span className="text-3xl block mb-3">🛡️</span>
                                <h4 className="font-display text-sm uppercase tracking-widest text-[#c5a059] mb-2">Peregrino</h4>
                                <span className="text-[9px] uppercase tracking-widest bg-amber-500/10 border border-amber-500/40 text-amber-500 px-2 py-0.5 rounded font-bold">{t("active")}</span>
                                <p className="font-body text-sm text-[#eee8dc]/70 leading-relaxed mt-4">
                                    {t("levelPeregrinoDesc")}
                                </p>
                            </div>
                            
                            <div className="glass-medieval rounded-xl p-6 border border-stone-850 bg-black/20 text-center relative overflow-hidden group hover:border-[#c5a059]/20 transition-all duration-300 opacity-60">
                                <span className="text-3xl block mb-3">⚔️</span>
                                <h4 className="font-display text-sm uppercase tracking-widest text-stone-400 mb-2">Vassalo</h4>
                                <span className="text-[9px] uppercase tracking-widest bg-stone-500/10 border border-stone-500/40 text-stone-450 px-2 py-0.5 rounded font-bold">{t("blocked")}</span>
                                <p className="font-body text-sm text-[#eee8dc]/50 leading-relaxed mt-4">
                                    {t("levelVassaloDesc")}
                                </p>
                            </div>

                            <div className="glass-medieval rounded-xl p-6 border border-stone-850 bg-black/20 text-center relative overflow-hidden group hover:border-[#c5a059]/20 transition-all duration-300 opacity-60">
                                <span className="text-3xl block mb-3">👑</span>
                                <h4 className="font-display text-sm uppercase tracking-widest text-stone-400 mb-2">Regente</h4>
                                <span className="text-[9px] uppercase tracking-widest bg-stone-500/10 border border-stone-500/40 text-stone-450 px-2 py-0.5 rounded font-bold">{t("blocked")}</span>
                                <p className="font-body text-sm text-[#eee8dc]/50 leading-relaxed mt-4">
                                    {t("levelRegenteDesc")}
                                </p>
                            </div>

                            <div className="glass-medieval rounded-xl p-6 border border-stone-850 bg-black/20 text-center relative overflow-hidden group hover:border-[#c5a059]/20 transition-all duration-300 opacity-60">
                                <span className="text-3xl block mb-3">⚜️</span>
                                <h4 className="font-display text-sm uppercase tracking-widest text-stone-400 mb-2">Soberano</h4>
                                <span className="text-[9px] uppercase tracking-widest bg-stone-500/10 border border-stone-500/40 text-stone-450 px-2 py-0.5 rounded font-bold">{t("blocked")}</span>
                                <p className="font-body text-sm text-[#eee8dc]/50 leading-relaxed mt-4">
                                    {t("levelSoberanoDesc")}
                                </p>
                            </div>
                        </div>
                        <p className="font-body text-sm text-[#c5a059]/60 italic mt-6">
                            {t("ascendTip")}
                        </p>
                    </div>

                    {/* Footer text */}
                    <div className="pt-8 border-t border-[#c5a059]/10 text-center">
                        <p className="text-[9px] uppercase tracking-widest text-stone-500">
                            Existem {count} processos cognitivos ativos neste nível da rede Nemosine.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <footer className="relative z-20 border-t border-[#c5a059]/10 bg-black/60 p-8 text-center">
            <p className="text-[10px] medieval-text-gold opacity-40">
                Existem {count} processos cognitivos ativos neste nível da rede Nemosine. Selecione uma persona para iniciar o processamento.
            </p>
        </footer>
    );
}
