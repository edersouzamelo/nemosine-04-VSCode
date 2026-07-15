import Navbar from "../components/Navbar";
import InstitutionalFooter from "../components/InstitutionalFooter";
import ManifestoReader from "../components/ManifestoReader";

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
            Uma introdução para o usuário. Leitura opcional.
          </p>
        </header>

        <ManifestoReader />
      </section>

      <InstitutionalFooter />
    </main>
  );
}
