# Separacao entre raciocinio interno e formato final das personas

Data: 2026-06-04

## Objetivo

Remover o formato automatico de relatorio sem reduzir profundidade, sem apagar prompts nativos, sem alterar taxonomia, UI, estetica, nomes oficiais ou arquitetura registrada.

## Origem identificada

O formato de relatorio vinha da combinacao de tres fontes:

1. Prompts nativos com estruturas formais, especialmente Mentor e Cientista.
2. `formatPersonaBehaviorContract`, que apresentava o contrato como ficha tecnica com criterios de boa resposta.
3. `persona_context_assembler`, que montava o system prompt em secoes e listas, reforcando cabecalhos e enumeracoes como estilo.

## Funcoes alteradas

### `formatPersonaBehaviorContract`

Arquivo: `app/lib/nemosine/persona_behavior_contracts.ts`

Antes, o contrato era exposto como ficha:

- Missao operacional
- Contexto que deve procurar
- Inferencia esperada
- Estilo positivo
- Proibicoes especificas
- Criterios de boa resposta

Agora, o contrato declara explicitamente que deve ser usado como lente interna de raciocinio, nao como formato visivel. Os criterios continuam presentes, mas como efeitos de fundo, sem serem enumerados como checklist na resposta.

### `listSection`

Arquivo: `app/lib/nemosine/persona_context_assembler.ts`

Antes, memorias, episodios, fontes, agenda e registros eram inseridos diretamente como listas.

Agora, essas listas entram precedidas por aviso de que sao material interno de contexto e nao devem ser reproduzidas como lista na resposta final.

### `buildAntiVisibleTemplateRule`

Arquivo: `app/lib/nemosine/persona_context_assembler.ts`

Foi reforcado que cabecalhos como `Padroes observados`, `Reflexao final` e `Conclusao` nao devem aparecer em pedidos comuns.

### `buildVisibleOutputRule`

Arquivo: `app/lib/nemosine/persona_context_assembler.ts`

Nova funcao adicionada. Ela cria a regra final de saida visivel:

- nao imitar a estrutura do system prompt;
- usar prompt, contratos, memorias e contexto apenas como orientacao interna;
- responder em fala viva, prosa natural e voz propria;
- nao usar relatorio, cabecalhos, listas numeradas, `Padroes observados`, `Reflexao final` ou `Conclusao`, salvo pedido explicito por relatorio, auditoria, parecer, checklist, matriz, plano ou resumo.

Tambem separa dois grupos:

- Personas de fala viva, como Mentor, Psicologo, Bobo da Corte, Inimigo, Narrador, Terapeuta e Artista: relatorio proibido por padrao.
- Personas tecnicas, como Cientista, Advogado, Mestre, Engenheiro e Mordomo: estrutura tecnica permitida apenas quando o pedido solicitar analise formal, auditoria, parecer, plano, relatorio ou checklist.

### `buildCommunicationRules`

Arquivo: `app/lib/nemosine/persona_context_assembler.ts`

Foi adicionada a preferencia por paragrafos vivos em pedidos comuns, em vez de listas, relatorios ou secoes nomeadas.

## O que foi preservado

- Prompts nativos integrais.
- Profundidade, inferencia, veracidade e contexto.
- Regras anti-SAC.
- Regras anti-template.
- Regras anti-simulacao de saber.
- Contratos funcionais.
- Memorias, episodios, agenda, registros e fontes.

## Teste prioritario esperado

Entrada:

`Psicologo, entre meu casamento, meu projeto Nemosine e minha preparacao para o palco, qual necessidade emocional voce ve se repetindo?`

Saida esperada:

Resposta em prosa viva, sem lista, sem cabecalho, sem conclusao formal, com formulacao psicologica integrada.
