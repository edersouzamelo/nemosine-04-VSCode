"use client";

import { useMemo, useState } from "react";

type MirrorResponse = {
  mode?: string;
  persisted?: boolean;
  error?: string;
  mirror?: {
    progress: { completedSteps: number; totalSteps: number; skippedAllowed: true };
    understoodSoFar: string[];
    candidates: Array<{
      shortSummary: string;
      epistemicType: string;
      sensitivity: string;
      category: string;
      requiresConfirmation: boolean;
    }>;
    reviewActions: string[];
    warnings: string[];
  };
};

const entryReasons = ["crise", "projeto", "decisao", "carreira", "relacionamento", "autoconhecimento", "exploracao"];

function splitLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function TravessiaInicialClient() {
  const [entryReason, setEntryReason] = useState("projeto");
  const [timeline, setTimeline] = useState("");
  const [choices, setChoices] = useState("");
  const [freeReport, setFreeReport] = useState("");
  const [personaAccess, setPersonaAccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MirrorResponse | null>(null);
  const progress = result?.mirror?.progress;

  const canSubmit = useMemo(() => {
    return entryReason || timeline.trim() || choices.trim() || freeReport.trim();
  }, [entryReason, timeline, choices, freeReport]);

  async function submit() {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/onboarding-v2", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          entryReason,
          timelineEvents: splitLines(timeline).slice(0, 3),
          choicesUnderTension: splitLines(choices).slice(0, 5),
          freeReport,
          optionalImports: [],
          personaAccess: splitLines(personaAccess),
        }),
      });
      setResult(await response.json());
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "Falha ao gerar espelho." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="relative z-10 mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 md:grid-cols-[0.95fr_1.05fr] md:px-8 lg:px-12">
      <form className="space-y-5 rounded-lg border border-[#c5a059]/20 bg-black/55 p-5 backdrop-blur-md" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <header>
          <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#c5a059]/70">internal</p>
          <h1 className="mt-2 font-display text-3xl uppercase tracking-[0.18em] text-[#c5a059]">Travessia Inicial</h1>
        </header>

        <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#c5a059]/70">
          Motivo de entrada
          <select
            value={entryReason}
            onChange={(event) => setEntryReason(event.target.value)}
            className="mt-2 w-full rounded border border-[#c5a059]/25 bg-black/70 px-3 py-2 text-sm text-white outline-none focus:border-[#c5a059]"
          >
            {entryReasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
          </select>
        </label>

        <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#c5a059]/70">
          Tres acontecimentos
          <textarea
            rows={4}
            value={timeline}
            onChange={(event) => setTimeline(event.target.value)}
            placeholder={"Um por linha"}
            className="mt-2 w-full rounded border border-[#c5a059]/25 bg-black/70 px-3 py-2 text-sm text-white outline-none focus:border-[#c5a059]"
          />
        </label>

        <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#c5a059]/70">
          Escolhas sob tensao
          <textarea
            rows={4}
            value={choices}
            onChange={(event) => setChoices(event.target.value)}
            placeholder={"Dilemas, perdas, prioridades ou limites"}
            className="mt-2 w-full rounded border border-[#c5a059]/25 bg-black/70 px-3 py-2 text-sm text-white outline-none focus:border-[#c5a059]"
          />
        </label>

        <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#c5a059]/70">
          Relato livre
          <textarea
            rows={6}
            value={freeReport}
            onChange={(event) => setFreeReport(event.target.value)}
            className="mt-2 w-full rounded border border-[#c5a059]/25 bg-black/70 px-3 py-2 text-sm text-white outline-none focus:border-[#c5a059]"
          />
        </label>

        <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#c5a059]/70">
          Personas autorizadas
          <textarea
            rows={2}
            value={personaAccess}
            onChange={(event) => setPersonaAccess(event.target.value)}
            placeholder={"Opcional, uma por linha"}
            className="mt-2 w-full rounded border border-[#c5a059]/25 bg-black/70 px-3 py-2 text-sm text-white outline-none focus:border-[#c5a059]"
          />
        </label>

        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded border border-[#c5a059]/45 bg-[#c5a059]/15 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#fde68a] transition hover:bg-[#c5a059]/25 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <span className="material-icons text-sm" aria-hidden="true">psychology_alt</span>
          {loading ? "Gerando..." : "Gerar espelho"}
        </button>
      </form>

      <section className="rounded-lg border border-[#c5a059]/20 bg-black/55 p-5 backdrop-blur-md">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#c5a059]/70">Espelho inicial</p>
            <h2 className="mt-2 font-display text-2xl uppercase tracking-[0.16em] text-[#fde68a]">Foi isto que compreendi</h2>
          </div>
          {progress && (
            <span className="rounded border border-[#c5a059]/25 px-3 py-2 font-mono text-xs text-[#fde68a]">
              {progress.completedSteps}/{progress.totalSteps}
            </span>
          )}
        </div>

        {result?.error && (
          <p className="rounded border border-amber-400/35 bg-amber-500/10 p-4 text-sm text-amber-100">{result.error}</p>
        )}

        {!result && (
          <div className="rounded border border-[#c5a059]/15 bg-black/35 p-6 text-sm leading-7 text-white/55">
            O espelho aparece aqui depois da primeira passagem. Nada e salvo sem revisao.
          </div>
        )}

        {result?.mirror && (
          <div className="space-y-5">
            <div className="space-y-2">
              {result.mirror.understoodSoFar.map((item) => (
                <p key={item} className="rounded border border-[#c5a059]/12 bg-black/35 p-3 text-sm text-white/70">{item}</p>
              ))}
            </div>

            <div>
              <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#c5a059]/70">Candidatos para revisao</h3>
              <div className="space-y-3">
                {result.mirror.candidates.length === 0 && <p className="text-sm text-white/45">Nenhum candidato estruturado nesta passagem.</p>}
                {result.mirror.candidates.map((candidate, index) => (
                  <article key={`${candidate.shortSummary}-${index}`} className="rounded border border-[#c5a059]/12 bg-black/35 p-4">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="rounded border border-[#c5a059]/20 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-[#fde68a]">{candidate.epistemicType}</span>
                      <span className="rounded border border-white/10 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-white/45">{candidate.sensitivity}</span>
                    </div>
                    <p className="text-sm leading-6 text-white/70">{candidate.shortSummary}</p>
                  </article>
                ))}
              </div>
            </div>

            {result.mirror.warnings.length > 0 && (
              <div className="rounded border border-amber-400/30 bg-amber-500/10 p-4 text-xs text-amber-100">
                {result.mirror.warnings.join(", ")}
              </div>
            )}
          </div>
        )}
      </section>
    </section>
  );
}
