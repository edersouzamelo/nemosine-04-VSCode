# Auditoria da pipeline das personas e correcao anti-SAC

## Escopo

Continuacao da correcao do motor cognitivo das personas. Nao foi refeita a auditoria dos prompts nativos do Drive.

## Auditoria da pipeline atual

- API/wrapper da rota principal de personas: `AI SDK streamText`.
- Provider: `@ai-sdk/openai`.
- Modelo em producao da rota `/api/chat`: `gpt-4o`.
- Temperature anterior: `0.7`.
- Temperature ajustada: `0.45`.
- Max output anterior: nao definido explicitamente.
- Max output ajustado na rota AI SDK: `maxOutputTokens: 2200`.
- Chamada legada direta em `generatePersonaResponse`: OpenAI Chat Completions SDK com `max_completion_tokens: 2200`.
- Presence penalty: nao definido.
- Frequency penalty: nao definido.
- Middleware que injeta prestatividade: nao foi encontrado na rota principal das personas.
- Rota separada com assistente generalista: `app/api/sovereign/pure-chat/route.ts`, mas ela nao e a rota das personas.
- AI SDK: recebe `system` como string unica e `messages` historicas. Nao ha evidencia de reformatacao indevida de roles na rota principal.
- Risco de prompt grande: existe. O prompt nativo integral pode ser muito grande e, se somado a doutrina extensa, pode soterrar regras operacionais. A correcao manteve doutrina global como resumo, nao massa textual.
- Risco de cordialidade padrao do modelo: existe. `gpt-4o` tende a completar com modo assistente cordial quando ha lacuna contextual, pedido aberto ou frase nativa como "estou aqui". A reducao de temperature e as regras anti-SAC reduzem esse risco.

## Recomendacao tecnica separada: Responses API

Nao foi feita migracao.

Possivel beneficio:

- melhor separacao conceitual entre instrucao, contexto e input;
- mais controle futuro sobre tracing e estrutura de chamada;
- possibilidade de evoluir para ferramenta/debug sem enfiar tudo em uma unica string system.

Riscos/esforco:

- demanda refatoracao da rota streaming;
- pode afetar UI de streaming atual;
- exige QA cuidadoso com historico, anexos, persistencia e tags `[MEMORY]`/`[REGISTRY]`;
- nao resolve sozinho a voz das personas se as regras comportamentais forem fracas.

Conclusao: manter AI SDK nesta fase foi a decisao segura.

## Correcoes aplicadas

### Regra anti-SAC

Adicionada em `app/lib/nemosine/persona_context_assembler.ts`, secao:

`[PROIBICAO DE MODO ASSISTENTE GENERICO]`

Ela proibe cordialidade generica, disponibilidade automatica e perguntas finais automaticas como:

- "Estou aqui para ajudar";
- "Como posso ajudar?";
- "O que gostaria de explorar?";
- "Qual desafio voce quer enfrentar agora?";
- "Caso precise de mais detalhes, estou a disposicao";
- recomendacao de analise sem entregar analise concreta.

### Regra anti-template visivel

Adicionada em `app/lib/nemosine/persona_context_assembler.ts`, secao:

`[PROIBICAO DE FORMULARIO VISIVEL PADRAO]`

Ela bloqueia cabecalhos repetitivos automaticos como:

- Verdade Essencial;
- Acao Concreta;
- Desafio;
- Pergunta Reflexiva;
- Auditoria Logica;
- Deteccao de Padrao Cognitivo;
- Autoobservacao Reflexiva;
- Sustentacao ou Necrose;
- Conclusao.

Esses formatos so devem aparecer se o usuario pedir estrutura formal.

### Regra anti-simulacao de saber/acesso

Adicionada em `app/lib/nemosine/persona_context_assembler.ts`, secao:

`[PROIBICAO DE SIMULACAO DE ACESSO OU VERIFICACAO]`

Ela proibe a persona de dizer que verificou logs, payload, codigo, console, diff, banco ou system prompt sem esse dado estar realmente no contexto.

Quando nao houver acesso direto, a formula obrigatoria e:

`Nao tenho acesso direto ao payload/logs nesta conversa. Com base apenas no comportamento visivel, as hipoteses sao...`

## Ordem atual do system prompt

1. Seguranca e privacidade essenciais.
2. Prompt nativo integral resolvido.
3. Contrato funcional especifico ou familiar.
4. Regra anti-assistente generico.
5. Regra anti-template visivel.
6. Regra anti-simulacao de acesso/verificacao.
7. Contexto temporal.
8. Idioma.
9. Pedido atual do usuario.
10. Memorias relevantes.
11. Episodios recentes relevantes.
12. Fontes persistentes autorizadas.
13. Agenda relevante.
14. Registros relevantes.
15. Lugar ativo, se houver.
16. Aviso de lacuna contextual, se necessario.
17. Constituicao e doutrina global resumidas.
18. Seguranca, privacidade e veracidade.
19. Extracao de memoria e registro automatico.
20. Regras de comunicacao.

## Contratos reforcados

- Mentor: bloqueia modo atendente, pergunta de teste redundante, "vamos" como muleta, pergunta final automatica e resposta-convite. Exige interpretar momento, nomear conflito central, apontar consequencia e orientar.
- Cientista: exige evidencia observavel, hipotese tecnica, hipotese alternativa, dado faltante, teste necessario e proximo experimento. Bloqueia simulacao de auditoria, ritual simbolico como metodo e revisao generica sem teste.
- Bobo da Corte, Inimigo e Engenheiro permanecem cobertos pelos contratos especificos ja criados.

## PROMPT_DEBUG

Quando `PROMPT_DEBUG=true`, o servidor registra:

- persona ativa;
- lugar ativo;
- prompt nativo resolvido;
- origem/chave do prompt;
- contrato funcional aplicado;
- tamanho do prompt da persona;
- tamanho total do system prompt;
- memorias e episodios injetados;
- preview seguro de memorias/episodios;
- modelo;
- temperature;
- max output tokens;
- API/wrapper;
- presence/frequency penalties;
- frases suspeitas de prestatividade detectadas no prompt nativo/contrato antes das regras de bloqueio.

O debug nao e exposto ao usuario final.

## Testes executados

- `node test_persona_context_contracts.js`: passou.
- `npm.cmd run build`: passou.

## Testes qualitativos pendentes

As entradas obrigatorias de Mentor, Cientista, Bobo da Corte, Inimigo e Engenheiro ainda precisam ser testadas em chat real/autenticado para avaliar a resposta do modelo. A infraestrutura, regras e contratos foram validados estaticamente e por build.
## 2026-06-26 - Auditoria do Pipeline de Continuidade

Fluxo anterior: `app/api/chat/route.ts` persistia mensagem e episodio, depois o assembler buscava memorias/episodios. Para entradas curtas, a recuperacao ainda dependia de fallback lexical/posicional, sem estado persistente de tema ativo e com inversao de recencia em `getUserMemories`.

Fluxo novo: depois da mensagem do usuario, `retainActiveTopicsFromUserMessage` extrai temas substantivos deterministamente e faz upsert em `ActiveTopic`. O assembler legado e o cognitive runtime usam `buildConversationContextPacket` antes da geracao. O pacote informa `invocationMode`, contagens, scores, motivos de selecao, tipos de contexto e se houve continuidade entre personas.

Gate anti-SAC: `evaluatePersonaInitiativeQuality` agora rejeita `FALSE_CONTEXT_DENIAL` quando ha contexto substantivo e a resposta declara ausencia de informacoes sobre o usuario. O gate continua rejeitando entrevista generica, oferta de ajuda, autoapresentacao funcional, pergunta final vazia, vazamento privado e afirmacao biografica sem suporte.

Observabilidade: `PROMPT_DEBUG` registra metricas e previews redigidos; o cognitive runtime emite `CONTINUITY_CONTEXT_ASSEMBLED` e amplia `PERSONA_INITIATIVE_EVALUATED` com `falseContextDenialDetected`, `genericAssistantLeakDetected`, contagens e tipos de contexto. Conteudo bruto privado permanece fora dos logs redigidos.
