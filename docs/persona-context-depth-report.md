# Relatorio da fase de profundidade sistemica das personas

## Objetivo

Corrigir a montagem de contexto das personas para que cada resposta parta do prompt nativo integral, use contrato funcional, selecione contexto relevante e declare lacunas sem inventar fatos.

## Alteracoes implementadas

- Criado `app/lib/nemosine/persona_behavior_contracts.ts`.
- Criado `app/lib/nemosine/persona_context_assembler.ts`.
- Atualizado `app/lib/nemosine/session_store.ts` com:
  - `getRelevantUserMemories(userId, personaId, userText)`;
  - `getRelevantConversationEpisodes(userId, personaId, userText)`;
  - scoring lexical simples com hints do contrato funcional;
  - preservacao do isolamento dos espacos privados ja existente.
- Atualizado `app/lib/nemosine/llm_client.ts` para delegar a montagem ao assembler.
- Atualizado `app/api/chat/route.ts` para passar o pedido atual do usuario ao prompt builder.
- Criado `PROMPT_DEBUG` via `process.env.PROMPT_DEBUG === "true"` com log apenas no servidor.
- Criado `test_persona_context_contracts.js` para checagem estatica dos contratos criticos.

## Ordem nova do system prompt

1. Prompt nativo integral resolvido.
2. Contrato funcional especifico ou familiar.
3. Contexto temporal.
4. Idioma.
5. Pedido atual do usuario.
6. Memorias relevantes.
7. Episodios relevantes.
8. Fontes persistentes autorizadas.
9. Agenda e registros relevantes.
10. Lugar ativo, se houver.
11. Aviso de lacuna contextual, se necessario.
12. Constituicao e doutrina global resumidas.
13. Seguranca, privacidade e veracidade.
14. Extracao de memoria e registro automatico.
15. Regras de comunicacao.

## Contratos especificos criados

- Mentor
- Inimigo
- Bobo da Corte
- Cientista
- Engenheiro
- Mordomo
- Psicologo
- Estrategista
- Orquestrador-Arquiteto
- Vidente
- Narrador
- Mestre
- Advogado
- Medico
- Treinador
- Terapeuta

## Contratos familiares criados

- Estrategicas
- Simbolicas
- Emocionais/Psicodinamicas
- Operacionais/Funcionais

## Regras criticas cobertas

- Inimigo: deve separar fato disponivel, inferencia provavel, risco exploravel, uso adversarial e fechamento de flanco; inclui modo de falha obrigatorio.
- Mentor: evita coach generico, formularios repetidos e conselho sem contexto.
- Bobo da Corte: evita formulas genericas, clichês proibidos, moral edificante, resposta de atendente e emoji como punchline.
- Cientista: separa evidencia, hipotese, incerteza e teste possivel.
- Engenheiro: mapeia estrutura, fluxo, causa provavel e correcao operacional.

## PROMPT_DEBUG

Quando `PROMPT_DEBUG=true`, o servidor registra:

- persona ativa;
- lugar ativo;
- prompt nativo resolvido;
- origem/chave do prompt;
- contrato funcional aplicado;
- tamanho do prompt da persona;
- tamanho total do system prompt;
- numero de memorias injetadas;
- numero de episodios injetados;
- preview seguro de memorias/episodios;
- modelo usado;
- temperature.

## Testes e verificacoes

- `node test_persona_context_contracts.js`: passou.
- `npm.cmd run build`: passou.

## Testes manuais pendentes

Os testes manuais de resposta final com Bobo da Corte, Mentor, Inimigo, Cientista e Engenheiro dependem de uma sessao real com dados do usuario e chamada ao modelo. A infraestrutura de prompt e contratos foi validada estaticamente; a avaliacao qualitativa das respostas fica pendente para execucao em chat autenticado com contexto real.
## 2026-06-26 - Continuidade Cognitiva Transversal V2

Diagnostico confirmado: o sistema ja tinha prompts, contratos, memorias e `persona-initiative`, mas a continuidade em saudacoes curtas dependia de material recuperado fragilmente. O ponto mais visivel era `getUserMemories`: a consulta trazia `createdAt desc` e depois aplicava `reverse()`, transformando o fallback de mensagem curta em favorecimento de material antigo. Alem disso, nao havia estado persistente de tema ativo; `[MEMORY: TEMA ATIVO]` era apenas uma tag opcional gerada pelo modelo.

Arquitetura nova: `app/lib/nemosine/conversation_continuity.ts` cria `ActiveTopic` deterministico, classifica `InvocationMode`, calcula `Context Packet` com `ACTIVE_TOPICS`, episodios, memorias duraveis, fontes, Linha do Destino, agenda/registros e explicacao de retrieval. Em saudacoes e continuacoes, o score prioriza recencia, saliencia e afinidade vocacional antes da lexicalidade do texto curto. Em pedidos substantivos, lexicalidade volta a pesar mais.

Privacidade: temas publicos atravessam personas do mesmo usuario. Temas privados sao gravados com `privacyScope=PRIVATE` e `metadata.scope`, e so retornam ao mesmo espaco privado autorizado. O pacote de debug redige previews privados e nao deve expor conteudo bruto de Confessor 2.0 ou Porao.

Astronomo: agora possui contrato especifico estrategico-longitudinal, voltado a ciclos, recorrencias, trajetoria, comparacao de fases e transicoes. Ele nao deve pedir pauta quando existe tema publico recente.
