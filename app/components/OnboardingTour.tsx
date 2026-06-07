"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

const STORAGE_KEY = "nemosine_onboarding_completed";

export interface TourStep {
    target?: string;
    title: string;
    text: string;
}

interface HighlightRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

function getViewportMetrics() {
    const visualViewport = window.visualViewport;
    return {
        width: visualViewport?.width || window.innerWidth,
        height: visualViewport?.height || window.innerHeight,
        offsetTop: visualViewport?.offsetTop || 0,
        offsetLeft: visualViewport?.offsetLeft || 0,
    };
}

const defaultTourSteps: TourStep[] = [
    {
        target: "origens",
        title: "Origens",
        text: "Comece por aqui. Em Origens você entende a proposta do Nemosine e inicia sua primeira travessia.",
    },
    {
        target: "travessia-input",
        title: "Campo de busca",
        text: "Digite o que você precisa agora. O sistema deve ajudar a encontrar a voz certa para sua necessidade.",
    },
    {
        target: "iniciar-travessia",
        title: "Iniciar Travessia",
        text: "A Travessia é o caminho guiado para transformar uma necessidade em direção prática.",
    },
    {
        target: "personas",
        title: "Personas",
        text: "Personas são agentes cognitivos especializados. Cada uma pensa com uma função diferente: decidir, organizar, proteger, criar ou analisar.",
    },
    {
        target: "lugares",
        title: "Lugares",
        text: "Lugares são ambientes de processamento. Eles ajudam a dar forma ao tipo de pensamento que você quer acessar.",
    },
    {
        target: "dominios",
        title: "Domínios",
        text: "Domínios reúnem ferramentas práticas: agenda, contas, prontuário, diário, hábitos, jogos e outros aplicativos integrados.",
    },
    {
        target: "memorias",
        title: "Memórias",
        text: "Memórias guardam Registros, Rastros e Rascunhos. É aqui que sua continuidade começa a ganhar forma.",
    },
    {
        target: "comunidade",
        title: "Comunidade",
        text: "Quando quiser compartilhar experiências ou acompanhar atualizações, entre pela Comunidade.",
    },
    {
        title: "Primeira travessia",
        text: "Pronto. Agora escolha uma necessidade real e comece sua primeira travessia.",
    },
];

