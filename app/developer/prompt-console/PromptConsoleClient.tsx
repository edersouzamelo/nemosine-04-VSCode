"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";

type Authority = "HARD" | "PRIMARY" | "CONTEXT" | "MODULATION" | "OBSERVATION";

type ModuleConfig = {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
  authority: Authority;
  source: string;
  scope: string;
  tokenBudget: number;
  locked?: boolean;
  requiredLast?: boolean;
};

type ResolvedModule = ModuleConfig & {
  inserted: boolean;
  tokensUsed: number;
  fingerprint: string;
  activationReason: string;
  resolvedText: string;
  warnings: string[];
};

type Interceptor = {
  id: string;
  name: string;
  state: "ON" | "OFF" | "OBSERVE" | "PROHIBITED" | "LIMITED";
  file: string;
  functionName: string;
  executionMoment: string;
  canBlockLlm: boolean;
  canReplaceResponse: boolean;
  canPersistMessage: boolean;
  triggered?: boolean;
};

type Preset = {
  id: string;
  name: string;
  version: string;
  description: string;
  runtime: string;
  modules: ModuleConfig[];
  interceptors: Interceptor[];
  updatedAt?: string;
};

type PresenceStatus = {
  overlayEnabled: boolean;
  overlayShouldAppear: boolean;
  overlayAppeared: boolean;
  userConfirmed: boolean;
  resultingContract: Record<string, unknown> | null;
  selectedDepth: string;
  tone: string;
  restrictions: string[];
  moduleInserted: boolean;
  reasonWhenNotInserted: string;
};

type Preview = {
  systemPrompt: string;
  modules: ResolvedModule[];
  presence: PresenceStatus;
  codexDirectoryInserted: boolean;
  constitutionInserted: boolean;
  preset: Preset;
  tokenCount: number;
};

type Trace = {
  requestId: string;
  createdAt: string;
  persona: string;
  thread: string;
  model: string;
  preset: string;
  modulesUsed: string[];
  order: Array<{ id: string; order: number; inserted: boolean }>;
  resolvedText: string;
  tokenCount: number;
  presence: PresenceStatus;
  memories: { memoryCount: number; episodeCount: number; topicCount: number };
  codexDirectory: { inserted: boolean; reason: string };
  constitution: { inserted: boolean; reason: string };
  interceptorsEvaluated: Interceptor[];
  triggeredInterceptor: string | null;
  llmCalled: boolean;
  finalResponseOrigin: string;
  responseBeforeSanitizer: string;
  responseAfterSanitizer: string;
  persistences: string[];
  durationMs: number;
  alert?: string | null;
};

type ConsoleState = {
  activePreset: Preset;
  defaultPreset: Preset;
  savedPresets: Preset[];
  traces: Trace[];
  preview: Preview;
  aprovisionadorDiagnostic: {
    observed: string[];
    codeConfirmed: string[];
    inference: string[];
  };
  runtime: {
    enabled: boolean;
    reason: string;
  };
};

const AUTHORITIES: Authority[] = ["HARD", "PRIMARY", "CONTEXT", "MODULATION", "OBSERVATION"];

function sortModules(modules: ModuleConfig[]) {
  return [...modules].sort((a, b) => {
    if (a.requiredLast) return 1;
    if (b.requiredLast) return -1;
    return a.order - b.order;
  });
}

function reorderModules(modules: ModuleConfig[], sourceId: string, targetId: string) {
  const ordered = sortModules(modules);
  const source = ordered.find((module) => module.id === sourceId);
  const target = ordered.find((module) => module.id === targetId);
  if (!source || !target || source.requiredLast || target.requiredLast) return modules;
  const withoutSource = ordered.filter((module) => module.id !== sourceId && !module.requiredLast);
  const targetIndex = withoutSource.findIndex((module) => module.id === targetId);
  withoutSource.splice(Math.max(0, targetIndex), 0, source);
  const last = ordered.filter((module) => module.requiredLast);
  return [...withoutSource, ...last].map((module, index) => ({
    ...module,
    order: module.requiredLast ? 9999 : (index + 1) * 10,
  }));
}

function boolLabel(value: boolean) {
  return value ? "sim" : "nao";
}

