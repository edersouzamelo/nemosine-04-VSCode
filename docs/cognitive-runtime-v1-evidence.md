# Cognitive Runtime V1 Evidence

This file records the evidence expected for the V1 PR. The final command results are reported by Codex at handoff.

## Example Redacted Audit Trace

```json
{
  "runId": "example-run",
  "runtimeMode": "enforce",
  "executionProfile": "standard",
  "stateTransitions": [
    { "from": "RECEIVED", "to": "AUTHORIZED", "allowed": true },
    { "from": "AUTHORIZED", "to": "CONTEXT_ASSEMBLED", "allowed": true },
    { "from": "CONTEXT_ASSEMBLED", "to": "MODULES_SELECTED", "allowed": true },
    { "from": "MODULES_SELECTED", "to": "CANDIDATE_GENERATED", "allowed": true },
    { "from": "CANDIDATE_GENERATED", "to": "CLAIMS_EXTRACTED", "allowed": true },
    { "from": "CLAIMS_EXTRACTED", "to": "SCIENTIST_EVALUATED", "allowed": true },
    { "from": "SCIENTIST_EVALUATED", "to": "VIGIA_SCORED", "allowed": true },
    { "from": "VIGIA_SCORED", "to": "OCV_CONVERGED", "allowed": true },
    { "from": "OCV_CONVERGED", "to": "PHILOSOPHER_EVALUATED", "allowed": true },
    { "from": "PHILOSOPHER_EVALUATED", "to": "PROMOTION_EVALUATED", "allowed": true },
    { "from": "PROMOTION_EVALUATED", "to": "PROMOTED", "allowed": true },
    { "from": "PROMOTED", "to": "SIDE_EFFECTS_COMMITTED", "allowed": true },
    { "from": "SIDE_EFFECTS_COMMITTED", "to": "DELIVERED", "allowed": true }
  ],
  "contentHashes": {
    "userText": "sha256...",
    "displayUserText": "sha256...",
    "finalCandidate": "sha256..."
  },
  "findingCodes": [],
  "metadataOnly": true
}
```

## Required Demonstrations

- Rejected text is retained internally for tests but not streamed in enforce mode.
- Rejected proposed side effects are not committed.
- Unauthorized Destiny actions are discarded.
- Native prompt manifest verifies `prompts.json` byte content.
- `app/api/sovereign/pure-chat/route.ts` remains outside the persona O-C-V pipeline.
