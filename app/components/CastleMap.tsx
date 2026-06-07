"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLanguage, type NemosineLevel } from "./LanguageProvider";
import {
    CASTLE_LEVEL_ORDER,
    CASTLE_LEVEL_PERSONA_LIMITS,
    castleMapPoints,
    type CastleMapPoint,
    type CastleVisualStatus,
} from "../data/castleMapData";
import type { TravessiaSnapshot } from "../lib/travessia/types";

const statusLabels: Record<CastleVisualStatus, string> = {
    accessible: "Acessivel",
    blocked: "Bloqueado",
    in_progress: "Em progresso",
    completed: "Concluido",
};

const typeLabels: Record<CastleMapPoint["type"], string> = {
    core: "Nucleo",
    personas: "Personas",
    travessia: "Travessia",
    dominios: "Dominios",
    memorias: "Memorias",
    lugares: "Lugares",
};

function levelRank(level: NemosineLevel) {
    return CASTLE_LEVEL_ORDER.indexOf(level);
}

function resolveStatus(point: CastleMapPoint, level: NemosineLevel): CastleVisualStatus {
    const currentRank = levelRank(level);
    const requiredRank = levelRank(point.requiredLevel);

    if (currentRank < requiredRank) return "blocked";
    if (requiredRank < currentRank) return "completed";
    if (point.type === "travessia") return "in_progress";
    return "accessible";
}

function getStatusClasses(status: CastleVisualStatus) {
    switch (status) {
        case "blocked":
            return "border-[#7b6a4a]/45 bg-[#100d0d]/90 text-[#8f7f5c] shadow-[0_0_18px_rgba(0,0,0,0.55)]";
        case "in_progress":
            return "border-[#e0bb69] bg-[#2a1d0c]/95 text-[#f4d184] shadow-[0_0_24px_rgba(224,187,105,0.25)]";
        case "completed":
            return "border-emerald-300/45 bg-[#0b1a13]/95 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.18)]";
        default:
            return "border-[#c5a059]/75 bg-[#0a0a0c]/95 text-[#f6d98d] shadow-[0_0_24px_rgba(197,160,89,0.25)]";
    }
}

function getPointIcon(type: CastleMapPoint["type"]) {
    switch (type) {
        case "personas":
            return "auto_awesome";
        case "travessia":
            return "route";
        case "dominios":
            return "apps";
        case "memorias":
            return "inventory_2";
        case "lugares":
            return "temple_buddhist";
        default:
            return "castle";
    }
}

