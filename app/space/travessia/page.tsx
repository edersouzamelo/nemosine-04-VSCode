"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/app/components/LanguageProvider";
import MedievalButton from "@/app/components/MedievalButton";
import Navbar from "@/app/components/Navbar";
import InstitutionalFooter from "@/app/components/InstitutionalFooter";

// Tiers of Caste
interface CasteDetails {
    id: string;
    title: string;
    description: string;
    perks: string[];
}

const CASTES: CasteDetails[] = [
    {
        id: "Peregrino",
        title: "Peregrino",
        description: "Acesso inicial ao Castelo. Dando os primeiros passos na jornada da consciência.",
        perks: ["8 Personas Fundamentais", "Diário de Campanha Básico", "Capítulo I Ativo"]
    },
    {
        id: "Vassalo",
        title: "Vassalo",
        description: "Reconhecimento de fidelidade ao Codex. O círculo de influência existencial se expande.",
        perks: ["24 Personas Ativas", "Capítulo II Desbloqueado", "Novos Domínios Abertos"]
    },
    {
        id: "Regente",
        title: "Regente",
        description: "Guardião da ordem interna. Governa com sabedoria pragmática e lucidez.",
        perks: ["56 Personas Ativas", "Capítulo III Desbloqueado", "Acesso Total aos Domínios"]
    },
    {
        id: "Soberano",
        title: "Soberano",
        description: "Integração completa da consciência. O metasistema existencial está sob domínio pleno.",
        perks: ["Todas as 56 Personas", "Capítulo IV Desbloqueado", "Domínio Pleno do Codex"]
    }
];

// Existential Chapters Journey
interface ChapterDetails {
    id: string;
    number: string;
    name: string;
    emoji: string;
    description: string;
    focus: string;
    unlockCondition: string;
    milestones: string[];
}

const CHAPTERS: ChapterDetails[] = [
    {
        id: "capitulo_1",
        number: "Capítulo I",
        name: "Capítulo I: Disciplina",
        emoji: "🛡️",
        description: "O despertar da força de vontade. Aqui, você confronta as distrações, a procrastinação e a inércia diária para forjar hábitos consistentes e recuperar a soberania do seu tempo.",
        focus: "Combate à inércia e estabelecimento de consistência",
        unlockCondition: "Disponível ao ingressar como Peregrino.",
        milestones: [
            "Derrotar a Distração (Foco)",
            "Superar a Procrastinação (Ação)",
            "Vencer a Autossabotagem (Vigilância)",
            "Romper a Inércia (Constância)"
        ]
    },
    {
        id: "capitulo_2",
        number: "Capítulo II",
        name: "Capítulo II: Emoções",
        emoji: "⚖️",
        description: "A jornada interior de integração e equilíbrio mental. Aprenda a compreender e canalizar seus impulsos, anseios e estados emocionais sem se deixar escravizar por eles.",
        focus: "Integração das sombras e equilíbrio emocional",
        unlockCondition: "Derrotar a 'Inércia' e ascender à casta de Vassalo.",
        milestones: [
            "Equilibrar a Impulsividade",
            "Acolher e canalizar a Ansiedade",
            "Superar o Desânimo Crônico"
        ]
    },
    {
        id: "capitulo_3",
        number: "Capítulo III",
        name: "Capítulo III: Recursos",
        emoji: "💰",
        description: "A sabedoria prática da Mordomia. Governe seus recursos materiais, finanças, tempo e energia com responsabilidade estratégica e consumo consciente.",
        focus: "Organização prática, finanças e mordomia",
        unlockCondition: "Concluir o Capítulo II e atingir a casta de Regente.",
        milestones: [
            "Superar o sentimento de Escassez",
            "Dominar o impulso do Consumismo",
            "Estruturar a Organização do Tempo"
        ]
    },
    {
        id: "capitulo_4",
        number: "Capítulo IV",
        name: "Capítulo IV: Vitalidade",
        emoji: "⚕️",
        description: "O templo do corpo físico. Otimize sua nutrição, sono, respiração e movimento para sustentar a clareza da mente e a alta energia existencial necessária para governar sua vida.",
        focus: "Cuidado corporal, sono sã e vigor vital",
        unlockCondition: "Concluir o Capítulo III e atingir a casta de Soberano.",
        milestones: [
            "Superar a letargia do Sedentarismo",
            "Equilibrar a Exaustão nervosa",
            "Honrar o Templo Físico e sono sã"
        ]
    }
];

// Crossing Bosses / Challenges
interface BossDetails {
    id: string;
    chapterId: string;
    name: string;
    description: string;
    relicName: string;
    relicDescription: string;
}

