"use client";

import { useEffect, useMemo, useState } from "react";
import Navbar from "@/app/components/Navbar";

type Source = {
  id: string;
  factualSummary: string;
  sourceModule: string;
  occurredAt: string;
};

type Manuscript = {
  id: string;
  personaId: string;
  dateKey: string;
  title: string | null;
  body: string;
  entryType: string;
  tone: string;
  isPinned: boolean;
  isRead: boolean;
  createdAt: string;
  sources: Source[];
};

type Archive = { personaId: string; count: number; lastCreatedAt: string };
type Preference = { personaId: string; enabled: boolean; sourceModules: string[]; minimumSalience: number };
type Settings = {
  enabled: boolean;
  frequency: "discreta" | "equilibrada" | "intensa";
  notificationsEnabled: boolean;
  allowedSourceModules: string[];
};

const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  frequency: "equilibrada",
  notificationsEnabled: false,
  allowedSourceModules: ["agenda", "destiny-line", "registros", "projects", "tasks", "persona-chat", "system"],
};

const SOURCE_LABELS: Record<string, string> = {
  agenda: "Agenda",
  "destiny-line": "Linha do Destino",
  registros: "Registros",
  projects: "Projetos",
  tasks: "Tarefas",
  "persona-chat": "Conversas comuns",
  system: "Sistema",
  health: "Saude",
  financial: "Financas",
};

const PERSONA_IMAGE_OVERRIDES: Record<string, string> = {
  "Bobo da Corte": "Bobo",
  "Confessor 2.0": "Confessor",
  "Orquestrador-Arquiteto": "Orquestrador",
};

function personaImage(personaId: string) {
  const file = PERSONA_IMAGE_OVERRIDES[personaId] || personaId;
  return `/agents/${file}.png`;
}

function apiAction(action: string, payload: Record<string, unknown> = {}) {
  return fetch("/api/sovereign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  }).then(async (response) => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Falha ao consultar o Sovereign.");
    return data;
  });
}

function userFacingError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (
    message.includes("prisma.")
    || message.includes("Can't reach database")
    || message.includes("database server")
    || message.includes("P1001")
    || message.includes("supabase.co")
  ) {
    return "Os acontecimentos foram preservados, mas ainda nao puderam ser transformados em manuscritos.";
  }
  return message || "O Castelo encontrou uma falha temporaria ao consultar os manuscritos.";
}

