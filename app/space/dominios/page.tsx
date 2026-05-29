"use client";

import { useLanguage } from "../../components/LanguageProvider";
import Navbar from "../../components/Navbar";
import InstitutionalFooter from "../../components/InstitutionalFooter";
import MedievalButton from "../../components/MedievalButton";

export default function DominiosHubPage() {
    const { t, language } = useLanguage();

    const DOMAINS = [
        {
            id: "arauto",
            title: language.startsWith("pt") ? "Agenda do Arauto" : language === "es" ? "Agenda del Heraldo" : "Herald's Agenda",
            description: language.startsWith("pt") 
                ? "Organize sua rotina, compromissos e lembretes com a solenidade e o aviso solene do Arauto."
                : language === "es"
                    ? "Organiza tu rutina, citas y recordatorios con la solemnidad y el aviso solmene del Heraldo."
                    : "Organize your routine, appointments, and reminders with the solemnity and warnings of the Herald.",
            emoji: "📯",
        },
        {
            id: "treinador",
            title: language.startsWith("pt") ? "Controle do Treinador" : language === "es" ? "Control del Entrenador" : "Trainer's Control",
            description: language.startsWith("pt")
                ? "Monitore seus hábitos, metas de disciplina e performance sob o olhar firme do Treinador."
                : language === "es"
                    ? "Monitorea tus hábitos, metas de disciplina y rendimiento bajo la mirada firme del Entrenador."
                    : "Track your habits, discipline goals, and performance under the steadfast gaze of the Trainer.",
            emoji: "⚔️",
        },
        {
            id: "mordomo",
            title: language.startsWith("pt") ? "Orçamento do Mordomo" : language === "es" ? "Presupuesto del Mayordomo" : "Butler's Budget",
            description: language.startsWith("pt")
                ? "Gerencie suas finanças, fluxos de despesas e recursos com a precisão matemática do Mordomo."
                : language === "es"
                    ? "Gestiona tus finanzas, flujos de gastos y recursos con la precisión matemática del Mayordomo."
                    : "Manage your finances, expense streams, and resources with the mathematical precision of the Butler.",
            emoji: "🗝️",
        },
        {
            id: "medico",
            title: language.startsWith("pt") ? "Prontuário do Médico" : language === "es" ? "Historial del Médico" : "Physician's Record",
            description: language.startsWith("pt")
                ? "Acompanhe seus dados de saúde, bem-estar, sono e vitalidade sob o cuidado do Médico."
                : language === "es"
                    ? "Haz un seguimiento de tus datos de salud, bienestar, sueño y vitalidad bajo el cuidado del Médico."
                    : "Track your health data, well-being, sleep, and vitality under the dedicated care of the Physician.",
            emoji: "⚕️",
        }
    ];

    return (
        <main className="relative min-h-screen bg-[#050507] text-[#e1e1e6]">
            {/* Dark Immersive Background */}
            <div className="fixed inset-0 z-0">
                <div className="absolute inset-0 bg-black/70 z-10 backdrop-blur-[2px]"></div>
                <div className="w-full h-full bg-[#0a0a0c] bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2000')] bg-cover bg-center opacity-15 mix-blend-luminosity"></div>
            </div>

            <div className="sticky top-0 z-50">
                <Navbar />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-12 min-h-[calc(100vh-220px)] flex flex-col justify-center">
                <header className="mb-12 text-center">
                    <span className="text-[10px] uppercase tracking-[0.25em] text-[#c5a059]/60 font-semibold block mb-1">
                        {language.startsWith("pt") ? "Abas Executivas da Mente" : language === "es" ? "Áreas Ejecutivas de la Mente" : "Executive Areas of the Mind"}
                    </span>
                    <h1 className="mb-2 font-display text-4xl uppercase tracking-widest text-[#c5a059]">{t("dominios")}</h1>
                    <p className="font-body text-base italic text-[#c5a059]/60 max-w-xl mx-auto">
                        {language.startsWith("pt")
                            ? "Painel de controle estratégico e sustentação prática para o dia a dia"
                            : language === "es"
                                ? "Panel de control estratégico y soporte práctico para el día a día"
                                : "Strategic control panel and practical support for daily operations"}
                    </p>
                </header>

                {/* Domains Grid/Carousel Container */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto w-full">
                    {DOMAINS.map((domain) => (
                        <div 
                            key={domain.id} 
                            className="group/card opacity-85 hover:opacity-100 transition-opacity duration-300 w-full"
                        >
                            <div className="bg-[#0c0d11]/85 border border-[#333]/60 rounded-xl overflow-hidden hover:border-[#c5a059]/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(197,160,89,0.1)] h-[440px] flex flex-col relative">
                                {/* "Em Breve" Badge */}
                                <span className="absolute top-4 right-4 z-20 bg-amber-500/10 border border-amber-500/40 text-amber-500 font-display text-[9px] tracking-widest uppercase px-2.5 py-1 rounded shadow-[0_0_10px_rgba(245,158,11,0.15)]">
                                    {t("soon")}
                                </span>

                                {/* Card Header Background (Grayscale & Faded) */}
                                <div className="h-40 bg-black/80 relative flex items-center justify-center overflow-hidden border-b border-[#333]/20">
                                    <div className="absolute inset-0 opacity-10 bg-[url('/assets/cards/Anverso%20padrão.png')] bg-cover bg-center"></div>
                                    <span className="text-6xl opacity-50 group-hover/card:opacity-80 transition-all duration-500 group-hover/card:scale-110 drop-shadow-[0_0_15px_rgba(197,160,89,0.2)]">
                                        {domain.emoji}
                                    </span>
                                </div>
                                
                                {/* Card Body */}
                                <div className="p-6 flex-1 flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-lg font-display uppercase tracking-widest text-[#c5a059]/80 group-hover/card:text-[#c5a059] mb-3 transition-colors duration-300">
                                            {domain.title}
                                        </h3>
                                        <p className="font-body text-[#e1e1e6]/65 text-sm leading-relaxed">
                                            {domain.description}
                                        </p>
                                    </div>
                                    <div className="mt-4">
                                        <MedievalButton disabled variant="secondary" className="w-full text-xs tracking-widest py-3 opacity-40 cursor-not-allowed border-[#333] text-stone-500 hover:bg-transparent hover:border-[#333]">
                                            {t("soon")}
                                        </MedievalButton>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
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
