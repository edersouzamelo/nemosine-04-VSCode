# Cognitive Runtime V1 Gap Matrix

| Area | Status | Note |
| --- | --- | --- |
| Native prompt resolution | Implemented | Uses `nativePersonaPrompts` with entity fallback. |
| Context envelope | Implemented | Uses authorized memories, episodes, sources, agenda, registros, Destiny Line and active place. |
| Privacy wall | Implemented | Private context is blocked outside matching private runs. |
| Candidate validation before delivery | Implemented in runtime; implemented in `/api/chat` buffered legacy path | Prevents rejected candidates from streaming to the user. |
| Persona initiative | Implemented | Low-information input classification, active-front snapshot, initiative brief and deterministic quality gate. |
| Audit redaction | Implemented | Stores hashes, counts, scores and codes, not raw content. |
| Multi-provider architecture | Out of scope | No new provider or Ollama fallback added. |
| Legal patent audit | Out of scope | This matrix is technical only. |
