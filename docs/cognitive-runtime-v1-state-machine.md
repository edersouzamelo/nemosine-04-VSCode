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
- `SIDE_EFFECTS_COMMITTED`
- `DELIVERED`
- `FAILED_SAFE`

## Transition Rules

Illegal transitions throw `CognitiveRuntimeError` with code `ILLEGAL_STATE_TRANSITION`. The attempted transition is appended to the trace with `allowed: false`.

The Orchestrator may retry from `VIGIA_SCORED` or `PROMOTION_EVALUATED` to `OCV_RETRY_REQUESTED` only while retries remain. The next candidate uses the same active user-selected persona and structured repair findings.

## Failure Policy

Validator failure, privacy failure, malformed structured output, illegal transitions and side-effect commit failure fail safe. Rejected candidates are not streamed or persisted as assistant answers.

Audit persistence failure is classified separately. In enforce mode, a pre-side-effect audit outage blocks side effects, emits `AUDIT_PERSISTENCE_FAILURE` and may still deliver promoted text.
