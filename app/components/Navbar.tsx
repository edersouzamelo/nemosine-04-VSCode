"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useLanguage } from "./LanguageProvider";
import type { AppLanguage, AppTheme, CardOrderMode, NemosineLevel } from "./LanguageProvider";
import { isAdminEmail } from "../lib/accessControl";
import RelicPhrase from "./RelicPhrase";

interface NavbarProps {
    mobileCollapsible?: boolean;
    defaultMobileCollapsed?: boolean;
}

export default function Navbar({ mobileCollapsible = false, defaultMobileCollapsed = false }: NavbarProps) {
    const pathname = usePathname();
    const { data: session, status } = useSession();
    const { language, setLanguage, theme, setTheme, cardOrderMode, setCardOrderMode, level, setLevel, clearRandomCardOrders, t } = useLanguage();
    const [menuOpen, setMenuOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [navbarHidden, setNavbarHidden] = useState(defaultMobileCollapsed);
    const menuRef = useRef<HTMLDivElement>(null);
    const userDropdownRef = useRef<HTMLDivElement>(null);
    const settingsRef = useRef<HTMLDivElement>(null);

    const [singularity, setSingularity] = useState<"on" | "off">("off");

    useEffect(() => {
        const stored = window.localStorage.getItem("nemosine-singularity") as "on" | "off" | null;
        if (stored === "on" || stored === "off") {
            setSingularity(stored);
        }
    }, []);

    const handleSingularityChange = (val: "on" | "off") => {
        setSingularity(val);
        window.localStorage.setItem("nemosine-singularity", val);
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                menuRef.current
                && !menuRef.current.contains(event.target as Node)
                && !userDropdownRef.current?.contains(event.target as Node)
            ) {
                setMenuOpen(false);
            }
            if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
                setSettingsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const navItems = [
        { name: t("start"), href: "/inicio" },
        { name: t("personas"), href: "/agents" },
        ...(level === "Soberano" ? [{ name: t("places"), href: "/places" }] : []),
        { name: t("constitution"), href: "/constitution" },
        { name: t("games"), href: "/space/games" },
        { name: t("travessia"), href: "/space/travessia" },
    ];

    const toggleMobileCollapse = () => {
        setMenuOpen(false);
        setSettingsOpen(false);
        setNavbarHidden((hidden) => !hidden);
    };
    const isAuthenticated = status === "authenticated" && Boolean(session?.user);
    const isAdmin = isAdminEmail(session?.user?.email);
    return (
        <>
            <div className={`site-navbar-wrapper relative isolate z-[100] overflow-visible transition-[max-height] duration-300 ${navbarHidden ? 'max-h-0 lg:max-h-[220px]' : mobileCollapsible ? 'max-h-[320px]' : 'max-h-[220px]'}`}>
                <header className={`site-navbar relative z-[101] flex flex-col items-center justify-between gap-4 border-b border-[#c5a059]/20 bg-black/40 px-4 py-4 backdrop-blur-md transition-all duration-300 sm:px-8 md:flex-row md:flex-wrap xl:flex-nowrap ${mobileCollapsible ? 'pb-10 lg:pb-4' : ''} ${navbarHidden ? '-translate-y-full opacity-0 lg:translate-y-0 lg:opacity-100' : 'translate-y-0 opacity-100'}`}>
                    <Link href="/agents" className="order-1 flex shrink-0 items-center hover:opacity-80 transition-opacity">
                        <img src="/assets/nemosine-logo.png" alt="Nemosine" className="h-10 w-auto object-contain" />
                    </Link>

                    <nav className="relative z-[102] order-2 flex w-full max-w-full flex-wrap items-center justify-center gap-1 overflow-x-auto sm:gap-4 md:order-3 md:basis-full md:justify-center md:gap-4 xl:order-2 xl:min-w-0 xl:flex-1 xl:basis-auto xl:justify-start xl:gap-4 2xl:gap-6">
                    {navItems.map((item, index) => {
                        const isActive = pathname === item.href;
                        return (
                            <React.Fragment key={item.href}>
                                {index > 0 && <div className="hidden sm:block h-4 w-[1px] bg-[#c5a059]/10" />}
                                {item.href.startsWith("http") ? (
                                    <a href={item.href} target="_blank" rel="noopener noreferrer" className="relative z-[103] inline-flex min-h-10 touch-manipulation select-none items-center rounded-lg px-2 text-[11px] uppercase tracking-[0.2em] font-bold text-[#c5a059]/40 hover:text-[#c5a059]/80 transition-all duration-300 whitespace-nowrap">
                                        {item.name}
                                    </a>
                                ) : (
                                    <a href={item.href} className="relative z-[103] flex min-h-10 touch-manipulation select-none flex-col justify-center items-center rounded-lg px-2 group whitespace-nowrap">
                                        <span className={`text-[11px] uppercase tracking-[0.2em] font-bold transition-all duration-300 ${isActive ? "text-[#c5a059]" : "text-[#c5a059]/40 group-hover:text-[#c5a059]/80"}`}>
                                            {item.name}
                                        </span>
                                        {isActive && <div className="absolute bottom-1 left-2 right-2 h-[2px] bg-[#c5a059] shadow-[0_0_10px_rgba(197,160,89,0.8)]"></div>}
                                    </a>
                                )}
                            </React.Fragment>
                        );
                    })}
                </nav>

                <div className="order-3 flex shrink-0 items-center gap-4 md:order-2 md:ml-auto xl:order-3 xl:ml-0">
                    <div className="relative" ref={settingsRef}>
                        <button
                            type="button"
                            onClick={() => {
                                setSettingsOpen((open) => !open);
                                setMenuOpen(false);
                            }}
                            className="settings-trigger flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] font-bold text-[#c5a059]/70 hover:text-[#c5a059] transition-colors"
                            aria-expanded={settingsOpen}
                        >
                            <span className="material-icons text-base">tune</span>
                            {t("settings")}
                        </button>

                        {settingsOpen && (
                            <div className="site-dropdown absolute right-0 top-10 z-[110] w-72 bg-[#0a0a0c]/95 border border-[#c5a059]/30 rounded-lg shadow-2xl backdrop-blur-xl p-4">
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
                                <label className="mt-4 block text-[10px] uppercase tracking-widest text-[#c5a059]/70">
                                    {t("cardOrder")}
                                    <select
                                        value={cardOrderMode}
                                        onChange={(event) => {
                                            const mode = event.target.value as CardOrderMode;
                                            if (mode === "random") clearRandomCardOrders();
                                            setCardOrderMode(mode);
                                        }}
                                        className="theme-control mt-2 w-full rounded border border-[#c5a059]/30 bg-black px-3 py-2 text-sm text-[#e1e1e6]"
                                    >
                                        <option value="original">{t("orderOriginal")}</option>
                                        <option value="popular">{t("orderPopular")}</option>
                                        <option value="random">{t("orderRandom")}</option>
                                        <option value="custom">{t("orderCustom")}</option>
                                    </select>
                                    {cardOrderMode === "custom" && (
                                        <span className="mt-2 block normal-case tracking-normal text-[11px] text-[#c5a059]/55">
                                            {t("dragCardsHint")}
                                        </span>
                                    )}
                                </label>
                                <div className="mt-4 text-[10px] uppercase tracking-widest text-[#c5a059]/70">
                                    {t("levels")}
                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                        {(["Peregrino", "Vassalo", "Regente", "Soberano"] as NemosineLevel[]).map((option) => (
                                            <button
                                                key={option}
                                                type="button"
                                                onClick={() => setLevel(option)}
                                                className={`rounded border px-2 py-2 text-xs normal-case tracking-normal transition-colors ${level === option ? "border-[#c5a059] bg-[#c5a059]/15 text-[#c5a059]" : "border-[#c5a059]/20 text-white/70 hover:border-[#c5a059]/60"}`}
                                            >
                                                {option}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-4 text-[10px] uppercase tracking-widest text-[#c5a059]/70">
                                    Singularidade
                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                        {(["off", "on"] as const).map((option) => (
                                            <button
                                                key={option}
                                                type="button"
                                                onClick={() => handleSingularityChange(option)}
                                                className={`rounded border px-2 py-2 text-xs uppercase tracking-widest transition-colors ${singularity === option ? "selected border-[#c5a059] bg-[#c5a059]/15 text-[#c5a059]" : "border-[#c5a059]/20 text-white/70 hover:border-[#c5a059]/60"}`}
                                            >
                                                {option}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="relative shrink-0" ref={menuRef}>
                        <button
                            onClick={() => {
                                if (!isAuthenticated) return;
                                setMenuOpen((open) => !open);
                                setSettingsOpen(false);
                            }}
                            disabled={!isAuthenticated}
                            className="flex shrink-0 items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                            aria-label={isAuthenticated ? "Abrir menu do usuário" : "Usuário não autenticado"}
                            aria-expanded={menuOpen}
                        >
                            <img
                                src={session?.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(session?.user?.name || "U")}&background=c5a059&color=000`}
                                alt="User"
                                className="h-8 w-8 min-w-8 shrink-0 rounded-full border-2 border-[#c5a059]/50 object-cover hover:border-[#c5a059] transition-colors"
                            />
                        </button>

                    </div>
                </div>
                {mobileCollapsible && (
                    <button
                        type="button"
                        onClick={toggleMobileCollapse}
                        aria-label={t("collapseMenu")}
                        className="absolute bottom-1 left-1/2 -translate-x-1/2 lg:hidden flex items-center justify-center h-7 w-14 rounded-t-xl border border-b-0 border-[#c5a059]/30 bg-black/60 text-[#c5a059]/75 hover:text-[#c5a059]"
                    >
                        <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                )}
                </header>
            </div>
            {mobileCollapsible && navbarHidden && (
                <button
                    type="button"
                    onClick={toggleMobileCollapse}
                    aria-label={t("expandMenu")}
                    className="absolute top-0 left-1/2 -translate-x-1/2 z-[110] lg:hidden flex items-center justify-center h-8 w-16 rounded-b-xl border border-t-0 border-[#c5a059]/40 bg-[#0a0a0c]/95 text-[#c5a059] shadow-lg"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            )}
            {menuOpen && isAuthenticated && (
                <div className="fixed inset-0 z-[1000] sm:pointer-events-none">
                    <button
                        type="button"
                        aria-label="Fechar menu do usuário"
                        onClick={() => setMenuOpen(false)}
                        className="absolute inset-0 h-full w-full cursor-default bg-transparent sm:hidden"
                    />
                    <div
                        ref={userDropdownRef}
                        onMouseDown={(event) => event.stopPropagation()}
                        onPointerDown={(event) => event.stopPropagation()}
                        className="site-dropdown pointer-events-auto absolute right-4 top-24 w-[min(16rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-[#c5a059]/30 bg-[#0a0a0c]/95 shadow-2xl backdrop-blur-xl sm:right-8 sm:top-20 sm:w-64"
                    >
                        <div className="px-4 py-3 border-b border-[#c5a059]/10">
                            <p className="text-sm font-semibold text-[#c5a059]">{session?.user?.name || "Usuario"}</p>
                            <p className="text-xs text-white/40 truncate">{session?.user?.email}</p>
                            <RelicPhrase className="mt-2 block truncate text-[11px] italic text-emerald-300/75" />
                        </div>
                        <div className="py-1">
                            <a href="/space" className="block w-full px-4 py-3 text-left text-sm text-white/70 hover:text-[#c5a059] hover:bg-[#c5a059]/5">
                                {t("mySpace")}
                            </a>
                            <a href="/developer" className="block w-full px-4 py-3 text-left text-sm text-white/70 hover:text-[#c5a059] hover:bg-[#c5a059]/5">
                                Fale com o desenvolvedor
                            </a>
                            {isAdmin && (
                                <a href="/admin" className="block w-full px-4 py-3 text-left text-sm text-white/70 hover:text-[#c5a059] hover:bg-[#c5a059]/5">
                                    👑 {t("adminPanel")}
                                </a>
                            )}
                            {isAdmin && (
                                <a href="/developer/messages" className="block w-full px-4 py-3 text-left text-sm text-white/70 hover:text-[#c5a059] hover:bg-[#c5a059]/5">
                                    👑 Mensagens ao desenvolvedor
                                </a>
                            )}
                        </div>
                        <div className="border-t border-[#c5a059]/10 py-1">
                            <button
                                onClick={() => {
                                    setMenuOpen(false);
                                    signOut({ redirectTo: "/access" });
                                }}
                                className="w-full text-left px-4 py-2.5 text-sm text-red-400/80 hover:text-red-400 hover:bg-red-500/5"
                            >
                                {t("logout")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
