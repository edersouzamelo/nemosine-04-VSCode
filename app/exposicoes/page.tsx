import Link from "next/link";
import InstitutionalFooter from "../components/InstitutionalFooter";
import Navbar from "../components/Navbar";

const exhibitionLinks = {
  slides: "/exposicoes/cifm26-enquadramento-por-persona-llms-v5.pdf",
};

export default function ExposicoesPage() {
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
        <header className="mx-auto mb-10 max-w-4xl text-center">
          <p className="mb-4 font-display text-[10px] font-bold uppercase tracking-[0.34em] text-[#c5a059]/70">
            Sistema Nemosine Nous
          </p>
          <h1 className="font-display text-4xl uppercase tracking-[0.18em] text-[#c5a059] drop-shadow-[0_2px_14px_rgba(197,160,89,0.22)] sm:text-5xl">
            Exposições
          </h1>
          <p className="mx-auto mt-6 max-w-3xl font-serif text-base leading-7 text-[#eee8dc]/78 sm:text-lg">
            Comunicações, apresentações e demonstrações públicas relacionadas ao desenvolvimento conceitual, técnico e simbólico do Sistema Nemosine Nous.
          </p>
        </header>

        <article className="mx-auto max-w-3xl rounded-lg border border-[#c5a059]/22 bg-black/45 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.42)] backdrop-blur-md transition-colors hover:border-[#c5a059]/45 sm:p-7">
          <div className="border-b border-[#c5a059]/15 pb-5">
            <h2 className="font-display text-2xl uppercase tracking-[0.16em] text-[#e4c476]">
              Enquadramento por Persona em LLMs
            </h2>
            <p className="mt-3 font-serif text-sm uppercase tracking-[0.18em] text-[#c5a059]/70">
              XII Colóquio Internacional de Filosofia da Mente, CIFM26 (UNESP/Marília)
            </p>
          </div>

          <p className="mt-5 font-serif text-base leading-7 text-[#eee8dc]/78">
            Apresentação sobre mentalidade artificial, mente estendida e autopercepção mediada, com o Nemosine Nous como estudo de caso conceitual aplicado.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href={exhibitionLinks.slides}
              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[#c5a059]/35 bg-[#c5a059]/10 px-5 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#c5a059] transition-colors hover:border-[#c5a059]/70 hover:bg-[#c5a059]/18 hover:text-[#e4c476]"
            >
              Ver slides
            </Link>
          </div>
        </article>
      </section>

      <InstitutionalFooter />
    </main>
  );
}
