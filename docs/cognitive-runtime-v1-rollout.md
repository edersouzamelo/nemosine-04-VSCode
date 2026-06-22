# Cognitive Runtime V1 Rollout

Production default remains `off`.

## Feature Flags

| Variable | Default | Meaning |
| --- | --- | --- |
| `NEMOSINE_COGNITIVE_RUNTIME_MODE` | `off` | `off`, `shadow` or `enforce`. |
| `NEMOSINE_COHERENCE_THRESHOLD` | `0.80` | Vigia promotion threshold theta. |
| `NEMOSINE_COGNITIVE_MAX_RETRIES` | `2` | Maximum repair retries after the first candidate. |
| `NEMOSINE_DOUBLE_VIGILANCE` | `true` | Enables LLM Philosopher after deterministic hard checks. |
| `NEMOSINE_COGNITIVE_AUDIT` | `true` | Persists redacted audit metadata; full profile requires audit. |

## Modes

`off`: legacy route behavior.

`shadow`: legacy response remains visible. The runtime evaluates a candidate and records that enforcement did not occur. Validator-proposed side effects are not committed by the runtime.

`enforce`: raw candidates are buffered. Only selected final text is sent through the UI-message stream, and only after essential assistant delivery persistence succeeds. Authorized optional effects are committed only after promotion, required audit policy checks, explicit authorization and delivery persistence.

## Delivery and Side-Effect Persistence Semantics

Before enabling enforce mode, apply the migration that adds nullable `Message.cognitiveRunId`, the unique non-null index, and the audit read-model fields for delivery and side-effect status. The route persists the user message once, the runtime persists the assistant answer once by cognitive run ID, and the route streams only when `deliveryStatus=persisted`.

Optional effects are operationally downstream. Memory, Registry, Destiny and conversation episode retention are committed in one transaction when authorized effects exist; failures leave the delivered answer in place and report `sideEffectStatus=failed_rolled_back`. Audit order is final answer selected, pre-effect audit attempted, delivery persisted, optional effects resolved, final audit upserted, stream.

Shadow mode remains safe for rollout because the legacy answer and legacy persistence stay authoritative; the runtime records metadata with `deliveryStatus=shadow_external` and creates no duplicate assistant message or optional effects.

## Staged Deployment

1. Local mocked testing.
2. Clean production build from a clean checkout.
3. Internal shadow mode.
4. Limited selected-persona shadow mode.
5. Reviewed enforce sandbox.
6. Controlled production enforce.

Do not enable public enforce mode until migrations are applied, clean build passes, real shadow traces are reviewed, latency/cost are measured, persona quality is inspected, private-run behavior is manually tested and authorization behavior is reviewed.

## Rollback

Set `NEMOSINE_COGNITIVE_RUNTIME_MODE=off`. The legacy route remains available.
