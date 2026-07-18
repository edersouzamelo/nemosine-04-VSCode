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
                title="Convidar persona"
                aria-label="Convidar persona"
                className="group/action relative flex h-10 w-full items-center gap-3 rounded-lg border border-[#c5a059]/25 bg-black/45 px-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-[#c5a059] transition-colors hover:border-[#c5a059]/60 hover:bg-[#c5a059]/10 disabled:cursor-not-allowed disabled:opacity-35 lg:w-10 lg:justify-center lg:gap-0 lg:px-0"
            >
                <span className="material-icons text-[18px]">group_add</span>
                <span className="lg:hidden">Convidar persona</span>
                <span className="pointer-events-none absolute left-1/2 top-full z-[80] mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-[#c5a059]/25 bg-[#07070a]/95 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-[#c5a059] opacity-0 shadow-xl transition-opacity group-hover/action:opacity-100 lg:block">
                    Convidar persona
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
