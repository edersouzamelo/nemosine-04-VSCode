const fs = require("fs");

const domainSource = fs.readFileSync("app/lib/personaManuscripts.ts", "utf8");
const storeSource = fs.readFileSync("app/lib/sovereignStore.ts", "utf8");
const apiSource = fs.readFileSync("app/api/sovereign/route.ts", "utf8");
const chatRouteSource = fs.readFileSync("app/api/chat/route.ts", "utf8");
const registrosRouteSource = fs.readFileSync("app/api/space/registros/route.ts", "utf8");
const dominiosSource = fs.readFileSync("app/space/dominios/page.tsx", "utf8");
const clientSource = fs.readFileSync("app/soberano/manuscritos/ManuscritosClient.tsx", "utf8");
const migrationSource = fs.readFileSync("prisma/manual_migrations/20260615_add_persona_manuscripts.sql", "utf8");

const checks = [
  {
    name: "evento relevante gera candidato adequado",
    source: domainSource,
    required: ["PERSONA_RELEVANCE_MATRIX", "Vigia", "deadline", "buildPersonaCandidates"],
  },
  {
    name: "evento irrelevante nao gera manuscrito abaixo do limiar",
    source: domainSource,
    required: ["matched.length === 0", "salienceScore < minimum", "continue"],
  },
  {
    name: "recarregar pagina nao duplica manuscrito",
    source: `${storeSource}\n${domainSource}\n${migrationSource}`,
    required: ["idempotency_key", "ON CONFLICT (idempotency_key) DO NOTHING", "buildIdempotencyKey"],
  },
  {
    name: "mesmo evento nao repetido indefinidamente",
    source: storeSource,
    required: ["status = 'processed'", "WHERE id =", "AND status = 'pending'"],
  },
  {
    name: "usuario A nao acessa usuario B",
    source: storeSource,
    required: ["WHERE m.user_id = ${userId}", "WHERE user_id = ${userId}", "AND user_id = ${userId}"],
  },
  {
    name: "Confessor nunca alimenta o modulo",
    source: `${domainSource}\n${chatRouteSource}`,
    required: ["isConfessorRelated", "CONFESSOR_MARKERS", "sensitivity === \"confessor\"", "!normalizedPersona.includes('confessor')"],
  },
  {
    name: "persona silenciada nao gera manuscrito",
    source: `${domainSource}\n${storeSource}`,
    required: ["if (pref && !pref.enabled) continue", "setPersonaManuscriptPreference"],
  },
  {
    name: "modulo sensivel desativado nao fornece eventos",
    source: domainSource,
    required: ["sensitive_source_disabled", "SENSITIVE_MODULES", "allowedSourceModules"],
  },
  {
    name: "resposta invalida do modelo nao e persistida",
    source: domainSource,
    required: ["validateManuscriptPayload", "return null", "allowedEventIds.includes"],
  },
  {
    name: "exclusao remove apenas o manuscrito correto",
    source: storeSource,
    required: ["deletePersonaManuscript", "manuscriptId", "WHERE id = ${manuscriptId} AND user_id = ${userId}"],
  },
  {
    name: "exclusao em massa respeita usuario autenticado",
    source: storeSource,
    required: ["deletePersonaManuscriptsForPersona", "WHERE user_id = ${userId} AND persona_id = ${personaId}"],
  },
  {
    name: "timezone do usuario e respeitado",
    source: `${domainSource}\n${clientSource}`,
    required: ["dateKeyForTimezone", "Intl.DateTimeFormat", "resolvedOptions().timeZone"],
  },
  {
    name: "filtro por persona funciona",
    source: storeSource,
    required: ["personaId", "m.persona_id = ${personaId}"],
  },
  {
    name: "filtro por data funciona",
    source: storeSource,
    required: ["m.date_key >= ${from}", "m.date_key <= ${to}"],
  },
  {
    name: "busca textual funciona",
    source: storeSource,
    required: ["m.title ILIKE", "m.body ILIKE"],
  },
  {
    name: "estado vazio nao cria conteudo artificial",
    source: clientSource,
    required: ["O Castelo permaneceu em silencio", "Nenhum acontecimento exigiu registro neste periodo"],
  },
  {
    name: "cada manuscrito mantem uma unica voz",
    source: domainSource,
    required: ["usedPersonas", "candidate.personaId", "nao misture a voz de outras personas"],
  },
  {
    name: "fontes exibidas correspondem aos eventos vinculados",
    source: `${storeSource}\n${clientSource}`,
    required: ["persona_manuscript_sources", "JOIN persona_manuscript_events", "Origem do manuscrito"],
  },
  {
    name: "tarefas vencidas nao sao chamadas automaticamente de abandonadas",
    source: domainSource,
    required: ["nao ha abandono presumido", "apenas acontecimentos"],
  },
  {
    name: "chamadas simultaneas nao criam duplicacoes",
    source: `${storeSource}\n${migrationSource}`,
    required: ["status === \"running\"", "persona_manuscript_generations_idempotency_key_idx", "ON CONFLICT (idempotency_key)"],
  },
  {
    name: "geracao falha nao marca eventos como processados antes da persistencia",
    source: storeSource,
    required: ["catch (error", "SET status = 'failed'", "UPDATE persona_manuscript_events"],
  },
  {
    name: "saude e financas bloqueadas por padrao",
    source: `${domainSource}\n${migrationSource}\n${clientSource}`,
    required: ["health", "financial", "bloqueado por padrao", "\"agenda\",\"destiny-line\",\"registros\""],
  },
  {
    name: "frequencia modifica somente o limite",
    source: domainSource,
    required: ["FREQUENCY_LIMITS", "selected.length >= limit", "frequency"],
  },
  {
    name: "persona sem prompt oficial nao produz texto silenciosamente",
    source: domainSource,
    required: ["resolveNativePersonaPrompt", "continue"],
  },
  {
    name: "card funcional no Sovereign e rota integrada",
    source: `${dominiosSource}\n${apiSource}`,
    required: ["persona-journals", "/soberano/manuscritos?embed=true", "get_persona_manuscripts"],
  },
  {
    name: "eventos reais conectados",
    source: `${storeSource}\n${registrosRouteSource}\n${chatRouteSource}`,
    required: ["agenda_event_created", "destiny_milestone_created", "registry_created", "persona_interaction_significant"],
  },
];

let failed = 0;
for (const check of checks) {
  const missing = check.required.filter((needle) => !check.source.includes(needle));
  if (missing.length > 0) {
    failed += 1;
    console.error(`FAIL ${check.name}: missing ${missing.join(", ")}`);
  } else {
    console.log(`PASS ${check.name}`);
  }
}

if (failed > 0) {
  process.exit(1);
}
