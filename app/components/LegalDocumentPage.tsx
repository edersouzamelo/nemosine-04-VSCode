import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Navbar from "./Navbar";
import InstitutionalFooter from "./InstitutionalFooter";
import type { LegalDocumentContent } from "../lib/legalContent";
import { getLegalDocumentPath } from "../data/legalDocuments";

const statusStyles = {
  vigente: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  arquivado: "border-stone-400/25 bg-stone-500/10 text-stone-200",
  "em elaboração": "border-amber-300/30 bg-amber-400/10 text-amber-100",
};

function formatDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}

export default function LegalDocumentPage({ document }: { document: LegalDocumentContent }) {
  const historicalVersions = document.meta.versions;

  return (
    <main className="nemosine-main-container relative flex min-h-screen flex-col overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="nemosine-bg-overlay absolute inset-0 z-10 backdrop-blur-[2px]" />
        <div className="nemosine-mental-castle-bg h-full w-full bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2000')] bg-cover bg-center" />
      </div>

      <div className="sticky top-0 z-50">
        <Navbar />
      </div>

      <section className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-5 py-12 sm:px-8 lg:px-10">
        <div className="mb-6">
          <Link
            href="/legal"
            className="inline-flex items-center gap-2 font-serif text-sm text-[#c5a059]/75 transition-colors hover:text-[#e4c476]"
          >
            <span className="material-icons text-base">arrow_back</span>
            Centro Legal
          </Link>
        </div>

        <article className="rounded-lg border border-[#c5a059]/22 bg-black/52 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.48)] backdrop-blur-md sm:p-8 lg:p-10">
          <header className="border-b border-[#c5a059]/18 pb-7">
            <p className="mb-3 font-display text-[10px] font-bold uppercase tracking-[0.34em] text-[#c5a059]/70">
              Documento Legal
            </p>
            <h1 className="font-display text-3xl uppercase tracking-[0.14em] text-[#c5a059] sm:text-4xl">
              {document.title}
            </h1>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetaPill label="Versão" value={document.version} />
              <MetaPill label="Vigência" value={formatDate(document.effectiveDate)} />
              <MetaPill label="Atualização" value={formatDate(document.updatedAt)} />
              <div className={`rounded border px-3 py-2 ${statusStyles[document.status]}`}>
                <p className="text-[9px] uppercase tracking-[0.22em] opacity-70">Status</p>
                <p className="mt-1 font-serif text-sm">{document.status}</p>
              </div>
            </div>

            {document.pdfHref && (
              <a
                href={document.pdfHref}
                download
                className="mt-6 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#c5a059]/40 bg-[#c5a059]/12 px-5 py-2 font-display text-[10px] font-bold uppercase tracking-[0.22em] text-[#e4c476] transition-colors hover:border-[#c5a059]/70 hover:bg-[#c5a059]/20"
              >
                <span className="material-icons text-base">download</span>
                Baixar PDF
              </a>
            )}
          </header>

          <div className="legal-document-body mt-8 font-serif text-[#eee8dc]/82">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{document.body}</ReactMarkdown>
          </div>

          <footer className="mt-10 border-t border-[#c5a059]/15 pt-6">
            <h2 className="font-display text-sm uppercase tracking-[0.22em] text-[#e4c476]">
              Histórico de versões
            </h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {historicalVersions.length > 0 ? (
                historicalVersions.map((version) => (
                  <Link
                    key={version.version}
                    href={getLegalDocumentPath(document.meta, version.version)}
                    className="rounded border border-[#c5a059]/25 bg-[#c5a059]/8 px-3 py-2 font-serif text-xs text-[#eee8dc]/72 transition-colors hover:border-[#c5a059]/55 hover:text-[#fff7df]"
                  >
                    {version.version} · {version.status}
                  </Link>
                ))
              ) : (
                <p className="font-serif text-sm text-[#d7d1c8]/55">
                  Ainda não há versões históricas publicadas.
                </p>
              )}
            </div>
          </footer>
        </article>
      </section>

      <InstitutionalFooter />
    </main>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[#c5a059]/18 bg-[#c5a059]/7 px-3 py-2">
      <p className="text-[9px] uppercase tracking-[0.22em] text-[#c5a059]/58">{label}</p>
      <p className="mt-1 font-serif text-sm text-[#eee8dc]/84">{value}</p>
    </div>
  );
}
