"use client";

import { useState } from "react";

export default function SharePersonaButton({ title }: { title: string }) {
    const [copied, setCopied] = useState(false);

    async function share() {
        const url = window.location.href;
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
        <div>
            <button
                type="button"
                onClick={share}
                className="side-action-button flex min-h-36 w-12 items-center justify-center overflow-hidden rounded-lg px-1.5 py-3 text-[8px] font-bold uppercase tracking-[0.18em]"
            >
                <span className="writing-vertical-rl whitespace-nowrap text-orientation-mixed">Compartilhar</span>
            </button>
            {copied && (
                <p className="fixed bottom-5 left-1/2 z-[60] max-w-[min(90vw,360px)] -translate-x-1/2 rounded-lg border border-emerald-300/30 bg-[#08120c]/95 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200 shadow-2xl">
                    Link copiado
                </p>
            )}
        </div>
    );
}
