CREATE TABLE IF NOT EXISTS persona_manuscript_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  source_module TEXT NOT NULL,
  source_entity_type TEXT,
  source_entity_id TEXT,
  factual_summary TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  sensitivity TEXT NOT NULL DEFAULT 'internal',
  importance_score INTEGER NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'pending',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  excluded_reason TEXT
);

CREATE TABLE IF NOT EXISTS persona_manuscripts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  date_key TEXT NOT NULL,
  title TEXT,
  body TEXT NOT NULL,
  entry_type TEXT NOT NULL,
  tone TEXT NOT NULL,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
  interpretation_level TEXT NOT NULL DEFAULT 'mixed',
  salience_score INTEGER NOT NULL DEFAULT 0,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  generation_version TEXT NOT NULL DEFAULT 'v1',
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS persona_manuscript_sources (
  id TEXT PRIMARY KEY,
  manuscript_id TEXT NOT NULL,
  event_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS persona_manuscript_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  source_modules_json TEXT NOT NULL DEFAULT '[]',
  minimum_salience INTEGER NOT NULL DEFAULT 35,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS persona_manuscript_settings (
  user_id TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  frequency TEXT NOT NULL DEFAULT 'equilibrada',
  notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  allowed_source_modules_json TEXT NOT NULL DEFAULT '["agenda","destiny-line","registros","projects","tasks","persona-chat","system"]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS persona_manuscript_generations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date_key TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_code TEXT,
  generated_count INTEGER NOT NULL DEFAULT 0,
  idempotency_key TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS persona_manuscript_events_user_id_idx ON persona_manuscript_events(user_id);
CREATE INDEX IF NOT EXISTS persona_manuscript_events_occurred_at_idx ON persona_manuscript_events(occurred_at);
CREATE INDEX IF NOT EXISTS persona_manuscript_events_processed_at_idx ON persona_manuscript_events(processed_at);
CREATE INDEX IF NOT EXISTS persona_manuscript_events_source_module_idx ON persona_manuscript_events(source_module);
CREATE INDEX IF NOT EXISTS persona_manuscript_events_source_entity_id_idx ON persona_manuscript_events(source_entity_id);
CREATE INDEX IF NOT EXISTS persona_manuscripts_user_id_idx ON persona_manuscripts(user_id);
CREATE INDEX IF NOT EXISTS persona_manuscripts_persona_id_idx ON persona_manuscripts(persona_id);
CREATE INDEX IF NOT EXISTS persona_manuscripts_date_key_idx ON persona_manuscripts(date_key);
CREATE UNIQUE INDEX IF NOT EXISTS persona_manuscripts_idempotency_key_idx ON persona_manuscripts(idempotency_key);
CREATE INDEX IF NOT EXISTS persona_manuscript_sources_manuscript_id_idx ON persona_manuscript_sources(manuscript_id);
CREATE INDEX IF NOT EXISTS persona_manuscript_sources_event_id_idx ON persona_manuscript_sources(event_id);
CREATE UNIQUE INDEX IF NOT EXISTS persona_manuscript_preferences_user_persona_idx ON persona_manuscript_preferences(user_id, persona_id);
CREATE INDEX IF NOT EXISTS persona_manuscript_generations_user_date_idx ON persona_manuscript_generations(user_id, date_key);
CREATE UNIQUE INDEX IF NOT EXISTS persona_manuscript_generations_idempotency_key_idx ON persona_manuscript_generations(idempotency_key);
