import { PrismaClient } from "@prisma/client";
import { analyzeRastrosByVigia } from "./vigia";
import { getRecentRastros, syncRastrosFromExistingActivity, updateRastroStatus } from "./rastros";
import type {
  EvidenciaCategoria,
  TravessiaBoss,
  TravessiaMeta,
  TravessiaReliquia,
  TravessiaSealDraft,
  TravessiaSnapshot,
  VigiaEvidence,
} from "./types";

const prisma = new PrismaClient();

type BossDefinition = Omit<TravessiaBoss, "evidenciasAtuais" | "status">;
type ReliquiaDefinition = Omit<TravessiaReliquia, "status">;
type MetaDefinition = Omit<TravessiaMeta, "progresso" | "evidenciasVinculadas" | "status">;

export const travessiaBossDefinitions: BossDefinition[] = [
  { id: "distracao", nome: "Distração", descricao: "Fragmentação da atenção e perda de centro narrativo.", categoria: "clareza", evidenciasNecessarias: 5 },
  { id: "inercia", nome: "Inércia", descricao: "Resistência ao primeiro movimento e adiamento do gesto concreto.", categoria: "disciplina", evidenciasNecessarias: 5 },
  { id: "procrastinacao", nome: "Procrastinação", descricao: "Fuga organizada sob a aparência de espera racional.", categoria: "enfrentamento", evidenciasNecessarias: 5 },
  { id: "desorganizacao", nome: "Desorganização", descricao: "Perda de ordem prática, prioridade e consequência.", categoria: "responsabilidade", evidenciasNecessarias: 5 },
  { id: "ansiedade", nome: "Ansiedade", descricao: "Antecipação excessiva que exige coragem e autocontrole.", categoria: "coragem", evidenciasNecessarias: 5 },
  { id: "descuido", nome: "Descuido", descricao: "Negligência de corpo, rotina e manutenção vital.", categoria: "cuidado", evidenciasNecessarias: 5 },
  { id: "desanimo", nome: "Desânimo", descricao: "Quebra de constância e perda de energia de continuidade.", categoria: "constancia", evidenciasNecessarias: 5 },
];

export const travessiaReliquiaDefinitions: ReliquiaDefinition[] = [
  {
    id: "reliquia_foco",
    nome: "Relíquia do Foco",
    descricao: "Conquistada quando a clareza deixa de ser insight e vira direção.",
    bossAssociado: "distracao",
    condicaoDeDesbloqueio: "Derrotar Distração.",
  },
  {
    id: "reliquia_movimento",
    nome: "Relíquia do Movimento",
    descricao: "Conquistada quando a ação vence a paralisia inicial.",
    bossAssociado: "inercia",
    condicaoDeDesbloqueio: "Derrotar Inércia.",
  },
  {
    id: "reliquia_ordem",
    nome: "Relíquia da Ordem",
    descricao: "Conquistada quando a responsabilidade organiza a casa mental.",
    bossAssociado: "desorganizacao",
    condicaoDeDesbloqueio: "Derrotar Desorganização.",
  },
];

export const travessiaMetaDefinitions: MetaDefinition[] = [
  {
    id: "meta_clareza",
    titulo: "Sustentar clareza operacional",
    descricao: "Transformar consultas e registros em decisões menos nebulosas.",
    bossAssociado: "distracao",
    categoria: "clareza",
  },
  {
    id: "meta_constancia",
    titulo: "Provar constância",
    descricao: "Acumular evidências reais de continuidade.",
    bossAssociado: "desanimo",
    categoria: "constancia",
  },
  {
    id: "meta_responsabilidade",
    titulo: "Assumir consequência",
    descricao: "Converter intenção em registro, prazo, cuidado financeiro ou decisão aplicada.",
    bossAssociado: "desorganizacao",
    categoria: "responsabilidade",
  },
];

