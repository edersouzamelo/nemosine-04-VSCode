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
        perks: ["8 Personas Fundamentais", "Mapa de Travessia Básico", "Diário de Campanha"]
    },
    {
        id: "Vassalo",
        title: "Vassalo",
        description: "Reconhecimento de fidelidade ao Codex. O círculo de influência se expande.",
        perks: ["24 Personas Ativas", "Novos Domínios Desbloqueados", "Acesso ao Claustro"]
    },
    {
        id: "Regente",
        title: "Regente",
        description: "Guardião da ordem interna. Governa com sabedoria pragmática.",
        perks: ["56 Personas Ativas", "Acesso total aos Domínios", "Tribunal Desbloqueado"]
    },
    {
        id: "Soberano",
        title: "Soberano",
        description: "Integração completa da consciência. O metasistema está sob domínio pleno.",
        perks: ["Todas as 56 Personas", "Lugares da Mente Livres", "Estruturas Avançadas de Nous"]
    }
];

// Castle Regions
interface RegionDetails {
    id: string;
    name: string;
    emoji: string;
    description: string;
    unlockCondition: string;
    secrets: string[];
}

const REGIONS: RegionDetails[] = [
    {
        id: "biblioteca",
        name: "Biblioteca",
        emoji: "📖",
        description: "O santuário do conhecimento arquivado, onde as vozes dos sábios e filósofos ecoam no silêncio.",
        unlockCondition: "Descoberto por padrão.",
        secrets: ["Manuscritos do Codex", "Registros das 56 Personas", "Mapa das Regiões"]
    },
    {
        id: "claustro",
        name: "Claustro",
        emoji: "🕊️",
        description: "Um espaço de calmaria e introspecção, isolado do barulho externo para reflexão profunda.",
        unlockCondition: "Derrote o obstáculo da 'Distração'.",
        secrets: ["Fontes de Água Pura", "Diário do Silêncio", "Reflexões Ocultas"]
    },
    {
        id: "tribunal",
        name: "Tribunal",
        emoji: "⚖️",
        description: "A câmara da balança e da autoavaliação, onde a luz e a sombra confrontam-se de forma justa.",
        unlockCondition: "Derrote o obstáculo da 'Autossabotagem'.",
        secrets: ["Balança da Consciência", "Julgamento da Sombra", "Leis da Mente"]
    },
    {
        id: "jardim",
        name: "Jardim",
        emoji: "🌿",
        description: "O território fértil das ideias criativas, onde floresce a imaginação inspiradora.",
        unlockCondition: "Derrote o obstáculo da 'Procrastinação'.",
        secrets: ["Flores do Insights", "Caminho da Inspiração", "Árvore do Metasistema"]
    },
    {
        id: "observatorio",
        name: "Observatório",
        emoji: "🔭",
        description: "A torre mais alta dedicada a olhar para o amanhã, alinhando objetivos aos astros intelectuais.",
        unlockCondition: "Derrote o boss final 'Inércia' na Travessia da Disciplina.",
        secrets: ["Lentes do Futuro", "Mapa do Amanhã", "Alinhamento de Nous"]
    },
    {
        id: "portal",
        name: "Portal",
        emoji: "🧭",
        description: "A conexão mística com os demais metasistemas e domínios integrados do Sovereign.",
        unlockCondition: "Desbloqueado ao atingir a casta de 'Regente'.",
        secrets: ["Conexão do Sovereign", "Sinal do Arauto", "Chave Dimensional"]
    },
    {
        id: "mosteiro",
        name: "Mosteiro",
        emoji: "⛪",
        description: "O refúgio de disciplina severa e devoção integral aos hábitos construtivos e sãos.",
        unlockCondition: "Acumule 3 relíquias narrativas de campanha.",
        secrets: ["Regras do Hábito", "Solenidade Diária", "Diário da Constância"]
    },
    {
        id: "sala_trono",
        name: "Sala do Trono",
        emoji: "👑",
        description: "O ápice do amadurecimento, onde o eu integrado assume o comando absoluto da própria jornada.",
        unlockCondition: "Desbloqueado ao atingir a casta de 'Soberano'.",
        secrets: ["Cetro do Comando", "Coroa de Ouro", "Livro dos Reis da Mente"]
    }
];

// Crossing Bosses
interface BossDetails {
    id: string;
    name: string;
    description: string;
    relicName: string;
    relicDescription: string;
    unlockRegionId: string;
}

