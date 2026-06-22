# Cognitive Runtime V1 Architecture

V1 implements an external runtime around the existing Nemosine persona chat route. It preserves native persona prompts, behavioral contracts, persistence, threads, memory, registries, Destiny Line and the legacy streaming route when the feature flag is off.

## Implemented Layers

| Layer | V1 status | Notes |
| --- | --- | --- |
| Symbolic identity | Implemented by existing full native prompts from `prompts.json`. | Native prompts remain the authorial layer and are not rewritten by validators. |
| Functional contract | Implemented by existing contracts plus runtime vocational metadata. | Contracts guide behavior; policy code can require warning, handoff or refusal. |
| Linguistic generation | Implemented as a persona generator call. | The user-selected persona produces free-form prose. The answer is not forced into JSON. |
| Cognitive control | Implemented as TypeScript Orchestrator and state machine. | Controls stages, retries, repair feedback and promotion. |
| Deterministic enforcement | Implemented in privacy, vocation, Vigia coherence, promotion and side-effect gates. | Vigia score is deterministic code, not an LLM opinion. |
| LLM-based evaluation | Implemented as separate Scientist and Philosopher structured calls. | These modules evaluate; they do not rewrite final prose. |
| Persistence | Implemented for approved side effects and audit model. | Enforce mode commits memory, registry and Destiny actions only after promotion. |
| Audit | Implemented as redacted metadata, hashes, scores, finding codes and state transitions. | Private runs are metadata-only. |

## Operational Flow

1. `RECEIVED`
2. `AUTHORIZED`
3. `CONTEXT_ASSEMBLED`
4. `MODULES_SELECTED`
5. `CANDIDATE_GENERATED`
6. `CLAIMS_EXTRACTED`
7. `SCIENTIST_EVALUATED`
8. `VIGIA_SCORED`
9. Retry through the same persona if required.
10. `OCV_CONVERGED`
11. `PHILOSOPHER_EVALUATED`
12. `PROMOTION_EVALUATED`
13. `PROMOTED` or `REJECTED`
14. `SIDE_EFFECTS_COMMITTED`
15. `DELIVERED`

## Context Separation

The new runtime separates:

- immutable runtime instructions;
- complete native persona identity prompt;
- functional contract;
- authorized contextual material with provenance and visibility;
- current user input as a user-role payload;
- trusted runtime repair feedback without copying untrusted user instructions.

The legacy route is preserved when `NEMOSINE_COGNITIVE_RUNTIME_MODE=off`.

## What This Is Not

V1 does not implement 56 autonomous agents. It implements operationally separated modules that may use the same underlying LLM provider for distinct purposes. The Orchestrator and Vigia are TypeScript control/deterministic modules. Scientist and Philosopher are structured evaluator calls. The active persona remains the only visible generator.

## Remaining Theoretical Or Phase 2 Work

- Rich Atlas Nous topographic planning beyond the current context envelope.
- Stronger per-persona vocation ontology for all 56 personas.
- External source verification tools for factual claims.
- Full live persona evaluation scoring.
- Admin UI for audit trace inspection.
- Migrations managed through Prisma migrate instead of the current manual migration convention.
