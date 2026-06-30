# Cognitive Foundation Local Validation

This guide covers the local-only User Graph, memory candidate extractor, persona projection, Depth Gate, internal onboarding v2, public enrichment foundation, and rollback path.

## Safety Defaults

All new flags default to `off`:

```env
USER_GRAPH_MODE=off
MEMORY_EXTRACTOR_MODE=off
DEPTH_GATE_MODE=off
PERSONA_PROJECTION_MODE=off
ONBOARDING_V2_MODE=off
WEB_ENRICHMENT_MODE=off
```

Runtime modes for User Graph, extractor, projection, and Depth Gate:

- `off`: do nothing.
- `shadow`: calculate and audit safe metadata, without changing the answer.
- `enforce`: allowed to affect context or gate behavior where wired. The first local target remains shadow validation.

Onboarding modes:

- `off`
- `internal`
- `opt_in`
- `public`

Web enrichment modes:

- `off`
- `internal`
- `opt_in`

## Local Setup

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Regression Tests

```bash
npm run test:multi-persona
npm run test:persona-identity
npm run test:response-pipeline
npm run test:cognitive-runtime
npm run test:cognitive-foundation
npm run test:sala-de-maquinas
npm run build
```

## Optional Local Migration

Use only a local development database.

```bash
psql "$DATABASE_URL" -f prisma/manual_migrations/20260628_add_cognitive_foundation_user_graph.sql
```

Rollback for the local database:

```bash
psql "$DATABASE_URL" -f prisma/manual_migrations/20260628_add_cognitive_foundation_user_graph.rollback.sql
```

No production migration is required for the code to stay safe with all flags `off`.

## Manual Chat Test

1. Start the app with all flags `off`.
2. Open a simple persona chat.
3. Send a short message to one persona and confirm the normal response arrives.
4. Enable multipersona locally:

```env
MULTI_PERSONA_ENABLED=true
```

5. Start a collective thread with Inimigo as host.
6. Invite Luz and Sombra.
7. Ask for a debate and confirm each participant stays identified.
8. Send `silencie Sombra por enquanto` and confirm Sombra does not answer the next round.
9. Send a directed turn like `Luz, responda primeiro` and confirm only Luz answers.

## Shadow Test

Set local environment values:

```env
USER_GRAPH_MODE=shadow
MEMORY_EXTRACTOR_MODE=shadow
DEPTH_GATE_MODE=shadow
PERSONA_PROJECTION_MODE=shadow
ONBOARDING_V2_MODE=internal
WEB_ENRICHMENT_MODE=opt_in
```

Run the app and chat normally. The answer should not change because these modes are observational.

Open:

```text
http://localhost:3000/admin/sala-de-maquinas
```

Confirm the Cognitive Foundation panel shows flag state and metadata-only counts. It must not show raw prompts, raw messages, or Confessor content.

## Onboarding V2 Local Test

With `ONBOARDING_V2_MODE=internal`, open:

```text
http://localhost:3000/space/travessia-inicial
```

Fill any subset of fields and generate the mirror. Confirm candidates are presented for review and not persisted automatically.

## Public Enrichment Foundation Test

With `WEB_ENRICHMENT_MODE=opt_in`, call the endpoint with explicit consent and authorized domains only:

```bash
curl -X POST http://localhost:3000/api/public-enrichment \
  -H "content-type: application/json" \
  -d "{\"consent\":true,\"links\":[\"https://example.com/profile\"],\"authorizedDomains\":[\"example.com\"]}"
```

The response must report `networkFetchPerformed:false` and `persisted:false`.

## Disable Everything

Restore:

```env
USER_GRAPH_MODE=off
MEMORY_EXTRACTOR_MODE=off
DEPTH_GATE_MODE=off
PERSONA_PROJECTION_MODE=off
ONBOARDING_V2_MODE=off
WEB_ENRICHMENT_MODE=off
```

Restart the dev server.

## Restore Checkpoint

The checkpoint branch and tag created for this work are:

```text
backup/pre-user-graph-20260628-2223
checkpoint-pre-user-graph-20260628-2223
```

To inspect:

```bash
git show checkpoint-pre-user-graph-20260628-2223
```

To restore the worktree to the checkpoint in a new local branch:

```bash
git switch -c restore/pre-user-graph checkpoint-pre-user-graph-20260628-2223
```

To reset the current branch back to the checkpoint, only after confirming no local work must be preserved:

```bash
git reset --hard checkpoint-pre-user-graph-20260628-2223
```
