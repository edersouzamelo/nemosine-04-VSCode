# Cognitive Runtime V1 Evidence

Final command evidence is reported at handoff from the clean worktree. This file records the expected evidence shape.

## Example Redacted Audit

```json
{
  "runId": "example-run",
  "runtimeMode": "enforce",
  "executionProfile": "full",
  "deliveryStatus": "persisted",
  "sideEffectStatus": "skipped",
  "memoryEffectCount": 0,
  "registryEffectCount": 0,
  "destinyEffectCount": 0,
  "assistantMessagePersisted": true,
  "auditPersisted": true,
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
- Promoted, safe-rejection and failed-safe final answers are persisted before streaming and survive thread reload.
- Repeated delivery persistence for the same cognitive run ID does not duplicate the assistant message.
- Delivery persistence failure prevents streaming and optional effects.
- Optional-effect rollback preserves the chosen answer and reports `SIDE_EFFECTS_FAILED`.
- `SIDE_EFFECTS_COMMITTED` appears only for a successful optional-effect transaction.
- Theta `0.80` boundary and hard-failure override are tested.
- Audit persistence failure follows the documented policy and uses no raw private content.

## Delivery and Side-Effect Persistence Semantics

Evidence for this branch should show three persistence classes: route-owned user input, essential assistant delivery and optional effects. Enforce-mode stream creation is allowed only after `deliveryStatus=persisted`. Optional effects report `skipped`, `blocked`, `committed` or `failed_rolled_back` independently of the final answer text.

The exact-once mechanism is `Message.cognitiveRunId` with a unique non-null database constraint. Optional memory, Registry, Destiny and conversation episode retention run in one transaction when approved effects exist. Shadow mode is expected to show `deliveryStatus=shadow_external`, no assistant-message insert by the runtime, and skipped runtime optional effects.
