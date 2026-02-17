import AgentCard from "../components/AgentCard";
import Navbar from "../components/Navbar";
import { ENTITIES, PLACES } from "../data/entities";

export default function PlacesPage() {
    return (
        <main className="relative min-h-screen bg-[#050507] text-[#e1e1e6]">
            {/* Dark Immersive Background */}
            <div className="fixed inset-0 z-0">
                <div className="absolute inset-0 bg-black/60 z-10 backdrop-blur-[2px]"></div>
                {/* Immersive placeholder background */}
                <div className="w-full h-full bg-[#0a0a0c] bg-[url('https://images.unsplash.com/photo-1505664194779-8beaceb93744?q=80&w=2000')] bg-cover bg-center opacity-20 mix-blend-luminosity"></div>
            </div>

            <Navbar />

            {/* Dashboard Grid */}
            <section className="relative z-10 p-4 md:p-8 lg:p-12">
                <div className="max-w-[1600px] mx-auto">
                    <header className="mb-12 text-center">
                        <h2 className="text-4xl font-serif text-[#c5a059] mb-2 uppercase tracking-tight">Lugares da Mente</h2>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-[#c5a059]/40">Cenários de Processamento Cognitivo</p>
                    </header>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4 md:gap-6">
                        {[...PLACES].sort((a, b) => {
                            if (a === "Não-Lugar") return 1;
                            if (b === "Não-Lugar") return -1;
                            return 0;
                        }).map((name) => {
                            const slug = name.toLowerCase().replace(/\s+/g, '-');
                            const entity = ENTITIES[slug];
                            return (
                                <AgentCard
                                    key={name}
                                    name={name}
                                    label="Lugar"
                                    image={entity?.image}
                                    href={`/agents/${slug}`}
                                    className="aspect-[9/16]"
                                />
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-20 p-8 border-t border-[#c5a059]/10 bg-black/60 text-center">
                <p className="text-[10px] medieval-text-gold opacity-40 italic">
                    "Cada lugar abriga um segredo, e cada segredo é uma chave para o entendimento."
                </p>
            </footer>
        </main>
    );
}
