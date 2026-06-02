"use client";

import { useLanguage } from "./LanguageProvider";
import RelicPhrase from "./RelicPhrase";
import type { UserStorageUsage } from "../lib/userStorageUsage";

function formatBytes(bytes: number) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";

    const units = ["B", "KB", "MB", "GB", "TB"];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }

    const decimals = value >= 10 || unitIndex === 0 ? 0 : 1;
    return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}

export default function SpaceStatusCards({
    email,
    storageUsage,
}: {
    email?: string | null;
    storageUsage: UserStorageUsage;
}) {
    const { level } = useLanguage();
    const measuredAt = new Date(storageUsage.measuredAt);
    const measuredLabel = Number.isNaN(measuredAt.getTime())
        ? ""
        : measuredAt.toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });

    return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded border border-[#c5a059]/10 bg-black/20 p-6">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-[#c5a059]">Status</h3>
                <p className="text-sm text-green-400">Conectado via {email}</p>
            </div>
            <div className="rounded border border-[#c5a059]/10 bg-black/20 p-6">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-[#c5a059]">Nivel</h3>
                <p className="text-sm text-green-400">{level}</p>
            </div>
            <div className="rounded border border-[#c5a059]/10 bg-black/20 p-6">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-[#c5a059]">Reliquia</h3>
                <RelicPhrase className="block truncate text-sm italic text-green-400" />
            </div>
            <div className="rounded border border-[#c5a059]/10 bg-black/20 p-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#c5a059]">Memoria</h3>
                    <span className="rounded-full border border-[#c5a059]/20 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-[#c5a059]/70">
                        {storageUsage.quotaLabel}
                    </span>
                </div>
                <p className="font-serif text-xl text-green-300">{formatBytes(storageUsage.freeBytes)}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/40">livres no banco</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full border border-[#c5a059]/15 bg-black/50">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-[#2dd4bf] via-[#c5a059] to-[#f97316]"
                        style={{ width: `${storageUsage.usedPercent}%` }}
                    />
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] text-white/45">
                    <span>{formatBytes(storageUsage.usedBytes)} usados</span>
                    <span>{formatBytes(storageUsage.quotaBytes)} cota</span>
                </div>
                {measuredLabel && (
                    <p className="mt-2 text-[9px] uppercase tracking-[0.16em] text-[#c5a059]/45">
                        medido {measuredLabel}
                    </p>
                )}
            </div>
        </div>
    );
}
