-- Adds the split between external publication visibility and internal cognitive visibility.
-- Also creates a derived context index for Destiny Line retrieval without duplicating
-- biographical events into userMemory.

ALTER TABLE sovereign_destiny_events
  ADD COLUMN IF NOT EXISTS external_visibility TEXT NOT NULL DEFAULT 'private';

ALTER TABLE sovereign_destiny_events
  ADD COLUMN IF NOT EXISTS cognitive_visibility TEXT NOT NULL DEFAULT 'all-public-personas';

ALTER TABLE sovereign_destiny_events
  ADD COLUMN IF NOT EXISTS cognitive_personas TEXT NOT NULL DEFAULT '[]';

UPDATE sovereign_destiny_events
SET external_visibility = 'legacy'
WHERE visibility = 'legacy'
  AND external_visibility = 'private';

UPDATE sovereign_destiny_events
SET cognitive_visibility = 'excluded-from-personas'
WHERE visibility = 'sensitive'
  AND cognitive_visibility = 'all-public-personas';

CREATE INDEX IF NOT EXISTS sovereign_destiny_events_cognitive_visibility_idx
  ON sovereign_destiny_events(cognitive_visibility);

CREATE TABLE IF NOT EXISTS sovereign_destiny_context_index (
  destiny_event_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  searchable_text TEXT NOT NULL,
  categories TEXT NOT NULL DEFAULT '[]',
  persona_affinities TEXT NOT NULL DEFAULT '[]',
  temporal_importance DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  biographical_importance DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sovereign_destiny_context_index_user_id_idx
  ON sovereign_destiny_context_index(user_id);

INSERT INTO sovereign_destiny_context_index (
  destiny_event_id,
  user_id,
  searchable_text,
  categories,
  persona_affinities,
  temporal_importance,
  biographical_importance,
  updated_at
)
SELECT
  id,
  user_id,
  CONCAT_WS(' | ',
    title,
    category,
    short_description,
    long_description,
    dominant_emotion,
    associated_persona,
    associated_place,
    life_phase,
    tags
  ),
  CASE
    WHEN life_phase IS NULL OR life_phase = '' THEN jsonb_build_array(category)::text
    ELSE jsonb_build_array(category, life_phase)::text
  END,
  CASE
    WHEN associated_persona IS NULL OR associated_persona = '' THEN '[]'
    ELSE jsonb_build_array(associated_persona)::text
  END,
  LEAST(1.0, GREATEST(0.2,
    0.35
    + CASE WHEN event_date IS NOT NULL OR event_date_label IS NOT NULL THEN 0.2 ELSE 0 END
    + CASE WHEN life_phase IS NOT NULL AND life_phase <> '' THEN 0.15 ELSE 0 END
    + COALESCE(symbolic_intensity, 2) / 25.0
  )),
  LEAST(1.0, GREATEST(0.2,
    0.35
    + CASE WHEN category IN ('Familia', 'Saude', 'Carreira', 'Obra', 'Criacao', 'Perda', 'Virada', 'Travessia', 'Relacoes') THEN 0.25 ELSE 0 END
    + COALESCE(symbolic_intensity, 2) / 20.0
    + CASE WHEN long_description IS NOT NULL AND LENGTH(long_description) > 80 THEN 0.1 ELSE 0 END
  )),
  NOW()
FROM sovereign_destiny_events
ON CONFLICT (destiny_event_id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  searchable_text = EXCLUDED.searchable_text,
  categories = EXCLUDED.categories,
  persona_affinities = EXCLUDED.persona_affinities,
  temporal_importance = EXCLUDED.temporal_importance,
  biographical_importance = EXCLUDED.biographical_importance,
  updated_at = NOW();
