"use client";

import Link from "next/link";
import React from "react";
import Image from "next/image";
import { useLanguage } from "./LanguageProvider";

interface AgentCardProps {
    name: string;
    label?: string;
    image?: string;
    className?: string;
    href?: string;
}

export default function AgentCard({ name, label = "Persona", image, className = "", href }: AgentCardProps) {
    const { entityName } = useLanguage();
    const displayName = entityName(name);
    const cardContent = (
        <div className="group flex h-full flex-col gap-2 cursor-pointer">
        <div className={`relative aspect-[3/4.35] overflow-hidden glass-medieval transition-all duration-500 group-hover:scale-[1.03] group-hover:z-10 ${className}`}>
            {/* Card Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-end p-4">
                {/* Placeholder for Character Art */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-transparent to-transparent opacity-80 z-10"></div>

                {/* Decorative Frame Inner */}
                <div className="absolute inset-2 border border-[#c5a059]/20 pointer-events-none group-hover:border-[#c5a059]/50 transition-colors"></div>

                {/* Character Image Placeholder */}
                {!image ? (
                    <div className="w-full h-full bg-[#1e1b4b]/40 flex items-center justify-center relative">
                        <span className="text-[#c5a059]/10 text-4xl font-serif select-none">?</span>
                    </div>
                ) : (
                    <div className="absolute inset-0 w-full h-full overflow-hidden">
                        <Image 
                            src={image} 
                            alt={displayName}
                            fill
                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                            className="object-cover transition-transform duration-700 group-hover:scale-110" 
                        />
                    </div>
                )}

                {/* Name Tag - Used inside the frame only for missing artwork. */}
                {!image && (
                    <div className="relative z-20 w-full text-center">
                        <p className="text-[10px] medieval-text-gold font-bold mb-1 opacity-60 group-hover:opacity-100 transition-opacity">{label}</p>
                        <h3 className="text-xs md:text-sm font-serif text-[#e1e1e6] uppercase tracking-widest break-words leading-tight">
                            {displayName}
                        </h3>
                    </div>
                )}


            </div>

            {/* Hover Glow */}
            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        </div>
            <div className="px-1 pb-1 text-center">
                <h3 className="text-[11px] md:text-xs font-sans font-medium text-[#c5a059]/80 uppercase tracking-[0.16em] leading-relaxed group-hover:text-[#e4c476] transition-colors">
                    {displayName}
                </h3>
            </div>
        </div>
    );

    if (href) {
        return (
            <Link href={href} className="block w-full h-full">
                {cardContent}
            </Link>
        );
    }

    return cardContent;
}
