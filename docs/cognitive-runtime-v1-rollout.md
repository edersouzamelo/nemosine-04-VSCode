# Cognitive Runtime V1 Rollout

Production default for this PR is `off`.

## Feature Flags

| Variable | Default | Meaning |
| --- | --- | --- |
| `NEMOSINE_COGNITIVE_RUNTIME_MODE` | `off` | `off`, `shadow` or `enforce`. |
| `NEMOSINE_COHERENCE_THRESHOLD` | `0.80` | Vigia promotion threshold. |
| `NEMOSINE_COGNITIVE_MAX_RETRIES` | `2` | Maximum repair retries after the first candidate. |
| `NEMOSINE_DOUBLE_VIGILANCE` | `true` | Enables Philosopher axis after O-C-V convergence. |
| `NEMOSINE_COGNITIVE_AUDIT` | `true` | Persists redacted cognitive audit metadata. |

## Modes

`off`: legacy route behavior.

`shadow`: legacy response remains visible. The runtime evaluates a candidate and records that no enforcement occurred. Validator-proposed side effects are not committed.

`enforce`: raw candidates are buffered. Only promoted text is sent through an AI SDK UI-message stream. Approved side effects are committed only after promotion.

## Deployment Steps

1. Deploy code with `NEMOSINE_COGNITIVE_RUNTIME_MODE=off`.
2. Apply `prisma/manual_migrations/20260622_add_cognitive_run_audits.sql`.
3. Run `npx prisma generate`.
4. Run `npm run audit:cognitive-runtime`.
5. Enable `shadow` for internal users.
6. Inspect audit rates, validator failures and coherence distributions.
7. Enable `enforce` only after shadow evidence is acceptable.

## Rollback

Set `NEMOSINE_COGNITIVE_RUNTIME_MODE=off`. The legacy path remains available in the same route.