export default function CastleMap({ travessiaSnapshot }: { travessiaSnapshot?: TravessiaSnapshot | null }) {
    const { level } = useLanguage();
    const [selectedId, setSelectedId] = useState(castleMapPoints[0]?.id || "");
    const [show3dFrame, setShow3dFrame] = useState(false);

    const points = useMemo(() => {
        return castleMapPoints.map((point) => ({
            ...point,
            visualStatus: point.visualStatus || resolveStatus(point, level),
        }));
    }, [level]);

    const selected = points.find((point) => point.id === selectedId) || points[0];
    const selectedLocked = selected.visualStatus === "blocked";

    const legend = (
        <div className="grid gap-2 rounded-xl border border-[#c5a059]/15 bg-black/40 p-3 text-[10px] uppercase tracking-[0.16em] text-[#c5a059]/55 backdrop-blur-md sm:grid-cols-4">
            <span><b className="text-[#f6d98d]">Dourado</b> acessivel</span>
            <span><b className="text-emerald-200">Verde</b> concluido</span>
            <span><b className="text-[#f4d184]">Pulso</b> em progresso</span>
            <span><b className="text-[#8f7f5c]">Cinza</b> bloqueado</span>
        </div>
    );

    return (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-3">
                <div data-tour="castelo-map" className="relative min-h-[620px] overflow-hidden rounded-2xl border border-[#c5a059]/25 bg-[#060509]/75 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-md">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(197,160,89,0.18),transparent_32%),radial-gradient(circle_at_18%_80%,rgba(80,36,26,0.42),transparent_28%),linear-gradient(180deg,rgba(35,15,17,0.88),rgba(3,3,6,0.98))]" />
                    <div className="absolute inset-x-0 bottom-0 h-[48%] bg-[linear-gradient(180deg,transparent,rgba(120,70,32,0.14)),repeating-linear-gradient(90deg,rgba(197,160,89,0.07)_0_1px,transparent_1px_84px)]" />

                    <div className="absolute inset-0">
                        <img
                            src="/assets/images/castle-map-2d.png"
                            alt=""
                            className="h-full w-full object-cover opacity-85 saturate-[0.92]"
                            draggable={false}
                        />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_47%,transparent_0_42%,rgba(0,0,0,0.18)_66%,rgba(0,0,0,0.62)_100%),linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.38))]" />
                    </div>

                    {show3dFrame && (
                        <div className="absolute inset-0 z-20 bg-[#050507]">
                            <iframe
                                title="Castelo 3D"
                                src="/castelo/preview-3d"
                                className="h-full w-full border-0"
                                loading="lazy"
                            />
                        </div>
                    )}

                    <div data-tour="castelo-level" className="absolute left-4 top-4 z-30 max-w-xs rounded-xl border border-[#c5a059]/20 bg-black/45 p-4 backdrop-blur-md">
                        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#c5a059]/55">Nível atual</p>
                        <p className="mt-1 font-display text-2xl uppercase tracking-[0.18em] text-[#d9b865]">{level}</p>
                        <p className="mt-2 text-xs leading-5 text-white/50">
                            {CASTLE_LEVEL_PERSONA_LIMITS[level]} personas disponiveis{level === "Soberano" ? " + Lugares da Mente" : ""}.
                        </p>
                    </div>

                    <div className="absolute right-4 top-4 z-30 flex items-center gap-2 rounded-xl border border-[#c5a059]/20 bg-black/45 p-2 backdrop-blur-md">
                        <button
                            type="button"
                            onClick={() => setShow3dFrame((current) => !current)}
                            className="flex h-9 items-center justify-center rounded-lg border border-[#c5a059]/25 px-3 text-[9px] font-bold uppercase tracking-[0.16em] text-[#d9b865] transition-colors hover:bg-[#c5a059]/12"
                            aria-pressed={show3dFrame}
                        >
                            {show3dFrame ? "2D" : "3D"}
                        </button>
                    </div>

                    {!show3dFrame && points.map((point) => {
                        const status = point.visualStatus || "accessible";
                        const locked = status === "blocked";
                        const selectedPoint = selected.id === point.id;
                        return (
                            <button
                                key={point.id}
                                type="button"
                                onClick={() => setSelectedId(point.id)}
                                className={`absolute z-30 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border transition-all duration-150 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#c5a059]/55 ${getStatusClasses(status)} ${selectedPoint ? "scale-110 ring-2 ring-[#f5d48a]/50" : ""} ${locked ? "grayscale" : ""}`}
                                style={{ left: `${point.x}%`, top: `${point.y}%` }}
                                aria-label={point.name}
                            >
                                <span className="material-icons text-[21px]">{locked ? "lock" : getPointIcon(point.type)}</span>
                                {status === "in_progress" && <span className="absolute inset-[-7px] rounded-full border border-[#c5a059]/35 animate-ping" />}
                            </button>
                        );
                    })}
                </div>

                <div data-tour="castelo-legend">{legend}</div>
            </div>

            <aside data-tour="castelo-details" className="rounded-2xl border border-[#c5a059]/25 bg-black/45 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-md lg:sticky lg:top-6 lg:self-start">
                {travessiaSnapshot && (
                    <div className="mb-5 rounded-xl border border-[#4169e1]/30 bg-[#4169e1]/10 p-4">
                        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#4169e1]">devonly - Travessia consolidada</p>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-[#cbd6ff]">
                            <span>Progresso: <b>{travessiaSnapshot.progressoGeral}%</b></span>
                            <span>Boss: <b>{travessiaSnapshot.bossAtivo?.nome || "nenhum"}</b></span>
                            <span>Reliquias: <b>{travessiaSnapshot.reliquias.filter((r) => r.status === "conquistada").length}/{travessiaSnapshot.reliquias.length}</b></span>
                            <span>Selo: <b>indisponivel</b></span>
                        </div>
                    </div>
                )}

                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#c5a059]/55">{typeLabels[selected.type]}</p>
                        <h2 className="mt-2 font-display text-2xl uppercase tracking-[0.14em] text-[#d9b865]">{selected.name}</h2>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[9px] uppercase tracking-[0.18em] ${getStatusClasses(selected.visualStatus || "accessible")}`}>
                        {statusLabels[selected.visualStatus || "accessible"]}
                    </span>
                </div>

                <p className="mt-5 text-sm leading-7 text-[#e9dfcb]/75">{selected.description}</p>

                <div className="mt-5 rounded-xl border border-[#c5a059]/12 bg-black/30 p-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#c5a059]/50">Nível exigido</p>
                    <p className="mt-1 text-sm font-semibold text-[#d9b865]">{selected.requiredLevel}</p>
                    {selectedLocked && (
                        <p className="mt-3 text-xs leading-5 text-[#c5a059]/65">
                            Disponível a partir do nível {selected.requiredLevel}.
                        </p>
                    )}
                </div>

                {selectedLocked ? (
                    <button
                        type="button"
                        disabled
                        className="mt-6 w-full rounded-xl border border-[#7b6a4a]/30 bg-black/30 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#8f7f5c] disabled:cursor-not-allowed"
                    >
                        Portao fechado
                    </button>
                ) : (
                    <Link
                        href={selected.route}
                        className="mt-6 flex w-full items-center justify-center rounded-xl border border-[#c5a059]/55 bg-[#c5a059]/12 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#f6d98d] transition-colors hover:bg-[#c5a059]/20"
                    >
                        Entrar nesta area
                    </Link>
                )}
            </aside>
        </section>
    );
}
