# Auditoria Fundacao Cognitiva e Runtime V2

## 1. Estado atual da branch

- Branch: `repair/persona-routing-reset`
- SHA auditado: `7cf77ebb09f080707db3f82128474d19ad15481c`
- Working tree antes deste relatorio: limpo (`git status --short --branch` retornou apenas a branch)
- Data: 2026-07-17
- Restricoes observadas: nenhum codigo funcional alterado, nenhuma migration rodada, nenhum deploy, nenhum Preview, nenhuma variavel Vercel alterada.

## 2. Tabela consolidada dos modulos

| Modulo | Variavel | Valores aceitos | Default | Arquivo parser | Ligado ao chat real? | Banco | Migration | Testes | Estado real |
|---|---|---|---|---|---|---|---|---|---|
| User Graph | `USER_GRAPH_MODE` no parser; painel mostra `COGNITIVE_USER_GRAPH_MODE` | `off`, `shadow`, `enforce` | `off` | `app/lib/nemosine/cognitive-foundation/config.ts:38-45` | Parcial: `observeCognitiveFoundationResponse` roda no chat/coletivo; User Graph em si nao grava nos nodes | `UserProfileNode`, `UserProfileEvidence`, `CognitiveFoundationAudit` | `prisma/migrations/202607150002_ocv_foundation_additive` | unitarios em `tests/cognitive-foundation/foundation-unit.test.js` | PARCIAL |
| Memory Extractor | `MEMORY_EXTRACTOR_MODE`; painel mostra `COGNITIVE_MEMORY_EXTRACTOR_MODE` | `off`, `shadow`, `enforce` | `off` | `config.ts:38-45` | Sim, como observacao pos-resposta em `/api/chat` e coletivo | grava somente `CognitiveFoundationAudit`; nao grava `UserProfileNode` | mesma migration foundation | unitarios; nao ha integracao de persistencia em perfil | PARCIAL |
| Depth Gate | `DEPTH_GATE_MODE`; painel mostra `COGNITIVE_DEPTH_GATE_MODE` | `off`, `shadow`, `enforce` | `off` | `config.ts:38-45` | Sim, como auditoria pos-resposta; nao governa entrega | `CognitiveFoundationAudit` | mesma migration foundation | unitarios | PARCIAL |
| Persona Projection | `PERSONA_PROJECTION_MODE`; painel mostra `COGNITIVE_PERSONA_PROJECTION_MODE` | `off`, `shadow`, `enforce` | `off` | `config.ts:38-45` | Sim, no prompt assembler; `shadow` le/mede, `enforce` injeta no prompt | le `UserProfileNode`; audita em `CognitiveFoundationAudit` | mesma migration foundation | unitarios de projecao | PARCIAL |
| Onboarding V2 | `ONBOARDING_V2_MODE`; painel mostra `COGNITIVE_ONBOARDING_V2_MODE` | `off`, `internal`, `opt_in`, `public` | `off` | `config.ts:26-30,38-45` | Nao ligado ao chat real; rota propria | nenhum write; retorna `persisted:false` | tabelas foundation existem, mas rota nao persiste nelas | unitarios e rota sem teste de fluxo real | SCAFFOLDING |
| Web Enrichment | `WEB_ENRICHMENT_MODE`; painel mostra `COGNITIVE_WEB_ENRICHMENT_MODE` | `off`, `internal`, `opt_in` | `off` | `config.ts:32-36,38-45` | Nao ligado ao chat real; rota propria | nenhum write; retorna `persisted:false` | tabelas foundation existem, mas rota nao persiste nelas | unitarios; confirma sem rede real | SCAFFOLDING |

Observacao critica: o painel da Sala de Maquinas exibe nomes `COGNITIVE_*`, mas o parser le nomes sem prefixo (`USER_GRAPH_MODE`, `MEMORY_EXTRACTOR_MODE`, etc.). Isso pode levar o administrador a configurar variaveis que o runtime nao le.

## 3. User Graph

Fluxo de entrada encontrado:

```text
UserProfileNode existente no banco
  -> getUserProfileNodesForProjection()
  -> buildPersonaContextProjection()
  -> assemblePersonaContext()
  -> prompt somente se PERSONA_PROJECTION_MODE=enforce
```