function stateClass(state: Interceptor["state"]) {
  if (state === "OFF") return "border-slate-500/30 text-slate-200";
  if (state === "PROHIBITED") return "border-red-400/40 text-red-200";
  if (state === "LIMITED") return "border-amber-300/45 text-amber-100";
  return "border-emerald-300/40 text-emerald-100";
}

export default function PromptConsoleClient() {
  const [data, setData] = useState<ConsoleState | null>(null);
  const [preset, setPreset] = useState<Preset | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string>("security_truth");
  const [samplePersona, setSamplePersona] = useState("Aprovisionador");
  const [sampleUserText, setSampleUserText] = useState("Preciso ajustar dieta e treino; qual persona deveria cuidar de cada parte?");
  const [status, setStatus] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/developer/prompt-console", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: ConsoleState) => {
        setData(payload);
        setPreset(payload.activePreset);
        setPreview(payload.preview);
        setSelectedModuleId(payload.preview.modules[0]?.id || "security_truth");
      })
      .catch(() => setStatus("Nao foi possivel carregar o console."));
  }, []);

  const selectedModule = useMemo(() => {
    return preview?.modules.find((module) => module.id === selectedModuleId)
      || preview?.modules[0]
      || null;
  }, [preview, selectedModuleId]);

  const lastTrace = data?.traces?.[0] || null;

  function updatePreset(mutator: (current: Preset) => Preset) {
    if (!preset) return;
    const next = mutator(preset);
    setPreset(next);
    refreshPreview(next);
  }

  async function refreshPreview(nextPreset = preset) {
    if (!nextPreset) return;
    const response = await fetch("/api/developer/prompt-console", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "preview",
        preset: nextPreset,
        personaId: samplePersona,
        userText: sampleUserText,
      }),
    });
    const payload = await response.json();
    if (response.ok) setPreview(payload.preview);
  }

  async function applyPreset() {
    if (!preset) return;
    setStatus("Aplicando preset ao proximo turno de preview...");
    const response = await fetch("/api/developer/prompt-console", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preset }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setStatus(payload.error || "Falha ao aplicar preset.");
      return;
    }
    setPreset(payload.preset);
    setPreview(payload.preview);
    setStatus("Preset aplicado ao proximo turno no ambiente Dev/Preview.");
  }

  async function restorePreset() {
    const response = await fetch("/api/developer/prompt-console", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore" }),
    });
    const payload = await response.json();
    if (response.ok) {
      setPreset(payload.preset);
      setPreview(payload.preview);
      setStatus("Preset V1 restaurado.");
    }
  }

  async function saveCopy() {
    if (!preset) return;
    const response = await fetch("/api/developer/prompt-console", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save-copy", preset }),
    });
    const payload = await response.json();
    if (response.ok) {
      setData((current) => current ? { ...current, savedPresets: payload.savedPresets } : current);
      setStatus("Copia salva em memoria do servidor.");
    }
  }

  function updateModule(id: string, patch: Partial<ModuleConfig>) {
    updatePreset((current) => ({
      ...current,
      modules: current.modules.map((module) => {
        if (module.id !== id) return module;
        const next = { ...module, ...patch };
        if (module.locked) next.enabled = true;
        if (module.requiredLast) next.order = 9999;
        return next;
      }),
    }));
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, targetId: string) {
    event.preventDefault();
    if (!draggingId || !preset) return;
    const modules = reorderModules(preset.modules, draggingId, targetId);
    setDraggingId(null);
    updatePreset((current) => ({ ...current, modules }));
  }

  function exportJson() {
    if (!preset) return;
    const blob = new Blob([JSON.stringify(preset, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${preset.id || "prompt-stack-preset"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      const imported = JSON.parse(text) as Preset;
      setPreset(imported);
      refreshPreview(imported);
      setStatus("Preset importado para edicao. Clique em aplicar para usar no proximo turno.");
    }).catch(() => setStatus("JSON invalido."));
    event.target.value = "";
  }

  if (!data || !preset || !preview) {
    return (
      <section className="mx-auto max-w-6xl px-5 py-10">
        <p className="text-sm uppercase tracking-[0.2em] text-[#c5a059]/70">Carregando console...</p>
      </section>
    );
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[360px_1fr]">
      <aside className="space-y-4">
        <div className="rounded-lg border border-[#c5a059]/25 bg-black/35 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#c5a059]/70">Prompt Console</p>
          <h1 className="mt-2 font-serif text-2xl text-[#f1ddb0]">V1 Stable</h1>
          <p className="mt-2 text-sm leading-6 text-white/60">{data.runtime.reason}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-white/70">
            <Metric label="Runtime" value={data.runtime.enabled ? "ativo" : "inspecao"} />
            <Metric label="Tokens preview" value={String(preview.tokenCount)} />
            <Metric label="Codex" value={boolLabel(preview.codexDirectoryInserted)} />
            <Metric label="Constituicao" value={boolLabel(preview.constitutionInserted)} />
          </div>
        </div>

        <div className="rounded-lg border border-[#c5a059]/20 bg-black/35 p-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#c5a059]">Modulos</h2>
            <button type="button" onClick={() => refreshPreview()} className="grid h-8 w-8 place-items-center rounded-lg border border-[#c5a059]/25 text-[#c5a059]" title="Atualizar preview">
              <span className="material-icons text-[17px]">refresh</span>
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {sortModules(preset.modules).map((module) => {
              const resolved = preview.modules.find((item) => item.id === module.id);
              return (
                <div
                  key={module.id}
                  draggable={!module.requiredLast}
                  onDragStart={() => setDraggingId(module.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleDrop(event, module.id)}
                  onClick={() => setSelectedModuleId(module.id)}
                  className={`rounded-lg border p-3 transition-colors ${selectedModuleId === module.id ? "border-[#c5a059] bg-[#c5a059]/10" : "border-[#c5a059]/15 bg-black/25 hover:border-[#c5a059]/45"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[#f1ddb0]">{module.name}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/35">{module.id}</p>
                    </div>
                    <span className={`rounded-md border px-2 py-1 text-[10px] ${resolved?.inserted ? "border-emerald-300/35 text-emerald-200" : "border-slate-400/25 text-slate-300"}`}>
                      {resolved?.inserted ? "inserido" : "fora"}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-white/60">
                    <span>ordem {module.order}</span>
                    <span>{module.authority}</span>
                    <span>{resolved?.tokensUsed || 0} tk</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-[#c5a059]/20 bg-black/35 p-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#c5a059]">Preset</h2>
          <div className="mt-3 grid gap-2">
            <button type="button" onClick={applyPreset} className="h-10 rounded-lg bg-[#c5a059] px-3 text-xs font-bold uppercase tracking-[0.14em] text-black">
              Aplicar ao proximo turno
            </button>
            <button type="button" onClick={saveCopy} className="h-10 rounded-lg border border-[#c5a059]/30 px-3 text-xs font-bold uppercase tracking-[0.14em] text-[#c5a059]">
              Salvar como copia
            </button>
            <button type="button" onClick={restorePreset} className="h-10 rounded-lg border border-[#c5a059]/30 px-3 text-xs font-bold uppercase tracking-[0.14em] text-[#c5a059]">
              Restaurar V1
            </button>
            <button type="button" onClick={exportJson} className="h-10 rounded-lg border border-[#c5a059]/30 px-3 text-xs font-bold uppercase tracking-[0.14em] text-[#c5a059]">
              Exportar JSON
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="h-10 rounded-lg border border-[#c5a059]/30 px-3 text-xs font-bold uppercase tracking-[0.14em] text-[#c5a059]">
              Importar JSON
            </button>
            <input ref={fileInputRef} type="file" accept="application/json" onChange={importJson} className="hidden" />
          </div>
          {status && <p className="mt-3 text-xs leading-5 text-white/60">{status}</p>}
        </div>
      </aside>

      <div className="space-y-5">
        <section className="grid gap-4 xl:grid-cols-[1fr_420px]">
          <div className="rounded-lg border border-[#c5a059]/20 bg-black/35 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#c5a059]/70">Modulo selecionado</p>
                <h2 className="mt-2 font-serif text-2xl text-[#f1ddb0]">{selectedModule?.name}</h2>
              </div>
              {selectedModule && (
                <label className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-white/60">
                  <input
                    type="checkbox"
                    checked={selectedModule.enabled}
                    disabled={selectedModule.locked}
                    onChange={(event) => updateModule(selectedModule.id, { enabled: event.target.checked })}
                  />
                  enabled
                </label>
              )}
            </div>

            {selectedModule && (
              <div className="mt-4 grid gap-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="text-xs uppercase tracking-[0.14em] text-[#c5a059]/70">
                    autoridade
                    <select
                      value={selectedModule.authority}
                      onChange={(event) => updateModule(selectedModule.id, { authority: event.target.value as Authority })}
                      className="mt-2 w-full rounded-lg border border-[#c5a059]/25 bg-black/50 px-3 py-2 text-sm normal-case tracking-normal text-[#f5ead4]"
                    >
                      {AUTHORITIES.map((authority) => <option key={authority} value={authority}>{authority}</option>)}
                    </select>
                  </label>
                  <label className="text-xs uppercase tracking-[0.14em] text-[#c5a059]/70">
                    tokenBudget
                    <input
                      type="number"
                      min={1}
                      max={12000}
                      value={selectedModule.tokenBudget}
                      onChange={(event) => updateModule(selectedModule.id, { tokenBudget: Number(event.target.value) })}
                      className="mt-2 w-full rounded-lg border border-[#c5a059]/25 bg-black/50 px-3 py-2 text-sm normal-case tracking-normal text-[#f5ead4]"
                    />
                  </label>
                  <Metric label="hash" value={selectedModule.fingerprint} />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Info label="fonte" value={selectedModule.source} />
                  <Info label="escopo" value={selectedModule.scope} />
                  <Info label="motivo" value={selectedModule.activationReason} />
                  <Info label="warnings" value={selectedModule.warnings.length ? selectedModule.warnings.join(", ") : "nenhum"} />
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#c5a059]/70">Texto resolvido enviado ao modelo</p>
                  <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg border border-[#c5a059]/15 bg-black/55 p-3 text-xs leading-5 text-[#efe7d7]">
                    {selectedModule.resolvedText || "Modulo sem texto inserido neste preview."}
                  </pre>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-[#c5a059]/20 bg-black/35 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#c5a059]/70">Preview do turno</p>
            <div className="mt-3 grid gap-3">
              <label className="text-xs uppercase tracking-[0.14em] text-[#c5a059]/70">
                persona
                <input value={samplePersona} onChange={(event) => setSamplePersona(event.target.value)} className="mt-2 w-full rounded-lg border border-[#c5a059]/25 bg-black/50 px-3 py-2 text-sm normal-case tracking-normal text-[#f5ead4]" />
              </label>
              <label className="text-xs uppercase tracking-[0.14em] text-[#c5a059]/70">
                mensagem atual
                <textarea value={sampleUserText} onChange={(event) => setSampleUserText(event.target.value)} rows={4} className="mt-2 w-full resize-none rounded-lg border border-[#c5a059]/25 bg-black/50 px-3 py-2 text-sm normal-case tracking-normal text-[#f5ead4]" />
              </label>
              <button type="button" onClick={() => refreshPreview()} className="h-10 rounded-lg bg-[#c5a059] px-3 text-xs font-bold uppercase tracking-[0.14em] text-black">
                Gerar preview
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <Metric label="overlay habilitado" value={boolLabel(preview.presence.overlayEnabled)} />
              <Metric label="deveria aparecer" value={boolLabel(preview.presence.overlayShouldAppear)} />
              <Metric label="apareceu" value={boolLabel(preview.presence.overlayAppeared)} />
              <Metric label="confirmou" value={boolLabel(preview.presence.userConfirmed)} />
              <Metric label="presenca no prompt" value={boolLabel(preview.presence.moduleInserted)} />
              <Metric label="profundidade" value={preview.presence.selectedDepth} />
            </div>
            {!preview.presence.moduleInserted && (
              <p className="mt-3 rounded-lg border border-[#c5a059]/15 bg-black/35 p-3 text-xs leading-5 text-white/55">
                {preview.presence.reasonWhenNotInserted}
              </p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-[#c5a059]/20 bg-black/35 p-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#c5a059]">Trilho de interceptores</h2>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {preset.interceptors.map((interceptor) => {
              const traceInterceptor = lastTrace?.interceptorsEvaluated.find((item) => item.id === interceptor.id);
              const triggered = Boolean(traceInterceptor?.triggered);
              return (
                <div key={interceptor.id} className={`rounded-lg border p-3 ${triggered ? "border-red-300/45 bg-red-950/20" : "border-[#c5a059]/15 bg-black/25"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-[#f1ddb0]">{interceptor.name}</p>
                    <span className={`rounded-md border px-2 py-1 text-[10px] ${stateClass(interceptor.state)}`}>{interceptor.state}</span>
                  </div>
                  <div className="mt-3 grid gap-1 text-xs leading-5 text-white/55">
                    <span>{interceptor.file}</span>
                    <span>{interceptor.functionName}</span>
                    <span>{interceptor.executionMoment}</span>
                    <span>bloqueia LLM: {boolLabel(interceptor.canBlockLlm)} | substitui resposta: {boolLabel(interceptor.canReplaceResponse)} | persiste: {boolLabel(interceptor.canPersistMessage)}</span>
                    <span>acionado no ultimo turno: {boolLabel(triggered)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_420px]">
          <div className="rounded-lg border border-[#c5a059]/20 bg-black/35 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#c5a059]">Rastro do turno</h2>
              {lastTrace?.alert && <span className="rounded-md border border-red-300/45 bg-red-950/30 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-red-100">{lastTrace.alert}</span>}
            </div>
            {lastTrace ? (
              <div className="mt-4 grid gap-3">
                <div className="grid gap-2 md:grid-cols-4">
                  <Metric label="requestId" value={lastTrace.requestId.slice(0, 8)} />
                  <Metric label="persona" value={lastTrace.persona} />
                  <Metric label="modelo" value={lastTrace.model} />
                  <Metric label="LLM chamado" value={boolLabel(lastTrace.llmCalled)} />
                  <Metric label="origem" value={lastTrace.finalResponseOrigin} />
                  <Metric label="interceptor" value={lastTrace.triggeredInterceptor || "nenhum"} />
                  <Metric label="tokens" value={String(lastTrace.tokenCount)} />
                  <Metric label="duracao" value={`${lastTrace.durationMs}ms`} />
                </div>
                <Info label="modulos utilizados" value={lastTrace.modulesUsed.join(", ") || "nenhum"} />
                <Info label="persistencias" value={lastTrace.persistences.join(", ") || "nenhuma"} />
                <div className="grid gap-3 lg:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#c5a059]/70">Resposta antes do sanitizer</p>
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-[#c5a059]/15 bg-black/55 p-3 text-xs leading-5 text-[#efe7d7]">{lastTrace.responseBeforeSanitizer || "vazio"}</pre>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#c5a059]/70">Resposta depois do sanitizer</p>
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-[#c5a059]/15 bg-black/55 p-3 text-xs leading-5 text-[#efe7d7]">{lastTrace.responseAfterSanitizer || "vazio"}</pre>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-white/55">Nenhum turno registrado nesta instancia do servidor.</p>
            )}
          </div>

          <div className="rounded-lg border border-[#c5a059]/20 bg-black/35 p-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#c5a059]">Diagnostico Aprovisionador</h2>
            <DiagnosticBlock title="observado" items={data.aprovisionadorDiagnostic.observed} />
            <DiagnosticBlock title="comprovado no codigo" items={data.aprovisionadorDiagnostic.codeConfirmed} />
            <DiagnosticBlock title="inferencia" items={data.aprovisionadorDiagnostic.inference} />
          </div>
        </section>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#c5a059]/15 bg-black/30 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#c5a059]/60">{label}</p>
      <p className="mt-1 break-words text-sm text-[#f5ead4]">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#c5a059]/15 bg-black/30 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#c5a059]/60">{label}</p>
      <p className="mt-1 break-words text-sm leading-5 text-white/65">{value}</p>
    </div>
  );
}

function DiagnosticBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c5a059]/70">{title}</p>
      <ul className="mt-2 space-y-2 text-sm leading-6 text-white/60">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}
