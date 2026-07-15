# Auditoria banco e migrations - OCV

Data: 2026-07-15
Repositorio: `edersouzamelo/nemosine-04-VSCode`
Branch: `checkpoint/pre-ocv-consolidation-20260715`

## Escopo e guardrails

- Nenhum `DROP`, `RESET`, `TRUNCATE` ou migration destrutiva foi executado.
- Nenhuma credencial foi impressa.
- O projeto Vercel paralelo `nemosine-moriarty-probe-rc1-hardening` foi ignorado.
- O repositorio legado `nemosine-08-Runtime` nao foi usado.
- O OCV nao foi ativado em `enforce`.
- Nenhum deploy foi feito.

## Ambiente de banco

Variaveis locais:

```text
DATABASE_URL: present protocol=postgresql host=aws-1-us-east-1.pooler.supabase.com port=6543 database=postgres user=<present> password=<present> query=pgbouncer=<present>
DIRECT_URL: present protocol=postgresql host=aws-1-us-east-1.pooler.supabase.com port=5432 database=postgres user=<present> password=<present> query=<none>
```

Projeto Supabase identificado por conector:

```text
project_id/ref: jhxdlzecuqxpkiodowdf
name: Nemosine
region: us-east-1
status: ACTIVE_HEALTHY
database host: db.jhxdlzecuqxpkiodowdf.supabase.co
postgres: 17.6.1.063
```

Leitura via conector Supabase funcionou. Leitura via Prisma engine local nao funcionou por TLS/conexao.

## Diagnostico do Schema Engine

`npx.cmd prisma migrate status`:

```text
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "postgres", schema "public" at "aws-1-us-east-1.pooler.supabase.com:5432"
Error: Schema engine error:
```

Codigo `Pxxxx`: nenhum codigo `Pxxxx` foi emitido.

Causa provavel, com evidencias:

1. `prisma/schema.prisma` define `directUrl = env("DIRECT_URL")`.
2. O `migrate status` usa o endpoint de `DIRECT_URL` e mostra `aws-1-us-east-1.pooler.supabase.com:5432`.
3. Testes seguros de leitura via Prisma Client falharam:
   - `DATABASE_URL` pooler `6543`: `Error opening a TLS connection: Credenciais nao disponiveis no pacote de seguranca (os error -2146893042)`.
   - `DIRECT_URL` `5432`: primeiro `Can't reach database server`, depois tambem erro TLS ao forcar parametros SSL em memoria.
4. O banco real nao tem `public._prisma_migrations`.
5. O repo nao tem `prisma/migrations`.

Conclusao: o erro curto do Schema Engine nao e uma falha de validade do schema Prisma. O schema valida. O problema e operacional: Prisma Migrate nao consegue estabelecer a conexao direta requerida pelo schema engine com o `DIRECT_URL` atual e, mesmo que conseguisse, nao encontraria historico Prisma versionado (`prisma/migrations` / `_prisma_migrations`) para reconciliar.

## Estado real do banco para estruturas OCV

Consulta de existencia no schema `public`:

| Estrutura | Banco real | Linhas estimadas | RLS |
|---|---:|---:|---:|
| `_prisma_migrations` | nao existe | 0 | nao |
| `ActiveTopic` | existe | 64 | nao |
| `cognitive_run_audits` | existe | 145 | nao |
| `CognitiveFoundationAudit` | nao existe | 0 | nao |
| `sovereign_destiny_context_index` | nao existe | 0 | nao |
| `sovereign_destiny_events` | existe | indeterminado | nao |
| `ThreadPersonaPresence` | existe | 49 | sim |
| `UserProfileEvidence` | nao existe | 0 | nao |
| `UserProfileNode` | nao existe | 0 | nao |

Enums reais encontrados:

```text
GenerationStatus = {PENDING, STREAMING, COMPLETED, FAILED}
MessageKind = {USER, PERSONA, SYSTEM_EVENT}
PersonaEpisodeVisibilityPolicy = {SHARED, PERSONA_PRIVATE, CONFESSOR_SEALED}
ThreadMode = {SINGLE, COLLECTIVE}
ThreadPersonaRole = {HOST, GUEST}
```

Enums `UserProfileEpistemicType`, `UserProfileStatus`, `UserProfileSensitivity` e `UserProfileScopeType` nao existem no banco real.

## Matriz banco/schema/migrations/codigo

