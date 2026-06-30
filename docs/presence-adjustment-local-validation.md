# Ajuste de Presenca V1 - validacao local

## Estado esperado

- `PRESENCE_ADJUSTMENT_MODE` deve ficar `off` por padrao.
- Para teste local, iniciar com `PRESENCE_ADJUSTMENT_MODE=internal`.
- O teste visual so passa depois de confirmacao manual do usuario.
- Nao fazer push, deploy ou migration para validar esta V1.

## Comando local

```powershell
$env:NODE_OPTIONS="--use-system-ca"
$env:MULTI_PERSONA_ENABLED="true"
$env:ONBOARDING_V2_MODE="internal"
$env:PRESENCE_ADJUSTMENT_MODE="internal"
npm.cmd run dev
```

Abrir no Chrome ou Edge:

```text
http://localhost:3000
```

## Roteiro manual obrigatorio

1. Ativar `PRESENCE_ADJUSTMENT_MODE=internal`.
2. Abrir uma persona ainda nao configurada.
3. Confirmar escurecimento da tela.
4. Confirmar uma pergunta por vez.
5. Informar um contexto real.
6. Selecionar resposta profunda.
7. Bloquear `se quiser`.
8. Bloquear perguntas finais.
9. Confirmar o resumo.
10. Enviar mensagem a persona.
11. Verificar uso do contexto.
12. Verificar ausencia dos fechamentos proibidos.
13. Reabrir a mesma persona.
14. Confirmar que o fluxo nao reaparece.
15. Abrir outra persona.
16. Confirmar novo Primeiro Acordo.
17. Abrir Ajuste de Presenca pelo menu.
18. Alterar preferencia somente para a sessao.
19. Testar conversa com convidados.
20. Conferir Sala de Maquinas.

## Reprovacoes automaticas

- Tres textareas aparecem automaticamente.
- O contrato nao chega ao payload de chat.
- `se quiser` continua no fechamento apos bloqueio.
- Pergunta final aparece apos bloqueio.
- A configuracao de uma persona marca todas como configuradas.
- O overlay reaparece a cada abertura da mesma persona.
- Conteudo do Confessor aparece em telemetria.
