# Cognitive Runtime V1 Patent Traceability

This engineering note maps deposited patent mechanisms to the bounded V1 implementation. It does not claim complete implementation of every embodiment.

| Patent mechanism | Patent description | Code implementation | Test | Status | Limitation |
| --- | --- | --- | --- | --- | --- |
| Orchestrator | Coordinates internal processing stages. | `orchestrator.ts`, `state-machine.ts`. | Runtime integration tests. | Implemented V1. | External TypeScript control layer, not autonomous goal formation. |
| Scientist | Veritative evaluation of claims and coherence. | `scientist-validator.ts`, LLM Scientist schema. | Merge and promotion tests. | Implemented relative to available evidence. | No external fact tool yet. |
| Vigia | Coherence calculation and threshold comparison. | `vigia-coherence.ts`. | Theta boundary and hard-failure tests. | Implemented. | Operational promotion index only. |
| O-C-V cycle | Generate, evaluate, correct/retry. | Candidate buffering, repair findings, bounded retries. | Retry integration test. | Implemented bounded V1. | No permanent self-adjustment. |
| C(m) | Weighted coherence expression. | Normalized weighted mean over configured dimensions. | Coherence unit tests. | Implemented with formal note. | Not a truth probability or cognition measure. |
| Theta = 0.80 | Typical coherence threshold. | `NEMOSINE_COHERENCE_THRESHOLD`, default `0.80`. | Boundary tests. | Implemented. | Empirical threshold validation remains open. |
| Retry | Iterative correction after failure. | `OCV_RETRY_REQUESTED`, repair findings. | Integration retry test. | Implemented. | Limited by configured max retries. |
| Rebalancing | Adjustment of activation, weights or priorities. | Per-run profile elevation and stricter floors, audit event. | High-stakes profile tests. | Partial V1. | Does not rewrite global weights or symbolic topology. |
| Double Vigilance | Veritative and ethical-epistemological axes. | Scientist plus Philosopher validators. | Scientist/Philosopher merge tests. | Implemented. | Philosopher LLM axis depends on config/profile. |
| Audit | Technical traceability of states and outcomes. | `audit-redaction.ts`, `audit-store.ts`, Prisma audit table. | Audit redaction/failure tests. | Implemented. | Audit UI not implemented. |
| Inter-module structured communication | Structured outputs between modules. | Zod schemas for extraction, Scientist and Philosopher. | Schema tests. | Implemented. | Malformed output fails safe. |
| Promotion decision | Accept/retry/reject based on validation. | `promotion-gate.ts`. | Promotion unit tests. | Implemented. | Human still retains final judgment. |
| Human authorization | Persistent effects require user authorization. | `side-effect-committer.ts`. | Side-effect tests. | Implemented conservative backend policy. | Future consent UI remains. |
| Essential delivery persistence | Durable final-answer delivery record. | `persistDeliveredAssistantMessage`, `Message.cognitiveRunId`, route delivery guard. | Persistence integration tests. | Implemented V1. | Requires migration in deployed database. |
| Optional effect transaction | Approved downstream effects after answer selection. | `commitAuthorizedOptionalEffects`. | Rollback integration tests. | Implemented V1 where database supports transaction. | Legacy raw-SQL tables are pre-created before transaction. |

## Patent-SCM Reconciliation

Patent language may describe modular cognitive processing, internal deliberation, O-C-V and Double Vigilance. The SCM paper constrains interpretation by preserving human agency and treating LLMs as linguistic engines. In V1, internal deliberation means structured runtime evaluation and regeneration under human-defined policies. It does not mean autonomous goal formation, self-directed cognition or independent persona agency.

## Delivery and Side-Effect Persistence Semantics

For patent traceability, delivery persistence is treated as an operational safety invariant, not as cognition. Enforce-mode final answers are selected by the runtime, persisted exactly once by cognitive run ID, audited, then streamed. Optional memory, Registry, Destiny and conversation episode effects are downstream authorized effects and cannot alter the selected answer.

The trace differentiates `DELIVERY_PERSISTED`, `SIDE_EFFECTS_COMMITTED`, `SIDE_EFFECTS_SKIPPED`, `SIDE_EFFECTS_BLOCKED`, `SIDE_EFFECTS_FAILED` and `DELIVERED`. Audit records expose `deliveryStatus`, `sideEffectStatus`, counts and persistence booleans for future Sala de Maquinas inspection without storing raw private content. Shadow mode records observation only and does not duplicate assistant history.