async function ensureTravessiaAuditTables() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS travessia_vigia_evidences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      rastro_id TEXT NOT NULL,
      categoria TEXT NOT NULL,
      intensidade INTEGER NOT NULL,
      confianca NUMERIC NOT NULL,
      justificativa TEXT NOT NULL,
      sugestao_vinculo TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, rastro_id, categoria)
    )
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS travessia_applied_rastros (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      rastro_id TEXT NOT NULL,
      categoria TEXT NOT NULL,
      boss_id TEXT,
      meta_id TEXT,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, rastro_id, categoria)
    )
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS travessia_application_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      rastro_id TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

function bossForCategory(category: EvidenciaCategoria) {
  return travessiaBossDefinitions.find((boss) => boss.categoria === category) || null;
}

function metaForCategory(category: EvidenciaCategoria) {
  return travessiaMetaDefinitions.find((meta) => meta.categoria === category) || null;
}

async function persistEvidence(userId: string, evidence: VigiaEvidence) {
  await prisma.$executeRaw`
    INSERT INTO travessia_vigia_evidences (id, user_id, rastro_id, categoria, intensidade, confianca, justificativa, sugestao_vinculo)
    VALUES (
      ${crypto.randomUUID()},
      ${userId},
      ${evidence.rastroId},
      ${evidence.categoria},
      ${evidence.intensidade},
      ${evidence.confianca},
      ${evidence.justificativa},
      ${evidence.sugestaoVinculo}
    )
    ON CONFLICT (user_id, rastro_id, categoria) DO NOTHING
  `;
}