function getTourElement(target?: string) {
    if (!target) return null;
    const candidates = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`));
    return candidates.find((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    }) || null;
}

function measureElement(target?: string): HighlightRect | null {
    const element = getTourElement(target);
    if (!element) return null;

    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const viewport = getViewportMetrics();
    const padding = 8;
    const left = Math.max(8 + viewport.offsetLeft, rect.left + viewport.offsetLeft - padding);
    const top = Math.max(8 + viewport.offsetTop, rect.top + viewport.offsetTop - padding);

    return {
        top,
        left,
        width: Math.min(viewport.width - 16, rect.width + padding * 2),
        height: rect.height + padding * 2,
    };
}

export default function OnboardingTour({
    steps = defaultTourSteps,
    tourId = "inicio",
    storageKey = STORAGE_KEY,
}: {
    steps?: TourStep[];
    tourId?: string;
    storageKey?: string;
}) {
    const { data: session, status } = useSession();
    const [active, setActive] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [highlight, setHighlight] = useState<HighlightRect | null>(null);
    const [ready, setReady] = useState(false);
    const [completed, setCompleted] = useState(false);

    const step = steps[stepIndex];
    const isFirst = stepIndex === 0;
    const isLast = stepIndex === steps.length - 1;
    const scopedStorageKey = useMemo(() => {
        const userKey = session?.user?.id || session?.user?.email || "anonymous";
        return `${storageKey}:${tourId}:${userKey.toLowerCase()}`;
    }, [session?.user?.email, session?.user?.id, storageKey, tourId]);

    const updateHighlight = useCallback(() => {
        if (!active) return;
        setHighlight(measureElement(step?.target));
    }, [active, step?.target]);

    useEffect(() => {
        if (status === "loading") return;

        setReady(true);
        const storedCompleted = window.localStorage.getItem(scopedStorageKey) === "true";
        setCompleted(storedCompleted);
        setActive(false);
        setStepIndex(0);
        if (!storedCompleted) {
            const timer = window.setTimeout(() => setActive(true), 650);
            return () => window.clearTimeout(timer);
        }
    }, [scopedStorageKey, status]);

    useEffect(() => {
        if (!active) return;
        const target = getTourElement(step?.target);
        target?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });

        updateHighlight();
        const measureTimers = [120, 320, 620, 940].map((delay) => window.setTimeout(updateHighlight, delay));
        window.addEventListener("resize", updateHighlight);
        window.visualViewport?.addEventListener("resize", updateHighlight);
        window.visualViewport?.addEventListener("scroll", updateHighlight);
        window.addEventListener("scroll", updateHighlight, true);
        return () => {
            measureTimers.forEach((timer) => window.clearTimeout(timer));
            window.removeEventListener("resize", updateHighlight);
            window.visualViewport?.removeEventListener("resize", updateHighlight);
            window.visualViewport?.removeEventListener("scroll", updateHighlight);
            window.removeEventListener("scroll", updateHighlight, true);
        };
    }, [active, step?.target, updateHighlight]);

    const tooltipStyle = useMemo(() => {
        const margin = 16;
        const viewport = typeof window === "undefined"
            ? { width: 320, height: 640, offsetTop: 0, offsetLeft: 0 }
            : getViewportMetrics();
        const width = Math.min(360, Math.max(280, viewport.width - margin * 2));

        if (!highlight) {
            return {
                left: viewport.offsetLeft + (viewport.width - width) / 2,
                top: viewport.offsetTop + viewport.height / 2,
                width,
                transform: "translateY(-50%)",
            };
        }

        const placeBelow = highlight.top + highlight.height + 18;
        const top = placeBelow + 220 < viewport.offsetTop + viewport.height
            ? placeBelow
            : Math.max(viewport.offsetTop + margin, highlight.top - 238);
        const left = Math.min(
            viewport.offsetLeft + viewport.width - width - margin,
            Math.max(viewport.offsetLeft + margin, highlight.left + highlight.width / 2 - width / 2)
        );

        return { left, top, width, transform: "none" };
    }, [highlight]);

    const completeTour = () => {
        window.localStorage.setItem(scopedStorageKey, "true");
        setCompleted(true);
        setActive(false);
        setStepIndex(0);
    };

    const restartTour = () => {
        window.localStorage.removeItem(scopedStorageKey);
        setCompleted(false);
        setStepIndex(0);
        setActive(true);
        window.setTimeout(updateHighlight, 80);
    };

    useEffect(() => {
        const handleRestartRequest = (event: Event) => {
            event.preventDefault();
            restartTour();
        };
        window.addEventListener("nemosine:restart-onboarding-tour", handleRestartRequest);
        return () => window.removeEventListener("nemosine:restart-onboarding-tour", handleRestartRequest);
    });

    useEffect(() => {
        if (!ready) return;

        const params = new URLSearchParams(window.location.search);
        if (params.get("guia") !== "1") return;

        restartTour();
        params.delete("guia");
        const query = params.toString();
        window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    }, [ready]);

    if (!ready) return null;

    return (
        <>
            {active && (
                <div className="fixed inset-0 z-[9990] pointer-events-none">
                    {highlight ? (
                        <div
                            className="absolute rounded-2xl border border-[#f3d18a] shadow-[0_0_0_9999px_rgba(0,0,0,0.76),0_0_28px_rgba(243,209,138,0.55)] transition-all duration-300"
                            style={{
                                top: highlight.top,
                                left: highlight.left,
                                width: highlight.width,
                                height: highlight.height,
                            }}
                        />
                    ) : (
                        <div className="absolute inset-0 bg-black/76" />
                    )}

                    <section
                        className="pointer-events-auto fixed rounded-2xl border border-[#c5a059]/45 bg-[#07070a]/95 p-4 text-[#eee8dc] shadow-[0_24px_80px_rgba(0,0,0,0.82),0_0_32px_rgba(197,160,89,0.14)] backdrop-blur-xl transition-all duration-300 sm:p-5"
                        style={tooltipStyle}
                        role="dialog"
                        aria-live="polite"
                        aria-label={`Guia do Nemosine: ${tourId}`}
                    >
                        <div className="mb-3 flex items-start justify-between gap-4">
                            <div>
                                <p className="font-display text-[10px] font-bold uppercase tracking-[0.26em] text-[#c5a059]/70">
                                    Guia inicial
                                </p>
                                <h2 className="mt-1 font-display text-lg uppercase tracking-[0.16em] text-[#e4c476]">
                                    {step.title}
                                </h2>
                            </div>
                            <span className="shrink-0 rounded-full border border-[#c5a059]/25 px-2 py-1 font-mono text-[10px] text-[#c5a059]/70">
                                {stepIndex + 1}/{steps.length}
                            </span>
                        </div>

                        <p className="font-body text-base leading-relaxed text-[#f3ead8]/90 sm:text-lg">
                            {step.text}
                        </p>

                        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                            <button
                                type="button"
                                onClick={completeTour}
                                className="px-2 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#c5a059]/45 transition-colors hover:text-[#c5a059]/80"
                            >
                                Pular
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
                                    disabled={isFirst}
                                    className="rounded-xl border border-[#c5a059]/25 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#c5a059]/75 transition-colors hover:border-[#c5a059]/55 hover:text-[#e4c476] disabled:cursor-not-allowed disabled:opacity-35"
                                >
                                    Voltar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (isLast) completeTour();
                                        else setStepIndex((current) => current + 1);
                                    }}
                                    className="rounded-xl border border-[#c5a059]/70 bg-gradient-to-r from-[#6b1e0f] via-[#993b1b] to-[#6b1e0f] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#fde68a] shadow-[0_0_20px_rgba(197,160,89,0.18)] transition-colors hover:text-[#fff7d6]"
                                >
                                    {isLast ? "Finalizar" : "Próximo"}
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            )}
        </>
    );
}
