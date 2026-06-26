# Cognitive Runtime V1 State Machine

The runtime state machine is implemented in `app/lib/nemosine/cognitive-runtime/state-machine.ts`.

Core successful path:

`RECEIVED -> AUTHORIZED -> CONTEXT_ASSEMBLED -> MODULES_SELECTED -> CANDIDATE_GENERATED -> CLAIMS_EXTRACTED -> SCIENTIST_EVALUATED -> VIGIA_SCORED -> OCV_CONVERGED -> PHILOSOPHER_EVALUATED -> PROMOTION_EVALUATED -> PROMOTED -> FINAL_ANSWER_SELECTED -> DELIVERY_PERSISTED -> SIDE_EFFECTS_SKIPPED|SIDE_EFFECTS_COMMITTED|SIDE_EFFECTS_BLOCKED|SIDE_EFFECTS_FAILED -> DELIVERED`

Repair path:

`OCV_RETRY_REQUESTED` returns the run to candidate generation with repair findings. Persona initiative findings can trigger this path when generic interviewer mode, missing context use or vocational inertia is detected.

Failure path:

`FAILED_SAFE` is used when the runtime cannot safely promote or persist a candidate.
