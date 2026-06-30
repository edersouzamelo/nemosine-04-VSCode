"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  createPresenceContract,
  extractPresenceSignals,
  getPresenceQuestionForPersona,
} from "@/app/lib/nemosine/presence_adjustment";
import type {
  ConversationPresenceContract,
  PresenceDepth,
  PresenceFlowType,
  PresenceReviewField,
  PresenceScope,
} from "@/app/lib/nemosine/presence_adjustment";

const GOAL_OPTIONS = [
  "compreender uma situacao",
  "tomar uma decisao",
  "organizar um plano",
  "produzir alguma coisa",
  "aprender",
  "desabafar",
  "ser confrontado",
  "conversar livremente",
  "outro",
];

const RESTRICTION_OPTIONS = [
  "nao terminar oferecendo ajuda",
  "nao usar se quiser",
  "nao pedir mais contexto sem necessidade",
  "nao terminar com pergunta",
  "nao usar simbolismo excessivo",
  "nao ser condescendente",
  "nao repetir o que eu ja disse",
  "nao suavizar criticas",
  "nao transformar toda resposta em aconselhamento",
];

function depthLabel(depth: PresenceDepth) {
  if (depth === "SHORT") return "curta";
  if (depth === "BALANCED") return "equilibrada";
  if (depth === "DEEP") return "profunda";
  return "deixar a persona decidir";
}

type PresenceAdjustmentOverlayProps = {
  open: boolean;
  flowType: PresenceFlowType;
  personaId: string;
  userId: string;
  conversationId?: string | null;
  currentContract?: ConversationPresenceContract | null;
  onComplete: (contract: ConversationPresenceContract | null, outcome: "CONFIRMED" | "SKIPPED", options?: { scope?: PresenceScope }) => void;
  onDismiss: () => void;
};

