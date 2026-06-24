"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import InstitutionalFooter from "../../components/InstitutionalFooter";
import { PERSONAS } from "../../data/entities";
import OnboardingTour from "../../components/OnboardingTour";
import { memoriasTourSteps } from "../../data/onboardingTours";

interface RegistryRow {
  id: string;
  user_id: string;
  idea: string;
  chat_origin_id: string | null;
  persona: string | null;
  status: string;
  last_interaction: string | null;
  next_deadline: string | null;
  external_links: string | null;
  custom_columns: string | null; // serialized Record<string, string>
}

interface CustomColumn {
  id: string;
  name: string;
}

type MemoryTab = "registros" | "rastros" | "rascunhos";
type RegistryToolbarTheme = "dark" | "light";
type RegistryFontKey = "system" | "arial" | "georgia" | "mono";
type RegistryTextSize = "small" | "medium" | "large";

const DEFAULT_REGISTRY_STATUSES = [
  "Pendente",
  "Em Progresso",
  "Recorrente",
  "Concluído",
  "Arquivado"
];

const REGISTRY_FILTERS_STORAGE_KEY = "nemosine-registros-search-params";
const REGISTRY_PERSONA_OVERRIDES_STORAGE_KEY = "nemosine-registros-manual-personas";
const LEGACY_DRAFTS_STORAGE_KEY = "nemosine-memory-drafts";

const REGISTRY_FONT_OPTIONS: Array<{ key: RegistryFontKey; label: string; family: string }> = [
  { key: "system", label: "Sistema", family: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" },
  { key: "arial", label: "Arial", family: "Arial, Helvetica, sans-serif" },
  { key: "georgia", label: "Georgia", family: "Georgia, Times New Roman, serif" },
  { key: "mono", label: "Mono", family: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" },
];

const REGISTRY_TEXT_SIZE_LABELS: Record<RegistryTextSize, string> = {
  small: "Pequena",
  medium: "Media",
  large: "Grande",
};

const toStorageSafeUserKey = (value: string) => {
  const bytes = new TextEncoder().encode(value.trim().toLowerCase());
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const getScopedStorageKey = (baseKey: string, userKey?: string | null) => (
  userKey ? `${baseKey}:${toStorageSafeUserKey(userKey)}` : `${baseKey}:anonymous`
);

interface DraftChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

interface DraftNote {
  id: string;
  title: string;
  type: "text" | "checklist" | "image";
  content: string;
  checklist: DraftChecklistItem[];
  imageData?: string | null;
  color: string;
  createdAt: string;
  updatedAt: string;
}

interface TraceItem {
  id: string;
  type: "chat" | "registro" | "memoria";
  title: string;
  summary: string;
  occurredAt: string;
  sourceHref?: string | null;
}

const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(start);
      osc.stop(start + duration);
    };
    
    const now = ctx.currentTime;
    playTone(523.25, now, 0.4); // C5
    playTone(659.25, now + 0.15, 0.6); // E5
  } catch (e) {
    console.error("Erro ao reproduzir som:", e);
  }
};

