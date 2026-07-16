# AUDITORIA FORENSE - EXECUTOR - COMMIT 470A7C

Data da auditoria: 2026-07-16  
Branch auditada: `repair/persona-routing-reset`  
Commit auditado: `470a7c587778c20252b9da9821ee5a1451045253`  
Escopo: investigacao apenas. Nenhum codigo foi alterado.

## 1. Caso observado

Persona ativa: `Executor`

Texto humano original informado pelo usuario:

> Estou me sentindo cansado e sem energia. Dormindo muito tarde fazendo programacao do Nemosine. E aqui agora no trabalho acabamos de terminar uma formatura longa e cansativa. O Comandante do quartel falou demais, discurso longo. Quero desabafar.

Ajuste de Presenca:

- pergunta principal: `desabafar`
- objetivo: `desabafar`
- profundidade: `equilibrada`
- escopo: `esta persona`

Saida observada:

- resposta visivel em voz generica/host:
  `Pelo meu campo, eu continuo a partir desta funcao: transformar demanda em estrutura, fluxo, procedimento, verificacao e execucao pratica...`
- texto visivel apontando `Engenheiro` como melhor continuidade;
- cartao visual persistido apontando `Autor`;
- cards de Presenca/Handoff ainda grandes.

## 2. Thread real encontrada no banco

Thread: `cmrnnx53y0001y16va8jvrpjv`  
Thread hash: `89fca70a62ea`  
Persona: `Executor`  
Titulo persistido: `Ajuste de Presenca`  
Criada em: `2026-07-16T15:27:12.667Z`  
Atualizada em: `2026-07-16T15:27:23.537Z`

Mensagens relevantes:

1. Mensagem de usuario `cmrnnx55m0003y16vx8g5261i`
   - `role`: `user`
   - `messageKind`: `USER`
   - conteudo comecava com `[[NEMOSINE_PRESENCE_OPENING]]`
   - o texto humano foi inserido dentro do envelope tecnico de ajuste de presenca, em `Contexto recente autorizado`.

2. Mensagem de assistente `cmrnnxdeh0005y16vvdtziqj7`
   - `role`: `assistant`
   - `messageKind`: `PERSONA`
   - `generationStatus`: `COMPLETED`
   - conteudo persistido era exatamente a resposta generica com `Pelo meu campo...`
   - menciona `Engenheiro`.

3. Evento de sistema `cmrnnxdhf0007y16vcle6e38d`
   - `eventType`: `HANDOFF_OFFERED`
   - `state`: `offered`
   - `sourcePersona`: `Executor`
   - `targetPersona`: `Autor`
   - `targetSlug`: `autor`
   - `title`: `Continuar com Autor`
   - `summary` e `draft` foram derivados do envelope tecnico de presenca, nao apenas do texto humano.

Conclusao: o historico real contem duas autoridades divergentes: a resposta recuperada falou `Engenheiro`; o evento estruturado persistido apontou `Autor`.

## 3. O OCV governou a entrega?

Sim. O audit real mostra:

- `runtimeMode`: `enforce`
- `executionProfile`: `full`
- `promotionDecision`: `recovery_delivered`
- `deliveryStatus`: `persisted`
- `assistantMessagePersisted`: `true`
- `iterationCount`: `3`
- `failureReason`: `coherence_exhaustion`

Eventos finais relevantes:

- `REJECTION_CLASSIFIED` com `dominantCause: vocation`
- `RECOVERY_BASAL_GATE` com `promoted: true`
- `RECOVERY_DELIVERED`
- `DELIVERY_PERSISTED`
- `SIDE_EFFECTS_SKIPPED`

Conclusao: o candidato normal nao foi entregue. O que foi entregue foi uma resposta de recuperacao do OCV, e essa resposta de recuperacao era generica e continha handoff em estilo host.

## 4. Por que o Executor nao falou como Executor?

A causa historica exata esta no codigo existente em `30080f0`.

Em `app/lib/nemosine/handoff.ts` no commit `30080f0`, `buildHostStyledHandoffAnswer` construia texto generico:

- linha 267-270:
  - `Pelo meu campo, eu continuo a partir desta funcao: ...`
  - `${targetPersona} e a melhor continuidade agora porque ...`
  - `Deixei o cartao de encaminhamento pronto...`

No mesmo arquivo, `buildPersonaHandoffOffer` incluia `answer: buildHostStyledHandoffAnswer(...)`.

Em `app/lib/nemosine/cognitive-runtime/orchestrator.ts` antes de `4f26ee1`, `buildRecoveryAnswer` fazia:

- selecionava `recoveryHandoffTarget`;
- montava `buildPersonaHandoffOffer`;
- para causa dominante `vocation`, entregava `handoff?.answer`.

Portanto, a fala vista nao veio de uma resposta autentica do Executor. Veio do fallback de recuperacao vocacional usando um texto host-styled.

## 5. Por que apareceu Engenheiro?

O audit real do runtime registrou `HANDOFF_OFFERED` tres vezes durante as iteracoes, sempre com:

- `sourcePersona`: `Executor`
- `targetPersona`: `Engenheiro`
- `decision`: `refusal_required`
- `reason`: `VOCATION_FORBIDDEN_TASK_FAMILY`

A politica vocacional atual ainda explica esse caminho:

- `app/lib/nemosine/cognitive-runtime/vocational-policy.ts`
- `classifyRequestedOperations` marca `programar` como `diagnose-system` e `implement`;
- `targetsForIncompatibility` encaminha operacoes tecnicas para `Engenheiro`;
- se a persona ativa nao permite a operacao, a avaliacao vira `currentPersonaFit: incompatible`.

No caso, a palavra `programacao` dentro do contexto autorizado ativou uma leitura tecnica indevida, apesar de o objetivo declarado ser `desabafar`.

Conclusao: `Engenheiro` veio do OCV/politica vocacional, nao da UI.

## 6. Por que o cartao apontou Autor?

O evento persistido `HANDOFF_OFFERED` no banco aponta `Autor`, com razao ligada a imagem, linguagem, narrativa, humor, rito ou simbolo funcional.

A evidencia disponivel mostra que:

- o texto visivel veio do recovery answer antigo, que usava `Engenheiro`;
- o cartao persistido veio de um evento estruturado separado;
- `summary` e `draft` do cartao foram criados a partir do envelope tecnico `[[NEMOSINE_PRESENCE_OPENING]]`;
- a rota antiga possuia caminhos paralelos de handoff:
  - handoff extraido do audit (`extractHandoffOfferFromAudit`);
  - handoff resolvido pela rota (`resolveVocationalTargets` / `buildHandoffOffersFromResolution`);
  - handoff inferido por pedido explicito (`inferHandoffTarget`).

Conclusao: havia mais de uma autoridade de handoff. O OCV apontou `Engenheiro`; o evento persistido final apontou `Autor`. O banco confirma a divergencia, mas os audits redigidos nao preservam dados suficientes para reconstruir integralmente por que o caminho estruturado escolheu `Autor` naquele turno.

## 7. O primeiro candidato do Executor foi recuperavel?

Nao integralmente.

`app/lib/nemosine/cognitive-runtime/audit-redaction.ts` persiste:

- hashes de conteudo;
- comprimentos;
- eventos de auditoria;
- codigos de finding;
- metadados de modelo.

Nao persiste o texto bruto dos candidatos reprovados. O audit do caso mostra:

- `contentLengths.userText`: `910`
- `contentLengths.displayUserText`: `940`
- `contentLengths.finalCandidate`: `1233`
- `contentHashes.finalCandidate`: presente

Conclusao: o sistema permite provar que houve candidato final reprovado antes da recuperacao, mas nao permite ler o texto bruto desse candidato. Nao da para afirmar, a partir do audit persistido, se a primeira resposta candidata estava em voz autentica do Executor.

## 8. Por que o titulo ficou "Ajuste de Presenca"?

A mensagem real do usuario foi persistida como envelope tecnico de presenca.

