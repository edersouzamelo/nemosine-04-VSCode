import { isAdminEmail } from "./accessControl";

export type IntegrationCapabilityState = "functional" | "dev_only" | "planned" | "hidden";

export type IntegrationCapability = {
  id: string;
  label: string;
  owner: string;
  purpose: string;
  state: IntegrationCapabilityState;
  backend: string;
  decision: string;
};

export const integrationCapabilities: Record<string, IntegrationCapability> = {
  "google-calendar": {
    id: "google-calendar",
    label: "Google Agenda",
    owner: "Arauto",
    purpose: "calendario e compromissos",
    state: "functional",
    backend: "/api/google/calendar/status, /api/google/calendar/events, /api/google/calendar/reconnect, NextAuth Google OAuth",
    decision: "Visivel como integracao funcional para usuarios autenticados.",
  },
  "linkedin": {
    id: "linkedin",
    label: "LinkedIn",
    owner: "Mentor",
    purpose: "trajetoria profissional",
    state: "dev_only",
    backend: "Ausente; ha apenas modal informativo sem OAuth, persistencia ou sincronizacao.",
    decision: "Dev-Only em azul para a conta proprietaria; ausente para demais usuarios.",
  },
  "google-health": {
    id: "google-health",
    label: "Google Health",
    owner: "Treinador",
    purpose: "dados de saude",
    state: "dev_only",
    backend: "Ausente; nao ha rota de autorizacao, leitura ou persistencia.",
    decision: "Dev-Only em azul para a conta proprietaria; ausente para demais usuarios.",
  },
  "google-fit": {
    id: "google-fit",
    label: "Google Fit",
    owner: "Treinador",
    purpose: "atividade e bem-estar",
    state: "dev_only",
    backend: "Ausente; nao ha rota de autorizacao, leitura ou persistencia.",
    decision: "Dev-Only em azul para a conta proprietaria; ausente para demais usuarios.",
  },
  "strava": {
    id: "strava",
    label: "Strava",
    owner: "Treinador",
    purpose: "atividades fisicas",
    state: "dev_only",
    backend: "Ausente; nao ha OAuth, webhook, leitura ou persistencia.",
    decision: "Dev-Only em azul para a conta proprietaria; ausente para demais usuarios.",
  },
  "gravl": {
    id: "gravl",
    label: "Gravl",
    owner: "Treinador",
    purpose: "treinos e evolucao",
    state: "dev_only",
    backend: "Ausente; nao ha rota de integracao ou persistencia externa.",
    decision: "Dev-Only em azul para a conta proprietaria; ausente para demais usuarios.",
  },
  "open-finance": {
    id: "open-finance",
    label: "Open Finance",
    owner: "Mordomo",
    purpose: "vida financeira",
    state: "dev_only",
    backend: "Ausente; nao ha consentimento regulatorio, conector bancario ou persistencia especifica.",
    decision: "Dev-Only em azul para a conta proprietaria; ausente para demais usuarios.",
  },
  "public-enrichment": {
    id: "public-enrichment",
    label: "Web Enrichment",
    owner: "Fundacao Cognitiva",
    purpose: "enriquecimento publico autorizado",
    state: "dev_only",
    backend: "/api/public-enrichment existe, mas nao executa busca nem persiste dados.",
    decision: "Rota protegida como Dev-Only ate existir integracao funcional completa.",
  },
  "sources-upload": {
    id: "sources-upload",
    label: "Fontes locais",
    owner: "Personas",
    purpose: "upload de PDF, DOCX, TXT, MD e CSV para memoria autorizada",
    state: "functional",
    backend: "/api/sources com extracao, persistencia e exclusao por usuario autenticado.",
    decision: "Mantido visivel como funcional; nao representa conector externo simulado.",
  },
  "google-auth": {
    id: "google-auth",
    label: "Login com Google",
    owner: "Acesso",
    purpose: "autenticacao",
    state: "functional",
    backend: "NextAuth Google provider e rotas /api/auth/*.",
    decision: "Mantido visivel como autenticacao funcional.",
  },
};

export function getIntegrationCapability(id: string) {
  return integrationCapabilities[id];
}

export function canViewIntegrationCapability(capability: IntegrationCapability, email?: string | null) {
  if (capability.state === "hidden" || capability.state === "planned") return false;
  if (capability.state === "dev_only") return isAdminEmail(email);
  return true;
}

export function isIntegrationOwner(email?: string | null) {
  return isAdminEmail(email);
}
