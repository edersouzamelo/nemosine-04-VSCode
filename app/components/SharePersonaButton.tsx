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
                className="flex min-h-32 w-16 items-center justify-center rounded-lg border border-[#c5a059]/30 bg-black/55 px-2 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#c5a059]/80 transition-colors hover:border-[#c5a059]/60 hover:bg-[#c5a059]/10"
            >
                <span className="writing-vertical-rl text-orientation-mixed">Compartilhar</span>
            </button>
            {copied && (
                <p className="fixed bottom-5 left-1/2 z-[60] max-w-[min(90vw,360px)] -translate-x-1/2 rounded-lg border border-emerald-300/30 bg-[#08120c]/95 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200 shadow-2xl">
                    Link copiado
                </p>
            )}
        </div>
    );
}
