require("../cognitive-runtime/load-ts.cjs");

const fs = require("fs");
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");

const { getNativePersonaPromptRecord } = require("../../app/data/nativePersonaPrompts.ts");
const { getPersonaBehaviorContract } = require("../../app/lib/nemosine/persona_behavior_contracts.ts");

const personas = [
  "Mentor",
  "Mestre",
  "Cientista",
  "Engenheiro",
  "Estrategista",
  "Narrador",
  "Inimigo",
  "Psicologo",
  "Confessor 2.0",
  "Bobo da Corte",
];

function sha256(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

test("prompt integrity: native prompt manifest matches prompts.json byte content", () => {
  const prompts = JSON.parse(fs.readFileSync("prompts.json", "utf8"));
  const manifest = JSON.parse(fs.readFileSync("app/data/nativePersonaPromptManifest.json", "utf8"));
  assert.equal(manifest.promptCount, Object.keys(prompts).length);

  for (const [key, prompt] of Object.entries(prompts)) {
    assert.equal(manifest.entries[key].sha256, sha256(String(prompt)), `prompt checksum mismatch: ${key}`);
    assert.equal(manifest.entries[key].length, String(prompt).length, `prompt length mismatch: ${key}`);
  }
});

test("persona configuration: requested personas resolve native prompts and contracts", () => {
  for (const persona of personas) {
    const record = getNativePersonaPromptRecord(persona);
    assert.ok(record, `${persona} native prompt not resolved`);
    assert.ok(record.prompt.length > 500, `${persona} native prompt is unexpectedly short`);

    const contract = getPersonaBehaviorContract(persona);
    assert.ok(contract.label, `${persona} contract missing label`);
    assert.ok(contract.operationalMission.length > 20, `${persona} contract mission too small`);
    assert.ok(contract.goodResponseCriteria.length > 0, `${persona} criteria missing`);
  }
});

const mockedOutputs = {
  Mentor: "Vamos separar o problema em um proximo passo pratico, um criterio de escolha e uma pergunta que devolve sua autonomia antes da decisao.",
  Mestre: "Tese: o argumento confunde categoria e exemplo. Primeiro defino o conceito, depois testo a inferencia e encerro sem transformar isso em atendimento generico.",
  Cientista: "Evidencia disponivel: o usuario afirmou X. Inferencia: Y e plausivel. Incerteza: falta verificacao externa. Um teste falsificavel seria observar Z.",
  Engenheiro: "Mecanismo: cache de build. Dependencia: Prisma generate. Modo de falha: cliente desatualizado. Teste: rodar build limpo e inspecionar o erro.",
  Estrategista: "Objetivo: reduzir risco. Opcoes: A agora, B depois. Trade-off: velocidade contra robustez. Decisao recomendada: piloto pequeno com criterio de saida.",
  Narrador: "A sala respirou devagar; a decisao ainda nao tinha nome, mas ja fazia sombra no modo como ele segurava a caneta.",
  Inimigo: "Vou atacar a premissa: voce esta chamando desejo de plano. Prove a dependencia, corte a vaidade e volte com um criterio mensuravel.",
  Psicologo: "Parece haver conflito entre desejo de controle e medo de decepcionar. Isso sugere um padrao relacional, nao um diagnostico clinico.",
  "Confessor 2.0": "Permanece neste espaco privado: eu nao exporto, nao resumo para fora e nao transformo isso em registro global.",
  "Bobo da Corte": "Excelente plano: colocar fogo no mapa para reclamar que a bussola esta suando. Agora, a piada revela o erro sem fingir que ele sumiu.",
};

const criteria = {
  Mentor: [
    (text) => /proximo passo|criterio|pergunta/i.test(text),
    (text) => /autonomia/i.test(text),
  ],
  Mestre: [
    (text) => /tese|argumento|conceito|inferencia/i.test(text),
    (text) => !/atendimento generico|customer service/i.test(text),
  ],
  Cientista: [
    (text) => /evidencia|inferencia|incerteza/i.test(text),
    (text) => /falsificavel|verifica/i.test(text),
  ],
  Engenheiro: [
    (text) => /mecanismo|dependencia|modo de falha|teste/i.test(text),
    (text) => !/metafora apenas/i.test(text),
  ],
  Estrategista: [
    (text) => /objetivo|opcoes|trade-off|criterio/i.test(text),
  ],
  Narrador: [
    (text) => /sala|sombra|caneta|respirou/i.test(text),
    (text) => !/mecanismo|depend[eê]ncia/i.test(text),
  ],
  Inimigo: [
    (text) => /atacar|premissa|prove|criterio/i.test(text),
    (text) => !/idiota|burro|motivacional/i.test(text),
  ],
  Psicologo: [
    (text) => /conflito|medo|padrao/i.test(text),
    (text) => /nao um diagnostico/i.test(text),
  ],
  "Confessor 2.0": [
    (text) => /privado|nao exporto|registro global/i.test(text),
  ],
  "Bobo da Corte": [
    (text) => /plano|piada|erro/i.test(text),
    (text) => /fogo no mapa|bussola/i.test(text),
  ],
};

test("mocked behavioral harness checks distinct persona output structure", () => {
  for (const persona of personas) {
    const output = mockedOutputs[persona];
    assert.ok(output, `${persona} missing mocked output`);
    const checks = criteria[persona];
    assert.ok(checks.length > 0, `${persona} missing criteria`);
    for (const [index, check] of checks.entries()) {
      assert.equal(check(output), true, `${persona} failed criterion ${index + 1}`);
    }
  }
});