async function applyEvidence(userId: string, evidence: VigiaEvidence) {
  const boss = bossForCategory(evidence.categoria);
  const meta = metaForCategory(evidence.categoria);
  const existing = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM travessia_applied_rastros
    WHERE user_id = ${userId}
      AND rastro_id = ${evidence.rastroId}
      AND categoria = ${evidence.categoria}
    LIMIT 1
  `;

  if (existing.length > 0) return;

  await prisma.$executeRaw`
    INSERT INTO travessia_applied_rastros (id, user_id, rastro_id, categoria, boss_id, meta_id)
    VALUES (
      ${crypto.randomUUID()},
      ${userId},
      ${evidence.rastroId},
      ${evidence.categoria},
      ${boss?.id ?? null},
      ${meta?.id ?? null}
    )
    ON CONFLICT (user_id, rastro_id, categoria) DO NOTHING
  `;

  await prisma.$executeRaw`
    INSERT INTO travessia_application_log (id, user_id, rastro_id, message)
    VALUES (
      ${crypto.randomUUID()},
      ${userId},
      ${evidence.rastroId},
      ${`Rastro aplicado como evidencia de ${evidence.categoria}${boss ? ` para boss ${boss.nome}` : ""}.`}
    )
  `;

  await updateRastroStatus(userId, evidence.rastroId, "aplicado");
}

async function loadPersistedEvidence(userId: string): Promise<VigiaEvidence[]> {
  await ensureTravessiaAuditTables();
  const rows = await prisma.$queryRaw<Array<any>>`
    SELECT rastro_id, categoria, intensidade, confianca, justificativa, sugestao_vinculo
    FROM travessia_vigia_evidences
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 120
  `;

  return rows.map((row) => ({
    rastroId: row.rastro_id,
    categoria: row.categoria,
    intensidade: Number(row.intensidade),
    confianca: Number(row.confianca),
    justificativa: row.justificativa,
    sugestaoVinculo: row.sugestao_vinculo,
  }));
}

function buildBosses(evidences: VigiaEvidence[]): TravessiaBoss[] {
  return travessiaBossDefinitions.map((definition) => {
    const current = evidences
      .filter((evidence) => evidence.categoria === definition.categoria && evidence.confianca >= 0.45)
      .reduce((sum, evidence) => sum + Math.max(1, Math.round(evidence.intensidade / 2)), 0);
    const evidenciasAtuais = Math.min(current, definition.evidenciasNecessarias);
    const ratio = evidenciasAtuais / definition.evidenciasNecessarias;
    const status = ratio >= 1 ? "derrotado" : ratio >= 0.6 ? "enfraquecido" : current > 0 ? "ativo" : "bloqueado";

    return { ...definition, evidenciasAtuais, status };
  });
}

function buildRelics(bosses: TravessiaBoss[]): TravessiaReliquia[] {
  return travessiaReliquiaDefinitions.map((definition) => {
    const boss = bosses.find((item) => item.id === definition.bossAssociado);
    return {
      ...definition,
      status: boss?.status === "derrotado" ? "conquistada" : boss?.status === "enfraquecido" ? "disponivel" : "bloqueada",
    };
  });
}

function buildMetas(evidences: VigiaEvidence[]): TravessiaMeta[] {
  return travessiaMetaDefinitions.map((definition) => {
    const linked = evidences.filter((evidence) => evidence.categoria === definition.categoria);
    const progresso = Math.min(100, linked.reduce((sum, evidence) => sum + evidence.intensidade * 8, 0));
    return {
      ...definition,
      progresso,
      evidenciasVinculadas: linked.map((evidence) => evidence.rastroId),
      status: progresso >= 100 ? "concluida" : "ativa",
    };
  });
}

function buildSeal(userId: string, bosses: TravessiaBoss[], relics: TravessiaReliquia[]): TravessiaSealDraft {
  return {
    uid_selo: `draft-${userId}`,
    userId,
    bosses: bosses.filter((boss) => boss.status === "derrotado").map((boss) => boss.id),
    reliquias: relics.filter((relic) => relic.status === "conquistada").map((relic) => relic.id),
    inimigo: null,
    mentor_atestado: null,
    tribunal_parecer: null,
    orquestrador_carimbo: null,
    hash_registros: null,
    data_selo: null,
    assinatura: null,
  };
}

function buildEmptyTravessiaSnapshot(userId: string): TravessiaSnapshot {
  const bosses = buildBosses([]);
  const reliquias = buildRelics(bosses);
  const metas = buildMetas([]);
  const activeBoss = bosses.find((boss) => boss.status === "bloqueado") || null;

  return {
    progressoGeral: 0,
    bossAtivo: activeBoss,
    proximaEvidenciaRecomendada: activeBoss?.categoria || null,
    bosses,
    reliquias,
    metas,
    rastros: [],
    evidencias: [],
    selo: buildSeal(userId, bosses, reliquias),
  };
}

export async function updateTravessiaFromRastros(userId: string): Promise<TravessiaSnapshot> {
  await ensureTravessiaAuditTables();
  await syncRastrosFromExistingActivity(userId);

  const rastros = await getRecentRastros(userId, 120);
  const generated = await analyzeRastrosByVigia(rastros);

  for (const evidence of generated) {
    await persistEvidence(userId, evidence);
    await applyEvidence(userId, evidence);
  }

  const evidencias = await loadPersistedEvidence(userId);
  const bosses = buildBosses(evidencias);
  const reliquias = buildRelics(bosses);
  const metas = buildMetas(evidencias);
  const activeBoss = bosses.find((boss) => boss.status === "ativo" || boss.status === "enfraquecido")
    || bosses.find((boss) => boss.status === "bloqueado")
    || null;
  const defeatedBosses = bosses.filter((boss) => boss.status === "derrotado").length;
  const progressoGeral = Math.round((bosses.reduce((sum, boss) => sum + boss.evidenciasAtuais / boss.evidenciasNecessarias, 0) / bosses.length) * 100);
  const proximaEvidenciaRecomendada = activeBoss?.categoria || null;

  return {
    progressoGeral,
    bossAtivo: activeBoss,
    proximaEvidenciaRecomendada,
    bosses,
    reliquias,
    metas,
    rastros,
    evidencias,
    selo: buildSeal(userId, bosses, reliquias),
  };
}

export async function getTravessiaSnapshot(userId: string): Promise<TravessiaSnapshot> {
  try {
    return await updateTravessiaFromRastros(userId);
  } catch (error) {
    console.warn("Travessia devonly unavailable; using empty snapshot.", error);
    return buildEmptyTravessiaSnapshot(userId);
  }
}
