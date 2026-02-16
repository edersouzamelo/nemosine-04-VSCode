"use client";

import React from "react";

interface MedievalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary";
    className?: string;
    children: React.ReactNode;
}

export default function MedievalButton({
    variant = "primary",
    children,
    className = "",
    ...props
}: MedievalButtonProps) {
    const baseStyles = "relative px-8 py-3 font-bold transition-all duration-300 group overflow-hidden uppercase tracking-widest text-sm";

    const variants = {
        primary: "bg-[#7c2d12] text-[#fde68a] hover:bg-[#92400e] border-y-2 border-[#c5a059]",
        secondary: "bg-black/40 text-[#c5a059] hover:bg-black/60 border-2 border-[#c5a059]/40 hover:border-[#c5a059]",
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${className}`}
            {...props}
        >
            <span className="relative z-10 flex items-center justify-center gap-2">
                {children}
            </span>
            {/* Decorative corners for primary */}
            {variant === "primary" && (
                <>
                    <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#fde68a] opacity-50"></div>
                    <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#fde68a] opacity-50"></div>
                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#fde68a] opacity-50"></div>
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#fde68a] opacity-50"></div>
                </>
            )}
            <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        </button>
    );
}
