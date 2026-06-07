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
    slug: "politica-de-uso-aceitavel",
    title: "Política de Uso Aceitável do Sistema Nemosine",
    shortTitle: "Política de Uso Aceitável",
    currentVersion: "latest",
    effectiveDate: "A definir",
    updatedAt: "2026-06-06",
    status: "em elaboração",
    summary: "Documento provisório sobre usos permitidos, abusos, limites de conduta e restrições operacionais.",
    versions: [],
  },
  {
    slug: "seguranca",
    title: "Termo Técnico de Segurança do Sistema Nemosine",
    shortTitle: "Termo Técnico de Segurança",
    currentVersion: "latest",
    effectiveDate: "A definir",
    updatedAt: "2026-06-06",
    status: "em elaboração",
    summary: "Documento provisório sobre controles técnicos, registros, disponibilidade e limites de segurança.",
    versions: [],
  },
  {
    slug: "confessor-dados-sensiveis",
    title: "Uso do Confessor e Dados Sensíveis",
    shortTitle: "Uso do Confessor e dados sensíveis",
    currentVersion: "latest",
    effectiveDate: "A definir",
    updatedAt: "2026-06-06",
    status: "em elaboração",
    summary: "Documento provisório sobre limites, cautelas e responsabilidades no uso de espaços sensíveis.",
    versions: [],
  },
  {
    slug: "licenca",
    title: "Licença de Uso do Sistema Nemosine",
    shortTitle: "Licença de Uso",
    currentVersion: "latest",
    effectiveDate: "A definir",
    updatedAt: "2026-06-06",
    status: "em elaboração",
    summary: "Documento provisório sobre permissões, restrições, propriedade intelectual e formas autorizadas de uso.",
    versions: [],
  },
  {
    slug: "direitos-autorais-registro",
    title: "Direitos Autorais e Registro do Sistema Nemosine",
    shortTitle: "Direitos Autorais e Registro",
    currentVersion: "latest",
    effectiveDate: "A definir",
    updatedAt: "2026-06-06",
    status: "em elaboração",
    summary: "Documento provisório sobre autoria, registros, titularidade e autenticidade documental.",
    versions: [],
  },
  {
    slug: "contribuicoes-comunidade",
    title: "Contribuições da Comunidade",
    shortTitle: "Contribuições da Comunidade",
    currentVersion: "latest",
    effectiveDate: "A definir",
    updatedAt: "2026-06-06",
    status: "em elaboração",
    summary: "Documento provisório sobre sugestões, contribuições, feedback e participação comunitária.",
    versions: [],
  },
  {
    slug: "termos-beta-tester",
    title: "Termos de Beta Tester do Sistema Nemosine",
    shortTitle: "Termos de Beta Tester",
    currentVersion: "latest",
    effectiveDate: "A definir",
    updatedAt: "2026-06-06",
    status: "em elaboração",
    summary: "Documento provisório sobre acesso experimental, testes, feedback e riscos de versões beta.",
    versions: [],
  },
  {
    slug: "termos-comerciais-institucionais",
    title: "Termos Comerciais e Institucionais do Sistema Nemosine",
    shortTitle: "Termos Comerciais e Institucionais",
    currentVersion: "latest",
    effectiveDate: "A definir",
    updatedAt: "2026-06-06",
    status: "em elaboração",
    summary: "Documento provisório sobre parcerias, licenciamento comercial, uso institucional e contratações.",
    versions: [],
  },
  {
    slug: "termos-comunidade",
    title: "Termos da Comunidade Nemosine",
    shortTitle: "Termos da Comunidade",
    currentVersion: "latest",
    effectiveDate: "A definir",
    updatedAt: "2026-06-06",
    status: "em elaboração",
    summary: "Documento provisório sobre convivência, participação, moderação e conduta comunitária.",
    versions: [],
  },
];

export function getLegalDocumentMeta(slug: string) {
  return LEGAL_DOCUMENTS.find((document) => document.slug === slug) ?? null;
}

export function getLegalDocumentPath(document: LegalDocumentMeta, version?: string) {
  return `/legal/${document.slug}${version ? `/${version}` : ""}`;
}
