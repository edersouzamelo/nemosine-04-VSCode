export type RastroTipo =
  | "uso_persona"
  | "registro_manual"
  | "meta_criada"
  | "meta_concluida"
  | "decisao"
  | "treino"
  | "financeiro"
  | "saude"
  | "estudo"
  | "publicacao"
  | "travessia"
  | "sistema";

export type RastroStatus = "bruto" | "classificado" | "ignorado" | "aplicado";

export type EvidenciaCategoria =
  | "disciplina"
  | "coragem"
  | "clareza"
  | "responsabilidade"
  | "autocontrole"
  | "constancia"
  | "reparacao"
  | "criacao"
  | "aprendizado"
  | "cuidado"
  | "verdade"
  | "enfrentamento";

export type BossStatus = "bloqueado" | "ativo" | "enfraquecido" | "derrotado";
export type ReliquiaStatus = "bloqueada" | "disponivel" | "conquistada";
export type MetaStatus = "ativa" | "concluida" | "pausada" | "cancelada";

export interface RastroEventInput {
  userId: string;
  tipo: RastroTipo;
  origem: string;
  titulo: string;
  descricao: string;
  payload?: unknown;
  evidencia?: string | null;
  tags?: string[];
}

export interface RastroEvent {
  id: string;
  userId: string;
  tipo: RastroTipo;
  origem: string;
  titulo: string;
  descricao: string;
  payload: unknown | null;
  dataHora: string;
  evidencia: string | null;
  status: RastroStatus;
  tags: string[];
}

export interface VigiaEvidence {
  rastroId: string;
  categoria: EvidenciaCategoria;
  intensidade: number;
  confianca: number;
  justificativa: string;
  sugestaoVinculo: string | null;
}

export interface TravessiaBoss {
  id: string;
  nome: string;
  descricao: string;
  categoria: EvidenciaCategoria;
  evidenciasNecessarias: number;
  evidenciasAtuais: number;
  status: BossStatus;
}

export interface TravessiaReliquia {
  id: string;
  nome: string;
  descricao: string;
  bossAssociado: string;
  condicaoDeDesbloqueio: string;
  status: ReliquiaStatus;
}

export interface TravessiaMeta {
  id: string;
  titulo: string;
  descricao: string;
  bossAssociado?: string | null;
  categoria: EvidenciaCategoria;
  progresso: number;
  evidenciasVinculadas: string[];
  status: MetaStatus;
}

export interface TravessiaSealDraft {
  uid_selo: string;
  userId: string;
  bosses: string[];
  reliquias: string[];
  inimigo: string | null;
  mentor_atestado: string | null;
  tribunal_parecer: string | null;
  orquestrador_carimbo: string | null;
  hash_registros: string | null;
  data_selo: string | null;
  assinatura: string | null;
}

export interface TravessiaSnapshot {
  progressoGeral: number;
  bossAtivo: TravessiaBoss | null;
  proximaEvidenciaRecomendada: EvidenciaCategoria | null;
  bosses: TravessiaBoss[];
  reliquias: TravessiaReliquia[];
  metas: TravessiaMeta[];
  rastros: RastroEvent[];
  evidencias: VigiaEvidence[];
  selo: TravessiaSealDraft;
}
