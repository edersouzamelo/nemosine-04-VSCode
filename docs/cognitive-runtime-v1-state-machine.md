# Cognitive Runtime V1 State Machine

The runtime state machine is implemented in `app/lib/nemosine/cognitive-runtime/state-machine.ts`. It is not prompt prose.

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

## Illegal Transitions

Illegal transitions throw `CognitiveRuntimeError` with code `ILLEGAL_STATE_TRANSITION`. The attempted transition is still appended to the trace with `allowed: false`.

## Retry Rule

The Orchestrator may move from `VIGIA_SCORED` or `PROMOTION_EVALUATED` to `OCV_RETRY_REQUESTED` only while retries remain. The next legal state is `CANDIDATE_GENERATED`, using the same active persona and structured repair findings.

## Failure Rule

Enforce mode fails closed. Validator failures, malformed structured output, illegal transitions and side-effect failures move to `FAILED_SAFE` and then `DELIVERED` with a safe runtime message, not the rejected candidate.
