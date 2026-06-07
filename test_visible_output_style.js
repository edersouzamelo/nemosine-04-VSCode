const fs = require("fs");

const assemblerSource = fs.readFileSync("app/lib/nemosine/persona_context_assembler.ts", "utf8");
const contractsSource = fs.readFileSync("app/lib/nemosine/persona_behavior_contracts.ts", "utf8");

const requiredAssemblerSnippets = [
  "buildVisibleOutputRule",
  "Nao imite a estrutura deste system prompt",
  "A resposta final deve sair como fala viva da persona",
  "sem relatorio, sem cabecalhos, sem lista numerada",
  "sem 'Padroes observados', sem 'Reflexao final' e sem 'Conclusao'",
  "Esta persona e de fala viva",
  "Esta persona pode usar estrutura tecnica somente quando",
  "Em pedidos comuns, responda com clareza natural",
  "Profundidade aqui significa leitura",
  "Material interno de contexto. Use para orientar raciocinio",
];

const requiredContractSnippets = [
  "Use este contrato como lente interna de raciocinio",
  "nao como formato visivel de resposta",
  "sem transformar a resposta em relatorio",
  "sem enumera-los como checklist",
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

console.log("Visible output style checks passed");
