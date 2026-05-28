"use client";

import { useLanguage } from "./LanguageProvider";
import RelicPhrase from "./RelicPhrase";

export default function SpaceStatusCards({ email }: { email?: string | null }) {
    const { level } = useLanguage();

    return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded border border-[#c5a059]/10 bg-black/20 p-6">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-[#c5a059]">Status</h3>
                <p className="text-sm text-green-400">Conectado via {email}</p>
            </div>
            <div className="rounded border border-[#c5a059]/10 bg-black/20 p-6">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-[#c5a059]">Nível</h3>
                <p className="text-sm text-green-400">{level}</p>
            </div>
            <div className="rounded border border-[#c5a059]/10 bg-black/20 p-6">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-[#c5a059]">Relíquia</h3>
                <RelicPhrase className="block truncate text-sm italic text-green-400" />
            </div>
        </div>
    );
}