const BOSSES: BossDetails[] = [
    // Capítulo I
    {
        id: "distracao",
        chapterId: "capitulo_1",
        name: "Distração",
        description: "O ruído constante de notificações, abas abertas e pequenos prazeres fugazes que roubam a sua presença.",
        relicName: "Relíquia do Foco 🔮",
        relicDescription: "Obtida ao silenciar o ruído externo e forjar clareza de presença."
    },
    {
        id: "procrastinacao",
        chapterId: "capitulo_1",
        name: "Procrastinação",
        description: "O adiar solene de compromissos sob o pretexto de 'esperar o momento ideal', alimentando a culpa silenciosa.",
        relicName: "Relíquia da Ação ⚔️",
        relicDescription: "Obtida ao quebrar a inação e realizar o primeiro passo com decisão imediata."
    },
    {
        id: "autossabotagem",
        chapterId: "capitulo_1",
        name: "Autossabotagem",
        description: "A voz interna que sussurra que você não é digno ou capaz, erguendo barreiras invisíveis antes do início.",
        relicName: "Relíquia da Vigilância 🛡️",
        relicDescription: "Obtida ao desarmar o medo subjetivo através da auto-observação atenta."
    },
    {
        id: "inercia",
        chapterId: "capitulo_1",
        name: "Inércia (Boss do Capítulo)",
        description: "A força oculta que atrai sua mente de volta à estagnação, testando sua resiliência após alguns dias de constância.",
        relicName: "Relíquia da Constância 🏅",
        relicDescription: "Obtida ao derrotar a estagnação e provar consistência inabalável na disciplina."
    },
    // Capítulo II
    {
        id: "impulsividade",
        chapterId: "capitulo_2",
        name: "Impulsividade",
        description: "A reação imediata e intempestiva guiada pela urgência emocional antes de qualquer ponderação prudente.",
        relicName: "Relíquia da Ponderação ⚓",
        relicDescription: "Obtida ao respirar no espaço entre o estímulo e a reação."
    },
    {
        id: "ansiedade",
        chapterId: "capitulo_2",
        name: "Ansiedade",
        description: "O turbilhão mental de cenários futuros catastróficos que impede o usufruto consciente do momento presente.",
        relicName: "Relíquia da Presença 🕊️",
        relicDescription: "Obtida ao ancorar-se no agora e aceitar o fluxo incerto da realidade."
    },
    {
        id: "desanimo",
        chapterId: "capitulo_2",
        name: "Desânimo (Boss do Capítulo)",
        description: "A apatia paralisante que sussurra que nenhum esforço vale a pena, nublando o horizonte de propósitos.",
        relicName: "Relíquia do Equilíbrio ⚖️",
        relicDescription: "Obtida ao acender a chama interior e resgatar o significado existencial de seus atos."
    },
    // Capítulo III
    {
        id: "escassez",
        chapterId: "capitulo_3",
        name: "Escassez",
        description: "O sentimento inconsciente de falta contívola que gera avareza, medo irracional de investir ou paralisia na prosperidade.",
        relicName: "Relíquia da Consciência 💎",
        relicDescription: "Obtida ao reconhecer os recursos disponíveis e agir com sabedoria e generosidade."
    },
    {
        id: "consumismo",
        chapterId: "capitulo_3",
        name: "Consumismo",
        description: "A compensação de vazios emocionais através da compra compulsiva de posses supérfluas e prazeres momentâneos.",
        relicName: "Relíquia da Sobriedade 💰",
        relicDescription: "Obtida ao diferenciar necessidade de desejo supérfluo com temperança límpida."
    },
    {
        id: "desorganizacao",
        chapterId: "capitulo_3",
        name: "Desorganização (Boss do Capítulo)",
        description: "A falta de clareza, limites e acompanhamento prático das próprias finanças e alocação do tempo.",
        relicName: "Relíquia da Prosperidade 📈",
        relicDescription: "Obtida ao estruturar com precisão e responsabilidade os fluxos materiais de sua vida."
    },
    // Capítulo IV
    {
        id: "sedentarismo",
        chapterId: "capitulo_4",
        name: "Sedentarismo",
        description: "A inércia corporal prolongada que atrofia a musculatura, prejudica a respiração e drena o vigor natural.",
        relicName: "Relíquia do Vigor 🏃",
        relicDescription: "Obtida ao honrar o templo físico através do movimento vigoroso e consciente."
    },
    {
        id: "exaustao",
        chapterId: "capitulo_4",
        name: "Exaustão",
        description: "Negligenciar os períodos de descanso e os limites do sistema nervoso em nome de um produtivismo cego.",
        relicName: "Relíquia da Regeneração 🔋",
        relicDescription: "Obtida ao respeitar os ciclos de pausa e nutrir o sono com reverência sagrada."
    },
    {
        id: "descuido",
        chapterId: "capitulo_4",
        name: "Descuido (Boss do Capítulo)",
        description: "Ignorar a saúde preventiva e os alertas biológicos do corpo, postergando check-ups e nutrição sã.",
        relicName: "Relíquia da Vitalidade 🩺",
        relicDescription: "Obtida ao abraçar a autoescuta corporal e a sabedoria da saúde integrada."
    }
];

interface UserRelic {
    id: string;
    name: string;
    description: string;
    origin: string;
    dateObtained: string;
}

interface BossLog {
    id: string;
    crossingId: string;
    bossId: string;
    date: string;
    context: string;
    strategy: string;
    outcome: string;
}

