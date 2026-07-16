const fs = require("fs");
const crypto = require("crypto");

function exists(path) {
  return fs.existsSync(path);
}

function hash(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

const requiredFiles = [
  "app/lib/nemosine/cognitive-runtime/types.ts",
  "app/lib/nemosine/cognitive-runtime/config.ts",
  "app/lib/nemosine/cognitive-runtime/state-machine.ts",
  "app/lib/nemosine/cognitive-runtime/orchestrator.ts",
  "app/lib/nemosine/cognitive-runtime/vigia-coherence.ts",
  "docs/cognitive-runtime-v1-architecture.md",
  "docs/cognitive-runtime-v1-gap-matrix.md",
  "docs/cognitive-runtime-v1-state-machine.md",
  "docs/cognitive-runtime-v1-privacy.md",
  "docs/cognitive-runtime-v1-rollout.md",
  "docs/cognitive-runtime-v1-evidence.md",
  "docs/cognitive-runtime-v1-patent-traceability.md",
  "docs/cognitive-runtime-v1-scm-fidelity.md",
  "docs/cognitive-runtime-v1-coherence-formalization.md",
  "prisma/migrations/202607150001_ocv_baseline_current_state/migration.sql",
  "prisma/migrations/202607150002_ocv_foundation_additive/migration.sql",
  "prisma/migrations/202607150003_ocv_audit_theta/migration.sql",
  "prisma/manual_migrations/20260622_add_cognitive_run_audits.sql",
  "app/data/nativePersonaPromptManifest.json",
];

const forbiddenPaths = [
  "app/lib/personaManuscripts.ts",
  "app/soberano/manuscritos",
  "app/sovereign/manuscritos",
  "prisma/manual_migrations/20260615_add_persona_manuscripts.sql",
  "test_persona_manuscripts.js",
];

const runtimeFiles = [
  "app/lib/nemosine/cognitive-runtime/side-effect-committer.ts",
  "app/lib/nemosine/cognitive-runtime/orchestrator.ts",
  "app/lib/nemosine/cognitive-runtime/types.ts",
];

const forbiddenRuntimePatterns = [
  "logPersonaManuscriptEvent",
  "personaManuscript",
  "PersonaManuscript",
  "manuscritos",
];

const prompts = JSON.parse(fs.readFileSync("prompts.json", "utf8"));
const manifest = JSON.parse(fs.readFileSync("app/data/nativePersonaPromptManifest.json", "utf8"));
const promptMismatches = Object.entries(prompts).flatMap(([key, prompt]) => {
  const entry = manifest.entries[key];
  if (!entry) return [{ key, reason: "missing" }];
  const actual = hash(String(prompt));
  return actual === entry.sha256 ? [] : [{ key, reason: "sha256-mismatch" }];
});

const missingFiles = requiredFiles.filter((file) => !exists(file));
const presentForbiddenPaths = forbiddenPaths.filter((file) => exists(file));
const runtimePatternHits = runtimeFiles.flatMap((file) => {
  if (!exists(file)) return [];
  const source = fs.readFileSync(file, "utf8");
  return forbiddenRuntimePatterns
    .filter((pattern) => source.includes(pattern))
    .map((pattern) => ({ file, pattern }));
});
const chatRouteSource = exists("app/api/chat/route.ts") ? fs.readFileSync("app/api/chat/route.ts", "utf8") : "";
const collectiveSource = exists("app/lib/nemosine/collective_chat_orchestrator.ts")
  ? fs.readFileSync("app/lib/nemosine/collective_chat_orchestrator.ts", "utf8")
  : "";
const pureChatSource = exists("app/api/sovereign/pure-chat/route.ts")
  ? fs.readFileSync("app/api/sovereign/pure-chat/route.ts", "utf8")
  : "";
const chatRuntimeEnforce = chatRouteSource.indexOf('if (runtimeConfig.mode === "enforce")');
const chatPipelineEnforce = chatRouteSource.indexOf('if (responsePipelineConfig.mode === "enforce")');
const collectiveRuntimeEnforce = collectiveSource.indexOf('if (runtimeConfig.mode === "enforce")');
const collectiveLegacyEffectsAfterRuntime = collectiveSource.indexOf("commitPersonaLegacyEffects({", collectiveRuntimeEnforce);
const routeContract = {
  chatRuntimeEnforceBeforeResponsePipeline: chatRuntimeEnforce > 0
    && chatPipelineEnforce > 0
    && chatRuntimeEnforce < chatPipelineEnforce,
  chatNavigationUsesRuntimeOverride: /conversationNavigationAnswer[\s\S]+deliverEnforcedCognitiveRuntime/.test(chatRouteSource),
  chatDeliveryContractHeader: /x-cognitive-delivery-contract['"]:\s*['"]ocv-promotion-gate/.test(chatRouteSource),
  collectiveRuntimeEnforceBeforeLegacyEffects: collectiveRuntimeEnforce > 0
    && collectiveLegacyEffectsAfterRuntime > collectiveRuntimeEnforce,
  collectiveRuntimePersistsPersonaMessage: /const persistPromotedPersonaMessage = async \(\{ answer \}:\s*\{ answer: string \}\)/.test(collectiveSource)
    && /persistAssistantMessage:\s*persistPromotedPersonaMessage/.test(collectiveSource)
    && /updatePersonaMessageGeneration\(input\.round\.userId, input\.messageId, answer, "COMPLETED"\)/.test(collectiveSource),
  pureChatBufferedBeforeBasalSafety: !pureChatSource.includes("streamText")
    && /generateText/.test(pureChatSource)
    && /evaluateBasalPureChatSafety\(result\.text \|\| ""\)/.test(pureChatSource),
};
const failedRouteContracts = Object.entries(routeContract)
  .filter(([, passed]) => !passed)
  .map(([name]) => name);
const report = {
  ok: missingFiles.length === 0
    && promptMismatches.length === 0
    && presentForbiddenPaths.length === 0
    && runtimePatternHits.length === 0
    && failedRouteContracts.length === 0,
  checkedAt: new Date().toISOString(),
  requiredFiles,
  missingFiles,
  forbiddenPaths: {
    checked: forbiddenPaths,
    present: presentForbiddenPaths,
    runtimePatternHits,
  },
  promptManifest: {
    promptCount: manifest.promptCount,
    actualPromptCount: Object.keys(prompts).length,
    mismatches: promptMismatches,
  },
  routeContract: {
    checks: routeContract,
    failed: failedRouteContracts,
  },
};

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