No commit `470a7c`, `app/lib/nemosine/thread_title.ts` classifica qualquer texto contendo `[[NEMOSINE_PRESENCE_OPENING]]` ou `Ajuste de Presenca` como `presence-system`.

Consequencias:

- `buildDeterministicThreadTitle` retorna `Nova conversa` para `presence-system`;
- `shouldRepairThreadTitle` so repara titulos genericos se o texto gerar algo diferente de `Nova conversa`;
- em `app/api/chat/route.ts`, a reparacao usa `displayUserText`, que nesse caso e o envelope tecnico;
- portanto, o titulo nao e reparado a partir do campo humano `Contexto recente autorizado`.

Conclusao: a origem do titulo ruim e estrutural: o primeiro turno de presenca mistura evento tecnico e fala humana no mesmo conteudo persistido, e o reparador de titulo nao extrai a fala humana desse envelope.

## 9. Por que os cards continuam grandes?

O commit `470a7c` nao compactou visualmente os cards.

Evidencias em `app/components/MedievalChat.tsx`:

- `PresenceAdjustmentEventCard` usa wrapper `max-w-[92%]`, `rounded-xl`, `p-1.5`, `max-h-72`, grid em duas colunas;
- `HandoffOfferCard` usa `mt-3 rounded-xl ... p-1.5`, conteudo expandido com `max-h-72`;
- `HandoffOfferGroupCard` usa `max-w-[760px]`, `max-h-[25vh]`;
- eventos persistidos sao renderizados em wrapper `max-w-[92%]`;
- cards inline de resposta sao renderizados dentro da bolha do assistente.

O diff `f045bdd..470a7c` em `MedievalChat.tsx` mostra mudancas de:

- transporte de contexto via `/api/chat/handoff/context`;
- clique `Abrir conversa`;
- exibicao de falha de persona.

Nao mostra mudanca estrutural de densidade, largura, altura ou hierarquia visual dos cards.

## 10. O que o commit 470a7c realmente mudou

`470a7c fix: isolate speaker routing and handoff context` alterou 13 arquivos:

- `app/agents/[id]/page.tsx`
- `app/api/chat/collective/route.ts`
- `app/api/chat/handoff/context/route.ts`
- `app/api/chat/route.ts`
- `app/components/MedievalChat.tsx`
- `app/lib/nemosine/collective_chat_orchestrator.ts`
- `app/lib/nemosine/conversation_participants.ts`
- `app/lib/nemosine/handoff.ts`
- `app/lib/nemosine/session_store.ts`
- `app/lib/nemosine/thread_title.ts`
- `tests/cognitive-runtime/handoff-persistence.test.js`
- `tests/multi-persona/participants.test.js`
- `tests/multi-persona/thread-title.test.js`

O commit removeu `answer` de `PersonaHandoffOffer` no codigo atual e criou transporte por contexto de handoff. Tambem moveu logica de titulo para `thread_title.ts`.

O commit nao alterou diretamente:

- `app/lib/nemosine/cognitive-runtime/orchestrator.ts`;
- `app/lib/nemosine/cognitive-runtime/vocational-policy.ts`;
- `app/lib/nemosine/persona-initiative/response-quality.ts`.

Conclusao: `470a7c` nao corrigiu a raiz do caso Executor/desabafo. Ele corrigiu parte do transporte de handoff e isolamento de speaker, mas nao a classificacao vocacional que tratou `programacao` como demanda tecnica nem a extracao de fala humana dentro do envelope de presenca.

## 11. Estado atual do codigo em 470a7c para o mesmo texto

Teste local de resolucao com o texto humano puro retornou:

```json
{
  "isHandoffSelectionRequest": false,
  "currentPersonaCanContinue": false,
  "currentPersonaFit": "partial",
  "primaryTargetPersonaId": "Comandante",
  "confidence": 0.95,
  "routingReason": "persona mencionada diretamente pelo usuario",
  "trigger": "explicit_user_request"
}
```

Isso indica outra anomalia atual: a frase `O Comandante do quartel falou demais` pode ser confundida com mencao direta a uma persona chamada `Comandante`, mesmo quando o usuario esta falando de uma pessoa real do ambiente de trabalho.

