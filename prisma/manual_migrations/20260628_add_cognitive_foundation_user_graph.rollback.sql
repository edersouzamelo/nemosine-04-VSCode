-- Rollback for the additive cognitive foundation migration.
-- Drops only objects introduced by 20260628_add_cognitive_foundation_user_graph.sql.

DROP TABLE IF EXISTS "CognitiveFoundationAudit";
DROP TABLE IF EXISTS "UserProfileEvidence";
DROP TABLE IF EXISTS "UserProfileNode";

DROP TYPE IF EXISTS "UserProfileScopeType";
DROP TYPE IF EXISTS "UserProfileSensitivity";
DROP TYPE IF EXISTS "UserProfileStatus";
DROP TYPE IF EXISTS "UserProfileEpistemicType";
