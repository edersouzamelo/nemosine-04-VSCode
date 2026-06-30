"use client";

import Image from "next/image";
import { ENTITIES } from "@/app/data/entities";
import RemovePersonaAction from "./RemovePersonaAction";

export type PersonaPresence = {
    id: string;
    personaId: string;
    role: "HOST" | "GUEST";
    active: boolean;
    muted?: boolean;
    pending?: boolean;
};

export default function PersonaPresenceStrip({
    participants,
    onRemove,
    onMuteToggle,
    disabled,
}: {
    participants: PersonaPresence[];
    onRemove: (personaId: string) => void;
    onMuteToggle: (personaId: string, muted: boolean) => void;
    disabled?: boolean;
}) {
    const activeParticipants = participants.filter((participant) => participant.active).slice(0, 5);
    if (activeParticipants.length === 0) return null;

    return (
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto border-b border-[#c5a059]/10 bg-black/55 px-3 py-2 scrollbar-thin scrollbar-thumb-[#c5a059]/25">
            {activeParticipants.map((participant) => {
                const entity = Object.values(ENTITIES).find((item) => item.name === participant.personaId && item.type === "persona");
                return (
                    <div
                        key={`${participant.id}-${participant.personaId}`}
                        className={`group/presence relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-black/45 ${
                            participant.pending
                                ? "animate-pulse border-[#c5a059]/55 opacity-75"
                                : participant.muted ? "border-amber-400/45 opacity-65 grayscale" : "border-[#c5a059]/25"
                        }`}
                        title={`${participant.personaId} - ${participant.pending ? "Entrando" : participant.role === "HOST" ? "Anfitriao" : "Convidado"}${participant.muted ? " / Silenciado" : ""}`}
                    >
                        {entity?.image ? (
                            <Image src={entity.image} alt={participant.personaId} fill className="object-cover" sizes="48px" />
                        ) : (
                            <span className="text-xs font-bold text-[#c5a059]">{participant.personaId.slice(0, 2).toUpperCase()}</span>
                        )}
                        <span className={`absolute bottom-0 left-0 right-0 truncate px-1 py-0.5 text-center text-[7px] font-bold uppercase tracking-[0.12em] ${participant.role === "HOST" ? "bg-[#c5a059]/85 text-black" : "bg-black/75 text-[#ecd49c]"}`}>
                            {participant.pending ? "..." : participant.muted ? "Mudo" : participant.role === "HOST" ? "Host" : "Guest"}
                        </span>
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onMuteToggle(participant.personaId, Boolean(participant.muted));
                            }}
                            disabled={disabled || participant.pending}
                            title={participant.muted ? `Reativar ${participant.personaId}` : `Silenciar ${participant.personaId}`}
                            aria-label={participant.muted ? `Reativar ${participant.personaId}` : `Silenciar ${participant.personaId}`}
                            className="absolute left-1 top-1 grid h-5 w-5 place-items-center rounded-md border border-black/45 bg-black/70 text-[#ecd49c] opacity-0 transition-opacity hover:bg-[#c5a059]/20 disabled:cursor-not-allowed disabled:opacity-20 group-hover/presence:opacity-100"
                        >
                            <span className="material-icons text-[13px] leading-none">{participant.muted ? "volume_up" : "volume_off"}</span>
                        </button>
                        {participant.role === "GUEST" && !participant.pending && (
                            <RemovePersonaAction personaId={participant.personaId} disabled={disabled} onRemove={onRemove} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
