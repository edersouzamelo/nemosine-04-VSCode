"use client";

import Image from "next/image";
import React from "react";
import { ENTITIES, PERSONAS } from "@/app/data/entities";

export default function InvitePersonaDialog({
    open,
    hostPersonaId,
    presentPersonaIds,
    guestCount,
    onClose,
    onInvite,
}: {
    open: boolean;
    hostPersonaId: string;
    presentPersonaIds: string[];
    guestCount: number;
    onClose: () => void;
    onInvite: (personaId: string) => void;
}) {
    const [query, setQuery] = React.useState("");
    const present = new Set(presentPersonaIds);
    const limitReached = guestCount >= 4;
    const normalizedQuery = query
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    const personas = PERSONAS
        .map((personaName) => Object.values(ENTITIES).find((entity) => entity.name === personaName && entity.type === "persona"))
        .filter((entity): entity is NonNullable<typeof entity> => Boolean(entity))
        .filter((entity) => {
            if (!normalizedQuery) return true;
            const haystack = `${entity.name} ${entity.phrase}`
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase();
            return haystack.includes(normalizedQuery);
        });

    React.useEffect(() => {
        if (!open) setQuery("");
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center">
            <div className="flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-[#c5a059]/25 bg-[#050507] shadow-2xl">
                <header className="flex items-center justify-between border-b border-[#c5a059]/15 p-4">
                    <div>
                        <h2 className="font-serif text-lg uppercase tracking-widest text-[#ecd49c]">Convidar persona</h2>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#c5a059]/65">{guestCount} de 4 convidados</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="grid h-9 w-9 place-items-center rounded-md border border-[#c5a059]/20 text-[#c5a059] hover:bg-[#c5a059]/10"
                        aria-label="Fechar convite"
                    >
                        <span className="material-icons text-[20px]">close</span>
                    </button>
                </header>
                <div className="border-b border-[#c5a059]/15 p-4">
                    <div className="flex items-center gap-2 rounded-lg border border-[#c5a059]/25 bg-black/45 px-3 py-2">
                        <span className="material-icons text-[18px] text-[#c5a059]/65">search</span>
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Buscar persona"
                            className="min-w-0 flex-1 bg-transparent text-sm text-[#e1e1e6] outline-none placeholder:text-[#c5a059]/35"
                        />
                    </div>
                </div>
                <div className="grid max-h-[58dvh] grid-cols-1 gap-2 overflow-y-auto p-4 sm:grid-cols-2">
                    {personas.map((persona) => {
                        const isHost = persona.name === hostPersonaId;
                        const isPresent = present.has(persona.name);
                        const disabled = isHost || isPresent || limitReached;
                        const reason = isHost ? "Anfitriao" : isPresent ? "Presente" : limitReached ? "Limite atingido" : "Convidar";

                        return (
                            <button
                                key={persona.name}
                                type="button"
                                disabled={disabled}
                                onClick={() => onInvite(persona.name)}
                                className="flex min-h-20 items-center gap-3 rounded-lg border border-[#c5a059]/15 bg-black/35 p-3 text-left transition-colors hover:border-[#c5a059]/45 hover:bg-[#c5a059]/10 disabled:cursor-not-allowed disabled:opacity-45"
                            >
                                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-[#c5a059]/20 bg-black/50">
                                    {persona.image && <Image src={persona.image} alt={persona.name} fill className="object-cover" sizes="48px" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-xs font-bold uppercase tracking-[0.18em] text-[#ecd49c]">{persona.name}</div>
                                    <div className="mt-1 line-clamp-2 text-xs leading-snug text-[#e1e1e6]/60">{persona.phrase}</div>
                                </div>
                                <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.16em] text-[#c5a059]/65">{reason}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
