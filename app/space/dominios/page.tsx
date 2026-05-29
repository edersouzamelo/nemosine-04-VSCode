"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "../../components/LanguageProvider";
import Navbar from "../../components/Navbar";
import InstitutionalFooter from "../../components/InstitutionalFooter";

export default function DominiosHubPage() {
    const { t, language } = useLanguage();
    const [selectedApp, setSelectedApp] = useState<string | null>(null);
    const [loadingApp, setLoadingApp] = useState<boolean>(false);
    const [loadingTextIndex, setLoadingTextIndex] = useState(0);
    const [simulatedTime, setSimulatedTime] = useState("20:00");

    // Dynamic Clock inside phone status bar
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

    const DOMAINS = [
        {
            id: "arauto",
            title: language.startsWith("pt") ? "Agenda do Arauto" : language === "es" ? "Agenda del Heraldo" : "Herald's Agenda",
            label: language.startsWith("pt") ? "Agenda" : language === "es" ? "Agenda" : "Agenda",
            description: language.startsWith("pt") 
                ? "Organize sua rotina, compromissos e lembretes com a solenidade e o aviso solene do Arauto. Planeje seu tempo com clareza executiva."
                : language === "es"
                    ? "Organiza tu rutina, citas y recordatorios con la solemnidad y el aviso solmene del Heraldo. Planifica tu tiempo con claridad."
                    : "Organize your routine, appointments, and reminders with the solemnity and warnings of the Herald.",
            emoji: "📯",
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
            emoji: "⚔️",
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
            emoji: "⚕️",
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
        
        // Cycle loading texts
        const textCycle = setInterval(() => {
            setLoadingTextIndex((prev) => (prev + 1) % loadingTexts.length);
        }, 600);

        setTimeout(() => {
            clearInterval(textCycle);
            setLoadingApp(false);
        }, 1800);
    };

    const currentApp = DOMAINS.find((app) => app.id === selectedApp);

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
            `}</style>

            {/* Dark Immersive Background */}
            <div className="fixed inset-0 z-0">
                <div className="absolute inset-0 bg-black/75 z-10 backdrop-blur-[2px]"></div>
                <div className="w-full h-full bg-[#0a0a0c] bg-[url('https://images.unsplash.com/photo-1510519138101-570d1dca3d66?q=80&w=2000')] bg-cover bg-center opacity-20 mix-blend-luminosity"></div>
            </div>

            <div className="sticky top-0 z-50">
                <Navbar />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-8 md:py-12 min-h-[calc(100vh-220px)] flex flex-col justify-center items-center">
                <header className="mb-8 text-center">
                    <span className="text-[10px] uppercase tracking-[0.25em] text-[#c5a059]/60 font-semibold block mb-1">
                        Sovereign OS v1.0
                    </span>
                    <h1 className="mb-2 font-display text-4xl uppercase tracking-widest text-[#c5a059]">{t("dominios")}</h1>
                    <p className="font-body text-base italic text-[#c5a059]/60 max-w-xl mx-auto">
                        {language.startsWith("pt")
                            ? "Explore os sub-aplicativos e domínios executivos em desenvolvimento"
                            : language === "es"
                                ? "Explora las subaplicaciones y áreas ejecutivas en desarrollo"
                                : "Explore the sub-applications and executive domains under development"}
                    </p>
                </header>

                {/* Virtual Smartphone Emulator */}
                <div className="relative mx-auto w-[330px] sm:w-[350px] aspect-[9/18.8] bg-black border-[6px] border-[#c5a059]/60 rounded-[3rem] shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col p-3 pb-4">
                    {/* Inner gold styling frame */}
                    <div className="absolute inset-1.5 rounded-[2.5rem] border border-[#c5a059]/10 pointer-events-none z-40"></div>

                    {/* Dynamic Island Notch */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-50 flex items-center justify-center border border-[#c5a059]/15">
                        <div className="w-2.5 h-2.5 rounded-full bg-stone-900 absolute left-3"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]/30 absolute right-4"></div>
                    </div>

                    {/* Simulated Phone Status Bar */}
                    <div className="flex justify-between items-center text-[9px] font-bold text-[#c5a059]/75 px-5 pt-3 pb-2 z-30 select-none">
                        <span>{simulatedTime}</span>
                        <div className="flex items-center gap-1.5">
                            <span>⚜️</span>
                            <span>📶</span>
                            <span>🔋</span>
                        </div>
                    </div>

                    {/* Simulated Virtual Screen Content */}
                    <div className="flex-1 rounded-[2rem] overflow-hidden relative bg-[#090a0f] flex flex-col justify-between p-4 border border-[#c5a059]/5">
                        {/* Background Wallpaper Glow */}
                        <div className="absolute inset-0 bg-radial-gradient from-indigo-950/20 via-black to-black z-0 pointer-events-none"></div>
                        <div className="absolute top-[-30%] left-[-30%] w-[160%] h-[160%] bg-[url('https://images.unsplash.com/photo-1510519138101-570d1dca3d66?q=80&w=600')] bg-cover bg-center opacity-10 blur-xl pointer-events-none"></div>

                        {/* Screen States */}
                        {loadingApp ? (
                            /* Loader Screen */
                            <div className="flex-1 flex flex-col items-center justify-center z-10 animate-fade-in">
                                <div className="relative flex items-center justify-center mb-6">
                                    <div className="w-16 h-16 rounded-full border-2 border-[#c5a059]/20 border-t-[#c5a059] animate-spin"></div>
                                    <span className="absolute text-2xl">⚜️</span>
                                </div>
                                <p className="font-display text-[10px] tracking-[0.2em] text-[#c5a059] uppercase animate-pulse">
                                    {loadingTexts[loadingTextIndex]}
                                </p>
                            </div>
                        ) : selectedApp && currentApp ? (
                            /* Sub-App Inner Details Screen */
                            <div className="flex-1 flex flex-col justify-between z-10 animate-fade-in py-3">
                                <div className="space-y-5 text-left">
                                    <div className="flex items-center gap-4 border-b border-[#c5a059]/15 pb-4">
                                        <div className="w-14 h-14 bg-gradient-to-br from-[#1a1c2c] to-[#0a0a0c] border-2 border-[#c5a059]/40 rounded-2xl flex items-center justify-center text-3xl shadow-[0_0_15px_rgba(197,160,89,0.15)] select-none">
                                            {currentApp.emoji}
                                        </div>
                                        <div>
                                            <h3 className="font-display text-base font-bold uppercase tracking-widest text-[#c5a059]">
                                                {currentApp.label}
                                            </h3>
                                            <p className="text-[7.5px] uppercase tracking-wider text-[#c5a059]/50">
                                                {currentApp.developer}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <span className="text-[7.5px] uppercase tracking-wider text-amber-500 font-bold block">
                                                {language.startsWith("pt") ? "Status do Portal" : "Portal Status"}
                                            </span>
                                            <p className="font-body text-xs leading-relaxed text-[#eee8dc]/75">
                                                {currentApp.description}
                                            </p>
                                        </div>

                                        <div className="glass-medieval rounded-xl p-3.5 border border-[#c5a059]/20 bg-black/40 text-center space-y-1">
                                            <span className="material-icons text-xl text-amber-500 animate-bounce">construction</span>
                                            <h4 className="font-display text-[9px] uppercase tracking-wider text-[#c5a059]">
                                                {language.startsWith("pt") ? "Em Construção" : "Under Construction"}
                                            </h4>
                                            <p className="text-[7.5px] uppercase tracking-wider text-[#eee8dc]/50">
                                                {currentApp.version}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setSelectedApp(null)}
                                    className="w-full cursor-pointer border border-[#c5a059]/40 bg-[#c5a059]/10 hover:bg-[#c5a059]/20 px-4 py-2.5 rounded-xl font-display text-[8.5px] uppercase tracking-widest text-[#fde68a] hover:text-white transition-all font-semibold"
                                >
                                    {language.startsWith("pt") ? "← Fechar App" : "← Close App"}
                                </button>
                            </div>
                        ) : (
                            /* Home Screen / Apps Grid */
                            <div className="flex-1 flex flex-col justify-between z-10 animate-fade-in pt-4">
                                <div className="space-y-4">
                                    <div className="text-center pb-2 select-none">
                                        <p className="font-display text-[9px] uppercase tracking-[0.2em] text-[#c5a059]/50">
                                            {language.startsWith("pt") ? "Grimório de Bolso" : "Pocket Grimoire"}
                                        </p>
                                    </div>

                                    {/* Curved square iOS-style apps grid */}
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-6 px-1.5">
                                        {DOMAINS.map((app) => (
                                            <button
                                                key={app.id}
                                                type="button"
                                                onClick={() => handleAppClick(app.id)}
                                                className="flex flex-col items-center group cursor-pointer"
                                            >
                                                {/* App icon container */}
                                                <div className="app-icon-jiggle w-16 h-16 bg-gradient-to-br from-[#12131a] to-[#06070a] border border-[#c5a059]/30 rounded-2xl flex items-center justify-center text-3xl shadow-[0_6px_15px_rgba(0,0,0,0.5)] transition-all duration-300 group-hover:border-[#c5a059] group-hover:scale-[1.04] relative group-hover:shadow-[0_0_20px_rgba(197,160,89,0.18)]">
                                                    <span>{app.emoji}</span>
                                                    {/* Soon notification badge */}
                                                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-500 to-yellow-600 text-black text-[6px] uppercase font-bold tracking-wider px-1 py-0.5 rounded-full border border-black shadow">
                                                        Soon
                                                    </span>
                                                </div>
                                                <span className="text-[8.5px] uppercase tracking-[0.18em] text-[#c5a059]/80 group-hover:text-[#c5a059] mt-2 font-display text-center font-bold truncate w-full px-1">
                                                    {app.label}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Dock Area */}
                                <div className="glass-medieval rounded-2xl p-2 border border-[#c5a059]/15 bg-white/5 backdrop-blur-md flex justify-around items-center select-none">
                                    <span className="text-xl opacity-60 hover:opacity-100 transition-opacity">🛡️</span>
                                    <span className="text-xl opacity-60 hover:opacity-100 transition-opacity">⚜️</span>
                                    <span className="text-xl opacity-60 hover:opacity-100 transition-opacity">🧭</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Simulated iPhone Home Bar */}
                    <div className="h-1 w-28 bg-[#c5a059]/30 rounded-full mx-auto mt-3 select-none"></div>
                </div>
            </div>

            {/* Solid Footer */}
            <footer className="relative z-20 p-8 border-t border-[#c5a059]/10 bg-black/60 text-center">
                <p className="text-[10px] medieval-text-gold opacity-40 italic">
                    {language.startsWith("pt") 
                        ? "“A governança da própria mente exige ordem nos afazeres e clareza nos hábitos.”" 
                        : language === "es"
                            ? "“El gobierno de la propia mente requiere orden en los quehaceres y claridad en los hábitos.”"
                            : "“Governing one's own mind requires order in actions and clarity in habits.”"}
                </p>
            </footer>

            <InstitutionalFooter />
        </main>
    );
}
