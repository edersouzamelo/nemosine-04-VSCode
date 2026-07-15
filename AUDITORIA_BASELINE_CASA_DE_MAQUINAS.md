# Auditoria baseline - Casa de Maquinas

Data: 2026-07-15
Escopo: `C:\Users\eders\Desktop\Dev Nemo AG\nemosine-04-VSCode-main`
Restricao seguida: nenhum arquivo de codigo foi alterado ou refatorado. Este relatorio e a unica escrita deliberada desta auditoria.

## 1. Identificacao do repo

- Pasta atual: `C:\Users\eders\Desktop\Dev Nemo AG\nemosine-04-VSCode-main`
- Remote Git:
  - `origin https://github.com/edersouzamelo/nemosine-04-VSCode.git (fetch)`
  - `origin https://github.com/edersouzamelo/nemosine-04-VSCode.git (push)`
- Branch atual: `codex/user-graph-depth-gate-v1`
- Upstream: `origin/codex/user-graph-depth-gate-v1`
- Commit HEAD: `c1c55a9fe5633dfff4e65767dc589a16ded9cc49`
- Estado branch/remoto: branch local estava up to date com o upstream; `git log @{u}..HEAD` e `git log HEAD..@{u}` nao retornaram commits.

### Git status antes deste relatorio

```text
## codex/user-graph-depth-gate-v1...origin/codex/user-graph-depth-gate-v1
 M app/access/page.tsx
 M app/components/Navbar.tsx
 M app/components/PersonaCategoryExplorer.tsx
 M app/components/PersonaLevelCollection.tsx
 M app/exposicoes/page.tsx
 M app/globals.css
 M app/inicio/page.tsx
 M app/lib/travessia/engine.ts
 M app/manifesto/page.tsx
 M app/providers.tsx
 M app/space/dominios/page.tsx
 M app/space/registros/page.tsx
 M auth.config.ts
 M auth.ts
?? app/components/ManifestoReader.tsx
?? app/components/RouteTransition.tsx
?? output/
?? public/assets/manifesto-pages/
?? public/assets/manifesto-reader/
```

Arquivos modificados ou nao enviados ao GitHub:

- Modificados: `app/access/page.tsx`, `app/components/Navbar.tsx`, `app/components/PersonaCategoryExplorer.tsx`, `app/components/PersonaLevelCollection.tsx`, `app/exposicoes/page.tsx`, `app/globals.css`, `app/inicio/page.tsx`, `app/lib/travessia/engine.ts`, `app/manifesto/page.tsx`, `app/providers.tsx`, `app/space/dominios/page.tsx`, `app/space/registros/page.tsx`, `auth.config.ts`, `auth.ts`.
- Nao rastreados: `app/components/ManifestoReader.tsx`, `app/components/RouteTransition.tsx`, `output/`, `public/assets/manifesto-pages/`, `public/assets/manifesto-reader/`.
- Este relatorio, apos criado, tambem passa a aparecer como nao rastreado ate ser commitado.

### Ultimos 15 commits

```text
c1c55a9 (HEAD -> codex/user-graph-depth-gate-v1, origin/codex/user-graph-depth-gate-v1) fix: keep registry horizontal scroll accessible
6c69342 fix: show presence adjustment marker immediately
e784d53 feat: show presence adjustment context in chat
a6371fe feat: add persona feedback and smoother presence UI
f04139a fix: prioritize presence contract on vague turns
37c4ed3 fix: anchor presence opening before recent memories
356e4a7 fix: ignore response-repair noise in active fronts
a9bcd3d docs: add local presence validation guide
e435e83 test: add presence adjustment coverage
15898f5 feat: enforce presence response constraints
e87d240 feat: add first agreement overlay
1f60314 feat: add presence adjustment flow state
da1fdb4 chore: preserve cognitive foundation working state
d9880f4 (tag: checkpoint-pre-user-graph-20260628-2223, backup/pre-user-graph-20260628-2223) chore: checkpoint before user graph and depth gate
579b5f1 (origin/codex/multi-persona-collective-sessions, codex/multi-persona-collective-sessions) Render invite persona drawer in portal
```

