# Sala de Maquinas V1

`Sala de Maquinas` is the first read-only administrative observability interface for Nemosine Nous Cognitive Runtime. It makes runtime execution metadata visible to the creator without exposing private content, raw prompts, hidden reasoning or candidate prose.

## Purpose

The panel observes where the cognitive runtime went, how deep it operated, what it measured and why a response was promoted, retried, rejected or failed safely. It does not control the runtime.

V1 does not:

- reveal hidden reasoning;
- measure consciousness, intelligence or truth probability;
- prove factual truth;
- expose Confessor or Porao content;
- expose raw user messages, raw candidate responses, rejected candidate prose or native prompts;
- permit threshold, weight, mode or promotion overrides;
- replay, rerun or delete audits.

## Routes

- Page: `/admin/sala-de-maquinas`
- List and summary API: `/api/admin/cognitive-runs`
- Detail API: `/api/admin/cognitive-runs/[runId]`

The Navbar admin dropdown and `/admin` creator panel link to the page only through admin-only UI branches.

## Authorization

The page performs server-side authorization with `auth()` and `isAdminEmail`. Unauthenticated users are redirected to `/access?callbackUrl=/admin/sala-de-maquinas`. Authenticated non-admin users are redirected to `/space`.

Both APIs call `auth()` on the server and return `403` unless `isAdminEmail(session.user.email)` is true. Client-side hiding is not trusted as an access boundary.

## List API Contract

Validated query parameters:

- `page`, default `1`
- `pageSize`, default `25`, max `100`
- `dateFrom`
- `dateTo`
- `personaId`
- `placeId`
- `runtimeMode`: `off`, `shadow`, `enforce`
- `executionProfile`: `light`, `standard`, `full`
- `promotionDecision`: `promoted`, `rejected`, `failed_safe`, `shadow_only`
- `deliveryStatus`: `not_attempted`, `persisted`, `failed`, `shadow_external`
- `sideEffectStatus`: `none`, `skipped`, `blocked`, `committed`, `failed_rolled_back`
- `privateRun`: `true` or `false`
- `minCoherence`
- `maxCoherence`
- `findingCode`
- `sort`: `newest`, `oldest`, `coherence_desc`, `coherence_asc`

The response returns:

- `summary`: safe aggregate metrics;
- `rows`: paginated whitelisted execution rows;
- `pagination`: page metadata;
- `activeFilters`: normalized filter values.

The API never serializes a full Prisma record blindly.

## Summary Metrics

V1 exposes:

- total cognitive runs;
- promotion, rejection and failed-safe rates;
- average and median `C(m)`;
- average iterations;
- retry percentage;
- average latency;
- full/standard/light distribution;
- shadow/enforce distribution;
- delivery persistence failure count;
- audit persistence failure count;
- optional-effect blocked count;
- optional-effect rollback/failure count;
- private-run count.

Median coherence, retry rate, audit persistence failures and latency use a bounded JSON-safe sample because those values depend on redacted JSON fields or date deltas. The API reports the sample limit in the response.

## Detail API Contract

The detail endpoint returns safe sections:

- identity and execution metadata;
- ordered state timeline;
- O-C-V iteration summaries derived from retained transition metadata;
- Vigia score bars from redacted dimension scores;
- Double Vigilance cards for Scientist and Philosopher as validation axes, not autonomous agents;
- persistence status and counts;
- privacy metadata.

Raw hashes are not shown as content. Detail returns hash-presence booleans and content lengths, not raw message text.

## Field Glossary

- `C(m)`: operational promotion-coherence index used by the runtime. It is not a measure of consciousness, intelligence or truth probability.
- `promotionDecision`: final promotion gate outcome: promoted, rejected, failed safe or shadow-only.
- `deliveryStatus`: whether essential assistant delivery persistence happened, failed or was externally handled by shadow/legacy mode.
- `sideEffectStatus`: status of optional memory, Registry, Destiny and conversation-episode effects.
- `assistantMessagePersisted`: whether the final assistant answer was durably persisted.
- `auditPersisted`: whether the audit read model was durably persisted.
- `metadataOnly`: private-run audit mode in which raw content must not be exposed.

## State Meanings

- `FINAL_ANSWER_SELECTED`: runtime chose the final deliverable text.
- `DELIVERY_PERSISTED`: essential assistant message persistence succeeded.
- `SIDE_EFFECTS_COMMITTED`: optional effect transaction succeeded.
- `SIDE_EFFECTS_SKIPPED`: no runtime optional effects were written.
- `SIDE_EFFECTS_BLOCKED`: optional effects were blocked by policy.
- `SIDE_EFFECTS_FAILED`: optional effects failed and rolled back.
- `DELIVERED`: the selected answer was eligible for stream delivery.
- `FAILED_SAFE`: runtime selected a safe failure path.

## Side-Effect Meanings

Optional effects are separate from assistant delivery. V1 displays memory, Registry and Destiny counts, plus blocked or rollback reasons when available. It does not allow creating, editing, deleting, replaying or approving effects from the panel.

## Privacy Guarantees

For private Confessor and Porao runs:

- the page displays a private badge;
- only technical metadata is shown;
- no content preview or rejected-candidate preview is provided;
- no raw audit JSON export is provided;
- browser logs and error states contain no raw content.

The APIs drop suspicious event-detail keys such as prompt, candidate, content, message or text keys before returning data.

## Resilience

If the audit table is missing or the persistence migration is not applied, the API returns a diagnostic `503` and the UI shows an administrative diagnostic state. Malformed historic JSON is sanitized into empty arrays/objects instead of crashing the page.

## Known Limitations

- Historic V1 audit rows do not retain threshold or full Vigia weight JSON; the UI shows `n/a` for those fields.
- Per-iteration Scientist/Philosopher details are reconstructed only from retained redacted metadata.
- Median and some JSON-derived metrics are computed from a bounded sample.
- This branch does not build a control room for changing runtime configuration.

## Rollout Procedure

1. Deploy only after the persistence schema containing `CognitiveRunAudit` delivery and side-effect fields is applied.
2. Keep runtime mode controlled by existing environment variables outside this panel.
3. Verify `/api/admin/cognitive-runs` and `/api/admin/cognitive-runs/[runId]` return `403` for non-admin users.
4. Review private-run detail displays for metadata-only behavior.
5. Enable the page link only through the existing admin dropdown and `/admin` creator panel.
