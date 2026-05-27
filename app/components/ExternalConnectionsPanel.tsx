"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface ConnectionDefinition {
    id: string;
    label: string;
    owner: string;
    purpose: string;
}

interface CalendarStatus {
    connected: boolean;
    hasGoogleAccount: boolean;
    hasCalendarScope: boolean;
}

interface ConnectionState {
    connected: boolean;
    loading?: boolean;
}

interface CalendarEvent {
    id: string;
    summary: string;
    start: string;
    end: string;
    htmlLink?: string;
}

const GOOGLE_CALENDAR_SCOPE = "openid email profile https://www.googleapis.com/auth/calendar.readonly";

const personaConnections: Record<string, ConnectionDefinition[]> = {
    Arauto: [
        {
            id: "google-calendar",
            label: "Google Agenda",
            owner: "Arauto",
            purpose: "calendário e compromissos"
        }
    ],
    Treinador: [
        { id: "google-health", label: "Google Health", owner: "Treinador", purpose: "dados de saúde" },
        { id: "strava", label: "Strava", owner: "Treinador", purpose: "atividades físicas" },
        { id: "gravl", label: "Gravl", owner: "Treinador", purpose: "treinos e evolução" },
        { id: "google-fit", label: "Google Fit", owner: "Treinador", purpose: "atividade e bem-estar" }
    ],
    Mentor: [
        { id: "linkedin", label: "LinkedIn", owner: "Mentor", purpose: "trajetória profissional" }
    ],
    Mordomo: [
        { id: "open-finance", label: "Open Finance", owner: "Mordomo", purpose: "vida financeira" }
    ]
};

const allConnections = Object.values(personaConnections).flat();

interface ExternalConnectionsPanelProps {
    personaName?: string;
    variant?: "chat" | "space";
}

