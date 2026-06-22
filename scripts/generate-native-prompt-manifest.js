const fs = require("fs");
const crypto = require("crypto");

const prompts = JSON.parse(fs.readFileSync("prompts.json", "utf8"));
const entries = Object.fromEntries(
  Object.entries(prompts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, prompt]) => [
      key,
      {
        sha256: crypto.createHash("sha256").update(String(prompt), "utf8").digest("hex"),
        length: String(prompt).length,
      },
    ]),
);

const manifest = {
  generatedAt: new Date().toISOString(),
  algorithm: "sha256",
  source: "prompts.json",
  promptCount: Object.keys(entries).length,
  entries,
};

fs.writeFileSync(
  "app/data/nativePersonaPromptManifest.json",
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify({
  ok: true,
  promptCount: manifest.promptCount,
  output: "app/data/nativePersonaPromptManifest.json",
}));