export default function TravessiaPage() {
    const router = useRouter();
    const { language } = useLanguage();

    const [dbSyncStatus, setDbSyncStatus] = useState<"syncing" | "synced" | "offline">("syncing");

    // Travessia Dynamic States
    const [currentCaste, setCurrentCaste] = useState<string>("Peregrino");
    const [unlockedRegions, setUnlockedRegions] = useState<string[]>(["capitulo_1"]);
    const [relics, setRelics] = useState<UserRelic[]>([]);
    const [bossLogs, setBossLogs] = useState<BossLog[]>([]);

    // UI state indicators
    const [selectedChapter, setSelectedChapter] = useState<ChapterDetails | null>(null);
    const [activeCampaignChapterId, setActiveCampaignChapterId] = useState<string>("capitulo_1");
    const [confrontingBoss, setConfrontingBoss] = useState<BossDetails | null>(null);
    const [isSealingCompleted, setIsSealingCompleted] = useState(false);
    const [currentSealingChapter, setCurrentSealingChapter] = useState<string>("");

    // Battle inputs
    const [battleContext, setBattleContext] = useState("");
    const [battleStrategy, setBattleStrategy] = useState("");
    const [battleOutcome, setBattleOutcome] = useState("");

    // ==========================================
    // DATA FETCHING & SYNCHRONIZATION
    // ==========================================

    useEffect(() => {
        const fetchTravessiaData = async () => {
            setDbSyncStatus("syncing");
            try {
                const response = await fetch("/api/sovereign", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "get_travessia_data" })
                });

                if (response.status === 401) {
                    throw new Error("Unauthorized");
                }

                const data = await response.json();
                setCurrentCaste(data.caste || "Peregrino");
                
                let loadedChapters: string[] = data.unlockedRegions || [];
                
                // Map old physical room IDs to new existential chapters for backwards compatibility
                if (loadedChapters.includes("biblioteca") || loadedChapters.includes("claustro") || loadedChapters.includes("jardim") || loadedChapters.includes("tribunal")) {
                    if (!loadedChapters.includes("capitulo_1")) loadedChapters.push("capitulo_1");
                }
                if (loadedChapters.includes("observatorio") || loadedChapters.includes("portal") || loadedChapters.includes("mosteiro")) {
                    if (!loadedChapters.includes("capitulo_1")) loadedChapters.push("capitulo_1");
                    if (!loadedChapters.includes("capitulo_2")) loadedChapters.push("capitulo_2");
                }
                if (loadedChapters.includes("sala_trono")) {
                    if (!loadedChapters.includes("capitulo_1")) loadedChapters.push("capitulo_1");
                    if (!loadedChapters.includes("capitulo_2")) loadedChapters.push("capitulo_2");
                    if (!loadedChapters.includes("capitulo_3")) loadedChapters.push("capitulo_3");
                    if (!loadedChapters.includes("capitulo_4")) loadedChapters.push("capitulo_4");
                }
                
                if (loadedChapters.length === 0 || !loadedChapters.includes("capitulo_1")) {
                    loadedChapters.push("capitulo_1");
                }
                
                // Keep chapters unlocked in sync with Caste levels for seamless transition
                const caste = data.caste || "Peregrino";
                if (caste === "Vassalo" && !loadedChapters.includes("capitulo_2")) loadedChapters.push("capitulo_2");
                if (caste === "Regente") {
                    if (!loadedChapters.includes("capitulo_2")) loadedChapters.push("capitulo_2");
                    if (!loadedChapters.includes("capitulo_3")) loadedChapters.push("capitulo_3");
                }
                if (caste === "Soberano") {
                    if (!loadedChapters.includes("capitulo_2")) loadedChapters.push("capitulo_2");
                    if (!loadedChapters.includes("capitulo_3")) loadedChapters.push("capitulo_3");
                    if (!loadedChapters.includes("capitulo_4")) loadedChapters.push("capitulo_4");
                }

                setUnlockedRegions(loadedChapters);
                setRelics(data.relics || []);
                setBossLogs(data.bossLogs || []);
                setDbSyncStatus("synced");
                
                // Auto switch active campaign selector to latest unlocked chapter
                if (loadedChapters.includes("capitulo_4")) setActiveCampaignChapterId("capitulo_4");
                else if (loadedChapters.includes("capitulo_3")) setActiveCampaignChapterId("capitulo_3");
                else if (loadedChapters.includes("capitulo_2")) setActiveCampaignChapterId("capitulo_2");
                else setActiveCampaignChapterId("capitulo_1");
                
            } catch {
                console.log("Travessia offline/unauthenticated fallback to LocalStorage.");
                // Local fallback
                const fallbackCaste = localStorage.getItem("sovereign_caste") || "Peregrino";
                setCurrentCaste(fallbackCaste);
                
                let loadedChapters: string[] = JSON.parse(localStorage.getItem("sovereign_unlocked_regions") || '["capitulo_1"]');
                
                // Map old physical room IDs to new existential chapters for backwards compatibility
                if (loadedChapters.includes("biblioteca") || loadedChapters.includes("claustro") || loadedChapters.includes("jardim") || loadedChapters.includes("tribunal")) {
                    if (!loadedChapters.includes("capitulo_1")) loadedChapters.push("capitulo_1");
                }
                if (loadedChapters.includes("observatorio") || loadedChapters.includes("portal") || loadedChapters.includes("mosteiro")) {
                    if (!loadedChapters.includes("capitulo_1")) loadedChapters.push("capitulo_1");
                    if (!loadedChapters.includes("capitulo_2")) loadedChapters.push("capitulo_2");
                }
                if (loadedChapters.includes("sala_trono")) {
                    if (!loadedChapters.includes("capitulo_1")) loadedChapters.push("capitulo_1");
                    if (!loadedChapters.includes("capitulo_2")) loadedChapters.push("capitulo_2");
                    if (!loadedChapters.includes("capitulo_3")) loadedChapters.push("capitulo_3");
                    if (!loadedChapters.includes("capitulo_4")) loadedChapters.push("capitulo_4");
                }
                
                if (!loadedChapters.includes("capitulo_1")) {
                    loadedChapters.push("capitulo_1");
                }

                if (fallbackCaste === "Vassalo" && !loadedChapters.includes("capitulo_2")) loadedChapters.push("capitulo_2");
                if (fallbackCaste === "Regente") {
                    if (!loadedChapters.includes("capitulo_2")) loadedChapters.push("capitulo_2");
                    if (!loadedChapters.includes("capitulo_3")) loadedChapters.push("capitulo_3");
                }
                if (fallbackCaste === "Soberano") {
                    if (!loadedChapters.includes("capitulo_2")) loadedChapters.push("capitulo_2");
                    if (!loadedChapters.includes("capitulo_3")) loadedChapters.push("capitulo_3");
                    if (!loadedChapters.includes("capitulo_4")) loadedChapters.push("capitulo_4");
                }

                setUnlockedRegions(loadedChapters);
                setRelics(JSON.parse(localStorage.getItem("sovereign_relics") || "[]"));
                setBossLogs(JSON.parse(localStorage.getItem("sovereign_boss_logs") || "[]"));
                setDbSyncStatus("offline");
                
                if (loadedChapters.includes("capitulo_4")) setActiveCampaignChapterId("capitulo_4");
                else if (loadedChapters.includes("capitulo_3")) setActiveCampaignChapterId("capitulo_3");
                else if (loadedChapters.includes("capitulo_2")) setActiveCampaignChapterId("capitulo_2");
                else setActiveCampaignChapterId("capitulo_1");
            }
        };

        fetchTravessiaData();
    }, []);

    // DB/Local Save triggers
    const saveCasteLocal = async (caste: string) => {
        setCurrentCaste(caste);
        if (dbSyncStatus === "synced") {
            try {
                await fetch("/api/sovereign", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "update_caste", caste })
                });
            } catch {
                console.error("Failed to sync caste.");
            }
        } else {
            localStorage.setItem("sovereign_caste", caste);
        }
    };

    const saveUnlockedRegionLocal = async (regionId: string) => {
        if (unlockedRegions.includes(regionId)) return;
        const updated = [...unlockedRegions, regionId];
        setUnlockedRegions(updated);

        if (dbSyncStatus === "synced") {
            try {
                await fetch("/api/sovereign", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "unlock_region", regionId })
                });
            } catch {
                console.error("Failed to sync region unlock.");
            }
        } else {
            localStorage.setItem("sovereign_unlocked_regions", JSON.stringify(updated));
        }
    };

    const saveBossDefeatLocal = async (log: BossLog, relic: UserRelic) => {
        const updatedLogs = [...bossLogs, log];
        const updatedRelics = [...relics, relic];

        setBossLogs(updatedLogs);
        setRelics(updatedRelics);

        // Automatic Caste progress & Chapter unlock checks
        let updatedCaste = currentCaste;
        if (log.bossId === "inercia") {
            updatedCaste = "Vassalo";
            saveCasteLocal("Vassalo");
            saveUnlockedRegionLocal("capitulo_2");
            setActiveCampaignChapterId("capitulo_2");
        } else if (log.bossId === "desanimo") {
            updatedCaste = "Regente";
            saveCasteLocal("Regente");
            saveUnlockedRegionLocal("capitulo_3");
            setActiveCampaignChapterId("capitulo_3");
        } else if (log.bossId === "desorganizacao") {
            updatedCaste = "Soberano";
            saveCasteLocal("Soberano");
            saveUnlockedRegionLocal("capitulo_4");
            setActiveCampaignChapterId("capitulo_4");
        }

        if (dbSyncStatus === "synced") {
            try {
                await Promise.all([
                    fetch("/api/sovereign", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "save_boss_log", log })
                    }),
                    fetch("/api/sovereign", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "save_relic", relic })
                    })
                ]);
            } catch {
                console.error("Failed to sync campaign log.");
            }
        } else {
            localStorage.setItem("sovereign_boss_logs", JSON.stringify(updatedLogs));
            localStorage.setItem("sovereign_relics", JSON.stringify(updatedRelics));
        }
    };

    // ==========================================
    // INTERACTIVE ACTIONS
    // ==========================================

    const handleConfrontBoss = (boss: BossDetails) => {
        setConfrontingBoss(boss);
        setBattleContext("");
        setBattleStrategy("");
        setBattleOutcome("");
    };

    const handleResolveConfront = (e: React.FormEvent) => {
        e.preventDefault();
        if (!confrontingBoss || !battleContext || !battleStrategy || !battleOutcome) return;

        const dateStr = new Date().toLocaleDateString(language.startsWith("pt") ? "pt-BR" : "en-US");
        const logId = Math.random().toString(36).substring(2, 9);
        
        // Find which chapter this boss belongs to
        const currentChapterObj = CHAPTERS.find(c => c.id === confrontingBoss.chapterId);
        const crossingTitle = currentChapterObj ? currentChapterObj.name : "Jornada Existencial";

        const newLog: BossLog = {
            id: logId,
            crossingId: crossingTitle,
            bossId: confrontingBoss.id,
            date: dateStr,
            context: battleContext,
            strategy: battleStrategy,
            outcome: battleOutcome
        };

        const relicId = Math.random().toString(36).substring(2, 9);
        const newRelic: UserRelic = {
            id: relicId,
            name: confrontingBoss.relicName,
            description: confrontingBoss.relicDescription,
            origin: `Superação de Obstáculo: ${confrontingBoss.name}`,
            dateObtained: dateStr
        };

        saveBossDefeatLocal(newLog, newRelic);
        setConfrontingBoss(null);

        // If the defeated boss is a chapter final boss, trigger a dynamic parchment seal ceremony!
        const isChapterBoss = ["inercia", "desanimo", "desorganizacao", "descuido"].includes(confrontingBoss.id);
        if (isChapterBoss) {
            setCurrentSealingChapter(confrontingBoss.chapterId);
            setIsSealingCompleted(true);
        }
    };

    // Progression variables
    const completedBossIds = bossLogs.map(l => l.bossId);
    const isBossDefeated = (bossId: string) => completedBossIds.includes(bossId);

    const activeCasteDetails = CASTES.find(c => c.id === currentCaste) || CASTES[0];

    return (
        <main className="min-h-screen bg-[#050507] text-[#e1e1e6] relative overflow-hidden flex flex-col justify-between select-none">
            {/* Ancient Atlas Atmosphere */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-black/85 z-10 backdrop-blur-[1px]"></div>
                <div className="w-full h-full bg-[#0a0a0c] bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=2000')] bg-cover bg-center opacity-10 mix-blend-luminosity"></div>
            </div>

            <div className="sticky top-0 z-50">
                <Navbar />
            </div>

            <div className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-8 py-10 md:py-16 flex-1 flex flex-col gap-10">
                
                {/* 1. TOP SECTION: CASTE HEADER */}
                <header className="glass-medieval w-full rounded-3xl p-6 md:p-8 border-2 border-[#c5a059]/40 bg-black/60 shadow-[0_15px_40px_rgba(0,0,0,0.8)] relative overflow-hidden text-left flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#c5a059]/5 to-transparent pointer-events-none"></div>
                    
                    <div className="space-y-3 max-w-xl">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl drop-shadow-[0_0_10px_rgba(197,160,89,0.5)]">🛡️</span>
                            <div>
                                <span className="text-[9px] uppercase tracking-[0.3em] text-[#c5a059]/60 font-bold block">Nível de Acesso Estrutural</span>
                                <h1 className="font-display text-2xl uppercase tracking-widest text-[#c5a059] font-bold">
                                    Casta: {activeCasteDetails.title}
                                </h1>
                            </div>
                        </div>
                        <p className="font-body text-xs md:text-sm italic text-stone-400">
                            "{activeCasteDetails.description}"
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                            {activeCasteDetails.perks.map((p, idx) => (
                                <span key={idx} className="bg-[#c5a059]/5 border border-[#c5a059]/20 text-stone-300 text-[8.5px] uppercase tracking-wider px-2 py-0.5 rounded font-mono font-bold">
                                    ✓ {p}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 text-right">
                        <div className="flex items-center gap-1.5 bg-black/75 px-3 py-1 rounded-full border border-stone-850 text-[8px] uppercase tracking-widest text-stone-400 font-bold font-mono">
                            <span className={`w-1.5 h-1.5 rounded-full ${dbSyncStatus === 'synced' ? 'bg-emerald-500 animate-pulse' : dbSyncStatus === 'syncing' ? 'bg-amber-500 animate-spin' : 'bg-stone-500'}`}></span>
                            {dbSyncStatus === 'synced' ? 'Atlas Sincronizado' : dbSyncStatus === 'syncing' ? 'Sincronizando...' : 'Atlas Local'}
                        </div>
                        <p className="text-[7.5px] text-stone-500 uppercase tracking-wider font-semibold">Casta atualizada automaticamente conforme seu amadurecimento existencial.</p>
                    </div>
                </header>

                {/* 2. LINHA DO TEMPO DOS CAPÍTULOS */}
                <section className="space-y-6 text-left">
                    <div className="flex justify-between items-end border-b border-[#c5a059]/25 pb-2">
                        <div>
                            <h2 className="font-display text-lg uppercase tracking-wider text-[#c5a059] font-bold">Atlas da Travessia</h2>
                            <p className="text-[9px] text-stone-400 font-body">Os quatro capítulos fundamentais do seu amadurecimento e campanha pessoal.</p>
                        </div>
                        <span className="text-[10px] font-mono text-[#c5a059]/60 font-bold">
                            Progresso: {unlockedRegions.length} / {CHAPTERS.length} Capítulos
                        </span>
                    </div>

                    {/* Timeline Path of Chapters */}
                    <div className="relative">
                        {/* Golden/stone connective line in desktop */}
                        <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-gradient-to-r from-[#c5a059]/40 via-stone-800 to-transparent -translate-y-1/2 hidden md:block z-0"></div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
                            {CHAPTERS.map((chapter, index) => {
                                const isUnlocked = unlockedRegions.includes(chapter.id);
                                const isCurrent = (index === 0 && !isBossDefeated("inercia")) ||
                                                  (index === 1 && isBossDefeated("inercia") && !isBossDefeated("desanimo")) ||
                                                  (index === 2 && isBossDefeated("desanimo") && !isBossDefeated("desorganizacao")) ||
                                                  (index === 3 && isBossDefeated("desorganizacao") && !isBossDefeated("descuido"));
                                
                                return (
                                    <button
                                        key={chapter.id}
                                        onClick={() => isUnlocked && setSelectedChapter(chapter)}
                                        disabled={!isUnlocked}
                                        className={`relative rounded-2xl border p-5 flex flex-col justify-between text-left transition-all duration-500 ${
                                            isUnlocked 
                                                ? isCurrent
                                                    ? "bg-[#1c1a24]/50 border-[#c5a059] shadow-[0_0_25px_rgba(197,160,89,0.25)] hover:shadow-[0_0_35px_rgba(197,160,89,0.4)] cursor-pointer group/chapter ring-1 ring-[#c5a059]/40"
                                                    : "bg-[#1c1a24]/30 border-[#c5a059]/40 hover:border-[#c5a059] cursor-pointer hover:shadow-[0_0_20px_rgba(197,160,89,0.15)] group/chapter"
                                                : "bg-[#0b0a0f]/80 border-stone-900 opacity-40 cursor-not-allowed select-none"
                                        }`}
                                    >
                                        {/* Chapter Label */}
                                        <div className="absolute -top-3 left-4 bg-[#0a0a0c] border border-[#c5a059]/40 text-[#c5a059] text-[7.5px] uppercase tracking-widest font-mono font-bold px-2 py-0.5 rounded-full">
                                            {chapter.number}
                                        </div>
                                        
                                        {isUnlocked ? (
                                            <>
                                                <div className="flex justify-between items-start mt-2 mb-4">
                                                    <span className="text-3.5xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] group-hover/chapter:scale-110 transition-transform">
                                                        {chapter.emoji}
                                                    </span>
                                                    <div className="flex flex-col items-end gap-1">
                                                        {isCurrent && (
                                                            <span className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[6px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded font-mono animate-pulse">
                                                                Foco Ativo
                                                            </span>
                                                        )}
                                                        <span className="bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#fde68a] text-[6.5px] uppercase font-bold px-1.5 py-0.5 rounded font-mono">
                                                            Ativo
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-1">
                                                    <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[#c5a059] group-hover/chapter:text-amber-300 transition-colors">
                                                        {chapter.name.replace(/Capítulo [I|V|X]+: /, '')}
                                                    </h3>
                                                    <p className="text-[8.5px] text-stone-400 font-bold uppercase tracking-wider">
                                                        Foco: {chapter.focus}
                                                    </p>
                                                    <p className="text-[8px] text-stone-500 line-clamp-2 leading-relaxed italic pt-1 border-t border-stone-850">
                                                        "{chapter.description}"
                                                    </p>
                                                </div>
                                                
                                                <div className="mt-4 pt-2 border-t border-stone-850 w-full flex justify-between items-center text-[7.5px] text-[#c5a059] font-mono font-bold uppercase">
                                                    <span>Ver Diário</span>
                                                    <span className="group-hover/chapter:translate-x-1 transition-transform">→</span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex justify-between items-start mt-2 mb-4">
                                                    <span className="text-3xl filter grayscale opacity-25">🔒</span>
                                                    <span className="bg-stone-900 border border-stone-800 text-stone-500 text-[6.5px] uppercase font-bold px-1.5 py-0.5 rounded font-mono">
                                                        Bloqueado
                                                    </span>
                                                </div>
                                                
                                                <div className="space-y-1.5">
                                                    <h3 className="font-display text-xs font-bold uppercase tracking-wider text-stone-600">
                                                        {chapter.name.replace(/Capítulo [I|V|X]+: /, '')}
                                                    </h3>
                                                    <div className="p-1.5 bg-black/40 border border-stone-850 rounded text-[7.5px] text-stone-500 font-bold uppercase tracking-wide leading-tight">
                                                        Requisito: {chapter.unlockCondition}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* Chapter details popup */}
                {selectedChapter && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in text-left">
                        <div className="glass-medieval w-full max-w-lg rounded-2xl p-6 md:p-8 border-2 border-[#c5a059]/65 bg-[#0e0d12] relative space-y-5 shadow-[0_20px_60px_rgba(0,0,0,0.9)] max-h-[90vh] overflow-y-auto">
                            <button onClick={() => setSelectedChapter(null)} className="absolute top-4 right-4 text-stone-500 hover:text-stone-300 cursor-pointer p-1">
                                <span className="material-icons text-base">close</span>
                            </button>
                            
                            <div className="flex items-center gap-4 border-b border-[#c5a059]/20 pb-4">
                                <span className="text-5xl drop-shadow-[0_4px_10px_rgba(197,160,89,0.3)]">{selectedChapter.emoji}</span>
                                <div>
                                    <span className="text-[7.5px] text-[#c5a059] uppercase tracking-[0.2em] font-mono font-bold">{selectedChapter.number}</span>
                                    <h3 className="font-display text-lg font-bold uppercase tracking-wider text-[#c5a059]">{selectedChapter.name}</h3>
                                    <p className="text-[8px] text-emerald-400 uppercase tracking-widest font-bold font-mono">Fase Existencial Conquistada</p>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <span className="text-[8.5px] uppercase tracking-wider font-bold text-[#c5a059]/60 block mb-1">Filosofia do Capítulo:</span>
                                    <p className="font-body text-xs leading-relaxed text-[#eee8dc]/90 italic bg-stone-900/40 p-3 rounded-lg border border-stone-850">
                                        "{selectedChapter.description}"
                                    </p>
                                </div>
                                
                                <div>
                                    <span className="text-[8.5px] uppercase tracking-wider font-bold text-[#c5a059]/60 block mb-1.5">Foco de Evolução:</span>
                                    <div className="text-xs text-stone-300 flex items-center gap-2 font-bold font-display uppercase tracking-wide">
                                        <span className="text-amber-400 text-sm">🎯</span>
                                        <span>{selectedChapter.focus}</span>
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <span className="text-[8.5px] uppercase tracking-wider font-bold text-[#c5a059] block">Marcos da Jornada (Desafios):</span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {selectedChapter.milestones.map((milestone, idx) => {
                                            let isMet = false;
                                            if (selectedChapter.id === "capitulo_1") {
                                                if (idx === 0) isMet = isBossDefeated("distracao");
                                                if (idx === 1) isMet = isBossDefeated("procrastinacao");
                                                if (idx === 2) isMet = isBossDefeated("autossabotagem");
                                                if (idx === 3) isMet = isBossDefeated("inercia");
                                            } else if (selectedChapter.id === "capitulo_2") {
                                                if (idx === 0) isMet = isBossDefeated("impulsividade");
                                                if (idx === 1) isMet = isBossDefeated("ansiedade");
                                                if (idx === 2) isMet = isBossDefeated("desanimo");
                                            } else if (selectedChapter.id === "capitulo_3") {
                                                if (idx === 0) isMet = isBossDefeated("escassez");
                                                if (idx === 1) isMet = isBossDefeated("consumismo");
                                                if (idx === 2) isMet = isBossDefeated("desorganizacao");
                                            } else if (selectedChapter.id === "capitulo_4") {
                                                if (idx === 0) isMet = isBossDefeated("sedentarismo");
                                                if (idx === 1) isMet = isBossDefeated("exaustao");
                                                if (idx === 2) isMet = isBossDefeated("descuido");
                                            }
                                            
                                            return (
                                                <div key={idx} className={`flex items-center gap-2.5 p-2 rounded-lg border text-[10px] ${
                                                    isMet 
                                                        ? "bg-emerald-950/15 border-emerald-900/40 text-emerald-300 font-bold" 
                                                        : "bg-black/40 border-stone-850 text-stone-400"
                                                }`}>
                                                    <span className={isMet ? "text-emerald-400" : "text-stone-600"}>
                                                        {isMet ? "✦" : "✧"}
                                                    </span>
                                                    <span>{milestone}</span>
                                                    {isMet && <span className="ml-auto text-[8px] uppercase px-1 py-0.2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded font-mono">Chancelado</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="pt-3 border-t border-stone-850 flex justify-end">
                                <button onClick={() => setSelectedChapter(null)} className="px-6 py-2 bg-[#c5a059]/10 hover:bg-[#c5a059]/20 border border-[#c5a059]/40 text-stone-200 rounded font-display text-[9.5px] uppercase tracking-wider transition-all cursor-pointer">Fechar Diário</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. CAMPAIGN DIARY: THEMATED QUEST & BOSS CONFRONT */}
                <section className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start text-left">
                    
                    {/* Thematic crossings list (8 columns) */}
                    <div className="md:col-span-8 space-y-4">
                        <div className="border-b border-[#c5a059]/25 pb-2">
                            <h2 className="font-display text-lg uppercase tracking-wider text-[#c5a059] font-bold">Diário de Campanhas</h2>
                            <p className="text-[9px] text-stone-400 font-body">Confronte os demônios existenciais e declare suas vitórias diárias para chancelar os capítulos.</p>
                        </div>

                        {/* Chapter Tabs Selectors */}
                        <div className="flex gap-2 border-b border-stone-900 pb-2 overflow-x-auto scrollbar-none">
                            {CHAPTERS.map((chap) => {
                                const isUnlocked = unlockedRegions.includes(chap.id);
                                if (!isUnlocked) return null;
                                
                                return (
                                    <button
                                        key={chap.id}
                                        onClick={() => setActiveCampaignChapterId(chap.id)}
                                        className={`px-3 py-1.5 border rounded-t-xl font-display text-[8.5px] uppercase tracking-wider transition-all cursor-pointer ${
                                            activeCampaignChapterId === chap.id
                                                ? "bg-[#1c1a24]/40 border-b-transparent border-[#c5a059] text-amber-300 font-bold"
                                                : "bg-transparent border-transparent text-stone-400 hover:text-stone-200"
                                        }`}
                                    >
                                        {chap.emoji} {chap.name.replace(/Capítulo [I|V|X]+: /, '')}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Active Chapter parchment panel */}
                        {(() => {
                            const currentChapterObj = CHAPTERS.find(c => c.id === activeCampaignChapterId) || CHAPTERS[0];
                            const chapterBosses = BOSSES.filter(b => b.chapterId === activeCampaignChapterId);
                            
                            return (
                                <div className="glass-medieval w-full rounded-2xl p-5 border border-[#c5a059]/20 bg-black/40 text-left space-y-5">
                                    <div className="flex justify-between items-center border-b border-[#c5a059]/10 pb-3">
                                        <div>
                                            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-amber-200">
                                                {currentChapterObj.name}
                                            </h3>
                                            <p className="text-[8px] text-stone-400 font-bold uppercase tracking-wider mt-0.5">
                                                Meta existencial: {currentChapterObj.focus}
                                            </p>
                                        </div>
                                        <span className="bg-[#c5a059]/10 border border-[#c5a059]/25 text-[#fde68a] text-[7.5px] uppercase tracking-wider px-2 py-0.5 rounded font-mono font-bold">
                                            CONQUISTANDO
                                        </span>
                                    </div>

                                    <p className="font-body text-xs leading-relaxed text-stone-300 italic">
                                        "{currentChapterObj.description}"
                                    </p>

                                    {/* Bosses linear road map */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 select-none">
                                        {chapterBosses.map((boss) => {
                                            const defeated = isBossDefeated(boss.id);
                                            const isFinalBoss = boss.id.endsWith("inercia") || boss.id.endsWith("desanimo") || boss.id.endsWith("desorganizacao") || boss.id.endsWith("descuido");
                                            
                                            return (
                                                <div key={boss.id} className={`p-3 border rounded-xl flex flex-col justify-between text-left transition-all ${
                                                    defeated 
                                                        ? "bg-emerald-950/10 border-emerald-800/40 text-stone-400 opacity-70 shadow-inner" 
                                                        : isFinalBoss
                                                            ? "bg-black/60 border-amber-500/35 shadow-[0_0_15px_rgba(245,158,11,0.06)] ring-1 ring-amber-500/20"
                                                            : "bg-black/45 border-stone-850"
                                                }`}>
                                                    <div>
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className={`font-display text-[9.5px] font-bold uppercase tracking-wider ${isFinalBoss && !defeated ? "text-amber-300" : "text-[#eae3d5]"}`}>
                                                                {boss.name}
                                                            </span>
                                                            {defeated ? (
                                                                <span className="text-emerald-400 text-xs font-bold">✓</span>
                                                            ) : (
                                                                <span className={`text-[6.5px] font-bold uppercase px-1 py-0.2 rounded font-mono ${isFinalBoss ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-stone-900 text-stone-500"}`}>
                                                                    {isFinalBoss ? "Capítulo" : "Desafio"}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[8px] text-stone-500 line-clamp-3 leading-relaxed mb-3">{boss.description}</p>
                                                    </div>
                                                    {!defeated ? (
                                                        <button
                                                            onClick={() => handleConfrontBoss(boss)}
                                                            className={`w-full py-1.5 rounded font-display text-[7.5px] uppercase tracking-widest transition-all cursor-pointer ${
                                                                isFinalBoss 
                                                                    ? "bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200" 
                                                                    : "bg-[#c5a059]/10 hover:bg-[#c5a059]/20 border border-[#c5a059]/40 text-stone-200"
                                                            }`}
                                                        >
                                                            ⚔️ Confrontar
                                                        </button>
                                                    ) : (
                                                        <span className="text-[7.5px] font-mono text-emerald-400 font-bold uppercase tracking-wider block text-center border border-emerald-850/50 py-0.5 rounded bg-emerald-950/20">
                                                            Superado
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Completed Crossing Seal scroll */}
                        {isSealingCompleted && (
                            <div className="glass-medieval w-full rounded-2xl p-6 border-2 border-dashed border-[#c5a059] bg-[#121118]/80 text-left space-y-4 animate-scale-up relative">
                                <div className="absolute top-3 right-3 text-stone-500 hover:text-stone-300 cursor-pointer" onClick={() => setIsSealingCompleted(false)}>
                                    <span className="material-icons text-base">close</span>
                                </div>
                                <div className="text-center space-y-1">
                                    <span className="text-4xl block">📜</span>
                                    <h4 className="font-display text-sm font-bold uppercase tracking-widest text-[#c5a059]">Selo de Expedição Concluída</h4>
                                    <p className="text-[7.5px] uppercase tracking-widest text-stone-500 font-bold font-mono">Nemosine Nous Codex</p>
                                </div>

                                <div className="h-px bg-gradient-to-r from-transparent via-[#c5a059]/30 to-transparent my-3" />

                                <p className="font-body text-xs text-center text-stone-300 italic max-w-md mx-auto">
                                    {currentSealingChapter === "capitulo_1" && '"Por meio deste pergaminho de expedição concluída, declara-se que o Peregrino confrontou com lucidez e coragem todos os demônios da inércia interna, conquistando passagem livre para o Capítulo II: O Domínio das Emoções."'}
                                    {currentSealingChapter === "capitulo_2" && '"Por meio deste pergaminho de expedição concluída, declara-se que o peregrino obteve equilíbrio interno frente às marés de suas paixões e impulsos, conquistando acesso e soberania para o Capítulo III: Governança de Recursos."'}
                                    {currentSealingChapter === "capitulo_3" && '"Por meio deste pergaminho de expedição concluída, chancelamos a capacidade do peregrino de ordenar seu reino material com responsabilidade e pragmatismo, abrindo passagem para o Capítulo IV: Templo da Vitalidade."'}
                                    {currentSealingChapter === "capitulo_4" && '"Por meio deste pergaminho imperial, declara-se a vitória absoluta do Soberano sobre todas as inércias e letargias. Seu templo físico e mental encontra-se integrado e chancelado em sabedoria plena."'}
                                </p>

                                <div className="space-y-1.5 text-[9.5px] text-stone-400 font-mono max-w-sm mx-auto bg-black/40 p-3 rounded-lg border border-stone-850 mt-4">
                                    <div className="flex justify-between border-b border-stone-900 pb-0.5">
                                        <span>Expedição Chancelada:</span>
                                        <span className="font-bold text-[#c5a059]">
                                            {(() => {
                                                const chap = CHAPTERS.find(c => c.id === currentSealingChapter);
                                                return chap ? chap.name : "Conclusão de Capítulo";
                                            })()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-b border-stone-900 pb-0.5">
                                        <span>Capítulos Conquistados:</span>
                                        <span className="font-bold">{unlockedRegions.length} / {CHAPTERS.length} Conquistados</span>
                                    </div>
                                    <div className="flex justify-between border-b border-stone-900 pb-0.5">
                                        <span>Relíquias de Campanha:</span>
                                        <span className="font-bold">{relics.length} Artefatos</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Chancela de Acesso:</span>
                                        <span className="font-bold text-[#c5a059]">{currentCaste}</span>
                                    </div>
                                </div>

                                <div className="pt-3 text-center">
                                    <span className="text-2xl opacity-40 select-none block mb-1">⚜️</span>
                                    <p className="text-[7px] uppercase tracking-widest text-stone-500">Chancela Imperial de Nous</p>
                                </div>
                            </div>
                        )}

                        {/* Defeated logs list */}
                        {bossLogs.length > 0 && (
                            <div className="space-y-2.5">
                                <span className="text-[10px] uppercase font-bold text-[#c5a059] block">Diário de Vitórias e Aprendizados ({bossLogs.length})</span>
                                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                    {bossLogs.map((log) => {
                                        const boss = BOSSES.find(b => b.id === log.bossId);
                                        return (
                                            <div key={log.id} className="p-3 border border-[#c5a059]/15 bg-[#1c1a24]/10 rounded-xl space-y-1.5 text-left">
                                                <div className="flex justify-between items-center text-[10px]">
                                                    <span className="font-display font-bold uppercase tracking-wider text-[#c5a059]">Vitória: {boss?.name || log.bossId}</span>
                                                    <span className="text-stone-500 font-mono text-[8px]">{log.date}</span>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[9px] leading-relaxed text-stone-400">
                                                    <div>
                                                        <span className="font-bold uppercase text-[7.5px] text-[#c5a059]/60 block mb-0.5">O Obstáculo:</span>
                                                        <p className="italic">"{log.context}"</p>
                                                    </div>
                                                    <div>
                                                        <span className="font-bold uppercase text-[7.5px] text-[#c5a059]/60 block mb-0.5">A Estratégia:</span>
                                                        <p className="italic">"{log.strategy}"</p>
                                                    </div>
                                                    <div>
                                                        <span className="font-bold uppercase text-[7.5px] text-[#c5a059]/60 block mb-0.5">O Resultado Existencial:</span>
                                                        <p className="italic text-emerald-300">"{log.outcome}"</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Relics Column (4 columns) */}
                    <div className="md:col-span-4 space-y-4">
                        <div className="border-b border-[#c5a059]/25 pb-2">
                            <h2 className="font-display text-lg uppercase tracking-wider text-[#c5a059] font-bold">Relíquias Conquistadas</h2>
                            <p className="text-[9px] text-stone-400 font-body">Artefatos que atestam marcos de vitórias internas e transformações concretas.</p>
                        </div>

                        {/* Relics list */}
                        <div className="space-y-3">
                            {relics.length === 0 ? (
                                <div className="p-6 border border-stone-900 bg-[#07070a]/40 rounded-2xl text-center">
                                    <span className="text-4xl block mb-2 opacity-35">🏆</span>
                                    <p className="text-[10px] text-stone-500 italic">Nenhum artefato existencial obtido ainda nesta campanha. Confronte e vença um desafio para ganhar uma relíquia.</p>
                                </div>
                            ) : (
                                relics.map((relic) => (
                                    <div key={relic.id} className="p-3 border border-[#c5a059]/25 bg-[#1c1a24]/30 rounded-xl space-y-2 text-left relative overflow-hidden shadow-md">
                                        <div className="absolute inset-0 bg-gradient-to-br from-[#c5a059]/5 via-transparent to-transparent pointer-events-none" />
                                        <div className="flex justify-between items-start">
                                            <span className="font-display text-xs font-bold text-amber-200">{relic.name}</span>
                                            <span className="text-[7.5px] text-stone-500 font-mono">{relic.dateObtained}</span>
                                        </div>
                                        <p className="text-[9px] leading-relaxed text-stone-400 italic">"{relic.description}"</p>
                                        <span className="text-[7.5px] uppercase font-bold text-[#c5a059]/75 block pt-1 border-t border-stone-900/60">{relic.origin}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </section>

                {/* Confront popup */}
                {confrontingBoss && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in text-left">
                        <form onSubmit={handleResolveConfront} className="glass-medieval w-full max-w-md rounded-2xl p-6 border-2 border-[#c5a059]/65 bg-[#0e0d12] relative space-y-4">
                            <button type="button" onClick={() => setConfrontingBoss(null)} className="absolute top-3 right-3 text-stone-500 hover:text-stone-300 cursor-pointer">
                                <span className="material-icons text-base">close</span>
                            </button>
                            <div className="flex items-center gap-3 border-b border-[#c5a059]/20 pb-3">
                                <span className="text-3xl">⚔️</span>
                                <div>
                                    <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#c5a059]">Confrontando: {confrontingBoss.name}</h3>
                                    <p className="text-[7.5px] text-stone-500 uppercase tracking-widest font-bold font-mono">Confronto de Consciência Real</p>
                                </div>
                            </div>
                            
                            <p className="text-[9px] text-stone-400 leading-relaxed italic">
                                "Registre a batalha travada hoje. Ao declarar o contexto de superação real, você conquistará a relíquia associada a esta vitória no seu diário de jornada."
                            </p>

                            <div className="space-y-3 text-xs">
                                <div>
                                    <label className="text-[8px] text-[#c5a059] uppercase font-bold block mb-1">Como esse obstáculo existencial se apresentou na prática?</label>
                                    <textarea 
                                        rows={2} 
                                        placeholder="Ex: Fiquei procrastinando ao invés de iniciar o relatório, enrolando com distrações no celular..." 
                                        value={battleContext}
                                        onChange={(e) => setBattleContext(e.target.value)}
                                        className="w-full bg-[#121118] border border-[#c5a059]/30 rounded p-2 text-xs text-stone-200 focus:outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[8px] text-[#c5a059] uppercase font-bold block mb-1">Qual estratégia consciente você utilizou para superá-lo?</label>
                                    <textarea 
                                        rows={2} 
                                        placeholder="Ex: Apliquei a regra dos 5 segundos, silenciei as notificações e comecei pequeno por apenas 10 minutos..." 
                                        value={battleStrategy}
                                        onChange={(e) => setBattleStrategy(e.target.value)}
                                        className="w-full bg-[#121118] border border-[#c5a059]/30 rounded p-2 text-xs text-stone-200 focus:outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[8px] text-[#c5a059] uppercase font-bold block mb-1">Qual foi o resultado ou aprendizado dessa vitória?</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ex: Consegui focar por 1 hora e finalizei a maior parte da tarefa com clareza." 
                                        value={battleOutcome}
                                        onChange={(e) => setBattleOutcome(e.target.value)}
                                        className="w-full bg-[#121118] border border-[#c5a059]/30 rounded px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="pt-2 flex gap-2">
                                <button type="button" onClick={() => setConfrontingBoss(null)} className="flex-1 py-1.5 bg-black/60 border border-stone-850 hover:border-stone-700 text-stone-300 rounded font-display text-[9px] uppercase tracking-wider transition-all cursor-pointer">Recuar</button>
                                <button type="submit" className="flex-1 py-1.5 bg-[#c5a059]/15 hover:bg-[#c5a059]/25 border border-[#c5a059]/40 text-[#fde68a] rounded font-display text-[9px] uppercase tracking-wider transition-all cursor-pointer">Registrar Vitória ⚔️</button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Footnotes navigation back to domains */}
                <div className="pt-4 flex justify-center">
                    <MedievalButton onClick={() => router.push("/space/dominios")} variant="secondary" className="text-[10px] py-3 px-12 tracking-widest uppercase">
                        ← Retornar aos Domínios
                    </MedievalButton>
                </div>
            </div>

            <InstitutionalFooter />
        </main>
    );
}
