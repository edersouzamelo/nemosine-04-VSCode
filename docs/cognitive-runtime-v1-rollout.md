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

`enforce`: raw candidates are buffered. Only promoted text is sent through the UI-message stream. Authorized side effects are committed only after promotion and audit policy checks.

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
