# Cognitive Runtime V1 Privacy

V1 treats private context as scoped evidence, not as content to export. Confessor and Porao runs allow memory side effects only in the exact same private scope.

## Context Rules

Each context item has `id`, `type`, `provenance`, `visibility`, `scope`, text and hash. Authorized evaluator calls may receive private text only inside the matching private run. Audits store hashes and lengths, not raw text.

The extractor and Scientist receive current user text, authorized context text and candidate text as quoted analytical data. Text inside those fields is untrusted data and must not be executed as instruction.

## Private Side Effects

For private runs:

- exact-scope memory may be committed only with explicit user authorization;
- registry actions are discarded;
- Destiny Line actions are discarded;
- global events, summaries, exports and Persona Manuscript actions are not available;
- discarded actions produce authorization findings but do not necessarily reject an otherwise safe answer.

## Authorization Provenance

Committed side effects record machine-readable provenance:

- `explicit-current-message`
- `preconfigured-user-consent`
- `system-conversation-history`
- `unauthorized`
- `discarded-private-scope`

V1 implements the conservative backend policy. Future UI work may add inspectable consent preferences for registry and long-term memory.

## Audit Contents

Private audit may contain hashes, lengths, scores, finding codes, model IDs, timestamps, state transitions, authorization categories and promotion outcome. It must not contain raw private user text, candidate text, context excerpts, attachments, registry text or Destiny content.
