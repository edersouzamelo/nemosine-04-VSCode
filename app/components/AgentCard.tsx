import Link from "next/link";
import React from "react";

interface AgentCardProps {
    name: string;
    label?: string;
    image?: string;
    className?: string;
    href?: string;
}

export default function AgentCard({ name, label = "Persona", image, className = "", href }: AgentCardProps) {
    const cardContent = (
        <div className={`group relative aspect-[3/4] overflow-hidden glass-medieval transition-all duration-500 hover:scale-105 hover:z-10 cursor-pointer ${className}`}>
            {/* Card Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-end p-4">
                {/* Placeholder for Character Art */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-transparent to-transparent opacity-80 z-10"></div>

                {/* Decorative Frame Inner */}
                <div className="absolute inset-2 border border-[#c5a059]/20 pointer-events-none group-hover:border-[#c5a059]/50 transition-colors"></div>

                {/* Character Image Placeholder */}
                {!image ? (
                    <div className="w-full h-full bg-[#1e1b4b]/40 flex items-center justify-center">
                        <span className="text-[#c5a059]/10 text-4xl font-serif select-none">?</span>
                    </div>
                ) : (
                    <img src={image} alt={name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                )}

                {/* Name Tag */}
                <div className="relative z-20 w-full text-center">
                    <p className="text-[10px] medieval-text-gold font-bold mb-1 opacity-60 group-hover:opacity-100 transition-opacity">{label}</p>
                    <h3 className="text-xs md:text-sm font-serif text-[#e1e1e6] uppercase tracking-widest break-words leading-tight">
                        {name}
                    </h3>
                </div>
            </div>

            {/* Hover Glow */}
            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
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
