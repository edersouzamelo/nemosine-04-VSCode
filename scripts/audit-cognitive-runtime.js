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
  "prisma/manual_migrations/20260622_add_cognitive_run_audits.sql",
  "app/data/nativePersonaPromptManifest.json",
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
const report = {
  ok: missingFiles.length === 0 && promptMismatches.length === 0,
  checkedAt: new Date().toISOString(),
  requiredFiles,
  missingFiles,
  promptManifest: {
    promptCount: manifest.promptCount,
    actualPromptCount: Object.keys(prompts).length,
    mismatches: promptMismatches,
  },
};

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