const encodeSharePayload = (value: unknown) => {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const decodeSharePayload = <T,>(value: string): T => {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
};

const clampTableZoom = (value: number) => Math.min(1.65, Math.max(0.65, value));

const getTouchDistance = (touches: React.TouchList) => {
  if (touches.length < 2) return 0;
  const [first, second] = [touches[0], touches[1]];
  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
};

const normalizeIdeaText = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();

type PersonaRoute = { persona: string; terms: Array<string | [string, number]> };

const PERSONA_KEYWORDS: PersonaRoute[] = [
  { persona: "Advogado", terms: [["contrato", 4], ["processo", 4], "jurid", ["lei", 2], "clausula", "defesa", "peticao", "direito", "legal", "acordo", "documento"] },
  { persona: "Medico", terms: [["saude", 4], ["exame", 4], "sintoma", "remedio", "medico", "clinico", "consulta", "diagnostico", "sono", "cansaco"] },
  { persona: "Treinador", terms: [["treino", 4], "musculacao", "exercicio", "academia", "peso", "dieta", "corpo", "performance", "corrida", "forca"] },
  { persona: "Mordomo", terms: [["contas do mes", 7], ["contas", 5], ["conta", 4], ["pagar", 4], ["pagamento", 4], ["boleto", 5], ["fatura", 5], ["cartao", 4], ["dinheiro", 4], ["orcamento", 5], ["despesa", 5], ["receita", 3], ["financa", 5], ["financeiro", 5], ["compra", 3], ["investimento", 4], ["salario", 4], ["mes", 1]] },
  { persona: "Autor", terms: [["escrever", 4], ["texto", 3], "livro", "artigo", "roteiro", "capitulo", "publicar", "ensaio", "redacao", "manifesto"] },
  { persona: "Artista", terms: [["arte", 4], ["imagem", 3], "design", "visual", "estetica", "musica", "criativo", "ilustracao", "cor", "foto", "video"] },
  { persona: "Engenheiro", terms: [["codigo", 4], ["sistema", 3], "software", "bug", "app", "site", "tecnico", "automacao", "arquitetura", "programar", "deploy"] },
  { persona: "Cientista", terms: [["pesquisa", 4], "hipotese", "experimento", "dados", "evidencia", "metodo", "analise", "comparar", "estudo"] },
  { persona: "Filosofo", terms: [["sentido", 4], "conceito", "etica", "verdade", "existencia", "filosofia", "principio", "valor", "moral"] },
  { persona: "Psicologo", terms: [["familia", 5], ["familias", 5], ["familiar", 5], ["filho", 5], ["filha", 5], ["mae", 4], ["pai", 4], ["esposa", 4], ["marido", 4], ["casamento", 5], ["relacionamento", 5], ["namoro", 4], ["separacao", 4], ["afetivo", 5], ["afeto", 4], ["emocao", 4], ["ansiedade", 4], ["medo", 3], ["trauma", 4], ["comportamento", 3], ["relacao", 3], "psicolog", "briga", "conflito", "culpa", "ciume", "tristeza", "raiva"] },
  { persona: "Terapeuta", terms: [["acolher", 4], ["cuidado", 4], ["cura", 3], ["terapia", 5], ["sofrimento", 4], ["escuta", 4], ["bem-estar", 4], ["perdao", 3], ["luto", 3], ["carinho", 3], ["saudade", 3], ["amor", 3]] },
  { persona: "Estrategista", terms: [["estrategia", 5], ["plano", 3], ["meta", 3], ["objetivo", 3], ["prioridade", 4], ["decisao", 4], "competicao", "caminho", "posicionamento"] },
  { persona: "Executor", terms: [["executar", 4], ["tarefa", 3], ["prazo", 4], ["entrega", 4], ["acao", 2], ["rotina", 2], "produtividade", "resolver", "fazer hoje"] },
  { persona: "Mentor", terms: [["aprender", 4], ["orientar", 4], ["desenvolver", 3], ["carreira", 4], "guia", "direcao", "conselho", "estudar", "crescer"] },
  { persona: "Orquestrador-Arquiteto", terms: [["organizar", 4], ["integrar", 4], ["estrutura", 4], ["mapear", 4], ["sintese", 3], ["sistema", 2], "coordena", "planejar tudo", "projeto complexo"] },
  { persona: "Promotor", terms: [["vender", 4], ["marketing", 4], "divulgar", "publico", "campanha", "marca", "audiencia", "lancamento"] },
  { persona: "Juiz", terms: [["criterio", 4], ["avaliar", 3], ["decidir", 3], ["conflito", 2], ["imparcial", 4], "sentenca", "julgar", "escolher entre"] },
  { persona: "Guardiao", terms: [["proteger", 4], ["seguranca", 4], ["risco", 4], "senha", "privacidade", "defesa", "limite", "expor", "cuidado com"] },
  { persona: "Arauto", terms: [["agenda", 5], ["lembrete", 5], ["evento", 4], ["calendario", 5], ["horario", 4], "comunicar", "avisar", "marcar", "reuniao", "compromisso"] },
];

const shouldShowIdeaPreview = (idea: string) => {
  const normalized = idea.trim();
  if (!normalized) return false;
  return normalized.length > 110 || normalized.split(/\r?\n/).length > 2;
};

const resolvePersonaName = (target: string) => {
  const normalizedTarget = normalizeIdeaText(target);
  const exact = PERSONAS.find((name) => normalizeIdeaText(name) === normalizedTarget);
  if (exact) return exact;

  const fallbackIncludes: Record<string, string> = {
    medico: "dico",
    filosofo: "fil",
    psicologo: "psic",
    guardiao: "guardi",
  };
  const marker = fallbackIncludes[normalizedTarget];
  return marker ? PERSONAS.find((name) => normalizeIdeaText(name).includes(marker)) || null : null;
};

const inferBestPersonaFromIdea = (idea: string) => {
  const normalizedIdea = normalizeIdeaText(idea);
  if (normalizedIdea.trim().length < 8) return null;

  let bestPersona: string | null = null;
  let bestScore = 0;
  for (const { persona, terms } of PERSONA_KEYWORDS) {
    const score = terms.reduce((total, entry) => {
      const [term, weight] = Array.isArray(entry) ? entry : [entry, 1];
      return total + (normalizedIdea.includes(term) ? weight : 0);
    }, 0);
    if (score > bestScore) {
      bestPersona = persona;
      bestScore = score;
    }
  }

  if (!bestPersona || bestScore < 2) return null;
  return resolvePersonaName(bestPersona);
};

export default function RegistrosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MemoryTab>("registros");
  
  const [rows, setRows] = useState<RegistryRow[]>([]);
  const [rastros, setRastros] = useState<TraceItem[]>([]);
  const [selectedTraceIds, setSelectedTraceIds] = useState<string[]>([]);
  const [isLoadingRastros, setIsLoadingRastros] = useState(false);
  const [drafts, setDrafts] = useState<DraftNote[]>([]);
  const [draftMode, setDraftMode] = useState<"text" | "checklist" | "image">("text");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftChecklistText, setDraftChecklistText] = useState("");
  const [draftImageData, setDraftImageData] = useState<string | null>(null);
  const [draggedDraftId, setDraggedDraftId] = useState<string | null>(null);
  const [dragOverDraftId, setDragOverDraftId] = useState<string | null>(null);
  const [loadedDraftStorageKey, setLoadedDraftStorageKey] = useState<string | null>(null);
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>(DEFAULT_REGISTRY_STATUSES);
  
  const [filterDeadline, setFilterDeadline] = useState<"all" | "today" | "week" | "month" | "overdue">("all");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(DEFAULT_REGISTRY_STATUSES);
  const [searchQuery, setSearchQuery] = useState("");
  const [tableZoom, setTableZoom] = useState(1);
  const [registryToolbarTheme, setRegistryToolbarTheme] = useState<RegistryToolbarTheme>("dark");
  const [registryFont, setRegistryFont] = useState<RegistryFontKey>("system");
  const [registryTextSize, setRegistryTextSize] = useState<RegistryTextSize>("medium");
  const [registryFiltersLoaded, setRegistryFiltersLoaded] = useState(false);
  const [manualPersonaOverrides, setManualPersonaOverrides] = useState<string[]>([]);
  const [newColName, setNewColName] = useState("");
  const [showAddCol, setShowAddCol] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showStatusSettings, setShowStatusSettings] = useState(false);
  const [newCustomStatus, setNewCustomStatus] = useState("");

  // Collapsible menu slide-up
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const draftImportHandledRef = useRef(false);
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef(1);
  const tableZoomRef = useRef(1);
  const tableZoomContentRef = useRef<HTMLDivElement | null>(null);
  const pendingTableZoomRef = useRef(1);
  const tableZoomFrameRef = useRef<number | null>(null);
  const currentUserStorageKey = session?.user?.id || session?.user?.email || null;
  const draftStorageKey = getScopedStorageKey(LEGACY_DRAFTS_STORAGE_KEY, currentUserStorageKey);
  const registryOrderStorageKey = getScopedStorageKey("nemosine-registros-order", currentUserStorageKey);
  const registryFiltersStorageKey = getScopedStorageKey(REGISTRY_FILTERS_STORAGE_KEY, currentUserStorageKey);
  const registryPersonaOverridesStorageKey = getScopedStorageKey(REGISTRY_PERSONA_OVERRIDES_STORAGE_KEY, currentUserStorageKey);
  const registryColsStorageKey = getScopedStorageKey("nemosine-registros-cols", currentUserStorageKey);
  const registryStatusesStorageKey = getScopedStorageKey("nemosine-registros-statuses", currentUserStorageKey);

  // Drag and Drop States
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedRowId, setDraggedRowId] = useState<string | null>(null);
  const [sortedRowIds, setSortedRowIds] = useState<string[]>([]);

  // Notification Alarm States
  const [activeNotifRowId, setActiveNotifRowId] = useState<string | null>(null);

  // Load drag-and-drop order
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedOrder = localStorage.getItem(registryOrderStorageKey);
      if (savedOrder) {
        setSortedRowIds(JSON.parse(savedOrder));
      }
    }
  }, [registryOrderStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedOverrides = JSON.parse(localStorage.getItem(registryPersonaOverridesStorageKey) || "[]");
      if (Array.isArray(savedOverrides)) setManualPersonaOverrides(savedOverrides.filter((id) => typeof id === "string"));
    } catch {
      localStorage.removeItem(registryPersonaOverridesStorageKey);
    }
  }, [registryPersonaOverridesStorageKey]);

  const rememberManualPersonaOverride = (rowId: string, persona: string | null) => {
    setManualPersonaOverrides((current) => {
      const next = persona
        ? Array.from(new Set([...current, rowId]))
        : current.filter((id) => id !== rowId);
      if (typeof window !== "undefined") {
        localStorage.setItem(registryPersonaOverridesStorageKey, JSON.stringify(next));
      }
      return next;
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      setRegistryFiltersLoaded(true);
      return;
    }
    try {
      const savedFilters = localStorage.getItem(registryFiltersStorageKey);
      if (!savedFilters) {
        setRegistryFiltersLoaded(true);
        return;
      }
      const parsed = JSON.parse(savedFilters) as {
        searchQuery?: string;
        selectedStatuses?: string[];
        filterDeadline?: "all" | "today" | "week" | "month" | "overdue";
        tableZoom?: number;
        registryToolbarTheme?: RegistryToolbarTheme;
        registryFont?: RegistryFontKey;
        registryTextSize?: RegistryTextSize;
      };
      if (typeof parsed.searchQuery === "string") setSearchQuery(parsed.searchQuery);
      if (Array.isArray(parsed.selectedStatuses)) setSelectedStatuses(parsed.selectedStatuses);
      if (parsed.filterDeadline) setFilterDeadline(parsed.filterDeadline);
      if (typeof parsed.tableZoom === "number") setTableZoom(clampTableZoom(parsed.tableZoom));
      if (parsed.registryToolbarTheme === "dark" || parsed.registryToolbarTheme === "light") {
        setRegistryToolbarTheme(parsed.registryToolbarTheme);
      }
      if (parsed.registryFont && REGISTRY_FONT_OPTIONS.some((font) => font.key === parsed.registryFont)) {
        setRegistryFont(parsed.registryFont);
      }
      if (parsed.registryTextSize === "small" || parsed.registryTextSize === "medium" || parsed.registryTextSize === "large") {
        setRegistryTextSize(parsed.registryTextSize);
      }
    } catch {
      localStorage.removeItem(registryFiltersStorageKey);
    } finally {
      setRegistryFiltersLoaded(true);
    }
  }, [registryFiltersStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !registryFiltersLoaded) return;
    localStorage.setItem(registryFiltersStorageKey, JSON.stringify({
      searchQuery,
      selectedStatuses,
      filterDeadline,
      tableZoom,
      registryToolbarTheme,
      registryFont,
      registryTextSize,
    }));
  }, [searchQuery, selectedStatuses, filterDeadline, tableZoom, registryToolbarTheme, registryFont, registryTextSize, registryFiltersLoaded, registryFiltersStorageKey]);

  useEffect(() => {
    tableZoomRef.current = tableZoom;
    pendingTableZoomRef.current = tableZoom;
    if (tableZoomContentRef.current) {
      tableZoomContentRef.current.style.zoom = String(tableZoom);
    }
  }, [tableZoom]);

  useEffect(() => {
    return () => {
      if (tableZoomFrameRef.current !== null) {
        window.cancelAnimationFrame(tableZoomFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || status !== "authenticated") return;

    localStorage.removeItem(LEGACY_DRAFTS_STORAGE_KEY);
    setLoadedDraftStorageKey(null);
    setDrafts([]);

    const loadPersistentDrafts = async () => {
      try {
        const response = await fetch("/api/space/rascunhos");
        if (!response.ok) {
          setLoadedDraftStorageKey(draftStorageKey);
          return;
        }

        const data = await response.json();
        const serverDrafts = Array.isArray(data.drafts) ? data.drafts as DraftNote[] : [];
        const savedDrafts = localStorage.getItem(draftStorageKey);
        const localDrafts = savedDrafts ? JSON.parse(savedDrafts) as DraftNote[] : [];
        const localDraftsById = new Map(localDrafts.filter((draft) => draft?.id).map((draft) => [draft.id, draft]));
        const mergedDrafts = serverDrafts.map((serverDraft, index) => {
          const localDraft = localDraftsById.get(serverDraft.id);
          localDraftsById.delete(serverDraft.id);
          if (!localDraft) return serverDraft;

          const localTime = new Date(localDraft.updatedAt || 0).getTime();
          const serverTime = new Date(serverDraft.updatedAt || 0).getTime();
          if (localTime > serverTime) {
            persistDraftToServer(localDraft, index);
            return localDraft;
          }
          return serverDraft;
        });
        const localOnlyDrafts = Array.from(localDraftsById.values());

        if (localOnlyDrafts.length > 0) {
          await Promise.all(localOnlyDrafts.map((draft, index) => (
            persistDraftToServer(draft, mergedDrafts.length + index)
          )));
        }

        setDrafts([...mergedDrafts, ...localOnlyDrafts]);
      } catch (error) {
        console.error("Erro ao carregar rascunhos persistentes:", error);
      } finally {
        setLoadedDraftStorageKey(draftStorageKey);
      }
    };

    loadPersistentDrafts();
  }, [draftStorageKey, status]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (status === "unauthenticated") {
      setLoadedDraftStorageKey(null);
      const savedDrafts = localStorage.getItem(draftStorageKey);
      if (savedDrafts) {
        try {
          setDrafts(JSON.parse(savedDrafts));
        } catch {
          setDrafts([]);
        }
      } else {
        setDrafts([]);
      }
      setLoadedDraftStorageKey(draftStorageKey);
    }
  }, [draftStorageKey, status]);

  useEffect(() => {
    if (typeof window === "undefined" || draftImportHandledRef.current) return;

    const searchParams = new URLSearchParams(window.location.search);
    const importDraft = searchParams.get("importDraft");
    if (!importDraft) return;

    draftImportHandledRef.current = true;
    window.history.replaceState({}, document.title, window.location.pathname);

    try {
      const sharedDraft = decodeSharePayload<Omit<DraftNote, "id" | "createdAt" | "updatedAt">>(importDraft);
      const now = new Date().toISOString();
      const importedDraft: DraftNote = {
        id: crypto.randomUUID(),
        title: sharedDraft.title || "Rascunho importado",
        type: sharedDraft.type || "text",
        content: sharedDraft.content || "",
        checklist: Array.isArray(sharedDraft.checklist) ? sharedDraft.checklist : [],
        imageData: sharedDraft.imageData || null,
        color: sharedDraft.color || "#111016",
        createdAt: now,
        updatedAt: now,
      };

      setActiveTab("rascunhos");
      setDrafts((currentDrafts) => {
        const nextDrafts = [importedDraft, ...currentDrafts];
        persistDraftToServer(importedDraft, 0);
        persistDraftOrder(nextDrafts);
        return nextDrafts;
      });
      alert(`Post-it importado para Rascunhos: "${importedDraft.title}"`);
    } catch (error) {
      console.error("Erro ao importar post-it compartilhado:", error);
      alert("Não foi possível importar este post-it compartilhado.");
    }
  }, []);

  useEffect(() => {
    if (loadedDraftStorageKey !== draftStorageKey) return;
    if (typeof window !== "undefined") {
      localStorage.setItem(draftStorageKey, JSON.stringify(drafts));
    }
  }, [draftStorageKey, drafts, loadedDraftStorageKey]);

  const handleDragStart = (e: React.DragEvent, rowId: string) => {
    setDraggedIndex(null);
    setDraggedRowId(rowId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", rowId);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetRowId: string) => {
    e.preventDefault();
    const sourceRowId = draggedRowId || e.dataTransfer.getData("text/plain");
    if (!sourceRowId || sourceRowId === targetRowId) return;

    const newRows = [...getSortedRows(rows)];
    const sourceIndex = newRows.findIndex((row) => row.id === sourceRowId);
    const targetIndex = newRows.findIndex((row) => row.id === targetRowId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const [draggedRow] = newRows.splice(sourceIndex, 1);
    newRows.splice(targetIndex, 0, draggedRow);

    const nextOrder = newRows.map((r) => r.id);
    setSortedRowIds(nextOrder);
    localStorage.setItem(registryOrderStorageKey, JSON.stringify(nextOrder));
    setDraggedRowId(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDraggedRowId(null);
  };

  const getSortedRows = (fetchedRows: RegistryRow[]) => {
    if (sortedRowIds.length === 0) return fetchedRows;
    return [...fetchedRows].sort((a, b) => {
      const indexA = sortedRowIds.indexOf(a.id);
      const indexB = sortedRowIds.indexOf(b.id);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  };

  // Notification Alarm Scheduler Check
  useEffect(() => {
    if (status !== "authenticated" || rows.length === 0) return;

    const checkNotifications = () => {
      const now = new Date();
      const todayStr = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0"); // YYYY-MM-DD
      const currentHours = String(now.getHours()).padStart(2, "0");
      const currentMinutes = String(now.getMinutes()).padStart(2, "0");
      const currentTimeStr = `${currentHours}:${currentMinutes}`; // HH:MM

      rows.forEach(async (row) => {
        const rowCols = row.custom_columns ? JSON.parse(row.custom_columns) : {};
        if (
          row.next_deadline === todayStr &&
          rowCols.notif_time === currentTimeStr &&
          rowCols.notif_active === "true"
        ) {
          // Play synthesized premium alert sound
          playNotificationSound();

          // Native browser notification
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            new Notification("⏰ Nemosine Nous - Lembrete de Prazo", {
              body: `Lembrete hoje para a ideia: "${row.idea || "Novo Registro"}"`,
              icon: "/assets/nemosine-logo.png"
            });
          }

          // Browser alert fallback
          alert(`⏰ Lembrete de Prazo!\n\nIdeia: "${row.idea || "Sem nome"}"\nStatus: ${row.status}`);

          // Deactivate
          await updateCustomCell(row.id, "notif_active", "false");
        }
      });
    };

    const interval = setInterval(checkNotifications, 10000);
    return () => clearInterval(interval);
  }, [rows, status]);

  const fetchRegistros = async () => {
    try {
      const res = await fetch("/api/space/registros");
      if (res.ok) {
        const data = await res.json();
        setRows(data.registros || []);
      }
    } catch (err) {
      console.error("Erro ao carregar registros do banco:", err);
    }
  };

  const fetchRastros = async () => {
    setIsLoadingRastros(true);
    try {
      const res = await fetch("/api/space/rastros");
      if (res.ok) {
        const data = await res.json();
        setRastros(data.rastros || []);
      }
    } catch (err) {
      console.error("Erro ao carregar rastros:", err);
    } finally {
      setIsLoadingRastros(false);
    }
  };

  // Load dynamic configurations
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCols = localStorage.getItem(registryColsStorageKey);
      if (savedCols) {
        setCustomColumns(JSON.parse(savedCols));
      }

      const savedStatuses = localStorage.getItem(registryStatusesStorageKey);
      if (savedStatuses) {
        const parsedStatuses = JSON.parse(savedStatuses);
        setAvailableStatuses(parsedStatuses);
        setSelectedStatuses(parsedStatuses);
      }
    }
  }, [registryColsStorageKey, registryStatusesStorageKey]);

  // Fetch registers once authenticated
  useEffect(() => {
    if (status === "authenticated") {
      fetchRegistros();
      fetchRastros();
    } else if (status === "unauthenticated") {
      router.push("/access?callbackUrl=/space/registros");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated" && activeTab === "rastros") {
      fetchRastros();
    }
  }, [status, activeTab]);

  // Auto import shared registry from URL search params
  useEffect(() => {
    if (typeof window !== "undefined" && status === "authenticated") {
      const searchParams = new URLSearchParams(window.location.search);
      const importIdea = searchParams.get("importIdea");
      if (importIdea !== null) {
        // Remove parameters from URL to prevent infinite loops
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        
        const doImport = async () => {
          const newId = crypto.randomUUID();
          const newRow: RegistryRow = {
            id: newId,
            user_id: session?.user?.id || "",
            idea: importIdea,
            chat_origin_id: null,
            persona: searchParams.get("importPersona") || null,
            status: searchParams.get("importStatus") || "Pendente",
            last_interaction: new Date().toISOString().split("T")[0],
            next_deadline: searchParams.get("importDeadline") || null,
            external_links: searchParams.get("importLinks") || null,
            custom_columns: searchParams.get("importCustom") || "{}"
          };
          
          try {
            await fetch("/api/space/registros", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(newRow)
            });
            fetchRegistros();
            alert(`Registro importado com sucesso: "${importIdea}"`);
          } catch (e) {
            console.error("Erro ao importar registro compartilhado:", e);
          }
        };
        doImport();
      }
    }
  }, [status, session]);

  const saveCols = (newCols: CustomColumn[]) => {
    setCustomColumns(newCols);
    localStorage.setItem(registryColsStorageKey, JSON.stringify(newCols));
  };

  const saveStatusesList = (newList: string[]) => {
    setAvailableStatuses(newList);
    setSelectedStatuses((current) => current.filter((status) => newList.includes(status)));
    localStorage.setItem(registryStatusesStorageKey, JSON.stringify(newList));
  };

  if (status === "loading" || status === "unauthenticated") {
    return (
      <main className="min-h-screen bg-[#050507] text-[#e1e1e6] flex items-center justify-center">
        <div className="text-[#c5a059] animate-pulse text-lg uppercase tracking-widest font-serif">
          Carregando memórias...
        </div>
      </main>
    );
  }

  // Row Manipulation
  const addRow = async () => {
    const newId = crypto.randomUUID();
    const newRow: RegistryRow = {
      id: newId,
      user_id: session?.user?.id || "",
      idea: "",
      chat_origin_id: null,
      persona: null,
      status: "Pendente",
      last_interaction: new Date().toISOString().split("T")[0],
      next_deadline: "",
      external_links: "",
      custom_columns: "{}"
    };

    setRows([...rows, newRow]);

    try {
      await fetch("/api/space/registros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRow)
      });
      fetchRegistros();
    } catch (err) {
      console.error("Erro ao criar registro:", err);
    }
  };

  const duplicateRow = async (row: RegistryRow) => {
    const newId = crypto.randomUUID();
    const duplicated: RegistryRow = {
      ...row,
      id: newId,
      idea: row.idea ? `${row.idea} (Cópia)` : "",
      last_interaction: new Date().toISOString().split("T")[0],
    };
    
    setRows([...rows, duplicated]);
    
    try {
      await fetch("/api/space/registros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(duplicated)
      });
      fetchRegistros();
    } catch (err) {
      console.error("Erro ao duplicar registro:", err);
    }
  };

  const shareRow = (row: RegistryRow) => {
    if (typeof window === "undefined") return;
    const origin = window.location.origin;
    const params = new URLSearchParams();
    params.set("importIdea", row.idea || "");
    if (row.persona) params.set("importPersona", row.persona);
    params.set("importStatus", row.status);
    if (row.next_deadline) params.set("importDeadline", row.next_deadline);
    if (row.external_links) params.set("importLinks", row.external_links);
    if (row.custom_columns) params.set("importCustom", row.custom_columns);
    
    const shareLink = `${origin}/space/registros?${params.toString()}`;
    navigator.clipboard.writeText(shareLink)
      .then(() => {
        alert("Link de compartilhamento copiado para a área de transferência!");
      })
      .catch((err) => {
        console.error("Erro ao copiar link:", err);
        alert(`Copie o link manualmente:\n${shareLink}`);
      });
  };

  const downloadSpreadsheet = () => {
    const headers = ["ID", "Ideia", "Chat de Origem", "Link Externo", "Persona", "Status", "Ultima Interacao", "Proximo Prazo"];
    const customHeaders = customColumns.map(c => c.name);
    const allHeaders = [...headers, ...customHeaders];
    
    const csvRows = [allHeaders.join(";")];
    
    rows.forEach(row => {
      const rowCols = row.custom_columns ? JSON.parse(row.custom_columns) : {};
      const fields = [
        `"${(row.id || '').replace(/"/g, '""')}"`,
        `"${(row.idea || '').replace(/"/g, '""')}"`,
        `"${(row.chat_origin_id || '').replace(/"/g, '""')}"`,
        `"${(row.external_links || '').replace(/"/g, '""')}"`,
        `"${(row.persona || '').replace(/"/g, '""')}"`,
        `"${(row.status || '').replace(/"/g, '""')}"`,
        `"${(row.last_interaction || '').replace(/"/g, '""')}"`,
        `"${(row.next_deadline || '').replace(/"/g, '""')}"`
      ];
      
      customColumns.forEach(col => {
        fields.push(`"${(rowCols[col.id] || '').replace(/"/g, '""')}"`);
      });
      
      csvRows.push(fields.join(";"));
    });
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `nemosine_registros_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    
    const rowsHtml = rows.map(row => {
      const rowCols = row.custom_columns ? JSON.parse(row.custom_columns) : {};
      return `
        <tr>
          <td>${row.idea || "-"}</td>
          <td>${row.persona || "Nenhuma"}</td>
          <td>${row.status}</td>
          <td>${row.next_deadline || "-"}</td>
          <td>${row.external_links || "-"}</td>
          ${customColumns.map(col => `<td>${rowCols[col.id] || "-"}</td>`).join("")}
        </tr>
      `;
    }).join("");
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Nemosine Nous - Relatório de Registros</title>
          <style>
            body { font-family: serif; background-color: #ffffff; color: #111111; padding: 30px; }
            h1 { text-align: center; color: #c5a059; font-family: sans-serif; text-transform: uppercase; letter-spacing: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 25px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #f8f9fa; font-family: sans-serif; text-transform: uppercase; font-size: 10px; color: #333; }
            .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #777; border-top: 1px solid #eee; padding-top: 15px; }
          </style>
        </head>
        <body>
          <h1>Relatório de Registros — Sistema Nemosine</h1>
          <p style="text-align: center; font-size: 12px; font-style: italic;">Gerado em ${new Date().toLocaleDateString("pt-BR")}</p>
          <table>
            <thead>
              <tr>
                <th>Ideia</th>
                <th>Persona</th>
                <th>Status</th>
                <th>Prazo</th>
                <th>Link Externo</th>
                ${customColumns.map(col => `<th>${col.name}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="footer">© Sistema Nemosine Nous - Eixo de Soberania Cognitiva</div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const deleteRow = async (id: string) => {
    if (confirm("Deseja apagar esta linha de registro?")) {
      setRows(rows.filter((r) => r.id !== id));
      try {
        await fetch(`/api/space/registros?id=${id}`, {
          method: "DELETE"
        });
      } catch (err) {
        console.error("Erro ao deletar registro:", err);
      }
    }
  };

  const updateCell = async (rowId: string, field: keyof RegistryRow, value: any) => {
    const currentRow = rows.find((row) => row.id === rowId);
    if (field === "persona") {
      rememberManualPersonaOverride(rowId, value ? String(value) : null);
    }

    const inferredPersona = field === "idea" && !manualPersonaOverrides.includes(rowId)
      ? inferBestPersonaFromIdea(String(value || ""))
      : null;
    const nextPersona = inferredPersona && inferredPersona !== currentRow?.persona ? inferredPersona : null;

    const updated = rows.map((r) => {
      if (r.id === rowId) {
        return { ...r, [field]: value, ...(nextPersona ? { persona: nextPersona } : {}) };
      }
      return r;
    });
    setRows(updated);

    try {
      await fetch("/api/space/registros", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rowId, [field]: value, ...(nextPersona ? { persona: nextPersona } : {}) })
      });
    } catch (err) {
      console.error("Erro ao atualizar registro:", err);
    }
  };

  const updateCustomCell = async (rowId: string, colId: string, value: string) => {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;

    const currentCols = row.custom_columns ? JSON.parse(row.custom_columns) : {};
    const updatedCols = { ...currentCols, [colId]: value };
    const customColsStr = JSON.stringify(updatedCols);

    const updated = rows.map((r) => {
      if (r.id === rowId) {
        return { ...r, custom_columns: customColsStr };
      }
      return r;
    });
    setRows(updated);

    try {
      await fetch("/api/space/registros", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rowId, custom_columns: customColsStr })
      });
    } catch (err) {
      console.error("Erro ao salvar campo customizado:", err);
    }
  };

  const persistDraftToServer = async (draft: DraftNote, sortOrder = drafts.findIndex((item) => item.id === draft.id)) => {
    if (status !== "authenticated") return;
    try {
      await fetch("/api/space/rascunhos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, sortOrder: Math.max(0, sortOrder) }),
      });
    } catch (error) {
      console.error("Erro ao persistir rascunho:", error);
    }
  };

  const persistDraftOrder = async (orderedDrafts: DraftNote[]) => {
    if (status !== "authenticated") return;
    try {
      await fetch("/api/space/rascunhos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: orderedDrafts.map((draft) => draft.id) }),
      });
    } catch (error) {
      console.error("Erro ao persistir ordem dos rascunhos:", error);
    }
  };

  const addDraft = () => {
    const now = new Date().toISOString();
    const checklist = draftMode === "checklist"
      ? draftChecklistText
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((text) => ({ id: crypto.randomUUID(), text, done: false }))
      : [];

    const content = draftMode === "checklist" ? "" : draftContent.trim();
    if (!draftTitle.trim() && !content && checklist.length === 0 && !draftImageData) return;

    const newDraft: DraftNote = {
      id: crypto.randomUUID(),
      title: draftTitle.trim(),
      type: draftMode,
      content,
      checklist,
      imageData: draftImageData,
      color: "#c5a059",
      createdAt: now,
      updatedAt: now,
    };

    const nextDrafts = [newDraft, ...drafts];
    setDrafts(nextDrafts);
    persistDraftToServer(newDraft, 0);
    persistDraftOrder(nextDrafts);
    setDraftTitle("");
    setDraftContent("");
    setDraftChecklistText("");
    setDraftImageData(null);
  };

  const updateDraft = (id: string, updates: Partial<DraftNote>) => {
    setDrafts((currentDrafts) => {
      const nextDrafts = currentDrafts.map((draft) => (
        draft.id === id
          ? { ...draft, ...updates, updatedAt: new Date().toISOString() }
          : draft
      ));
      const changedDraft = nextDrafts.find((draft) => draft.id === id);
      if (changedDraft) persistDraftToServer(changedDraft, nextDrafts.findIndex((draft) => draft.id === id));
      return nextDrafts;
    });
  };

  const deleteDraft = (id: string) => {
    const nextDrafts = drafts.filter((draft) => draft.id !== id);
    setDrafts(nextDrafts);
    persistDraftOrder(nextDrafts);
    if (status === "authenticated") {
      fetch(`/api/space/rascunhos?id=${encodeURIComponent(id)}`, { method: "DELETE" })
        .catch((error) => console.error("Erro ao excluir rascunho persistente:", error));
    }
  };

  const handleDraftDragStart = (event: React.DragEvent, draftId: string) => {
    setDraggedDraftId(draftId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draftId);

    const draftCard = event.currentTarget.closest("article");
    if (draftCard instanceof HTMLElement) {
      const preview = draftCard.cloneNode(true) as HTMLElement;
      preview.style.position = "fixed";
      preview.style.top = "-1000px";
      preview.style.left = "-1000px";
      preview.style.width = `${draftCard.offsetWidth}px`;
      preview.style.pointerEvents = "none";
      preview.style.opacity = "0.96";
      preview.style.transform = "rotate(-1.5deg) scale(1.02)";
      preview.style.boxShadow = "0 22px 60px rgba(0,0,0,0.55), 0 0 28px rgba(197,160,89,0.22)";
      preview.style.zIndex = "9999";
      document.body.appendChild(preview);
      event.dataTransfer.setDragImage(preview, Math.min(36, draftCard.offsetWidth / 2), 28);
      window.setTimeout(() => preview.remove(), 0);
    }
  };

  const handleDraftDragOver = (event: React.DragEvent, draftId: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverDraftId(draftId);
  };

  const handleDraftDrop = (event: React.DragEvent, targetDraftId: string) => {
    event.preventDefault();
    const sourceDraftId = draggedDraftId || event.dataTransfer.getData("text/plain");
    setDraggedDraftId(null);
    setDragOverDraftId(null);

    if (!sourceDraftId || sourceDraftId === targetDraftId) return;

    setDrafts((currentDrafts) => {
      const sourceIndex = currentDrafts.findIndex((draft) => draft.id === sourceDraftId);
      const targetIndex = currentDrafts.findIndex((draft) => draft.id === targetDraftId);
      if (sourceIndex === -1 || targetIndex === -1) return currentDrafts;

      const reorderedDrafts = [...currentDrafts];
      const [movedDraft] = reorderedDrafts.splice(sourceIndex, 1);
      reorderedDrafts.splice(targetIndex, 0, movedDraft);
      persistDraftOrder(reorderedDrafts);
      return reorderedDrafts;
    });
  };

  const handleDraftDragEnd = () => {
    setDraggedDraftId(null);
    setDragOverDraftId(null);
  };

  const shareDraft = async (draft: DraftNote) => {
    if (typeof window === "undefined") return;

    const payload: Omit<DraftNote, "id" | "createdAt" | "updatedAt"> = {
      title: draft.title,
      type: draft.type,
      content: draft.content,
      checklist: draft.checklist,
      imageData: draft.imageData || null,
      color: draft.color,
    };
    const shareLink = `${window.location.origin}/space/registros?importDraft=${encodeSharePayload(payload)}`;

    if (shareLink.length > 7000) {
      alert("Este post-it ficou grande demais para compartilhar por link. Remova ou reduza a imagem antes de gerar o link.");
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: draft.title || "Post-it Nemosine",
          text: draft.content || draft.checklist.map((item) => `${item.done ? "[x]" : "[ ]"} ${item.text}`).join("\n") || "Post-it compartilhado do Nemosine.",
          url: shareLink,
        });
        return;
      }

      await navigator.clipboard.writeText(shareLink);
      alert("Link do post-it copiado para a área de transferência!");
    } catch (error) {
      console.error("Erro ao compartilhar post-it:", error);
      alert(`Copie o link manualmente:\n${shareLink}`);
    }
  };

  const updateDraftChecklistItem = (draftId: string, itemId: string, updates: Partial<DraftChecklistItem>) => {
    setDrafts((currentDrafts) => {
      const nextDrafts = currentDrafts.map((draft) => {
        if (draft.id !== draftId) return draft;
        return {
          ...draft,
          checklist: draft.checklist.map((item) => item.id === itemId ? { ...item, ...updates } : item),
          updatedAt: new Date().toISOString(),
        };
      });
      const changedDraft = nextDrafts.find((draft) => draft.id === draftId);
      if (changedDraft) persistDraftToServer(changedDraft, nextDrafts.findIndex((draft) => draft.id === draftId));
      return nextDrafts;
    });
  };

  const addDraftChecklistItem = (draftId: string) => {
    setDrafts((currentDrafts) => {
      const nextDrafts = currentDrafts.map((draft) => {
        if (draft.id !== draftId) return draft;
        return {
          ...draft,
          checklist: [...draft.checklist, { id: crypto.randomUUID(), text: "", done: false }],
          updatedAt: new Date().toISOString(),
        };
      });
      const changedDraft = nextDrafts.find((draft) => draft.id === draftId);
      if (changedDraft) persistDraftToServer(changedDraft, nextDrafts.findIndex((draft) => draft.id === draftId));
      return nextDrafts;
    });
  };

  const handleDraftImage = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setDraftImageData(typeof reader.result === "string" ? reader.result : null);
      setDraftMode("image");
    };
    reader.readAsDataURL(file);
  };

  const toggleTraceSelection = (traceId: string) => {
    setSelectedTraceIds((current) => (
      current.includes(traceId)
        ? current.filter((id) => id !== traceId)
        : [...current, traceId]
    ));
  };

  const deleteSelectedTraces = async () => {
    if (selectedTraceIds.length === 0) return;
    try {
      await fetch("/api/space/rastros", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedTraceIds }),
      });
      setRastros(rastros.filter((trace) => !selectedTraceIds.includes(trace.id)));
      setSelectedTraceIds([]);
    } catch (err) {
      console.error("Erro ao ocultar rastros:", err);
    }
  };

  // Custom Columns
  const addColumn = () => {
    const name = newColName.trim();
    if (!name) return;
    const newCol: CustomColumn = {
      id: crypto.randomUUID(),
      name,
    };
    saveCols([...customColumns, newCol]);
    setNewColName("");
    setShowAddCol(false);
  };

  const deleteColumn = (colId: string, name: string) => {
    if (confirm(`Deseja apagar a coluna "${name}"? Todos os dados preenchidos nela serão removidos.`)) {
      saveCols(customColumns.filter((c) => c.id !== colId));
      // update all rows in memory & DB
      const updatedRows = rows.map((r) => {
        const currentCols = r.custom_columns ? JSON.parse(r.custom_columns) : {};
        delete currentCols[colId];
        return { ...r, custom_columns: JSON.stringify(currentCols) };
      });
      setRows(updatedRows);
      
      // Update each row in DB asynchronously
      updatedRows.forEach(async (r) => {
        try {
          await fetch("/api/space/registros", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: r.id, custom_columns: r.custom_columns })
          });
        } catch (e) {
          console.error("Erro ao sincronizar deleção de coluna na DB:", e);
        }
      });
    }
  };

  // Custom Status Logic
  const handleAddCustomStatus = () => {
    const val = newCustomStatus.trim();
    if (!val || availableStatuses.includes(val)) return;
    const nextList = [...availableStatuses, val];
    saveStatusesList(nextList);
    setSelectedStatuses((current) => [...current, val]);
    setNewCustomStatus("");
  };

  const handleDeleteCustomStatus = (st: string) => {
    if (DEFAULT_REGISTRY_STATUSES.includes(st)) {
      alert("Os status padrões do sistema não podem ser removidos.");
      return;
    }
    if (confirm(`Deseja apagar o status "${st}"?`)) {
      const nextList = availableStatuses.filter(s => s !== st);
      saveStatusesList(nextList);
    }
  };

  const handleTableTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2) return;
    pinchStartDistanceRef.current = getTouchDistance(event.touches);
    pinchStartZoomRef.current = tableZoomRef.current;
  };

  const handleTableTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2 || !pinchStartDistanceRef.current) return;
    event.preventDefault();
    const nextDistance = getTouchDistance(event.touches);
    const nextZoom = pinchStartZoomRef.current * (nextDistance / pinchStartDistanceRef.current);
    pendingTableZoomRef.current = clampTableZoom(Number(nextZoom.toFixed(2)));

    if (tableZoomFrameRef.current !== null) return;
    tableZoomFrameRef.current = window.requestAnimationFrame(() => {
      tableZoomFrameRef.current = null;
      tableZoomRef.current = pendingTableZoomRef.current;
      if (tableZoomContentRef.current) {
        tableZoomContentRef.current.style.zoom = String(pendingTableZoomRef.current);
      }
    });
  };

  const handleTableTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length >= 2) return;
    pinchStartDistanceRef.current = null;
    pinchStartZoomRef.current = tableZoomRef.current;
    setTableZoom(tableZoomRef.current);
  };

  // Date Calculators
  const handleDone = (rowId: string) => {
    const today = new Date().toISOString().split("T")[0];
    updateCell(rowId, "last_interaction", today);
  };

  const adjustDeadline = (rowId: string, amount: number, unit: "day" | "week" | "month") => {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;

    const baseDate = row.next_deadline ? new Date(row.next_deadline + "T12:00:00") : new Date();
    if (isNaN(baseDate.getTime())) return;

    if (unit === "day") {
      baseDate.setDate(baseDate.getDate() + amount);
    } else if (unit === "week") {
      baseDate.setDate(baseDate.getDate() + amount * 7);
    } else if (unit === "month") {
      baseDate.setMonth(baseDate.getMonth() + amount);
    }

    const nextDeadlineStr = baseDate.toISOString().split("T")[0];
    updateCell(rowId, "next_deadline", nextDeadlineStr);
  };

  // Filtering Logic
  const filteredRows = getSortedRows(rows).filter((row) => {
    // Search match
    const matchesSearch = 
      row.idea.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (row.persona && row.persona.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    // Status multi-select match
    if (!selectedStatuses.includes(row.status)) {
      return false;
    }

    // Deadline match
    if (filterDeadline === "all") return true;

    if (!row.next_deadline) return false;
    const deadlineTime = new Date(row.next_deadline + "T00:00:00").getTime();
    const todayStr = new Date().toISOString().split("T")[0];
    const todayTime = new Date(todayStr + "T00:00:00").getTime();

    if (filterDeadline === "overdue") {
      return deadlineTime < todayTime && row.status !== "Concluído";
    }

    if (filterDeadline === "today") {
      return deadlineTime === todayTime;
    }

    if (filterDeadline === "week") {
      const oneWeekFromNow = todayTime + 86400000 * 7;
      return deadlineTime >= todayTime && deadlineTime <= oneWeekFromNow;
    }

    if (filterDeadline === "month") {
      const oneMonthFromNow = todayTime + 86400000 * 30;
      return deadlineTime >= todayTime && deadlineTime <= oneMonthFromNow;
    }

    return true;
  });

  const hasActiveRegistryFilters =
    searchQuery.trim().length > 0 ||
    filterDeadline !== "all" ||
    selectedStatuses.length !== availableStatuses.length ||
    availableStatuses.some((status) => !selectedStatuses.includes(status));

  const resetRegistryFilters = () => {
    setSearchQuery("");
    setFilterDeadline("all");
    setSelectedStatuses(availableStatuses);
  };

  // Calculate Metrics for Dashboard
  const totalItems = rows.length;
  const completedItems = rows.filter(r => r.status === "Concluído").length;
  const pendingItems = rows.filter(r => r.status === "Pendente").length;
  const inProgressItems = rows.filter(r => r.status === "Em Progresso").length;
  const recurrentItems = rows.filter(r => r.status === "Recorrente").length;
  const otherItems = totalItems - completedItems - pendingItems - inProgressItems - recurrentItems;

  const todayTime = new Date(new Date().toISOString().split("T")[0] + "T00:00:00").getTime();
  const overdueList = rows.filter(r => {
    if (!r.next_deadline || r.status === "Concluído") return false;
    return new Date(r.next_deadline + "T00:00:00").getTime() < todayTime;
  });

  const priorityList = rows.filter(r => {
    if (!r.next_deadline || r.status === "Concluído") return false;
    const diff = new Date(r.next_deadline + "T00:00:00").getTime() - todayTime;
    return diff >= 0 && diff <= 86400000 * 3; // within 3 days
  });

  // Group ideas by persona
  const personaCount: Record<string, number> = {};
  rows.forEach(r => {
    if (r.persona) {
      personaCount[r.persona] = (personaCount[r.persona] || 0) + 1;
    }
  });

  const memoryTabs: Array<{ id: MemoryTab; label: string; description: string }> = [
    { id: "registros", label: "Registros", description: "planilha viva de ideias, metas e prazos" },
    { id: "rastros", label: "Rastros", description: "histórico narrativo do que foi pensado e feito" },
    { id: "rascunhos", label: "Rascunhos", description: "post-its livres para retenção rápida" },
  ];

  const traceTypeLabel: Record<TraceItem["type"], string> = {
    chat: "Chat",
    registro: "Registro",
    memoria: "Memória",
  };

  const renderRascunhos = () => (
    <section className="space-y-6">
      <div className="rounded-2xl border border-[#c5a059]/25 bg-black/60 p-4 shadow-2xl backdrop-blur-md">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg uppercase tracking-widest text-[#c5a059]">Rascunhos</h2>
            <p className="mt-1 text-xs text-white/45">Post-its para ideias rápidas, listas, imagens e fragmentos em formação.</p>
          </div>
          <div className="flex rounded-xl border border-[#c5a059]/20 bg-black/45 p-1">
            {(["text", "checklist", "image"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setDraftMode(mode)}
                className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${draftMode === mode ? "bg-[#c5a059] text-black" : "text-white/55 hover:text-[#c5a059]"}`}
              >
                {mode === "text" ? "Texto" : mode === "checklist" ? "Checklist" : "Foto"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[0.8fr_1.2fr_auto]">
          <input
            type="text"
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            placeholder="Título opcional"
            className="rounded-xl border border-[#c5a059]/20 bg-black/55 px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-[#c5a059]/55"
          />
          {draftMode === "checklist" ? (
            <textarea
              value={draftChecklistText}
              onChange={(event) => setDraftChecklistText(event.target.value)}
              placeholder="Um item por linha..."
              rows={3}
              className="rounded-xl border border-[#c5a059]/20 bg-black/55 px-4 py-3 text-sm leading-relaxed text-white outline-none placeholder:text-white/20 focus:border-[#c5a059]/55"
            />
          ) : draftMode === "image" ? (
            <label className="flex min-h-24 cursor-pointer items-center justify-center rounded-xl border border-dashed border-[#c5a059]/35 bg-black/35 px-4 py-3 text-center text-xs uppercase tracking-widest text-[#c5a059]/75 hover:border-[#c5a059]">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handleDraftImage(event.target.files?.[0] || null)}
              />
              {draftImageData ? "Imagem carregada" : "Adicionar foto"}
            </label>
          ) : (
            <textarea
              value={draftContent}
              onChange={(event) => setDraftContent(event.target.value)}
              placeholder="Escreva uma ideia, frase, hipótese, lembrança..."
              rows={3}
              className="rounded-xl border border-[#c5a059]/20 bg-black/55 px-4 py-3 text-sm leading-relaxed text-white outline-none placeholder:text-white/20 focus:border-[#c5a059]/55"
            />
          )}
          <button
            type="button"
            onClick={addDraft}
            className="rounded-xl border border-[#c5a059]/50 bg-[#c5a059]/15 px-5 py-3 font-display text-[10px] font-bold uppercase tracking-widest text-[#fde68a] transition-colors hover:bg-[#c5a059]/25"
          >
            Guardar
          </button>
        </div>
        {draftImageData && (
          <img src={draftImageData} alt="Prévia do rascunho" className="mt-3 max-h-48 rounded-xl border border-[#c5a059]/20 object-contain" />
        )}
      </div>

      <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
        {drafts.map((draft) => (
          <article
            key={draft.id}
            onDragOver={(event) => handleDraftDragOver(event, draft.id)}
            onDrop={(event) => handleDraftDrop(event, draft.id)}
            onDragEnd={handleDraftDragEnd}
            className={`mb-4 break-inside-avoid rounded-2xl border bg-[#111016]/90 p-4 shadow-xl backdrop-blur-md transition-all ${
              dragOverDraftId === draft.id && draggedDraftId !== draft.id
                ? "border-[#c5a059]/80 shadow-[0_0_24px_rgba(197,160,89,0.22)]"
                : "border-[#c5a059]/20"
            } ${draggedDraftId === draft.id ? "opacity-90 scale-[0.99]" : "opacity-100"}`}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <button
                type="button"
                draggable
                onDragStart={(event) => handleDraftDragStart(event, draft.id)}
                onDragEnd={handleDraftDragEnd}
                title="Arrastar post-it"
                aria-label="Arrastar post-it"
                className="mt-0.5 cursor-grab rounded-md px-1.5 py-1 text-[#c5a059]/45 transition-colors hover:bg-[#c5a059]/10 hover:text-[#c5a059] active:cursor-grabbing"
              >
                <span className="material-icons text-base">drag_indicator</span>
              </button>
              <input
                value={draft.title}
                onChange={(event) => updateDraft(draft.id, { title: event.target.value })}
                placeholder="Sem título"
                className="w-full bg-transparent font-display text-sm font-bold uppercase tracking-widest text-[#c5a059] outline-none placeholder:text-[#c5a059]/30"
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => shareDraft(draft)}
                  title="Compartilhar post-it"
                  aria-label="Compartilhar post-it"
                  className="rounded-md px-2 py-1 text-[#c5a059]/60 hover:bg-[#c5a059]/10 hover:text-[#c5a059]"
                >
                  <span className="material-icons text-[15px]">share</span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteDraft(draft.id)}
                  title="Excluir post-it"
                  aria-label="Excluir post-it"
                  className="rounded-md px-2 py-1 text-xs text-red-300/65 hover:bg-red-500/10 hover:text-red-300"
                >
                  ×
                </button>
              </div>
            </div>

            {draft.imageData && (
              <img src={draft.imageData} alt={draft.title || "Rascunho visual"} className="mb-3 max-h-72 w-full rounded-xl object-cover" />
            )}

            {draft.type === "checklist" ? (
              <div className="space-y-2">
                {draft.checklist.map((item) => (
                  <label key={item.id} className="flex items-center gap-2 text-sm text-white/80">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={(event) => updateDraftChecklistItem(draft.id, item.id, { done: event.target.checked })}
                      className="accent-[#c5a059]"
                    />
                    <input
                      value={item.text}
                      onChange={(event) => updateDraftChecklistItem(draft.id, item.id, { text: event.target.value })}
                      className={`w-full bg-transparent outline-none ${item.done ? "text-white/35 line-through" : "text-white/85"}`}
                    />
                  </label>
                ))}
                <button type="button" onClick={() => addDraftChecklistItem(draft.id)} className="text-[10px] uppercase tracking-widest text-[#c5a059]/70 hover:text-[#c5a059]">
                  + item
                </button>
              </div>
            ) : (
              <textarea
                value={draft.content}
                onChange={(event) => updateDraft(draft.id, { content: event.target.value })}
                rows={Math.max(4, Math.min(12, draft.content.split("\n").length + 2))}
                className="w-full resize-y bg-transparent text-sm leading-relaxed text-white/85 outline-none placeholder:text-white/20"
                placeholder="Rascunho..."
              />
            )}
            <p className="mt-3 text-[9px] uppercase tracking-widest text-white/25">
              Atualizado em {new Date(draft.updatedAt).toLocaleString("pt-BR")}
            </p>
          </article>
        ))}
        {drafts.length === 0 && (
          <div className="rounded-2xl border border-[#c5a059]/15 bg-black/35 p-10 text-center text-sm italic text-white/35">
            Nenhum rascunho ainda. Guarde uma nota antes que ela escape.
          </div>
        )}
      </div>
    </section>
  );

  const renderRastros = () => (
    <section className="rounded-2xl border border-[#c5a059]/20 bg-black/55 p-5 shadow-2xl backdrop-blur-md">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg uppercase tracking-widest text-[#c5a059]">Rastros</h2>
          <p className="mt-1 text-xs text-white/45">Linha narrativa de chats, registros e memórias persistentes do sistema.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchRastros}
            className="rounded-lg border border-[#c5a059]/25 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#c5a059] hover:bg-[#c5a059]/10"
          >
            Atualizar
          </button>
          <button
            type="button"
            disabled={selectedTraceIds.length === 0}
            onClick={deleteSelectedTraces}
            className="rounded-lg border border-red-700/40 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-red-300 disabled:cursor-not-allowed disabled:opacity-35 hover:bg-red-500/10"
          >
            Excluir selecionados
          </button>
        </div>
      </div>

      {isLoadingRastros ? (
        <div className="py-16 text-center text-xs uppercase tracking-widest text-[#c5a059]/60">Carregando rastros...</div>
      ) : rastros.length === 0 ? (
        <div className="py-16 text-center text-sm italic text-white/35">Nenhum rastro visível por enquanto.</div>
      ) : (
        <div className="space-y-3">
          {rastros.map((trace) => (
            <article key={trace.id} className="rounded-xl border border-[#c5a059]/12 bg-black/35 p-4 transition-colors hover:border-[#c5a059]/35">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedTraceIds.includes(trace.id)}
                  onChange={() => toggleTraceSelection(trace.id)}
                  className="mt-1 accent-[#c5a059]"
                />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#c5a059]/25 px-2 py-0.5 text-[8px] uppercase tracking-widest text-[#c5a059]">
                      {traceTypeLabel[trace.type]}
                    </span>
                    <time className="text-[9px] uppercase tracking-widest text-white/35">
                      {new Date(trace.occurredAt).toLocaleString("pt-BR")}
                    </time>
                  </div>
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#e8d6aa]">{trace.title}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/75">{trace.summary}</p>
                  {trace.sourceHref && (
                    <a href={trace.sourceHref} className="mt-3 inline-flex text-[10px] uppercase tracking-widest text-[#c5a059]/75 hover:text-[#c5a059]">
                      Abrir origem
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );

  const selectedRegistryFont = REGISTRY_FONT_OPTIONS.find((font) => font.key === registryFont) || REGISTRY_FONT_OPTIONS[0];
  const toolbarThemeClasses = registryToolbarTheme === "light"
    ? "border-[#c5a059]/30 bg-[#f4efe6]/92 text-stone-900 shadow-[0_18px_60px_rgba(0,0,0,0.22)]"
    : "border-[#c5a059]/20 bg-black/62 text-[#e1e1e6] shadow-2xl";
  const toolbarPanelClasses = registryToolbarTheme === "light"
    ? "border-stone-300/80 bg-white/72 text-stone-800"
    : "border-[#c5a059]/15 bg-black/42 text-white/75";
  const toolbarInputClasses = registryToolbarTheme === "light"
    ? "border-stone-300/90 bg-white/80 text-stone-900 placeholder:text-stone-500 focus:border-[#9a7333]"
    : "border-[#c5a059]/20 bg-black/60 text-[#e1e1e6] placeholder:text-white/30 focus:border-[#c5a059]/50";
  const toolbarLabelClasses = registryToolbarTheme === "light" ? "text-stone-600" : "text-[#c5a059]/65";
  const toolbarTextClasses = registryTextSize === "large" ? "text-sm" : registryTextSize === "small" ? "text-[11px]" : "text-xs";
  const toolbarMicroClasses = registryTextSize === "large" ? "text-[11px]" : registryTextSize === "small" ? "text-[8.5px]" : "text-[10px]";
  const registrySurfaceClasses = registryToolbarTheme === "light"
    ? "border-[#c5a059]/30 bg-[#f8f2e6]/92 text-stone-900 shadow-[0_18px_60px_rgba(0,0,0,0.24)] scrollbar-thumb-[#c5a059]/35"
    : "border-[#c5a059]/20 bg-black/40 text-[#e1e1e6] shadow-2xl scrollbar-thumb-[#c5a059]/20";
  const registryHeaderClasses = registryToolbarTheme === "light"
    ? "border-[#c5a059]/25 bg-[#eadfce] text-[#7a5924]"
    : "border-[#c5a059]/20 bg-black/60 text-[#c5a059]/80";
  const registryRowClasses = registryToolbarTheme === "light"
    ? "border-[#d8c7aa] bg-[#fffaf0] hover:bg-[#f3e7d1] text-stone-900"
    : "border-[#c5a059]/10 hover:bg-white/[0.02]";
  const registryCellBorderClasses = registryToolbarTheme === "light" ? "border-[#d8c7aa]" : "border-[#c5a059]/10";
  const registryInputClasses = registryToolbarTheme === "light"
    ? "bg-white/78 text-stone-900 placeholder:text-stone-400 focus:border-[#c5a059]/65"
    : "bg-black/20 text-[#f4efe6] placeholder:text-white/15 focus:border-[#c5a059]/55 focus:bg-black/45";
  const registryInlineInputClasses = registryToolbarTheme === "light"
    ? "text-stone-800 placeholder:text-stone-400 focus:border-[#c5a059]/65"
    : "text-white/70 placeholder:text-white/10 focus:border-[#c5a059]/35";
  const registryTableFontSize = registryTextSize === "large" ? "15px" : registryTextSize === "small" ? "11px" : "13px";
  const registryTableTypographyClass = "[&_table]:!font-[inherit] [&_thead]:!font-[inherit] [&_tbody]:!font-[inherit] [&_tr]:!font-[inherit] [&_th]:!font-[inherit] [&_td]:!font-[inherit] [&_textarea]:!font-[inherit] [&_input]:!font-[inherit] [&_select]:!font-[inherit] [&_button]:!font-[inherit] [&_td]:!text-[inherit] [&_textarea]:!text-[inherit] [&_input]:!text-[inherit] [&_select]:!text-[inherit]";

  return (
    <main className="nemosine-main-container relative min-h-screen flex flex-col">
      {/* Background Overlay */}
      <div className="fixed inset-0 z-0">
        <div className="nemosine-bg-overlay absolute inset-0 z-10 backdrop-blur-[2px]" />
        <div className="nemosine-mental-castle-bg h-full w-full bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2000')] bg-cover bg-center" />
      </div>

      {/* COLLAPSIBLE SLIDE-UP NAVBAR WITH TAB HANDLE (TIRINHA) */}
      <div className={`fixed top-0 inset-x-0 z-[150] transition-transform duration-500 ease-in-out transform 
          ${showMenu ? "translate-y-0" : "-translate-y-full"}`}
      >
        <Navbar />
        
        {/* Pull-down notch tab handle (tirinha) */}
        <div 
            onClick={() => setShowMenu(!showMenu)}
            className="absolute left-1/2 -translate-x-1/2 bottom-[-20px] w-24 h-5 rounded-b-xl border-x border-b border-[#c5a059]/40 bg-[#07070a]/95 flex items-center justify-center cursor-pointer hover:bg-[#c5a059]/10 hover:border-[#c5a059] transition-all z-50 select-none shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
            title={showMenu ? "Recolher Menu" : "Expandir Menu"}
        >
            <span className="material-icons text-xs text-[#c5a059] transition-transform duration-300">
                {showMenu ? "expand_less" : "expand_more"}
            </span>
        </div>
      </div>

      <section className="relative z-10 flex-1 p-4 pt-12 md:p-8 md:pt-16 lg:p-12 lg:pt-20 max-w-[1550px] mx-auto w-full">
        <header data-tour="memorias-header" className="mb-10 text-center flex flex-col items-center">
          <h1 className="font-display text-4xl uppercase tracking-widest text-[#c5a059] mb-2 drop-shadow-[0_2px_10px_rgba(197,160,89,0.2)]">
            Memórias
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#c5a059]/40 font-bold">
            Registros, rastros e rascunhos da sua continuidade simbólica
          </p>
        </header>

        <div data-tour="memorias-tabs" className="mb-6 grid gap-3 md:grid-cols-3">
          {memoryTabs.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  selected
                    ? "border-[#c5a059]/70 bg-[#c5a059]/14 shadow-[0_0_24px_rgba(197,160,89,0.12)]"
                    : "border-[#c5a059]/15 bg-black/35 hover:border-[#c5a059]/40 hover:bg-black/50"
                }`}
              >
                <span className={`font-display text-sm font-bold uppercase tracking-widest ${selected ? "text-[#fde68a]" : "text-[#c5a059]/70"}`}>
                  {tab.label}
                </span>
                <span className="mt-1 block text-[10px] uppercase tracking-wider text-white/35">
                  {tab.description}
                </span>
              </button>
            );
          })}
        </div>

        {activeTab === "registros" && (
          <>
        {/* Notion-style Configuration Bar */}
        <div
          data-tour="registros-toolbar"
          className={`mb-6 flex flex-wrap items-start justify-between gap-4 rounded-xl border p-4 backdrop-blur-md ${toolbarThemeClasses}`}
          style={{ fontFamily: selectedRegistryFont.family }}
        >
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Pesquisar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-44 rounded-lg border px-3 py-2 outline-none ${toolbarTextClasses} ${toolbarInputClasses}`}
              />
            </div>

            {/* Filter by Status Multi-select */}
            <div className={`flex flex-wrap items-center gap-1.5 rounded-lg border px-3 py-1.5 ${toolbarPanelClasses}`}>
              <span className={`${toolbarMicroClasses} uppercase tracking-widest font-bold mr-1 ${toolbarLabelClasses}`}>Status:</span>
              <div className="flex flex-wrap items-center gap-3">
                {availableStatuses.map((st) => {
                  const isChecked = selectedStatuses.includes(st);
                  return (
                    <label key={st} className={`flex items-center gap-1.5 cursor-pointer hover:text-[#c5a059] transition-all select-none ${toolbarTextClasses} ${registryToolbarTheme === "light" ? "text-stone-700" : "text-white/70"}`}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedStatuses(selectedStatuses.filter((s) => s !== st));
                          } else {
                            setSelectedStatuses([...selectedStatuses, st]);
                          }
                        }}
                        className="accent-[#c5a059] cursor-pointer"
                      />
                      <span>{st}</span>
                    </label>
                  );
                })}
                {selectedStatuses.length < availableStatuses.length && (
                  <button
                    onClick={() => setSelectedStatuses(availableStatuses)}
                    className="ml-1 cursor-pointer text-[9px] font-bold uppercase tracking-widest text-emerald-300 transition-all hover:text-emerald-200"
                  >
                    [Todos]
                  </button>
                )}
                {selectedStatuses.length > 0 && (
                  <button 
                    onClick={() => setSelectedStatuses([])} 
                    className="text-[9px] uppercase tracking-widest text-rose-400 hover:text-rose-300 font-bold ml-1 transition-all cursor-pointer"
                  >
                    [Desmarcar]
                  </button>
                )}
              </div>
            </div>

            {/* Filter by Deadline */}
            <div className="flex items-center gap-1.5">
              <span className={`${toolbarMicroClasses} uppercase tracking-widest font-bold ${toolbarLabelClasses}`}>Prazo:</span>
              <select
                value={filterDeadline}
                onChange={(e) => setFilterDeadline(e.target.value as any)}
                className={`rounded-lg border px-2.5 py-1.5 outline-none cursor-pointer ${toolbarTextClasses} ${toolbarInputClasses}`}
              >
                <option value="all">Todos os prazos</option>
                <option value="today">Para hoje</option>
                <option value="week">Esta semana</option>
                <option value="month">Este mês</option>
                <option value="overdue">Atrasados</option>
              </select>
            </div>

            <div className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 ${toolbarPanelClasses}`}>
              <span className={`${toolbarMicroClasses} font-bold uppercase tracking-widest ${toolbarLabelClasses}`}>Visual:</span>
              <select
                value={registryTextSize}
                onChange={(e) => setRegistryTextSize(e.target.value as RegistryTextSize)}
                className={`rounded-lg border px-2.5 py-1.5 outline-none cursor-pointer ${toolbarTextClasses} ${toolbarInputClasses}`}
                title="Tamanho das letras do painel"
              >
                {(["small", "medium", "large"] as RegistryTextSize[]).map((size) => (
                  <option key={size} value={size}>Letras: {REGISTRY_TEXT_SIZE_LABELS[size]}</option>
                ))}
              </select>
              <select
                value={registryFont}
                onChange={(e) => setRegistryFont(e.target.value as RegistryFontKey)}
                className={`rounded-lg border px-2.5 py-1.5 outline-none cursor-pointer ${toolbarTextClasses} ${toolbarInputClasses}`}
                title="Fonte do painel"
              >
                {REGISTRY_FONT_OPTIONS.map((font) => (
                  <option key={font.key} value={font.key}>Fonte: {font.label}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-[#c5a059]/20">
                <button
                  type="button"
                  onClick={() => setRegistryToolbarTheme("dark")}
                  className={`${toolbarMicroClasses} px-3 py-1.5 font-bold uppercase tracking-widest transition-colors ${registryToolbarTheme === "dark" ? "bg-[#c5a059] text-black" : "bg-black/30 text-[#c5a059] hover:bg-[#c5a059]/10"}`}
                >
                  Escuro
                </button>
                <button
                  type="button"
                  onClick={() => setRegistryToolbarTheme("light")}
                  className={`${toolbarMicroClasses} px-3 py-1.5 font-bold uppercase tracking-widest transition-colors ${registryToolbarTheme === "light" ? "bg-[#c5a059] text-black" : "bg-white/20 text-[#c5a059] hover:bg-[#c5a059]/10"}`}
                >
                  Claro
                </button>
              </div>
            </div>
          </div>

          <div className={`flex flex-wrap items-center justify-end gap-2 rounded-lg border p-2 ${toolbarPanelClasses}`}>
            <div className="flex items-center gap-1.5 rounded-lg border border-[#c5a059]/35 bg-[#c5a059]/12 px-2 py-1.5">
              <button
                type="button"
                onClick={() => setTableZoom((current) => clampTableZoom(Number((current - 0.1).toFixed(2))))}
                className="grid h-6 w-6 place-items-center rounded text-[#c5a059]/75 transition-colors hover:bg-[#c5a059]/10 hover:text-[#c5a059]"
                title="Reduzir tabela"
              >
                <span className="material-icons text-sm">remove</span>
              </button>
              <span className={`min-w-11 text-center font-mono text-[10px] ${registryToolbarTheme === "light" ? "text-[#7a5924]" : "text-white/65"}`}>{Math.round(tableZoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setTableZoom((current) => clampTableZoom(Number((current + 0.1).toFixed(2))))}
                className="grid h-6 w-6 place-items-center rounded text-[#c5a059]/75 transition-colors hover:bg-[#c5a059]/10 hover:text-[#c5a059]"
                title="Ampliar tabela"
              >
                <span className="material-icons text-sm">add</span>
              </button>
            </div>

            {/* Status Manager Trigger */}
            <button
              onClick={() => setShowStatusSettings(!showStatusSettings)}
              className="px-3 py-2 bg-[#c5a059]/12 border border-[#c5a059]/38 hover:border-[#c5a059] text-[#c5a059] hover:bg-[#c5a059]/20 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer"
              title="Gerenciar Status Customizados"
            >
              ⚙️ Status
            </button>

            {/* Dashboard Trigger */}
            <button
              onClick={() => setShowDashboard(true)}
              className="px-3.5 py-2 bg-[#c5a059]/16 border border-[#c5a059]/50 hover:border-[#c5a059] text-[#c5a059] rounded-lg text-[10px] font-extrabold tracking-wider uppercase transition-all duration-200 shadow-md cursor-pointer hover:scale-[1.02] hover:bg-[#c5a059]/24"
            >
              📊 Meu Dashboard
            </button>

            {/* Download Spreadsheet (CSV) Icon */}
            <button
              type="button"
              onClick={downloadSpreadsheet}
              title="Baixar planilha de registros (CSV)"
              className="flex items-center justify-center rounded-lg border border-[#c5a059]/45 bg-[#c5a059]/12 w-9 h-9 text-[#c5a059] transition-all hover:border-[#c5a059] hover:bg-[#c5a059]/22 cursor-pointer font-bold"
            >
              <span className="material-icons text-lg">table_view</span>
            </button>

            {/* Download PDF Icon */}
            <button
              type="button"
              onClick={downloadPDF}
              title="Baixar relatório em PDF"
              className="flex items-center justify-center rounded-lg border border-[#c5a059]/45 bg-[#c5a059]/12 w-9 h-9 text-[#c5a059] transition-all hover:border-[#c5a059] hover:bg-[#c5a059]/22 cursor-pointer font-bold"
            >
              <span className="material-icons text-lg">picture_as_pdf</span>
            </button>

            {/* Add Column Trigger */}
            <div className="relative">
              {showAddCol ? (
                <div className={`flex items-center gap-1 border border-[#c5a059]/35 p-1.5 rounded-lg shadow-xl animate-fade-in absolute right-0 bottom-full mb-2 z-30 w-52 ${registryToolbarTheme === "light" ? "bg-[#f8f2e6]" : "bg-[#0a0a0c]"}`}>
                  <input
                    type="text"
                    placeholder="Nome da coluna"
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    className={`text-[10px] p-1.5 rounded border border-[#c5a059]/20 outline-none flex-1 font-body ${registryToolbarTheme === "light" ? "bg-white text-stone-900" : "bg-black text-[#e1e1e6]"}`}
                    autoFocus
                  />
                  <button
                    onClick={addColumn}
                    className="bg-[#c5a059] text-black text-[9px] px-2 py-1.5 rounded font-bold cursor-pointer hover:bg-[#e3c27a]"
                  >
                    +
                  </button>
                  <button
                    onClick={() => setShowAddCol(false)}
                    className="bg-[#c5a059]/18 text-[#c5a059] text-[9px] px-2 py-1.5 rounded cursor-pointer hover:bg-[#c5a059]/28"
                  >
                    x
                  </button>
                </div>
              ) : null}

              <button
                onClick={() => setShowAddCol(!showAddCol)}
                className="px-3.5 py-2 bg-[#c5a059]/12 border border-[#c5a059]/38 hover:border-[#c5a059]/70 text-[#c5a059] rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer hover:bg-[#c5a059]/22"
              >
                ➕ Nova Coluna
              </button>
            </div>

            {/* Add Row Button */}
            <button
              onClick={addRow}
              className="px-4 py-2 bg-gradient-to-r from-[#c5a059] to-[#b38e46] text-black rounded-lg text-[10px] font-extrabold tracking-wider uppercase transition-all duration-200 hover:scale-105 active:scale-95 shadow-md shadow-black/40 cursor-pointer"
            >
              📥 + Novo Registro
            </button>
          </div>
        </div>

        {/* Custom Status Settings Popup */}
        {showStatusSettings && (
          <div className="bg-black/85 border border-[#c5a059]/30 p-4 rounded-xl backdrop-blur-lg mb-6 max-w-xl animate-fade-in">
            <h3 className="text-xs uppercase tracking-widest text-[#c5a059] font-bold mb-3">🛠️ Gerenciador de Status</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {availableStatuses.map(st => (
                <div key={st} className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs">
                  <span>{st}</span>
                  {!["Pendente", "Em Progresso", "Recorrente", "Concluído", "Arquivado"].includes(st) && (
                    <button 
                      onClick={() => handleDeleteCustomStatus(st)}
                      className="text-red-400 hover:text-red-300 font-bold ml-1 cursor-pointer"
                    >
                          <span className="material-icons text-[14px]">close</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Novo status..."
                value={newCustomStatus}
                onChange={(e) => setNewCustomStatus(e.target.value)}
                className="bg-black text-[#e1e1e6] border border-[#c5a059]/20 text-xs px-3 py-2 rounded-lg outline-none focus:border-[#c5a059]/50 flex-1 font-body"
              />
              <button
                onClick={handleAddCustomStatus}
                className="px-3.5 py-2 bg-[#c5a059] text-black font-bold text-xs rounded-lg cursor-pointer hover:bg-[#e3c27a]"
              >
                Adicionar
              </button>
              <button
                onClick={() => setShowStatusSettings(false)}
                className="px-3.5 py-2 bg-zinc-800 text-white/70 text-xs rounded-lg cursor-pointer hover:bg-zinc-700"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {rows.length > 0 && filteredRows.length === 0 && hasActiveRegistryFilters && (
          <div className="mb-4 rounded-xl border border-[#c5a059]/35 bg-black/65 p-4 text-center shadow-[0_0_22px_rgba(0,0,0,0.22)]">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#fde68a]">
              Seus {rows.length} registros continuam salvos, mas os filtros atuais esconderam todos eles.
            </p>
            <button
              type="button"
              onClick={resetRegistryFilters}
              className="mt-3 rounded border border-[#c5a059]/45 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#c5a059] transition-colors hover:bg-[#c5a059]/10"
            >
              Limpar filtros
            </button>
          </div>
        )}

        {/* Notion Table container */}
        <div
          data-tour="registros-table"
          className={`rounded-xl border backdrop-blur-md overflow-x-auto relative w-full scrollbar-thin ${registrySurfaceClasses}`}
          onTouchStart={handleTableTouchStart}
          onTouchMove={handleTableTouchMove}
          onTouchEnd={handleTableTouchEnd}
          onTouchCancel={handleTableTouchEnd}
        >
          <div
            ref={tableZoomContentRef}
            className={registryTableTypographyClass}
            style={{ zoom: tableZoom, fontFamily: selectedRegistryFont.family, fontSize: registryTableFontSize } as React.CSSProperties & { zoom: number }}
          >
          <table className="w-full text-left border-collapse min-w-[1700px]">
            <thead>
              <tr className={`border-b text-[9px] uppercase tracking-widest font-bold select-none ${registryHeaderClasses}`}>
                <th className="p-1.5 w-10 text-center"></th>
                <th className="p-1.5 w-28 text-center">Ações</th>
                <th className="p-1.5 min-w-[460px] w-[38rem] border-r border-[#c5a059]/10">Ideia</th>
                <th className="p-1.5 w-44 border-r border-[#c5a059]/10 text-center">Chat de Origem</th>
                <th className="p-1.5 w-40 border-r border-[#c5a059]/10 text-center">Link Externo</th>
                <th className="p-1.5 w-44 border-r border-[#c5a059]/10">Persona</th>
                <th className="p-1.5 w-32 border-r border-[#c5a059]/10 text-center">Status</th>
                <th className="p-1.5 w-32 border-r border-[#c5a059]/10 text-center">Última Interação</th>
                <th className="p-1.5 w-20 border-r border-[#c5a059]/10 text-center">Feito?</th>
                <th className="p-1.5 w-48 border-r border-[#c5a059]/10 text-center">Próximo Prazo</th>
                <th className="p-1.5 w-60 border-r border-[#c5a059]/10 text-center">Adicionar Prazo</th>
                
                {/* Custom Dynamic Columns headers */}
                {customColumns.map((col) => (
                  <th key={col.id} className="p-1.5 w-48 border-r border-[#c5a059]/10 relative group">
                    <span className="truncate pr-5 block">{col.name}</span>
                    <button
                      onClick={() => deleteColumn(col.id, col.name)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-[8px] text-red-400 hover:text-red-300 font-bold cursor-pointer p-0.5 bg-black/40 rounded transition-all"
                      title="Apagar coluna"
                    >
                          <span className="material-icons text-[14px]">close</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y font-body ${registryToolbarTheme === "light" ? "divide-[#d8c7aa]" : "divide-[#c5a059]/10"}`}>
              {filteredRows.map((row, index) => {
                const rowCols = row.custom_columns ? JSON.parse(row.custom_columns) : {};
                const personaSlug = row.persona ? row.persona.toLowerCase().replace(/\s+/g, "-") : "";
                
                return (
              <tr 
                    key={row.id} 
                    className={`transition-colors group ${registryRowClasses}`}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDrop(e, row.id)}
                  >
                    {/* Drag indicator handle */}
                    <td className={`p-1 text-center select-none border-r ${registryCellBorderClasses}`}>
                      <button
                        type="button"
                        draggable
                        onDragStart={(e) => handleDragStart(e, row.id)}
                        onDragEnd={handleDragEnd}
                        title="Arrastar registro"
                        className="cursor-grab rounded p-0.5 text-[#c5a059]/30 transition-colors hover:bg-[#c5a059]/10 hover:text-[#c5a059]/80 active:cursor-grabbing"
                      >
                        <span className="material-icons text-[16px]">drag_indicator</span>
                      </button>
                    </td>

                    {/* Row actions */}
                    <td className={`p-1 text-center border-r ${registryCellBorderClasses}`}>
                      <div className="flex justify-center items-center gap-1.5">
                        {/* Duplicate Button */}
                        <button
                          onClick={() => duplicateRow(row)}
                          className="text-[#c5a059]/40 hover:text-[#c5a059] text-[13px] p-0.5 hover:bg-[#c5a059]/10 rounded transition-all cursor-pointer"
                          title="Duplicar registro"
                        >
                          <span className="material-icons text-[14px]">content_copy</span>
                        </button>

                        {/* Share Button */}
                        <button
                          onClick={() => shareRow(row)}
                          className="text-blue-400/40 hover:text-blue-400 text-[13px] p-0.5 hover:bg-blue-500/10 rounded transition-all cursor-pointer"
                          title="Compartilhar registro"
                        >
                          <span className="material-icons text-[14px]">share</span>
                        </button>

                        {/* Delete row button */}
                        <button
                          onClick={() => deleteRow(row.id)}
                          className="text-red-400/40 hover:text-red-400 text-[13px] p-0.5 hover:bg-red-500/10 rounded transition-all cursor-pointer"
                          title="Excluir linha"
                        >
                          <span className="material-icons text-[14px]">close</span>
                        </button>
                      </div>
                    </td>

                    {/* Idea Cell */}
                    <td className={`relative p-1.5 border-r align-top group/idea ${registryCellBorderClasses}`}>
                      <textarea
                        value={row.idea}
                        onChange={(e) => updateCell(row.id, "idea", e.target.value)}
                        placeholder="Nova ideia..."
                        rows={2}
                        title={row.idea || "Nova ideia..."}
                        className={`min-h-14 max-h-36 w-full resize-y rounded-lg border border-transparent px-3 py-2 font-body text-sm leading-relaxed outline-none transition-all selection:bg-[#c5a059]/35 selection:text-white hover:border-[#c5a059]/30 focus:max-h-60 ${registryInputClasses}`}
                        onMouseDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                      />
                      {shouldShowIdeaPreview(row.idea) && (
                        <div className="pointer-events-none absolute left-12 top-full z-50 mt-3 hidden w-[min(42rem,calc(100vw-5rem))] rounded-lg border border-[#c5a059]/35 bg-[#07070a]/95 p-3 text-sm leading-relaxed text-[#f4efe6] shadow-2xl backdrop-blur-md before:absolute before:-top-1.5 before:left-5 before:h-3 before:w-3 before:rotate-45 before:border-l before:border-t before:border-[#c5a059]/35 before:bg-[#07070a] group-hover/idea:block group-focus-within/idea:block whitespace-pre-wrap">
                          {row.idea}
                        </div>
                      )}
                    </td>

                    {/* Chat de Origem Cell */}
                    <td className={`p-1 border-r text-center ${registryCellBorderClasses}`}>
                      <div className={`flex items-center gap-1 rounded border border-transparent focus-within:border-[#c5a059]/35 px-1 ${registryToolbarTheme === "light" ? "bg-white/65" : "bg-black/35"}`}>
                        <input
                          type="text"
                          value={row.chat_origin_id || ""}
                          onChange={(e) => updateCell(row.id, "chat_origin_id", e.target.value)}
                          placeholder="ID ou Link..."
                          className={`bg-transparent text-[10px] outline-none border-none py-0.5 font-mono flex-1 w-full text-center ${registryInlineInputClasses}`}
                        />
                        {row.chat_origin_id && (
                          <a
                            href={
                              row.chat_origin_id.startsWith("http") || row.chat_origin_id.startsWith("/")
                                ? row.chat_origin_id
                                : `/agents/${personaSlug || "arauto"}?threadId=${row.chat_origin_id}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-0.5 hover:bg-[#c5a059]/15 rounded text-[#fde68a] transition-all shrink-0 cursor-pointer"
                            title="Abrir Chat de Origem"
                          >
                            💬
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Link Externo Cell */}
                    <td className={`p-1 border-r ${registryCellBorderClasses}`}>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={row.external_links || ""}
                          onChange={(e) => updateCell(row.id, "external_links", e.target.value)}
                          placeholder="Adicionar link..."
                          className={`w-full bg-transparent text-xs outline-none border-b border-transparent px-1 py-0.5 font-body ${registryInlineInputClasses}`}
                        />
                        {row.external_links && (
                          <a
                            href={row.external_links.startsWith("http") ? row.external_links : `https://${row.external_links}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-0.5 hover:bg-[#c5a059]/10 rounded text-[#c5a059] cursor-pointer"
                            title="Abrir Link"
                          >
                            🔗
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Persona Cell */}
                    <td className={`p-1 border-r ${registryCellBorderClasses}`}>
                      <div className="flex items-center justify-between gap-1">
                        <select
                          value={row.persona || ""}
                          onChange={(e) => updateCell(row.id, "persona", e.target.value)}
                          className={`text-[11px] text-[#c5a059] border border-transparent focus:border-[#c5a059]/35 px-1 py-0.5 rounded outline-none font-serif capitalize flex-1 cursor-pointer ${registryToolbarTheme === "light" ? "bg-white/78" : "bg-black/85"}`}
                        >
                          <option value="">A definir</option>
                          {PERSONAS.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                        {row.persona && (
                          <a
                            href={`/agents/${personaSlug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-0.5 hover:bg-[#c5a059]/15 rounded text-[#c5a059] cursor-pointer text-xs"
                            title="Ir ao Dossiê da Persona"
                          >
                            💬
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Status Cell */}
                    <td className={`p-1 border-r text-center ${registryCellBorderClasses}`}>
                      <select
                        value={row.status}
                        onChange={(e) => updateCell(row.id, "status", e.target.value)}
                        className={`text-[11px] px-1 py-0.5 rounded font-bold border border-transparent outline-none cursor-pointer max-w-full text-center
                          ${row.status === "Concluído" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" : ""}
                          ${row.status === "Em Progresso" ? "bg-amber-500/15 border-amber-500/30 text-amber-300" : ""}
                          ${row.status === "Pendente" ? "bg-blue-500/15 border-blue-500/30 text-blue-300" : ""}
                          ${row.status === "Recorrente" ? "bg-purple-500/15 border-purple-500/30 text-purple-300" : ""}
                          ${row.status === "Arquivado" ? "bg-zinc-700/20 border-zinc-700/40 text-white/50" : ""}
                          ${!["Pendente", "Em Progresso", "Recorrente", "Concluído", "Arquivado"].includes(row.status) ? "bg-zinc-800/40 border-zinc-500/20 text-[#c5a059]" : ""}
                        `}
                      >
                        {availableStatuses.map(st => (
                          <option key={st} value={st} className="bg-[#0b0c10] text-[#eee8dc]">
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Last Interaction Date Cell */}
                    <td className={`p-1 border-r text-center ${registryCellBorderClasses}`}>
                      <input
                        type="date"
                        value={row.last_interaction || ""}
                        onChange={(e) => updateCell(row.id, "last_interaction", e.target.value)}
                        className={`bg-transparent text-xs outline-none border border-transparent focus:border-[#c5a059]/35 px-1 py-0.5 rounded text-center max-w-full font-mono ${registryInlineInputClasses}`}
                      />
                    </td>

                    {/* Done button */}
                    <td className={`p-1 border-r text-center ${registryCellBorderClasses}`}>
                      <button
                        onClick={() => handleDone(row.id)}
                        className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[8px] uppercase tracking-widest rounded transition-colors cursor-pointer shadow shadow-black"
                      >
                        Ok
                      </button>
                    </td>

                    {/* Next Deadline Cell */}
                    <td className={`p-1 border-r text-center ${registryCellBorderClasses}`}>
                      <div className="relative inline-flex items-center justify-center gap-1">
                        <input
                          type="date"
                          value={row.next_deadline || ""}
                          onChange={(e) => updateCell(row.id, "next_deadline", e.target.value)}
                          className={`bg-transparent text-xs outline-none border border-transparent focus:border-[#c5a059]/35 px-1 py-0.5 rounded text-center font-mono font-bold w-28 ${registryInlineInputClasses}`}
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            if (typeof window !== "undefined" && "Notification" in window) {
                              await Notification.requestPermission();
                            }
                            setActiveNotifRowId(activeNotifRowId === row.id ? null : row.id);
                          }}
                          className={`p-0.5 rounded text-xs transition-all hover:bg-white/5 cursor-pointer shrink-0
                            ${rowCols.notif_active === "true" ? "text-amber-500 animate-pulse" : registryToolbarTheme === "light" ? "text-stone-400 hover:text-[#c5a059]" : "text-white/20 hover:text-white/60"}
                          `}
                          title="Configurar Alarme de Lembrete"
                        >
                          <span className="material-icons text-[14px]">notifications_active</span>
                        </button>

                        {activeNotifRowId === row.id && (
                          <div className="absolute right-0 top-full mt-1 z-40 bg-[#0e0f12] border border-[#c5a059]/40 rounded-lg p-2 shadow-2xl flex flex-col gap-1.5 w-40 text-left animate-fade-in">
                            <span className="text-[8px] uppercase tracking-wider text-[#c5a059] font-bold">⏰ Notificar Prazo</span>
                            <div className="flex flex-col gap-0.5">
                              <label className="text-[7.5px] text-white/40 uppercase">Hora do Alarme</label>
                              <input
                                type="time"
                                value={rowCols.notif_time || "09:00"}
                                onChange={(e) => updateCustomCell(row.id, "notif_time", e.target.value)}
                                className="bg-black/60 border border-[#c5a059]/20 rounded px-1 py-0.5 text-xs text-white outline-none w-full font-mono"
                              />
                            </div>
                            <label className="flex items-center gap-1.5 text-[9px] text-white/75 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={rowCols.notif_active === "true"}
                                onChange={(e) => {
                                  updateCustomCell(row.id, "notif_active", e.target.checked ? "true" : "false");
                                }}
                                className="accent-[#c5a059] scale-90 cursor-pointer"
                              />
                              <span>Alarme Ativo</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => setActiveNotifRowId(null)}
                              className="bg-[#c5a059] text-black text-[8px] font-bold uppercase tracking-wider py-0.5 rounded w-full cursor-pointer hover:bg-[#e3c27a]"
                            >
                              Ok
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Adjust Deadlines Cell */}
                    <td className={`p-1 border-r text-center ${registryCellBorderClasses}`}>
                      <div className="flex items-center justify-center gap-1 font-sans">
                        <button
                          onClick={() => adjustDeadline(row.id, 1, "day")}
                          className="px-1 py-0.5 bg-[#c5a059]/14 hover:bg-[#c5a059]/25 border border-[#c5a059]/25 text-[#c5a059] text-[7.5px] font-bold uppercase tracking-wider rounded transition-colors cursor-pointer"
                          title="Adicionar mais 1 dia ao prazo"
                        >
                          +1 D
                        </button>
                        <button
                          onClick={() => adjustDeadline(row.id, 1, "week")}
                          className="px-1 py-0.5 bg-[#c5a059]/14 hover:bg-[#c5a059]/25 border border-[#c5a059]/25 text-[#c5a059] text-[7.5px] font-bold uppercase tracking-wider rounded transition-colors cursor-pointer"
                          title="Adicionar mais 1 semana ao prazo"
                        >
                          +1 S
                        </button>
                        <button
                          onClick={() => adjustDeadline(row.id, 1, "month")}
                          className="px-1 py-0.5 bg-[#c5a059]/15 hover:bg-[#c5a059]/30 text-[#fde68a] border border-[#c5a059]/20 text-[7.5px] font-bold uppercase tracking-wider rounded transition-colors cursor-pointer"
                          title="Adicionar mais 1 mês ao prazo"
                        >
                          +1 M
                        </button>
                      </div>
                    </td>

                    {/* Custom Dynamic Columns Cells */}
                    {customColumns.map((col) => (
                      <td key={col.id} className={`p-1 border-r ${registryCellBorderClasses}`}>
                        <input
                          type="text"
                          value={rowCols[col.id] || ""}
                          onChange={(e) => updateCustomCell(row.id, col.id, e.target.value)}
                          placeholder="..."
                          className={`w-full bg-transparent text-xs outline-none border-b border-transparent px-1 py-0.5 font-body ${registryInlineInputClasses}`}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
              
              {filteredRows.length === 0 && (
                <tr>
                  <td
                    colSpan={11 + customColumns.length}
                    className={`text-center text-xs italic p-12 select-none ${registryToolbarTheme === "light" ? "text-stone-500 bg-[#fffaf0]" : "text-white/30 bg-black/10"}`}
                  >
                    Nenhum registro correspondente encontrado. Pressione "+ Novo Registro" para começar!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>

        {/* Statistics bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 px-2">
          <span className="text-[10px] uppercase tracking-widest text-white/35 font-mono">
            Mostrando {filteredRows.length} de {rows.length} registros totais (Sincronizado na Nuvem)
          </span>
          <div className="flex items-center gap-4">
            <span className="text-[10px] uppercase tracking-widest text-[#c5a059]/70 font-bold">
              Concluídos: {completedItems}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-purple-400/80 font-bold">
              Recorrentes: {recurrentItems}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-amber-500/75 font-bold">
              Atrasados: {overdueList.length}
            </span>
          </div>
        </div>
          </>
        )}

        {activeTab === "rastros" && renderRastros()}
        {activeTab === "rascunhos" && renderRascunhos()}
      </section>

      {/* STUNNING "MEU DASHBOARD" MODAL OVERLAY */}
      {showDashboard && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#0b0c10] border-2 border-[#c5a059]/40 w-full max-w-4xl rounded-2xl p-6 sm:p-8 relative shadow-[0_0_60px_rgba(197,160,89,0.15)] animate-scale-up max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-[#c5a059]/20">
            {/* Sacred corners */}
            <div className="absolute top-4 left-4 w-6 h-6 border-t border-l border-[#c5a059]/50 pointer-events-none" />
            <div className="absolute top-4 right-4 w-6 h-6 border-t border-r border-[#c5a059]/50 pointer-events-none" />
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b border-l border-[#c5a059]/50 pointer-events-none" />
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b border-r border-[#c5a059]/50 pointer-events-none" />
            
            <button
              onClick={() => setShowDashboard(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white text-lg font-bold p-2 z-50 cursor-pointer"
            >
                          <span className="material-icons text-[14px]">close</span>
            </button>

            <header className="mb-8 text-center flex flex-col items-center border-b border-[#c5a059]/20 pb-5">
              <h2 className="font-display text-3xl uppercase tracking-widest text-[#c5a059] mb-1">
                📊 Painel Metacognitivo
              </h2>
              <p className="text-[9px] uppercase tracking-[0.25em] text-[#c5a059]/45 font-bold">
                Métricas de desempenho e produtividade integradas
              </p>
            </header>

            {/* Metrics Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-black/50 border border-zinc-800 p-4 rounded-xl text-center">
                <p className="text-[9px] uppercase tracking-widest text-white/40 mb-1">Total de Ideias</p>
                <p className="text-3xl font-serif text-[#c5a059] font-bold">{totalItems}</p>
              </div>
              <div className="bg-black/50 border border-zinc-800 p-4 rounded-xl text-center">
                <p className="text-[9px] uppercase tracking-widest text-emerald-400/80 mb-1">Concluídas</p>
                <p className="text-3xl font-serif text-emerald-400 font-bold">
                  {completedItems} <span className="text-xs text-white/40">({totalItems ? Math.round((completedItems / totalItems) * 100) : 0}%)</span>
                </p>
              </div>
              <div className="bg-black/50 border border-zinc-800 p-4 rounded-xl text-center">
                <p className="text-[9px] uppercase tracking-widest text-amber-500/80 mb-1">Atrasadas</p>
                <p className="text-3xl font-serif text-amber-500 font-bold">{overdueList.length}</p>
              </div>
              <div className="bg-black/50 border border-zinc-800 p-4 rounded-xl text-center">
                <p className="text-[9px] uppercase tracking-widest text-purple-400/85 mb-1">Recorrentes</p>
                <p className="text-3xl font-serif text-purple-400 font-bold">{recurrentItems}</p>
              </div>
            </div>

            {/* Performance comparison progress bar */}
            <div className="bg-black/60 border border-[#c5a059]/15 p-5 rounded-xl mb-8">
              <h3 className="text-xs uppercase tracking-widest text-[#c5a059] font-bold mb-3.5">
                📈 Taxa de Conclusão do Workspace
              </h3>
              
              <div className="h-6 w-full bg-zinc-900 rounded-lg overflow-hidden flex text-[10px] font-bold text-black border border-white/5">
                {totalItems === 0 ? (
                  <div className="w-full flex items-center justify-center text-white/30 italic text-xs">Nenhum registro no momento</div>
                ) : (
                  <>
                    {completedItems > 0 && (
                      <div 
                        style={{ width: `${(completedItems / totalItems) * 100}%` }}
                        className="bg-emerald-500 flex items-center justify-center transition-all truncate px-1"
                        title={`Concluído: ${completedItems}`}
                      >
                        {Math.round((completedItems / totalItems) * 100)}%
                      </div>
                    )}
                    {inProgressItems > 0 && (
                      <div 
                        style={{ width: `${(inProgressItems / totalItems) * 100}%` }}
                        className="bg-amber-500 flex items-center justify-center transition-all truncate px-1"
                        title={`Em Progresso: ${inProgressItems}`}
                      >
                        {Math.round((inProgressItems / totalItems) * 100)}%
                      </div>
                    )}
                    {recurrentItems > 0 && (
                      <div 
                        style={{ width: `${(recurrentItems / totalItems) * 100}%` }}
                        className="bg-purple-500 flex items-center justify-center transition-all text-white truncate px-1"
                        title={`Recorrente: ${recurrentItems}`}
                      >
                        {Math.round((recurrentItems / totalItems) * 100)}%
                      </div>
                    )}
                    {pendingItems > 0 && (
                      <div 
                        style={{ width: `${(pendingItems / totalItems) * 100}%` }}
                        className="bg-blue-500 flex items-center justify-center transition-all text-white truncate px-1"
                        title={`Pendente: ${pendingItems}`}
                      >
                        {Math.round((pendingItems / totalItems) * 100)}%
                      </div>
                    )}
                    {otherItems > 0 && (
                      <div 
                        style={{ width: `${(otherItems / totalItems) * 100}%` }}
                        className="bg-zinc-600 flex items-center justify-center transition-all text-white truncate px-1"
                        title={`Outros: ${otherItems}`}
                      >
                        {Math.round((otherItems / totalItems) * 100)}%
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Progress Bar Legend */}
              <div className="flex flex-wrap gap-4 mt-3 justify-center text-[10px] uppercase tracking-wider font-bold">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded" />
                  <span>Concluído ({completedItems})</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded" />
                  <span>Em Progresso ({inProgressItems})</span>
                </div>
                <div className="flex items-center gap-1.5 text-purple-400">
                  <span className="w-2.5 h-2.5 bg-purple-500 rounded" />
                  <span>Recorrente ({recurrentItems})</span>
                </div>
                <div className="flex items-center gap-1.5 text-blue-400">
                  <span className="w-2.5 h-2.5 bg-blue-500 rounded" />
                  <span>Pendente ({pendingItems})</span>
                </div>
              </div>
            </div>

            {/* Priorities & Deadlines row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Overdue/Urgent Tasks list */}
              <div className="bg-black/60 border border-[#c5a059]/15 p-5 rounded-xl flex flex-col max-h-[300px]">
                <h3 className="text-xs uppercase tracking-widest text-[#c5a059] font-bold mb-3 flex items-center gap-2">
                  <span className="animate-pulse">⚠️</span> Tarefas Atrasadas ({overdueList.length})
                </h3>
                <div className="flex-1 overflow-y-auto divide-y divide-[#c5a059]/10 scrollbar-thin scrollbar-thumb-[#c5a059]/10">
                  {overdueList.map(r => (
                    <div key={r.id} className="py-2.5 text-xs flex justify-between gap-3">
                      <span className="text-white/80 font-medium truncate">{r.idea}</span>
                      <span className="text-red-400 font-bold shrink-0">{r.next_deadline}</span>
                    </div>
                  ))}
                  {overdueList.length === 0 && (
                    <div className="text-center text-white/30 text-xs italic py-10">
                      Nenhuma tarefa atrasada! Excelente.
                    </div>
                  )}
                </div>
              </div>

              {/* Priority Next Deadlines */}
              <div className="bg-black/60 border border-[#c5a059]/15 p-5 rounded-xl flex flex-col max-h-[300px]">
                <h3 className="text-xs uppercase tracking-widest text-[#c5a059] font-bold mb-3 flex items-center gap-2">
                  <span>📅</span> Próximos Prazos (Próximos 3 Dias) ({priorityList.length})
                </h3>
                <div className="flex-1 overflow-y-auto divide-y divide-[#c5a059]/10 scrollbar-thin scrollbar-thumb-[#c5a059]/10">
                  {priorityList.map(r => (
                    <div key={r.id} className="py-2.5 text-xs flex justify-between gap-3">
                      <span className="text-white/80 font-medium truncate">{r.idea}</span>
                      <span className="text-amber-300 font-bold shrink-0">{r.next_deadline}</span>
                    </div>
                  ))}
                  {priorityList.length === 0 && (
                    <div className="text-center text-white/30 text-xs italic py-10">
                      Nenhum prazo urgente batendo à porta.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Persona Distribution Bar Chart */}
            <div className="bg-black/60 border border-[#c5a059]/15 p-5 rounded-xl">
              <h3 className="text-xs uppercase tracking-widest text-[#c5a059] font-bold mb-5">
                🎭 Ideias Ativas por Conselheiro / Persona
              </h3>
              {Object.keys(personaCount).length === 0 ? (
                <p className="text-center text-white/30 text-xs italic py-8">Nenhuma ideia associada a conselheiros ainda.</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(personaCount).map(([name, count]) => {
                    const maxVal = Math.max(...Object.values(personaCount));
                    const widthPercent = (count / maxVal) * 100;
                    return (
                      <div key={name} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-white/80">
                          <span>{name}</span>
                          <span className="text-[#c5a059]">{count} ideia(s)</span>
                        </div>
                        <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-white/5">
                          <div 
                            style={{ width: `${widthPercent}%` }}
                            className="bg-gradient-to-r from-[#b38e46] to-[#c5a059] h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(197,160,89,0.5)]" 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <InstitutionalFooter />
      <OnboardingTour
        tourId="memorias"
        storageKey="nemosine_onboarding_memorias_completed"
        steps={memoriasTourSteps}
      />
    </main>
  );
}