function groupLabel(dateKey: string) {
  const today = new Date();
  const local = new Date(`${dateKey}T12:00:00`);
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startLocal = new Date(local.getFullYear(), local.getMonth(), local.getDate());
  const diff = Math.round((startToday.getTime() - startLocal.getTime()) / 86400000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  if (diff >= 2 && diff <= 6) return "Esta semana";
  return "Datas anteriores";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ManuscritosClient({ embed = false }: { embed?: boolean }) {
  const [view, setView] = useState<"feed" | "archives" | "settings">("feed");
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [archives, setArchives] = useState<Archive[]>([]);
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<string>("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<"loading" | "ready" | "generating" | "error">("loading");
  const [notice, setNotice] = useState("");

  const load = async (filters: Record<string, unknown> = {}) => {
    setStatus((current) => current === "generating" ? "generating" : "loading");
    try {
      const data = await apiAction("get_persona_manuscripts", filters);
      setManuscripts(data.manuscripts || []);
      setArchives(data.archives || []);
      setSettings(data.settings || DEFAULT_SETTINGS);
      setPreferences(data.preferences || []);
      setStatus("ready");
      return true;
    } catch (error: any) {
      setManuscripts([]);
      setArchives([]);
      setPreferences([]);
      setSettings(DEFAULT_SETTINGS);
      setNotice(userFacingError(error));
      setStatus("error");
      return false;
    }
  };

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      const loaded = await load();
      if (!cancelled && loaded) {
        await processRecent();
      }
    };
    boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processRecent = async () => {
    setStatus("generating");
    setNotice("As vozes do Castelo estao organizando os acontecimentos recentes.");
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const result = await apiAction("process_persona_manuscripts", { timeZone });
      if (result.generatedCount > 0) {
        setNotice(`${result.generatedCount} manuscrito(s) foram arquivados.`);
      } else if (result.status === "disabled") {
        setNotice("Os Manuscritos do Castelo estao desativados.");
      } else {
        setNotice("Nenhum acontecimento exigiu registro neste periodo.");
      }
      await load({ personaId: selectedPersona || undefined, search: search || undefined, from: from || undefined, to: to || undefined });
    } catch (error) {
      setNotice(userFacingError(error));
      setStatus("error");
    }
  };

  const filteredArchives = useMemo(() => {
    const withManuscripts = new Set(manuscripts.map((item) => item.personaId));
    return archives.filter((archive) => withManuscripts.has(archive.personaId) || archive.count > 0);
  }, [archives, manuscripts]);

  const grouped = useMemo(() => {
    const groups: Record<string, Manuscript[]> = {};
    for (const manuscript of manuscripts) {
      const label = groupLabel(manuscript.dateKey);
      groups[label] = groups[label] || [];
      groups[label].push(manuscript);
    }
    return ["Hoje", "Ontem", "Esta semana", "Datas anteriores"]
      .map((label) => ({ label, items: groups[label] || [] }))
      .filter((group) => group.items.length > 0);
  }, [manuscripts]);

  const applyFilters = () => load({
    personaId: selectedPersona || undefined,
    search: search || undefined,
    from: from || undefined,
    to: to || undefined,
  });

  const updateManuscript = async (id: string, patch: Record<string, unknown>) => {
    await apiAction("update_persona_manuscript", { manuscriptId: id, ...patch });
    await load({ personaId: selectedPersona || undefined, search: search || undefined, from: from || undefined, to: to || undefined });
  };

  const setPersonaEnabled = async (personaId: string, enabled: boolean) => {
    await apiAction("set_persona_manuscript_preference", { personaId, enabled });
    await load({ personaId: selectedPersona || undefined });
  };

  const updateSettings = async (patch: Partial<Settings>) => {
    try {
      const data = await apiAction("update_persona_manuscript_settings", patch);
      setSettings(data.settings || DEFAULT_SETTINGS);
    } catch (error) {
      setNotice(userFacingError(error));
      setStatus("error");
    }
  };

  const preferenceFor = (personaId: string) => preferences.find((pref) => pref.personaId === personaId);

  return (
    <main className="min-h-screen bg-[#07070a] text-[#eee8dc]">
      {!embed && <Navbar mobileCollapsible defaultMobileCollapsed />}
      <div className={`${embed ? "p-4" : "px-4 py-10 sm:px-8"} mx-auto max-w-6xl`}>
        <header className="mb-6 border-b border-[#c5a059]/15 pb-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.34em] text-[#c5a059]/55">Modulo Soberano</p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-3xl uppercase tracking-[0.18em] text-[#c5a059] sm:text-4xl">
                Manuscritos do Castelo
              </h1>
              <p className="mt-3 max-w-2xl text-sm italic leading-6 text-[#d7cab2]/70">
                Enquanto o Autor atravessa, o Castelo escreve.
              </p>
            </div>
            <button
              type="button"
              onClick={processRecent}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#c5a059]/35 bg-[#c5a059]/10 px-4 text-xs font-bold uppercase tracking-[0.18em] text-[#fde68a] transition-colors hover:border-[#c5a059]/70 hover:bg-[#c5a059]/18"
            >
              <span className="material-icons text-base">sync</span>
              Atualizar cronica
            </button>
          </div>
        </header>

        {notice && (
          <div className={`mb-5 rounded-lg border px-4 py-3 text-sm ${
            status === "error" ? "border-red-400/30 bg-red-950/25 text-red-100" : "border-[#c5a059]/20 bg-black/35 text-[#d8ceb9]"
          }`}>
            {notice}
          </div>
        )}

        <div className="mb-5 flex flex-wrap gap-2">
          {[
            ["feed", "Cronica do Castelo", "article"],
            ["archives", "Arquivos das Personas", "inventory_2"],
            ["settings", "Configuracoes", "tune"],
          ].map(([id, label, icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id as typeof view)}
              className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-[10px] font-bold uppercase tracking-[0.16em] ${
                view === id ? "border-[#c5a059] bg-[#c5a059]/15 text-[#fde68a]" : "border-[#c5a059]/15 bg-black/25 text-[#c5a059]/65"
              }`}
            >
              <span className="material-icons text-sm">{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {view !== "settings" && (
          <section className="mb-5 grid gap-3 rounded-lg border border-[#c5a059]/12 bg-black/30 p-3 sm:grid-cols-[1fr_150px_150px_auto]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar nos manuscritos"
              className="min-h-10 rounded-md border border-[#c5a059]/15 bg-black/45 px-3 text-sm outline-none placeholder:text-stone-600"
            />
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="min-h-10 rounded-md border border-[#c5a059]/15 bg-black/45 px-3 text-sm outline-none"
            />
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="min-h-10 rounded-md border border-[#c5a059]/15 bg-black/45 px-3 text-sm outline-none"
            />
            <button
              type="button"
              onClick={applyFilters}
              className="min-h-10 rounded-md border border-[#c5a059]/30 px-4 text-xs font-bold uppercase tracking-widest text-[#c5a059]"
            >
              Filtrar
            </button>
          </section>
        )}

        {status === "loading" && <p className="py-10 text-center text-sm text-[#c5a059]/60">Carregando manuscritos...</p>}

        {view === "feed" && status !== "loading" && (
          grouped.length === 0 ? (
            <section className="rounded-lg border border-[#c5a059]/15 bg-black/35 p-10 text-center">
              <h2 className="font-display text-xl uppercase tracking-[0.2em] text-[#c5a059]">O Castelo permaneceu em silencio.</h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#d8ceb9]/65">
                Quando acontecimentos significativos ocorrerem, algumas vozes poderao deixar seus registros aqui.
              </p>
            </section>
          ) : (
            <section className="space-y-8">
              {grouped.map((group) => (
                <div key={group.label}>
                  <h2 className="mb-3 border-b border-[#c5a059]/10 pb-2 text-[11px] font-bold uppercase tracking-[0.28em] text-[#c5a059]/60">
                    {group.label}
                  </h2>
                  <div className="space-y-4">
                    {group.items.map((manuscript) => (
                      <article key={manuscript.id} className={`rounded-lg border bg-[#0d0c0f]/86 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.35)] ${manuscript.isRead ? "border-[#c5a059]/12" : "border-[#c5a059]/45"}`}>
                        <div className="flex gap-4">
                          <img src={personaImage(manuscript.personaId)} alt={manuscript.personaId} className="h-12 w-12 rounded-md border border-[#c5a059]/20 object-cover" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#c5a059]/70">{manuscript.personaId}</p>
                                <p className="mt-1 text-xs text-stone-500">{formatDate(manuscript.createdAt)}</p>
                              </div>
                              <div className="flex gap-1">
                                {!manuscript.isRead && <span className="rounded-full border border-[#c5a059]/30 px-2 py-1 text-[9px] uppercase tracking-widest text-[#fde68a]">Nao lido</span>}
                                <button type="button" title="Marcar como importante" onClick={() => updateManuscript(manuscript.id, { isPinned: !manuscript.isPinned })} className="flex h-8 w-8 items-center justify-center rounded-md border border-[#c5a059]/20 text-[#c5a059]">
                                  <span className="material-icons text-sm">{manuscript.isPinned ? "bookmark" : "bookmark_border"}</span>
                                </button>
                                <button type="button" title="Excluir" onClick={() => updateManuscript(manuscript.id, { isHidden: true })} className="flex h-8 w-8 items-center justify-center rounded-md border border-red-400/15 text-red-300/70">
                                  <span className="material-icons text-sm">delete</span>
                                </button>
                                <button type="button" title="Silenciar persona" onClick={() => setPersonaEnabled(manuscript.personaId, false)} className="flex h-8 w-8 items-center justify-center rounded-md border border-[#c5a059]/20 text-[#c5a059]/75">
                                  <span className="material-icons text-sm">volume_off</span>
                                </button>
                              </div>
                            </div>
                            {manuscript.title && <h3 className="mt-4 font-display text-lg text-[#f1dfb7]">{manuscript.title}</h3>}
                            <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-[#e9dfce]">{manuscript.body}</p>
                            <div className="mt-4 flex flex-wrap gap-2 text-[9px] uppercase tracking-widest">
                              <span className="rounded border border-[#c5a059]/15 px-2 py-1 text-[#c5a059]/65">{manuscript.entryType}</span>
                              <span className="rounded border border-[#c5a059]/15 px-2 py-1 text-[#c5a059]/65">{manuscript.tone}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setExpanded((current) => ({ ...current, [manuscript.id]: !current[manuscript.id] }))}
                              className="mt-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#c5a059]/70"
                            >
                              <span className="material-icons text-sm">{expanded[manuscript.id] ? "expand_less" : "expand_more"}</span>
                              Origem do manuscrito
                            </button>
                            {expanded[manuscript.id] && (
                              <ul className="mt-3 space-y-2 rounded-md border border-[#c5a059]/10 bg-black/25 p-3 text-sm text-[#d8ceb9]/70">
                                {manuscript.sources.map((source) => (
                                  <li key={source.id} className="flex gap-2">
                                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]/60" />
                                    <span>{source.factualSummary}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )
        )}

        {view === "archives" && (
          <section className="grid gap-4 md:grid-cols-[260px_1fr]">
            <aside className="space-y-2">
              {filteredArchives.length === 0 ? (
                <p className="rounded-lg border border-[#c5a059]/15 bg-black/30 p-5 text-sm text-stone-500">Nenhuma persona possui manuscritos ainda.</p>
              ) : filteredArchives.map((archive) => {
                const pref = preferenceFor(archive.personaId);
                return (
                  <button
                    key={archive.personaId}
                    type="button"
                    onClick={() => { setSelectedPersona(archive.personaId); load({ personaId: archive.personaId }); }}
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left ${selectedPersona === archive.personaId ? "border-[#c5a059] bg-[#c5a059]/10" : "border-[#c5a059]/15 bg-black/30"}`}
                  >
                    <img src={personaImage(archive.personaId)} alt={archive.personaId} className="h-10 w-10 rounded object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-[#e9dfce]">Arquivo de {archive.personaId}</span>
                      <span className="text-[10px] uppercase tracking-widest text-[#c5a059]/55">{archive.count} manuscritos {pref?.enabled === false ? "silenciado" : ""}</span>
                    </span>
                  </button>
                );
              })}
            </aside>
            <div className="rounded-lg border border-[#c5a059]/15 bg-black/25 p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-xl text-[#c5a059]">
                  {selectedPersona ? `Arquivo de ${selectedPersona}` : "Arquivos das Personas"}
                </h2>
                {selectedPersona && (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setPersonaEnabled(selectedPersona, preferenceFor(selectedPersona)?.enabled === false)} className="rounded-md border border-[#c5a059]/25 px-3 py-2 text-[10px] uppercase tracking-widest text-[#c5a059]">
                      {preferenceFor(selectedPersona)?.enabled === false ? "Reativar" : "Silenciar"}
                    </button>
                    <button type="button" onClick={() => apiAction("mark_persona_manuscripts_read", { personaId: selectedPersona }).then(() => load({ personaId: selectedPersona }))} className="rounded-md border border-[#c5a059]/25 px-3 py-2 text-[10px] uppercase tracking-widest text-[#c5a059]">
                      Marcar lidos
                    </button>
                    <button type="button" onClick={() => apiAction("delete_persona_manuscripts_for_persona", { personaId: selectedPersona }).then(() => load())} className="rounded-md border border-red-400/20 px-3 py-2 text-[10px] uppercase tracking-widest text-red-300">
                      Excluir arquivo
                    </button>
                  </div>
                )}
              </div>
              {manuscripts.length === 0 ? (
                <p className="py-10 text-center text-sm text-stone-500">Selecione uma persona com manuscritos arquivados.</p>
              ) : (
                <div className="space-y-3">
                  {manuscripts.map((item) => (
                    <div key={item.id} className="rounded-md border border-[#c5a059]/10 bg-[#0c0b0e] p-4">
                      <p className="text-[10px] uppercase tracking-widest text-[#c5a059]/55">{item.personaId} · {formatDate(item.createdAt)}</p>
                      <h3 className="mt-2 font-display text-lg text-[#f1dfb7]">{item.title || "Manuscrito"}</h3>
                      <p className="mt-2 text-sm leading-6 text-[#e9dfce]/85">{item.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {view === "settings" && settings && (
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-[#c5a059]/15 bg-black/30 p-5">
              <h2 className="font-display text-xl text-[#c5a059]">Configuracoes da cronica</h2>
              <label className="mt-5 flex items-center justify-between gap-4 border-b border-[#c5a059]/10 pb-4 text-sm">
                <span>Ativar Manuscritos do Castelo</span>
                <input type="checkbox" checked={settings.enabled} onChange={(event) => updateSettings({ enabled: event.target.checked })} />
              </label>
              <label className="mt-4 block text-sm">
                Frequencia narrativa
                <select value={settings.frequency} onChange={(event) => updateSettings({ frequency: event.target.value as Settings["frequency"] })} className="mt-2 w-full rounded-md border border-[#c5a059]/20 bg-black p-3 text-sm">
                  <option value="discreta">Discreta</option>
                  <option value="equilibrada">Equilibrada</option>
                  <option value="intensa">Intensa</option>
                </select>
              </label>
              <label className="mt-5 flex items-center justify-between gap-4 border-t border-[#c5a059]/10 pt-4 text-sm">
                <span>Notificacoes discretas</span>
                <input type="checkbox" checked={settings.notificationsEnabled} onChange={(event) => updateSettings({ notificationsEnabled: event.target.checked })} />
              </label>
            </div>
            <div className="rounded-lg border border-[#c5a059]/15 bg-black/30 p-5">
              <h2 className="font-display text-xl text-[#c5a059]">Fontes autorizadas</h2>
              <div className="mt-4 grid gap-2">
                {Object.entries(SOURCE_LABELS).map(([id, label]) => {
                  const blockedByDefault = id === "health" || id === "financial";
                  const checked = settings.allowedSourceModules.includes(id);
                  return (
                    <label key={id} className="flex items-center justify-between gap-3 rounded-md border border-[#c5a059]/10 bg-black/20 px-3 py-2 text-sm">
                      <span>{label}{blockedByDefault ? " (bloqueado por padrao)" : ""}</span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          const next = event.target.checked
                            ? [...settings.allowedSourceModules, id]
                            : settings.allowedSourceModules.filter((source) => source !== id);
                          updateSettings({ allowedSourceModules: [...new Set(next)] });
                        }}
                      />
                    </label>
                  );
                })}
              </div>
              <p className="mt-4 text-xs leading-5 text-stone-500">O Confessor permanece indisponivel para processamento transversal.</p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
