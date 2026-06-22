# Cognitive Runtime V1 Gap Matrix

Audited baseline for this repair: `7efec056bbf2f5734c794fad9993b9f6ce52f4e5`.

V1 is not a replacement for human judgment and not an autonomous cognitive architecture. It is a bounded runtime that separates linguistic generation, evidence extraction, validation, coherence scoring, promotion and authorized persistence.

| Requirement | Repair status | Enforcement | Evidence |
| --- | --- | --- | --- |
| Clean build independence | Persona Manuscripts dependency removed. | No import or file path allowed by audit script. | `audit:cognitive-runtime`, unit no-Manuscripts test. |
| Native prompt integrity | `prompts.json` unchanged; manifest verified. | SHA-256 test. | `test:persona-identity`. |
| Evidence-aware extraction | Extractor receives quoted user message, authorized context metadata/text and candidate text. | Prompt serialization with delimiters. | Integration captures extractor input. |
| Evidence-aware Scientist | Scientist receives the same authorized evidence plus extracted claims. | Structured schema and prompt instruction. | Integration captures Scientist input. |
| Deterministic hard checks | Scientist, privacy, vocation and Philosopher deterministic checks always run. | Merge functions preserve hard findings. | Unit/integration merge tests. |
| Scientist semantics | `biographicalSafety` and `accessClaimSafety` replace ambiguous fields. | Zod schema, prompts, Vigia and tests. | Unit schema test. |
| Scientist promotion gate | `approved=false`, error/critical findings and floors block promotion. | Promotion gate code. | Unit promotion tests. |
| Full profile strength | High-stakes forces `full`; full floors are stricter. | Profile selector and promotion floors. | Unit/integration profile tests. |
| Private side effects | Private runs only allow exact-scope authorized memory. | Side-effect authorizer. | Integration private-run test. |
| Authorization provenance | Committed side effects record authorization category. | Proposed action schema and committer. | Unit side-effect test. |
| Audit redaction | Audits store hashes, lengths, scores, findings and events. | Redaction builder and Prisma JSON fields. | Unit redaction test. |
| Audit outage policy | Promoted text may deliver; side effects are blocked if pre-commit audit persistence fails. | Orchestrator policy. | Integration audit failure test. |
| O-C-V retry | Failed coherence or promotion can retry within bounded max attempts. | State machine and repair findings. | Integration retry test. |
| Runtime off | Legacy path remains default. | Config default `off`. | Unit/integration config tests. |

## Remaining Gaps

- No external factual verification tool is integrated.
- Live persona evaluation is opt-in and not CI-gating.
- Consent preferences for automatic registry/memory are not yet user-configurable in UI.
- Prisma migration remains manual in this repository convention.
- Shadow-mode empirical traces are still required before production enforce rollout.
