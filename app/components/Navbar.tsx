"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useLanguage } from "./LanguageProvider";
import type { AppLanguage, AppTheme } from "./LanguageProvider";
import OnboardingVideo from "./OnboardingVideo";

export default function Navbar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const { language, setLanguage, theme, setTheme, t } = useLanguage();
    const [menuOpen, setMenuOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [videoOpenSignal, setVideoOpenSignal] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);
    const settingsRef = useRef<HTMLDivElement>(null);
    const [navbarHidden, setNavbarHidden] = useState(false);
    const lastScrollRef = useRef(0);
    const ticking = useRef(false);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
            if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
                setSettingsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Handle navbar hide on scroll (mobile only)
    useEffect(() => {
        const handleScroll = () => {
            if (!ticking.current) {
                window.requestAnimationFrame(() => {
                    const currentScroll = window.scrollY || document.documentElement.scrollTop;
                    
                    // Only on mobile (< 1024px)
                    if (window.innerWidth < 1024) {
                        if (currentScroll > lastScrollRef.current + 10) {
                            // Scrolling down
                            setNavbarHidden(true);
                        } else if (currentScroll < lastScrollRef.current - 10) {
                            // Scrolling up
                            setNavbarHidden(false);
                        }
                    }
                    
                    lastScrollRef.current = currentScroll;
                    ticking.current = false;
                });
                ticking.current = true;
            }
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
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
            <header className={`site-navbar relative z-20 border-b border-[#c5a059]/20 bg-black/40 backdrop-blur-md px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4 transition-transform duration-300 ${navbarHidden ? '-translate-y-full' : 'translate-y-0'}`}>
                <Link href="/space" className="flex items-center hover:opacity-80 transition-opacity">
                    <img src="/assets/nemosine-logo.png" alt="Nemosine" className="h-10 w-auto object-contain" />
                </Link>

                <nav className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 sm:justify-start w-full max-w-full overflow-x-auto">
                    {navItems.map((item, index) => {
                        const isActive = pathname === item.href;
                        return (
                            <React.Fragment key={item.href}>
                                {index > 0 && <div className="hidden sm:block h-4 w-[1px] bg-[#c5a059]/10" />}
                                {item.href.startsWith("http") ? (
                                    <a href={item.href} target="_blank" rel="noopener noreferrer" className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#c5a059]/40 hover:text-[#c5a059]/80 transition-all duration-300 whitespace-nowrap">
                                        {item.name}
                                    </a>
                                ) : (
                                    <Link href={item.href} className="flex flex-col items-center group whitespace-nowrap">
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
                    <div className="relative" ref={settingsRef}>
                        <button
                            type="button"
                            onClick={() => {
                                setSettingsOpen(!settingsOpen);
                                setMenuOpen(false);
                            }}
                            className="settings-trigger flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] font-bold text-[#c5a059]/70 hover:text-[#c5a059] transition-colors"
                            aria-expanded={settingsOpen}
                        >
                            <span className="material-icons text-base">tune</span>
                            {t("settings")}
                        </button>

                        {settingsOpen && (
                            <div className="site-dropdown absolute right-0 top-10 w-60 bg-[#0a0a0c]/95 border border-[#c5a059]/30 rounded-lg shadow-2xl backdrop-blur-xl p-4 z-50">
                                <label className="block text-[10px] uppercase tracking-widest text-[#c5a059]/70">
                                    {t("language")}
                                    <select
                                        value={language}
                                        onChange={(event) => setLanguage(event.target.value as AppLanguage)}
                                        className="theme-control mt-2 w-full rounded border border-[#c5a059]/30 bg-black px-3 py-2 text-sm text-[#e1e1e6]"
                                    >
                                        <option value="pt-BR">PT/BR</option>
                                        <option value="es">ESP</option>
                                        <option value="en">ENG</option>
                                    </select>
                                </label>

                                <div className="mt-4 text-[10px] uppercase tracking-widest text-[#c5a059]/70">
                                    {t("theme")}
                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                        {(["light", "dark"] as AppTheme[]).map((option) => (
                                            <button
                                                key={option}
                                                type="button"
                                                onClick={() => setTheme(option)}
                                                className={`theme-choice rounded border px-2 py-2 text-xs transition-colors ${theme === option ? "selected border-[#c5a059] bg-[#c5a059]/15 text-[#c5a059]" : "border-[#c5a059]/20 text-white/70 hover:border-[#c5a059]/60"}`}
                                            >
                                                {option === "light" ? t("lightTheme") : t("darkTheme")}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => {
                                setMenuOpen(!menuOpen);
                                setSettingsOpen(false);
                            }}
                            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                        >
                            <img
                                src={session?.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(session?.user?.name || "U")}&background=c5a059&color=000`}
                                alt="User"
                                className="w-8 h-8 rounded-full border-2 border-[#c5a059]/50 hover:border-[#c5a059] transition-colors"
                            />
                        </button>

                        {menuOpen && (
                            <div className="site-dropdown absolute right-0 top-12 w-64 bg-[#0a0a0c]/95 border border-[#c5a059]/30 rounded-lg shadow-2xl backdrop-blur-xl overflow-hidden z-50">
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
