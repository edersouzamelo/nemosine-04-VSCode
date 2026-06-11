import Navbar from "../components/Navbar";
import InstitutionalFooter from "../components/InstitutionalFooter";

const MANIFESTO_DOC_URL =
  "https://docs.google.com/document/d/1K0pVB97_Cxrzr2bwlLMvKdH4gH9243bF9ULr8iQu9yQ/preview";
const MANIFESTO_EDIT_URL =
  "https://docs.google.com/document/d/1K0pVB97_Cxrzr2bwlLMvKdH4gH9243bF9ULr8iQu9yQ/edit?usp=sharing";

export default function ManifestoPage() {
  return (
    <main className="nemosine-main-container relative flex min-h-screen flex-col overflow-hidden">
      <div className="fixed inset-0 z-0">
        <div className="nemosine-bg-overlay absolute inset-0 z-10 backdrop-blur-[2px]" />
        <div className="nemosine-mental-castle-bg h-full w-full bg-[url('https://images.unsplash.com/photo-1505664194779-8beaceb93744?q=80&w=2000')] bg-cover bg-center" />
      </div>

      <Navbar />

      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-8 sm:px-8 lg:px-12">
        <header className="mx-auto mb-8 max-w-3xl text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.36em] text-[#c5a059]/55">
            Sistema Nemosine Nous
          </p>
          <h1 className="font-display mt-4 text-4xl uppercase tracking-[0.16em] text-[#e7d4aa] drop-shadow-[0_0_18px_rgba(197,160,89,0.22)] sm:text-5xl">
            O Manifesto
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-[#eee8dc]/62">
            Uma pagina de leitura para o documento fundador: centralizado como livro, preservado no Drive e apresentado na estetica do aplicativo.
          </p>
        </header>

        <div className="manifesto-book-shell mx-auto w-full max-w-5xl">
          <div className="manifesto-book-spine" aria-hidden="true" />
          <div className="manifesto-book-pages">
            <div className="manifesto-book-toolbar">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#c5a059]/55">
                  Documento vivo
                </p>
                <p className="mt-1 font-serif text-lg text-[#f4e6c8]">Manifesto Nemosine Nous</p>
              </div>
              <a
                href={MANIFESTO_EDIT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded border border-[#c5a059]/30 bg-[#c5a059]/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#f3dfb4] transition-colors hover:border-[#c5a059]/65 hover:bg-[#c5a059]/16"
              >
                Abrir no Drive
              </a>
            </div>

            <div className="manifesto-document-frame">
              <iframe
                title="Manifesto Nemosine Nous"
                src={MANIFESTO_DOC_URL}
                className="h-full w-full bg-[#fbf8f2]"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      <InstitutionalFooter />
    </main>
  );
}