Evidencia:

- `getUserProfileNodesForProjection` faz `SELECT ... FROM "UserProfileNode"` e filtra `status IN ('CANDIDATE', 'CONFIRMED')` em `user_graph_store.ts:44-79`.
- `assemblePersonaContext` le a config em `persona_context_assembler.ts:545`, busca nodes se `personaProjectionMode` estiver ativo em `661-663`, mas so renderiza no prompt quando `personaProjectionMode === "enforce"` em `669-670`.
- `observeCognitiveFoundationResponse` tambem chama a projecao para auditar em `audit.ts:140-159`.

Le:

- `UserProfileNode`.

Grava:

- Nao encontrei escrita em `UserProfileNode` ou `UserProfileEvidence` no codigo funcional atual.
- O que existe e escrita em `CognitiveFoundationAudit`.

Tabelas:

- `UserProfileNode`, `UserProfileEvidence`, `CognitiveFoundationAudit` em `prisma/schema.prisma:291-365`.

Riscos:

- Ativar `PERSONA_PROJECTION_MODE=enforce` sem nodes revisados pode injetar candidatos ainda nao confirmados, pois `privacy.ts:21-22` considera `CONFIRMED` e `CANDIDATE` projetaveis.
- `getUserProfileNodesForProjection` engole erro e retorna `[]` em `user_graph_store.ts:80-82`, o que pode mascarar falha de schema/banco.

Modo seguro de teste:

- Primeiro corrigir a divergencia de nomes de env em Preview.
- Usar `PERSONA_PROJECTION_MODE=shadow` com rows seedadas manualmente em ambiente de Preview, observando apenas contagens e bloqueios.
- So depois testar `enforce` com um usuario de teste e nodes `CONFIRMED`.

## 4. Memory Extractor

Fluxo real:

```text
/api/chat ou coletivo entrega resposta
  -> observeCognitiveFoundationResponse()
  -> extractMemoryCandidates(userText)
  -> storeCognitiveFoundationAudit(feature="memory-extractor")
```

Evidencia:

- `/api/chat` chama `observeCognitiveFoundationResponse` apos entrega em `app/api/chat/route.ts:847`, `1059` e `1282`.
- Coletivo chama em `collective_chat_orchestrator.ts:889-899`.
- O extrator cria candidato em memoria local com `status:"CANDIDATE"`, `requiresConfirmation:true`, `shouldPersistAutomatically:false` em `memory_candidate_extractor.ts:115-146`.
- `observeCognitiveFoundationResponse` grava apenas audit com `persistedAutomatically:false` em `audit.ts:123-137`.

Le:

- `userText`, `personaId`, `memoryScope`, `threadId`.

Grava:

- `CognitiveFoundationAudit`.
- Nao grava `UserProfileNode`.

Tabelas:

- `CognitiveFoundationAudit`.
- `UserProfileNode`/`UserProfileEvidence` estao preparadas, mas nao usadas para escrita pelo extrator.

Riscos:

- O modo `enforce` para Memory Extractor nao tem comportamento de enforce real; continua apenas extraindo/auditando candidato sem persistir.
- Se `USER_GRAPH_MODE` estiver ativo mas `MEMORY_EXTRACTOR_MODE=off`, o codigo ainda executa extração por causa de `if (memoryExtractorMode active || userGraphMode active)`, mas registra `mode: config.memoryExtractorMode`, possivelmente `off` (`audit.ts:114-127`).

Modo seguro:

- `MEMORY_EXTRACTOR_MODE=shadow` em Preview, medindo `candidateCount`, `skipReason`, `findingCodes`.
- Nao usar `enforce` antes de existir pipeline de confirmacao/persistencia.

## 5. Persona Projection

Fluxo real:

```text
buildSystemPromptAssembly()
  -> assemblePersonaContext()
  -> readCognitiveFoundationConfig()
  -> getUserProfileNodesForProjection() se shadow/enforce
  -> buildPersonaContextProjection()
  -> renderPersonaContextProjection() somente em enforce
```

Evidencia:

- `buildSystemPromptAssembly` chama `assemblePersonaContext` em `llm_client.ts:73-86`.
- O prompt inclui a secao `"PROJECAO VOCACIONAL DO USER GRAPH"` em `persona_context_assembler.ts:707-708`.
- Essa secao fica vazia em `shadow`, pois `userGraphProjectionText` so e renderizado se `personaProjectionMode === "enforce"` em `669-670`.

Le:

- `UserProfileNode`.

Grava:

- `CognitiveFoundationAudit` quando `observeCognitiveFoundationResponse` roda.

Tabelas:

- `UserProfileNode`, `CognitiveFoundationAudit`.

Riscos:

- Mistura `CANDIDATE` e `CONFIRMED` como projectable.
- Pode alterar voz/resposta ao injetar contexto em `enforce`.
- Nao ha teste de integracao do prompt real validando vazamento/efeito em resposta final.

Modo seguro:

- `PERSONA_PROJECTION_MODE=shadow` primeiro.
- Seed controlado com nodes publicos e confirmados.
- Depois `enforce` limitado a um usuario/persona de teste.

## 6. Depth Gate

Fluxo real:

```text
resposta ja entregue/persistida
  -> observeCognitiveFoundationResponse()
  -> evaluateDepthGate(userText,responseText)
  -> storeCognitiveFoundationAudit(feature="depth-gate")
```

Evidencia:

- `evaluateDepthGate` classifica demanda e calcula score em `depth_gate.ts:150-219`.
- `observeCognitiveFoundationResponse` grava metrics e `shouldRegenerate` em `audit.ts:162-188`.

Le:

- `userText`, `responseText`, `personaId`, `participantCount`.

Grava:

- `CognitiveFoundationAudit`.

Interfere na entrega:

- Nao. Apesar de aceitar `enforce`, nao encontrei chamada que use `shouldRegenerate` para bloquear, regenerar ou alterar resposta.

Riscos:

- O nome `enforce` e enganoso no estado atual: e auditoria pos-resposta, nao controle operacional.
- Pode parecer uma segunda camada de gate, mas nao governa `/api/chat`.

Modo seguro:

- `DEPTH_GATE_MODE=shadow` ou `enforce` sao operacionalmente equivalentes quanto a entrega; ainda assim usar `shadow` para evitar falsa expectativa.

## 7. Onboarding V2

Fluxo real:

```text
POST /api/onboarding-v2
  -> readCognitiveFoundationConfig()
  -> isOnboardingV2Active()
  -> buildOnboardingV2Mirror()
  -> retorna mirror, persisted:false
```

Evidencia:

- Rota em `app/api/onboarding-v2/route.ts:20-51`.
- Ativacao por `isOnboardingV2Active` em `route.ts:24-29`.
- `buildOnboardingV2Mirror` gera candidatos em memoria e marca `shouldPersistAutomatically:false` em `onboarding_v2.ts:48-111`.

Le:

- Body do endpoint: `entryReason`, `timelineEvents`, `choicesUnderTension`, `freeReport`, `optionalImports`, `personaAccess`.

Grava:

- Nada. A rota retorna `persisted:false`.

Interfere no chat:

- Nao encontrei conexao com `/api/chat` nem com rota coletiva.

Riscos:

- Pode ser apresentado como modulo pronto, mas hoje e espelho local de revisao.
- Sem persistencia e sem UI/fluxo comprovado na cadeia principal.

Modo seguro:

- `ONBOARDING_V2_MODE=internal` em Preview, chamando a rota manualmente com usuario de teste.

## 8. Web Enrichment

Fluxo real:

```text
POST /api/public-enrichment
  -> readCognitiveFoundationConfig()
  -> isWebEnrichmentActive()
  -> buildPublicEnrichmentPlan()
  -> retorna plano, networkFetchPerformed:false, persisted:false
```

Evidencia:

- Rota em `app/api/public-enrichment/route.ts:20-50`.
- `buildPublicEnrichmentPlan` nunca faz busca externa e retorna `searchPerformed:false` em `public_enrichment.ts:41-128`.
- Teste confirma que nao realiza network search em `tests/cognitive-foundation/foundation-unit.test.js:184-204`.

Le:

- Consentimento, links, dominios autorizados e identificadores fornecidos no body.

Grava:

- Nada.

Interfere no chat:

- Nao.

Riscos:

- Nome sugere enriquecimento web real; implementacao atual e apenas plano seguro/review-only.
- Requer UI, consentimento, auditoria e persistencia antes de entrar no runtime.

Modo seguro:

- `WEB_ENRICHMENT_MODE=opt_in` em Preview apenas para testar resposta do endpoint. Nao esperar busca externa.

## 9. Cadeia real do runtime

Fluxo principal `/api/chat` encontrado:

```text
Mensagem do usuario
  -> extracao pureUserText / presenca
  -> createCognitiveRequest
  -> se NEMOSINE_COGNITIVE_RUNTIME_MODE=enforce:
       executeCognitiveRuntime()
       -> candidato
       -> OCV
       -> persistencia
       -> observeCognitiveFoundationResponse()
  -> senao response pipeline / legado
       -> entrega
       -> observeCognitiveFoundationResponse()

assemblePersonaContext()
  -> memoria/episodios/fontes/ActiveTopic/Destiny
  -> se PERSONA_PROJECTION_MODE=shadow/enforce: le UserProfileNode
  -> se PERSONA_PROJECTION_MODE=enforce: injeta projeção no prompt
```

Fluxo coletivo:

```text
Rodada coletiva
  -> buildSystemPromptAssembly()
  -> geracao candidata por participante
  -> runtime cognitivo se enforce/shadow
  -> persistencia de fala/persona ou falha
  -> observeCognitiveFoundationResponse()
```

Onde entram os modulos:

- Memory Extractor: depois da entrega, apenas audit.
- Depth Gate: depois da entrega, apenas audit.
- Persona Projection: antes da geracao, dentro do assembler; so interfere no prompt em `enforce`.
- User Graph: banco/leitura para projection; sem writer funcional localizado.
- Onboarding V2: rota independente.
- Web Enrichment: rota independente.

## 10. Divergencias da Sala de Maquinas

1. Nomes de variaveis exibidos nao correspondem ao parser.
   - Painel: `COGNITIVE_USER_GRAPH_MODE`, `COGNITIVE_MEMORY_EXTRACTOR_MODE`, etc. (`SalaDeMaquinasClient.tsx:299-338`).
   - Parser: `USER_GRAPH_MODE`, `MEMORY_EXTRACTOR_MODE`, etc. (`config.ts:38-45`).

2. O painel aceita conceitualmente `on` como ativo em `foundationStateLabel` (`SalaDeMaquinasClient.tsx:344-350`), mas nenhum parser aceita `on`.

3. "Banco pronto" e "Dependencias satisfeitas" sao globais por `migrationReady`; isso nao prova que cada modulo tenha pipeline funcional completo.

4. "Testes: unitarios/parciais" e correto, mas poderia induzir a achar que ha integracao de chat. Para Onboarding V2 e Web Enrichment nao ha integracao com chat.

5. `enforce` na fundacao nao significa enforcement uniforme:
   - Depth Gate nao bloqueia entrega.
   - Memory Extractor nao persiste perfil.
   - Persona Projection altera prompt somente em `PERSONA_PROJECTION_MODE=enforce`.

## 11. Plano seguro de ativacao

| Fase | Variavel | Valor | Resultado esperado | Metrica | Rollback |
|---|---|---|---|---|---|
| Fase 0 observabilidade | nenhuma | manter `off` | painel e docs corrigidos antes de ativar | divergencia env resolvida | manter off |
| Fase 1 Shadow Preview | `MEMORY_EXTRACTOR_MODE`, `DEPTH_GATE_MODE`, `PERSONA_PROJECTION_MODE` | `shadow` | audits metadata-only, sem mudar fala | contagem `CognitiveFoundationAudit`, findingCodes, erros | voltar `off` se erros/latencia |
| Fase 2 escrita controlada | futuro writer de User Graph | flag nova/review-only | candidatos confirmaveis, nao auto-persistidos | taxa de confirmacao/rejeicao | desligar writer |
| Fase 3 projecao auditavel | `PERSONA_PROJECTION_MODE` | `shadow` com nodes confirmados | comparar projection summary com prompt vazio | blockedCount, core/vocational count | voltar `off` |
| Fase 4 enforce limitado | `PERSONA_PROJECTION_MODE` | `enforce` em Preview/usuario teste | secao User Graph entra no prompt | qualidade OCV, ausencia de vazamento | voltar `shadow/off` |
| Fase 5 producao | mesmas variaveis | progressivo | ativacao por modulo, nao em bloco | regressao de chat, Sala de Maquinas, audits | rollback env + commit se necessario |

