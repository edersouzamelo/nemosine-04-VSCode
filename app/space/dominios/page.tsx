"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
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

// Interfaces for our interactive apps
interface AgendaEvent {
    id: string;
    title: string;
    date: string;
    type: string; // 'Solenidade' | 'Compromisso' | 'Lembrete'
    note?: string | null;
    completed: boolean;
}

interface GymMeasure {
    id: string;
    date: string;
    weight: number;
    chest?: number | null;
    biceps?: number | null;
    waist?: number | null;
    hips?: number | null;
}

interface GymWorkout {
    id: string;
    date: string;
    title: string;
    exercises: string; // JSON string
}

interface FinancialTransaction {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: string; // 'income' | 'expense'
    category: string;
}

interface MedicalDocument {
    id: string;
    date: string;
    filename: string;
    textContent: string;
    aiAnalysis?: string | null;
}

export default function DominiosHubPage() {
    const { t, language } = useLanguage();
    const router = useRouter();
    const [selectedApp, setSelectedApp] = useState<string | null>(null);
    const [loadingApp, setLoadingApp] = useState<boolean>(false);
    const [loadingTextIndex, setLoadingTextIndex] = useState(0);
    const [simulatedTime, setSimulatedTime] = useState("20:00");
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const [showMenu, setShowMenu] = useState<boolean>(false);
    const [deviceType, setDeviceType] = useState<"phone" | "tablet" | "desktop">("desktop");

    // ── Drag & Drop ───────────────────────────────────────────
    const [appOrder, setAppOrder] = useState<string[]>([]);
    const [dragSourceId, setDragSourceId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    // ── Long-press share ──────────────────────────────────────
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
    const longPressActive = useRef(false);
    const [contextMenuApp, setContextMenuApp] = useState<string | null>(null);
    const [shareToast, setShareToast] = useState<string | null>(null);

    // ── Navigation History & Recents ──────────────────────────
    const [appHistory, setAppHistory] = useState<string[]>([]);
    const [showRecents, setShowRecents] = useState(false);

    // Unified database sync status
    const [dbSyncStatus, setDbSyncStatus] = useState<"syncing" | "synced" | "offline">("syncing");

    // ==========================================
    // SOVEREIGN OS APPLICATION STATES
    // ==========================================

    // 1. Agenda do Arauto
    const [agendaEvents, setAgendaEvents] = useState<AgendaEvent[]>([]);
    const [newEventTitle, setNewEventTitle] = useState("");
    const [newEventDate, setNewEventDate] = useState("");
    const [newEventType, setNewEventType] = useState("Compromisso");
    const [newEventNote, setNewEventNote] = useState("");

    // 2. Timer do Arauto
    // Stopwatch State
    const [stopwatchTime, setStopwatchTime] = useState(0);
    const [stopwatchRunning, setStopwatchRunning] = useState(false);
    const [stopwatchLaps, setStopwatchLaps] = useState<string[]>([]);
    const stopwatchRef = useRef<NodeJS.Timeout | null>(null);

    // Countdown Timer State
    const [timerRunning, setTimerRunning] = useState(false);
    const [timerRemaining, setTimerRemaining] = useState(0);
    const [timerTotal, setTimerTotal] = useState(0);
    const [timerHours, setTimerHours] = useState(0);
    const [timerMinutes, setTimerMinutes] = useState(5);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // 3. Ficha do Treinador (Gravl-inspired)
    const [gymMeasures, setGymMeasures] = useState<GymMeasure[]>([]);
    const [gymWorkouts, setGymWorkouts] = useState<GymWorkout[]>([]);
    const [treinadorTab, setTreinadorTab] = useState<"workouts" | "measures" | "progress">("workouts");

    // Workout planning form
    const [newWorkoutTitle, setNewWorkoutTitle] = useState("");
    const [newWorkoutDate, setNewWorkoutDate] = useState("");
    const [workoutExercises, setWorkoutExercises] = useState<Array<{ name: string; sets: number; reps: number; weight: number }>>([]);
    const [newExerciseName, setNewExerciseName] = useState("");
    const [newExerciseSets, setNewExerciseSets] = useState(4);
    const [newExerciseReps, setNewExerciseReps] = useState(10);
    const [newExerciseWeight, setNewExerciseWeight] = useState(20);

    // Measures form
    const [newWeight, setNewWeight] = useState("");
    const [newChest, setNewChest] = useState("");
    const [newBiceps, setNewBiceps] = useState("");
    const [newWaist, setNewWaist] = useState("");
    const [newHips, setNewHips] = useState("");
    const [newMeasureDate, setNewMeasureDate] = useState("");

    // 4. Contas do Mordomo
    const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
    const [mordomoBudgetLimit, setMordomoBudgetLimit] = useState(3000);
    const [newTxDescription, setNewTxDescription] = useState("");
    const [newTxAmount, setNewTxAmount] = useState("");
    const [newTxType, setNewTxType] = useState("expense"); // 'income' | 'expense'
    const [newTxCategory, setNewTxCategory] = useState("Castelo");
    const [newTxDate, setNewTxDate] = useState("");

    // 5. Ficha do Médico
    const [medicalDocs, setMedicalDocs] = useState<MedicalDocument[]>([]);
    const [ethicalDisclaimerAccepted, setEthicalDisclaimerAccepted] = useState(false);
    const [medDocName, setMedDocName] = useState("");
    const [medDocText, setMedDocText] = useState("");
    const [isScanningDoc, setIsScanningDoc] = useState(false);
    const [scannedAnalysisResult, setScannedAnalysisResult] = useState<string | null>(null);

    // ==========================================
    // SYSTEM INITIALIZATIONS & TIMEKEEPER
    // ==========================================

    // ── Native Fullscreen API ──────────────────────────────────
    const enterFullscreen = useCallback(async () => {
        setIsFullscreen(true);
        document.body.style.overflow = "hidden";
        try {
            const el = document.documentElement as any;
            if (el.requestFullscreen) await el.requestFullscreen();
            else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
            else if (el.mozRequestFullScreen) await el.mozRequestFullScreen();
        } catch {
            // browser may block fullscreen without user gesture, ignore silently
        }
    }, []);

    const exitFullscreen = useCallback(async () => {
        setIsFullscreen(false);
        document.body.style.overflow = "unset";
        try {
            const doc = document as any;
            if (doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement) {
                if (doc.exitFullscreen) await doc.exitFullscreen();
                else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
                else if (doc.mozCancelFullScreen) await doc.mozCancelFullScreen();
            }
        } catch {
            // ignore
        }
    }, []);

    // Sync React state when user presses Android back button or Esc to exit fullscreen
    useEffect(() => {
        const onFullscreenChange = () => {
            const doc = document as any;
            const isNativeFullscreen = !!(
                doc.fullscreenElement ||
                doc.webkitFullscreenElement ||
                doc.mozFullScreenElement
            );
            if (!isNativeFullscreen) {
                setIsFullscreen(false);
                document.body.style.overflow = "unset";
            }
        };
        document.addEventListener("fullscreenchange", onFullscreenChange);
        document.addEventListener("webkitfullscreenchange", onFullscreenChange);
        document.addEventListener("mozfullscreenchange", onFullscreenChange);
        return () => {
            document.removeEventListener("fullscreenchange", onFullscreenChange);
            document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
            document.removeEventListener("mozfullscreenchange", onFullscreenChange);
            document.body.style.overflow = "unset";
        };
    }, []);

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

    // Stopwatch logic
    useEffect(() => {
        if (stopwatchRunning) {
            stopwatchRef.current = setInterval(() => {
                setStopwatchTime((prev) => prev + 10);
            }, 10);
        } else {
            if (stopwatchRef.current) clearInterval(stopwatchRef.current);
        }
        return () => {
            if (stopwatchRef.current) clearInterval(stopwatchRef.current);
        };
    }, [stopwatchRunning]);

    // Timer logic
    useEffect(() => {
        if (timerRunning) {
            timerIntervalRef.current = setInterval(() => {
                setTimerRemaining((prev) => {
                    if (prev <= 1) {
                        setTimerRunning(false);
                        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                        // Trigger simple alert sound or vib simulation
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        }
        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, [timerRunning]);

    // ==========================================
    // DATABASE SYNCHRONIZATION AND LOCAL FALLBACK
    // ==========================================

    useEffect(() => {
        const syncSovereignOS = async () => {
            setDbSyncStatus("syncing");
            try {
                // Fetch all data from API
                const results = await Promise.all([
                    fetch("/api/sovereign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "get_agenda" }) }),
                    fetch("/api/sovereign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "get_gym_measures" }) }),
                    fetch("/api/sovereign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "get_gym_workouts" }) }),
                    fetch("/api/sovereign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "get_transactions" }) }),
                    fetch("/api/sovereign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "get_medical_documents" }) }),
                ]);

                // Check authorization
                if (results.some(r => r.status === 401)) {
                    throw new Error("Unauthenticated");
                }

                const [agendaRes, measuresRes, workoutsRes, txsRes, docsRes] = await Promise.all(results.map(r => r.json()));

                setAgendaEvents(agendaRes.events || []);
                setGymMeasures(measuresRes.measures || []);
                setGymWorkouts(workoutsRes.workouts || []);
                setTransactions(txsRes.transactions || []);
                setMedicalDocs(docsRes.documents || []);

                setDbSyncStatus("synced");
            } catch (err) {
                console.log("Sovereign sync unauthenticated or offline. Falling back to LocalStorage.");
                // Fallback to LocalStorage
                setAgendaEvents(JSON.parse(localStorage.getItem("sovereign_agenda_events") || "[]"));
                setGymMeasures(JSON.parse(localStorage.getItem("sovereign_treinador_measures") || "[]"));
                setGymWorkouts(JSON.parse(localStorage.getItem("sovereign_treinador_workouts") || "[]"));
                setTransactions(JSON.parse(localStorage.getItem("sovereign_mordomo_transactions") || "[]"));
                setMedicalDocs(JSON.parse(localStorage.getItem("sovereign_medico_documents") || "[]"));
                setDbSyncStatus("offline");
            }
        };

        syncSovereignOS();
    }, []);

    // Sincronizar modificações locais / estatais
    const saveAgendaEventLocal = async (event: Omit<AgendaEvent, "completed">) => {
        const fullEvent = { ...event, completed: false };
        const updated = [...agendaEvents, fullEvent];
        setAgendaEvents(updated);

        if (dbSyncStatus === "synced") {
            try {
                await fetch("/api/sovereign", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "save_agenda_event", event })
                });
            } catch {
                console.error("Failed to sync agenda event to cloud.");
            }
        } else {
            localStorage.setItem("sovereign_agenda_events", JSON.stringify(updated));
        }
    };

    const toggleAgendaEventLocal = async (eventId: string, completed: boolean) => {
        const updated = agendaEvents.map(ev => ev.id === eventId ? { ...ev, completed } : ev);
        setAgendaEvents(updated);

        if (dbSyncStatus === "synced") {
            try {
                await fetch("/api/sovereign", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "toggle_agenda_event", eventId, completed })
                });
            } catch {
                console.error("Failed to toggle agenda event in cloud.");
            }
        } else {
            localStorage.setItem("sovereign_agenda_events", JSON.stringify(updated));
        }
    };

    const deleteAgendaEventLocal = async (eventId: string) => {
        const updated = agendaEvents.filter(ev => ev.id !== eventId);
        setAgendaEvents(updated);

        if (dbSyncStatus === "synced") {
            try {
                await fetch("/api/sovereign", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "delete_agenda_event", eventId })
                });
            } catch {
                console.error("Failed to delete agenda event in cloud.");
            }
        } else {
            localStorage.setItem("sovereign_agenda_events", JSON.stringify(updated));
        }
    };

    const saveGymMeasureLocal = async (measure: GymMeasure) => {
        const updated = [...gymMeasures, measure];
        setGymMeasures(updated);

        if (dbSyncStatus === "synced") {
            try {
                await fetch("/api/sovereign", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "save_gym_measure", measure })
                });
            } catch {
                console.error("Failed to sync measure to cloud.");
            }
        } else {
            localStorage.setItem("sovereign_treinador_measures", JSON.stringify(updated));
        }
    };

    const deleteGymMeasureLocal = async (measureId: string) => {
        const updated = gymMeasures.filter(m => m.id !== measureId);
        setGymMeasures(updated);

        if (dbSyncStatus === "synced") {
            try {
                await fetch("/api/sovereign", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "delete_gym_measure", measureId })
                });
            } catch {
                console.error("Failed to delete measure in cloud.");
            }
        } else {
            localStorage.setItem("sovereign_treinador_measures", JSON.stringify(updated));
        }
    };

    const saveGymWorkoutLocal = async (workout: GymWorkout) => {
        const updated = [...gymWorkouts, workout];
        setGymWorkouts(updated);

        if (dbSyncStatus === "synced") {
            try {
                await fetch("/api/sovereign", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "save_gym_workout", workout })
                });
            } catch {
                console.error("Failed to sync workout to cloud.");
            }
        } else {
            localStorage.setItem("sovereign_treinador_workouts", JSON.stringify(updated));
        }
    };

    const deleteGymWorkoutLocal = async (workoutId: string) => {
        const updated = gymWorkouts.filter(w => w.id !== workoutId);
        setGymWorkouts(updated);

        if (dbSyncStatus === "synced") {
            try {
                await fetch("/api/sovereign", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "delete_gym_workout", workoutId })
                });
            } catch {
                console.error("Failed to delete workout in cloud.");
            }
        } else {
            localStorage.setItem("sovereign_treinador_workouts", JSON.stringify(updated));
        }
    };

    const saveTransactionLocal = async (tx: FinancialTransaction) => {
        const updated = [...transactions, tx];
        setTransactions(updated);

        if (dbSyncStatus === "synced") {
            try {
                await fetch("/api/sovereign", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "save_transaction", tx })
                });
            } catch {
                console.error("Failed to sync transaction to cloud.");
            }
        } else {
            localStorage.setItem("sovereign_mordomo_transactions", JSON.stringify(updated));
        }
    };

    const deleteTransactionLocal = async (txId: string) => {
        const updated = transactions.filter(t => t.id !== txId);
        setTransactions(updated);

        if (dbSyncStatus === "synced") {
            try {
                await fetch("/api/sovereign", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "delete_transaction", txId })
                });
            } catch {
                console.error("Failed to delete transaction in cloud.");
            }
        } else {
            localStorage.setItem("sovereign_mordomo_transactions", JSON.stringify(updated));
        }
    };

    const saveMedicalDocumentLocal = async (doc: MedicalDocument) => {
        const updated = [...medicalDocs, doc];
        setMedicalDocs(updated);

        if (dbSyncStatus === "synced") {
            try {
                await fetch("/api/sovereign", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "save_medical_document", doc })
                });
            } catch {
                console.error("Failed to sync document to cloud.");
            }
        } else {
            localStorage.setItem("sovereign_medico_documents", JSON.stringify(updated));
        }
    };

    const deleteMedicalDocumentLocal = async (docId: string) => {
        const updated = medicalDocs.filter(d => d.id !== docId);
        setMedicalDocs(updated);

        if (dbSyncStatus === "synced") {
            try {
                await fetch("/api/sovereign", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "delete_medical_document", docId })
                });
            } catch {
                console.error("Failed to delete medical document in cloud.");
            }
        } else {
            localStorage.setItem("sovereign_medico_documents", JSON.stringify(updated));
        }
    };

    // ==========================================
    // APPLICATION DATA & CONFIG
    // ==========================================

    const DOMAINS: DomainApp[] = [
        {
            id: "arauto",
            title: language.startsWith("pt") ? "Agenda do Arauto" : language === "es" ? "Agenda de Heraldo" : "Herald's Agenda",
            label: language.startsWith("pt") ? "Agenda" : language === "es" ? "Agenda" : "Agenda",
            description: language.startsWith("pt") 
                ? "Organize sua rotina com prazos, compromissos e lembretes com a solenidade do Arauto."
                : language === "es"
                    ? "Organiza tu rutina con plazos, citas y recordatorios con la solemnidad de Heraldo."
                    : "Organize your routine with deadlines, appointments, and reminders with the Herald's solemnity.",
            emoji: "📅",
            developer: "Arauto Nous",
            version: "v1.2.0"
        },
        {
            id: "timer",
            title: language.startsWith("pt") ? "Timer do Arauto" : language === "es" ? "Temporizador de Heraldo" : "Herald's Timer",
            label: language.startsWith("pt") ? "Timer" : language === "es" ? "Temporizador" : "Timer",
            description: language.startsWith("pt")
                ? "Controle o fluxo temporal com o relógio, cronômetro e despertador medieval do Arauto."
                : language === "es"
                    ? "Controla el flujo temporal con el reloj, cronómetro y temporizador medieval de Heraldo."
                    : "Control the temporal flow with the Herald's clock, stopwatch, and medieval timer.",
            emoji: "⏳",
            developer: "Arauto Nous",
            version: "v1.0.0"
        },
        {
            id: "treinador",
            title: language.startsWith("pt") ? "Ficha do Treinador" : language === "es" ? "Ficha del Entrenador" : "Trainer's File",
            label: language.startsWith("pt") ? "Ficha" : language === "es" ? "Ficha" : "Card",
            description: language.startsWith("pt")
                ? "Planeje seus treinos de musculação, registre medidas e acompanhe sua evolução física com o Treinador."
                : language === "es"
                    ? "Planifica tus entrenamientos, registra medidas y sigue tu evolución física con el Entrenador."
                    : "Plan your strength workouts, log body measures, and track physical evolution with the Trainer.",
            emoji: "📋",
            developer: "Treinador Nous",
            version: "v1.1.0"
        },
        {
            id: "mordomo",
            title: language.startsWith("pt") ? "Contas do Mordomo" : language === "es" ? "Cuentas del Mayordomo" : "Butler's Bills",
            label: language.startsWith("pt") ? "Contas" : language === "es" ? "Cuentas" : "Accounts",
            description: language.startsWith("pt")
                ? "Gerencie suas finanças, fluxos de receitas e despesas e crie limites de orçamento com a precisão do Mordomo."
                : language === "es"
                    ? "Gestiona tus finanzas, flujos de ingresos y gastos y establece presupuestos con la precisión del Mayordomo."
                    : "Manage your finances, income and expense flows, and create budget limits with the Butler's precision.",
            emoji: "💰",
            developer: "Mordomo Nous",
            version: "v1.1.0"
        },
        {
            id: "medico",
            title: language.startsWith("pt") ? "Ficha do Médico" : language === "es" ? "Ficha del Médico" : "Physician's Card",
            label: language.startsWith("pt") ? "Prontuário" : language === "es" ? "Prontuario" : "Records",
            description: language.startsWith("pt")
                ? "Anexe receitas e laudos de exames para análise clínica do Médico Nous, sob um rigoroso termo de compromisso ético."
                : language === "es"
                    ? "Adjunte recetas e informes médicos para el análisis del Médico Nous, bajo un estricto descargo ético."
                    : "Attach prescriptions and exam reports for the clinical analysis of Physician Nous, under strict ethical terms.",
            emoji: "⚕️",
            developer: "Médico Nous",
            version: "v1.1.5"
        },
        {
            id: "oracle",
            title: language.startsWith("pt") ? "Oráculo de Personas" : language === "es" ? "Oráculo de Personas" : "Persona Oracle",
            label: language.startsWith("pt") ? "Oráculo" : language === "es" ? "Oráculo" : "Oracle",
            description: language.startsWith("pt")
                ? "Concentre-se em uma questão existencial e retire uma carta de Persona no oráculo de autoconhecimento."
                : language === "es"
                    ? "Concéntrate en una pregunta existencial y saca una carta de Persona en el oráculo del autoconocimiento."
                    : "Focus on an existential question and draw a Persona card from the self-knowledge oracle.",
            emoji: "🔮",
            developer: "Conselho de Nous",
            version: "v1.0.0"
        },
        {
            id: "solitaire",
            title: language.startsWith("pt") ? "Paciência Nemosine" : language === "es" ? "Solitario Nemosine" : "Nemosine Solitaire",
            label: language.startsWith("pt") ? "Paciência" : language === "es" ? "Solitario" : "Solitaire",
            description: language.startsWith("pt")
                ? "Organize o grimório de cartas sagradas e treine seu foco mental e resiliência."
                : language === "es"
                    ? "Organiza el grimorio de cartas sagradas y entrena tu enfoque mental y resiliencia."
                    : "Organize the grimoire of sacred cards and train your mental focus and resilience.",
            emoji: "🃏",
            developer: "Conselho de Nous",
            version: "v1.0.0"
        },
        {
            id: "chess",
            title: language.startsWith("pt") ? "Xadrez do Inimigo" : language === "es" ? "Ajedrez del Enemigo" : "Enemy Chess",
            label: language.startsWith("pt") ? "Xadrez" : language === "es" ? "Ajedrez" : "Chess",
            description: language.startsWith("pt")
                ? "Enfrente as sombras da sua própria dúvida em um duelo de pura estratégia medieval contra a inteligência artificial."
                : language === "es"
                    ? "Enfréntate a las sombras de tu propia duda en un duelo de pura estrategia medieval contra la inteligencia artificial."
                    : "Face the shadows of your own doubt in a duel of pure medieval strategy against artificial intelligence.",
            emoji: "♟️",
            developer: "Inimigo Oculto",
            version: "v1.0.0"
        }
    ];

    const loadingTexts = language.startsWith("pt")
        ? ["Invocando Portal...", "Carregando Grimório...", "Estabelecendo Conexão...", "Abrindo Protocolo..."]
        : language === "es"
            ? ["Invocando Portal...", "Cargando Grimorio...", "Estableciendo Conexión...", "Abriendo Protocolo..."]
            : ["Summoning Portal...", "Loading Grimoire...", "Establishing Connection...", "Opening Protocol..."];

    const handleAppClick = useCallback((appId: string) => {
        if (isDragging) return;
        setLoadingApp(true);
        setSelectedApp(appId);
        setLoadingTextIndex(0);
        // Push to history (keep last 5 unique)
        setAppHistory(prev => {
            const filtered = prev.filter(id => id !== appId);
            return [appId, ...filtered].slice(0, 5);
        });
        setShowRecents(false);

        const textCycle = setInterval(() => {
            setLoadingTextIndex((prev) => (prev + 1) % loadingTexts.length);
        }, 600);

        setTimeout(() => {
            clearInterval(textCycle);
            setLoadingApp(false);
        }, 1200);
    }, [isDragging, loadingTexts]);

    // ── Load/Save icon order ──────────────────────────────────
    useEffect(() => {
        const saved = localStorage.getItem("sovereign_app_order");
        if (saved) {
            try { setAppOrder(JSON.parse(saved)); } catch { /* ignore */ }
        }
    }, []);

    const getOrderedDomains = useCallback(() => {
        if (appOrder.length === 0) return DOMAINS;
        const domainMap = Object.fromEntries(DOMAINS.map(d => [d.id, d]));
        const ordered = appOrder.map(id => domainMap[id]).filter(Boolean);
        const rest = DOMAINS.filter(d => !appOrder.includes(d.id));
        return [...ordered, ...rest];
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appOrder]);

    // ── Drag & Drop handlers ──────────────────────────────────
    const handleDragStart = useCallback((e: React.DragEvent, appId: string) => {
        setDragSourceId(appId);
        setIsDragging(true);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", appId);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, appId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverId(appId);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        const sourceId = dragSourceId;
        if (!sourceId || sourceId === targetId) {
            setIsDragging(false);
            setDragSourceId(null);
            setDragOverId(null);
            return;
        }
        const ordered = getOrderedDomains();
        const ids = ordered.map(d => d.id);
        const fromIdx = ids.indexOf(sourceId);
        const toIdx = ids.indexOf(targetId);
        if (fromIdx === -1 || toIdx === -1) return;
        const newIds = [...ids];
        newIds.splice(fromIdx, 1);
        newIds.splice(toIdx, 0, sourceId);
        setAppOrder(newIds);
        localStorage.setItem("sovereign_app_order", JSON.stringify(newIds));
        setIsDragging(false);
        setDragSourceId(null);
        setDragOverId(null);
    }, [dragSourceId, getOrderedDomains]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
        setDragSourceId(null);
        setDragOverId(null);
    }, []);

    // ── Touch drag (pointer events for mobile) ────────────────
    const touchDragState = useRef<{
        sourceId: string | null;
        startX: number; startY: number;
        ghost: HTMLElement | null;
    }>({ sourceId: null, startX: 0, startY: 0, ghost: null });

    const handlePointerDown = useCallback((e: React.PointerEvent, appId: string) => {
        longPressActive.current = false;
        longPressTimer.current = setTimeout(() => {
            longPressActive.current = true;
            setContextMenuApp(appId);
        }, 600);
        // Touch drag prep
        touchDragState.current = { sourceId: appId, startX: e.clientX, startY: e.clientY, ghost: null };
    }, []);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        const state = touchDragState.current;
        if (!state.sourceId) return;
        const dx = Math.abs(e.clientX - state.startX);
        const dy = Math.abs(e.clientY - state.startY);
        if (dx > 8 || dy > 8) {
            // Cancel long-press if user started dragging
            if (longPressTimer.current) {
                clearTimeout(longPressTimer.current);
                longPressTimer.current = null;
            }
            setIsDragging(true);
            setDragSourceId(state.sourceId);
        }
    }, []);

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        // Resolve touch drop
        if (isDragging && dragSourceId) {
            const el = document.elementFromPoint(e.clientX, e.clientY);
            const targetBtn = el?.closest("[data-app-id]");
            const targetId = targetBtn?.getAttribute("data-app-id");
            if (targetId && targetId !== dragSourceId) {
                const ordered = getOrderedDomains();
                const ids = ordered.map(d => d.id);
                const fromIdx = ids.indexOf(dragSourceId);
                const toIdx = ids.indexOf(targetId);
                if (fromIdx !== -1 && toIdx !== -1) {
                    const newIds = [...ids];
                    newIds.splice(fromIdx, 1);
                    newIds.splice(toIdx, 0, dragSourceId);
                    setAppOrder(newIds);
                    localStorage.setItem("sovereign_app_order", JSON.stringify(newIds));
                }
            }
        }
        setIsDragging(false);
        setDragSourceId(null);
        setDragOverId(null);
        touchDragState.current = { sourceId: null, startX: 0, startY: 0, ghost: null };
    }, [isDragging, dragSourceId, getOrderedDomains]);

    // ── Long-press share ──────────────────────────────────────
    const handleShareApp = useCallback(async (appId: string) => {
        const app = DOMAINS.find(d => d.id === appId);
        if (!app) return;
        const shareData = {
            title: `Nemosine — ${app.title}`,
            text: app.description,
            url: window.location.origin + "/space/dominios",
        };
        setContextMenuApp(null);
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(shareData.url);
                setShareToast("Link copiado para a área de transferência!");
                setTimeout(() => setShareToast(null), 3000);
            }
        } catch {
            /* user cancelled */
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Android-style navigation handlers ────────────────────
    const handleNavBack = useCallback(() => {
        if (selectedApp) {
            // Close current app, go back to home
            setSelectedApp(null);
            setShowRecents(false);
        } else if (showRecents) {
            setShowRecents(false);
        } else {
            // Navigate browser back
            router.back();
        }
    }, [selectedApp, showRecents, router]);

    const handleNavHome = useCallback(() => {
        setSelectedApp(null);
        setShowRecents(false);
    }, []);

    const handleNavRecents = useCallback(() => {
        setShowRecents(prev => !prev);
    }, []);

    const currentApp = DOMAINS.find((app) => app.id === selectedApp);

    // ==========================================
    // RENDER DETAILED SOVEREIGN APPLICATIONS
    // ==========================================

    const renderAgendaApp = (compact: boolean) => {
        const handleAddEvent = (e: React.FormEvent) => {
            e.preventDefault();
            if (!newEventTitle || !newEventDate) return;
            const newEvent: Omit<AgendaEvent, "completed"> = {
                id: Math.random().toString(36).substring(2, 9),
                title: newEventTitle,
                date: newEventDate,
                type: newEventType,
                note: newEventNote || null
            };
            saveAgendaEventLocal(newEvent);
            setNewEventTitle("");
            setNewEventDate("");
            setNewEventNote("");
        };

        return (
            <div className="flex-1 flex flex-col h-full overflow-y-auto pr-1 text-stone-200">
                <div className="border-b border-[#c5a059]/20 pb-3 mb-4">
                    <h3 className="font-display text-sm font-bold text-[#c5a059] uppercase tracking-wider">📅 Agenda do Arauto</h3>
                    <p className="text-[9px] text-stone-400 italic">“Para tudo há uma estação, e tempo para cada atividade sob os céus.”</p>
                </div>

                {/* Form to add */}
                <form onSubmit={handleAddEvent} className="bg-black/40 border border-[#c5a059]/10 rounded-xl p-3 mb-4 space-y-3">
                    <span className="text-[10px] uppercase font-bold text-[#c5a059] block">Novo Compromisso</span>
                    <input
                        type="text"
                        placeholder="Título / Atividade"
                        value={newEventTitle}
                        onChange={(e) => setNewEventTitle(e.target.value)}
                        className="w-full bg-[#121118] border border-[#c5a059]/30 rounded px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-[#c5a059]"
                        required
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="date"
                            value={newEventDate}
                            onChange={(e) => setNewEventDate(e.target.value)}
                            className="bg-[#121118] border border-[#c5a059]/30 rounded px-2 py-1 text-[11px] text-stone-200 focus:outline-none"
                            required
                        />
                        <select
                            value={newEventType}
                            onChange={(e) => setNewEventType(e.target.value)}
                            className="bg-[#121118] border border-[#c5a059]/30 rounded px-2 py-1 text-[11px] text-stone-200 focus:outline-none"
                        >
                            <option value="Compromisso">Compromisso</option>
                            <option value="Solenidade">Solenidade 👑</option>
                            <option value="Lembrete">Lembrete 🔔</option>
                        </select>
                    </div>
                    <input
                        type="text"
                        placeholder="Nota opcional..."
                        value={newEventNote}
                        onChange={(e) => setNewEventNote(e.target.value)}
                        className="w-full bg-[#121118] border border-[#c5a059]/30 rounded px-2.5 py-1 text-xs text-stone-200 focus:outline-none"
                    />
                    <button type="submit" className="w-full py-1.5 bg-[#c5a059]/10 hover:bg-[#c5a059]/20 border border-[#c5a059]/40 text-stone-200 rounded font-display text-[10px] uppercase tracking-wider transition-colors cursor-pointer">
                        Agendar
                    </button>
                </form>

                {/* Event List */}
                <div className="space-y-2 flex-1">
                    <span className="text-[10px] uppercase font-bold text-[#c5a059] block">Eventos Planejados ({agendaEvents.length})</span>
                    {agendaEvents.length === 0 ? (
                        <p className="text-[10px] text-stone-500 italic py-4 text-center">Nenhum evento registrado. Agende uma solenidade.</p>
                    ) : (
                        agendaEvents.map((ev) => (
                            <div key={ev.id} className={`p-2.5 border rounded-xl flex items-center justify-between transition-all duration-300 ${ev.completed ? "bg-emerald-950/20 border-emerald-800/40 text-stone-400 opacity-60" : "bg-[#1c1a24]/30 border-[#c5a059]/15"}`}>
                                <div className="flex items-center gap-2 flex-1">
                                    <input
                                        type="checkbox"
                                        checked={ev.completed}
                                        onChange={(e) => toggleAgendaEventLocal(ev.id, e.target.checked)}
                                        className="w-3.5 h-3.5 rounded border-[#c5a059]/40 bg-black text-amber-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                    />
                                    <div className="text-left">
                                        <span className={`text-xs block font-semibold ${ev.completed ? "line-through" : "text-[#eae3d5]"}`}>
                                            {ev.title}
                                        </span>
                                        <div className="flex gap-2 items-center text-[9px] mt-0.5">
                                            <span className="text-[#c5a059] font-bold">{ev.date}</span>
                                            <span className={`px-1 rounded border text-[7.5px] uppercase tracking-wide ${ev.type === 'Solenidade' ? 'bg-[#7a1e1e]/20 border-[#7a1e1e]/50 text-red-300' : ev.type === 'Lembrete' ? 'bg-amber-950/30 border-amber-600/40 text-amber-300' : 'bg-stone-800 border-stone-600 text-stone-300'}`}>
                                                {ev.type}
                                            </span>
                                        </div>
                                        {ev.note && <p className="text-[9px] text-stone-400 mt-1 italic">{ev.note}</p>}
                                    </div>
                                </div>
                                <button type="button" onClick={() => deleteAgendaEventLocal(ev.id)} className="text-stone-500 hover:text-red-400 p-1 transition-colors cursor-pointer">
                                    <span className="material-icons text-xs">delete</span>
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    const renderTimerApp = () => {
        // Formatter helper
        const formatStopwatch = (ms: number) => {
            const min = Math.floor(ms / 60000);
            const sec = Math.floor((ms % 60000) / 1000);
            const centi = Math.floor((ms % 1000) / 10);
            return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(centi).padStart(2, "0")}`;
        };

        const handleStartStopwatch = () => setStopwatchRunning(!stopwatchRunning);
        const handleResetStopwatch = () => {
            setStopwatchRunning(false);
            setStopwatchTime(0);
            setStopwatchLaps([]);
        };
        const handleLapStopwatch = () => {
            setStopwatchLaps([formatStopwatch(stopwatchTime), ...stopwatchLaps]);
        };

        // Countdown helpers
        const formatTimer = (sec: number) => {
            const h = Math.floor(sec / 3600);
            const m = Math.floor((sec % 3600) / 60);
            const s = sec % 60;
            return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
        };

        const handleStartTimer = () => {
            if (timerRunning) {
                setTimerRunning(false);
            } else {
                const total = (timerHours * 3600) + (timerMinutes * 60) + timerSeconds;
                if (total <= 0) return;
                setTimerRemaining(total);
                setTimerTotal(total);
                setTimerRunning(true);
            }
        };

        const handleResetTimer = () => {
            setTimerRunning(false);
            setTimerRemaining(0);
            setTimerTotal(0);
        };

        const percentageRemaining = timerTotal > 0 ? (timerRemaining / timerTotal) * 100 : 0;

        return (
            <div className="flex-1 flex flex-col h-full overflow-y-auto pr-1 text-stone-200">
                <div className="border-b border-[#c5a059]/20 pb-3 mb-4">
                    <h3 className="font-display text-sm font-bold text-[#c5a059] uppercase tracking-wider">⏳ Timer do Arauto</h3>
                    <p className="text-[9px] text-stone-400 italic">“Mede as horas imperiais com a precisão dos relógios solares de Nous.”</p>
                </div>

                {/* 1. SECTION COUNTDOWN TIMER */}
                <div className="bg-[#1c1a24]/30 border border-[#c5a059]/15 rounded-2xl p-4 mb-4 text-center">
                    <span className="text-[10px] uppercase font-bold text-[#c5a059] block mb-2">Relógio de Nous</span>
                    
                    {/* Circle Hourglass progress bar */}
                    <div className="relative w-28 h-28 mx-auto flex items-center justify-center mb-3">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="56" cy="56" r="48" fill="transparent" stroke="rgba(197, 160, 89, 0.08)" strokeWidth="6" />
                            <circle 
                                cx="56" 
                                cy="56" 
                                r="48" 
                                fill="transparent" 
                                stroke="#c5a059" 
                                strokeWidth="6" 
                                strokeDasharray={301.6} 
                                strokeDashoffset={301.6 - (301.6 * (timerRemaining > 0 ? percentageRemaining : 100)) / 100}
                                className="transition-all duration-1000"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
                            <span className="font-mono text-lg font-bold text-[#eae3d5] tracking-widest drop-shadow-[0_0_8px_rgba(197,160,89,0.3)]">
                                {timerRemaining > 0 ? formatTimer(timerRemaining) : "00:00:00"}
                            </span>
                            <span className="text-[7.5px] uppercase tracking-widest text-[#c5a059]/60 font-semibold mt-0.5">
                                {timerRunning ? "Contando" : "Pausado"}
                            </span>
                        </div>
                    </div>

                    {/* Inputs when paused */}
                    {!timerRunning && timerRemaining === 0 && (
                        <div className="flex gap-2 justify-center items-center mb-4">
                            <div className="flex flex-col items-center">
                                <label className="text-[7.5px] text-stone-500 uppercase font-bold mb-0.5">Hora</label>
                                <input type="number" min="0" max="23" value={timerHours} onChange={(e) => setTimerHours(Math.max(0, parseInt(e.target.value) || 0))} className="w-10 bg-[#121118] border border-[#c5a059]/20 rounded text-center text-xs py-0.5 text-stone-200" />
                            </div>
                            <span className="text-xs text-[#c5a059] mt-2">:</span>
                            <div className="flex flex-col items-center">
                                <label className="text-[7.5px] text-stone-500 uppercase font-bold mb-0.5">Min</label>
                                <input type="number" min="0" max="59" value={timerMinutes} onChange={(e) => setTimerMinutes(Math.max(0, parseInt(e.target.value) || 0))} className="w-10 bg-[#121118] border border-[#c5a059]/20 rounded text-center text-xs py-0.5 text-stone-200" />
                            </div>
                            <span className="text-xs text-[#c5a059] mt-2">:</span>
                            <div className="flex flex-col items-center">
                                <label className="text-[7.5px] text-stone-500 uppercase font-bold mb-0.5">Seg</label>
                                <input type="number" min="0" max="59" value={timerSeconds} onChange={(e) => setTimerSeconds(Math.max(0, parseInt(e.target.value) || 0))} className="w-10 bg-[#121118] border border-[#c5a059]/20 rounded text-center text-xs py-0.5 text-stone-200" />
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button onClick={handleStartTimer} className="flex-1 py-1.5 bg-[#c5a059]/15 hover:bg-[#c5a059]/25 border border-[#c5a059]/40 rounded font-display text-[9px] uppercase tracking-wider transition-all cursor-pointer">
                            {timerRunning ? "Pausar" : timerRemaining > 0 ? "Retomar" : "Iniciar"}
                        </button>
                        {(timerRunning || timerRemaining > 0) && (
                            <button onClick={handleResetTimer} className="px-4 py-1.5 bg-black/60 border border-stone-700 hover:border-red-500/50 hover:bg-red-950/20 text-stone-300 rounded font-display text-[9px] uppercase tracking-wider transition-all cursor-pointer">
                                Reiniciar
                            </button>
                        )}
                    </div>
                </div>

                {/* 2. SECTION STOPWATCH */}
                <div className="bg-[#1c1a24]/30 border border-[#c5a059]/15 rounded-2xl p-4">
                    <span className="text-[10px] uppercase font-bold text-[#c5a059] block text-center mb-3">Cronômetro Imperial</span>
                    <div className="font-mono text-2xl font-bold tracking-widest text-center text-[#eae3d5] mb-4">
                        {formatStopwatch(stopwatchTime)}
                    </div>

                    <div className="flex gap-2 mb-4">
                        <button onClick={handleStartStopwatch} className={`flex-1 py-1.5 border rounded font-display text-[9px] uppercase tracking-wider transition-all cursor-pointer ${stopwatchRunning ? "bg-red-950/20 border-red-800/40 text-red-300" : "bg-emerald-950/20 border-emerald-800/40 text-emerald-300"}`}>
                            {stopwatchRunning ? "Parar" : "Iniciar"}
                        </button>
                        {stopwatchRunning && (
                            <button onClick={handleLapStopwatch} className="px-3 py-1.5 bg-black/40 border border-[#c5a059]/30 text-stone-200 rounded font-display text-[9px] uppercase tracking-wider transition-all cursor-pointer">
                                Lap
                            </button>
                        )}
                        {!stopwatchRunning && stopwatchTime > 0 && (
                            <button onClick={handleResetStopwatch} className="px-3 py-1.5 bg-black/40 border border-red-500/30 text-red-300 rounded font-display text-[9px] uppercase tracking-wider transition-all cursor-pointer">
                                Reset
                            </button>
                        )}
                    </div>

                    {/* Lap history list */}
                    {stopwatchLaps.length > 0 && (
                        <div className="space-y-1 max-h-28 overflow-y-auto border-t border-stone-800 pt-2.5">
                            <span className="text-[7.5px] uppercase font-bold text-stone-500 block">Tempos Parciais</span>
                            {stopwatchLaps.map((lap, index) => (
                                <div key={index} className="flex justify-between items-center text-[10px] py-1 border-b border-stone-900/60 font-mono">
                                    <span className="text-stone-500">Lap {stopwatchLaps.length - index}</span>
                                    <span className="text-stone-300 font-bold">{lap}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderTreinadorApp = () => {
        // Add measures
        const handleAddMeasure = (e: React.FormEvent) => {
            e.preventDefault();
            const wVal = parseFloat(newWeight);
            if (isNaN(wVal) || !newMeasureDate) return;
            const newM: GymMeasure = {
                id: Math.random().toString(36).substring(2, 9),
                date: newMeasureDate,
                weight: wVal,
                chest: newChest ? parseFloat(newChest) : null,
                biceps: newBiceps ? parseFloat(newBiceps) : null,
                waist: newWaist ? parseFloat(newWaist) : null,
                hips: newHips ? parseFloat(newHips) : null
            };
            saveGymMeasureLocal(newM);
            setNewWeight("");
            setNewChest("");
            setNewBiceps("");
            setNewWaist("");
            setNewHips("");
            setNewMeasureDate("");
        };

        // Add exercise to queue
        const handleAddExerciseToQueue = () => {
            if (!newExerciseName) return;
            setWorkoutExercises([
                ...workoutExercises,
                { name: newExerciseName, sets: newExerciseSets, reps: newExerciseReps, weight: newExerciseWeight }
            ]);
            setNewExerciseName("");
        };

        // Save workout
        const handleSaveWorkout = (e: React.FormEvent) => {
            e.preventDefault();
            if (!newWorkoutTitle || !newWorkoutDate || workoutExercises.length === 0) return;
            const newW: GymWorkout = {
                id: Math.random().toString(36).substring(2, 9),
                date: newWorkoutDate,
                title: newWorkoutTitle,
                exercises: JSON.stringify(workoutExercises)
            };
            saveGymWorkoutLocal(newW);
            setNewWorkoutTitle("");
            setNewWorkoutDate("");
            setWorkoutExercises([]);
        };

        // Render SVG progress chart (dynamic Gravl style)
        const renderProgressChart = () => {
            if (gymMeasures.length < 2) {
                return (
                    <div className="p-4 border border-[#c5a059]/10 bg-black/40 rounded-xl text-center my-4">
                        <span className="material-icons text-xl text-amber-500/60 block mb-1">show_chart</span>
                        <p className="text-[10px] text-stone-400 italic">Insira ao menos 2 registros de medidas para gerar o gráfico dinâmico de evolução corporal.</p>
                    </div>
                );
            }

            // Extract weights and dates
            const weights = gymMeasures.map(m => m.weight);
            const maxW = Math.max(...weights);
            const minW = Math.min(...weights);
            const range = maxW - minW || 1;

            const paddingY = 15;
            const height = 100;
            const width = 240;

            // Generate coordinates
            const points = gymMeasures.map((m, idx) => {
                const x = (idx / (gymMeasures.length - 1)) * (width - 20) + 10;
                // invert y for SVG origin at top-left
                const y = height - (((m.weight - minW) / range) * (height - 2 * paddingY) + paddingY);
                return { x, y, weight: m.weight, date: m.date };
            });

            const pathData = points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

            return (
                <div className="bg-[#1c1a24]/30 border border-[#c5a059]/15 rounded-xl p-3 my-4">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-[#c5a059] block text-center mb-3">Evolução do Peso Corporal (kg)</span>
                    <div className="w-full flex justify-center">
                        <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[280px]">
                            {/* Grid lines */}
                            <line x1="0" y1={paddingY} x2={width} y2={paddingY} stroke="rgba(197, 160, 89, 0.08)" strokeDasharray="3" />
                            <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="rgba(197, 160, 89, 0.08)" strokeDasharray="3" />
                            <line x1="0" y1={height - paddingY} x2={width} y2={height - paddingY} stroke="rgba(197, 160, 89, 0.08)" strokeDasharray="3" />

                            {/* Line path */}
                            <path d={pathData} stroke="#c5a059" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_4px_rgba(197,160,89,0.3)]" />

                            {/* Circle dots */}
                            {points.map((p, idx) => (
                                <g key={idx} className="group cursor-pointer">
                                    <circle cx={p.x} cy={p.y} r="4" fill="#121118" stroke="#c5a059" strokeWidth="2" />
                                    <text x={p.x} y={p.y - 8} className="text-[7.5px] fill-amber-200 text-center font-bold" textAnchor="middle">
                                        {p.weight}k
                                    </text>
                                </g>
                            ))}
                        </svg>
                    </div>
                    <div className="flex justify-between items-center text-[7.5px] text-stone-500 font-bold uppercase mt-2">
                        <span>{points[0].date}</span>
                        <span>{points[points.length - 1].date}</span>
                    </div>
                </div>
            );
        };

        return (
            <div className="flex-1 flex flex-col h-full overflow-y-auto pr-1 text-stone-200">
                <div className="border-b border-[#c5a059]/20 pb-3 mb-4">
                    <h3 className="font-display text-sm font-bold text-[#c5a059] uppercase tracking-wider">📋 Ficha do Treinador</h3>
                    <p className="text-[9px] text-stone-400 italic">“Forje seu templo corporal sob a firme disciplina do Treinador de Nous.”</p>
                </div>

                {/* Navigation inside app */}
                <div className="grid grid-cols-3 gap-1 bg-black/45 p-1 rounded-lg border border-[#c5a059]/10 mb-4 select-none">
                    <button onClick={() => setTreinadorTab("workouts")} className={`py-1.5 rounded text-[8.5px] uppercase font-bold tracking-wider transition-all cursor-pointer ${treinadorTab === "workouts" ? "bg-[#c5a059]/15 text-[#fde68a] border border-[#c5a059]/30" : "text-stone-500 hover:text-stone-300"}`}>
                        Treinos
                    </button>
                    <button onClick={() => setTreinadorTab("measures")} className={`py-1.5 rounded text-[8.5px] uppercase font-bold tracking-wider transition-all cursor-pointer ${treinadorTab === "measures" ? "bg-[#c5a059]/15 text-[#fde68a] border border-[#c5a059]/30" : "text-stone-500 hover:text-stone-300"}`}>
                        Medidas
                    </button>
                    <button onClick={() => setTreinadorTab("progress")} className={`py-1.5 rounded text-[8.5px] uppercase font-bold tracking-wider transition-all cursor-pointer ${treinadorTab === "progress" ? "bg-[#c5a059]/15 text-[#fde68a] border border-[#c5a059]/30" : "text-stone-500 hover:text-stone-300"}`}>
                        Evolução
                    </button>
                </div>

                {/* 1. WORKOUTS TAB */}
                {treinadorTab === "workouts" && (
                    <div className="space-y-4">
                        {/* New workout form */}
                        <form onSubmit={handleSaveWorkout} className="bg-black/40 border border-[#c5a059]/10 rounded-xl p-3 space-y-3">
                            <span className="text-[9px] uppercase font-bold text-[#c5a059] block">Novo Planejamento de Treino</span>
                            <div className="grid grid-cols-2 gap-2">
                                <input type="text" placeholder="Nome do Treino (ex: Pull)" value={newWorkoutTitle} onChange={(e) => setNewWorkoutTitle(e.target.value)} className="bg-[#121118] border border-[#c5a059]/30 rounded px-2 py-1 text-xs text-stone-200 focus:outline-none" required />
                                <input type="date" value={newWorkoutDate} onChange={(e) => setNewWorkoutDate(e.target.value)} className="bg-[#121118] border border-[#c5a059]/30 rounded px-2 py-1 text-xs text-stone-200 focus:outline-none" required />
                            </div>

                            {/* Exercises Queue */}
                            {workoutExercises.length > 0 && (
                                <div className="space-y-1 bg-[#121118]/60 p-2 rounded border border-stone-800">
                                    <span className="text-[7.5px] uppercase font-bold text-stone-500 block">Exercícios no Planejamento</span>
                                    {workoutExercises.map((ex, index) => (
                                        <div key={index} className="flex justify-between items-center text-[10px] py-0.5 border-b border-stone-900/60">
                                            <span className="font-semibold">{ex.name}</span>
                                            <span className="text-[#c5a059]">{ex.sets}x{ex.reps} ({ex.weight}kg)</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add Single Exercise Sub-Form */}
                            <div className="bg-black/40 p-2 rounded border border-stone-850 space-y-2">
                                <span className="text-[7.5px] uppercase font-bold text-[#c5a059]/80 block">Adicionar Exercício</span>
                                <input type="text" placeholder="Nome do exercício..." value={newExerciseName} onChange={(e) => setNewExerciseName(e.target.value)} className="w-full bg-[#121118] border border-[#c5a059]/20 rounded px-2 py-1 text-xs text-stone-200 focus:outline-none" />
                                <div className="grid grid-cols-3 gap-1 text-center">
                                    <div>
                                        <label className="text-[7px] text-stone-500 uppercase block mb-0.5">Séries</label>
                                        <input type="number" min="1" value={newExerciseSets} onChange={(e) => setNewExerciseSets(parseInt(e.target.value) || 4)} className="w-full bg-[#121118] border border-[#c5a059]/20 rounded text-center text-xs py-0.5 text-stone-200" />
                                    </div>
                                    <div>
                                        <label className="text-[7px] text-stone-500 uppercase block mb-0.5">Reps</label>
                                        <input type="number" min="1" value={newExerciseReps} onChange={(e) => setNewExerciseReps(parseInt(e.target.value) || 10)} className="w-full bg-[#121118] border border-[#c5a059]/20 rounded text-center text-xs py-0.5 text-stone-200" />
                                    </div>
                                    <div>
                                        <label className="text-[7px] text-stone-500 uppercase block mb-0.5">Carga (kg)</label>
                                        <input type="number" min="0" value={newExerciseWeight} onChange={(e) => setNewExerciseWeight(parseInt(e.target.value) || 0)} className="w-full bg-[#121118] border border-[#c5a059]/20 rounded text-center text-xs py-0.5 text-stone-200" />
                                    </div>
                                </div>
                                <button type="button" onClick={handleAddExerciseToQueue} className="w-full py-1 bg-black/60 hover:bg-[#c5a059]/10 border border-[#c5a059]/20 text-[9px] uppercase tracking-wide rounded text-stone-300 transition-all cursor-pointer">
                                    + Inserir Exercício
                                </button>
                            </div>

                            <button type="submit" className="w-full py-1.5 bg-[#c5a059]/10 hover:bg-[#c5a059]/20 border border-[#c5a059]/40 text-stone-200 rounded font-display text-[9px] uppercase tracking-wider transition-colors cursor-pointer">
                                Registrar Ficha de Treino
                            </button>
                        </form>

                        {/* List workouts */}
                        <div className="space-y-2">
                            <span className="text-[10px] uppercase font-bold text-[#c5a059] block">Fichas Arquivadas ({gymWorkouts.length})</span>
                            {gymWorkouts.length === 0 ? (
                                <p className="text-[10px] text-stone-500 italic py-4 text-center">Nenhum treino planejado ainda.</p>
                            ) : (
                                gymWorkouts.map((w) => {
                                    const exercises = JSON.parse(w.exercises) as Array<{ name: string; sets: number; reps: number; weight: number }>;
                                    return (
                                        <div key={w.id} className="p-2.5 border border-[#c5a059]/15 bg-[#1c1a24]/30 rounded-xl flex items-start justify-between text-left">
                                            <div className="flex-1 space-y-1.5">
                                                <div className="flex justify-between items-center pr-2">
                                                    <span className="text-xs font-semibold text-[#eae3d5]">{w.title}</span>
                                                    <span className="text-[9px] text-[#c5a059]/80 font-semibold">{w.date}</span>
                                                </div>
                                                <div className="space-y-1">
                                                    {exercises.map((ex, idx) => (
                                                        <div key={idx} className="flex justify-between items-center text-[9.5px] text-stone-400 font-mono pr-2">
                                                            <span>• {ex.name}</span>
                                                            <span>{ex.sets}x{ex.reps} @ {ex.weight}kg</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <button type="button" onClick={() => deleteGymWorkoutLocal(w.id)} className="text-stone-500 hover:text-red-400 p-0.5 transition-colors cursor-pointer shrink-0">
                                                <span className="material-icons text-xs">delete</span>
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* 2. MEASURES TAB */}
                {treinadorTab === "measures" && (
                    <div className="space-y-4">
                        <form onSubmit={handleAddMeasure} className="bg-black/40 border border-[#c5a059]/10 rounded-xl p-3 space-y-3">
                            <span className="text-[9px] uppercase font-bold text-[#c5a059] block">Registrar Medidas Corporais</span>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[7.5px] text-stone-500 uppercase block mb-0.5">Data</label>
                                    <input type="date" value={newMeasureDate} onChange={(e) => setNewMeasureDate(e.target.value)} className="w-full bg-[#121118] border border-[#c5a059]/20 rounded px-2 py-0.5 text-xs text-stone-200" required />
                                </div>
                                <div>
                                    <label className="text-[7.5px] text-stone-500 uppercase block mb-0.5">Peso (kg)</label>
                                    <input type="number" step="0.1" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} className="w-full bg-[#121118] border border-[#c5a059]/20 rounded px-2 py-0.5 text-xs text-stone-200" placeholder="ex: 78.5" required />
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-1.5 text-center">
                                <div>
                                    <label className="text-[7px] text-stone-500 uppercase block mb-0.5">Peito</label>
                                    <input type="number" step="0.1" value={newChest} onChange={(e) => setNewChest(e.target.value)} className="w-full bg-[#121118] border border-[#c5a059]/20 rounded text-center text-xs py-0.5 text-stone-200" placeholder="cm" />
                                </div>
                                <div>
                                    <label className="text-[7px] text-stone-500 uppercase block mb-0.5">Braço</label>
                                    <input type="number" step="0.1" value={newBiceps} onChange={(e) => setNewBiceps(e.target.value)} className="w-full bg-[#121118] border border-[#c5a059]/20 rounded text-center text-xs py-0.5 text-stone-200" placeholder="cm" />
                                </div>
                                <div>
                                    <label className="text-[7px] text-stone-500 uppercase block mb-0.5">Cintura</label>
                                    <input type="number" step="0.1" value={newWaist} onChange={(e) => setNewWaist(e.target.value)} className="w-full bg-[#121118] border border-[#c5a059]/20 rounded text-center text-xs py-0.5 text-stone-200" placeholder="cm" />
                                </div>
                                <div>
                                    <label className="text-[7px] text-stone-500 uppercase block mb-0.5">Quadril</label>
                                    <input type="number" step="0.1" value={newHips} onChange={(e) => setNewHips(e.target.value)} className="w-full bg-[#121118] border border-[#c5a059]/20 rounded text-center text-xs py-0.5 text-stone-200" placeholder="cm" />
                                </div>
                            </div>
                            <button type="submit" className="w-full py-1.5 bg-[#c5a059]/10 hover:bg-[#c5a059]/20 border border-[#c5a059]/40 text-stone-200 rounded font-display text-[9px] uppercase tracking-wider transition-colors cursor-pointer">
                                Salvar Medidas
                            </button>
                        </form>

                        {/* List measures */}
                        <div className="space-y-2">
                            <span className="text-[10px] uppercase font-bold text-[#c5a059] block">Histórico de Registros ({gymMeasures.length})</span>
                            {gymMeasures.length === 0 ? (
                                <p className="text-[10px] text-stone-500 italic py-4 text-center">Nenhum registro de medida adicionado.</p>
                            ) : (
                                gymMeasures.map((m) => (
                                    <div key={m.id} className="p-2 border border-[#c5a059]/15 bg-[#1c1a24]/30 rounded-xl flex items-center justify-between text-[9.5px]">
                                        <div className="text-left space-y-0.5">
                                            <div className="flex gap-2 items-center">
                                                <span className="font-bold text-amber-200">{m.date}</span>
                                                <span className="text-[#c5a059] font-bold font-mono">Peso: {m.weight} kg</span>
                                            </div>
                                            <div className="flex gap-3 text-stone-400">
                                                {m.chest && <span>Peito: {m.chest}cm</span>}
                                                {m.biceps && <span>Braço: {m.biceps}cm</span>}
                                                {m.waist && <span>Cintura: {m.waist}cm</span>}
                                                {m.hips && <span>Quadril: {m.hips}cm</span>}
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => deleteGymMeasureLocal(m.id)} className="text-stone-500 hover:text-red-400 p-0.5 transition-colors cursor-pointer">
                                            <span className="material-icons text-xs">delete</span>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* 3. PROGRESS GRAPH TAB */}
                {treinadorTab === "progress" && (
                    <div>
                        {renderProgressChart()}

                        {/* Body composition breakdown summary */}
                        <div className="bg-[#1c1a24]/30 border border-[#c5a059]/15 rounded-xl p-3 text-left space-y-2">
                            <span className="text-[9px] uppercase tracking-wider font-bold text-[#c5a059] block">Resumo Gravl Nous</span>
                            {gymMeasures.length > 0 ? (
                                <div className="space-y-1 text-[10px] text-stone-300">
                                    <div className="flex justify-between border-b border-stone-900 pb-1">
                                        <span>Peso inicial:</span>
                                        <span className="font-bold">{gymMeasures[0].weight} kg</span>
                                    </div>
                                    <div className="flex justify-between border-b border-stone-900 pb-1">
                                        <span>Peso atual:</span>
                                        <span className="font-bold">{gymMeasures[gymMeasures.length - 1].weight} kg</span>
                                    </div>
                                    <div className="flex justify-between border-b border-stone-900 pb-1">
                                        <span>Evolução total:</span>
                                        <span className={`font-bold ${gymMeasures[gymMeasures.length - 1].weight - gymMeasures[0].weight <= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                                            {(gymMeasures[gymMeasures.length - 1].weight - gymMeasures[0].weight).toFixed(1)} kg
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-[9px] text-stone-500 italic">Insira registros para compor seu histórico.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderMordomoApp = () => {
        // Add transaction
        const handleAddTx = (e: React.FormEvent) => {
            e.preventDefault();
            const amt = parseFloat(newTxAmount);
            if (isNaN(amt) || !newTxDescription || !newTxDate) return;
            const newT: FinancialTransaction = {
                id: Math.random().toString(36).substring(2, 9),
                date: newTxDate,
                description: newTxDescription,
                amount: amt,
                type: newTxType,
                category: newTxCategory
            };
            saveTransactionLocal(newT);
            setNewTxDescription("");
            setNewTxAmount("");
            setNewTxDate("");
        };

        // Financial metrics
        const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
        const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
        const netBalance = totalIncome - totalExpenses;

        const budgetPercentage = Math.min(100, (totalExpenses / (mordomoBudgetLimit || 1)) * 100);

        return (
            <div className="flex-1 flex flex-col h-full overflow-y-auto pr-1 text-stone-200">
                <div className="border-b border-[#c5a059]/20 pb-3 mb-4">
                    <h3 className="font-display text-sm font-bold text-[#c5a059] uppercase tracking-wider">💰 Contas do Mordomo</h3>
                    <p className="text-[9px] text-stone-400 italic">“O reino prospera quando o tesouro imperial é gerido com exatidão.”</p>
                </div>

                {/* Metrics boxes */}
                <div className="grid grid-cols-3 gap-1.5 mb-4 text-center select-none">
                    <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-2">
                        <span className="text-[7.5px] uppercase font-bold text-emerald-400 block mb-0.5">Receitas</span>
                        <span className="font-mono text-xs font-bold text-emerald-300">+{totalIncome.toFixed(0)}💰</span>
                    </div>
                    <div className="bg-red-950/20 border border-red-800/40 rounded-xl p-2">
                        <span className="text-[7.5px] uppercase font-bold text-red-400 block mb-0.5">Despesas</span>
                        <span className="font-mono text-xs font-bold text-red-300">-{totalExpenses.toFixed(0)}💰</span>
                    </div>
                    <div className={`border rounded-xl p-2 ${netBalance >= 0 ? "bg-emerald-950/20 border-emerald-850" : "bg-red-950/20 border-red-850"}`}>
                        <span className="text-[7.5px] uppercase font-bold block mb-0.5 text-[#c5a059]">Saldo</span>
                        <span className={`font-mono text-xs font-bold ${netBalance >= 0 ? "text-emerald-300" : "text-red-300"}`}>{netBalance.toFixed(0)}💰</span>
                    </div>
                </div>

                {/* Budget Limit gauge */}
                <div className="bg-[#1c1a24]/30 border border-[#c5a059]/15 rounded-xl p-3 mb-4 text-left">
                    <div className="flex justify-between items-center text-[8px] uppercase tracking-wider font-bold mb-1.5">
                        <span className="text-[#c5a059]">Limite de Despesas Imperial</span>
                        <span className="text-stone-400">{totalExpenses.toFixed(0)} / {mordomoBudgetLimit}💰</span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-2.5 bg-black rounded-full border border-stone-800 overflow-hidden relative">
                        <div 
                            className={`h-full transition-all duration-700 ${budgetPercentage >= 90 ? "bg-red-600" : budgetPercentage >= 70 ? "bg-amber-600" : "bg-emerald-600"}`} 
                            style={{ width: `${budgetPercentage}%` }}
                        ></div>
                    </div>
                    {budgetPercentage >= 90 && (
                        <span className="text-[7.5px] text-red-400 font-bold block mt-1 uppercase">🚨 ALERTA: Orçamento quase esgotado!</span>
                    )}
                </div>

                {/* Form to insert transaction */}
                <form onSubmit={handleAddTx} className="bg-black/40 border border-[#c5a059]/10 rounded-xl p-3 mb-4 space-y-3">
                    <span className="text-[9px] uppercase font-bold text-[#c5a059] block">Novo Registro de Transação</span>
                    <input type="text" placeholder="Descrição (ex: Compra de Escudos)" value={newTxDescription} onChange={(e) => setNewTxDescription(e.target.value)} className="w-full bg-[#121118] border border-[#c5a059]/30 rounded px-2 py-1 text-xs text-stone-200 focus:outline-none" required />
                    <div className="grid grid-cols-2 gap-2">
                        <input type="number" min="1" placeholder="Valor (Moedas 💰)" value={newTxAmount} onChange={(e) => setNewTxAmount(e.target.value)} className="bg-[#121118] border border-[#c5a059]/30 rounded px-2 py-1 text-xs text-stone-200 focus:outline-none" required />
                        <input type="date" value={newTxDate} onChange={(e) => setNewTxDate(e.target.value)} className="bg-[#121118] border border-[#c5a059]/30 rounded px-2 py-1 text-xs text-stone-200 focus:outline-none" required />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <select value={newTxType} onChange={(e) => setNewTxType(e.target.value)} className="bg-[#121118] border border-[#c5a059]/30 rounded px-2 py-1 text-[11px] text-stone-200">
                            <option value="expense">Despesa 💸</option>
                            <option value="income">Receita 📈</option>
                        </select>
                        <select value={newTxCategory} onChange={(e) => setNewTxCategory(e.target.value)} className="bg-[#121118] border border-[#c5a059]/30 rounded px-2 py-1 text-[11px] text-stone-200">
                            <option value="Castelo">Castelo 🏰</option>
                            <option value="Impostos">Tributos/Impostos 👑</option>
                            <option value="Alimentação">Alimentação 🥩</option>
                            <option value="Equipamentos">Armas/Batalha ⚔️</option>
                            <option value="Outros">Outros 🗝️</option>
                        </select>
                    </div>
                    <button type="submit" className="w-full py-1.5 bg-[#c5a059]/10 hover:bg-[#c5a059]/20 border border-[#c5a059]/40 text-stone-200 rounded font-display text-[9px] uppercase tracking-wider transition-colors cursor-pointer">
                        Lançar no Livro de Contas
                    </button>
                </form>

                {/* Transactions list */}
                <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-[#c5a059] block">Livro de Contas ({transactions.length})</span>
                    {transactions.length === 0 ? (
                        <p className="text-[10px] text-stone-500 italic py-4 text-center">Nenhuma transação anotada no livro.</p>
                    ) : (
                        transactions.map((tx) => (
                            <div key={tx.id} className={`p-2.5 border rounded-xl flex items-center justify-between text-left ${tx.type === 'income' ? 'bg-emerald-950/10 border-emerald-900/30' : 'bg-red-950/10 border-red-900/30'}`}>
                                <div className="text-left space-y-0.5">
                                    <span className="text-xs font-semibold text-[#eae3d5] block">{tx.description}</span>
                                    <div className="flex gap-2 items-center text-[8.5px]">
                                        <span className="text-[#c5a059] font-semibold">{tx.date}</span>
                                        <span className="text-stone-500">•</span>
                                        <span className="text-stone-400">{tx.category}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`font-mono text-xs font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {tx.type === 'income' ? '+' : '-'}{tx.amount}💰
                                    </span>
                                    <button type="button" onClick={() => deleteTransactionLocal(tx.id)} className="text-stone-500 hover:text-red-400 p-0.5 transition-colors cursor-pointer">
                                        <span className="material-icons text-xs">delete</span>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    const renderMedicoApp = () => {
        const handleDocSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            if (!medDocName || !medDocText) return;
            
            setIsScanningDoc(true);
            setScannedAnalysisResult(null);

            setTimeout(() => {
                setIsScanningDoc(false);
                // Mock analysis logic based on keywords
                let analysisText = "";
                const lowerText = medDocText.toLowerCase();

                if (lowerText.includes("glicose") || lowerText.includes("açúcar")) {
                    analysisText = "Hemoglobina Glicada/Glicose: Seus níveis aparentam estabilidade na amostragem medieval. Recomenda-se cautela com a ingestão excessiva de hidratos de carbono refinados (doces e massas) e incentivo a caminhadas após desjejum.";
                } else if (lowerText.includes("colesterol") || lowerText.includes("ldl") || lowerText.includes("hdl")) {
                    analysisText = "Frações de Colesterol: Níveis lipídicos sob vigilância. Indica-se fortificar a ingestão de óleos nobres prensados (sementes e azeitonas) e mitigar o consumo de gorduras saturadas animais em excesso.";
                } else if (lowerText.includes("pressão") || lowerText.includes("hipertens")) {
                    analysisText = "Cardiovascular: Atenção aos níveis tensiométricos. Reduza a adição de cristais de cloreto de sódio (sal comum) nas provisões e garanta sono de qualidade restauradora de 7-8 horas diárias.";
                } else {
                    analysisText = "Hemograma Geral: Análise geral de elementos hematológicos sem desvios graves aparentes. Manter boa hidratação de 2.5 litros de fluidos puros por ciclo diário e exercitar o corpo vigorosamente.";
                }

                const newD: MedicalDocument = {
                    id: Math.random().toString(36).substring(2, 9),
                    date: new Date().toISOString().split("T")[0],
                    filename: medDocName.endsWith(".pdf") || medDocName.endsWith(".png") ? medDocName : `${medDocName}.pdf`,
                    textContent: medDocText,
                    aiAnalysis: analysisText
                };

                saveMedicalDocumentLocal(newD);
                setScannedAnalysisResult(analysisText);
                setMedDocName("");
                setMedDocText("");
            }, 2000);
        };

        return (
            <div className="flex-1 flex flex-col h-full overflow-y-auto pr-1 text-stone-200">
                <div className="border-b border-[#c5a059]/20 pb-3 mb-4">
                    <h3 className="font-display text-sm font-bold text-[#c5a059] uppercase tracking-wider">⚕️ Ficha do Médico</h3>
                    <p className="text-[9px] text-stone-400 italic">“Mantenha a vitalidade e a harmonia entre o corpo físico e o metasistema mental.”</p>
                </div>

                {/* 1. ETHICAL DISCLAIMER (CANNOT BE REMOVED) */}
                <div className="bg-[#7a1e1e]/15 border border-[#7a1e1e]/50 rounded-2xl p-3.5 mb-4 text-left shadow-lg">
                    <div className="flex gap-2 items-center mb-1 text-red-300">
                        <span className="material-icons text-sm">warning</span>
                        <span className="text-[8.5px] uppercase tracking-widest font-bold font-display">Isenção de Responsabilidade e Termo Ético</span>
                    </div>
                    <p className="text-[8.5px] leading-relaxed text-[#eee8dc]/85 italic">
                        Este aplicativo tem propósito estritamente educacional, informacional e de registros pessoais de vitalidade. É **TERMINANTEMENTE PROIBIDO** utilizar este sistema como substituto para consultas médicas presenciais, exames formais ou aconselhamento clínico profissional. **JAMAIS** ignore, postergue ou substitua o diagnóstico de um médico devidamente registrado devido a análises feitas aqui. O autodiagnóstico sem supervisão clínica expõe a saúde a riscos severos.
                    </p>
                    {!ethicalDisclaimerAccepted && (
                        <button 
                            type="button" 
                            onClick={() => setEthicalDisclaimerAccepted(true)}
                            className="mt-2.5 w-full py-1 bg-red-900/30 hover:bg-red-900/50 border border-red-600/50 text-white rounded font-display text-[7.5px] uppercase tracking-wider cursor-pointer"
                        >
                            Compreendo e Aceito o Termo Ético
                        </button>
                    )}
                </div>

                {ethicalDisclaimerAccepted && (
                    <div className="space-y-4">
                        {/* Simulated examen uploader */}
                        <form onSubmit={handleDocSubmit} className="bg-black/40 border border-[#c5a059]/10 rounded-xl p-3 space-y-3">
                            <span className="text-[9px] uppercase font-bold text-[#c5a059] block">Novo Laudo / Receita para Análise</span>
                            <input type="text" placeholder="Nome do Documento (ex: Exame de Sangue Maio)" value={medDocName} onChange={(e) => setMedDocName(e.target.value)} className="w-full bg-[#121118] border border-[#c5a059]/30 rounded px-2.5 py-1 text-xs text-stone-200" required />
                            <div>
                                <label className="text-[8px] text-stone-500 uppercase block mb-1">Copiar/Digitar Conteúdo Clínico do Exame</label>
                                <textarea rows={3} placeholder="Cole aqui os dados textuais do laudo (ex: Glicose: 92 mg/dL, Colesterol: 180...)" value={medDocText} onChange={(e) => setMedDocText(e.target.value)} className="w-full bg-[#121118] border border-[#c5a059]/30 rounded p-2 text-xs text-stone-200 focus:outline-none" required />
                            </div>

                            <button type="submit" disabled={isScanningDoc} className="w-full py-1.5 bg-[#c5a059]/10 hover:bg-[#c5a059]/20 border border-[#c5a059]/40 text-stone-200 rounded font-display text-[9px] uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-40">
                                {isScanningDoc ? "Analisando Exame com IA..." : "Fazer Upload & Analisar"}
                            </button>
                        </form>

                        {/* Analysis visual response */}
                        {isScanningDoc && (
                            <div className="flex flex-col items-center justify-center p-4 bg-black/60 border border-amber-600/35 rounded-xl animate-pulse">
                                <div className="w-8 h-8 rounded-full border border-amber-600/30 border-t-amber-600 animate-spin mb-2"></div>
                                <span className="text-[8px] text-amber-500 uppercase font-bold">O Médico Nous está revisando seu documento...</span>
                            </div>
                        )}

                        {scannedAnalysisResult && (
                            <div className="bg-[#1c1a24]/30 border border-emerald-600/30 rounded-xl p-3 text-left">
                                <div className="flex gap-2 items-center text-emerald-400 mb-1">
                                    <span className="material-icons text-xs">analytics</span>
                                    <span className="text-[8px] uppercase tracking-widest font-bold">Orientação Emitida pelo Médico Nous</span>
                                </div>
                                <p className="text-[9.5px] leading-relaxed text-stone-300">{scannedAnalysisResult}</p>
                            </div>
                        )}

                        {/* Uploaded Documents List */}
                        <div className="space-y-2">
                            <span className="text-[10px] uppercase font-bold text-[#c5a059] block">Laudos e Prescrições Salvas ({medicalDocs.length})</span>
                            {medicalDocs.length === 0 ? (
                                <p className="text-[10px] text-stone-500 italic py-4 text-center">Nenhum exame ou receita anexada.</p>
                            ) : (
                                medicalDocs.map((doc) => (
                                    <div key={doc.id} className="p-3 border border-[#c5a059]/15 bg-[#1c1a24]/30 rounded-xl space-y-2 text-left">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <span className="text-base">📄</span>
                                                <div>
                                                    <span className="text-xs font-semibold text-[#eae3d5] block">{doc.filename}</span>
                                                    <span className="text-[8px] text-[#c5a059]">{doc.date}</span>
                                                </div>
                                            </div>
                                            <button type="button" onClick={() => deleteMedicalDocumentLocal(doc.id)} className="text-stone-500 hover:text-red-400 p-0.5 transition-colors cursor-pointer shrink-0">
                                                <span className="material-icons text-xs">delete</span>
                                            </button>
                                        </div>
                                        {doc.aiAnalysis && (
                                            <div className="p-2 bg-black/40 rounded border border-stone-850 text-[9px] leading-relaxed text-stone-400 italic">
                                                <span className="font-bold text-[#c5a059] block not-italic uppercase text-[7.5px] mb-0.5">Laudo Analítico:</span>
                                                {doc.aiAnalysis}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderIFrameApp = (src: string, compact: boolean) => {
        return (
            <div className={`w-full flex-1 flex flex-col rounded-xl overflow-hidden border border-[#c5a059]/20 bg-black/60 shadow-inner ${compact ? "h-[300px] min-h-[300px]" : "h-[500px] min-h-[400px] sm:min-h-[480px] md:min-h-[520px]"}`}>
                <iframe 
                    src={src} 
                    className="w-full h-full border-0 rounded-xl"
                    title="Sovereign App"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
            </div>
        );
    };

    const renderUnifiedApp = (appId: string, compact: boolean) => {
        switch (appId) {
            case "arauto":
                return renderAgendaApp(compact);
            case "timer":
                return renderTimerApp();
            case "treinador":
                return renderTreinadorApp();
            case "mordomo":
                return renderMordomoApp();
            case "medico":
                return renderMedicoApp();
            case "oracle":
                return renderIFrameApp("/space/games/oracle?embed=true", compact);
            case "solitaire":
                return renderIFrameApp("/space/games/solitaire?embed=true", compact);
            case "chess":
                return renderIFrameApp("/space/games/chess?embed=true", compact);
            default:
                return (
                    <div className="text-center py-10">
                        <span className="material-icons text-2xl text-red-500 animate-bounce">construction</span>
                        <p className="text-xs mt-2">Aplicativo desconhecido no sistema.</p>
                    </div>
                );
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
                    from { transform: scale(0.92); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-scale-up {
                    animation: scale-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.35s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
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
                            Sovereign OS v1.5 - Multi-App
                        </span>
                        
                        {/* Title Row with standard layout icon-only button */}
                        <div className="flex items-center justify-center gap-4">
                            <h1 className="font-display text-4xl uppercase tracking-widest text-[#c5a059]">
                                {t("dominios")}
                            </h1>
                            <button
                                type="button"
                                onClick={enterFullscreen}
                                title={language.startsWith("pt") ? "Expandir Sistema (Tela Cheia)" : "Expand System (Fullscreen)"}
                                className="flex items-center justify-center rounded-lg border border-[#c5a059]/40 bg-black/45 w-10 h-10 text-[#c5a059] transition-all hover:border-[#c5a059] hover:bg-[#c5a059]/10 cursor-pointer font-bold"
                            >
                                <span className="material-icons text-xl">open_in_full</span>
                            </button>
                        </div>
                        
                        <p className="font-body text-base italic text-[#c5a059]/60 max-w-xl mx-auto leading-relaxed">
                            {language.startsWith("pt") 
                                ? "Ative os canais da sua mente e navegue pelos domínios e aplicativos integrados que regem o seu próprio metasistema de consciência." 
                                : "Activate the channels of your mind and navigate the integrated domains and applications governing your own metasystem of consciousness."}
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
                            
                            {/* DB Sinc Indicator */}
                            <div className="flex items-center gap-1.5 bg-black/60 px-3 py-1 rounded-full border border-stone-850 text-[8px] uppercase tracking-widest text-stone-400 font-bold font-mono select-none">
                                <span className={`w-1.5 h-1.5 rounded-full ${dbSyncStatus === 'synced' ? 'bg-emerald-500 animate-pulse' : dbSyncStatus === 'syncing' ? 'bg-amber-500 animate-spin' : 'bg-stone-500'}`}></span>
                                {dbSyncStatus === 'synced' ? 'Cloud Sync' : dbSyncStatus === 'syncing' ? 'Syncing...' : 'Local Cache'}
                            </div>

                            {/* Close button */}
                            <button
                                type="button"
                                onClick={exitFullscreen}
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
                                /* Fullscreen app details display */
                                <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col justify-between animate-fade-in py-2 text-left overflow-y-auto pr-1">
                                    {renderUnifiedApp(selectedApp, false)}
                                    <div className="pt-4 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedApp(null)}
                                            className="cursor-pointer border border-[#c5a059]/40 bg-[#c5a059]/10 hover:bg-[#c5a059]/20 px-6 py-2 rounded-xl font-display text-[9px] uppercase tracking-widest text-[#fde68a] hover:text-white transition-all font-semibold"
                                        >
                                            {language.startsWith("pt") ? "← Retornar ao OS" : "← Return to OS"}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* Fullscreen Grid of apps */
                                <div className="w-full flex flex-col justify-between py-6 relative">
                                    <div className={`grid gap-8 w-full px-4 max-w-5xl mx-auto grid-cols-2 max-w-xs sm:grid-cols-5 sm:max-w-5xl`}>
                                        {getOrderedDomains().map((app) => (
                                            <div
                                                key={app.id}
                                                data-app-id={app.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, app.id)}
                                                onDragOver={(e) => handleDragOver(e, app.id)}
                                                onDrop={(e) => handleDrop(e, app.id)}
                                                onDragEnd={handleDragEnd}
                                                onPointerDown={(e) => handlePointerDown(e, app.id)}
                                                onPointerMove={handlePointerMove}
                                                onPointerUp={handlePointerUp}
                                                onClick={() => !longPressActive.current && handleAppClick(app.id)}
                                                className={`flex flex-col items-center group cursor-grab active:cursor-grabbing bg-black/40 border p-6 rounded-2xl transition-all duration-200 hover:shadow-[0_0_30px_rgba(197,160,89,0.15)] select-none touch-none
                                                    ${dragOverId === app.id && dragSourceId !== app.id ? "border-[#c5a059] shadow-[0_0_20px_rgba(197,160,89,0.4)] scale-105" : "border-[#c5a059]/20 hover:border-[#c5a059]"}
                                                    ${dragSourceId === app.id ? "opacity-40 scale-95" : "opacity-100"}`}
                                                style={{ touchAction: "none" }}
                                            >
                                                <div className="app-icon-jiggle w-20 h-20 bg-gradient-to-br from-[#1c1a24] via-[#0b0a0f] to-[#121017] border-2 border-[#c5a059]/40 rounded-3xl flex items-center justify-center text-4xl shadow-[0_8px_20px_rgba(0,0,0,0.7)] transition-all duration-300 group-hover:scale-105 relative overflow-hidden mb-4">
                                                    <div className="absolute inset-1.5 rounded-[1.2rem] border border-[#c5a059]/10"></div>
                                                    <span className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)] relative z-10">{app.emoji}</span>
                                                </div>
                                                <span className="text-[10px] uppercase tracking-[0.2em] text-[#c5a059]/80 group-hover:text-[#fde68a] font-display text-center font-bold">
                                                    {app.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Recents overlay panel */}
                        {showRecents && (
                            <div
                                className="absolute inset-0 z-50 flex items-end justify-end pointer-events-auto animate-fade-in"
                                onClick={() => setShowRecents(false)}
                            >
                                <div
                                    className="relative h-full w-72 bg-black/90 border-l border-[#c5a059]/20 backdrop-blur-2xl flex flex-col p-6 gap-4 shadow-[-20px_0_60px_rgba(0,0,0,0.8)] animate-slide-in-right"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] uppercase tracking-widest text-[#c5a059] font-bold">Apps Recentes</span>
                                        <button type="button" onClick={() => setShowRecents(false)} className="text-stone-500 hover:text-stone-300 text-lg cursor-pointer">×</button>
                                    </div>
                                    {appHistory.length === 0 ? (
                                        <p className="text-[10px] text-stone-500 italic text-center mt-8">Nenhum app aberto recentemente.</p>
                                    ) : (
                                        <div className="flex flex-col gap-3 overflow-y-auto">
                                            {appHistory.map((appId) => {
                                                const a = DOMAINS.find(d => d.id === appId);
                                                if (!a) return null;
                                                return (
                                                    <button
                                                        key={appId}
                                                        type="button"
                                                        onClick={() => { setShowRecents(false); handleAppClick(appId); }}
                                                        className="flex items-center gap-3 p-3 rounded-xl border border-[#c5a059]/15 bg-white/5 hover:bg-[#c5a059]/10 hover:border-[#c5a059]/40 transition-all cursor-pointer text-left group"
                                                    >
                                                        <div className="w-12 h-12 bg-gradient-to-br from-[#1c1a24] to-[#0b0a0f] border border-[#c5a059]/30 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
                                                            {a.emoji}
                                                        </div>
                                                        <div className="flex-1 overflow-hidden">
                                                            <p className="text-xs font-bold text-[#eae3d5] group-hover:text-[#fde68a] truncate">{a.title}</p>
                                                            <p className="text-[9px] text-stone-500 uppercase tracking-wider">{a.developer}</p>
                                                        </div>
                                                        <span className="material-icons text-xs text-[#c5a059]/40">chevron_right</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {appHistory.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => { setAppHistory([]); setShowRecents(false); }}
                                            className="mt-auto text-[9px] uppercase tracking-wider text-stone-600 hover:text-red-400 cursor-pointer transition-colors text-center"
                                        >
                                            Limpar Histórico
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Bottom OS Bar — Android-style Navigation */}
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="glass-medieval rounded-2xl px-6 py-3 border border-[#c5a059]/20 bg-black/60 backdrop-blur-md flex justify-around gap-10 items-center select-none max-w-xs w-full mx-auto">
                                {/* Back */}
                                <button
                                    type="button"
                                    onClick={handleNavBack}
                                    title="Voltar"
                                    className="flex flex-col items-center gap-1 group cursor-pointer opacity-60 hover:opacity-100 transition-all"
                                >
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-[#c5a059] group-hover:text-[#fde68a] transition-colors">
                                        <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </button>
                                {/* Home */}
                                <button
                                    type="button"
                                    onClick={handleNavHome}
                                    title="Área de trabalho"
                                    className="flex flex-col items-center gap-1 group cursor-pointer opacity-60 hover:opacity-100 transition-all"
                                >
                                    <div className="w-5 h-5 rounded-full border-2 border-[#c5a059] group-hover:border-[#fde68a] group-hover:shadow-[0_0_12px_rgba(197,160,89,0.6)] transition-all" />
                                </button>
                                {/* Recents */}
                                <button
                                    type="button"
                                    onClick={handleNavRecents}
                                    title="Apps recentes"
                                    className={`flex flex-col items-center gap-1 group cursor-pointer transition-all ${
                                        showRecents ? "opacity-100" : "opacity-60 hover:opacity-100"
                                    }`}
                                >
                                    <div className={`w-5 h-5 rounded-sm border-2 transition-all ${
                                        showRecents
                                            ? "border-[#fde68a] shadow-[0_0_12px_rgba(253,230,138,0.5)]"
                                            : "border-[#c5a059] group-hover:border-[#fde68a]"
                                    }`} />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ADAPTIVE CONTAINER DEVICE MINIATURE MOCKUPS (Smartphone, Tablet, or Widescreen Desktop Mockup) */
                    <div className="relative flex flex-col items-center justify-center">
                        
                        {/* PHONE MOCKUP FRAME */}
                        {deviceType === "phone" && (
                            <div className="relative w-[320px] aspect-[9/18.8] bg-black border-[6px] border-[#c5a059]/60 rounded-[3rem] shadow-[0_25px_60px_rgba(0,0,0,0.85)] flex flex-col p-3 pb-4 overflow-hidden select-none">
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
                                <div className="flex-1 rounded-[2rem] overflow-hidden relative bg-[#090a0f] flex flex-col justify-between p-4 border border-[#c5a059]/5 z-10 max-h-full">
                                    <div className="absolute inset-0 bg-radial-gradient from-indigo-950/20 via-black to-black z-0 pointer-events-none"></div>
                                    <div className="absolute top-[-30%] left-[-30%] w-[160%] h-[160%] bg-[url('https://images.unsplash.com/photo-1510519138101-570d1dca3d66?q=80&w=600')] bg-cover bg-center opacity-10 blur-xl pointer-events-none"></div>

                                    {loadingApp ? (
                                        <div className="flex-1 flex flex-col items-center justify-center z-10 animate-fade-in">
                                            <div className="w-10 h-10 rounded-full border border-[#c5a059]/20 border-t-[#c5a059] animate-spin mb-3"></div>
                                            <span className="font-display text-[8px] tracking-wider text-[#c5a059] uppercase">{loadingTexts[loadingTextIndex]}</span>
                                        </div>
                                    ) : selectedApp && currentApp ? (
                                        <div className="flex-1 flex flex-col justify-between z-10 animate-fade-in py-1 text-left overflow-y-auto pr-0.5">
                                            {renderUnifiedApp(selectedApp, true)}
                                            <button type="button" onClick={() => setSelectedApp(null)} className="w-full border border-[#c5a059]/40 bg-[#c5a059]/10 px-3 py-2 rounded-lg font-display text-[8px] uppercase tracking-wider text-[#fde68a] mt-3 cursor-pointer">Fechar App</button>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col justify-between z-10 animate-fade-in pt-3">
                                            <p className="font-display text-[8px] uppercase tracking-widest text-[#c5a059]/40 text-center mb-4">Grimório de Bolso</p>
                                            <div className="grid grid-cols-2 gap-x-3 gap-y-4 px-1 max-h-[300px] overflow-y-auto pr-0.5">
                                                {getOrderedDomains().map((app) => (
                                                    <div
                                                        key={app.id}
                                                        data-app-id={app.id}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, app.id)}
                                                        onDragOver={(e) => handleDragOver(e, app.id)}
                                                        onDrop={(e) => handleDrop(e, app.id)}
                                                        onDragEnd={handleDragEnd}
                                                        onPointerDown={(e) => handlePointerDown(e, app.id)}
                                                        onPointerMove={handlePointerMove}
                                                        onPointerUp={handlePointerUp}
                                                        onClick={() => !longPressActive.current && handleAppClick(app.id)}
                                                        className={`flex flex-col items-center group cursor-grab active:cursor-grabbing select-none touch-none transition-all duration-150
                                                            ${dragOverId === app.id && dragSourceId !== app.id ? "scale-110" : ""}
                                                            ${dragSourceId === app.id ? "opacity-40" : "opacity-100"}`}
                                                        style={{ touchAction: "none" }}
                                                    >
                                                        <div className="app-icon-jiggle w-14 h-14 bg-gradient-to-br from-[#1c1a24] via-[#0b0a0f] to-[#121017] border border-[#c5a059]/30 rounded-xl flex items-center justify-center text-2xl relative shadow-md">
                                                            <span>{app.emoji}</span>
                                                        </div>
                                                        <span className="text-[7.5px] uppercase tracking-wider text-[#c5a059]/80 mt-1">{app.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            {/* Phone nav bar */}
                                            <div className="glass-medieval rounded-xl px-4 py-2 border border-[#c5a059]/15 bg-black/60 flex justify-around items-center select-none mt-4">
                                                <button type="button" onClick={handleNavBack} className="p-1 opacity-60 hover:opacity-100 cursor-pointer">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="#c5a059" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                </button>
                                                <button type="button" onClick={handleNavHome} className="opacity-60 hover:opacity-100 cursor-pointer">
                                                    <div className="w-4 h-4 rounded-full border-2 border-[#c5a059]" />
                                                </button>
                                                <button type="button" onClick={handleNavRecents} className={`cursor-pointer transition-opacity ${showRecents ? "opacity-100" : "opacity-60 hover:opacity-100"}`}>
                                                    <div className={`w-4 h-4 rounded-sm border-2 ${showRecents ? "border-[#fde68a]" : "border-[#c5a059]"}`} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="h-1 w-20 bg-[#c5a059]/20 rounded-full mx-auto mt-2 select-none"></div>
                            </div>
                        )}

                        {/* TABLET MOCKUP FRAME */}
                        {deviceType === "tablet" && (
                            <div className="relative w-[480px] sm:w-[520px] aspect-[3/4] bg-black border-[8px] border-[#c5a059]/60 rounded-[2.5rem] shadow-[0_25px_60px_rgba(0,0,0,0.85)] flex flex-col p-4 pb-5 overflow-hidden select-none">
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
                                <div className="flex-1 rounded-[1.8rem] overflow-hidden relative bg-[#090a0f] flex flex-col justify-between p-5 border border-[#c5a059]/5 z-10 max-h-full">
                                    <div className="absolute inset-0 bg-radial-gradient from-indigo-950/20 via-black to-black z-0 pointer-events-none"></div>
                                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1510519138101-570d1dca3d66?q=80&w=600')] bg-cover bg-center opacity-10 blur-xl pointer-events-none"></div>

                                    {loadingApp ? (
                                        <div className="flex-1 flex flex-col items-center justify-center z-10 animate-fade-in">
                                            <div className="w-12 h-12 rounded-full border-2 border-[#c5a059]/20 border-t-[#c5a059] animate-spin mb-4"></div>
                                            <span className="font-display text-[9px] tracking-wider text-[#c5a059] uppercase">{loadingTexts[loadingTextIndex]}</span>
                                        </div>
                                    ) : selectedApp && currentApp ? (
                                        <div className="flex-1 flex flex-col justify-between z-10 animate-fade-in py-2 text-left overflow-y-auto pr-0.5">
                                            {renderUnifiedApp(selectedApp, false)}
                                            <button type="button" onClick={() => setSelectedApp(null)} className="w-full border border-[#c5a059]/40 bg-[#c5a059]/10 hover:bg-[#c5a059]/20 px-4 py-2.5 rounded-xl font-display text-[9px] uppercase tracking-wider text-[#fde68a] mt-3 cursor-pointer">← Fechar Aplicativo</button>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col justify-between z-10 animate-fade-in pt-4">
                                            <p className="font-display text-[9px] uppercase tracking-widest text-[#c5a059]/40 text-center mb-6">Grimório de Bolso - Modo Tablet</p>
                                            <div className="grid grid-cols-3 gap-x-6 gap-y-6 px-4 max-h-[360px] overflow-y-auto pr-0.5">
                                                {getOrderedDomains().map((app) => (
                                                    <div
                                                        key={app.id}
                                                        data-app-id={app.id}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, app.id)}
                                                        onDragOver={(e) => handleDragOver(e, app.id)}
                                                        onDrop={(e) => handleDrop(e, app.id)}
                                                        onDragEnd={handleDragEnd}
                                                        onPointerDown={(e) => handlePointerDown(e, app.id)}
                                                        onPointerMove={handlePointerMove}
                                                        onPointerUp={handlePointerUp}
                                                        onClick={() => !longPressActive.current && handleAppClick(app.id)}
                                                        className={`flex flex-col items-center group cursor-grab active:cursor-grabbing select-none touch-none transition-all duration-150
                                                            ${dragOverId === app.id && dragSourceId !== app.id ? "scale-110" : ""}
                                                            ${dragSourceId === app.id ? "opacity-40" : "opacity-100"}`}
                                                        style={{ touchAction: "none" }}
                                                    >
                                                        <div className="app-icon-jiggle w-16 h-16 bg-gradient-to-br from-[#1c1a24] via-[#0b0a0f] to-[#121017] border-2 border-[#c5a059]/40 rounded-2xl flex items-center justify-center text-3xl shadow-md transition-all">
                                                            <span>{app.emoji}</span>
                                                        </div>
                                                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#c5a059]/80 mt-2">{app.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            {/* Tablet nav bar */}
                                            <div className="glass-medieval rounded-2xl px-6 py-2.5 border border-[#c5a059]/15 bg-black/60 flex justify-around items-center select-none mt-8 max-w-xs w-full mx-auto">
                                                <button type="button" onClick={handleNavBack} className="p-1 opacity-60 hover:opacity-100 cursor-pointer">
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="#c5a059" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                </button>
                                                <button type="button" onClick={handleNavHome} className="opacity-60 hover:opacity-100 cursor-pointer">
                                                    <div className="w-5 h-5 rounded-full border-2 border-[#c5a059]" />
                                                </button>
                                                <button type="button" onClick={handleNavRecents} className={`cursor-pointer transition-opacity ${showRecents ? "opacity-100" : "opacity-60 hover:opacity-100"}`}>
                                                    <div className={`w-5 h-5 rounded-sm border-2 ${showRecents ? "border-[#fde68a]" : "border-[#c5a059]"}`} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="h-1 w-24 bg-[#c5a059]/20 rounded-full mx-auto mt-2.5 select-none"></div>
                            </div>
                        )}

                        {/* DESKTOP MOCKUP FRAME */}
                        {deviceType === "desktop" && (
                            <div className="relative w-[750px] md:w-[820px] aspect-[16/10] bg-black border-[10px] border-[#c5a059]/60 rounded-[2.5rem] shadow-[0_25px_60px_rgba(0,0,0,0.85)] flex flex-col p-4 pb-6 overflow-hidden select-none">
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
                                <div className="flex-1 rounded-b-[1.5rem] overflow-hidden relative bg-[#090a0f] flex flex-col justify-between p-6 border border-[#c5a059]/5 z-10 max-h-full">
                                    <div className="absolute inset-0 bg-radial-gradient from-indigo-950/20 via-black to-black z-0 pointer-events-none"></div>
                                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1510519138101-570d1dca3d66?q=80&w=1000')] bg-cover bg-center opacity-10 blur-md pointer-events-none"></div>

                                    {loadingApp ? (
                                        <div className="flex-1 flex flex-col items-center justify-center z-10 animate-fade-in">
                                            <div className="w-16 h-16 rounded-full border-2 border-[#c5a059]/20 border-t-[#c5a059] animate-spin mb-4"></div>
                                            <p className="font-display text-[10px] tracking-[0.2em] text-[#c5a059] uppercase animate-pulse">{loadingTexts[loadingTextIndex]}</p>
                                        </div>
                                    ) : selectedApp && currentApp ? (
                                        <div className="flex-1 flex flex-col justify-between z-10 animate-fade-in py-2 max-w-xl mx-auto w-full text-left overflow-y-auto pr-0.5">
                                            {renderUnifiedApp(selectedApp, false)}
                                            <div className="pt-4 flex justify-end">
                                                <button type="button" onClick={() => setSelectedApp(null)} className="cursor-pointer border border-[#c5a059]/40 bg-[#c5a059]/10 hover:bg-[#c5a059]/20 px-6 py-2 rounded-xl font-display text-[9px] uppercase tracking-wider text-[#fde68a] mt-3">← Fechar Domínio</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col justify-between z-10 animate-fade-in pt-2">
                                            <p className="font-display text-[9px] uppercase tracking-widest text-[#c5a059]/40 text-center mb-8">Grimório de Mesa - Sovereign Workspace</p>
                                            
                                            {/* Desktop app icon grid with drag & drop */}
                                            <div className="grid grid-cols-5 gap-4 px-4 max-h-[280px] overflow-y-auto pr-0.5">
                                                {getOrderedDomains().map((app) => (
                                                    <div
                                                        key={app.id}
                                                        data-app-id={app.id}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, app.id)}
                                                        onDragOver={(e) => handleDragOver(e, app.id)}
                                                        onDrop={(e) => handleDrop(e, app.id)}
                                                        onDragEnd={handleDragEnd}
                                                        onPointerDown={(e) => handlePointerDown(e, app.id)}
                                                        onPointerMove={handlePointerMove}
                                                        onPointerUp={handlePointerUp}
                                                        onClick={() => !longPressActive.current && handleAppClick(app.id)}
                                                        className={`flex flex-col items-center group cursor-grab active:cursor-grabbing bg-black/30 border p-4 rounded-xl transition-all duration-200 select-none touch-none
                                                            ${dragOverId === app.id && dragSourceId !== app.id
                                                                ? "border-[#c5a059] shadow-[0_0_20px_rgba(197,160,89,0.35)] scale-105"
                                                                : "border-[#c5a059]/15 hover:border-[#c5a059]/60"}
                                                            ${dragSourceId === app.id ? "opacity-40 scale-95" : ""}`}
                                                        style={{ touchAction: "none" }}
                                                    >
                                                        <div className="app-icon-jiggle w-16 h-16 bg-gradient-to-br from-[#1c1a24] via-[#0b0a0f] to-[#121017] border-2 border-[#c5a059]/40 rounded-2xl flex items-center justify-center text-3xl shadow-md transition-all mb-3 relative overflow-hidden">
                                                            <div className="absolute inset-1 rounded-[0.95rem] border border-[#c5a059]/10"></div>
                                                            <span className="drop-shadow-[0_4px_6px_rgba(0,0,0,0.4)]">{app.emoji}</span>
                                                        </div>
                                                        <span className="text-[9px] font-bold uppercase tracking-widest text-[#c5a059]/80 group-hover:text-[#fde68a]">{app.label}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Desktop nav bar */}
                                            <div className="glass-medieval rounded-2xl px-8 py-2.5 border border-[#c5a059]/15 bg-black/60 flex justify-around items-center select-none mt-8 max-w-xs w-full mx-auto">
                                                <button type="button" onClick={handleNavBack} title="Voltar" className="p-1.5 opacity-60 hover:opacity-100 cursor-pointer transition-opacity">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="#c5a059" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                </button>
                                                <button type="button" onClick={handleNavHome} title="Área de trabalho" className="opacity-60 hover:opacity-100 cursor-pointer transition-all group">
                                                    <div className="w-5 h-5 rounded-full border-2 border-[#c5a059] group-hover:shadow-[0_0_10px_rgba(197,160,89,0.5)] transition-all" />
                                                </button>
                                                <button type="button" onClick={handleNavRecents} title="Apps recentes" className={`cursor-pointer transition-opacity ${showRecents ? "opacity-100" : "opacity-60 hover:opacity-100"}`}>
                                                    <div className={`w-5 h-5 rounded-sm border-2 transition-all ${showRecents ? "border-[#fde68a] shadow-[0_0_10px_rgba(253,230,138,0.4)]" : "border-[#c5a059]"}`} />
                                                </button>
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

            {/* Context Menu (long-press) */}
            {contextMenuApp && (() => {
                const app = DOMAINS.find(d => d.id === contextMenuApp);
                if (!app) return null;
                return (
                    <div
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
                        onClick={() => setContextMenuApp(null)}
                    >
                        <div
                            className="bg-[#0e0d13] border border-[#c5a059]/30 rounded-2xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.9)] w-72 animate-fade-in"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#c5a059]/15">
                                <div className="w-14 h-14 bg-gradient-to-br from-[#1c1a24] to-[#0b0a0f] border border-[#c5a059]/30 rounded-2xl flex items-center justify-center text-3xl">
                                    {app.emoji}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-[#eae3d5]">{app.title}</p>
                                    <p className="text-[9px] uppercase tracking-wider text-[#c5a059]/60">{app.developer} · {app.version}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleShareApp(contextMenuApp)}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-[#c5a059]/10 border border-[#c5a059]/15 hover:border-[#c5a059]/40 text-[#eae3d5] text-sm cursor-pointer transition-all mb-2"
                            >
                                <span className="text-lg">🔗</span>
                                <span className="font-semibold text-xs">Compartilhar aplicativo</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => { setContextMenuApp(null); handleAppClick(contextMenuApp); }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-[#c5a059]/10 border border-[#c5a059]/15 hover:border-[#c5a059]/40 text-[#eae3d5] text-sm cursor-pointer transition-all"
                            >
                                <span className="text-lg">▶️</span>
                                <span className="font-semibold text-xs">Abrir aplicativo</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setContextMenuApp(null)}
                                className="w-full mt-3 text-[10px] uppercase tracking-widest text-stone-600 hover:text-stone-400 cursor-pointer py-1 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                );
            })()}

            {/* Share Toast */}
            {shareToast && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] bg-[#1c1a24] border border-[#c5a059]/40 text-[#fde68a] text-xs px-5 py-3 rounded-full shadow-xl animate-fade-in">
                    ✓ {shareToast}
                </div>
            )}

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
