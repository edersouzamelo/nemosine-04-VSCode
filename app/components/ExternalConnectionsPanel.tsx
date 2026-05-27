"use client";

import { useState } from "react";

interface ConnectionDefinition {
    id: string;
    label: string;
    owner: string;
    purpose: string;
}

const personaConnections: Record<string, ConnectionDefinition[]> = {
    Arauto: [
        {
            id: "google-calendar",
            label: "Google Agenda",
            owner: "Arauto",
            purpose: "calendário e compromissos"
        }
    ],
    Treinador: [
        { id: "google-health", label: "Google Health", owner: "Treinador", purpose: "dados de saúde" },
        { id: "strava", label: "Strava", owner: "Treinador", purpose: "atividades físicas" },
        { id: "gravl", label: "Gravl", owner: "Treinador", purpose: "treinos e evolução" },
        { id: "google-fit", label: "Google Fit", owner: "Treinador", purpose: "atividade e bem-estar" }
    ],
    Mentor: [
        { id: "linkedin", label: "LinkedIn", owner: "Mentor", purpose: "trajetória profissional" }
    ],
    Mordomo: [
        { id: "open-finance", label: "Open Finance", owner: "Mordomo", purpose: "vida financeira" }
    ]
};

const allConnections = Object.values(personaConnections).flat();

interface ExternalConnectionsPanelProps {
    personaName?: string;
    variant?: "chat" | "space";
}

export default function ExternalConnectionsPanel({
    personaName,
    variant = "chat"
}: ExternalConnectionsPanelProps) {
    const [selected, setSelected] = useState<ConnectionDefinition | null>(null);
    const connections = variant === "space"
        ? allConnections
        : personaConnections[personaName || ""] || [];

    if (!connections.length) return null;

    return (
        <>
            {variant === "chat" ? (
                <section className="mb-2 shrink-0 rounded-xl border border-[#c5a059]/15 bg-black/30 px-3 py-2">
                    <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-thin scrollbar-thumb-[#c5a059]/20">
                        <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.2em] text-[#c5a059]/55">
                            Conexões
                        </span>
                        {connections.map((connection) => (
                            <ConnectionButton
                                key={connection.id}
                                connection={connection}
                                onClick={() => setSelected(connection)}
                            />
                        ))}
                    </div>
                </section>
            ) : (
                <section className="mt-8 rounded-2xl border border-[#c5a059]/15 bg-black/25 p-5 sm:p-6">
                    <div className="mb-5">
                        <h2 className="font-serif text-xl text-[#e7d4aa]">Conexões externas</h2>
                        <p className="mt-2 text-sm leading-6 text-white/55">
                            Vincule serviços às personas responsáveis por interpretar cada dimensão da sua rotina.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {connections.map((connection) => (
                            <div
                                key={connection.id}
                                className="rounded-xl border border-[#c5a059]/12 bg-black/25 p-4"
                            >
                                <p className="text-[10px] uppercase tracking-[0.18em] text-[#c5a059]/55">
                                    {connection.owner}
                                </p>
                                <p className="mt-2 text-base text-[#eee8dc]">{connection.label}</p>
                                <p className="mb-4 mt-1 text-xs text-white/48">{connection.purpose}</p>
                                <ConnectionButton
                                    connection={connection}
                                    onClick={() => setSelected(connection)}
                                    wide
                                />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label={`Conectar ${selected.label}`}
                        className="w-full max-w-md rounded-2xl border border-[#c5a059]/25 bg-[#0c0d11] p-6 shadow-2xl"
                    >
                        <p className="text-[10px] uppercase tracking-[0.22em] text-[#c5a059]/65">
                            {selected.owner}
                        </p>
                        <h3 className="mt-3 font-serif text-2xl text-[#e7d4aa]">
                            Conectar {selected.label}
                        </h3>
                        <p className="mt-4 text-sm leading-6 text-[#ded6c8]/72">
                            A autorização segura para esta conexão ainda será configurada. Nenhum dado foi compartilhado ou sincronizado.
                        </p>
                        <button
                            type="button"
                            onClick={() => setSelected(null)}
                            className="mt-6 w-full rounded-xl bg-[#c5a059] px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-black"
                        >
                            Entendi
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

function ConnectionButton({
    connection,
    onClick,
    wide = false
}: {
    connection: ConnectionDefinition;
    onClick: () => void;
    wide?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`${wide ? "w-full justify-center" : "shrink-0"} inline-flex items-center gap-1.5 rounded-lg border border-[#c5a059]/22 bg-[#c5a059]/[0.06] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#c5a059]/80 transition-colors hover:border-[#c5a059]/55 hover:bg-[#c5a059]/12`}
        >
            <span className="material-icons text-sm">link</span>
            Conectar {connection.label}
        </button>
    );
}
