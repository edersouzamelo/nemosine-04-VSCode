"use client";

import Image from "next/image";
import { ENTITIES } from "@/app/data/entities";
import RemovePersonaAction from "./RemovePersonaAction";

export type PersonaPresence = {
    id: string;
    personaId: string;
    role: "HOST" | "GUEST";
    active: boolean;
};

export default function PersonaPresenceStrip({
    participants,
    onRemove,
    disabled,
}: {
    participants: PersonaPresence[];
    onRemove: (personaId: string) => void;
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
                        className="group/presence relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#c5a059]/25 bg-black/45"
                        title={`${participant.personaId} - ${participant.role === "HOST" ? "Anfitriao" : "Convidado"}`}
                    >
                        {entity?.image ? (
                            <Image src={entity.image} alt={participant.personaId} fill className="object-cover" sizes="48px" />
                        ) : (
                            <span className="text-xs font-bold text-[#c5a059]">{participant.personaId.slice(0, 2).toUpperCase()}</span>
                        )}
                        <span className={`absolute bottom-0 left-0 right-0 truncate px-1 py-0.5 text-center text-[7px] font-bold uppercase tracking-[0.12em] ${participant.role === "HOST" ? "bg-[#c5a059]/85 text-black" : "bg-black/75 text-[#ecd49c]"}`}>
                            {participant.role === "HOST" ? "Host" : "Guest"}
                        </span>
                        {participant.role === "GUEST" && (
                            <RemovePersonaAction personaId={participant.personaId} disabled={disabled} onRemove={onRemove} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
