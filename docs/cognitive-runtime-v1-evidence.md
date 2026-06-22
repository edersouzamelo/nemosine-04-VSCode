# Cognitive Runtime V1 Evidence

Final command evidence is reported at handoff from the clean worktree. This file records the expected evidence shape.

## Example Redacted Audit

```json
{
  "runId": "example-run",
  "runtimeMode": "enforce",
  "executionProfile": "full",
  "auditEvents": [
    {
      "code": "REBALANCING_APPLIED",
      "detail": {
        "requestedProfile": "light",
        "selectedProfile": "full",
        "highStakes": true,
        "symbolicConfigurationChanged": false
      }
    }
  ],
  "contentHashes": {
    "userText": "sha256...",
    "displayUserText": "sha256...",
    "finalCandidate": "sha256..."
  },
  "contentLengths": {
    "userText": 120,
    "displayUserText": 120,
    "finalCandidate": 480
  },
  "findingCodes": [],
  "metadataOnly": true
}
```

## Required Demonstrations

- Clean worktree builds independently from commit `7efec056bbf2f5734c794fad9993b9f6ce52f4e5`.
- No Persona Manuscripts files or imports enter the branch.
- Native prompt checksums remain unchanged.
- Deterministic Scientist and Philosopher findings survive permissive LLM validators.
- Scientist `approved=false`, error findings and dimension floors block promotion.
- High-stakes input cannot run as `light`.
- Private runs discard registry and Destiny actions.
- Rejected candidate text is not streamed or persisted as an assistant answer.
- Theta `0.80` boundary and hard-failure override are tested.
- Audit persistence failure follows the documented policy and uses no raw private content.