| Tabela/campo | Banco real | Schema Prisma | Manual migration | Codigo consumidor | Acao necessaria |
|---|---|---|---|---|---|
| `_prisma_migrations` | Ausente | N/A | N/A | Prisma Migrate | Criar baseline seguro; nao inventar historico. Depois de alinhar estado real, usar uma migration baseline marcada como aplicada ou introduzir migrations futuras a partir do estado atual. |
| `cognitive_run_audits` | Existe com 32 colunas; PK `id`; indices `persona_id`, `runtime_mode`, `created_at`; RLS off | `model CognitiveRunAudit @@map("cognitive_run_audits")` existe e bate em geral | `20260622_add_cognitive_run_audits.sql` | `app/lib/nemosine/cognitive-runtime/audit-store.ts`, `app/lib/admin/cognitiveRuns.ts`, `creatorObservatory.ts` | Manter; incluir no baseline Prisma futuro. Revisar RLS antes de expor via clients Supabase. |
| `ThreadPersonaPresence.muted` | Existe `boolean not null default false`; indice `ThreadPersonaPresence_threadId_active_muted_idx`; RLS on | Campo `muted` ausente no model `ThreadPersonaPresence` | `20260629_add_thread_persona_presence_muting.sql` | `conversation_participants.ts`, `collective_chat_orchestrator.ts`, `MedievalChat.tsx`, `PersonaPresenceStrip.tsx` | Corrigir drift futuramente: adicionar `muted Boolean @default(false)` ao schema Prisma ou documentar como campo raw-managed. Como o codigo usa SQL raw para muted, funciona hoje, mas Prisma Client fica desatualizado. |
| `CognitiveFoundationAudit` | Ausente | Model existe | `20260628_add_cognitive_foundation_user_graph.sql` | `cognitive-foundation/audit.ts`, `persona-feedback/route.ts`, `presence-adjustment/telemetry/route.ts`, admin summary | Aplicar migration aditiva planejada antes de ligar modos foundation que dependam de auditoria persistida. Hoje chamadas fazem catch e degradam silenciosamente. |
| `UserProfileNode` | Ausente | Model existe + enums UserProfile | `20260628_add_cognitive_foundation_user_graph.sql` | `user_graph_store.ts`, `persona_context_assembler.ts`, `cognitive-foundation/persona_context_projection.ts` | Aplicar migration aditiva de user graph antes de usar `userGraphMode`/`personaProjectionMode`. Hoje projection retorna vazio por catch. |
| `UserProfileEvidence` | Ausente | Model existe | `20260628_add_cognitive_foundation_user_graph.sql` | Tipos/projecao futura de evidencia | Aplicar junto com `UserProfileNode`; manter relacao FK no baseline futuro. |
| `ActiveTopic` | Existe; 15 colunas; PK `id`; FK `userId -> User.id`; indices `userId,status,lastObservedAt` e `userId,privacyScope,lastObservedAt`; RLS off | Model existe | `20260626_add_active_topics.sql` | `conversation_continuity.ts`, `context-envelope.ts`, `persona_context_assembler.ts`, response context broker | Manter; incluir no baseline. Observar drift de tipo temporal: banco usa `timestamptz`, schema Prisma declara `DateTime` sem anotacao nativa. |
| `sovereign_destiny_events` | Existe com colunas base ate `updated_at`; indices `user_id`, `event_date`, `category`, `visibility`; sem `external_visibility`, `cognitive_visibility`, `cognitive_personas` | Nao modelado no Prisma | `20260626_add_destiny_cognitive_visibility.sql` espera adicionar colunas cognitivas | `sovereignStore.ts`, `cognitive-runtime/side-effect-committer.ts`, `destiny_context.ts` | Estrutura raw-managed. Aplicar SQL aditivo de visibilidade cognitiva sob plano seguro ou manter runtime `ensure*` como criador; documentar fora do Prisma schema. |
| `sovereign_destiny_context_index` | Ausente | Nao modelado no Prisma | `20260626_add_destiny_cognitive_visibility.sql` cria tabela e indice `user_id` | `sovereignStore.ts`, `side-effect-committer.ts`, `destiny_context.ts` | Criar por SQL aditivo raw-managed antes de depender de contexto Destiny no OCV; nao colocar necessariamente em Prisma se decisao arquitetural for SQL raw. |
| UserProfile enums | Ausentes | Presentes no schema | `20260628_add_cognitive_foundation_user_graph.sql` | `memory_candidate_extractor.ts`, `types.ts`, projection | Aplicar junto com UserProfile tables ou remover do schema se a feature for retirada; antes de ENFORCE, preferir aplicar. |
| `ThreadPersonaPresence` indices base | Presentes | Schema declara indices base, exceto muted | `20260628_add_multi_persona_collective_sessions.sql` + `20260629...muting.sql` | participantes coletivos | Baseline deve preservar todos os indices reais, incluindo `muted`. |

## Indices e constraints relevantes

`cognitive_run_audits`:

```text
PK: cognitive_run_audits_pkey (id)
INDEX: cognitive_run_audits_created_at_idx (created_at)
INDEX: cognitive_run_audits_persona_id_idx (persona_id)
INDEX: cognitive_run_audits_runtime_mode_idx (runtime_mode)
```

`ThreadPersonaPresence`:

```text
PK: ThreadPersonaPresence_pkey (id)
FK: ThreadPersonaPresence_threadId_fkey -> Thread(id), ON UPDATE CASCADE ON DELETE CASCADE
INDEX: ThreadPersonaPresence_threadId_idx
INDEX: ThreadPersonaPresence_personaId_idx
INDEX: ThreadPersonaPresence_active_idx
INDEX: ThreadPersonaPresence_threadId_active_idx
INDEX: ThreadPersonaPresence_threadId_personaId_active_idx
INDEX: ThreadPersonaPresence_threadId_active_muted_idx
```

