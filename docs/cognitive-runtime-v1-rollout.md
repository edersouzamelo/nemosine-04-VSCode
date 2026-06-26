# Cognitive Runtime V1 Rollout

Runtime mode is controlled by `NEMOSINE_COGNITIVE_RUNTIME_MODE`.

Recommended rollout:

1. `off`: default compatibility mode. `/api/chat` still uses buffered generation plus persona initiative quality gate.
2. `shadow`: audit promoted legacy answers without duplicating assistant messages.
3. `enforce`: runtime owns generation, validation, promotion, delivery persistence and optional side-effect authorization.

Related variables:

- `NEMOSINE_COHERENCE_THRESHOLD`
- `NEMOSINE_COGNITIVE_MAX_RETRIES`
- `NEMOSINE_DOUBLE_VIGILANCE`
- `NEMOSINE_COGNITIVE_AUDIT`
- `NEMOSINE_COGNITIVE_EXECUTION_PROFILE`
- `NEMOSINE_PERSONA_INITIATIVE_MAX_REPAIRS`
