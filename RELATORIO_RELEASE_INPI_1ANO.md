# Release Nemosine - Edicao de 1 Ano

## 1. Base escolhida

- Branch de release: `release/inpi-1ano-20260720`
- Base escolhida: `origin/repair/runtime-integrity-direct-2`
- SHA base: `9ef1f1b2c6614906a21021bbccae0d359d0c97cb`
- Projeto Vercel ligado: `nemosine-04-vs-code` (`prj_mIRUVo0SyklEq5NY5GFbsU0DZz9M`)

Justificativa: esta base descende de `repair/persona-routing-reset` e acrescenta reparos diretamente relevantes para demonstracao: auth de Preview, roteamento de fala direta, fechamento de mensagens coletivas orfas, compartilhamento saneado e wrappers de integridade do runtime.

Branches rejeitadas:

| Branch | Motivo |
|---|---|
| `main` | Base mais antiga, sem OCV, Sala de Maquinas, Ajuste de Presenca e reparos recentes do percurso. |
| `repair/persona-routing-reset` | Boa base de reset vocacional, mas sem reparos posteriores de Preview/auth/share/runtime direct. |
| `repair/runtime-integrity-direct` | Contem reparos importantes, mas foi sucedida por `repair/runtime-integrity-direct-2`. |
| `codex/*` e checkpoints | Uteis como historico, mas misturam objetivos experimentais ou snapshots anteriores. |

Matriz de avaliacao da base escolhida:

| Criterio | Resultado |
|---|---|
| Build | Verde em `npm.cmd run build`. |
| Login | Codigo preservado; Preview ainda exige smoke autenticado. |
| Chat individual | Fluxo principal preservado; OCV forcado para observacao no Preview da release. |
| Ajuste de Presenca | Testes verdes em `test:presence-adjustment`; titulo ignora payload tecnico. |
| Titulo da thread | Testes multi-persona cobrem reparo de titulo contra payload de presenca/handoff. |
| Memorias Recentes | Codigo preservado; teste manual autenticado ainda pendente. |
| Compartilhamento saneado | Sanitizador reforcado e teste de release criado. |
| Mensagens PENDING | Coletivo possui cleanup de mensagens orfas; testes multi-persona verdes. |
| OCV interfere na entrega? | No Preview desta branch, modo efetivo vira `shadow`; audita sem governar entrega. |
| Conversa coletiva visivel? | Preservada, mas classificada como experimental para a demonstracao. |
| Falhas conhecidas | Smoke real autenticado ainda necessario para login, banco, chat com LLM e link compartilhado. |

## 2. Escopo da release

### Incluido

- Login existente sem reescrita.
- Castelo, Personas, Memorias Recentes, Sala de Maquinas e chat individual.
- Ajuste de Presenca preservado.
- Compartilhamento com saneamento reforcado.
- OCV observacional no Preview da branch de release.
- Fundacao Cognitiva desativada no Preview da branch de release.

### Experimental/oculto

- Conversa coletiva.
- Convites verbais/menu.
- Handoff automatico.
- Selecao multipla de falantes.
- Fundacao Cognitiva.
- Web Enrichment.
- Onboarding V2.
- Runtime em `enforce`.

### Preservado no codigo

As implementacoes experimentais permanecem no codigo. A release apenas isola o impacto por configuracao da branch/Preview e rotulagem honesta.

## 3. Configuracao do OCV

- Variavel real do runtime: `NEMOSINE_COGNITIVE_RUNTIME_MODE`
- Valores aceitos: `off`, `shadow`, `enforce`
- Valor efetivo na release Preview: `shadow`
- Mecanismo: `isInpiOneYearReleasePreview()` detecta `VERCEL_ENV=preview` e `VERCEL_GIT_COMMIT_REF=release/inpi-1ano-20260720`.
- Efeito: OCV audita a resposta observada, mas nao substitui, nao bloqueia saudacoes e nao entrega recovery administrativo por findings de qualidade.
- Diferenca para producao: producao nao foi alterada; override nao se aplica com `VERCEL_ENV=production`.
- Auditoria preservada: `shadow` continua usando o runtime para observacao sem duplicar persistencia de resposta.

## 4. Fundacao Cognitiva

Estado da release: experimental e desativada no Preview desta branch.

Modulos:

| Modulo | Variavel real | Estado na release |
|---|---|---|
| User Graph | `USER_GRAPH_MODE` | `off` |
| Memory Extractor | `MEMORY_EXTRACTOR_MODE` | `off` |
| Depth Gate | `DEPTH_GATE_MODE` | `off` |
| Persona Projection | `PERSONA_PROJECTION_MODE` | `off` |
| Onboarding V2 | `ONBOARDING_V2_MODE` | `off` |
| Web Enrichment | `WEB_ENRICHMENT_MODE` | `off` |

Razao para nao ativacao: a Fundacao Cognitiva ainda e parcial; ha estrutura e auditoria, mas nao ha writer conversacional completo do User Graph, nem governanca madura de Depth Gate, nem enriquecimento externo real.

Divergencias corrigidas no painel:

- Sala de Maquinas deixou de exibir `COGNITIVE_*` como nomes principais.
- Painel agora mostra os nomes realmente lidos pelo parser.
- Painel informa que os modulos sao experimentais e permanecem desativados nesta edicao.
- `on` nao e mais tratado visualmente como modo ativo aceito.

## 5. Personas candidatas

Matriz automatizada/estatica:

