"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import InstitutionalFooter from "@/app/components/InstitutionalFooter";
import { PERSONAS, PLACES } from "@/app/data/entities";

type DestinyVisibility = "private" | "sensitive" | "legacy";
type DestinyExternalVisibility = "private" | "shareable" | "legacy";
type DestinyCognitiveVisibility =
    | "all-public-personas"
    | "selected-personas"
    | "source-persona-only"
    | "excluded-from-personas";
type ViewMode = "line" | "list" | "phases";
type SortMode = "oldest" | "newest" | "intensity" | "category";

interface DestinyEvent {
    id: string;
    title: string;
    eventDate?: string | null;
    eventDateLabel?: string | null;
    category: string;
    shortDescription: string;
    longDescription?: string | null;
    dominantEmotion?: string | null;
    symbolicIntensity?: number | null;
    associatedPersona?: string | null;
    associatedPlace?: string | null;
    lifePhase?: string | null;
    visibility: DestinyVisibility;
    externalVisibility: DestinyExternalVisibility;
    cognitiveVisibility: DestinyCognitiveVisibility;
    cognitivePersonas: string[];
    source?: string | null;
    tags: string[];
    imageUrl?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

type DestinyForm = Omit<DestinyEvent, "id" | "createdAt" | "updatedAt" | "tags" | "cognitivePersonas"> & {
    id?: string;
    tags: string;
    cognitivePersonas: string;
};

const CATEGORIES = [
    "Familia", "Saude", "Carreira", "Corpo", "Obra", "Estudo", "Relacoes",
    "Perda", "Virada", "Reconhecimento", "Criacao", "Travessia", "Outro"
];

const EMOTIONS = [
    "alegria", "orgulho", "medo", "dor", "luto", "alivio", "esperanca", "raiva",
    "amor", "vergonha", "superacao", "vazio", "gratidao", "ambivalencia"
];

const LIFE_PHASES = [
    "Infancia", "Adolescencia", "Formacao", "Carreira inicial", "Familia",
    "Crise", "Reconstrucao", "Obra", "Legado", "Outra"
];

const VISIBILITY_LABELS: Record<DestinyVisibility, string> = {
    private: "Privado",
    sensitive: "Marco sensivel",
    legacy: "Marco de legado",
};

const EXTERNAL_VISIBILITY_LABELS: Record<DestinyExternalVisibility, string> = {
    private: "Externo privado",
    shareable: "Externo compartilhavel",
    legacy: "Externo legado",
};

const COGNITIVE_VISIBILITY_LABELS: Record<DestinyCognitiveVisibility, string> = {
    "all-public-personas": "Todas as personas publicas",
    "selected-personas": "Personas selecionadas",
    "source-persona-only": "Somente persona de origem",
    "excluded-from-personas": "Fora das personas",
};

const CATEGORY_STYLES: Record<string, string> = {
    Familia: "border-rose-300/40 bg-rose-300/10 text-rose-100",
    Saude: "border-emerald-300/40 bg-emerald-300/10 text-emerald-100",
    Carreira: "border-sky-300/40 bg-sky-300/10 text-sky-100",
    Corpo: "border-lime-300/40 bg-lime-300/10 text-lime-100",
    Obra: "border-amber-300/40 bg-amber-300/10 text-amber-100",
    Estudo: "border-indigo-300/40 bg-indigo-300/10 text-indigo-100",
    Relacoes: "border-pink-300/40 bg-pink-300/10 text-pink-100",
    Perda: "border-zinc-300/35 bg-zinc-300/10 text-zinc-100",
    Virada: "border-orange-300/40 bg-orange-300/10 text-orange-100",
    Reconhecimento: "border-yellow-300/40 bg-yellow-300/10 text-yellow-100",
    Criacao: "border-cyan-300/40 bg-cyan-300/10 text-cyan-100",
    Travessia: "border-[#c5a059]/50 bg-[#c5a059]/10 text-[#f3dfaa]",
    Outro: "border-white/20 bg-white/5 text-white/70",
};

const emptyForm: DestinyForm = {
    title: "",
    eventDate: "",
    eventDateLabel: "",
    category: "Travessia",
    shortDescription: "",
    longDescription: "",
    dominantEmotion: "",
    symbolicIntensity: 3,
    associatedPersona: "",
    associatedPlace: "",
    lifePhase: "",
    visibility: "private",
    externalVisibility: "private",
    cognitiveVisibility: "all-public-personas",
    cognitivePersonas: "",
    source: "",
    tags: "",
    imageUrl: "",
};

function apiAction(action: string, payload: Record<string, unknown> = {}) {
    return fetch("/api/sovereign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
    });
}

function formatDateLabel(event: DestinyEvent) {
    if (event.eventDateLabel) return event.eventDateLabel;
    if (!event.eventDate) return "Data aproximada";
    const [year, month, day] = event.eventDate.split("-");
    return `${day}/${month}/${year}`;
}

