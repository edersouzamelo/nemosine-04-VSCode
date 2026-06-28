# Response Pipeline V2

This document records the response-quality pipeline introduced behind
`NEMOSINE_RESPONSE_PIPELINE_V2`.

## Flag

`NEMOSINE_RESPONSE_PIPELINE_V2` accepts:

- `off`: default. The current legacy route remains unchanged.
- `shadow`: the legacy answer is delivered, while V2 runs for redacted telemetry in the existing CognitiveRunAudit/Sala de Maquinas surface.
- `enforce`: V2 generates, validates, persists and delivers the answer. If V2 fails before safe delivery, the route falls back to the legacy path.

`NEMOSINE_RESPONSE_PIPELINE_V2_MAX_REGENERATIONS` is capped at `1`.
`NEMOSINE_RESPONSE_PIPELINE_V2_AUDIT=false` can disable future audit wiring, but the default is enabled.

## Flow

V2 separates the work that the old prompt concentrated in one generation:

1. Context Broker: gathers existing Nemosine context sources, normalizes them as candidates, scores with lexical, recency, continuity, importance and persona relevance signals, deduplicates and applies category budgets.
2. Response Director: for non-trivial cases, creates a structured invisible plan. Simple cases use a deterministic plan.
3. Persona Renderer: produces the visible answer from native persona prompt, compact generation contract, selected context and internal plan. The current user message remains a `user` message, not duplicated in the system prompt.
4. Vocational Validator: deterministic quality gate for generic questions, generic closings, internal leaks, visible tags, depth mismatch and privacy risks. At most one regeneration is allowed.
5. Memory Extractor: runs after generation. Persona output is not responsible for `[MEMORY:]`, `[REGISTRY:]` or `[DESTINY:]` tags. Explicit authorizations are still required before persistence.

## Audit

V2 writes redacted metadata into the existing `cognitive_run_audits` table:

- pipeline mode;
- director usage and reason;
- recommended depth;
- context candidate and selected counts;
- selected source types and scores;
- question decision;
- validation scores and finding codes;
- regeneration;
- memory extraction counts;
- latency per stage.

Private runs remain metadata-only and do not expose raw prompt, raw context or private content.

## Compatibility

V2 does not change:

- provider;
- model;
- API key;
- endpoint;
- AI SDK integration;
- `DEFAULT_CHAT_MODEL`;
- frontend response-stream format.

The existing cognitive runtime remains available. When both runtime enforce and V2 enforce are enabled, V2 enforce is attempted first; runtime shadow can still observe the delivered V2 candidate.

## Current Adaptation

The repository already had a broad cognitive runtime with context envelope, claim extraction, Scientist/Vigia/Philosopher validation and side-effect authorization. V2 therefore does not duplicate that runtime. It adds a narrower persona-response pipeline focused on context direction, depth, question economy, vocational rendering and post-response memory extraction.
