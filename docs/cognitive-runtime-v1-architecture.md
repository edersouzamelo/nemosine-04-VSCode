# Cognitive Runtime V1 Architecture

V1 is an external control, validation and governance layer around constrained linguistic generation. It preserves the legacy route when `NEMOSINE_COGNITIVE_RUNTIME_MODE=off`.

It does not implement autonomous cognition, artificial consciousness, independent agency or a society of autonomous personas. The user-selected persona remains the visible symbolic role. Scientist and Philosopher are operationally separated modules: controlled evaluator calls and deterministic checks applied by the runtime.

## Implemented Layers

| Layer | Implementation | Limit |
| --- | --- | --- |
| Symbolic persona identity | Native prompts from `prompts.json` plus checksum manifest. | Prompt integrity is tested; live behavior still requires review. |
| Symbolic configuration | User-selected persona, place and framing. | The runtime does not autonomously change persona, place, topology or objective. |
| Linguistic generation | Persona generator buffers candidate prose. | The candidate is not streamed until promotion in enforce mode. |
| Structured extraction | Legacy tag parser plus LLM extractor for standard/full. | Extractor receives quoted user text, authorized context text and candidate text as untrusted data. |
| Veritative validation | Deterministic Scientist hard checks plus LLM Scientist when profile requires it. | No external verification is claimed unless an actual tool is used. |
| Ethical-epistemological validation | Deterministic Philosopher hard checks plus LLM Philosopher when Double Vigilance is enabled. | It evaluates; it does not become a visible persona. |
| Vigia coherence | Deterministic normalized weighted mean with hard-failure override. | C(m) is an operational promotion-coherence index, not a cognition metric. |
| Promotion gate | Blocks failed Scientist/Philosopher/privacy/vocation/side-effect authorization. | Weighted averages cannot override hard findings. |
| Essential delivery | Enforce-mode assistant text is persisted by cognitive run ID before streaming. | If delivery persistence fails, no answer is streamed and optional effects are skipped. |
| Side effects | Memory, registry and Destiny actions commit only after promotion, authorization, required audit and delivery persistence. | Registry/Destiny are discarded in private runs. |
| Audit | Redacted hashes, lengths, scores, transitions, finding codes and audit events. | Raw private content is not stored. |

## Runtime Profile Selection

Profiles are technical validation intensity policies: `light`, `standard`, `full`. They do not alter symbolic configuration. Users may request stricter validation, but high-stakes input forces `full` and cannot be downgraded to `light`.

High-stakes categories include medical, mental-health crisis, legal, financial, system security, sensitive personal data, credentials and destructive or irreversible operations.

## Bounded Rebalancing

V1 rebalancing is per-run and auditable. It may elevate a technical profile, require stricter floors, add structured validation or request regeneration with repair findings. It may not change the selected persona, active place, symbolic topology, user goal or global weights.

Rebalancing is recorded as `REBALANCING_APPLIED` in the redacted audit.

## Audit Failure Policy

V1 uses policy B for enforce-mode promotion: if audit persistence fails before side-effect commit, promoted text may still be delivered but persistent side effects are blocked and an `AUDIT_PERSISTENCE_FAILURE` event is returned. Private operational alerts contain no raw content.

## Delivery and Side-Effect Persistence Semantics

User input is persisted exactly once by the chat route before enforce-mode execution. The runtime does not insert a second user message.

Assistant delivery persistence is essential. In enforce mode, promoted text, safe rejection text and failed-safe text are inserted into thread history through `persistDeliveredAssistantMessage` before the UI stream is created. The insert is keyed by `Message.cognitiveRunId`, so retrying the same cognitive run returns the existing assistant message instead of duplicating it. If that persistence fails, the runtime reports `deliveryStatus=failed`, does not transition to `DELIVERED`, and the route returns a non-streamed server error.

Optional effects are separate. `commitAuthorizedOptionalEffects` never writes the assistant message. It handles approved memory, Registry, Destiny and the delivered conversation episode as optional derived memory inside one Prisma transaction after final answer selection, required audit attempt, authorization and delivery persistence. If the transaction fails, the selected answer remains the delivered answer, essential delivery remains persisted, counts stay zero, and the result reports `sideEffectStatus=failed_rolled_back`.

Audit ordering is final answer selected, required pre-effect audit attempted, delivery persisted, optional effects committed/skipped/blocked/failed, final audit upserted, then stream. Shadow mode observes the legacy-visible answer and writes audit metadata only; it does not duplicate assistant history or create runtime optional effects.

## Remaining Work

- Real shadow traces and latency/cost review.
- External source verification tools.
- Admin review UI for audit traces.
- Consent UI for configurable automatic registry or long-term memory modes.
- Broader live persona evaluation beyond the opt-in script.
