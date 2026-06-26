# Cognitive Runtime V1 Architecture

This document records the implemented runtime flow as technical architecture, not as legal or patent analysis.

## Pipeline

1. `createCognitiveRequest` creates a run id, memory scope, runtime mode and privacy flag.
2. `assembleCognitiveContextEnvelope` resolves native persona prompt, functional contract, authorized context and prompt hashes.
3. `persona-generator` generates a candidate with quoted context and repair feedback.
4. `claim-extractor` strips legacy action tags and extracts claims/actions.
5. Scientist, Privacy, Vocational Policy, Persona Initiative and Vigia evaluate the candidate.
6. Philosopher adds second-vigilance checks when configured.
7. `promotion-gate` promotes, retries or rejects.
8. `side-effect-committer` persists the promoted assistant message and optional effects only after authorization.
9. `audit-redaction` stores hashes, lengths, state transitions, scores and finding codes without raw prompt, memory or candidate text.

## Runtime Modes

- `off`: legacy route is used.
- `shadow`: runtime audits an observed answer without duplicating delivery.
- `enforce`: runtime owns candidate generation, promotion and delivery persistence.