| Persona | Cumprimento | Vocacao | Continuidade | Identidade | Falhas | Recomendada? |
|---|---|---|---|---|---|---|
| Mentor | Coberto por teste de greeting leve no runtime. | Contrato oficial presente. | Nao testado manualmente em 5 turnos. | Testes de identidade verdes. | Smoke real pendente. | Sim |
| Cientista | Testes cobrem saudacao e rejeicao de modo exploratorio generico. | Contrato oficial presente. | Nao testado manualmente em 5 turnos. | Testes de identidade verdes. | Smoke real pendente. | Sim |
| Psicologo | Teste cobre abertura contextual em cumprimento. | Contrato oficial presente. | Nao testado manualmente em 5 turnos. | Testes de identidade verdes. | Smoke real pendente. | Sim |
| Estrategista | Gate rejeita autorreparacao genrica/autonarrativa. | Contrato oficial presente. | Nao testado manualmente em 5 turnos. | Testes de identidade verdes. | Smoke real pendente. | Reserva |
| Astronomo | Testes cobrem saudacao com contexto longitudinal. | Contrato especifico presente. | Nao testado manualmente em 5 turnos. | Testes de iniciativa verdes. | Smoke real pendente. | Reserva |

Tres recomendadas para demonstracao inicial: Mentor, Cientista e Psicologo.

## 6. Percurso de demonstracao

1. Entrar no Preview pelo fluxo existente.
2. Abrir Personas.
3. Escolher Mentor, Cientista ou Psicologo.
4. Iniciar conversa.
5. Fazer ou pular Ajuste de Presenca.
6. Enviar: "Boa noite. Tudo bem?"
7. Fazer uma pergunta vocacional propria da persona.
8. Conversar por cinco turnos.
9. Alterar parcialmente o tema.
10. Abrir Memorias Recentes.
11. Retomar a conversa.
12. Compartilhar a conversa.
13. Abrir o link compartilhado e verificar ausencia de `[[NEMOSINE_`, `SYSTEM_EVENT`, prompts, hashes e politicas internas.
14. Visitar Sala de Maquinas.
15. Confirmar OCV observacional e Fundacao Cognitiva experimental/desativada.

## 7. Testes

Comandos executados:

| Comando | Resultado |
|---|---|
| `npm.cmd run test:release` | Verde, 3/3. |
| `npm.cmd run test:cognitive-foundation` | Verde, 9/9. |
| `npm.cmd run test:sala-de-maquinas` | Verde, 32/32. |
| `npm.cmd run test:cognitive-runtime` | Verde, 60/60 apos ajuste do promotion gate. |
| `npm.cmd run test:response-pipeline` | Verde, 9/9. |
| `npm.cmd run test:presence-adjustment` | Verde, 13/13. |
| `npm.cmd run test:multi-persona` | Verde, 26/26. |
| `npm.cmd run test:persona-identity` | Verde, 5/5. |
| `npm.cmd run test:persona-initiative` | Verde, 45/45 apos restringir degradacao de quality gate. |
| `npm.cmd run audit:cognitive-runtime` | Verde, `ok: true`. |
| `npx.cmd prisma validate` | Verde, schema valido. |
| `npm.cmd run build` | Verde, Next compilou 79 paginas. |

Falhas encontradas e corrigidas:

- Compartilhamento ainda carregava `messageKind: SYSTEM_EVENT` em evento publico preservado.
- Sanitizador antigo nao removia marcador `[[NEMOSINE_*]]` quando embutido em fala publica.
- Wrapper de delivery quality degradava findings genericos demais para `warning`.
- Promotion gate nao bloqueava findings de qualidade de persona `error/critical` antes da promocao.

Testes nao executados:

- Smoke autenticado real com Google/senha no Preview.
- Conversa real com LLM por cinco turnos.
- Verificacao real do banco em Preview apos deploy.

## 8. Preview

- URL: `https://nemosine-04-vs-code-5l75h8k9p-edersouzamelo-4267s-projects.vercel.app`
- Deployment ID: `dpl_BXtc3wDiFWkr9BJTMzqXyk71pVTC`
- Commit: `75514893ea7c78be8c965619aa7f32c3c46a9682`
- Autenticacao: usar o caminho ja funcional do ambiente, sem alteracao de segredos.
- Status: `Ready`, target `preview`.
- Smoke minimo executado:
  - `/`: `200 OK`
  - `/access`: `200 OK`
  - `/api/internal/preview-db-env`: `databaseReachable: true`, `directUrl: true`, host pooler Supabase redigido sem senha.
- Smoke autenticado: pendente com usuario logado.

## 9. Limitacoes conhecidas

- Esta release nao conclui a Fundacao Cognitiva.
- OCV fica observacional no Preview; `enforce` nao e objetivo desta edicao publica.
- Conversa coletiva, convites e handoff permanecem experimentais.
- A matriz de personas usa evidencia automatizada/local; ainda precisa do teste conversacional autenticado do usuario.
- Producao nao foi alterada.

## 10. Checklist de deploy em producao

Pronto:

- Build local verde.
- Testes automatizados relevantes verdes.
- Sala de Maquinas com informacao mais honesta.
- Compartilhamento saneado com teste dedicado.

Pendente:

- Smoke autenticado.
- Link compartilhado real de uma conversa de demonstracao.
- Chat individual real com LLM por cinco turnos.

Bloqueador para producao:

- Nao ha autorizacao expressa para deploy de producao nesta etapa.
- Smoke autenticado real ainda nao foi concluido.

Recomendacao:

- Usar Preview para a demonstracao interna e so promover para producao apos o usuario validar login, chat individual, memorias recentes, compartilhamento e Sala de Maquinas.
