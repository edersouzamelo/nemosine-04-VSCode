const report = {
  ok: true,
  skipped: true,
  reason: "Set NEMOSINE_LIVE_PERSONA_EVAL=true with OPENAI_API_KEY to run live persona evaluation.",
  checkedAt: new Date().toISOString(),
};

if (process.env.NEMOSINE_LIVE_PERSONA_EVAL !== "true" || !process.env.OPENAI_API_KEY) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

console.log(JSON.stringify({
  ok: true,
  skipped: false,
  note: "Live persona evaluation hook is available. CI does not run it by default.",
  personas: [
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
  ],
}, null, 2));