export default function PresenceAdjustmentOverlay({
  open,
  flowType,
  personaId,
  userId,
  conversationId,
  currentContract,
  onComplete,
  onDismiss,
}: PresenceAdjustmentOverlayProps) {
  const [step, setStep] = useState(0);
  const [recentContext, setRecentContext] = useState("");
  const [currentGoal, setCurrentGoal] = useState("");
  const [goalComplement, setGoalComplement] = useState("");
  const [responseDepth, setResponseDepth] = useState<PresenceDepth>("PERSONA_DECIDES");
  const [prohibitedPatterns, setProhibitedPatterns] = useState<string[]>([]);
  const [customConstraint, setCustomConstraint] = useState("");
  const [scope, setScope] = useState<PresenceScope>("PERSONA");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [removedKeys, setRemovedKeys] = useState<string[]>([]);
  const [conversationOnlyKeys, setConversationOnlyKeys] = useState<string[]>([]);
  const [escapeNotice, setEscapeNotice] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  const isPulse = flowType === "CONTINUITY_PULSE";
  const totalSteps = isPulse ? 2 : 3;
  const inReview = step >= totalSteps;

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setRemovedKeys([]);
    setConversationOnlyKeys([]);
    setEscapeNotice(false);
    setRecentContext(isPulse ? "" : currentContract?.recentContext || "");
    setCurrentGoal(currentContract?.currentGoal || "");
    setGoalComplement("");
    setResponseDepth(currentContract?.responseDepth || "PERSONA_DECIDES");
    setProhibitedPatterns(currentContract?.customConstraints || []);
    setCustomConstraint("");
    setScope(flowType === "MANUAL_RECONFIGURATION" ? currentContract?.scope || "PERSONA" : "PERSONA");
  }, [currentContract, flowType, isPulse, open]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(id);
  }, [open, step, editingKey]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setEscapeNotice(true);
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        handleContinue();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const extraction = useMemo(() => extractPresenceSignals(recentContext), [recentContext]);

  useEffect(() => {
    if (!recentContext.trim()) return;
    if (!currentGoal && extraction.currentGoal && extraction.confidence >= 0.58) {
      setCurrentGoal(extraction.currentGoal);
    }
    if (responseDepth === "PERSONA_DECIDES" && extraction.preferredDepth && extraction.confidence >= 0.58) {
      setResponseDepth(extraction.preferredDepth);
    }
    if (extraction.prohibitedPatterns?.length) {
      setProhibitedPatterns((current) => Array.from(new Set([...current, ...extraction.prohibitedPatterns!])));
    }
  }, [currentGoal, extraction, recentContext, responseDepth]);

  const importantEntities = useMemo(() => [
    ...(extraction.involvedPeopleOrProjects || []),
    ...(extraction.deadlinesOrEvents || []),
  ], [extraction]);

  const allConstraints = useMemo(() => {
    return Array.from(new Set([
      ...prohibitedPatterns,
      customConstraint.trim(),
    ].filter(Boolean)));
  }, [customConstraint, prohibitedPatterns]);

  const reviewFields: PresenceReviewField[] = useMemo(() => {
    const fields: PresenceReviewField[] = [];
    if (recentContext.trim()) fields.push({ key: "recentContext", label: "momento atual", value: recentContext.trim(), origin: "USER_EXPLICIT" });
    if (currentGoal.trim() || goalComplement.trim()) fields.push({
      key: "currentGoal",
      label: "objetivo desta conversa",
      value: [currentGoal, goalComplement].filter(Boolean).join(": "),
      origin: currentGoal === extraction.currentGoal ? "SYSTEM_EXTRACTION" : "USER_EXPLICIT",
    });
    if (importantEntities.length) fields.push({ key: "importantEntities", label: "pessoas, projetos ou prazos importantes", value: importantEntities.join(", "), origin: "SYSTEM_EXTRACTION" });
    fields.push({ key: "responseDepth", label: "modo de resposta", value: depthLabel(responseDepth), origin: responseDepth === "PERSONA_DECIDES" ? "DEFAULT" : "USER_EXPLICIT" });
    if (allConstraints.length) fields.push({ key: "customConstraints", label: "coisas a evitar", value: allConstraints.join("; "), origin: "USER_EXPLICIT" });
    return fields.filter((field) => !removedKeys.includes(field.key));
  }, [allConstraints, currentGoal, extraction.currentGoal, goalComplement, importantEntities, recentContext, removedKeys, responseDepth]);

  if (!open) return null;

  function toggleRestriction(value: string) {
    setProhibitedPatterns((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  function handleContinue() {
    if (inReview) {
      confirmWithScope(scope);
      return;
    }
    if (!isPulse && step === 0 && !recentContext.trim()) return;
    setStep((current) => Math.min(current + 1, totalSteps));
  }

  function skipOptionalStep() {
    if (step < totalSteps - 1) setStep((current) => current + 1);
  }

  function enterWithoutAdjustment() {
    onComplete(null, "SKIPPED");
  }

  function buildContract(targetScope: PresenceScope) {
    const nowOnly = targetScope === "SESSION" || targetScope === "CONVERSATION";
    const validUntil = nowOnly ? new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() : undefined;
    const removed = new Set(removedKeys);
    const conversationOnly = new Set(conversationOnlyKeys);
    const contractScope = conversationOnly.size > 0 && targetScope === "PERSONA" ? "CONVERSATION" : targetScope;

    return createPresenceContract({
      userId,
      personaId,
      conversationId: conversationId || undefined,
      scope: contractScope,
      recentContext: removed.has("recentContext") ? undefined : recentContext,
      currentGoal: removed.has("currentGoal") ? undefined : [currentGoal, goalComplement].filter(Boolean).join(": "),
      importantEntities: removed.has("importantEntities") ? [] : importantEntities,
      responseDepth: removed.has("responseDepth") ? "PERSONA_DECIDES" : responseDepth,
      prohibitedPatterns: removed.has("customConstraints") ? [] : allConstraints,
      customConstraints: removed.has("customConstraints") ? [] : allConstraints,
      validUntil,
    });
  }

  function confirmWithScope(targetScope: PresenceScope) {
    const contract = buildContract(targetScope);
    onComplete(contract, "CONFIRMED", { scope: targetScope });
  }

  function renderStep() {
    if (inReview) {
      return (
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#c5a059]/70">Revisao</p>
            <h2 className="mt-2 font-serif text-2xl text-[#f1ddb0]">Entendi o seguinte</h2>
          </div>
          <div className="grid gap-2">
            {reviewFields.map((field) => (
              <div key={field.key} className="rounded-lg border border-[#c5a059]/20 bg-black/35 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c5a059]/70">{field.label}</span>
                  <span className="text-[9px] uppercase tracking-[0.16em] text-[#c5a059]/40">{field.origin === "SYSTEM_EXTRACTION" ? "inferencia" : field.origin === "DEFAULT" ? "padrao" : "dito por voce"}</span>
                </div>
                {editingKey === field.key ? (
                  <textarea
                    ref={(node) => { inputRef.current = node; }}
                    value={field.value}
                    onChange={(event) => {
                      if (field.key === "recentContext") setRecentContext(event.target.value);
                      if (field.key === "currentGoal") setCurrentGoal(event.target.value);
                      if (field.key === "customConstraints") setCustomConstraint(event.target.value);
                    }}
                    rows={3}
                    className="w-full resize-none rounded-md border border-[#c5a059]/30 bg-black/60 px-3 py-2 text-sm text-[#f5ead4] outline-none focus:border-[#c5a059]"
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#efe7d7]">{field.value}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setEditingKey(editingKey === field.key ? null : field.key)} className="text-[10px] uppercase tracking-[0.16em] text-[#c5a059] hover:text-[#f1ddb0]">editar</button>
                  <button type="button" onClick={() => setRemovedKeys((current) => [...current, field.key])} className="text-[10px] uppercase tracking-[0.16em] text-[#c5a059]/70 hover:text-[#f1ddb0]">remover</button>
                  <label className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-[#c5a059]/65">
                    <input
                      type="checkbox"
                      checked={conversationOnlyKeys.includes(field.key)}
                      onChange={() => setConversationOnlyKeys((current) => current.includes(field.key) ? current.filter((key) => key !== field.key) : [...current, field.key])}
                    />
                    usar somente nesta conversa
                  </label>
                </div>
              </div>
            ))}
          </div>
          {flowType === "MANUAL_RECONFIGURATION" && (
            <label className="grid gap-1 text-xs uppercase tracking-[0.16em] text-[#c5a059]/70">
              Escopo
              <select value={scope} onChange={(event) => setScope(event.target.value as PresenceScope)} className="rounded-md border border-[#c5a059]/30 bg-black/60 px-3 py-2 text-sm normal-case tracking-normal text-[#f5ead4]">
                <option value="SESSION">somente esta sessao</option>
                <option value="CONVERSATION">esta conversa</option>
                <option value="PERSONA">esta persona</option>
                <option value="GLOBAL">global</option>
              </select>
            </label>
          )}
        </div>
      );
    }

    if (isPulse) {
      return step === 0 ? (
        <QuestionBlock
          eyebrow="Pulso de continuidade"
          title="O que mudou desde a ultima vez?"
          helper="Atualize apenas o que ainda importa para a conversa de hoje."
        >
          <textarea
            ref={(node) => { inputRef.current = node; }}
            value={recentContext}
            onChange={(event) => setRecentContext(event.target.value)}
            rows={5}
            className="w-full resize-none rounded-lg border border-[#c5a059]/30 bg-black/55 px-4 py-3 text-[#f5ead4] outline-none focus:border-[#c5a059]"
          />
        </QuestionBlock>
      ) : (
        <QuestionBlock
          eyebrow="Pulso de continuidade"
          title="Voce quer manter o mesmo modo de conversa hoje?"
          helper={`Modo atual: ${depthLabel(currentContract?.responseDepth || "PERSONA_DECIDES")}.`}
        >
          {renderDepthControls()}
        </QuestionBlock>
      );
    }

    if (step === 0) {
      return (
        <QuestionBlock
          eyebrow="Ajuste de Presenca"
          title={getPresenceQuestionForPersona(personaId)}
          helper="Conte apenas o necessario para eu nao comecar esta conversa como um estranho."
        >
          <textarea
            ref={(node) => { inputRef.current = node; }}
            value={recentContext}
            onChange={(event) => setRecentContext(event.target.value)}
            rows={5}
            className="w-full resize-none rounded-lg border border-[#c5a059]/30 bg-black/55 px-4 py-3 text-[#f5ead4] outline-none focus:border-[#c5a059]"
          />
        </QuestionBlock>
      );
    }

    if (step === 1) {
      return (
        <QuestionBlock eyebrow="Ajuste de Presenca" title="O que voce espera de mim agora?">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {GOAL_OPTIONS.map((option) => (
              <button
                type="button"
                key={option}
                onClick={() => setCurrentGoal(option)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${currentGoal === option ? "border-[#c5a059] bg-[#c5a059]/20 text-[#f5ead4]" : "border-[#c5a059]/20 bg-black/35 text-[#d7c7a5] hover:border-[#c5a059]/55"}`}
              >
                {option}
              </button>
            ))}
          </div>
          <input
            ref={(node) => { inputRef.current = node; }}
            value={goalComplement}
            onChange={(event) => setGoalComplement(event.target.value)}
            placeholder="Complemento opcional"
            className="mt-3 w-full rounded-lg border border-[#c5a059]/30 bg-black/55 px-4 py-3 text-[#f5ead4] outline-none focus:border-[#c5a059]"
          />
        </QuestionBlock>
      );
    }

    return (
      <QuestionBlock eyebrow="Ajuste de Presenca" title="Como voce prefere que eu responda hoje?">
        {renderDepthControls()}
        <div className="mt-4 grid gap-2">
          {RESTRICTION_OPTIONS.map((option) => (
            <label key={option} className="flex items-center gap-2 rounded-md border border-[#c5a059]/15 bg-black/30 px-3 py-2 text-sm text-[#e8ddc5]">
              <input type="checkbox" checked={prohibitedPatterns.includes(option)} onChange={() => toggleRestriction(option)} />
              {option}
            </label>
          ))}
        </div>
        <input
          value={customConstraint}
          onChange={(event) => setCustomConstraint(event.target.value)}
          placeholder="Outra coisa que devo evitar"
          className="mt-3 w-full rounded-lg border border-[#c5a059]/30 bg-black/55 px-4 py-3 text-[#f5ead4] outline-none focus:border-[#c5a059]"
        />
      </QuestionBlock>
    );
  }

  function renderDepthControls() {
    const options: Array<[PresenceDepth, string]> = [
      ["SHORT", "curta"],
      ["BALANCED", "equilibrada"],
      ["DEEP", "profunda"],
      ["PERSONA_DECIDES", "deixar a persona decidir"],
    ];
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map(([value, label]) => (
          <button
            type="button"
            key={value}
            onClick={() => setResponseDepth(value)}
            className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${responseDepth === value ? "border-[#c5a059] bg-[#c5a059]/20 text-[#f5ead4]" : "border-[#c5a059]/20 bg-black/35 text-[#d7c7a5] hover:border-[#c5a059]/55"}`}
          >
            {label}
          </button>
        ))}
      </div>
    );
  }

  const stepLabel = inReview ? "revisao" : `${Math.min(step + 1, totalSteps)} de ${totalSteps}`;
  const canContinue = inReview || isPulse || step > 0 || recentContext.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/92 px-4 py-6 text-[#f5ead4] backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none"
      role="dialog"
      aria-modal="true"
      aria-label="Ajuste de Presenca"
    >
      <div className="pointer-events-none absolute inset-0 border border-[#c5a059]/10" />
      <div className="relative w-full max-w-[680px] rounded-lg border border-[#c5a059]/25 bg-[#050507]/95 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.55)] sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#c5a059]/65">{stepLabel}</span>
          <button type="button" onClick={enterWithoutAdjustment} className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c5a059]/70 hover:text-[#f1ddb0]">
            Entrar sem ajuste
          </button>
        </div>

        <div className="transition-opacity duration-200 motion-reduce:transition-none">
          {renderStep()}
        </div>

        {escapeNotice && (
          <p className="mt-4 rounded-md border border-amber-500/25 bg-amber-950/35 px-3 py-2 text-xs text-amber-100">
            Use os botoes para concluir, voltar ou entrar sem ajuste.
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-between gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => step > 0 ? setStep((current) => current - 1) : onDismiss()}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#c5a059]/25 bg-black/35 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#c5a059] hover:border-[#c5a059]/55"
            >
              <span className="material-icons text-[17px]">arrow_back</span>
              Voltar
            </button>
            {!inReview && step > 0 && (
              <button
                type="button"
                onClick={skipOptionalStep}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#c5a059]/20 bg-black/25 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#c5a059]/70 hover:text-[#f1ddb0]"
              >
                Pular
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {inReview && (
              <>
                <button type="button" onClick={() => setStep(0)} className="h-10 rounded-lg border border-[#c5a059]/25 bg-black/35 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#c5a059] hover:border-[#c5a059]/55">Corrigir</button>
                <button type="button" onClick={() => confirmWithScope("SESSION")} className="h-10 rounded-lg border border-[#c5a059]/25 bg-black/35 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#c5a059] hover:border-[#c5a059]/55">Usar somente agora</button>
                <button type="button" onClick={() => onComplete(buildContract("SESSION"), "CONFIRMED", { scope: "SESSION" })} className="h-10 rounded-lg border border-[#c5a059]/20 bg-black/25 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#c5a059]/70 hover:text-[#f1ddb0]">Nao guardar</button>
                {flowType === "MANUAL_RECONFIGURATION" && (
                  <button type="button" onClick={() => {
                    setRecentContext("");
                    setCurrentGoal("");
                    setGoalComplement("");
                    setResponseDepth("PERSONA_DECIDES");
                    setProhibitedPatterns([]);
                    setCustomConstraint("");
                  }} className="h-10 rounded-lg border border-[#c5a059]/20 bg-black/25 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#c5a059]/70 hover:text-[#f1ddb0]">Restaurar padroes</button>
                )}
              </>
            )}
            <button
              type="button"
              onClick={handleContinue}
              disabled={!canContinue}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#c5a059] px-4 text-[10px] font-bold uppercase tracking-[0.18em] text-black hover:bg-[#b08d48] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {inReview ? "Confirmar" : "Continuar"}
              <span className="material-icons text-[17px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuestionBlock({
  eyebrow,
  title,
  helper,
  children,
}: {
  eyebrow: string;
  title: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#c5a059]/70">{eyebrow}</p>
        <h2 className="mt-2 font-serif text-2xl leading-tight text-[#f1ddb0]">{title}</h2>
        {helper && <p className="mt-2 text-sm leading-relaxed text-[#e8ddc5]/70">{helper}</p>}
      </div>
      {children}
    </div>
  );
}
