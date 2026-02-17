"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import MedievalButton from "./MedievalButton";

export default function Navbar() {
    const pathname = usePathname();

    const navItems = [
        { name: "Personas", href: "/agents" },
        { name: "Lugares da Mente", href: "/places" },
        { name: "Constituição", href: "/constitution" },
        { name: "Comunidade Nemosine", href: "https://linktr.ee/nemosinenous" },
    ];

    return (
        <header className="relative z-20 border-b border-[#c5a059]/20 bg-black/40 backdrop-blur-md px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4 text-decoration-none">
                <Link href="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                    <h1 className="text-2xl font-serif medieval-text-gold">Nemosine</h1>
                    <div className="h-6 w-[1px] bg-[#c5a059]/30 hidden sm:block"></div>
                    <span className="text-[10px] uppercase tracking-widest opacity-60 hidden sm:block">Painel de Controle</span>
                </Link>
            </div>

            {/* Navigation Menu */}
            <nav className="flex items-center gap-6 sm:gap-8">
                {navItems.map((item, index) => {
                    const isActive = pathname === item.href;
                    return (
                        <React.Fragment key={item.name}>
                            {index > 0 && <div className="h-4 w-[1px] bg-[#c5a059]/10"></div>}
                            {item.href === "#" ? (
                                <button className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#c5a059]/40 hover:text-[#c5a059]/80 transition-all duration-300 cursor-pointer hover:drop-shadow-[0_0_5px_rgba(197,160,89,0.3)]">
                                    {item.name}
                                </button>
                            ) : (
                                <Link href={item.href} className="flex flex-col items-center group">
                                    <span className={`text-[11px] uppercase tracking-[0.2em] font-bold transition-all duration-300 ${isActive
                                        ? "text-[#c5a059] drop-shadow-[0_0_8px_rgba(197,160,89,0.4)]"
                                        : "text-[#c5a059]/40 group-hover:text-[#c5a059]/80"
                                        }`}>
                                        {item.name}
                                    </span>
                                    {isActive && (
                                        <div className="h-[2px] w-full bg-[#c5a059] mt-1 shadow-[0_0_10px_rgba(197,160,89,0.8)]"></div>
                                    )}
                                </Link>
                            )}
                        </React.Fragment>
                    );
                })}
            </nav>

            <div className="flex gap-4">
                <MedievalButton variant="secondary" className="!py-2 !px-4 !text-[10px]">
                    Sincronizar Backend
                </MedievalButton>
            </div>
        </header>
    );
}