Conclusao: no HEAD atual, o resultado provavel nao e mais exatamente `Engenheiro`/`Autor`, mas ainda ha risco de roteamento errado.

## 12. Matriz de responsabilidade

| Sintoma | Evidencia | Responsavel tecnico provavel | Status em 470a7c |
|---|---|---|---|
| Resposta "Pelo meu campo..." | `30080f0:app/lib/nemosine/handoff.ts`, `buildHostStyledHandoffAnswer` | Recovery vocacional host-styled | Removido depois de `4f26ee1`, mas persistido no banco |
| Texto apontando Engenheiro | Audit OCV `HANDOFF_OFFERED targetPersona=Engenheiro` | `vocational-policy.ts` classificando `programacao` como operacao tecnica | Risco ainda existe para texto tecnico dentro de desabafo |
| Cartao apontando Autor | Mensagem `SYSTEM_EVENT HANDOFF_OFFERED` persistida no banco | Caminho paralelo de handoff/evento estruturado | Autoridade paralela reduzida, mas divergencia historica persiste |
| Titulo "Ajuste de Presenca" | Thread real + `thread_title.ts` classifica envelope como `presence-system` | Primeiro turno mistura evento tecnico e fala humana | Ainda nao resolve titulo a partir de `Contexto recente autorizado` |
| Cards grandes | `MedievalChat.tsx` usa `max-w-[92%]`, `max-h-72`, `max-w-[760px]` | UI dos cards | Nao alterado por `470a7c` |
| Candidato bruto nao recuperavel | `audit-redaction.ts` guarda hashes/comprimentos, nao textos | Politica de redacao de audit | Por desenho, nao recuperavel |
| Possivel Comandante errado no HEAD | Resolucao local do texto puro | `mentionedPersona` trata cargo real como persona | Risco atual |

## 13. Resposta direta as perguntas forenses

1. O Executor falou como Executor?
   - Nao na resposta entregue. A entrega foi uma recuperacao host-styled.

2. O OCV bloqueou o candidato normal?
   - Sim. Houve 3 iteracoes, `coherence_exhaustion` e `recovery_delivered`.

3. O texto reprovado foi entregue?
   - Nao ha evidencia de entrega do candidato reprovado. A mensagem persistida corresponde ao fallback de recuperacao.

4. Por que houve Engenheiro?
   - Porque o OCV classificou a mencao a programacao/Nemosine como demanda tecnica fora da vocacao do Executor.

5. Por que houve Autor?
   - Porque o evento estruturado de handoff persistido por rota/camada paralela apontou Autor. O banco confirma; o audit redigido nao contem material suficiente para reconstruir a decisao completa.

6. Por que o titulo nao foi humano?
   - Porque a fala humana foi encapsulada em `[[NEMOSINE_PRESENCE_OPENING]]`, e a logica de titulo rejeita esse envelope como fonte.

7. Por que os cards continuaram grandes?
   - Porque `470a7c` nao alterou layout/densidade dos cards.

## 14. Riscos antes de qualquer correcao

- O roteador ainda pode confundir cargos/pessoas reais com personas se o nome coincidir (`Comandante do quartel`).
- O texto de presenca ainda pode contaminar classificacao vocacional, titulo, summary e draft.
- A palavra `programacao` dentro de desabafo pode disparar caminho tecnico indevido.
- O sistema ainda nao diferencia claramente "tema citado" de "operacao solicitada".
- O audit redigido protege privacidade, mas impede recuperar candidatos para diagnostico textual fino.
- UI de cards ainda pode dominar a primeira dobra da conversa.

## 15. Confirmacao de nao intervencao

Nesta auditoria:

- nenhum codigo foi alterado;
- nenhum commit foi feito;
- nenhum deploy foi feito;
- nenhuma refatoracao foi feita;
- nenhum preview novo foi criado;
- unico arquivo criado: `AUDITORIA_FORENSE_EXECUTOR_470A7C.md`.
