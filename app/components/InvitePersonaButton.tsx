"use client";

import React from "react";
import InvitePersonaDialog from "./InvitePersonaDialog";

export default function InvitePersonaButton({
    hostPersonaId,
    presentPersonaIds,
    guestCount,
    disabled,
    onInvite,
}: {
    hostPersonaId: string;
    presentPersonaIds: string[];
    guestCount: number;
    disabled?: boolean;
    onInvite: (personaId: string) => void;
}) {
    const [open, setOpen] = React.useState(false);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                disabled={disabled}
                title="DEV-ONLY: Convidar persona"
                aria-label="DEV-ONLY: Convidar persona"
                className="group/action relative flex h-10 w-full items-center gap-3 rounded-lg border border-[#4169e1]/45 bg-[#081126]/75 px-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-[#8fb3ff] transition-colors hover:border-[#8fb3ff]/70 hover:bg-[#4169e1]/15 disabled:cursor-not-allowed disabled:opacity-35 lg:w-10 lg:justify-center lg:gap-0 lg:px-0"
            >
                <span className="material-icons text-[18px]">group_add</span>
                <span className="lg:hidden">DEV-ONLY Convite</span>
                <span className="pointer-events-none absolute left-1/2 top-full z-[80] mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-[#4169e1]/45 bg-[#071027]/95 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-[#8fb3ff] opacity-0 shadow-xl transition-opacity group-hover/action:opacity-100 lg:block">
                    DEV-ONLY Convite
                </span>
            </button>
            <InvitePersonaDialog
                open={open}
                hostPersonaId={hostPersonaId}
                presentPersonaIds={presentPersonaIds}
                guestCount={guestCount}
                onClose={() => setOpen(false)}
                onInvite={(personaId) => {
                    onInvite(personaId);
                    setOpen(false);
                }}
            />
        </>
    );
}