const BOSSES: BossDetails[] = [
    {
        id: "distracao",
        name: "Distração",
        description: "O ruído constante de notificações, abas abertas e pequenos prazeres fugazes que roubam a sua presença.",
        relicName: "Relíquia do Foco 🔮",
        relicDescription: "Obtida ao silenciar o ruído externo e forjar clareza de presença.",
        unlockRegionId: "claustro"
    },
    {
        id: "procrastinacao",
        name: "Procrastinação",
        description: "O adiar solene de compromissos sob o pretexto de 'esperar o momento ideal', alimentando a culpa silenciosa.",
        relicName: "Relíquia da Ação ⚔️",
        relicDescription: "Obtida ao quebrar a inação e realizar o primeiro passo com decisão imediata.",
        unlockRegionId: "jardim"
    },
    {
        id: "autossabotagem",
        name: "Autossabotagem",
        description: "A voz interna que sussurra que você não é digno ou capaz, sussurrando barreiras invisíveis antes do início.",
        relicName: "Relíquia da Vigilância 🛡️",
        relicDescription: "Obtida ao desarmar o medo subjetivo através da auto-observação atenta.",
        unlockRegionId: "tribunal"
    },
    {
        id: "inercia",
        name: "Inércia (Boss Final)",
        description: "A força oculta que atrai sua mente de volta à estagnação, testando sua resiliência após alguns dias de constância.",
        relicName: "Relíquia da Constância 🏅",
        relicDescription: "Obtida ao derrotar a estagnação e provar consistência inabalável no Castelo.",
        unlockRegionId: "observatorio"
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
    const [unlockedRegions, setUnlockedRegions] = useState<string[]>(["biblioteca"]);
    const [relics, setRelics] = useState<UserRelic[]>([]);
    const [bossLogs, setBossLogs] = useState<BossLog[]>([]);

    // UI state indicators
    const [selectedRegion, setSelectedRegion] = useState<RegionDetails | null>(null);
    const [confrontingBoss, setConfrontingBoss] = useState<BossDetails | null>(null);
    const [isSealingCompleted, setIsSealingCompleted] = useState(false);

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
                setUnlockedRegions(data.unlockedRegions.length > 0 ? data.unlockedRegions : ["biblioteca"]);
                setRelics(data.relics || []);
                setBossLogs(data.bossLogs || []);
                setDbSyncStatus("synced");
            } catch {
                console.log("Travessia offline/unauthenticated fallback to LocalStorage.");
                // Local fallback
                setCurrentCaste(localStorage.getItem("sovereign_caste") || "Peregrino");
                setUnlockedRegions(JSON.parse(localStorage.getItem("sovereign_unlocked_regions") || '["biblioteca"]'));
                setRelics(JSON.parse(localStorage.getItem("sovereign_relics") || "[]"));
                setBossLogs(JSON.parse(localStorage.getItem("sovereign_boss_logs") || "[]"));
                setDbSyncStatus("offline");
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

    const saveBossDefeatLocal = async (log: BossLog, relic: UserRelic, nextCaste?: string) => {
        const updatedLogs = [...bossLogs, log];
        const updatedRelics = [...relics, relic];

        setBossLogs(updatedLogs);
        setRelics(updatedRelics);

        // Auto unlock corresponding region
        const correspondingBoss = BOSSES.find(b => b.id === log.bossId);
        if (correspondingBoss) {
            saveUnlockedRegionLocal(correspondingBoss.unlockRegionId);
        }

        // Automatic Caste progress checks
        let updatedCaste = currentCaste;
        if (updatedRelics.length === 1 && currentCaste === "Peregrino") {
            updatedCaste = "Vassalo";
            saveCasteLocal("Vassalo");
        } else if (updatedRelics.length === 3 && (currentCaste === "Vassalo" || currentCaste === "Peregrino")) {
            updatedCaste = "Regente";
            saveCasteLocal("Regente");
            saveUnlockedRegionLocal("portal");
        } else if (updatedRelics.length === 4) {
            updatedCaste = "Soberano";
            saveCasteLocal("Soberano");
            saveUnlockedRegionLocal("sala_trono");
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
        const newLog: BossLog = {
            id: logId,
            crossingId: "Disciplina",
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
            origin: `Superação do Obstáculo: ${confrontingBoss.name}`,
            dateObtained: dateStr
        };

        saveBossDefeatLocal(newLog, newRelic);
        setConfrontingBoss(null);

        // If final boss was defeated, trigger seal ceremony
        if (confrontingBoss.id === "inercia") {
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
                <div className="absolute inset-0 bg-black/80 z-10 backdrop-blur-[1px]"></div>
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
                        <p className="text-[7.5px] text-stone-500 uppercase tracking-wider font-semibold">Casta atualizada automaticamente conforme suas relíquias acumuladas.</p>
                    </div>
                </header>

                {/* 2. MAP OF THE CROSSING (EXPLO-ATLAS) */}
                <section className="space-y-4 text-left">
                    <div className="flex justify-between items-end border-b border-[#c5a059]/25 pb-2">
                        <div>
                            <h2 className="font-display text-lg uppercase tracking-wider text-[#c5a059] font-bold">Atlas do Castelo</h2>
                            <p className="text-[9px] text-stone-400 font-body">Regiões descobertas pela sua campanha de autoconsciência.</p>
                        </div>
                        <span className="text-[10px] font-mono text-[#c5a059]/60 font-bold">
                            Explorado: {unlockedRegions.length} / {REGIONS.length} Regiões
                        </span>
                    </div>

                    {/* Regional Map Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {REGIONS.map((region) => {
                            const isUnlocked = unlockedRegions.includes(region.id);
                            return (
                                <button
                                    key={region.id}
                                    onClick={() => isUnlocked && setSelectedRegion(region)}
                                    disabled={!isUnlocked}
                                    className={`relative rounded-2xl border p-4 flex flex-col justify-between text-left transition-all duration-500 ${isUnlocked ? "bg-[#1c1a24]/30 border-[#c5a059]/40 hover:border-[#c5a059] cursor-pointer hover:shadow-[0_0_20px_rgba(197,160,89,0.1)] group/region" : "bg-black/60 border-stone-900 opacity-40 cursor-not-allowed select-none"}`}
                                >
                                    {isUnlocked ? (
                                        <>
                                            <div className="flex justify-between items-start mb-4">
                                                <span className="text-3xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] group-hover/region:scale-110 transition-transform">{region.emoji}</span>
                                                <span className="bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#fde68a] text-[6.5px] uppercase font-bold px-1.5 py-0.5 rounded font-mono">LIVRE</span>
                                            </div>
                                            <div>
                                                <h3 className="font-display text-[10px] font-bold uppercase tracking-wider text-[#c5a059] mb-1">{region.name}</h3>
                                                <p className="text-[8px] text-stone-400 line-clamp-2 leading-relaxed">{region.description}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex justify-between items-start mb-4">
                                                <span className="text-3xl filter grayscale opacity-25">🔒</span>
                                                <span className="bg-stone-900 border border-stone-800 text-stone-500 text-[6.5px] uppercase font-bold px-1.5 py-0.5 rounded font-mono">BLOQUEADO</span>
                                            </div>
                                            <div>
                                                <h3 className="font-display text-[10px] font-bold uppercase tracking-wider text-stone-600 mb-1">{region.name}</h3>
                                                <p className="text-[8px] text-stone-600 font-bold uppercase tracking-wide leading-tight">Requisito: {region.unlockCondition}</p>
                                            </div>
                                        </>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Region details popup */}
                {selectedRegion && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in text-left">
                        <div className="glass-medieval w-full max-w-md rounded-2xl p-6 border-2 border-[#c5a059]/65 bg-black/95 relative space-y-4">
                            <button onClick={() => setSelectedRegion(null)} className="absolute top-3 right-3 text-stone-500 hover:text-stone-300 cursor-pointer">
                                <span className="material-icons text-base">close</span>
                            </button>
                            <div className="flex items-center gap-3 border-b border-[#c5a059]/20 pb-3">
                                <span className="text-4xl">{selectedRegion.emoji}</span>
                                <div>
                                    <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#c5a059]">{selectedRegion.name}</h3>
                                    <p className="text-[7.5px] text-[#c5a059]/60 uppercase tracking-widest font-bold">Descoberta em sua Campanha</p>
                                </div>
                            </div>
                            <p className="font-body text-xs leading-relaxed text-[#eee8dc]/90 italic">
                                "{selectedRegion.description}"
                            </p>
                            <div className="space-y-2">
                                <span className="text-[8.5px] uppercase tracking-wider font-bold text-[#c5a059] block">Segredos Arquivados nesta Câmara:</span>
                                <div className="space-y-1">
                                    {selectedRegion.secrets.map((s, idx) => (
                                        <div key={idx} className="flex gap-2 items-center text-[10px] text-stone-400">
                                            <span className="text-[#c5a059]">❖</span>
                                            <span>{s}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="pt-2 flex justify-end">
                                <button onClick={() => setSelectedRegion(null)} className="px-5 py-1 bg-[#c5a059]/10 hover:bg-[#c5a059]/20 border border-[#c5a059]/40 text-stone-200 rounded font-display text-[9px] uppercase tracking-wider cursor-pointer">Fechar Pergaminho</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. CAMPAIGN DIARY: THEMATED QUEST & BOSS CONFRONT */}
                <section className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start text-left">
                    
                    {/* Thematic crossings list (9 columns) */}
                    <div className="md:col-span-8 space-y-4">
                        <div className="border-b border-[#c5a059]/25 pb-2">
                            <h2 className="font-display text-lg uppercase tracking-wider text-[#c5a059] font-bold">Campanha Temática</h2>
                            <p className="text-[9px] text-stone-400 font-body">Confronte os demônios e inércias de sua jornada mental cotidiana.</p>
                        </div>

                        {/* Travessia da Disciplina parchment panel */}
                        <div className="glass-medieval w-full rounded-2xl p-5 border border-[#c5a059]/20 bg-black/40 text-left space-y-5">
                            <div className="flex justify-between items-center border-b border-[#c5a059]/10 pb-3">
                                <div>
                                    <h3 className="font-display text-sm font-bold uppercase tracking-wider text-amber-200">Travessia da Disciplina</h3>
                                    <p className="text-[8px] text-stone-400 font-bold uppercase tracking-wider mt-0.5">Metasistema: Foco e Consistência</p>
                                </div>
                                <span className="bg-[#c5a059]/10 border border-[#c5a059]/25 text-[#fde68a] text-[7.5px] uppercase tracking-wider px-2 py-0.5 rounded font-mono font-bold">ATIVO</span>
                            </div>

                            <p className="font-body text-xs leading-relaxed text-stone-300">
                                Esta travessia mapeia os principais fantasmas internos que boicotam sua consistência. Superar cada obstáculo exige um registro consciente de batalha e ação real no mundo físico.
                            </p>

                            {/* Bosses linear road map */}
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 select-none">
                                {BOSSES.map((boss) => {
                                    const defeated = isBossDefeated(boss.id);
                                    return (
                                        <div key={boss.id} className={`p-3 border rounded-xl flex flex-col justify-between text-left transition-all ${defeated ? "bg-emerald-950/10 border-emerald-800/40 text-stone-400 opacity-70" : "bg-black/45 border-stone-850"}`}>
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="font-display text-[9.5px] font-bold uppercase tracking-wider text-[#eae3d5]">{boss.name}</span>
                                                    {defeated ? (
                                                        <span className="text-emerald-400 text-xs">✓</span>
                                                    ) : (
                                                        <span className="text-amber-500/60 text-[8px] font-bold">PENDENTE</span>
                                                    )}
                                                </div>
                                                <p className="text-[8px] text-stone-500 line-clamp-3 leading-relaxed mb-3">{boss.description}</p>
                                            </div>
                                            {!defeated ? (
                                                <button
                                                    onClick={() => handleConfrontBoss(boss)}
                                                    className="w-full py-1 bg-[#c5a059]/10 hover:bg-[#c5a059]/20 border border-[#c5a059]/40 text-stone-200 rounded font-display text-[7.5px] uppercase tracking-widest transition-all cursor-pointer"
                                                >
                                                    ⚔️ Confrontar
                                                </button>
                                            ) : (
                                                <span className="text-[7.5px] font-mono text-emerald-400 font-bold uppercase tracking-wider block text-center border border-emerald-850/50 py-0.5 rounded bg-emerald-950/20">Superado</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

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
                                    "Por meio deste pergaminho de expedição concluída, declara-se que o Peregrino confrontou com lucidez e coragem todos os demônios da inércia interna, conquistando passagem livre para os observatórios superiores da mente."
                                </p>

                                <div className="space-y-1.5 text-[9.5px] text-stone-400 font-mono max-w-sm mx-auto bg-black/40 p-3 rounded-lg border border-stone-850 mt-4">
                                    <div className="flex justify-between border-b border-stone-900 pb-0.5">
                                        <span>Expedição:</span>
                                        <span className="font-bold text-[#c5a059]">Travessia da Disciplina</span>
                                    </div>
                                    <div className="flex justify-between border-b border-stone-900 pb-0.5">
                                        <span>Obstáculos Superados:</span>
                                        <span className="font-bold">4 (Distração, Procrastinação, Autossabotagem, Inércia)</span>
                                    </div>
                                    <div className="flex justify-between border-b border-stone-900 pb-0.5">
                                        <span>Relíquias Concedidas:</span>
                                        <span className="font-bold">Foco, Ação, Vigilância, Constância</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Data da Chancela:</span>
                                        <span className="font-bold text-[#c5a059]">{new Date().toLocaleDateString()}</span>
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
                                <span className="text-[10px] uppercase font-bold text-[#c5a059] block">Diário de Confrontos e Estratégias ({bossLogs.length})</span>
                                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                    {bossLogs.map((log) => {
                                        const boss = BOSSES.find(b => b.id === log.bossId);
                                        return (
                                            <div key={log.id} className="p-3 border border-[#c5a059]/15 bg-[#1c1a24]/10 rounded-xl space-y-1.5 text-left">
                                                <div className="flex justify-between items-center text-[10px]">
                                                    <span className="font-display font-bold uppercase tracking-wider text-[#c5a059]">Confronto: {boss?.name || log.bossId}</span>
                                                    <span className="text-stone-500 font-mono">{log.date}</span>
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
                                                        <span className="font-bold uppercase text-[7.5px] text-[#c5a059]/60 block mb-0.5">O Resultado:</span>
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
                            <h2 className="font-display text-lg uppercase tracking-wider text-[#c5a059] font-bold">Relíquias Adquiridas</h2>
                            <p className="text-[9px] text-stone-400 font-body">Artefatos que representam marcos de transformações reais.</p>
                        </div>

                        {/* Relics list */}
                        <div className="space-y-3">
                            {relics.length === 0 ? (
                                <div className="p-6 border border-stone-900 bg-[#07070a]/40 rounded-2xl text-center">
                                    <span className="text-4xl block mb-2 opacity-35">🏆</span>
                                    <p className="text-[10px] text-stone-500 italic">Nenhum artefato obtido ainda nesta campanha. Confronte seu primeiro obstáculo para ganhar uma relíquia.</p>
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
                        <form onSubmit={handleResolveConfront} className="glass-medieval w-full max-w-md rounded-2xl p-6 border-2 border-[#c5a059]/65 bg-black/95 relative space-y-4">
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
                                "Registre a batalha travada hoje. Ao declarar o contexto de superação real, você ganhará o artefato narrative associado a esta vitória."
                            </p>

                            <div className="space-y-3 text-xs">
                                <div>
                                    <label className="text-[8px] text-[#c5a059] uppercase font-bold block mb-1">Como esse obstáculo se apresentou?</label>
                                    <textarea 
                                        rows={2} 
                                        placeholder="Ex: Fiquei procrastinando ao invés de iniciar o relatório, enrolando com cafezinhos..." 
                                        value={battleContext}
                                        onChange={(e) => setBattleContext(e.target.value)}
                                        className="w-full bg-[#121118] border border-[#c5a059]/30 rounded p-2 text-xs text-stone-200 focus:outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[8px] text-[#c5a059] uppercase font-bold block mb-1">Qual estratégia você usou para superá-lo?</label>
                                    <textarea 
                                        rows={2} 
                                        placeholder="Ex: Apliquei a regra dos 5 segundos, fechei o celular em outra sala e iniciei apenas 5 minutos..." 
                                        value={battleStrategy}
                                        onChange={(e) => setBattleStrategy(e.target.value)}
                                        className="w-full bg-[#121118] border border-[#c5a059]/30 rounded p-2 text-xs text-stone-200 focus:outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[8px] text-[#c5a059] uppercase font-bold block mb-1">Qual foi o resultado prático?</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ex: Consegui focar por 1 hora líquida e terminei a maior parte do relatório." 
                                        value={battleOutcome}
                                        onChange={(e) => setBattleOutcome(e.target.value)}
                                        className="w-full bg-[#121118] border border-[#c5a059]/30 rounded px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="pt-2 flex gap-2">
                                <button type="button" onClick={() => setConfrontingBoss(null)} className="flex-1 py-1.5 bg-black/60 border border-stone-850 hover:border-stone-700 text-stone-300 rounded font-display text-[9px] uppercase tracking-wider transition-all cursor-pointer">Desistir</button>
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