Nao alterar nenhuma variavel nesta auditoria.

## 12. Fronteira do Runtime de Personas V2

### Preservar

- OCV como auditor/promotor da candidata, especialmente Scientist/Vigia/Filosofo e persistencia governada.
- `assemblePersonaContext` como ponto unico de montagem de contexto, mas com fronteiras mais claras.
- `ActiveTopic`, episodios, memorias existentes e Destiny context como fontes de contexto.
- `CognitiveFoundationAudit` como trilha metadata-only.
- `pureUserText` e separacao de eventos estruturados.

### Isolar

- Recovery/fallback de runtime: deve continuar como evento de sistema, nunca voz/avatar de persona.
- Depth Gate da fundacao: manter fora da decisao operacional ate ser integrado ao OCV ou ao Runtime V2 com contrato claro.
- Memory Extractor: manter como candidato/review-only ate existir confirmacao e writer seguro.
- Persona Projection: isolar da voz; projection deve ser contexto interno rastreavel, nao texto visivel.

### Substituir

- Qualquer mecanismo que use `enforce` apenas como rotulo sem enforcement real.
- Roteamentos paralelos que possam gerar autoridade conflitante.
- Fallbacks que escrevam fala fabricada de persona.
- Pipeline de User Graph incompleto: falta writer/confirmacao/estado/reversao para `UserProfileNode` e `UserProfileEvidence`.

## 13. Proxima missao recomendada

Missao unica: corrigir a fronteira de configuracao e observabilidade da Fundacao Cognitiva.

Escopo:

- Alinhar nomes exibidos na Sala de Maquinas com nomes realmente lidos pelo parser, ou fazer o parser aceitar explicitamente os nomes `COGNITIVE_*` como alias documentado.
- Exibir valores aceitos e defaults por modulo.
- Deixar claro no painel: "shadow/enforce da fundacao nao governa a entrega, exceto Persona Projection em enforce injeta contexto".

Arquivos provaveis:

- `app/lib/nemosine/cognitive-foundation/config.ts`
- `app/admin/sala-de-maquinas/SalaDeMaquinasClient.tsx`
- `tests/cognitive-foundation/foundation-unit.test.js`
- `tests/admin-engine-room/ui.test.js`

Testes:

- Parser aceita/recusa valores esperados.
- Painel mostra a variavel real e os valores aceitos.
- Teste de divergencia: env `COGNITIVE_*` nao deve aparecer como unica instrucao se parser nao o le.

Criterios de aceite:

- Nao ha divergencia entre painel e parser.
- Defaults `off` visiveis.
- `on` nao aparece como modo aceito se nao for aceito pelo parser.
- Nenhum modulo e ativado por essa mudanca.

Riscos:

- Se optar por alias `COGNITIVE_*`, risco de mudar ativacao em ambientes que ja possuem essas variaveis configuradas. Preferivel primeiro apenas corrigir painel/documentacao ou adicionar alias com precedencia explicita e teste.

Estimativa:

- Pequena, 1 a 2 horas com testes focados.

## Validacao final

Comandos executados:

- `git status --short --branch`
- `git rev-parse HEAD`
- buscas `rg` e leituras de arquivos
- `npm.cmd run test:cognitive-foundation`

Resultado do teste:

- `test:cognitive-foundation`: 8/8 testes passaram.

Confirmacoes:

- Nenhum codigo funcional foi alterado.
- Nenhuma migration foi executada.
- Nenhuma variavel Vercel foi alterada.
- Nenhum deploy ou Preview foi realizado.
- Unico arquivo criado nesta missao: `AUDITORIA_FUNDACAO_COGNITIVA_E_RUNTIME_V2.md`.
