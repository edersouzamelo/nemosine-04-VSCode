"use client";

import { useState } from "react";

const PERSONA_PREVIEW_VERSION = "persona-og-v2";

export default function SharePersonaButton({ title, variant = "side" }: { title: string; variant?: "side" | "icon" }) {
    const [copied, setCopied] = useState(false);

    async function share() {
        const shareUrl = new URL(window.location.href);
        shareUrl.searchParams.set("preview", PERSONA_PREVIEW_VERSION);
        const url = shareUrl.toString();
        const payload = {
            title,
            text: `Conheça ${title} no Nemosine.`,
            url,
        };

        if (navigator.share) {
            try {
                await navigator.share(payload);
                return;
            } catch {
                // User may cancel the native sheet; keep fallback available.
            }
        }

        await navigator.clipboard?.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2200);
    }

    return (
        <div className={variant === "icon" ? "w-full lg:w-10" : undefined}>
            <button
                type="button"
                onClick={share}
                title="Compartilhar agente"
                aria-label="Compartilhar agente"
                className={variant === "icon"
                    ? "group/action relative flex h-10 w-full items-center gap-3 rounded-lg border border-[#c5a059]/25 bg-black/45 px-3 text-left text-[#c5a059]/75 transition-colors hover:border-[#c5a059]/60 hover:bg-[#c5a059]/10 hover:text-[#c5a059] lg:w-10 lg:justify-center lg:gap-0 lg:px-0"
                    : "side-action-button flex min-h-36 w-12 items-center justify-center overflow-hidden rounded-lg px-1.5 py-3 text-[8px] font-bold uppercase tracking-[0.18em]"}
            >
                {variant === "icon" ? (
                    <>
                        <span className="material-icons text-[18px]">person_add</span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] lg:hidden">Compartilhar agente</span>
                        <span className="pointer-events-none absolute left-1/2 top-full z-[80] mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-[#c5a059]/25 bg-[#07070a]/95 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-[#c5a059] opacity-0 shadow-xl transition-opacity group-hover/action:opacity-100 lg:block">
                            Compartilhar agente
                        </span>
                    </>
                ) : (
                    <span className="writing-vertical-rl whitespace-nowrap text-orientation-mixed">Compartilhar agente</span>
                )}
            </button>
            {copied && (
                <p className="fixed bottom-5 left-1/2 z-[60] max-w-[min(90vw,360px)] -translate-x-1/2 rounded-lg border border-emerald-300/30 bg-[#08120c]/95 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200 shadow-2xl">
                    Link copiado
                </p>
            )}
        </div>
    );
}