## 2. Vercel

Projeto Vercel vinculado localmente em `.vercel/project.json`:

```json
{"projectId":"prj_mIRUVo0SyklEq5NY5GFbsU0DZz9M","orgId":"team_BonDbHcs3uecUCHovuLPLJZe","projectName":"nemosine-04-vs-code"}
```

Inspecao somente leitura do projeto vinculado:

- Projeto: `edersouzamelo-4267s-projects/nemosine-04-vs-code`
- ID: `prj_mIRUVo0SyklEq5NY5GFbsU0DZz9M`
- Owner: `edersouzamelo-4267's projects`
- Criado em: 17 February 2026 05:41:45
- Root Directory: `.`
- Framework: Next.js
- Node.js: `24.x`
- Production URL listada: `https://app.nemosinenous.com`
- Build command: `npm run build` ou `next build`

Projeto Vercel paralelo solicitado:

- Nome encontrado: `nemosine-moriarty-probe-rc1-hardening`
- ID: `prj_98AQFKblFnb3UwoZePFl6hIIFA0F`
- Owner: `edersouzamelo-4267's projects`
- Criado em: 01 July 2026 19:18:47
- Root Directory: `.`
- Framework: Next.js
- Node.js: `24.x`
- Latest Production URL: `--`
- Deployments: `No deployments found`
- Referencias locais no repo atual para `nemosine-mori`, `mori`, ou `rc1-hardening`: nenhuma encontrada fora de `.git`, `.next`, `node_modules` e `output`.
- Origem/finalidade: pela metadata da Vercel, e um projeto criado no mesmo escopo do usuario, sem deploys, paralelo ao projeto atual. Pelo nome (`moriarty-probe-rc1-hardening`), a finalidade aparente e uma prova/sonda de hardening RC1. Isso e inferencia a partir do nome e da metadata; nao ha evidencia local de que integre o aplicativo atual.
- Nenhuma conexao, alteracao ou exclusao foi feita.

## 3. Arquivos e diretorios solicitados

### `app/api/chat/route.ts`

- Existe: sim
- Caminho: `app/api/chat/route.ts`
- Tamanho observado: `45625` bytes
- LastWriteTime observado: `30/06/2026 22:11:34`
- Pontos relevantes:
  - `POST` comeca em `app/api/chat/route.ts:438`.
  - Importa `readCognitiveRuntimeConfig`, `executeCognitiveRuntime`, `createPromotedUIMessageStreamResponse` e `runCognitiveRuntime`.
  - Chama `runResponsePipelineV2` quando `responsePipelineConfig.mode === "enforce"`.
  - Chama `executeCognitiveRuntime` apenas quando `runtimeConfig.mode === "enforce"`.
  - Chama `generateText` na trilha legacy/buffered.
  - Roda `runCognitiveRuntime` em modo `shadow` depois de selecionar/entregar resposta.

### Diretorios com `runtime`, `cognitive`, `orchestrator`, `scientist`, `philosopher`, `vigia`, `promotion`, `audit` ou `machine-room` no nome

```text
app\api\admin\cognitive-foundation
app\api\admin\cognitive-runs
app\api\admin\cognitive-runtime
app\lib\nemosine\cognitive-foundation
app\lib\nemosine\cognitive-runtime
tests\cognitive-foundation
tests\cognitive-runtime
```

### Arquivos com esses termos no caminho/nome