export default function ExternalConnectionsPanel({
    personaName,
    variant = "chat"
}: ExternalConnectionsPanelProps) {
    const { status } = useSession();
    const [selected, setSelected] = useState<ConnectionDefinition | null>(null);
    const [calendarStatus, setCalendarStatus] = useState<CalendarStatus | null>(null);
    const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
    const [calendarLoading, setCalendarLoading] = useState(false);
    const [calendarError, setCalendarError] = useState("");
    const connections = variant === "space"
        ? allConnections
        : personaConnections[personaName || ""] || [];
    const hasCalendarConnection = connections.some((connection) => connection.id === "google-calendar");

    useEffect(() => {
        if (status !== "authenticated" || !hasCalendarConnection) return;
        refreshCalendarState();
    }, [status, hasCalendarConnection]);

    if (!connections.length) return null;

    async function refreshCalendarState() {
        setCalendarLoading(true);
        setCalendarError("");
        try {
            const statusResponse = await fetch("/api/google/calendar/status");
            if (!statusResponse.ok) throw new Error("Não foi possível verificar a conexão com Google Agenda.");
            const nextStatus = await statusResponse.json();
            setCalendarStatus(nextStatus);

            if (nextStatus.connected) {
                const eventsResponse = await fetch("/api/google/calendar/events");
                const eventsData = await eventsResponse.json();
                if (!eventsResponse.ok) throw new Error(eventsData.error || "Não foi possível ler a Agenda Google.");
                setCalendarEvents(eventsData.events ?? []);
            } else {
                setCalendarEvents([]);
            }
        } catch (error) {
            setCalendarError(error instanceof Error ? error.message : "Erro ao consultar a Agenda Google.");
        } finally {
            setCalendarLoading(false);
        }
    }

    async function connectGoogleCalendar() {
        if (calendarStatus?.hasGoogleAccount && !calendarStatus.connected) {
            await fetch("/api/google/calendar/reconnect", { method: "POST" });
        }

        await signIn(
            "google",
            { redirectTo: window.location.pathname },
            {
                scope: GOOGLE_CALENDAR_SCOPE,
                access_type: "offline",
                prompt: "consent",
                include_granted_scopes: "true",
                response_type: "code",
            }
        );
    }

    function openConnection(connection: ConnectionDefinition) {
        setSelected(connection);
        if (connection.id === "google-calendar") {
            refreshCalendarState();
        }
    }

    function getConnectionState(connection: ConnectionDefinition): ConnectionState {
        if (connection.id === "google-calendar") {
            return {
                connected: Boolean(calendarStatus?.connected),
                loading: calendarLoading && !calendarStatus,
            };
        }

        return { connected: false };
    }

    return (
        <>
            {variant === "chat" ? (
                <section className="mb-2 shrink-0 rounded-xl border border-[#c5a059]/15 bg-black/30 px-3 py-2">
                    <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-thin scrollbar-thumb-[#c5a059]/20">
                        <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.2em] text-[#c5a059]/55">
                            Conexões
                        </span>
                        {connections.map((connection) => (
                            <ConnectionButton
                                key={connection.id}
                                connection={connection}
                                state={getConnectionState(connection)}
                                onClick={() => openConnection(connection)}
                            />
                        ))}
                    </div>
                </section>
            ) : (
                <section className="mt-8 rounded-2xl border border-[#c5a059]/15 bg-black/25 p-5 sm:p-6">
                    <div className="mb-5">
                        <h2 className="font-serif text-xl text-[#e7d4aa]">Conexões externas</h2>
                        <p className="mt-2 text-sm leading-6 text-white/55">
                            Vincule serviços às personas responsáveis por interpretar cada dimensão da sua rotina.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {connections.map((connection) => (
                            <div
                                key={connection.id}
                                className="rounded-xl border border-[#c5a059]/12 bg-black/25 p-4"
                            >
                                <p className="text-[10px] uppercase tracking-[0.18em] text-[#c5a059]/55">
                                    {connection.owner}
                                </p>
                                <p className="mt-2 text-base text-[#eee8dc]">{connection.label}</p>
                                <p className="mb-4 mt-1 text-xs text-white/48">{connection.purpose}</p>
                                <ConnectionButton
                                    connection={connection}
                                    state={getConnectionState(connection)}
                                    onClick={() => openConnection(connection)}
                                    wide
                                />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label={`Conectar ${selected.label}`}
                        className="w-full max-w-md rounded-2xl border border-[#c5a059]/25 bg-[#0c0d11] p-6 shadow-2xl"
                    >
                        <p className="text-[10px] uppercase tracking-[0.22em] text-[#c5a059]/65">
                            {selected.owner}
                        </p>
                        <h3 className="mt-3 font-serif text-2xl text-[#e7d4aa]">
                            Conectar {selected.label}
                        </h3>
                        {selected.id === "google-calendar" ? (
                            <GoogleCalendarDialog
                                status={calendarStatus}
                                events={calendarEvents}
                                loading={calendarLoading}
                                error={calendarError}
                                onConnect={connectGoogleCalendar}
                                onRefresh={refreshCalendarState}
                                onClose={() => setSelected(null)}
                            />
                        ) : (
                            <>
                                <p className="mt-4 text-sm leading-6 text-[#ded6c8]/72">
                                    A autorização segura para esta conexão ainda será configurada. Nenhum dado foi compartilhado ou sincronizado.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setSelected(null)}
                                    className="mt-6 w-full rounded-xl bg-[#c5a059] px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-black"
                                >
                                    Entendi
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

function ConnectionButton({
    connection,
    state,
    onClick,
    wide = false
}: {
    connection: ConnectionDefinition;
    state: ConnectionState;
    onClick: () => void;
    wide?: boolean;
}) {
    const connected = state.connected;
    const loading = state.loading;

    return (
        <button
            type="button"
            onClick={onClick}
            className={`${wide ? "w-full justify-center" : "shrink-0"} inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors ${connected
                ? "border-emerald-300/35 bg-emerald-400/10 text-emerald-200 hover:border-emerald-200/65 hover:bg-emerald-400/15"
                : "border-[#c5a059]/22 bg-[#c5a059]/[0.06] text-[#c5a059]/80 hover:border-[#c5a059]/55 hover:bg-[#c5a059]/12"
            }`}
            aria-label={`${connected ? "Sincronizado" : "Conectar"} ${connection.label}`}
        >
            <span className="material-icons text-sm">{connected ? "check_circle" : "link"}</span>
            {loading ? "Verificando..." : connected ? "Sincronizado" : `Conectar ${connection.label}`}
        </button>
    );
}

function GoogleCalendarDialog({
    status,
    events,
    loading,
    error,
    onConnect,
    onRefresh,
    onClose
}: {
    status: CalendarStatus | null;
    events: CalendarEvent[];
    loading: boolean;
    error: string;
    onConnect: () => void;
    onRefresh: () => void;
    onClose: () => void;
}) {
    const connected = Boolean(status?.connected);

    return (
        <div className="mt-4">
            <p className="text-sm leading-6 text-[#ded6c8]/72">
                {connected
                    ? "Agenda autorizada. Estes são os próximos compromissos disponíveis para leitura pelo Nemosine."
                    : "Autorize a leitura da sua Agenda Google para que o Arauto possa consultar compromissos e prazos."}
            </p>

            {error && (
                <p className="mt-4 rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-xs text-red-200">
                    {error}
                </p>
            )}

            {connected && (
                <div className="mt-5 max-h-56 space-y-2 overflow-y-auto pr-1">
                    {loading && <p className="text-sm text-[#c5a059]/70">Consultando agenda...</p>}
                    {!loading && events.length === 0 && (
                        <p className="text-sm text-white/45">Nenhum compromisso futuro encontrado.</p>
                    )}
                    {!loading && events.map((event) => (
                        <a
                            key={event.id}
                            href={event.htmlLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-lg border border-[#c5a059]/12 bg-black/25 px-3 py-2 transition-colors hover:border-[#c5a059]/40"
                        >
                            <span className="block text-sm text-[#eee8dc]">{event.summary}</span>
                            <span className="mt-1 block text-[11px] text-[#c5a059]/65">
                                {formatCalendarDate(event.start)}
                            </span>
                        </a>
                    ))}
                </div>
            )}

            <div className="mt-6 flex gap-3">
                <button
                    type="button"
                    onClick={connected ? onRefresh : onConnect}
                    className="flex-1 rounded-xl bg-[#c5a059] px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-black"
                >
                    {connected ? "Atualizar" : "Autorizar Google"}
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-[#c5a059]/25 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-[#c5a059]"
                >
                    Fechar
                </button>
            </div>
        </div>
    );
}

function formatCalendarDate(value: string) {
    if (!value) return "Sem horário definido";
    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: value.includes("T") ? "short" : undefined,
    }).format(new Date(value));
}