function getEventYear(event: DestinyEvent) {
    if (event.eventDate) return event.eventDate.slice(0, 4);
    const match = event.eventDateLabel?.match(/\d{4}/);
    return match?.[0] || "sem ano";
}

function narrativeReading(event: DestinyEvent | null) {
    if (!event) return "";
    const phase = event.lifePhase ? ` na fase ${event.lifePhase}` : "";
    const persona = event.associatedPersona ? ` A persona ${event.associatedPersona} pode servir como lente de leitura, sem impor sentido ao acontecimento.` : "";
    return `Este marco representa um ponto de organizacao narrativa${phase}. Ele nao deve ser lido como fato isolado, mas como sinal de passagem, ruptura, consolidacao ou nascimento simbolico dentro da sua historia.${persona}`;
}

function normalizeForm(event: DestinyEvent): DestinyForm {
    return {
        ...event,
        tags: event.tags?.join(", ") || "",
        externalVisibility: event.externalVisibility || (event.visibility === "legacy" ? "legacy" : "private"),
        cognitiveVisibility: event.cognitiveVisibility || (event.visibility === "sensitive" ? "excluded-from-personas" : "all-public-personas"),
        cognitivePersonas: event.cognitivePersonas?.join(", ") || "",
        symbolicIntensity: event.symbolicIntensity ?? 3,
    };
}

function normalizeEvent(event: DestinyEvent): DestinyEvent {
    return {
        ...event,
        externalVisibility: event.externalVisibility || (event.visibility === "legacy" ? "legacy" : "private"),
        cognitiveVisibility: event.cognitiveVisibility || (event.visibility === "sensitive" ? "excluded-from-personas" : "all-public-personas"),
        cognitivePersonas: event.cognitivePersonas || [],
        tags: event.tags || [],
    };
}

