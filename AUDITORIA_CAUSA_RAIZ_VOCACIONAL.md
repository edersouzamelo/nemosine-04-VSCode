# AUDITORIA CAUSA RAIZ VOCACIONAL

Data: 2026-07-16
Branch: `repair/persona-routing-reset`
Caso auditado: Persona `Narrador`; pedido sobre estresse profissional, instabilidade conjugal e conversa livre para compreender o vivido.

## Caminho Observado Antes Da Correcao

1. Mensagem do usuario:
   "Estou com estresse profissional e instabilidades conjugais. Quero conversar livremente e tentar compreender o que estou vivendo."
2. Classificacao antiga:
   `classifyTaskFamilies` lia palavras do assunto e classificava `emotion`/`reflection`.
3. `currentPersonaFit`:
   o resolver de handoff podia concluir que a persona atual ainda conseguia continuar, mas a politica do OCV avaliava outra coisa.
4. Candidata original:
   a candidata do modelo podia ser rejeitada por findings de iniciativa, resposta fina ou autodescricao.
5. Avaliacao de iniciativa:
   findings como `THIN_RESPONSE`, `VOCATIONAL_INERTIA` ou `SELF_DESCRIPTION_INSTEAD_OF_ACTION` podiam entrar no bloco vocacional do runtime.
6. Avaliacao vocacional:
   como `symbolic` nao continha `emotion`/`reflection` como familia permitida, surgia `VOCATION_LOW_CONFIDENCE_MATCH`.
7. Findings:
   findings com prefixo `VOCATION` eram classificados genericamente como `vocational_failure`.
8. Vigia:
   quando a vocacao nao dava hard pass, a coerencia recebia dimensao vocacional falha.
9. Promocao/rejeicao:
   a promotion gate podia rejeitar por `vocation_failed`.
10. Causa dominante:
   `classifyDominantRejectionCause` priorizava qualquer finding vocacional como causa `vocation`.
11. Recovery:
   `buildRecoveryAnswer` chamava `resolveVocationalTargets` novamente e podia escolher um destino diferente do caminho da rota.
12. Origem do handoff:
   podia nascer do recovery do OCV, nao de uma decisao estruturada unica.
13. Resposta entregue:
   a fala podia dizer que a persona atual continuaria enquanto o cartao mostrava outro destino.

## Respostas Explicitamente Auditadas

- Por que `emotion/reflection` virou incompatibilidade:
  porque o sistema antigo misturava dominio do assunto com operacao solicitada. Estresse, trabalho e casamento foram tratados como familia operacional da tarefa, nao como contexto narravel/compreensivel.

- Qual finding reprovou a candidata:
  os bloqueios podiam vir de iniciativa (`THIN_RESPONSE`, `VOCATIONAL_INERTIA`, `SELF_DESCRIPTION_INSTEAD_OF_ACTION`) e ser agregados ao bloco vocacional. O low confidence tambem ajudava a empurrar a causa dominante para vocacao.

- Quem escolheu Autor:
  a escolha podia vir de resolvedores concorrentes: rota de handoff, `resolveVocationalTargets` chamado dentro do recovery, ou handoff targets da politica vocacional.

- Se o cartao nasceu da rota, do OCV ou da recuperacao:
  antes da correcao, podia nascer da recuperacao do OCV. Isso foi removido: recovery nao escolhe persona e nao cria cartao.

- Por que a fala dizia Narrador enquanto o cartao dizia Autor:
  porque fala e cartao nao compartilhavam uma unica decisao estruturada. Agora cartoes carregam `decisionId`, `trigger`, `sourcePersona`, `targetPersonas` e `currentPersonaFit`.

- Por que profundidade profunda nao foi cumprida:
  a resposta curta podia ser rejeitada, mas a recuperacao vocacional substituia a resposta por uma mensagem curta ou handoff em vez de regenerar a persona. Agora low confidence nao causa recovery, e respostas finas continuam sendo reparadas como qualidade da candidata.

## Matriz Subject Domain x Requested Operation

| Subject Domain | Exemplos | Requested Operation | Persona compativel por operacao |
| --- | --- | --- | --- |
| trabalho | chefe, equipe, carreira | narrar/compreender | Narrador pode responder se a operacao for narrativa ou sentido vivido |
| casamento | esposa, marido, conjugal | narrar/reconstruir | Narrador e PRIMARY para sequencia, conflito e virada |
| emocao | estresse, ansiedade, padroes | compreender/refletir | Psicologo/Terapeuta sao PRIMARY; persona atual pode ser VALID se a operacao couber em sua lente |
| saude | sintomas, exames | diagnosticar/prescrever | Incompatibilidade real fora de Medico |
| esporte | jogo, placar | prever | Vidente deve escolher cenario, confianca, razao, alternativa e marcador |
| tecnologia | bug, build, API | implementar/debugar | Engenheiro/Cientista conforme a operacao |

## Nova Politica

- `SUBJECT DOMAIN` descreve o tema.
- `REQUESTED OPERATION` governa a vocacao.
- `PRIMARY` ou `VALID`: responde sem handoff automatico.
- `PARTIAL`: responde; handoff so se o usuario pedir complemento.
- `INCOMPATIBLE`: pode gerar handoff por `incompatible_operation` ou `prohibited_capability`.
- `VOCATION_LOW_CONFIDENCE_MATCH` foi substituido por `VOCATION_SECONDARY_FIT`, warning de auditoria nao bloqueante.
- Recovery do OCV nao chama resolvedor vocacional.
- Autoencaminhamento e proibido: `sourcePersona !== targetPersona`.
