"use client";

import Image from "next/image";
import { ENTITIES } from "@/app/data/entities";

export type PersonaSpeakerRole = "HOST" | "GUEST";

export default function PersonaSpeakerBadge({
    personaId,
    role,
    status,
}: {
    personaId: string;
    role?: PersonaSpeakerRole;
    status?: string | null;
}) {
    const entity = Object.values(ENTITIES).find((item) => item.name === personaId && item.type === "persona");
    const label = role === "HOST" ? "Anfitriao" : role === "GUEST" ? "Convidado" : null;

    return (
        <div className="mb-2 flex min-w-0 items-center gap-2">
            <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md border border-[#c5a059]/25 bg-black/50">
                {entity?.image ? (
                    <Image src={entity.image} alt={personaId} fill className="object-cover" sizes="28px" />
                ) : (
                    <span className="grid h-full w-full place-items-center text-[10px] font-bold text-[#c5a059]">
                        {personaId.slice(0, 2).toUpperCase()}
                    </span>
                )}
            </div>
            <div className="min-w-0">
                <div className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-[#ecd49c]">{personaId}</div>
                {(label || status) && (
                    <div className="truncate text-[9px] uppercase tracking-[0.16em] text-[#c5a059]/55">
                        {[label, status === "FAILED" ? "erro" : status === "PENDING" ? "gerando" : null].filter(Boolean).join(" / ")}
                    </div>
                )}
            </div>
        </div>
    );
}
