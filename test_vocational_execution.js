const fs = require("fs");

const assemblerSource = fs.readFileSync("app/lib/nemosine/persona_context_assembler.ts", "utf8");
const contractsSource = fs.readFileSync("app/lib/nemosine/persona_behavior_contracts.ts", "utf8");

const requiredAssemblerSnippets = [
  "PROIBICAO DE FECHAMENTO SINTETICO GENERICO",
  "EXECUCAO VOCACIONAL ATE O FIM",
  "isso exige planejamento cuidadoso",
  "mantenha foco e disciplina",
  "busque equilibrio",
  "considere aprofundar",
  "priorize tarefas criticas",
  "sem dizer o que cortar",
  "A resposta deve terminar com entrega substantiva",
  "decisao, diagnostico, corte operacional ou imagem forte",
  "Quando o usuario trouxer duas ou mais frentes importantes",
  "desenvolva a tensao entre elas",
  "Para Estrategista: identifique objetivo central; separe frentes; defina prioridade; aponte trade-off; diga o que cortar",
  "Para Psicologo: formule o conflito emocional; ligue areas da vida; aponte mecanismo psiquico provavel",
  "Para Mentor: nomeie o conflito central; sustente direcao; aponte o preco de cada caminho",
  "Para Cientista: separe evidencia, hipotese, dado faltante e teste",
  "Para Inimigo: aponte flancos exploraveis; diga como seriam atacados",
  "Para Bobo da Corte: produza humor com punchline real e contextual",
];

const requiredContractSnippets = [
  "entregando prioridade, corte, trade-off e decisao operacional",
  "principio sem decisao",
  "encerrar com planejamento cuidadoso",
  "dizer priorize sem dizer o que cortar",
  "formulando conflito emocional e intervencao concreta em prosa viva",
  "encerrar com reflexao generica",
  "orientacao substantiva e nao com motivacao generica",
  "trocar orientacao por pergunta final",
  "modo de ataque e fechamento do flanco",
  "terminando com criterio verificavel ou experimento concreto",
  "encerrando com reparo verificavel",
  "com punchline real",
];

const failures = [
  ...requiredAssemblerSnippets
    .filter((snippet) => !assemblerSource.includes(snippet))
    .map((snippet) => `assembler missing "${snippet}"`),
  ...requiredContractSnippets
    .filter((snippet) => !contractsSource.includes(snippet))
    .map((snippet) => `contract missing "${snippet}"`),
];

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Vocational execution checks passed");
