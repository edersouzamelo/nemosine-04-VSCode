# Cognitive Runtime V1 State Machine

The state machine in `app/lib/nemosine/cognitive-runtime/state-machine.ts` represents operational execution state only. These states are not mental states, conscious states, autonomous symbolic states or evidence of artificial cognition.

SCM symbolic configuration means the user-selected arrangement of personas, places, symbolic framing and interaction perspective. Runtime state means processing stage, validation status, retry status, promotion status and persistence status.

## States

- `RECEIVED`
- `AUTHORIZED`
- `CONTEXT_ASSEMBLED`
- `MODULES_SELECTED`
- `CANDIDATE_GENERATED`
- `CLAIMS_EXTRACTED`
- `SCIENTIST_EVALUATED`
- `VIGIA_SCORED`
- `OCV_RETRY_REQUESTED`
- `OCV_CONVERGED`
- `PHILOSOPHER_EVALUATED`
- `PROMOTION_EVALUATED`
- `PROMOTED`
- `REJECTED`
- `FINAL_ANSWER_SELECTED`
- `DELIVERY_PERSISTED`
- `SIDE_EFFECTS_COMMITTED`
- `SIDE_EFFECTS_SKIPPED`
- `SIDE_EFFECTS_BLOCKED`
- `SIDE_EFFECTS_FAILED`
- `DELIVERED`
- `FAILED_SAFE`

## Transition Rules

Illegal transitions throw `CognitiveRuntimeError` with code `ILLEGAL_STATE_TRANSITION`. The attempted transition is appended to the trace with `allowed: false`.

The Orchestrator may retry from `VIGIA_SCORED` or `PROMOTION_EVALUATED` to `OCV_RETRY_REQUESTED` only while retries remain. The next candidate uses the same active user-selected persona and structured repair findings.

After `PROMOTED`, `REJECTED` or `FAILED_SAFE`, the runtime enters `FINAL_ANSWER_SELECTED`. Enforce mode must then reach `DELIVERY_PERSISTED` before any `SIDE_EFFECTS_*` state or `DELIVERED`. Shadow mode may go from `FINAL_ANSWER_SELECTED` to `SIDE_EFFECTS_SKIPPED` because the legacy route already owns visible delivery.

`SIDE_EFFECTS_COMMITTED` means an approved optional-effect transaction completed. No authorized optional effects use `SIDE_EFFECTS_SKIPPED`. Audit-policy denial uses `SIDE_EFFECTS_BLOCKED`. Transaction rollback uses `SIDE_EFFECTS_FAILED`. None of those states may change the selected answer.

## Failure Policy

Validator failure, privacy failure, malformed structured output, illegal transitions and side-effect commit failure fail safe. Rejected candidates are not streamed or persisted as assistant answers.

Audit persistence failure is classified separately. In enforce mode, a pre-side-effect audit outage blocks side effects, emits `AUDIT_PERSISTENCE_FAILURE` and may still deliver promoted text.

## Delivery and Side-Effect Persistence Semantics

Delivery persistence is an essential state transition, not an optional effect. The runtime persists the selected assistant text by cognitive run ID before stream creation. A failed delivery persistence attempt transitions to `FAILED_SAFE` and produces a non-delivery result.

Optional effects are represented after `DELIVERY_PERSISTED` as committed, skipped, blocked or failed. They cannot modify the selected answer. Final audit records `deliveryStatus`, `sideEffectStatus`, memory/Registry/Destiny counts, `assistantMessagePersisted` and `auditPersisted`. Shadow runs record `deliveryStatus=shadow_external` and skip runtime side effects.