export default function DestinyLineClient({ embed = false }: { embed?: boolean }) {
    const [events, setEvents] = useState<DestinyEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>("line");
    const [sortMode, setSortMode] = useState<SortMode>("oldest");
    const [formOpen, setFormOpen] = useState(false);
    const [detailsEvent, setDetailsEvent] = useState<DestinyEvent | null>(null);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [form, setForm] = useState<DestinyForm>(emptyForm);
    const [filters, setFilters] = useState({
        category: "",
        lifePhase: "",
        emotion: "",
        persona: "",
        intensity: "",
        year: "",
        visibility: "",
        cognitiveVisibility: "",
        tag: "",
    });

    const loadEvents = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiAction("get_destiny_events");
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Nao foi possivel carregar a Linha do Destino.");
            setEvents((data.events || []).map(normalizeEvent));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro ao carregar marcos.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEvents();
    }, []);

    useEffect(() => {
        if (!toast) return;
        const timer = window.setTimeout(() => setToast(null), 3200);
        return () => window.clearTimeout(timer);
    }, [toast]);

    const years = useMemo(() => {
        return Array.from(new Set(events.map(getEventYear))).filter((year) => year !== "sem ano").sort();
    }, [events]);

    const tags = useMemo(() => {
        return Array.from(new Set(events.flatMap((event) => event.tags || []))).sort((a, b) => a.localeCompare(b));
    }, [events]);

    const filteredEvents = useMemo(() => {
        const filtered = events.filter((event) => {
            if (filters.category && event.category !== filters.category) return false;
            if (filters.lifePhase && event.lifePhase !== filters.lifePhase) return false;
            if (filters.emotion && event.dominantEmotion !== filters.emotion) return false;
            if (filters.persona && event.associatedPersona !== filters.persona) return false;
            if (filters.intensity && String(event.symbolicIntensity || "") !== filters.intensity) return false;
            if (filters.year && getEventYear(event) !== filters.year) return false;
            if (filters.visibility && event.visibility !== filters.visibility) return false;
            if (filters.cognitiveVisibility && event.cognitiveVisibility !== filters.cognitiveVisibility) return false;
            if (filters.tag && !event.tags?.includes(filters.tag)) return false;
            return true;
        });

        return [...filtered].sort((a, b) => {
            if (sortMode === "newest") return (b.eventDate || "").localeCompare(a.eventDate || "");
            if (sortMode === "intensity") return (b.symbolicIntensity || 0) - (a.symbolicIntensity || 0);
            if (sortMode === "category") return a.category.localeCompare(b.category);
            return (a.eventDate || "9999-99-99").localeCompare(b.eventDate || "9999-99-99");
        });
    }, [events, filters, sortMode]);

    const eventsByPhase = useMemo(() => {
        return filteredEvents.reduce<Record<string, DestinyEvent[]>>((acc, event) => {
            const phase = event.lifePhase || "Sem fase definida";
            acc[phase] = acc[phase] || [];
            acc[phase].push(event);
            return acc;
        }, {});
    }, [filteredEvents]);

    const lastEvent = useMemo(() => {
        return [...events].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))[0];
    }, [events]);

    const legacyCount = events.filter((event) => event.visibility === "legacy").length;
    const cognitivelyVisibleCount = events.filter((event) => event.cognitiveVisibility !== "excluded-from-personas").length;

    const openCreate = () => {
        setEditingEventId(null);
        setForm(emptyForm);
        setFormOpen(true);
    };

    const openEdit = (event: DestinyEvent) => {
        setEditingEventId(event.id);
        setForm(normalizeForm(event));
        setFormOpen(true);
        setDetailsEvent(null);
    };

    const handleSubmit = async (submitEvent: FormEvent) => {
        submitEvent.preventDefault();
        setSaving(true);
        setError(null);

        if (form.visibility === "sensitive") {
            const ok = window.confirm("Este marco pode conter informacoes pessoais delicadas. Registre apenas o que deseja manter no sistema.");
            if (!ok) {
                setSaving(false);
                return;
            }
        }

        const selectedCognitivePersonas = form.cognitivePersonas.split(",").map((persona) => persona.trim()).filter(Boolean);
        if (form.cognitiveVisibility === "selected-personas" && selectedCognitivePersonas.length === 0) {
            setError("Informe pelo menos uma persona para visibilidade cognitiva seletiva.");
            setSaving(false);
            return;
        }

        const payload = {
            ...form,
            eventDate: form.eventDate || null,
            eventDateLabel: form.eventDateLabel || null,
            symbolicIntensity: form.symbolicIntensity ? Number(form.symbolicIntensity) : null,
            tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
            cognitivePersonas: selectedCognitivePersonas,
        };

        try {
            const response = await apiAction(editingEventId ? "update_destiny_event" : "create_destiny_event", {
                eventId: editingEventId,
                event: payload,
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Nao foi possivel salvar o marco.");
            setEvents((current) => {
                const savedEvent = normalizeEvent(data.event);
                if (editingEventId) return current.map((event) => event.id === editingEventId ? savedEvent : event);
                return [...current, savedEvent];
            });
            setFormOpen(false);
            setEditingEventId(null);
            setToast("Marco registrado na Linha do Destino.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro ao salvar marco.");
        } finally {
            setSaving(false);
        }
    };

    const deleteEvent = async (event: DestinyEvent) => {
        const ok = window.confirm(`Excluir o marco "${event.title}"? Esta acao nao pode ser desfeita.`);
        if (!ok) return;
        try {
            const response = await apiAction("delete_destiny_event", { eventId: event.id });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Nao foi possivel excluir o marco.");
            setEvents((current) => current.filter((item) => item.id !== event.id));
            if (detailsEvent?.id === event.id) setDetailsEvent(null);
            setToast("Marco removido da Linha do Destino.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro ao excluir marco.");
        }
    };

    const updateFilter = (key: keyof typeof filters, value: string) => {
        setFilters((current) => ({ ...current, [key]: value }));
    };

    const renderEventCard = (event: DestinyEvent, index: number, compact = false) => {
        const categoryClass = CATEGORY_STYLES[event.category] || CATEGORY_STYLES.Outro;
        return (
            <article
                key={event.id}
                className={`group relative rounded-lg border border-[#c5a059]/20 bg-black/55 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.28)] backdrop-blur-md transition-all hover:border-[#c5a059]/45 ${compact ? "" : "md:p-5"}`}
            >
                {!compact && (
                    <div className={`absolute top-5 hidden h-3 w-3 rounded-full border bg-black md:block ${index % 2 === 0 ? "right-[-2.15rem]" : "left-[-2.15rem]"} border-[#c5a059] shadow-[0_0_18px_rgba(197,160,89,0.8)]`} />
                )}
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] ${categoryClass}`}>
                        {event.category}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-white/45">
                        {formatDateLabel(event)}
                    </span>
                    {event.visibility !== "private" && (
                        <span className={`rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] ${event.visibility === "sensitive" ? "border-stone-400/25 bg-stone-400/10 text-stone-200/75" : "border-[#c5a059]/35 bg-[#c5a059]/10 text-[#f3dfaa]"}`}>
                            {VISIBILITY_LABELS[event.visibility]}
                        </span>
                    )}
                    <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-cyan-100/75">
                        {EXTERNAL_VISIBILITY_LABELS[event.externalVisibility]}
                    </span>
                    <span className="rounded-full border border-violet-300/25 bg-violet-300/10 px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-violet-100/75">
                        {COGNITIVE_VISIBILITY_LABELS[event.cognitiveVisibility]}
                    </span>
                </div>
                <h3 className="mt-4 font-display text-xl uppercase tracking-[0.12em] text-[#d9b865]">
                    {event.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-white/64">{event.shortDescription}</p>
                <div className="mt-4 grid gap-2 text-[10px] uppercase tracking-[0.16em] text-white/42 sm:grid-cols-2">
                    <span>Intensidade: {event.symbolicIntensity || "-"}/5</span>
                    <span>Emocao: {event.dominantEmotion || "-"}</span>
                    <span>Persona: {event.associatedPersona || "-"}</span>
                    <span>Lugar: {event.associatedPlace || "-"}</span>
                </div>
                {event.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                        {event.tags.map((tag) => (
                            <span key={tag} className="rounded border border-white/10 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-white/40">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
                <div className="mt-5 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setDetailsEvent(event)} className="rounded-lg border border-[#c5a059]/35 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#c5a059] transition hover:bg-[#c5a059]/10">
                        Ver detalhes
                    </button>
                    <button type="button" onClick={() => openEdit(event)} className="rounded-lg border border-white/12 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/55 transition hover:border-white/30 hover:text-white/80">
                        Editar
                    </button>
                    <button type="button" onClick={() => deleteEvent(event)} className="rounded-lg border border-red-400/25 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-red-300/70 transition hover:bg-red-500/10">
                        Excluir
                    </button>
                </div>
            </article>
        );
    };

    return (
        <main className="nemosine-main-container relative min-h-screen overflow-hidden">
            <div className="fixed inset-0 z-0">
                <div className="absolute inset-0 bg-[#050507]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(197,160,89,0.11),transparent_32%),linear-gradient(180deg,rgba(5,5,7,0.98),rgba(10,10,12,1))]" />
            </div>

            {!embed && <Navbar />}

            <section className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-8 lg:px-12">
                <header className="mb-8 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#c5a059]/55">Modulo Soberano</p>
                        <h1 className="mt-3 font-display text-4xl uppercase tracking-[0.18em] text-[#d9b865] sm:text-6xl">
                            Linha do Destino
                        </h1>
                        <p className="mt-3 max-w-3xl text-sm uppercase tracking-[0.22em] text-[#c5a059]/55">
                            Veja sua historia como travessia, nao como acumulo de dias.
                        </p>
                        <p className="mt-5 max-w-3xl text-sm leading-7 text-white/65">
                            Registre marcos da sua vida e observe como eles formam uma linha de sentido: fases, rupturas,
                            conquistas, perdas, viradas e nascimentos simbolicos.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={openCreate}
                        className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#c5a059]/50 bg-[#c5a059]/12 px-5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#d9b865] transition hover:border-[#c5a059] hover:bg-[#c5a059]/20"
                    >
                        + Registrar marco
                    </button>
                </header>

                <div className="mb-6 grid gap-3 md:grid-cols-4">
                    <div className="rounded-lg border border-[#c5a059]/18 bg-black/45 p-4">
                        <p className="text-[9px] uppercase tracking-[0.2em] text-white/35">Marcos</p>
                        <p className="mt-2 font-display text-3xl text-[#d9b865]">{events.length}</p>
                    </div>
                    <div className="rounded-lg border border-[#c5a059]/18 bg-black/45 p-4">
                        <p className="text-[9px] uppercase tracking-[0.2em] text-white/35">Legado</p>
                        <p className="mt-2 font-display text-3xl text-[#d9b865]">{legacyCount}</p>
                    </div>
                    <div className="rounded-lg border border-[#c5a059]/18 bg-black/45 p-4">
                        <p className="text-[9px] uppercase tracking-[0.2em] text-white/35">Cognitivos</p>
                        <p className="mt-2 font-display text-3xl text-[#d9b865]">{cognitivelyVisibleCount}</p>
                    </div>
                    <div className="rounded-lg border border-[#c5a059]/18 bg-black/45 p-4">
                        <p className="text-[9px] uppercase tracking-[0.2em] text-white/35">Ultimo marco registrado</p>
                        <p className="mt-2 truncate text-sm font-semibold text-[#eee8dc]">{lastEvent?.title || "Nenhum marco registrado ainda"}</p>
                    </div>
                </div>

                <section className="mb-8 rounded-lg border border-[#c5a059]/18 bg-black/45 p-4 backdrop-blur-md">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <select value={filters.category} onChange={(event) => updateFilter("category", event.target.value)} className="rounded border border-[#c5a059]/25 bg-black px-3 py-2 text-xs text-white/75">
                            <option value="">Todas as categorias</option>
                            {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                        <select value={filters.lifePhase} onChange={(event) => updateFilter("lifePhase", event.target.value)} className="rounded border border-[#c5a059]/25 bg-black px-3 py-2 text-xs text-white/75">
                            <option value="">Todas as fases</option>
                            {LIFE_PHASES.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                        <select value={filters.emotion} onChange={(event) => updateFilter("emotion", event.target.value)} className="rounded border border-[#c5a059]/25 bg-black px-3 py-2 text-xs text-white/75">
                            <option value="">Todas as emocoes</option>
                            {EMOTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                        <select value={filters.persona} onChange={(event) => updateFilter("persona", event.target.value)} className="rounded border border-[#c5a059]/25 bg-black px-3 py-2 text-xs text-white/75">
                            <option value="">Todas as personas</option>
                            {PERSONAS.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                        <select value={filters.intensity} onChange={(event) => updateFilter("intensity", event.target.value)} className="rounded border border-[#c5a059]/25 bg-black px-3 py-2 text-xs text-white/75">
                            <option value="">Toda intensidade</option>
                            {[1, 2, 3, 4, 5].map((item) => <option key={item} value={item}>{item}/5</option>)}
                        </select>
                        <select value={filters.year} onChange={(event) => updateFilter("year", event.target.value)} className="rounded border border-[#c5a059]/25 bg-black px-3 py-2 text-xs text-white/75">
                            <option value="">Todos os anos</option>
                            {years.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                        <select value={filters.visibility} onChange={(event) => updateFilter("visibility", event.target.value)} className="rounded border border-[#c5a059]/25 bg-black px-3 py-2 text-xs text-white/75">
                            <option value="">Toda visibilidade</option>
                            <option value="private">Privado</option>
                            <option value="sensitive">Sensivel</option>
                            <option value="legacy">Legado</option>
                        </select>
                        <select value={filters.cognitiveVisibility} onChange={(event) => updateFilter("cognitiveVisibility", event.target.value)} className="rounded border border-[#c5a059]/25 bg-black px-3 py-2 text-xs text-white/75">
                            <option value="">Toda visibilidade cognitiva</option>
                            {Object.entries(COGNITIVE_VISIBILITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                        <select value={filters.tag} onChange={(event) => updateFilter("tag", event.target.value)} className="rounded border border-[#c5a059]/25 bg-black px-3 py-2 text-xs text-white/75">
                            <option value="">Todas as tags</option>
                            {tags.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                            {(["line", "phases", "list"] as ViewMode[]).map((mode) => (
                                <button key={mode} type="button" onClick={() => setViewMode(mode)} className={`rounded-lg border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] ${viewMode === mode ? "border-[#c5a059] bg-[#c5a059]/15 text-[#d9b865]" : "border-white/10 text-white/45 hover:text-white/75"}`}>
                                    {mode === "line" ? "Linha" : mode === "phases" ? "Mapa de fases" : "Lista compacta"}
                                </button>
                            ))}
                        </div>
                        <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="rounded border border-[#c5a059]/25 bg-black px-3 py-2 text-xs text-white/75">
                            <option value="oldest">Mais antigo primeiro</option>
                            <option value="newest">Mais recente primeiro</option>
                            <option value="intensity">Maior intensidade simbolica</option>
                            <option value="category">Categoria</option>
                        </select>
                    </div>
                    <p className="mt-3 text-[10px] leading-5 text-white/35">
                        Intensidade simbolica mede o quanto esse evento reorganizou sua historia interna, nao sua importancia social.
                    </p>
                </section>

                {error && <p className="mb-5 rounded-lg border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-100">{error}</p>}
                {toast && <p className="fixed bottom-5 left-1/2 z-[130] -translate-x-1/2 rounded-lg border border-[#c5a059]/35 bg-black/90 px-4 py-3 text-xs uppercase tracking-[0.18em] text-[#d9b865] shadow-2xl">{toast}</p>}

                {loading ? (
                    <div className="rounded-lg border border-[#c5a059]/18 bg-black/45 p-10 text-center text-sm text-white/45">Carregando sua linha narrativa...</div>
                ) : filteredEvents.length === 0 ? (
                    <div className="rounded-lg border border-[#c5a059]/20 bg-black/50 p-10 text-center backdrop-blur-md">
                        <p className="font-display text-2xl uppercase tracking-[0.16em] text-[#d9b865]">Toda linha comeca com um ponto.</p>
                        <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-white/55">Registre o primeiro marco da sua travessia ou ajuste os filtros para reencontrar um acontecimento ja salvo.</p>
                        <button type="button" onClick={openCreate} className="mt-7 rounded-lg border border-[#c5a059]/45 bg-[#c5a059]/10 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#d9b865] hover:bg-[#c5a059]/20">
                            Registrar primeiro marco
                        </button>
                    </div>
                ) : viewMode === "line" ? (
                    <div className="relative mx-auto grid max-w-5xl gap-6 md:grid-cols-2 md:gap-x-16">
                        <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[#c5a059]/45 to-transparent md:block" />
                        {filteredEvents.map((event, index) => (
                            <div key={event.id} className={index % 2 === 0 ? "md:col-start-1" : "md:col-start-2 md:mt-16"}>
                                {renderEventCard(event, index)}
                            </div>
                        ))}
                    </div>
                ) : viewMode === "phases" ? (
                    <div className="grid gap-5 lg:grid-cols-2">
                        {Object.entries(eventsByPhase).map(([phase, phaseEvents]) => (
                            <section key={phase} className="rounded-lg border border-[#c5a059]/18 bg-black/45 p-5 backdrop-blur-md">
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <h2 className="font-display text-xl uppercase tracking-[0.16em] text-[#d9b865]">{phase}</h2>
                                    <span className="text-[10px] uppercase tracking-[0.18em] text-white/35">{phaseEvents.length} marcos</span>
                                </div>
                                <div className="space-y-3">
                                    {phaseEvents.map((event, index) => renderEventCard(event, index, true))}
                                </div>
                            </section>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredEvents.map((event) => (
                            <article key={event.id} className="grid gap-4 rounded-lg border border-[#c5a059]/18 bg-black/45 p-4 backdrop-blur-md md:grid-cols-[10rem_1fr_auto] md:items-center">
                                <div className="text-[10px] uppercase tracking-[0.18em] text-white/42">{formatDateLabel(event)}</div>
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-[#d9b865]">{event.title}</h3>
                                    <p className="mt-1 text-xs text-white/55">{event.category} | {event.shortDescription}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setDetailsEvent(event)} className="rounded border border-[#c5a059]/30 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[#c5a059]">Detalhes</button>
                                    <button type="button" onClick={() => openEdit(event)} className="rounded border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-white/55">Editar</button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            {formOpen && (
                <div className="fixed inset-0 z-[140] overflow-y-auto bg-black/80 px-4 py-8 backdrop-blur-md">
                    <form onSubmit={handleSubmit} className="mx-auto max-w-4xl rounded-lg border border-[#c5a059]/25 bg-[#08080a] p-5 shadow-2xl sm:p-7">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.24em] text-[#c5a059]/55">{editingEventId ? "Editar marco" : "Novo marco"}</p>
                                <h2 className="mt-2 font-display text-2xl uppercase tracking-[0.16em] text-[#d9b865]">Registro da Linha</h2>
                            </div>
                            <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60">Fechar</button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <label className="text-xs uppercase tracking-[0.16em] text-white/45">Titulo*
                                <input required minLength={2} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-2 w-full rounded border border-[#c5a059]/25 bg-black px-3 py-2 text-sm normal-case tracking-normal text-white" />
                            </label>
                            <label className="text-xs uppercase tracking-[0.16em] text-white/45">Data exata
                                <input type="date" value={form.eventDate || ""} onChange={(event) => setForm({ ...form, eventDate: event.target.value })} className="mt-2 w-full rounded border border-[#c5a059]/25 bg-black px-3 py-2 text-sm normal-case tracking-normal text-white" />
                            </label>
                            <label className="text-xs uppercase tracking-[0.16em] text-white/45">Data ou periodo aproximado
                                <input value={form.eventDateLabel || ""} placeholder="2021, infancia, por volta dos 18 anos" onChange={(event) => setForm({ ...form, eventDateLabel: event.target.value })} className="mt-2 w-full rounded border border-[#c5a059]/25 bg-black px-3 py-2 text-sm normal-case tracking-normal text-white placeholder:text-white/25" />
                            </label>
                            <label className="text-xs uppercase tracking-[0.16em] text-white/45">Categoria*
                                <select required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="mt-2 w-full rounded border border-[#c5a059]/25 bg-black px-3 py-2 text-sm normal-case tracking-normal text-white">
                                    {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
                                </select>
                            </label>
                            <label className="md:col-span-2 text-xs uppercase tracking-[0.16em] text-white/45">Descricao curta*
                                <textarea required value={form.shortDescription} onChange={(event) => setForm({ ...form, shortDescription: event.target.value })} rows={3} className="mt-2 w-full rounded border border-[#c5a059]/25 bg-black px-3 py-2 text-sm normal-case tracking-normal text-white" />
                            </label>
                            <label className="md:col-span-2 text-xs uppercase tracking-[0.16em] text-white/45">Descricao longa
                                <textarea value={form.longDescription || ""} onChange={(event) => setForm({ ...form, longDescription: event.target.value })} rows={5} className="mt-2 w-full rounded border border-[#c5a059]/25 bg-black px-3 py-2 text-sm normal-case tracking-normal text-white" />
                            </label>
                            <label className="text-xs uppercase tracking-[0.16em] text-white/45">Emocao dominante
                                <select value={form.dominantEmotion || ""} onChange={(event) => setForm({ ...form, dominantEmotion: event.target.value })} className="mt-2 w-full rounded border border-[#c5a059]/25 bg-black px-3 py-2 text-sm normal-case tracking-normal text-white">
                                    <option value="">Sem emocao definida</option>
                                    {EMOTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                                </select>
                            </label>
                            <label className="text-xs uppercase tracking-[0.16em] text-white/45">Intensidade simbolica
                                <input type="number" min={1} max={5} value={form.symbolicIntensity || ""} onChange={(event) => setForm({ ...form, symbolicIntensity: event.target.value ? Number(event.target.value) : null })} className="mt-2 w-full rounded border border-[#c5a059]/25 bg-black px-3 py-2 text-sm normal-case tracking-normal text-white" />
                            </label>
                            <label className="text-xs uppercase tracking-[0.16em] text-white/45">Persona associada
                                <select value={form.associatedPersona || ""} onChange={(event) => setForm({ ...form, associatedPersona: event.target.value })} className="mt-2 w-full rounded border border-[#c5a059]/25 bg-black px-3 py-2 text-sm normal-case tracking-normal text-white">
                                    <option value="">Nenhuma</option>
                                    {PERSONAS.map((item) => <option key={item} value={item}>{item}</option>)}
                                </select>
                            </label>
                            <label className="text-xs uppercase tracking-[0.16em] text-white/45">Lugar da mente
                                <select value={form.associatedPlace || ""} onChange={(event) => setForm({ ...form, associatedPlace: event.target.value })} className="mt-2 w-full rounded border border-[#c5a059]/25 bg-black px-3 py-2 text-sm normal-case tracking-normal text-white">
                                    <option value="">Nenhum</option>
                                    {PLACES.map((item) => <option key={item} value={item}>{item}</option>)}
                                </select>
                            </label>
                            <label className="text-xs uppercase tracking-[0.16em] text-white/45">Fase da vida
                                <input list="life-phases" value={form.lifePhase || ""} onChange={(event) => setForm({ ...form, lifePhase: event.target.value })} className="mt-2 w-full rounded border border-[#c5a059]/25 bg-black px-3 py-2 text-sm normal-case tracking-normal text-white" />
                                <datalist id="life-phases">{LIFE_PHASES.map((item) => <option key={item} value={item} />)}</datalist>
                            </label>
                            <label className="text-xs uppercase tracking-[0.16em] text-white/45">Classificacao historica
                                <select value={form.visibility} onChange={(event) => setForm({ ...form, visibility: event.target.value as DestinyVisibility })} className="mt-2 w-full rounded border border-[#c5a059]/25 bg-black px-3 py-2 text-sm normal-case tracking-normal text-white">
                                    <option value="private">Privado</option>
                                    <option value="sensitive">Sensivel</option>
                                    <option value="legacy">Legado</option>
                                </select>
                            </label>
                            <label className="text-xs uppercase tracking-[0.16em] text-white/45">Visibilidade externa
                                <select value={form.externalVisibility} onChange={(event) => setForm({ ...form, externalVisibility: event.target.value as DestinyExternalVisibility })} className="mt-2 w-full rounded border border-[#c5a059]/25 bg-black px-3 py-2 text-sm normal-case tracking-normal text-white">
                                    <option value="private">Privado fora do sistema</option>
                                    <option value="shareable">Compartilhavel externamente</option>
                                    <option value="legacy">Legado publico/biografico</option>
                                </select>
                            </label>
                            <label className="text-xs uppercase tracking-[0.16em] text-white/45">Visibilidade cognitiva
                                <select value={form.cognitiveVisibility} onChange={(event) => setForm({ ...form, cognitiveVisibility: event.target.value as DestinyCognitiveVisibility })} className="mt-2 w-full rounded border border-[#c5a059]/25 bg-black px-3 py-2 text-sm normal-case tracking-normal text-white">
                                    {Object.entries(COGNITIVE_VISIBILITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                </select>
                            </label>
                            <label className="text-xs uppercase tracking-[0.16em] text-white/45">Personas cognitivas
                                <input value={form.cognitivePersonas} placeholder="Somente se seletivo; separe por virgula" onChange={(event) => setForm({ ...form, cognitivePersonas: event.target.value })} className="mt-2 w-full rounded border border-[#c5a059]/25 bg-black px-3 py-2 text-sm normal-case tracking-normal text-white placeholder:text-white/25" />
                            </label>
                            <label className="text-xs uppercase tracking-[0.16em] text-white/45">Fonte do registro
                                <input value={form.source || ""} placeholder="memoria pessoal, documento, foto..." onChange={(event) => setForm({ ...form, source: event.target.value })} className="mt-2 w-full rounded border border-[#c5a059]/25 bg-black px-3 py-2 text-sm normal-case tracking-normal text-white placeholder:text-white/25" />
                            </label>
                            <label className="text-xs uppercase tracking-[0.16em] text-white/45">Tags
                                <input value={form.tags} placeholder="separadas por virgula" onChange={(event) => setForm({ ...form, tags: event.target.value })} className="mt-2 w-full rounded border border-[#c5a059]/25 bg-black px-3 py-2 text-sm normal-case tracking-normal text-white placeholder:text-white/25" />
                            </label>
                            <label className="md:col-span-2 text-xs uppercase tracking-[0.16em] text-white/45">Imagem ou icone simbolico
                                <input value={form.imageUrl || ""} placeholder="URL opcional" onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} className="mt-2 w-full rounded border border-[#c5a059]/25 bg-black px-3 py-2 text-sm normal-case tracking-normal text-white placeholder:text-white/25" />
                            </label>
                        </div>

                        {form.visibility === "sensitive" && (
                            <p className="mt-5 rounded-lg border border-stone-400/20 bg-stone-400/10 p-3 text-xs leading-6 text-stone-200/75">
                                Este marco pode conter informacoes pessoais delicadas. Registre apenas o que deseja manter no sistema.
                            </p>
                        )}

                        <div className="mt-7 flex flex-wrap justify-end gap-3">
                            <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-white/10 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">Cancelar</button>
                            <button type="submit" disabled={saving} className="rounded-lg border border-[#c5a059]/50 bg-[#c5a059]/12 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#d9b865] disabled:opacity-50">
                                {saving ? "Salvando..." : "Salvar marco"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {detailsEvent && (
                <div className="fixed inset-0 z-[140] overflow-y-auto bg-black/80 px-4 py-8 backdrop-blur-md">
                    <article className="mx-auto max-w-3xl rounded-lg border border-[#c5a059]/25 bg-[#08080a] p-5 shadow-2xl sm:p-7">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.22em] text-[#c5a059]/55">{formatDateLabel(detailsEvent)} | {detailsEvent.category}</p>
                                <h2 className="mt-2 font-display text-3xl uppercase tracking-[0.14em] text-[#d9b865]">{detailsEvent.title}</h2>
                            </div>
                            <button type="button" onClick={() => setDetailsEvent(null)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60">Fechar</button>
                        </div>
                        <p className="mt-6 text-sm leading-7 text-white/70">{detailsEvent.longDescription || detailsEvent.shortDescription}</p>
                        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                            {[
                                ["Emocao dominante", detailsEvent.dominantEmotion || "-"],
                                ["Intensidade simbolica", `${detailsEvent.symbolicIntensity || "-"}/5`],
                                ["Persona associada", detailsEvent.associatedPersona || "-"],
                                ["Lugar associado", detailsEvent.associatedPlace || "-"],
                                ["Fase da vida", detailsEvent.lifePhase || "-"],
                                ["Classificacao historica", VISIBILITY_LABELS[detailsEvent.visibility]],
                                ["Visibilidade externa", EXTERNAL_VISIBILITY_LABELS[detailsEvent.externalVisibility]],
                                ["Visibilidade cognitiva", COGNITIVE_VISIBILITY_LABELS[detailsEvent.cognitiveVisibility]],
                                ["Personas cognitivas", detailsEvent.cognitivePersonas.join(", ") || "-"],
                                ["Fonte", detailsEvent.source || "-"],
                                ["Tags", detailsEvent.tags.join(", ") || "-"],
                                ["Criado em", detailsEvent.createdAt ? new Date(detailsEvent.createdAt).toLocaleString("pt-BR") : "-"],
                                ["Ultima edicao", detailsEvent.updatedAt ? new Date(detailsEvent.updatedAt).toLocaleString("pt-BR") : "-"],
                            ].map(([label, value]) => (
                                <div key={label} className="rounded border border-white/10 bg-white/5 p-3">
                                    <dt className="text-[9px] uppercase tracking-[0.18em] text-white/35">{label}</dt>
                                    <dd className="mt-1 text-white/75">{value}</dd>
                                </div>
                            ))}
                        </dl>
                        <section className="mt-6 rounded-lg border border-[#c5a059]/20 bg-[#c5a059]/8 p-4">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#c5a059]">Leitura narrativa</h3>
                            <p className="mt-3 text-sm leading-7 text-white/68">{narrativeReading(detailsEvent)}</p>
                        </section>
                        <div className="mt-7 flex flex-wrap justify-between gap-3">
                            <Link href="/space/travessia" className="rounded-lg border border-[#c5a059]/35 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#c5a059]">Abrir Travessia</Link>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => openEdit(detailsEvent)} className="rounded-lg border border-white/10 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">Editar</button>
                                <button type="button" onClick={() => deleteEvent(detailsEvent)} className="rounded-lg border border-red-400/25 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-red-300/70">Excluir</button>
                            </div>
                        </div>
                    </article>
                </div>
            )}

            {!embed && <InstitutionalFooter />}
        </main>
    );
}
