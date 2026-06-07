# Auditoria de payload e higiene de historico das personas

Data: 2026-06-04

## Escopo

Esta rodada corrigiu a montagem real do payload enviado para `/api/chat`, sem alteracao de UI, estetica ou taxonomia de personas.

## Busca por lixo legado

Busca executada no projeto por:

- `2021`
- `conhecimento treinado`
- `treinado ate`
- `treinado ate 2021`
- frases SAC como `como posso ajudar`, `estou aqui para ajudar`, `estou a disposicao`, `o que gostaria de explorar`, `qual desafio`, `vamos focar`, `vamos ajustar`, `caso precise`, `espero ter ajudado`

Resultado em arquivos pesquisaveis:

- `prompts.json`: nenhum achado para `2021`, `conhecimento treinado` ou `treinado ate`.
- `app/data/nativePersonaPrompts.ts`: nenhum achado suspeito.
- `app/data/entities.ts`: nenhum achado para os termos da busca depois da exclusao de PDFs.
- `app/lib/nemosine/llm_client.ts`: nenhum boilerplate legado encontrado.
- `app/lib/nemosine/persona_behavior_contracts.ts`: nenhum boilerplate legado encontrado.
- `app/lib/nemosine/persona_context_assembler.ts`: achados intencionais nas regras de bloqueio e veracidade.
- `app/lib/nemosine/payload_hygiene.ts`: achados intencionais no detector/sanitizer.
- `test_payload_hygiene.js` e `test_persona_context_contracts.js`: achados intencionais nos testes.
- `app/components/PersonaLevelCollection.tsx`: contem texto de UI com `Com qual desafio...`, fora da rota `/api/chat`.
- `app/space/apps/nexus-chat/page.tsx`: contem titulo de UI `Como posso ajudar?`, fora da rota de personas.

Observacao: varios PDFs em `docs/` retornaram `Acesso negado` no `rg`, entao nao foram tratados como auditados. Nenhum prompt nativo integral foi apagado ou alterado.

## Correcao implementada

### Auditoria segura com PROMPT_DEBUG

Foi criado `app/lib/nemosine/payload_hygiene.ts`.

Quando `PROMPT_DEBUG=true`, a rota salva auditoria em `/tmp/nemosine-prompt-debug` e tambem emite resumo no log com:

- persona ativa;
- threadId;
- modelo;
- temperature;
- max output tokens;
- preview grande do system prompt final;
- lista das mensagens enviadas ao modelo;
- quantidade de mensagens de historico;
- mensagens antigas filtradas;
- memorias, episodios e fontes injetadas;
- contrato aplicado;
- frases suspeitas detectadas no payload.

### Higiene de historico

Antes do `streamText`, `priorHistory` passa por `sanitizeConversationHistory`.

Mensagens antigas do usuario nunca sao filtradas.

Mensagens antigas do assistant sao substituidas por:

`[Resposta anterior do assistant suprimida por conter estilo generico incompativel com a persona.]`

O filtro cobre:

- frases SAC;
- perguntas finais genericas;
- `conhecimento treinado ate 2021`;
- simulacao de verificacao por `verifiquei`/`identifiquei`;
- respostas curtas com vocabulario generico de atendimento.

### Hierarquia de prioridade

O topo do system prompt agora inclui:

1. Seguranca, privacidade e veracidade.
2. Regras runtime anti-SAC, anti-template e anti-simulacao de saber.
3. Contrato funcional da persona.
4. Prompt nativo da persona.
5. Memorias e contexto.
6. Codex Nous e whitepapers como doutrina secundaria.
7. Historico da conversa.

Em conflito, regras runtime e veracidade prevalecem sobre prompt nativo, doutrina ou historico.

### Veracidade biografica

Foi adicionada regra global proibindo inventar fatos sobre Edervaldo/Eder/Autor/Criador, datas, reconhecimento publico, carreira, publicacoes ou historico.

Sem fonte explicita no contexto, a persona deve declarar lacuna. Inferencia precisa ser rotulada como inferencia.

### Sanitizacao da resposta final

Nao foi feita reescrita no meio do streaming, porque isso exigiria buffering/segunda chamada e mudaria o comportamento de streaming da rota. A mitigacao aplicada nesta rodada atua antes da chamada: system prompt, runtime guard, filtro de historico e auditoria. O `onFinish` ainda pode ser usado futuramente para telemetria de violacoes pos-geracao.

## Testes

Criado `test_payload_hygiene.js` com:

- Thread limpa: preserva o feedback do usuario e nao filtra mensagens do usuario.
- Thread contaminada: remove respostas antigas com `estou aqui para ajudar`, `o que gostaria de explorar`, `estou a disposicao` e `conhecimento treinado ate 2021`.

Tambem foi atualizado `test_persona_context_contracts.js`.
