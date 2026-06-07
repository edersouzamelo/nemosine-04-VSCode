export type LegalDocumentStatus = "vigente" | "arquivado" | "em elaboração";

export type LegalDocumentMeta = {
  slug: string;
  title: string;
  shortTitle: string;
  currentVersion: string;
  effectiveDate: string;
  updatedAt: string;
  status: LegalDocumentStatus;
  pdfHref?: string;
  summary: string;
  versions: Array<{
    version: string;
    status: LegalDocumentStatus;
    effectiveDate: string;
    updatedAt: string;
    pdfHref?: string;
  }>;
};

export const LEGAL_DOCUMENTS: LegalDocumentMeta[] = [
  {
    slug: "termos-de-uso",
    title: "Termos de Uso do Sistema Nemosine Nous",
    shortTitle: "Termos de Uso",
    currentVersion: "v1.0",
    effectiveDate: "2026-06-06",
    updatedAt: "2026-06-06",
    status: "vigente",
    pdfHref: "/legal/pdf/termos-de-uso-v1.0.pdf",
    summary: "Condições gerais de acesso, responsabilidades do usuário, limites de uso e regras de operação do Sistema Nemosine Nous.",
    versions: [
      {
        version: "v1.0",
        status: "vigente",
        effectiveDate: "2026-06-06",
        updatedAt: "2026-06-06",
        pdfHref: "/legal/pdf/termos-de-uso-v1.0.pdf",
      },
    ],
  },
  {
    slug: "privacidade",
    title: "Política de Privacidade do Sistema Nemosine Nous",
    shortTitle: "Política de Privacidade",
    currentVersion: "v1.0",
    effectiveDate: "2026-06-06",
    updatedAt: "2026-06-06",
    status: "vigente",
    pdfHref: "/legal/pdf/politica-de-privacidade-v1.0.pdf",
    summary: "Regras sobre coleta, uso, armazenamento, compartilhamento, segurança e eliminação de dados pessoais no Sistema Nemosine Nous.",
    versions: [
      {
        version: "v1.0",
        status: "vigente",
        effectiveDate: "2026-06-06",
        updatedAt: "2026-06-06",
        pdfHref: "/legal/pdf/politica-de-privacidade-v1.0.pdf",
      },
    ],
  },
  {
    slug: "cookies-logs",
    title: "Política de Cookies, Logs e Tecnologias de Rastreamento do Sistema Nemosine Nous",
    shortTitle: "Cookies, Logs e Rastreamento",
    currentVersion: "v1.0",
    effectiveDate: "2026-06-06",
    updatedAt: "2026-06-06",
    status: "vigente",
    pdfHref: "/legal/pdf/politica-de-cookies-logs-e-tecnologias-de-rastreamento-v1.0.pdf",
    summary: "Política sobre cookies necessários, cookies opcionais, logs, tecnologias semelhantes, localStorage, sessionStorage, analytics, provedores externos, registros de segurança, retenção, Confessor, Porão e dados sensíveis.",
    versions: [
      {
        version: "v1.0",
        status: "vigente",
        effectiveDate: "2026-06-06",
        updatedAt: "2026-06-06",
        pdfHref: "/legal/pdf/politica-de-cookies-logs-e-tecnologias-de-rastreamento-v1.0.pdf",
      },
    ],
  },
  {
    slug: "retencao-exclusao-dados",
    title: "Política de Retenção e Exclusão de Dados do Sistema Nemosine Nous",
    shortTitle: "Retenção e Exclusão de Dados",
    currentVersion: "v1.0",
    effectiveDate: "2026-06-06",
    updatedAt: "2026-06-06",
    status: "vigente",
    pdfHref: "/legal/pdf/politica-de-retencao-e-exclusao-de-dados-v1.0.pdf",
    summary: "Política sobre prazos de retenção, exclusão, anonimização, backups, logs, registros de aceite, dados sensíveis, dados de crianças e adolescentes, Confessor e Porão.",
    versions: [
      {
        version: "v1.0",
        status: "vigente",
        effectiveDate: "2026-06-06",
        updatedAt: "2026-06-06",
        pdfHref: "/legal/pdf/politica-de-retencao-e-exclusao-de-dados-v1.0.pdf",
      },
    ],
  },
  {
    slug: "uso-de-ia",
    title: "Aviso de Uso de Inteligência Artificial do Sistema Nemosine Nous",
    shortTitle: "Aviso de Uso de IA",
    currentVersion: "v1.0",
    effectiveDate: "2026-06-06",
    updatedAt: "2026-06-06",
    status: "vigente",
    pdfHref: "/legal/pdf/aviso-de-uso-de-ia-v1.0.pdf",
    summary: "Aviso sobre uso de inteligência artificial, limites técnicos, riscos, responsabilidades e cautelas no Sistema Nemosine Nous.",
    versions: [
      {
        version: "v1.0",
        status: "vigente",
        effectiveDate: "2026-06-06",
        updatedAt: "2026-06-06",
        pdfHref: "/legal/pdf/aviso-de-uso-de-ia-v1.0.pdf",
      },
    ],
  },
  {
    slug: "responsabilidade-etica-antisseitizacao",
    title: "Responsabilidade Ética e Antisseitização do Sistema Nemosine Nous",
    shortTitle: "Responsabilidade Ética e Antisseitização",
    currentVersion: "v1.0",
    effectiveDate: "2026-06-07",
    updatedAt: "2026-06-07",
    status: "vigente",
    pdfHref: "/legal/pdf/responsabilidade-etica-e-antisseitizacao-v1.0.pdf",
    summary: "Documento sobre responsabilidade ética, antisseitização, não substituição profissional, autonomia do usuário, limites das personas, vedação de culto, seita ou religião, prevenção de dependência simbólica, uso de IA, proteção de vulneráveis, Confessor e Porão.",
    versions: [
      {
        version: "v1.0",
        status: "vigente",
        effectiveDate: "2026-06-07",
        updatedAt: "2026-06-07",
        pdfHref: "/legal/pdf/responsabilidade-etica-e-antisseitizacao-v1.0.pdf",
      },
    ],
  },
  {
    slug: "uso-aceitavel",
    title: "Política de Uso Aceitável do Sistema Nemosine Nous",
    shortTitle: "Política de Uso Aceitável",
    currentVersion: "v1.0",
    effectiveDate: "2026-06-06",
    updatedAt: "2026-06-06",
    status: "vigente",
    pdfHref: "/legal/pdf/politica-de-uso-aceitavel-v1.0.pdf",
    summary: "Política sobre uso aceitável, condutas proibidas, crimes, fraudes, violência, autolesão, dados sensíveis, crianças e adolescentes, comunidade, integridade técnica, antisseitização, Confessor e Porão.",
    versions: [
      {
        version: "v1.0",
        status: "vigente",
        effectiveDate: "2026-06-06",
        updatedAt: "2026-06-06",
        pdfHref: "/legal/pdf/politica-de-uso-aceitavel-v1.0.pdf",
      },
    ],
  },
  {
    slug: "seguranca",
    title: "Termo Técnico de Segurança do Sistema Nemosine Nous",
    shortTitle: "Termo Técnico de Segurança",
    currentVersion: "v1.0",
    effectiveDate: "2026-06-06",
    updatedAt: "2026-06-06",
    status: "vigente",
    pdfHref: "/legal/pdf/termo-tecnico-de-seguranca-v1.0.pdf",
    summary: "Termo sobre segurança geral, dados sensíveis, espaços sensíveis, Confessor, Porão e dados críticos no Sistema Nemosine Nous.",
    versions: [
      {
        version: "v1.0",
        status: "vigente",
        effectiveDate: "2026-06-06",
        updatedAt: "2026-06-06",
        pdfHref: "/legal/pdf/termo-tecnico-de-seguranca-v1.0.pdf",
      },
    ],
  },
  {
    slug: "confessor-porao-dados-sensiveis",
    title: "Uso do Confessor, Porão e Dados Sensíveis do Sistema Nemosine Nous",
    shortTitle: "Confessor, Porão e Dados Sensíveis",
    currentVersion: "v1.0",
    effectiveDate: "2026-06-06",
    updatedAt: "2026-06-06",
    status: "vigente",
    pdfHref: "/legal/pdf/uso-do-confessor-porao-e-dados-sensiveis-v1.0.pdf",
    summary: "Documento sobre uso do Confessor, Porão, comunidade e dados sensíveis, com limites de confidência simbólica, contenção, redução de dano, prudência, privacidade e responsabilidade.",
    versions: [
      {
        version: "v1.0",
        status: "vigente",
        effectiveDate: "2026-06-06",
        updatedAt: "2026-06-06",
        pdfHref: "/legal/pdf/uso-do-confessor-porao-e-dados-sensiveis-v1.0.pdf",
      },
    ],
  },
  {
    slug: "licenca",
    title: "Licença de Uso e Propriedade Intelectual do Sistema Nemosine Nous",
    shortTitle: "Licença de Uso",
    currentVersion: "v1.0",
    effectiveDate: "2026-06-06",
    updatedAt: "2026-06-06",
    status: "vigente",
    pdfHref: "/legal/pdf/licenca-de-uso-e-propriedade-intelectual-v1.0.pdf",
    summary: "Regras sobre licença de uso, propriedade intelectual, direitos autorais, software, marca, prompts, personas, outputs, contribuições e uso comercial.",
    versions: [
      {
        version: "v1.0",
        status: "vigente",
        effectiveDate: "2026-06-06",
        updatedAt: "2026-06-06",
        pdfHref: "/legal/pdf/licenca-de-uso-e-propriedade-intelectual-v1.0.pdf",
      },
    ],
  },
  {
    slug: "direitos-autorais-e-registro",
    title: "Direitos Autorais e Registro do Sistema Nemosine Nous",
    shortTitle: "Direitos Autorais e Registro",
    currentVersion: "v1.0",
    effectiveDate: "2026-06-06",
    updatedAt: "2026-06-06",
    status: "vigente",
    pdfHref: "/legal/pdf/direitos-autorais-e-registro-v1.0.pdf",
    summary: "Documento complementar à Licença de Uso sobre autoria, direitos autorais, registros, software, marca, whitepapers, Constituição Nemosínica, Codex, GitHub, DOI, ORCID, prompts, personas, cartas, imagens, outputs de IA, contribuições e uso comercial.",
    versions: [
      {
        version: "v1.0",
        status: "vigente",
        effectiveDate: "2026-06-06",
        updatedAt: "2026-06-06",
        pdfHref: "/legal/pdf/direitos-autorais-e-registro-v1.0.pdf",
      },
    ],
  },
  {
    slug: "contribuicao",
    title: "Termo de Contribuição do Sistema Nemosine Nous",
    shortTitle: "Termo de Contribuição",
    currentVersion: "v1.0",
    effectiveDate: "2026-06-06",
    updatedAt: "2026-06-06",
    status: "vigente",
    pdfHref: "/legal/pdf/termo-de-contribuicao-v1.0.pdf",
    summary: "Termo complementar aos Termos da Comunidade e à Licença de Uso sobre sugestões, feedbacks, relatos, prompts, personas, lugares, módulos, código, issues, pull requests, contribuições comunitárias, contribuições geradas por IA, ausência de coautoria automática, licença de contribuição, dados sensíveis, Confessor e Porão.",
    versions: [
      {
        version: "v1.0",
        status: "vigente",
        effectiveDate: "2026-06-06",
        updatedAt: "2026-06-06",
        pdfHref: "/legal/pdf/termo-de-contribuicao-v1.0.pdf",
      },
    ],
  },
  {
    slug: "beta",
    title: "Termos de Beta Tester do Sistema Nemosine Nous",
    shortTitle: "Termos de Beta Tester",
    currentVersion: "v1.0",
    effectiveDate: "2026-06-06",
    updatedAt: "2026-06-06",
    status: "vigente",
    pdfHref: "/legal/pdf/termos-de-beta-tester-v1.0.pdf",
    summary: "Termos sobre participação em ambiente beta, instabilidade, bugs, perda de dados, feedbacks, confidencialidade, ausência de vínculo, propriedade intelectual, limitação de responsabilidade, Confessor e Porão.",
    versions: [
      {
        version: "v1.0",
        status: "vigente",
        effectiveDate: "2026-06-06",
        updatedAt: "2026-06-06",
        pdfHref: "/legal/pdf/termos-de-beta-tester-v1.0.pdf",
      },
    ],
  },
  {
    slug: "comercial",
    title: "Termos Comerciais e Institucionais do Sistema Nemosine Nous",
    shortTitle: "Termos Comerciais e Institucionais",
    currentVersion: "v1.0",
    effectiveDate: "2026-06-06",
    updatedAt: "2026-06-06",
    status: "vigente",
    pdfHref: "/legal/pdf/termos-comerciais-e-institucionais-v1.0.pdf",
    summary: "Termos sobre uso comercial, institucional, educacional, empresarial, profissional, por equipes, clínicas, escolas, órgãos públicos, pilotos, demonstrações, licenciamento, parcerias, propriedade intelectual, dados pessoais, Confessor e Porão.",
    versions: [
      {
        version: "v1.0",
        status: "vigente",
        effectiveDate: "2026-06-06",
        updatedAt: "2026-06-06",
        pdfHref: "/legal/pdf/termos-comerciais-e-institucionais-v1.0.pdf",
      },
    ],
  },
  {
    slug: "comunidade",
    title: "Termos da Comunidade do Sistema Nemosine Nous",
    shortTitle: "Termos da Comunidade",
    currentVersion: "v1.0",
    effectiveDate: "2026-06-06",
    updatedAt: "2026-06-06",
    status: "vigente",
    pdfHref: "/legal/pdf/termos-da-comunidade-v1.0.pdf",
    summary: "Termos sobre espaços comunitários, Telegram, Discord, comentários, formulários, grupos, repositórios colaborativos, perfis oficiais, conduta, moderação, contribuições, antisseitização, dados sensíveis, Confessor e Porão.",
    versions: [
      {
        version: "v1.0",
        status: "vigente",
        effectiveDate: "2026-06-06",
        updatedAt: "2026-06-06",
        pdfHref: "/legal/pdf/termos-da-comunidade-v1.0.pdf",
      },
    ],
  },
  {
    slug: "menores-dependentes-responsaveis",
    title: "Termo de Consentimento para Uso por Menores, Dependentes e Responsáveis do Sistema Nemosine Nous",
    shortTitle: "Menores, Dependentes e Responsáveis",
    currentVersion: "v1.0",
    effectiveDate: "2026-06-07",
    updatedAt: "2026-06-07",
    status: "vigente",
    pdfHref: "/legal/pdf/termo-de-consentimento-menores-dependentes-responsaveis-v1.0.pdf",
    summary: "Termo sobre consentimento específico, melhor interesse, dados sensíveis, TEA, neurodivergência, crianças, adolescentes, dependentes, responsáveis legais, Confessor e Porão.",
    versions: [
      {
        version: "v1.0",
        status: "vigente",
        effectiveDate: "2026-06-07",
        updatedAt: "2026-06-07",
        pdfHref: "/legal/pdf/termo-de-consentimento-menores-dependentes-responsaveis-v1.0.pdf",
      },
    ],
  },
];

export function getLegalDocumentMeta(slug: string) {
  return LEGAL_DOCUMENTS.find((document) => document.slug === slug) ?? null;
}

export function getLegalDocumentPath(document: LegalDocumentMeta, version?: string) {
  return `/legal/${document.slug}${version ? `/${version}` : ""}`;
}
