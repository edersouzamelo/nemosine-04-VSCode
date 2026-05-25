"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import MedievalButton from "./MedievalButton";
import { LanguageSelector, useLanguage } from "./LanguageProvider";
import OnboardingVideo from "./OnboardingVideo";

export default function Navbar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const { t } = useLanguage();
    const [menuOpen, setMenuOpen] = useState(false);
    const [videoOpenSignal, setVideoOpenSignal] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const navItems = [
        { name: t("personas"), href: "/agents" },
        { name: t("places"), href: "/places" },
        { name: t("constitution"), href: "/constitution" },
        { name: t("games"), href: "/space/games" },
        { name: t("community"), href: "https://linktr.ee/nemosinenous" },
    ];

    return (
        <>
            <header className="relative z-20 border-b border-[#c5a059]/20 bg-black/40 backdrop-blur-md px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <Link href="/space" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                    <img src="/assets/nemosine-logo.png" alt="Nemosine" className="h-10 w-auto object-contain" />
                    <div className="h-6 w-[1px] bg-[#c5a059]/30 hidden sm:block"></div>
                    <span className="text-[10px] uppercase tracking-widest opacity-60 hidden sm:block">{t("controlPanel")}</span>
                </Link>

                <nav className="flex items-center gap-6 sm:gap-8">
                    {navItems.map((item, index) => {
                        const isActive = pathname === item.href;
                        return (
                            <React.Fragment key={item.href}>
                                {index > 0 && <div className="h-4 w-[1px] bg-[#c5a059]/10"></div>}
                                {item.href.startsWith("http") ? (
                                    <a href={item.href} target="_blank" rel="noopener noreferrer" className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#c5a059]/40 hover:text-[#c5a059]/80 transition-all duration-300">
                                        {item.name}
                                    </a>
                                ) : (
                                    <Link href={item.href} className="flex flex-col items-center group">
                                        <span className={`text-[11px] uppercase tracking-[0.2em] font-bold transition-all duration-300 ${isActive ? "text-[#c5a059]" : "text-[#c5a059]/40 group-hover:text-[#c5a059]/80"}`}>
                                            {item.name}
                                        </span>
                                        {isActive && <div className="h-[2px] w-full bg-[#c5a059] mt-1 shadow-[0_0_10px_rgba(197,160,89,0.8)]"></div>}
                                    </Link>
                                )}
                            </React.Fragment>
                        );
                    })}
                </nav>

                <div className="flex gap-4 items-center">
                    <LanguageSelector />
                    <Link href="/space">
                        <MedievalButton variant="secondary" className="!py-2 !px-4 !text-[10px]">
                            {t("localSpace")}
                        </MedievalButton>
                    </Link>

                    <div className="relative" ref={menuRef}>
                        <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                            <img
                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(session?.user?.name || "U")}&background=c5a059&color=000`}
                                alt="User"
                                className="w-8 h-8 rounded-full border-2 border-[#c5a059]/50 hover:border-[#c5a059] transition-colors"
                            />
                        </button>

                        {menuOpen && (
                            <div className="absolute right-0 top-12 w-64 bg-[#0a0a0c]/95 border border-[#c5a059]/30 rounded-lg shadow-2xl backdrop-blur-xl overflow-hidden z-50">
                                <div className="px-4 py-3 border-b border-[#c5a059]/10">
                                    <p className="text-sm font-semibold text-[#c5a059]">{session?.user?.name || "Usuario"}</p>
                                    <p className="text-xs text-white/40 truncate">{session?.user?.email}</p>
                                </div>
                                <div className="py-1">
                                    <Link href="/space" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm text-white/70 hover:text-[#c5a059] hover:bg-[#c5a059]/5">
                                        {t("mySpace")}
                                    </Link>
                                    <button
                                        onClick={() => {
                                            setMenuOpen(false);
                                            setVideoOpenSignal((signal) => signal + 1);
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-sm text-white/70 hover:text-[#c5a059] hover:bg-[#c5a059]/5"
                                    >
                                        {t("video")}
                                    </button>
                                    {session?.user?.email === "edersouzamelo@gmail.com" && (
                                        <Link href="/admin" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm text-white/70 hover:text-[#c5a059] hover:bg-[#c5a059]/5">
                                            {t("adminPanel")}
                                        </Link>
                                    )}
                                </div>
                                <div className="border-t border-[#c5a059]/10 py-1">
                                    <button
                                        onClick={() => {
                                            setMenuOpen(false);
                                            signOut({ callbackUrl: "/" });
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-sm text-red-400/80 hover:text-red-400 hover:bg-red-500/5"
                                    >
                                        {t("logout")}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>
            <OnboardingVideo openSignal={videoOpenSignal} />
        </>
    );
}
