# Persona Initiative Current Flow

Data: 2026-06-25
Branch de trabalho: `codex/global-persona-initiative-runtime`

## Fluxo real antes da correcao

1. A rota de producao do chat e `app/api/chat/route.ts`.
2. A rota autenticava o usuario, criava ou carregava a thread, persistia a mensagem do usuario e chamava `buildSystemPromptAssembly`.
3. `buildSystemPromptAssembly` delegava para `persona_context_assembler.ts`.
4. O assembler resolvia prompt nativo, contrato funcional, memorias, episodios, fontes persistentes, agenda, registros e Linha do Destino.
5. A rota chamava `streamText` diretamente pelo gateway de modelo configurado.
6. A resposta visivel era transmitida token a token antes de qualquer avaliacao comportamental deterministica.
7. O `onFinish` removia tags `[MEMORY]`, `[REGISTRY]` e `[DESTINY]` somente depois da transmissao e persistia a versao limpa na thread.
8. O cognitive runtime existia em `app/lib/nemosine/cognitive-runtime`, mas nao estava no caminho padrao da resposta visivel.

## Estado do cognitive runtime

Variaveis relevantes:

- `NEMOSINE_COGNITIVE_RUNTIME_MODE`: `off`, `shadow` ou `enforce`; default real em `config.ts` e `off`.
- `NEMOSINE_COHERENCE_THRESHOLD`: limiar do Vigia, default `0.8`.
- `NEMOSINE_COGNITIVE_MAX_RETRIES`: tentativas adicionais, default `2`.
- `NEMOSINE_DOUBLE_VIGILANCE`: liga avaliacao Philosopher estruturada, default `true`.
- `NEMOSINE_COGNITIVE_AUDIT`: liga auditoria redigida, default `true`.
- `NEMOSINE_COGNITIVE_EXECUTION_PROFILE`: `light`, `standard` ou `full`, default `standard`.

Antes desta tarefa, mesmo com runtime disponivel, `/api/chat` nao chamava `executeCognitiveRuntime` para a entrega normal. O modo efetivo do chat de producao era pipeline legado direto.

## Fontes de contexto carregadas

O assembler legado carregava:

- memorias por `getRelevantUserMemories`;
- episodios por `getRelevantConversationEpisodes`;
- fontes persistentes por `getVisibleUserSources`;
- agenda por `getAgendaEvents`;
- registros por `getUserRegistros`;
- Linha do Destino por `getDestinyEvents`;
- lugar ativo via `buildPlaceContext`;
- prompt nativo via `getNativePersonaPromptRecord`.

O problema nao era ausencia total de contexto. O problema principal era selecao e uso: entradas como `bom dia` davam pouco sinal lexical, entao o ranking anterior dependia de termos do pedido e hints do contrato, sem um retrato explicito de frentes ativas nem regra executavel para iniciar operando.

## Privacidade observada

`session_store.ts` ja separava memorias e episodios privados:

- espacos privados: `Confessor 2.0` e `Porao`;
- personas publicas nao recebem memorias/threads desses espacos;
- execucoes privadas podem ver apenas o proprio escopo privado e memorias compartilhadas permitidas.

O runtime tambem tinha `authorizeContextItems`, mas como a rota direta o contornava, a protecao relevante para o chat era a filtragem do `session_store` e do assembler.

## Contratos e prompt nativo

O prompt nativo era resolvido corretamente quando havia registro em `nativePersonaPrompts`; caso contrario, caia para `ENTITIES`.

Antes desta tarefa, o Comandante nao tinha contrato especifico proprio em `persona_behavior_contracts.ts`; ele herdava o contrato familiar estrategico. Isso explicava parte do defeito sentinela: havia regra anti-SAC global, mas faltava contrato executavel de comando para apreciar situacao, hierarquizar e emitir direcao antes de perguntar.

## Fluxo novo implementado

1. `classifyConversationInputRichness` classifica entradas de baixa, media ou alta informacao sem LLM adicional.
2. Entradas pobres acionam recuperacao contextual mais ampla e limitada, usando fontes ja existentes.
3. `buildActiveFrontSnapshot` produz frentes candidatas e selecionadas por recencia, urgencia, pendencia, continuidade e relevancia vocacional.
4. `buildPersonaInitiativeBrief` gera brief interno oculto com fatos aterrados, tensoes inferidas, intervencao selecionada, limite de perguntas e substancia obrigatoria.
5. O assembler legado injeta esse controle interno no system prompt.
6. O `context-envelope` do runtime tambem injeta o mesmo controle como item `system:persona-initiative`.
7. `/api/chat` agora usa geracao bufferizada com `generateText`, remove tags invisiveis antes da avaliacao e roda `evaluatePersonaInitiativeQuality` antes de entregar.
8. Candidatos com findings reparaveis sao rejeitados antes da entrega e recebem repair feedback interno.
9. Se os reparos esgotarem, a rota entrega fallback deterministico baseado no brief, sem transmitir candidatos rejeitados.
10. Em `NEMOSINE_COGNITIVE_RUNTIME_MODE=enforce`, a rota usa `executeCognitiveRuntime`.
11. Em `shadow`, a rota entrega pelo caminho bufferizado e audita o candidato promovido via runtime sem duplicar mensagem.

## Onde contexto era perdido ou reduzido

- Mensagens curtas ficavam dependentes de coincidencia lexical.
- Nao havia snapshot de continuidade ativa.
- Nao havia brief interno com decisao vocacional antes da geracao.
- As regras antiassistente chegavam ao prompt, mas nao havia avaliador deterministico bloqueando a resposta visivel.
- A transmissao por streaming acontecia antes de qualquer validacao final.

## Resultado arquitetural

A correcao nao troca prompts nativos nem muda taxonomia. Ela adiciona uma camada executavel compartilhada entre assembler legado, context-envelope, runtime e API real de chat.