```text
active_prompts\O Vigia.docx
app\api\admin\cognitive-foundation\route.ts
app\api\admin\cognitive-runs\[runId]\route.ts
app\api\admin\cognitive-runs\route.ts
app\api\admin\cognitive-runtime\config\route.ts
app\lib\admin\cognitiveRuns.ts
app\lib\admin\cognitiveRunsUi.ts
app\lib\admin\cognitiveRuntimeConfig.ts
app\lib\nemosine\cognitive-foundation\audit.ts
app\lib\nemosine\cognitive-foundation\config.ts
app\lib\nemosine\cognitive-foundation\depth_gate.ts
app\lib\nemosine\cognitive-foundation\index.ts
app\lib\nemosine\cognitive-foundation\memory_candidate_extractor.ts
app\lib\nemosine\cognitive-foundation\onboarding_v2.ts
app\lib\nemosine\cognitive-foundation\persona_context_projection.ts
app\lib\nemosine\cognitive-foundation\privacy.ts
app\lib\nemosine\cognitive-foundation\public_enrichment.ts
app\lib\nemosine\cognitive-foundation\types.ts
app\lib\nemosine\cognitive-foundation\user_graph_store.ts
app\lib\nemosine\cognitive-runtime\audit-redaction.ts
app\lib\nemosine\cognitive-runtime\audit-store.ts
app\lib\nemosine\cognitive-runtime\claim-extractor.ts
app\lib\nemosine\cognitive-runtime\config.ts
app\lib\nemosine\cognitive-runtime\context-envelope.ts
app\lib\nemosine\cognitive-runtime\index.ts
app\lib\nemosine\cognitive-runtime\module-registry.ts
app\lib\nemosine\cognitive-runtime\orchestrator.ts
app\lib\nemosine\cognitive-runtime\persona-generator.ts
app\lib\nemosine\cognitive-runtime\philosopher-validator.ts
app\lib\nemosine\cognitive-runtime\privacy-policy.ts
app\lib\nemosine\cognitive-runtime\promotion-gate.ts
app\lib\nemosine\cognitive-runtime\runtime.ts
app\lib\nemosine\cognitive-runtime\scientist-validator.ts
app\lib\nemosine\cognitive-runtime\side-effect-committer.ts
app\lib\nemosine\cognitive-runtime\state-machine.ts
app\lib\nemosine\cognitive-runtime\types.ts
app\lib\nemosine\cognitive-runtime\vigia-coherence.ts
app\lib\nemosine\cognitive-runtime\vocational-policy.ts
app\lib\nemosine\collective_chat_orchestrator.ts
app\lib\nemosine\response\audit.ts
app\lib\travessia\vigia.ts
docs\cognitive-foundation-local-validation.md
docs\cognitive-runtime-v1-architecture.md
docs\cognitive-runtime-v1-coherence-formalization.md
docs\cognitive-runtime-v1-evidence.md
docs\cognitive-runtime-v1-gap-matrix.md
docs\cognitive-runtime-v1-patent-traceability.md
docs\cognitive-runtime-v1-privacy.md
docs\cognitive-runtime-v1-rollout.md
docs\cognitive-runtime-v1-scm-fidelity.md
docs\cognitive-runtime-v1-state-machine.md
docs\native-persona-prompts-audit.md
docs\persona-payload-hygiene-audit.md
docs\persona-pipeline-audit-and-anti-sac-report.md
docs\Preprint - A Modular Cognitive Architecture for Assisted Reasoning The Nemosine Framework.pdf
docs\Preprint - A_Conceptual_Architectural_Design_for_Symbolic_Modular_Cognitive_Systems_Assisted_by_Large_Language_Models.pdf
docs\Preprint - Category_Error_and_Epistemic_Artifacts_in_AI_Assisted_Symbolic_Cognitive_Systems.pdf
docs\Preprint - Constraining_Bias_and_Self_Reference_in_N_1_Cognitive_Workflow_Research__A_Protocol_First_Framework (1).pdf
docs\Preprint - From_Diffuse_Extension_to_Structured_Scaffolding__Reframing_the_Extended_Mind_Thesis_through_Cognitive_Architecture.pdf
docs\Preprint - jors_sw_paper_template_0-2 MiND_ A Deterministic Middleware for Auditing, Reproducing, and Logging Large Language Model Interactions in Research Workflows.pdf
docs\Preprint - Operationalizing_Minsky__A_Modular_Cognitive_System_Convergent_with_the_Society_of_Mind_Model.pdf
docs\Preprint - Risk_Identification_and_Management_in_Hybrid_Cognitive_Systems_Based_on_Large_Language_Models.pdf
docs\Preprint - Spatial_Cognition_Revisited__Extending_the_Method_of_Loci_into_a_Symbolic_Modular_Cognitive_System.pdf
docs\Preprint - Symbolic_Interfaces_and_Modular_Cognition__A_Lacanian_Framework_for_Contemporary_Cognitive_Architectures.pdf
prisma\manual_migrations\20260622_add_cognitive_run_audits.sql
prisma\manual_migrations\20260626_add_destiny_cognitive_visibility.sql
prisma\manual_migrations\20260628_add_cognitive_foundation_user_graph.rollback.sql
prisma\manual_migrations\20260628_add_cognitive_foundation_user_graph.sql
public\agents\landscape\Vigia.png
public\agents\Vigia.png
public\agents\voice\Vigia.mp3
public\assets\cards\♣️ A - Vigia.png
scripts\audit-cognitive-runtime.js
tests\cognitive-foundation\foundation-unit.test.js
tests\cognitive-runtime\load-ts.cjs
tests\cognitive-runtime\runtime-integration.test.js
tests\cognitive-runtime\runtime-unit.test.js
```