`ActiveTopic`:

```text
PK: ActiveTopic_pkey (id)
FK: ActiveTopic_userId_fkey -> User(id), ON DELETE CASCADE
INDEX: ActiveTopic_userId_status_lastObservedAt_idx
INDEX: ActiveTopic_userId_privacyScope_lastObservedAt_idx
```

`sovereign_destiny_events`:

```text
PK: sovereign_destiny_events_pkey (id)
INDEX: sovereign_destiny_events_user_id_idx
INDEX: sovereign_destiny_events_event_date_idx
INDEX: sovereign_destiny_events_category_idx
INDEX: sovereign_destiny_events_visibility_idx
MISSING: sovereign_destiny_events_cognitive_visibility_idx
```

## Divergencias principais

1. `prisma/migrations` ausente no repo e `_prisma_migrations` ausente no banco.
2. `ThreadPersonaPresence.muted` existe no banco e nas manual migrations, mas nao no schema Prisma.
3. `CognitiveFoundationAudit`, `UserProfileNode`, `UserProfileEvidence` e UserProfile enums existem no schema/manual migration, mas nao existem no banco real.
4. `sovereign_destiny_events` existe, mas a migration cognitiva de Destiny esta parcialmente ausente: faltam `external_visibility`, `cognitive_visibility`, `cognitive_personas`, `sovereign_destiny_context_index` e indice cognitivo.
5. Estruturas raw-managed (`sovereign_*`, `user_registros`, `travessia_*`, etc.) coexistem com Prisma models, sem fronteira versionada formal.
6. RLS esta desabilitado em varias tabelas publicas, incluindo `cognitive_run_audits` e `ActiveTopic`. O proprio conector Supabase classificou isso como advisory critico. Nao foi aplicado SQL de RLS porque habilitar sem policies pode bloquear fluxos.

## Estrategia segura de baseline Prisma

Nao inventar uma migration historica retroativa com datas antigas.

Plano recomendado:

1. Corrigir conectividade de migration:
   - `DATABASE_URL`: manter pooler para runtime se necessario.
   - `DIRECT_URL`: apontar para o host direto do projeto Supabase (`db.jhxdlzecuqxpkiodowdf.supabase.co:5432`) ou endpoint direto suportado, com SSL apropriado.
   - Validar localmente em ambiente onde Prisma schema engine consiga TLS.

2. Congelar uma fotografia do banco real:
   - Exportar DDL real de `public` com `pg_dump --schema-only` ou `prisma db pull` em ambiente confiavel.
   - Comparar contra `prisma/schema.prisma` e manual migrations.
   - Decidir quais estruturas entram no Prisma schema e quais ficam raw-managed.

3. Alinhar schema antes de baseline:
   - Adicionar `ThreadPersonaPresence.muted` ao schema Prisma em uma mudanca futura controlada.
   - Decidir se UserProfile/CognitiveFoundation serao aplicados agora ou removidos temporariamente do schema ate release.
   - Manter `sovereign_destiny_*` como SQL raw-managed ou modelar explicitamente no Prisma, mas nao misturar sem documento.

4. Criar baseline versionado a partir do estado aprovado:
   - Gerar uma primeira migration baseline que representa o estado consolidado, sem tentar fingir historico antigo.
   - Marcar como aplicada no banco existente com `prisma migrate resolve --applied <baseline>` somente depois de revisao.
   - A partir dai, toda mudanca futura deve entrar em `prisma/migrations`.

5. Tratar raw SQL intencional:
   - Criar pasta/documento de migrations SQL raw versionadas se algumas tabelas continuarem fora do Prisma.
   - Cada raw migration deve ser idempotente, com plano de rollback e teste de existencia.

## Riscos antes de ativar ENFORCE

- O runtime cognitivo grava/consulta `cognitive_run_audits`, que existe, mas sem historico Prisma formal.
- Foundation/user graph nao esta aplicado no banco real; ativar `userGraphMode`, `personaProjectionMode` ou auditorias obrigatorias pode gerar degradacao silenciosa ou falhas dependendo do caminho.
- `ThreadPersonaPresence.muted` esta fora do Prisma schema; futuras geracoes de client/migrations podem tentar remover ou ignorar esse campo se o drift nao for resolvido.
- Destiny cognitive context esta incompleto no banco; side effects/contexto podem depender de runtime `ensure*` em vez de migration controlada.
- `DIRECT_URL` atual nao e um endpoint direto confiavel para Prisma Migrate.
- RLS off em tabelas publicas e um risco de seguranca Supabase antes de ampliar fluxos governados.
- Nao ha `_prisma_migrations`; qualquer tentativa direta de `migrate deploy`/`migrate status` em CI/producao continuara fragil ate baseline formal.
