# Cognitive Runtime V1 Privacy

V1 centralizes runtime context visibility in `privacy-policy.ts` and uses metadata-only audit defaults.

## Context Items

Every runtime context item carries:

- `id`
- `type`
- `provenance`
- `visibility`
- `scope`
- `sha256 hash`

Private items are allowed only when the active persona or active place authorizes the same private scope.

## Confessor And Porao

Confessor and Porao content must not appear in another persona context, another private space, debug previews, audit text, error messages or validator prompts outside an authorized private run. V1 enforces this by:

- reusing existing private-space checks;
- filtering context through `authorizeContextItems`;
- recording blocked context IDs, not blocked text;
- making private-run audits metadata-only.

## Debug Audit

`writePromptDebugAudit` no longer writes full system prompt previews or message previews. It writes hashes, lengths, suspicious phrase codes and counts.

## Audit Storage

`CognitiveRunAudit` stores state transitions, scores, finding codes, prompt hashes, content hashes and model identifiers. It does not store raw user text, raw candidate text or private excerpts.

## Known Limitations

V1 cannot prove that a model never semantically paraphrases private material if such material was incorrectly authorized upstream. The central gate is designed to prevent that authorization mistake and the private audit avoids compounding leakage.
