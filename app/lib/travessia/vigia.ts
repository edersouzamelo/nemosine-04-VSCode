import type { EvidenciaCategoria, RastroEvent, VigiaEvidence } from "./types";

const tagCategoryMap: Record<string, EvidenciaCategoria> = {
  disciplina: "disciplina",
  constancia: "constancia",
  planejamento: "responsabilidade",
  conclusao: "constancia",
  registro: "clareza",
  estrategia: "clareza",
  decisao: "responsabilidade",
  treino: "disciplina",
  financeiro: "responsabilidade",
  financas: "responsabilidade",
  saude: "cuidado",
  estudo: "aprendizado",
  publicacao: "criacao",
  escrita: "criacao",
  coragem: "coragem",
  verdade: "verdade",
  enfrentamento: "enfrentamento",
};

const typeCategoryMap: Partial<Record<RastroEvent["tipo"], EvidenciaCategoria>> = {
  uso_persona: "clareza",
  registro_manual: "clareza",
  meta_criada: "responsabilidade",
  meta_concluida: "constancia",
  decisao: "responsabilidade",
  treino: "disciplina",
  financeiro: "responsabilidade",
  saude: "cuidado",
  estudo: "aprendizado",
  publicacao: "criacao",
  travessia: "enfrentamento",
  sistema: "clareza",
};

const personaHints: Record<string, EvidenciaCategoria> = {
  mentor: "clareza",
  estrategista: "clareza",
  cientista: "aprendizado",
  mordomo: "responsabilidade",
  treinador: "disciplina",
  medico: "cuidado",
  psicologo: "verdade",
  terapeuta: "cuidado",
  juiz: "responsabilidade",
  bruto: "coragem",
  inimigo: "enfrentamento",
  executor: "disciplina",
  artista: "criacao",
  autor: "criacao",
  vigia: "autocontrole",
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function inferCategory(rastro: RastroEvent): EvidenciaCategoria {
  for (const tag of rastro.tags) {
    const normalized = tag.toLowerCase();
    if (tagCategoryMap[normalized]) return tagCategoryMap[normalized];
  }

  const origin = rastro.origem.toLowerCase();
  for (const [hint, category] of Object.entries(personaHints)) {
    if (origin.includes(hint)) return category;
  }

  return typeCategoryMap[rastro.tipo] || "clareza";
}

function inferIntensity(rastro: RastroEvent) {
  let score = 2;
  if (rastro.tipo === "meta_concluida") score += 2;
  if (rastro.tipo === "travessia") score += 2;
  if (rastro.tipo === "meta_criada" || rastro.tipo === "decisao") score += 1;
  if (rastro.descricao.length > 180) score += 1;
  if (rastro.tags.length >= 2) score += 1;
  return clamp(score, 1, 5);
}

function inferConfidence(rastro: RastroEvent) {
  let confidence = 0.45;
  if (rastro.evidencia) confidence += 0.18;
  if (rastro.tags.length > 0) confidence += 0.12;
  if (rastro.payload) confidence += 0.1;
  if (rastro.status === "ignorado") confidence -= 0.25;
  return clamp(Number(confidence.toFixed(2)), 0, 1);
}

function suggestLink(category: EvidenciaCategoria) {
  const bossByCategory: Partial<Record<EvidenciaCategoria, string>> = {
    disciplina: "inercia",
    constancia: "desanimo",
    responsabilidade: "desorganizacao",
    autocontrole: "impulsividade",
    coragem: "ansiedade",
    verdade: "autoengano",
    enfrentamento: "procrastinacao",
    cuidado: "descuido",
    aprendizado: "confusao",
    criacao: "esterilidade",
    clareza: "distracao",
    reparacao: "culpa",
  };
  const boss = bossByCategory[category];
  return boss ? `boss:${boss}` : null;
}

export async function analyzeRastrosByVigia(rastros: RastroEvent[]): Promise<VigiaEvidence[]> {
  return rastros
    .filter((rastro) => rastro.status !== "ignorado")
    .map((rastro) => {
      const categoria = inferCategory(rastro);
      const intensidade = inferIntensity(rastro);
      const confianca = inferConfidence(rastro);

      return {
        rastroId: rastro.id,
        categoria,
        intensidade,
        confianca,
        justificativa: `Vigia associou ${rastro.tipo} de ${rastro.origem} a ${categoria}, usando tags e origem como sinais auditaveis.`,
        sugestaoVinculo: suggestLink(categoria),
      };
    });
}
