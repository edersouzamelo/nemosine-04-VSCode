"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "../../components/LanguageProvider";
import Navbar from "../../components/Navbar";
import InstitutionalFooter from "../../components/InstitutionalFooter";

interface DomainApp {
    id: string;
    title: string;
    label: string;
    description: string;
    emoji: string;
    developer: string;
    version: string;
}

export default function DominiosHubPage() {
    const { t, language } = useLanguage();
    const [selectedApp, setSelectedApp] = useState<string | null>(null);
    const [loadingApp, setLoadingApp] = useState<boolean>(false);
    const [loadingTextIndex, setLoadingTextIndex] = useState(0);
    const [simulatedTime, setSimulatedTime] = useState("20:00");
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    
    // Collapsible Top Menu status (slides up and down with pulling handle)
    const [showMenu, setShowMenu] = useState<boolean>(false);
    
    // Active viewport device classification
    const [deviceType, setDeviceType] = useState<"phone" | "tablet" | "desktop">("desktop");

    // Body overflow side-effect to disable scrollbars in fullscreen F11-style mode
    useEffect(() => {
        if (isFullscreen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isFullscreen]);

    // Dynamic Clock inside status bar
    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, "0");
            const minutes = String(now.getMinutes()).padStart(2, "0");
            setSimulatedTime(`${hours}:${minutes}`);
        };
        updateClock();
        const timer = setInterval(updateClock, 30000);
        return () => clearInterval(timer);
    }, []);

    // Detect actual physical device viewport sizes
    useEffect(() => {
        const handleResize = () => {
            const w = window.innerWidth;
            if (w < 640) {
                setDeviceType("phone");
            } else if (w < 1024) {
                setDeviceType("tablet");
            } else {
                setDeviceType("desktop");
            }
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const DOMAINS: DomainApp[] = [
        {
            id: "arauto",
            title: language.startsWith("pt") ? "Arauto Nous" : language === "es" ? "Heraldo Nous" : "Herald Nous",
            label: language.startsWith("pt") ? "Arauto" : language === "es" ? "Heraldo" : "Herald",
            description: language.startsWith("pt") 
                ? "Organize sua rotina, compromissos e lembretes com a solenidade e o aviso solene do Arauto. Planeje seu tempo com clareza executiva."
                : language === "es"
                    ? "Organiza tu rutina, citas y recordatorios con la solemnidad y el aviso solmene del Heraldo. Planifica tu tiempo con claridad."
                    : "Organize your routine, appointments, and reminders with the solemnity and warnings of the Herald.",
            emoji: "📜",
            developer: "Arauto Nous",
            version: "v0.9.1 - Beta"
        },
        {
            id: "treinador",
            title: language.startsWith("pt") ? "Controle do Treinador" : language === "es" ? "Control del Entrenador" : "Trainer's Control",
            label: language.startsWith("pt") ? "Treinador" : language === "es" ? "Entrenador" : "Trainer",
            description: language.startsWith("pt")
                ? "Monitore seus hábitos, metas de disciplina e performance sob o olhar firme do Treinador. A disciplina é o escudo contra a preguiça."
                : language === "es"
                    ? "Monitorea tus hábitos, metas de disciplina y rendimiento bajo la mirada firme del Entrenador. El escudo contra la pereza."
                    : "Track your habits, discipline goals, and performance under the steadfast gaze of the Trainer. The ultimate shield.",
            emoji: "🛡️",
            developer: "Treinador Nous",
            version: "v0.4.5 - Alpha"
        },
        {
            id: "mordomo",
            title: language.startsWith("pt") ? "Orçamento do Mordomo" : language === "es" ? "Presupuesto del Mayordomo" : "Butler's Budget",
            label: language.startsWith("pt") ? "Mordomo" : language === "es" ? "Mayordomo" : "Butler",
            description: language.startsWith("pt")
                ? "Gerencie suas finanças, fluxos de despesas e recursos com a precisão matemática do Mordomo. O reino exige contabilidade exata."
                : language === "es"
                    ? "Gestiona tus finanzas, flujos de gastos y recursos con la precisión matemática del Mayordomo. Contabilidad exacta."
                    : "Manage your finances, expense streams, and resources with the mathematical precision of the Butler. Perfect bookkeeping.",
            emoji: "🗝️",
            developer: "Mordomo Nous",
            version: "v0.8.2 - Closed Beta"
        },
        {
            id: "medico",
            title: language.startsWith("pt") ? "Prontuário do Médico" : language === "es" ? "Historial del Médico" : "Physician's Record",
            label: language.startsWith("pt") ? "Médico" : language === "es" ? "Médico" : "Physician",
            description: language.startsWith("pt")
                ? "Acompanhe seus dados de saúde, bem-estar, sono e vitalidade sob o cuidado atencioso do Médico. Mantenha o equilíbrio da mente e corpo."
                : language === "es"
                    ? "Haz un seguimiento de tus datos de salud, bienestar, sueño y vitalidad bajo el cuidado del Médico. Equilibrio mental y físico."
                    : "Track your health data, well-being, sleep, and vitality under the dedicated care of the Physician. Body and mind harmony.",
            emoji: "🧪",
            developer: "Médico Nous",
            version: "v0.3.0 - Concept"
        }
    ];

    const loadingTexts = language.startsWith("pt")
        ? ["Invocando Portal...", "Carregando Grimório...", "Estabelecendo Conexão...", "Abrindo Protocolo..."]
        : language === "es"
            ? ["Invocando Portal...", "Cargando Grimorio...", "Estableciendo Conexión...", "Abriendo Protocolo..."]
            : ["Summoning Portal...", "Loading Grimoire...", "Establishing Connection...", "Opening Protocol..."];

    const handleAppClick = (appId: string) => {
        setLoadingApp(true);
        setSelectedApp(appId);
        setLoadingTextIndex(0);
        
        const textCycle = setInterval(() => {
            setLoadingTextIndex((prev) => (prev + 1) % loadingTexts.length);
        }, 600);

        setTimeout(() => {
            clearInterval(textCycle);
            setLoadingApp(false);
        }, 1800);
    };

    const currentApp = DOMAINS.find((app) => app.id === selectedApp);

    // Dynamic Invitative Subtitle
    const getSubtitle = () => {
        if (language.startsWith("pt")) {
            return "Ative os canais da sua mente e navegue pelos domínios integrados que regem o seu próprio metasistema de consciência.";
        } else if (language === "es") {
            return "Activa los canales de tu mente y navega por los dominios integrados que rigen tu propio metasistema de conciencia.";
        } else {
            return "Activate the channels of your mind and navigate the integrated domains governing your own metasystem of consciousness.";
        }
    };

    return (
        <main className="relative min-h-screen bg-[#050507] text-[#e1e1e6]">
            <style>{`
                @keyframes phone-jiggle {
                    0% { transform: rotate(-0.8deg) translateY(0); }
                    50% { transform: rotate(0.8deg) translateY(-1px); }
                    100% { transform: rotate(-0.8deg) translateY(0); }
                }
                .app-icon-jiggle:hover {
                    animation: phone-jiggle 0.28s ease-in-out infinite;
                }
                @keyframes scale-up {
                    from { transform: translate(-50%, -50%) scale(0.92); opacity: 0; }
                    to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                }
                .animate-scale-up {
                    animation: scale-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
            `}</style>

            {/* Dark Immersive Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-black/75 z-10 backdrop-blur-[2px]"></div>
                <div className="w-full h-full bg-[#0a0a0c] bg-[url('https://images.unsplash.com/photo-1510519138101-570d1dca3d66?q=80&w=2000')] bg-cover bg-center opacity-20 mix-blend-luminosity"></div>
            </div>

            {/* COLLAPSIBLE SLIDE-UP NAVBAR WITH TAB HANDLE (TIRINHA) */}
            <div className={`fixed top-0 inset-x-0 z-50 transition-transform duration-500 ease-in-out transform 
                ${showMenu ? "translate-y-0" : "-translate-y-full"}`}
            >
                <Navbar />
                
                {/* Pull-down notch tab handle (tirinha) */}
                <div 
                    onClick={() => setShowMenu(!showMenu)}
                    className="absolute left-1/2 -translate-x-1/2 bottom-[-20px] w-24 h-5 rounded-b-xl border-x border-b border-[#c5a059]/40 bg-[#07070a]/95 flex items-center justify-center cursor-pointer hover:bg-[#c5a059]/10 hover:border-[#c5a059] transition-all z-50 select-none shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
                    title={showMenu ? (language.startsWith("pt") ? "Recolher Menu" : "Collapse Menu") : (language.startsWith("pt") ? "Expandir Menu" : "Expand Menu")}
                >
                    <span className="material-icons text-xs text-[#c5a059] transition-transform duration-300">
                        {showMenu ? "expand_less" : "expand_more"}
                    </span>
                </div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-10 md:py-16 min-h-[calc(100vh-220px)] flex flex-col justify-center items-center">
                
                {/* PAGE HEADER (Hidden completely in fullscreen F11-style mode) */}
                {!isFullscreen && (
                    <header className="mb-12 text-center w-full max-w-2xl mx-auto space-y-4">
                        <span className="text-[10px] uppercase tracking-[0.25em] text-[#c5a059]/60 font-semibold block">
                            Sovereign OS v1.2
                        </span>
                        
                        {/* Title Row with standard layout icon-only button */}
                        <div className="flex items-center justify-center gap-4">
                            <h1 className="font-display text-4xl uppercase tracking-widest text-[#c5a059]">
                                {t("dominios")}
                            </h1>
                            <button
                                type="button"
                                onClick={() => setIsFullscreen(true)}
                                title={language.startsWith("pt") ? "Expandir Sistema" : "Expand System"}
                                className="flex items-center justify-center rounded-lg border border-[#c5a059]/40 bg-black/45 w-10 h-10 text-[#c5a059] transition-all hover:border-[#c5a059] hover:bg-[#c5a059]/10 cursor-pointer font-bold"
                            >
                                <span className="material-icons text-xl">open_in_full</span>
                            </button>
                        </div>
                        
                        <p className="font-body text-base italic text-[#c5a059]/60 max-w-xl mx-auto leading-relaxed">
                            {getSubtitle()}
                        </p>
                    </header>
                )}

                {/* SIMULATED DEVICE ENVIRONMENT */}
                {isFullscreen ? (
                    /* 100% IMMERSIVE FULL-SCREEN SYSTEM OPERATIONAL MODE (F11-style full viewport OS) */
                    <div className="fixed inset-0 w-screen h-screen z-45 bg-[#07070a] flex flex-col justify-between p-6 sm:p-12 overflow-hidden select-none animate-fade-in">
                        {/* Immersive space wallpaper */}
                        <div className="absolute inset-0 bg-radial-gradient from-indigo-950/20 via-black to-black z-0 pointer-events-none"></div>
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1510519138101-570d1dca3d66?q=80&w=2000')] bg-cover bg-center opacity-15 mix-blend-luminosity blur-md pointer-events-none"></div>

                        {/* Top System Bar */}
                        <div className="relative z-10 flex justify-between items-center border-b border-[#c5a059]/10 pb-4">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl drop-shadow-[0_0_10px_rgba(197,160,89,0.4)]">⚜️</span>
                                <div>
                                    <h2 className="font-display text-sm tracking-wider text-[#c5a059] uppercase font-bold">
                                        Sovereign OS
                                    </h2>
                                    <p className="text-[7.5px] uppercase tracking-widest text-[#eee8dc]/40">
                                        {language.startsWith("pt") ? "Metasistema da Mente" : "Metasystem of the Mind"}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Standard layout close button */}
                            <button
                                type="button"
                                onClick={() => setIsFullscreen(false)}
                                title={language.startsWith("pt") ? "Minimizar" : "Minimize"}
                                className="flex items-center justify-center rounded-lg border border-[#c5a059]/40 bg-black/75 w-10 h-10 text-[#c5a059] transition-all hover:border-[#c5a059] hover:bg-[#c5a059]/20 cursor-pointer font-bold z-50"
                            >
                                <span className="material-icons text-xl">close_fullscreen</span>
                            </button>
                        </div>

                        {/* Inner Fullscreen UI Workspace */}
                        <div className="relative z-10 flex-1 flex flex-col justify-center items-center max-w-5xl w-full mx-auto my-6 overflow-hidden pr-1">
                            {loadingApp ? (
                                <div className="flex flex-col items-center justify-center animate-fade-in">
                                    <div className="relative flex items-center justify-center mb-6">
                                        <div className="w-20 h-20 rounded-full border-2 border-[#c5a059]/20 border-t-[#c5a059] animate-spin"></div>
                                        <span className="absolute text-3xl">⚜️</span>
                                    </div>
                                    <p className="font-display text-xs tracking-[0.25em] text-[#c5a059] uppercase animate-pulse">
                                        {loadingTexts[loadingTextIndex]}
                                    </p>
                                </div>
                            ) : selectedApp && currentApp ? (
                                /* Fullscreen app details display - Clean, integrated view replacing the grid naturally without modal framing */
                                <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col justify-between animate-fade-in py-4 sm:py-8 text-left">
                                    <div className="space-y-6 sm:space-y-8">
                                        {/* Header area */}
                                        <div className="flex items-center gap-5 border-b border-[#c5a059]/15 pb-5">
                                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#1c1a24] to-[#08070b] border-2 border-[#c5a059] rounded-2xl flex items-center justify-center text-4xl sm:text-5xl shadow-[0_0_20px_rgba(197,160,89,0.25)] select-none">
                                                {currentApp.emoji}
                                            </div>
                                            <div>
                                                <h3 className="font-display text-xl sm:text-3xl font-bold uppercase tracking-widest text-[#c5a059] mb-1">
                                                    {currentApp.label}
                                                </h3>
                                                <p className="text-[10px] sm:text-xs uppercase tracking-wider text-[#c5a059]/50">
                                                    {currentApp.developer}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Content area split in columns for tablet/desktop */}
                                        <div className={`grid gap-6 sm:gap-8 items-start 
                                            ${deviceType === "phone" ? "grid-cols-1" : "grid-cols-12"}`}
                                        >
                                            {/* Description info */}
                                            <div className={`space-y-3 ${deviceType === "phone" ? "" : "col-span-8"}`}>
                                                <span className="text-xs uppercase tracking-wider text-amber-500 font-bold block">
                                                    {language.startsWith("pt") ? "Status do Portal Executivo" : "Executive Portal Status"}
                                                </span>
                                                <p className="font-body text-xs sm:text-base leading-relaxed text-[#eee8dc]/85">
                                                    {currentApp.description}
                                                </p>
                                            </div>

                                            {/* Status Box */}
                                            <div className={`glass-medieval rounded-2xl p-5 border border-[#c5a059]/20 bg-black/40 text-center space-y-2 
                                                ${deviceType === "phone" ? "max-w-xs mx-auto w-full" : "col-span-4"}`}
                                            >
                                                <span className="material-icons text-2xl text-amber-500 animate-bounce">
                                                    construction
                                                </span>
                                                <h4 className="font-display text-xs uppercase tracking-wider text-[#c5a059]">
                                                    {language.startsWith("pt") ? "Em Construção no Metasistema" : "Under Metasystem Construction"}
                                                </h4>
                                                <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-[#eee8dc]/50">
                                                    {currentApp.version}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action button at the bottom */}
                                    <div className="pt-8 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedApp(null)}
                                            className="cursor-pointer border border-[#c5a059]/40 bg-[#c5a059]/10 hover:bg-[#c5a059]/20 px-8 py-3 rounded-xl font-display text-xs uppercase tracking-widest text-[#fde68a] hover:text-white transition-all font-semibold"
                                        >
                                            {language.startsWith("pt") ? "← Retornar ao Menu" : "← Return to Menu"}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* Fullscreen Grid of apps */
                                <div className="w-full flex flex-col justify-between py-6">
                                    <div className={`grid gap-8 w-full px-4 max-w-5xl mx-auto
                                        ${deviceType === "phone" ? "grid-cols-2 max-w-xs" : "grid-cols-4"}`}
                                    >
                                        {DOMAINS.map((app) => (
                                            <button
                                                key={app.id}
                                                type="button"
                                                onClick={() => handleAppClick(app.id)}
                                                className="flex flex-col items-center group cursor-pointer bg-black/40 border border-[#c5a059]/20 hover:border-[#c5a059] p-6 rounded-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(197,160,89,0.15)]"
                                            >
                                                {/* Expanded RPG skill token */}
                                                <div className="app-icon-jiggle w-20 h-20 bg-gradient-to-br from-[#1c1a24] via-[#0b0a0f] to-[#121017] border-2 border-[#c5a059]/40 rounded-3xl flex items-center justify-center text-4xl shadow-[0_8px_20px_rgba(0,0,0,0.7)] transition-all duration-300 group-hover:scale-105 relative overflow-hidden mb-4">
                                                    <div className="absolute inset-1.5 rounded-[1.2rem] border border-[#c5a059]/10"></div>
                                                    <span className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)] relative z-10">{app.emoji}</span>
                                                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-[#7c2d12] to-[#b45309] text-[#fde68a] text-[6px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full border border-[#c5a059]/30 shadow-md">
                                                        Soon
                                                    </span>
                                                </div>
                                                <span className="text-[10px] uppercase tracking-[0.2em] text-[#c5a059]/80 group-hover:text-[#fde68a] font-display text-center font-bold">
                                                    {app.label}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Bottom OS Bar */}
                        <div className="relative z-10 flex flex-col items-center">
                            {/* Immersive Dock area */}
                            <div className="glass-medieval rounded-2xl px-8 py-3 border border-[#c5a059]/20 bg-white/5 backdrop-blur-md flex justify-around gap-12 items-center select-none max-w-sm w-full mx-auto">
                                <span className="text-2xl opacity-60 hover:opacity-100 transition-opacity">🛡️</span>
                                <span className="text-2xl opacity-60 hover:opacity-100 transition-opacity">⚜️</span>
                                <span className="text-2xl opacity-60 hover:opacity-100 transition-opacity">🧭</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ADAPTIVE CONTAINER DEVICE MINIATURE MOCKUPS (Smartphone, Tablet, or Widescreen Desktop Mockup) */
                    <div className="relative flex flex-col items-center justify-center">
                        
                        {/* PHONE MOCKUP FRAME */}
                        {deviceType === "phone" && (
                            <div className="relative w-[320px] aspect-[9/18.8] bg-black border-[6px] border-[#c5a059]/60 rounded-[3rem] shadow-[0_25px_60px_rgba(0,0,0,0.85)] flex flex-col p-3 pb-4 overflow-hidden">
                                <div className="absolute inset-1.5 rounded-[2.5rem] border border-[#c5a059]/10 pointer-events-none z-45"></div>
                                
                                {/* Dynamic Island */}
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-50 flex items-center justify-center border border-[#c5a059]/15">
                                    <div className="w-2 h-2 rounded-full bg-stone-900 absolute left-3"></div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]/30 absolute right-4"></div>
                                </div>

                                {/* Status Bar */}
                                <div className="flex justify-between items-center text-[9px] font-bold text-[#c5a059]/75 px-5 pt-3 pb-2 z-30 select-none">
                                    <span>{simulatedTime}</span>
                                    <div className="flex items-center gap-1.5">
                                        <span>⚜️</span>
                                        <span>📶</span>
                                        <span>🔋</span>
                                    </div>
                                </div>

                                {/* Simulated Virtual Screen */}
                                <div className="flex-1 rounded-[2rem] overflow-hidden relative bg-[#090a0f] flex flex-col justify-between p-4 border border-[#c5a059]/5 z-10">
                                    <div className="absolute inset-0 bg-radial-gradient from-indigo-950/20 via-black to-black z-0 pointer-events-none"></div>
                                    <div className="absolute top-[-30%] left-[-30%] w-[160%] h-[160%] bg-[url('https://images.unsplash.com/photo-1510519138101-570d1dca3d66?q=80&w=600')] bg-cover bg-center opacity-10 blur-xl pointer-events-none"></div>

                                    {loadingApp ? (
                                        <div className="flex-1 flex flex-col items-center justify-center z-10 animate-fade-in">
                                            <div className="w-10 h-10 rounded-full border border-[#c5a059]/20 border-t-[#c5a059] animate-spin mb-3"></div>
                                            <span className="font-display text-[8px] tracking-wider text-[#c5a059] uppercase">{loadingTexts[loadingTextIndex]}</span>
                                        </div>
                                    ) : selectedApp && currentApp ? (
                                        <div className="flex-1 flex flex-col justify-between z-10 animate-fade-in py-1 text-left">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3 border-b border-[#c5a059]/15 pb-3">
                                                    <span className="text-3xl">{currentApp.emoji}</span>
                                                    <div>
                                                        <h3 className="font-display text-xs font-bold uppercase tracking-widest text-[#c5a059]">{currentApp.label}</h3>
                                                        <p className="text-[7px] text-[#eee8dc]/40">{currentApp.developer}</p>
                                                    </div>
                                                </div>
                                                <p className="font-body text-[10px] leading-relaxed text-[#eee8dc]/75">{currentApp.description}</p>
                                                <div className="p-2 border border-[#c5a059]/10 bg-black/40 rounded text-center">
                                                    <span className="text-[7.5px] uppercase tracking-wider block text-amber-500 font-semibold mb-0.5">{language.startsWith("pt") ? "Construindo..." : "Under Construction..."}</span>
                                                    <span className="text-[7px] text-[#eee8dc]/45">{currentApp.version}</span>
                                                </div>
                                            </div>
                                            <button type="button" onClick={() => setSelectedApp(null)} className="w-full border border-[#c5a059]/40 bg-[#c5a059]/10 px-3 py-2 rounded-lg font-display text-[8px] uppercase tracking-wider text-[#fde68a] mt-3">{language.startsWith("pt") ? "Fechar App" : "Close App"}</button>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col justify-between z-10 animate-fade-in pt-3">
                                            <p className="font-display text-[8px] uppercase tracking-widest text-[#c5a059]/40 text-center mb-4">{language.startsWith("pt") ? "Grimório de Bolso" : "Pocket Grimoire"}</p>
                                            <div className="grid grid-cols-2 gap-x-3 gap-y-4 px-1">
                                                {DOMAINS.map((app) => (
                                                    <button key={app.id} onClick={() => handleAppClick(app.id)} className="flex flex-col items-center group cursor-pointer">
                                                        <div className="app-icon-jiggle w-14 h-14 bg-gradient-to-br from-[#1c1a24] via-[#0b0a0f] to-[#121017] border border-[#c5a059]/30 rounded-xl flex items-center justify-center text-2xl relative shadow-md">
                                                            <span>{app.emoji}</span>
                                                        </div>
                                                        <span className="text-[7.5px] uppercase tracking-wider text-[#c5a059]/80 mt-1">{app.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="glass-medieval rounded-xl p-2 border border-[#c5a059]/15 bg-white/5 flex justify-around items-center select-none mt-4 text-xs">
                                                <span>🛡️</span><span>⚜️</span><span>🧭</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="h-1 w-20 bg-[#c5a059]/20 rounded-full mx-auto mt-2 select-none"></div>
                            </div>
                        )}

                        {/* TABLET MOCKUP FRAME */}
                        {deviceType === "tablet" && (
                            <div className="relative w-[480px] sm:w-[520px] aspect-[3/4] bg-black border-[8px] border-[#c5a059]/60 rounded-[2.5rem] shadow-[0_25px_60px_rgba(0,0,0,0.85)] flex flex-col p-4 pb-5 overflow-hidden">
                                <div className="absolute inset-2 rounded-[2rem] border border-[#c5a059]/10 pointer-events-none z-45"></div>

                                {/* Status Bar */}
                                <div className="flex justify-between items-center text-[10px] font-bold text-[#c5a059]/75 px-6 pt-2 pb-2 z-30 select-none">
                                    <span>{simulatedTime}</span>
                                    <span className="text-xs">Sovereign Tablet</span>
                                    <div className="flex items-center gap-2">
                                        <span>⚜️</span>
                                        <span>📶</span>
                                        <span>🔋</span>
                                    </div>
                                </div>

                                {/* Simulated Virtual Screen */}
                                <div className="flex-1 rounded-[1.8rem] overflow-hidden relative bg-[#090a0f] flex flex-col justify-between p-5 border border-[#c5a059]/5 z-10">
                                    <div className="absolute inset-0 bg-radial-gradient from-indigo-950/20 via-black to-black z-0 pointer-events-none"></div>
                                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1510519138101-570d1dca3d66?q=80&w=600')] bg-cover bg-center opacity-10 blur-xl pointer-events-none"></div>

                                    {loadingApp ? (
                                        <div className="flex-1 flex flex-col items-center justify-center z-10 animate-fade-in">
                                            <div className="w-12 h-12 rounded-full border-2 border-[#c5a059]/20 border-t-[#c5a059] animate-spin mb-4"></div>
                                            <span className="font-display text-[9px] tracking-wider text-[#c5a059] uppercase">{loadingTexts[loadingTextIndex]}</span>
                                        </div>
                                    ) : selectedApp && currentApp ? (
                                        <div className="flex-1 flex flex-col justify-between z-10 animate-fade-in py-2 text-left">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-4 border-b border-[#c5a059]/15 pb-4">
                                                    <span className="text-4xl">{currentApp.emoji}</span>
                                                    <div>
                                                        <h3 className="font-display text-base font-bold uppercase tracking-widest text-[#c5a059]">{currentApp.label}</h3>
                                                        <p className="text-[9px] text-[#c5a059]/50">{currentApp.developer}</p>
                                                    </div>
                                                </div>
                                                <p className="font-body text-xs leading-relaxed text-[#eee8dc]/80">{currentApp.description}</p>
                                                <div className="p-3 border border-[#c5a059]/10 bg-black/45 rounded-lg text-center max-w-sm mx-auto">
                                                    <span className="text-[8px] uppercase tracking-wider block text-amber-500 font-semibold mb-0.5">{language.startsWith("pt") ? "Em Construção no Metasistema" : "Under Construction"}</span>
                                                    <span className="text-[8px] text-[#eee8dc]/45">{currentApp.version}</span>
                                                </div>
                                            </div>
                                            <button type="button" onClick={() => setSelectedApp(null)} className="w-full border border-[#c5a059]/40 bg-[#c5a059]/10 hover:bg-[#c5a059]/20 px-4 py-2.5 rounded-xl font-display text-[9px] uppercase tracking-wider text-[#fde68a]">{language.startsWith("pt") ? "← Fechar Aplicativo" : "← Close App"}</button>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col justify-between z-10 animate-fade-in pt-4">
                                            <p className="font-display text-[9px] uppercase tracking-widest text-[#c5a059]/40 text-center mb-6">{language.startsWith("pt") ? "Grimório de Bolso - Modo Tablet" : "Pocket Grimoire - Tablet OS"}</p>
                                            <div className="grid grid-cols-2 gap-x-6 gap-y-6 px-4">
                                                {DOMAINS.map((app) => (
                                                    <button key={app.id} onClick={() => handleAppClick(app.id)} className="flex flex-col items-center group cursor-pointer">
                                                        <div className="app-icon-jiggle w-16 h-16 bg-gradient-to-br from-[#1c1a24] via-[#0b0a0f] to-[#121017] border-2 border-[#c5a059]/40 rounded-2xl flex items-center justify-center text-3xl shadow-md transition-all">
                                                            <span>{app.emoji}</span>
                                                        </div>
                                                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#c5a059]/80 mt-2">{app.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="glass-medieval rounded-2xl p-2.5 border border-[#c5a059]/15 bg-white/5 flex justify-around items-center select-none mt-8 text-xl max-w-xs w-full mx-auto">
                                                <span>🛡️</span><span>⚜️</span><span>🧭</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="h-1 w-24 bg-[#c5a059]/20 rounded-full mx-auto mt-2.5 select-none"></div>
                            </div>
                        )}

                        {/* DESKTOP MOCKUP FRAME */}
                        {deviceType === "desktop" && (
                            <div className="relative w-[750px] md:w-[820px] aspect-[16/10] bg-black border-[10px] border-[#c5a059]/60 rounded-[2.5rem] shadow-[0_25px_60px_rgba(0,0,0,0.85)] flex flex-col p-4 pb-6 overflow-hidden">
                                <div className="absolute inset-2.5 rounded-[2rem] border border-[#c5a059]/15 pointer-events-none z-45"></div>

                                {/* Status Bar Desktop style */}
                                <div className="flex justify-between items-center text-[10px] font-bold text-[#c5a059]/75 px-6 pt-2 pb-2 z-30 select-none border-b border-[#c5a059]/10">
                                    <div className="flex items-center gap-2">
                                        <span>⚜️</span>
                                        <span>Sovereign Desktop</span>
                                    </div>
                                    <span>{simulatedTime}</span>
                                    <div className="flex items-center gap-3">
                                        <span>📶</span>
                                        <span>🔋</span>
                                    </div>
                                </div>

                                {/* Simulated Virtual Screen */}
                                <div className="flex-1 rounded-b-[1.5rem] overflow-hidden relative bg-[#090a0f] flex flex-col justify-between p-6 border border-[#c5a059]/5 z-10">
                                    <div className="absolute inset-0 bg-radial-gradient from-indigo-950/20 via-black to-black z-0 pointer-events-none"></div>
                                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1510519138101-570d1dca3d66?q=80&w=1000')] bg-cover bg-center opacity-10 blur-md pointer-events-none"></div>

                                    {loadingApp ? (
                                        <div className="flex-1 flex flex-col items-center justify-center z-10 animate-fade-in">
                                            <div className="w-16 h-16 rounded-full border-2 border-[#c5a059]/20 border-t-[#c5a059] animate-spin mb-4"></div>
                                            <p className="font-display text-[10px] tracking-[0.2em] text-[#c5a059] uppercase animate-pulse">{loadingTexts[loadingTextIndex]}</p>
                                        </div>
                                    ) : selectedApp && currentApp ? (
                                        <div className="flex-1 flex flex-col justify-between z-10 animate-fade-in py-2 max-w-xl mx-auto w-full text-left">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-5 border-b border-[#c5a059]/15 pb-4">
                                                    <span className="text-5xl">{currentApp.emoji}</span>
                                                    <div>
                                                        <h3 className="font-display text-xl font-bold uppercase tracking-widest text-[#c5a059]">{currentApp.label}</h3>
                                                        <p className="text-[10px] uppercase text-[#c5a059]/50">{currentApp.developer}</p>
                                                    </div>
                                                </div>
                                                <p className="font-body text-sm leading-relaxed text-[#eee8dc]/80">{currentApp.description}</p>
                                                <div className="p-4 border border-[#c5a059]/20 bg-black/40 rounded-xl text-center max-w-sm mx-auto flex items-center justify-center gap-3">
                                                    <span className="material-icons text-xl text-amber-500 animate-bounce">construction</span>
                                                    <div className="text-left">
                                                        <span className="text-[9px] uppercase tracking-wider block text-amber-500 font-bold">{language.startsWith("pt") ? "Em Construção no Metasistema" : "Under Construction"}</span>
                                                        <span className="text-[8px] text-[#eee8dc]/50">{currentApp.version}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="pt-4 flex justify-end">
                                                <button type="button" onClick={() => setSelectedApp(null)} className="cursor-pointer border border-[#c5a059]/40 bg-[#c5a059]/10 hover:bg-[#c5a059]/20 px-6 py-2 rounded-xl font-display text-[9px] uppercase tracking-wider text-[#fde68a]">{language.startsWith("pt") ? "← Fechar Domínio" : "← Close Domínio"}</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col justify-between z-10 animate-fade-in pt-2">
                                            <p className="font-display text-[9px] uppercase tracking-widest text-[#c5a059]/40 text-center mb-8">{language.startsWith("pt") ? "Grimório de Mesa - Sovereign Workspace" : "Table Grimoire - Sovereign Workspace"}</p>
                                            
                                            {/* Horizontal Row app icons row (desktop style) */}
                                            <div className="grid grid-cols-4 gap-6 px-4">
                                                {DOMAINS.map((app) => (
                                                    <button key={app.id} onClick={() => handleAppClick(app.id)} className="flex flex-col items-center group cursor-pointer bg-black/30 border border-[#c5a059]/15 hover:border-[#c5a059]/60 p-4 rounded-xl transition-all duration-300">
                                                        <div className="app-icon-jiggle w-16 h-16 bg-gradient-to-br from-[#1c1a24] via-[#0b0a0f] to-[#121017] border-2 border-[#c5a059]/40 rounded-2xl flex items-center justify-center text-3xl shadow-md transition-all mb-3 relative overflow-hidden">
                                                            <div className="absolute inset-1 rounded-[0.95rem] border border-[#c5a059]/10"></div>
                                                            <span className="drop-shadow-[0_4px_6px_rgba(0,0,0,0.4)]">{app.emoji}</span>
                                                            <span className="absolute -top-1 -right-1 bg-gradient-to-r from-[#7c2d12] to-[#b45309] text-[#fde68a] text-[6px] uppercase font-bold px-1.5 py-0.5 rounded-full border border-black shadow">Soon</span>
                                                        </div>
                                                        <span className="text-[9px] font-bold uppercase tracking-widest text-[#c5a059]/80 group-hover:text-[#fde68a]">{app.label}</span>
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Dock Area Widescreen */}
                                            <div className="glass-medieval rounded-2xl p-2.5 border border-[#c5a059]/15 bg-white/5 flex justify-around items-center select-none mt-8 text-xl max-w-xs w-full mx-auto">
                                                <span>🛡️</span><span>⚜️</span><span>🧭</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Simulated monitor stand decoration */}
                                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1.5 w-32 bg-[#c5a059]/35 rounded-full select-none"></div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Solid Page Footer (Hidden in fullscreen OS mode) */}
            {!isFullscreen && (
                <footer className="relative z-20 p-8 border-t border-[#c5a059]/10 bg-black/60 text-center">
                    <p className="text-[10px] medieval-text-gold opacity-40 italic">
                        {language.startsWith("pt") 
                            ? "“A governança da própria mente exige ordem nos afazeres e clareza nos hábitos.”" 
                            : language === "es"
                                ? "“El governo de la propia mente requiere orden en los quehaceres y claridad en los hábitos.”"
                                : "“Governing one's own mind requires order in actions and clarity in habits.”"}
                    </p>
                </footer>
            )}

            {!isFullscreen && <InstitutionalFooter />}
        </main>
    );
}
