"use client";

import Link from "next/link";
import Navbar from "../components/Navbar";
import InstitutionalFooter from "../components/InstitutionalFooter";
import { getLegalDocumentMeta, getLegalDocumentPath } from "../data/legalDocuments";

const legalSections = [
  {
    title: "Uso do Sistema",
    summary: "Regras gerais de acesso, conduta e limites operacionais do Sistema Nemosine.",
    documents: [
      { title: "Termos de Uso", slug: "termos-de-uso" },
      { title: "Política de Uso Aceitável", slug: "uso-aceitavel" },
      { title: "Aviso de Uso de IA", slug: "uso-de-ia" },
      { title: "Responsabilidade Ética e Antisseitização", slug: "responsabilidade-etica-antisseitizacao" },
    ],
  },
  {
    title: "Privacidade e Segurança",
    summary: "Documentos sobre tratamento de dados, proteção técnica e espaços sensíveis.",
    documents: [
      { title: "Política de Privacidade", slug: "privacidade" },
      { title: "Cookies, Logs e Rastreamento", slug: "cookies-logs" },
      { title: "Retenção e Exclusão de Dados", slug: "retencao-exclusao-dados" },
      { title: "Termo Técnico de Segurança", slug: "seguranca" },
      { title: "Confessor, Porão e Dados Sensíveis", slug: "confessor-porao-dados-sensiveis" },
    ],
  },
  {
    title: "Propriedade Intelectual",
    summary: "Licenças, direitos autorais, registros e contribuições vinculadas ao projeto.",
    documents: [
      { title: "Licença de Uso", slug: "licenca" },
      { title: "Direitos Autorais e Registro", slug: "direitos-autorais-e-registro" },
      { title: "Termo de Contribuição", slug: "contribuicao" },
    ],
  },
  {
    title: "Relações Especiais",
    summary: "Condições específicas para testers, comunidade, parcerias e uso institucional.",
    documents: [
      { title: "Termos de Beta Tester", slug: "beta" },
      { title: "Termos Comerciais e Institucionais", slug: "comercial" },
      { title: "Termos da Comunidade", slug: "comunidade" },
      { title: "Menores, Dependentes e Responsáveis", slug: "menores-dependentes-responsaveis" },
    ],
  },
];

export default function LegalPage() {
  return (
    <main className="nemosine-main-container relative flex min-h-screen flex-col overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="nemosine-bg-overlay absolute inset-0 z-10 backdrop-blur-[2px]" />
        <div className="nemosine-mental-castle-bg h-full w-full bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2000')] bg-cover bg-center" />
      </div>

      <div className="sticky top-0 z-50">
        <Navbar />
      </div>

      <section className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-5 py-12 sm:px-8 lg:px-10">
        <header className="mx-auto mb-10 max-w-4xl text-center">
          <p className="mb-4 font-display text-[10px] font-bold uppercase tracking-[0.34em] text-[#c5a059]/70">
            Sistema Nemosine Nous
          </p>
          <h1 className="font-display text-4xl uppercase tracking-[0.18em] text-[#c5a059] drop-shadow-[0_2px_14px_rgba(197,160,89,0.22)] sm:text-5xl">
            Centro Legal do Nemosine
          </h1>
          <p className="mx-auto mt-6 max-w-3xl font-serif text-base leading-7 text-[#eee8dc]/78 sm:text-lg">
            Documentos que regulam o uso do Sistema Nemosine, seus limites, segurança, privacidade, propriedade intelectual e condições de acesso.
          </p>
        </header>

        <div className="grid gap-5 md:grid-cols-2">
          {legalSections.map((section) => (
            <section
              key={section.title}
              className="rounded-lg border border-[#c5a059]/22 bg-black/45 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.42)] backdrop-blur-md transition-colors hover:border-[#c5a059]/45"
            >
              <div className="mb-5 border-b border-[#c5a059]/15 pb-4">
                <h2 className="font-display text-xl uppercase tracking-[0.16em] text-[#e4c476]">
                  {section.title}
                </h2>
                <p className="mt-3 font-serif text-sm leading-6 text-[#d7d1c8]/68">
                  {section.summary}
                </p>
              </div>

              <div className="space-y-3">
                {section.documents.map((document) => {
                  const documentMeta = getLegalDocumentMeta(document.slug);
                  const href = documentMeta ? getLegalDocumentPath(documentMeta) : "/legal";

                  return (
                    <Link
                      key={document.slug}
                      href={href}
                      className="group flex min-h-12 items-center justify-between gap-4 rounded border border-[#c5a059]/14 bg-[#c5a059]/6 px-4 py-3 text-left transition-colors hover:border-[#c5a059]/45 hover:bg-[#c5a059]/12"
                    >
                      <span className="font-serif text-sm text-[#eee8dc]/82 transition-colors group-hover:text-[#fff7df]">
                        {document.title}
                      </span>
                      <span className="material-icons text-base text-[#c5a059]/70 transition-transform group-hover:translate-x-1 group-hover:text-[#e4c476]">
                        arrow_forward
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <aside className="mt-8 rounded-lg border border-[#c5a059]/18 bg-black/35 px-5 py-4 text-center font-serif text-sm leading-6 text-[#d7d1c8]/64 backdrop-blur-sm">
          Esta página funciona como hub dos documentos legais do Nemosine. Os textos integrais podem ser vinculados aqui conforme cada política for formalizada e versionada.
        </aside>
      </section>

      <InstitutionalFooter />
    </main>
  );
}
