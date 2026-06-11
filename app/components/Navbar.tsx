"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useLanguage } from "./LanguageProvider";
import type { AppLanguage, AppTheme, CardOrderMode, NemosineLevel, AppFontSize } from "./LanguageProvider";
import { isAdminEmail } from "../lib/accessControl";
import RelicPhrase from "./RelicPhrase";

interface NavbarProps {
    mobileCollapsible?: boolean;
    defaultMobileCollapsed?: boolean;
}

export default function Navbar({ mobileCollapsible = false, defaultMobileCollapsed = false }: NavbarProps) {
    const pathname = usePathname();
    const { data: session, status } = useSession();
    const { language, setLanguage, theme, setTheme, cardOrderMode, setCardOrderMode, level, setLevel, clearRandomCardOrders, t, singularity, setSingularity, fontSize, setFontSize, cognitiveMode, setCognitiveMode, isAdmin } = useLanguage();
    const [menuOpen, setMenuOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [navbarHidden, setNavbarHidden] = useState(defaultMobileCollapsed);
    const [globalFullscreen, setGlobalFullscreen] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);
    const userDropdownRef = useRef<HTMLDivElement>(null);
    const settingsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (localStorage.getItem("nemosine-global-fullscreen") === "true") {
            setNavbarHidden(true);
            setGlobalFullscreen(true);
        }
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle("nemosine-global-fullscreen", globalFullscreen);
        if (globalFullscreen) {
            localStorage.setItem("nemosine-global-fullscreen", "true");
        } else {
            localStorage.removeItem("nemosine-global-fullscreen");
        }
    }, [globalFullscreen]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            const doc = document as any;
            const isNativeFullscreen = Boolean(
                doc.fullscreenElement ||
                doc.webkitFullscreenElement ||
                doc.mozFullScreenElement
            );

            if (!isNativeFullscreen) {
                setGlobalFullscreen(false);
                document.body.style.overflow = "";
            }
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
        document.addEventListener("mozfullscreenchange", handleFullscreenChange);
        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
            document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
            document.body.style.overflow = "";
        };
    }, []);

    useEffect(() => {
        if (!isAdmin) return;
        
        const fetchUnreadCount = async () => {
            try {
                const res = await fetch("/api/developer/messages");
                if (res.ok) {
                    const data = await res.json();
                    setUnreadMessages(data.unreadCount || 0);
                }
            } catch (err) {
                console.error("Error fetching unread count:", err);
            }
        };

        fetchUnreadCount();
        
        // Refresh every 30 seconds
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, [isAdmin]);

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
    }, [defaultMobileCollapsed]);

    const navItems = [
        { name: t("start"), href: "/inicio", tour: "origens" },
        { name: t("personas"), href: "/agents", tour: "personas" },
        { name: t("places"), href: "/places", tour: "lugares" },
        { name: t("dominios"), href: "/space/dominios", tour: "dominios" },
        { name: t("registros"), href: "/space/registros", tour: "memorias" },
        { name: t("travessia"), href: "/space/travessia/devonly", tour: "travessia", developerOnly: true },
        { name: "Castelo", href: "/castelo", tour: "castelo", developerOnly: true },
        { name: "Manifesto", href: "/manifesto", tour: "manifesto" },
    ].filter((item) => !("developerOnly" in item) || !item.developerOnly || isAdmin);

    const toggleMobileCollapse = () => {
        setMenuOpen(false);
        setSettingsOpen(false);
        setNavbarHidden((hidden) => !hidden);
    };

    const enterGlobalFullscreen = useCallback(async () => {
        setMenuOpen(false);
        setSettingsOpen(false);
        setNavbarHidden(true);
        setGlobalFullscreen(true);

        try {
            const el = document.documentElement as any;
            if (el.requestFullscreen) await el.requestFullscreen();
            else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
            else if (el.mozRequestFullScreen) await el.mozRequestFullScreen();
        } catch {
            // Keep the layout-level focus mode if the browser declines native fullscreen.
        }
    }, []);

    const exitGlobalFullscreen = useCallback(async () => {
        setMenuOpen(false);
        setSettingsOpen(false);
        setNavbarHidden(defaultMobileCollapsed);
        setGlobalFullscreen(false);
        document.body.style.overflow = "";

        try {
            const doc = document as any;
            if (doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement) {
                if (doc.exitFullscreen) await doc.exitFullscreen();
                else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
                else if (doc.mozCancelFullScreen) await doc.mozCancelFullScreen();
            }
        } catch {
            // Ignore browsers that report fullscreen but refuse programmatic exit.
        }
    }, []);

    const toggleGlobalFullscreen = () => {
        if (globalFullscreen) {
            exitGlobalFullscreen();
        } else {
            enterGlobalFullscreen();
        }
    };

    const fullscreenLabel = globalFullscreen
        ? language.startsWith("pt") ? "Reduzir programa" : "Reduce program"
        : language.startsWith("pt") ? "Ampliar programa" : "Expand program";

    const isAuthenticated = status === "authenticated" && Boolean(session?.user);
    return (
        <>
            <div
                data-fullscreen-menu-open={globalFullscreen && !navbarHidden ? "true" : "false"}
                className={`site-navbar-wrapper relative isolate z-[100] overflow-visible transition-[max-height] duration-300 ${navbarHidden ? 'max-h-0 lg:max-h-[220px]' : mobileCollapsible ? 'max-h-[320px]' : 'max-h-[220px]'}`}
            >
                <header className={`site-navbar relative z-[101] flex flex-col items-center justify-between gap-4 border-b border-[#c5a059]/20 bg-black/40 px-4 py-4 backdrop-blur-md transition-all duration-300 sm:px-8 md:flex-row md:flex-wrap xl:flex-nowrap ${mobileCollapsible ? 'pb-10 lg:pb-4' : ''} ${navbarHidden ? '-translate-y-full opacity-0 lg:translate-y-0 lg:opacity-100' : 'translate-y-0 opacity-100'}`}>
                    <div className="flex w-full items-center justify-between md:contents">
                        <Link href="/agents" className="order-1 flex shrink-0 items-center hover:opacity-80 transition-opacity">
                            <img src="/assets/nemosine-logo.png" alt="Nemosine" className="h-10 w-auto object-contain" />
                        </Link>

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
                                    <span className="hidden md:inline">{t("settings")}</span>
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
                                                <option value="pt-BR">🇧🇷 Português (BR)</option>
                                                <option value="pt-PT">🇵🇹 Português (PT)</option>
                                                <option value="en">🇬🇧 Inglês</option>
                                                <option value="es">🇪🇸 Espanhol</option>
                                                <option value="fr">🇫🇷 Francês</option>
                                                <option value="it">🇮🇹 Italiano</option>
                                                <option value="de">🇩🇪 Alemão</option>
                                                <option value="ar">🇸🇦 Árabe</option>
                                                <option value="zh">🇨🇳 Mandarim</option>
                                                <option value="ja">🇯🇵 Japonês</option>
                                            </select>
                                        </label>

                                        <div className="mt-4 text-[10px] uppercase tracking-widest text-[#c5a059]/70">
                                            {t("theme")}
                                            <div className="mt-2 grid grid-cols-2 gap-2">
                                                {(["light", "dark", "luanova", "crepusculo"] as AppTheme[]).map((option) => (
                                                    <button
                                                        key={option}
                                                        type="button"
                                                        onClick={() => setTheme(option)}
                                                        className={`theme-choice rounded border px-1.5 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${theme === option ? "selected border-[#c5a059] bg-[#c5a059]/15 text-[#c5a059]" : "border-[#c5a059]/20 text-white/70 hover:border-[#c5a059]/60"}`}
                                                    >
                                                        {option === "light" ? t("lightTheme") : 
                                                         option === "dark" ? t("darkTheme") : 
                                                         option === "luanova" ? t("luanovaTheme") : 
                                                         t("crepusculoTheme")}
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
                                            {t("modes")}
                                            <div className="mt-2 grid grid-cols-3 gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setCognitiveMode("symbolic")}
                                                    className={`rounded border py-1.5 text-[8.5px] uppercase tracking-widest text-center flex flex-col justify-center items-center font-bold leading-tight h-11 transition-all ${cognitiveMode === "symbolic" ? "border-[#c5a059] bg-[#c5a059]/15 text-[#c5a059]" : "border-[#c5a059]/10 text-white/40 hover:border-[#c5a059]/40 hover:bg-white/5 cursor-pointer"}`}
                                                >
                                                    <span>{t("modeSymbolic")}</span>
                                                    {cognitiveMode === "symbolic" && <span className="text-[6.5px] opacity-70 mt-0.5">({t("current")})</span>}
                                                </button>
                                                {isAdmin ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setCognitiveMode("sober")}
                                                        className={`rounded border py-1.5 text-[8.5px] uppercase tracking-widest text-center flex flex-col justify-center items-center font-bold leading-tight h-11 transition-all ${cognitiveMode === "sober" ? "border-[#c5a059] bg-[#c5a059]/15 text-[#c5a059]" : "border-[#c5a059]/10 text-white/40 hover:border-[#c5a059]/40 hover:bg-white/5 cursor-pointer"}`}
                                                    >
                                                        <span>{t("modeSober")}</span>
                                                        {cognitiveMode === "sober" && <span className="text-[6.5px] opacity-70 mt-0.5">({t("current")})</span>}
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        disabled
                                                        className="rounded border border-[#c5a059]/10 text-white/30 py-1.5 text-[8.5px] uppercase tracking-widest text-center flex flex-col justify-center items-center font-bold leading-tight cursor-not-allowed h-11 opacity-60"
                                                    >
                                                        <span>{t("modeSober")}</span>
                                                        <span className="text-[6.5px] opacity-90 text-amber-500 mt-0.5">{t("soon")}</span>
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    disabled
                                                    className="rounded border border-[#c5a059]/10 text-white/30 py-1.5 text-[8.5px] uppercase tracking-widest text-center flex flex-col justify-center items-center font-bold leading-tight cursor-not-allowed h-11 opacity-60"
                                                >
                                                    <span>{t("modeSystemic")}</span>
                                                    <span className="text-[6.5px] opacity-90 text-amber-500 mt-0.5">{t("soon")}</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-4 text-[10px] uppercase tracking-widest text-[#c5a059]/70">
                                            {t("animations")}
                                            <div className="mt-2 grid grid-cols-2 gap-2">
                                                {(["off", "on"] as const).map((option) => (
                                                    <button
                                                        key={option}
                                                        type="button"
                                                        onClick={() => setSingularity(option)}
                                                        className={`rounded border px-2 py-2 text-xs uppercase tracking-widest transition-colors ${singularity === option ? "selected border-[#c5a059] bg-[#c5a059]/15 text-[#c5a059]" : "border-[#c5a059]/20 text-white/70 hover:border-[#c5a059]/60"}`}
                                                    >
                                                        {option}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="mt-4 text-[10px] uppercase tracking-widest text-[#c5a059]/70">
                                            {t("visualization")}
                                            <div className="mt-2 grid grid-cols-3 gap-2">
                                                {(["small", "medium", "large"] as AppFontSize[]).map((option) => (
                                                    <button
                                                        key={option}
                                                        type="button"
                                                        onClick={() => setFontSize(option)}
                                                        className={`rounded border px-2 py-2 text-xs transition-colors ${fontSize === option ? "selected border-[#c5a059] bg-[#c5a059]/15 text-[#c5a059]" : "border-[#c5a059]/20 text-white/70 hover:border-[#c5a059]/60"}`}
                                                    >
                                                        {option === "small" ? t("vizSmall") : option === "medium" ? t("vizMedium") : t("vizLarge")}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={toggleGlobalFullscreen}
                                title={fullscreenLabel}
                                aria-label={fullscreenLabel}
                                aria-pressed={globalFullscreen}
                                className="global-fullscreen-trigger flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#c5a059]/25 bg-black/25 text-[#c5a059]/70 transition-all hover:border-[#c5a059]/60 hover:bg-[#c5a059]/10 hover:text-[#c5a059]"
                            >
                                <span className="material-icons text-lg">
                                    {globalFullscreen ? "close_fullscreen" : "open_in_full"}
                                </span>
                            </button>

                            <div className="relative shrink-0" ref={menuRef}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!isAuthenticated) return;
                                        setMenuOpen((open) => !open);
                                        setSettingsOpen(false);
                                    }}
                                    disabled={!isAuthenticated}
                                    className="relative flex shrink-0 items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                                    aria-label={isAuthenticated ? "Abrir menu do usuário" : "Usuário não autenticado"}
                                    aria-expanded={menuOpen}
                                >
                                    <img
                                        src={session?.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(session?.user?.name || "U")}&background=c5a059&color=000`}
                                        alt="User"
                                        className="h-8 w-8 min-w-8 shrink-0 rounded-full border-2 border-[#c5a059]/50 object-cover hover:border-[#c5a059] transition-colors"
                                    />
                                    {isAdmin && unreadMessages > 0 && (
                                        <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-black bg-red-500 animate-ping" />
                                    )}
                                    {isAdmin && unreadMessages > 0 && (
                                        <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-black bg-red-500" />
                                    )}
                                </button>

                                {menuOpen && isAuthenticated && (
                                    <div
                                        ref={userDropdownRef}
                                        onMouseDown={(event) => event.stopPropagation()}
                                        onPointerDown={(event) => event.stopPropagation()}
                                        className="site-dropdown absolute right-0 top-10 z-[110] w-[min(16rem,calc(100vw-2rem))] sm:w-64 overflow-hidden rounded-lg border border-stone-200 dark:border-[#c5a059]/30 bg-[#0a0a0c]/95 shadow-2xl backdrop-blur-xl p-0"
                                    >
                                        <div className="px-4 py-3.5 border-b border-stone-200 dark:border-[#c5a059]/10">
                                            <p className="text-[10px] uppercase tracking-widest font-bold text-[#c5a059]">{session?.user?.name || "Usuario"}</p>
                                            <p className="text-[9px] uppercase tracking-widest text-stone-500 dark:text-white/40 truncate mt-1">{session?.user?.email}</p>
                                            <RelicPhrase className="mt-2 block truncate text-[9px] uppercase tracking-widest italic text-emerald-600 dark:text-emerald-300/75" />
                                        </div>
                                        <div className="py-1">
                                            <Link href="/space" className="block w-full px-4 py-3.5 text-left text-[10px] uppercase tracking-widest font-semibold text-stone-700 dark:text-white/70 hover:text-[#c5a059] hover:bg-[#c5a059]/5 transition-colors">
                                                {t("mySpace")}
                                            </Link>
                                            <Link href="/developer" className="block w-full px-4 py-3.5 text-left text-[10px] uppercase tracking-widest font-semibold text-stone-700 dark:text-white/70 hover:text-[#c5a059] hover:bg-[#c5a059]/5 transition-colors">
                                                Fale com o desenvolvedor
                                            </Link>
                                            {isAdmin && (
                                                <Link href="/admin" className="block w-full px-4 py-3.5 text-left text-[10px] uppercase tracking-widest font-semibold text-stone-700 dark:text-white/70 hover:text-[#c5a059] hover:bg-[#c5a059]/5 transition-colors">
                                                    👑 {t("adminPanel")}
                                                </Link>
                                            )}
                                            {isAdmin && (
                                                <Link href="/developer/messages" className="block w-full px-4 py-3.5 text-left text-[10px] uppercase tracking-widest font-semibold text-stone-700 dark:text-white/70 hover:text-[#c5a059] hover:bg-[#c5a059]/5 transition-colors">
                                                    👑 Mensagens ao desenvolvedor
                                                </Link>
                                            )}
                                        </div>
                                        <div className="border-t border-stone-200 dark:border-[#c5a059]/10 py-1">
                                            <button
                                                onClick={() => {
                                                    setMenuOpen(false);
                                                    signOut({ redirectTo: "/access" });
                                                }}
                                                className="w-full text-left px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-red-600 dark:text-red-400/80 hover:text-red-700 hover:bg-red-500/5 transition-colors"
                                            >
                                                {t("logout")}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <nav className="relative z-[102] order-2 flex w-full max-w-full flex-wrap items-center justify-center gap-1 overflow-x-auto sm:gap-4 md:order-3 md:basis-full md:justify-center md:gap-4 xl:order-2 xl:min-w-0 xl:flex-1 xl:basis-auto xl:justify-start xl:gap-4 2xl:gap-6">
                        {navItems.map((item, index) => {
                            const isActive = pathname === item.href;
                            const isDeveloperOnly = Boolean("developerOnly" in item && item.developerOnly);
                            const navTextClass = isDeveloperOnly
                                ? isActive
                                    ? "text-[#4169e1] drop-shadow-[0_0_10px_rgba(65,105,225,0.65)]"
                                    : "text-[#4169e1]/70 group-hover:text-[#4169e1]"
                                : isActive
                                    ? "text-[#c5a059]"
                                    : "text-[#c5a059]/40 group-hover:text-[#c5a059]/80";
                            const activeLineClass = isDeveloperOnly
                                ? "bg-[#4169e1] shadow-[0_0_10px_rgba(65,105,225,0.8)]"
                                : "bg-[#c5a059] shadow-[0_0_10px_rgba(197,160,89,0.8)]";
                            return (
                                <React.Fragment key={item.href}>
                                    {index > 0 && <div className="hidden sm:block h-4 w-[1px] bg-[#c5a059]/10" />}
                                    {item.href.startsWith("http") ? (
                                        <a href={item.href} target="_blank" rel="noopener noreferrer" data-tour={"tour" in item ? item.tour : undefined} className="relative z-[103] inline-flex min-h-10 touch-manipulation select-none items-center rounded-lg px-2 text-[11px] uppercase tracking-[0.2em] font-bold text-[#c5a059]/40 hover:text-[#c5a059]/80 transition-all duration-300 whitespace-nowrap">
                                            {item.name}
                                        </a>
                                    ) : (
                                        <Link href={item.href} data-tour={"tour" in item ? item.tour : undefined} className="relative z-[103] flex min-h-10 touch-manipulation select-none flex-col justify-center items-center rounded-lg px-2 group whitespace-nowrap">
                                            <span className={`text-[11px] uppercase tracking-[0.2em] font-bold transition-all duration-300 ${navTextClass}`}>
                                                {item.name}
                                            </span>
                                            {isDeveloperOnly && (
                                                <span className="mt-0.5 text-[7px] font-bold uppercase tracking-[0.18em] text-[#4169e1]/70">
                                                    devonly
                                                </span>
                                            )}
                                            {isActive && <div className={`absolute bottom-1 left-2 right-2 h-[2px] ${activeLineClass}`}></div>}
                                        </Link>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </nav>
                </header>
            </div>
            {(mobileCollapsible || globalFullscreen) && navbarHidden && (
                <button
                    type="button"
                    onClick={toggleMobileCollapse}
                    aria-label={t("expandMenu")}
                    className={`${globalFullscreen ? "fixed z-[9998]" : "absolute z-[110] lg:hidden"} top-0 left-1/2 -translate-x-1/2 flex items-center justify-center h-8 w-16 rounded-b-xl border border-t-0 border-[#c5a059]/40 bg-[#0a0a0c]/95 text-[#c5a059] shadow-lg`}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            )}
        </>
    );
}
