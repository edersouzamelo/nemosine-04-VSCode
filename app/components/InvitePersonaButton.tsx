"use client";

import React from "react";
import InvitePersonaDialog from "./InvitePersonaDialog";

export default function InvitePersonaButton({
    hostPersonaId,
    presentPersonaIds,
    guestCount,
    disabled,
    devOnly = false,
    onInvite,
}: {
    hostPersonaId: string;
    presentPersonaIds: string[];
    guestCount: number;
    disabled?: boolean;
    devOnly?: boolean;
    onInvite: (personaId: string) => void;
}) {
    const [open, setOpen] = React.useState(false);
    const title = devOnly ? "Convidar persona - devonly" : "Convidar persona";
    const buttonClass = devOnly
        ? "group/action relative flex h-10 w-full items-center gap-3 rounded-lg border border-[#4169e1]/45 bg-[#4169e1]/10 px-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-[#8fb3ff] transition-colors hover:border-[#8fb3ff]/70 hover:bg-[#4169e1]/15 disabled:cursor-not-allowed disabled:opacity-35 lg:w-10 lg:justify-center lg:gap-0 lg:px-0"
        : "group/action relative flex h-10 w-full items-center gap-3 rounded-lg border border-[#c5a059]/25 bg-black/45 px-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-[#c5a059] transition-colors hover:border-[#c5a059]/60 hover:bg-[#c5a059]/10 disabled:cursor-not-allowed disabled:opacity-35 lg:w-10 lg:justify-center lg:gap-0 lg:px-0";
    const tooltipClass = devOnly
        ? "pointer-events-none absolute left-1/2 top-full z-[80] mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-[#4169e1]/35 bg-[#071027]/95 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-[#8fb3ff] opacity-0 shadow-xl transition-opacity group-hover/action:opacity-100 lg:block"
        : "pointer-events-none absolute left-1/2 top-full z-[80] mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-[#c5a059]/25 bg-[#07070a]/95 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-[#c5a059] opacity-0 shadow-xl transition-opacity group-hover/action:opacity-100 lg:block";

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                disabled={disabled}
                title={title}
                aria-label={title}
                className={buttonClass}
            >
                <span className="material-icons text-[18px]">group_add</span>
                <span className="flex min-w-0 items-center gap-2 lg:hidden">
                    <span>Convidar persona</span>
                    {devOnly && <span className="text-[7px] text-[#8fb3ff]/70">devonly</span>}
                </span>
                <span className={tooltipClass}>
                    {title}
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