### `prisma/schema.prisma`

- Existe: sim
- Caminho: `prisma/schema.prisma`
- Tamanho observado: `12171` bytes
- LastWriteTime observado: `28/06/2026 22:36:36`
- Datasource: PostgreSQL, `url = env("DATABASE_URL")`, `directUrl = env("DIRECT_URL")`
- Modelos/enums principais encontrados:
  - Enums: `ThreadMode`, `ThreadPersonaRole`, `MessageKind`, `GenerationStatus`, `PersonaEpisodeVisibilityPolicy`, `UserProfileEpistemicType`, `UserProfileStatus`, `UserProfileSensitivity`, `UserProfileScopeType`.
  - Models: `User`, `TermsAcceptance`, `Account`, `Session`, `VerificationToken`, `Authenticator`, `Thread`, `Message`, `ThreadPersonaPresence`, `PersonaConversationEpisode`, `CollectiveGenerationAudit`, `UserMemory`, `UserProfileNode`, `UserProfileEvidence`, `CognitiveFoundationAudit`, `ActiveTopic`, `CognitiveRunAudit`.
  - `CognitiveRunAudit` mapeia para tabela `cognitive_run_audits`.

### Arvore de `prisma/migrations`

```text
MISSING prisma/migrations
```

Existe `prisma/manual_migrations`, mas essa pasta nao e a pasta padrao usada por Prisma Migrate:

```text
prisma\manual_migrations\20260606_add_terms_acceptance.sql
prisma\manual_migrations\20260622_add_cognitive_run_audits.sql
prisma\manual_migrations\20260626_add_active_topics.sql
prisma\manual_migrations\20260626_add_destiny_cognitive_visibility.sql
prisma\manual_migrations\20260628_add_cognitive_foundation_user_graph.rollback.sql
prisma\manual_migrations\20260628_add_cognitive_foundation_user_graph.sql
prisma\manual_migrations\20260628_add_multi_persona_collective_sessions.rollback.sql
prisma\manual_migrations\20260628_add_multi_persona_collective_sessions.sql
prisma\manual_migrations\20260629_add_thread_persona_presence_muting.rollback.sql
prisma\manual_migrations\20260629_add_thread_persona_presence_muting.sql
```

### Scripts do `package.json` relacionados a build, Prisma e migrations

```text
build: next build
postinstall: prisma generate
```

Nao ha script nomeado para `migrate`, `migration`, `prisma migrate` ou similar.

## 4. Rotas que realmente entregam respostas

Rotas de resposta encontradas:

- `app/api/chat/route.ts`: rota principal de chat persona. E chamada por `app/components/MedievalChat.tsx` via `api: '/api/chat'` e por `app/components/TestChat.tsx`.
- `app/api/chat/collective/route.ts`: rota de chat coletivo. E chamada por `app/components/MedievalChat.tsx` quando usa `/api/chat/collective`; delega para `createCollectiveChatStream`.
- `app/api/sovereign/pure-chat/route.ts`: rota de chat generalista do app `nexus-chat`. E chamada por `app/space/apps/nexus-chat/page.tsx` via `DefaultChatTransport({ api: "/api/sovereign/pure-chat" })`.

Conclusao: a rota que entrega as respostas da experiencia principal/persona e `POST /api/chat`. Ha tambem duas rotas paralelas de entrega: `POST /api/chat/collective` para multi-persona e `POST /api/sovereign/pure-chat` para chat generalista.

## 5. Cognitive runtime e promotion gate

### `POST /api/chat`

Sim, a rota chama o cognitive runtime, mas condicionalmente.

- Cria `cognitiveRequest`.
- Le `readCognitiveRuntimeConfig()`.
- Se `runtimeConfig.mode === "enforce"`, chama `executeCognitiveRuntime(cognitiveRequest)` e entrega a resposta promovida pelo runtime.
- Se `runtimeConfig.mode === "shadow"`, chama `runCognitiveRuntime(...)` depois da resposta ja selecionada/entregue, como auditoria sombra.
- Se o modo estiver `off`, nao usa o cognitive runtime para governar a entrega.

Configuracao local observada:

- `.env` contem `DATABASE_URL` e `DIRECT_URL`.
- Nao foi encontrada variavel local `NEMOSINE_COGNITIVE_RUNTIME_MODE`.
- Em `app/lib/nemosine/cognitive-runtime/config.ts`, o default de `parseMode` e `"off"`.

Portanto, nesta baseline local, salvo variaveis externas de ambiente, o cognitive runtime fica `off` por padrao.

### Rotas/caminhos que contornam o promotion gate

Sim, existem caminhos que entregam resposta sem passar pelo `app/lib/nemosine/cognitive-runtime/promotion-gate.ts`.

1. `POST /api/sovereign/pure-chat`
   - Usa `streamText`.
   - Nao importa nem chama cognitive runtime.
   - O system prompt diz explicitamente: `Nao interprete este chat como uma persona do Sistema Nemosine.`
   - Contorna o promotion gate por desenho, mas parece ser chat generalista paralelo, nao a rota persona principal.

2. `POST /api/chat/collective`
   - Delega para `createCollectiveChatStream`.
   - `app/lib/nemosine/collective_chat_orchestrator.ts` chama `generateText`.
   - Nao foi encontrada chamada a `runCognitiveRuntime`, `executeCognitiveRuntime` ou `promotion-gate` nessa rota/orquestrador.
   - Ha observacao de cognitive foundation, mas nao enforcement do cognitive runtime promotion gate.

3. `POST /api/chat` em trilhas nao-enforce
   - Se `responsePipelineConfig.mode === "enforce"`, a resposta passa pelo pipeline v2, mas nao pelo promotion gate do cognitive runtime; o runtime so roda em `shadow` depois, se configurado.
   - Se `runtimeConfig.mode === "shadow"`, a resposta legacy e entregue antes da auditoria sombra.
   - Se `runtimeConfig.mode === "off"`, a trilha legacy usa `generateText` + avaliacao de persona initiative/fallback, mas nao o promotion gate cognitivo.
   - Ha ainda um retorno antecipado para `conversationNavigationAnswer` antes da etapa de runtime/pipeline, entregue via `createPromotedUIMessageStreamResponse`.

## 6. Diagnosticos executados

Observacao: no PowerShell, `npx prisma migrate status` primeiro falhou porque `npx.ps1` esta bloqueado pela Execution Policy. A execucao diagnostica equivalente foi repetida com `npx.cmd`, sem alterar arquivos.

### `npx prisma migrate status`

Comando executado efetivo: `npx.cmd prisma migrate status`

Resultado: falha.

Saida completa observada:

```text
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "postgres", schema "public" at "aws-1-us-east-1.pooler.supabase.com:5432"
Error: Schema engine error:

npm notice
npm notice New major version of npm available! 10.9.3 -> 12.0.1
npm notice Changelog: https://github.com/npm/cli/releases/tag/v12.0.1
npm notice To update run: npm install -g npm@12.0.1
npm notice
```

Codigo Prisma `Pxxxx`: nenhum codigo `Pxxxx` foi emitido na saida de `migrate status`. O erro Prisma completo disponivel e exatamente `Error: Schema engine error:` sem detalhe adicional.

### `npx prisma validate`

Comando executado efetivo: `npx.cmd prisma validate`

Resultado: sucesso.

Saida completa observada:

```text
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
The schema at prisma\schema.prisma is valid 🚀
npm notice
npm notice New major version of npm available! 10.9.3 -> 12.0.1
npm notice Changelog: https://github.com/npm/cli/releases/tag/v12.0.1
npm notice To update run: npm install -g npm@12.0.1
npm notice
```

### `npm run build`

Comando executado: `npm.cmd run build`

Resultado: falha apos compilar.

Saida completa observada:

```text
> nextjs@0.1.0 build
> next build

   ▲ Next.js 15.1.9
   - Environments: .env.local, .env

   Creating an optimized production build ...
 ✓ Compiled successfully
   Linting and checking validity of types ...
   Collecting page data ...
[Error [PageNotFoundError]: Cannot find module for page: /api/admin/cognitive-foundation] {
  code: 'ENOENT'
}

> Build error occurred
[Error: Failed to collect page data for /api/admin/cognitive-foundation] {
  type: 'Error'
}
```

## 7. Migrations pendentes e divergencias

### Migrations pendentes

Nao foi possivel determinar as migrations pendentes via Prisma Migrate, porque:

- `prisma/migrations` nao existe no checkout atual.
- `npx.cmd prisma migrate status` falhou com `Error: Schema engine error:` antes de listar migrations aplicadas/pendentes.
- As SQLs existentes ficam em `prisma/manual_migrations`, que Prisma Migrate nao usa como historico padrao.

Assim, a lista de pendencias reais no banco esta indeterminada nesta baseline. Nenhuma migration pendente foi retornada pela ferramenta.

### Divergencias entre schema, migrations e banco

1. Divergencia estrutural local: `prisma/schema.prisma` existe e valida, mas `prisma/migrations` nao existe. Isso impede rastreabilidade normal por Prisma Migrate.

2. Divergencia schema vs manual migration:
   - `prisma/manual_migrations/20260629_add_thread_persona_presence_muting.sql` adiciona coluna `"muted"` em `"ThreadPersonaPresence"` e indice `"ThreadPersonaPresence_threadId_active_muted_idx"`.
   - `prisma/schema.prisma` define `ThreadPersonaPresence` sem campo `muted`.

3. Divergencia schema vs manual SQL/raw store:
   - `prisma/manual_migrations/20260626_add_destiny_cognitive_visibility.sql` altera/cria estruturas `sovereign_destiny_events` e `sovereign_destiny_context_index`.
   - Essas estruturas nao aparecem como models no `prisma/schema.prisma`.
   - Pode ser intencional se forem usadas por store SQL manual, mas e divergencia em relacao ao schema Prisma.

4. Banco real nao introspectado:
   - Como `migrate status` falhou no schema engine, nao houve confirmacao de quais tabelas/colunas existem no banco Supabase alvo.
   - Portanto nao da para afirmar, nesta baseline, se as manual migrations foram aplicadas ou nao no banco.

5. Arquivo local extra:
   - Existe `prisma/dev.db`, mas o datasource do schema e PostgreSQL. Esse arquivo nao participa do datasource declarado.

## 8. Observacoes finais

- O repositorio legado `nemosine-08-Runtime` foi ignorado conforme solicitado.
- Nenhuma correcao foi feita.
- Nenhum arquivo de codigo foi alterado.
- A falha de build atual e `Cannot find module for page: /api/admin/cognitive-foundation` durante `Collecting page data`, apesar de a compilacao inicial passar.
