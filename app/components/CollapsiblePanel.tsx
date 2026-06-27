"use client";

import React, { useState } from "react";

interface CollapsiblePanelProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
    className?: string;
    contentClassName?: string;
}

export default function CollapsiblePanel({
    title,
    children,
    defaultOpen = false,
    className = "",
    contentClassName = ""
}: CollapsiblePanelProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className={`border border-[#c5a059]/20 rounded-lg overflow-hidden ${className}`}>
            {/* Header / Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[#c5a059]/5 hover:bg-[#c5a059]/10 transition-colors border-b border-[#c5a059]/10"
            >
                <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#c5a059]">
                    {title}
                </span>
                <svg
                    className={`w-4 h-4 text-[#c5a059] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
            </button>

            {/* Content */}
            {isOpen && (
                <div className={`p-4 space-y-4 bg-black/20 ${contentClassName}`}>
                    {children}
                </div>
            )}
        </div>
    );
}
