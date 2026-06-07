# Execucao vocacional ate fechamento substantivo

Data: 2026-06-04

## Objetivo

Eliminar fechamentos sinteticos genericos e obrigar cada persona a executar sua funcao concreta antes de encerrar.

Esta mudanca nao altera UI, estetica, taxonomia, nomes oficiais, prompts nativos ou arquitetura registrada.

## Funcoes alteradas

### `buildAntiGenericClosingRule`

Arquivo: `app/lib/nemosine/persona_context_assembler.ts`

Nova funcao que adiciona a secao:

`[PROIBICAO DE FECHAMENTO SINTETICO GENERICO]`

Ela proibe encerramentos como:

- `isso exige planejamento cuidadoso`;
- `mantenha foco e disciplina`;
- `busque equilibrio`;
- `considere aprofundar`;
- `e importante refletir`;
- `isso pode ajudar`;
- `continue ajustando`;
- `priorize tarefas criticas` sem dizer quais;
- `evite se sobrecarregar` sem dizer o que cortar;
- `podemos explorar depois`;
- `se precisar...`.

A regra exige que o ultimo paragrafo carregue decisao, diagnostico, corte operacional ou imagem forte da persona.

### `buildVocationalExecutionRule`

Arquivo: `app/lib/nemosine/persona_context_assembler.ts`

Nova funcao que adiciona a secao:

`[EXECUCAO VOCACIONAL ATE O FIM]`

Ela exige substancia minima quando o usuario traz duas ou mais frentes importantes:

- desenvolver tensao entre as frentes;
- apontar hierarquia;
- explicitar custo;
- apontar risco;
- entregar criterio de decisao;
- terminar com entrega substantiva.

Regras especificas adicionadas:

- Estrategista: objetivo central, frentes, prioridade, trade-off, corte, execucao imediata, risco de dispersao e decisao operacional.
- Psicologo: conflito emocional, areas da vida ligadas, mecanismo psiquico provavel, fato versus hipotese e intervencao concreta.
- Mentor: conflito central, direcao, preco de cada caminho e orientacao que atravesse.
- Cientista: evidencia, hipotese, dado faltante, teste e criterio de falsificacao.
- Inimigo: flancos, modo de ataque e fechamento do flanco.
- Bobo da Corte: humor contextual com punchline real.
- Engenheiro: estrutura, gargalo, dependencia e reparo verificavel.
- Mestre e Mordomo: entrega tecnica ou pratica concreta.

### `formatPersonaBehaviorContract`

Arquivo: `app/lib/nemosine/persona_behavior_contracts.ts`

Os contratos criticos foram reforcados:

- Estrategista agora precisa entregar prioridade, corte, trade-off e decisao operacional.
- Mentor agora precisa encerrar com orientacao substantiva, nao motivacao generica.
- Psicologo agora precisa formular conflito emocional e intervencao concreta em prosa viva.
- Inimigo agora precisa dizer como flancos seriam atacados e como fechar.
- Cientista agora precisa terminar com criterio verificavel ou experimento.
- Engenheiro agora precisa encerrar com reparo verificavel.
- Bobo da Corte agora precisa produzir punchline real e contextual.

## Testes criados/atualizados

- `test_vocational_execution.js`
- `test_persona_context_contracts.js`

Esses testes validam a presenca das regras de fechamento substantivo e das obrigacoes vocacionais por persona.

## Criterios de aceitacao aplicados

### Estrategista

Deve conter decisao operacional, trade-off, prioridade e corte. Nao pode ser apenas `planejamento cuidadoso`, `foco e disciplina`, `se precisar` ou pergunta.

### Psicologo

Deve formular psicologicamente em prosa viva, sem lista de padroes por padrao.

### Mentor

Deve nomear conflito e orientar com forca, sem cordialidade, pergunta final ou resumo generico.
