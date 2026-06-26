# Cognitive Runtime V1 Privacy

The privacy model is enforced before generation, during evaluation and in audit persistence.

Rules:

- Confessor and Porao material is private.
- Private context is authorized only inside the matching private run scope.
- Public personas must not receive, summarize, infer or mention private-only content.
- Rejected candidates are not delivered.
- Runtime audit stores hashes, lengths, counts, transitions and finding codes only.
- Machine Room views must remain metadata-first and must not expose raw prompts, raw memories, private content or rejected candidate text.

Persona initiative follows the same wall: private context can become an active front only when `privateRun` is true.
