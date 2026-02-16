import AgentCard from "../components/AgentCard";
import MedievalButton from "../components/MedievalButton";

const AGENTS = [
    "Adjunto", "Advogado", "Aprovisionador", "Arauto", "Arqueólogo", "Artista", "Astrônomo", "Autor",
    "Bobo da Corte", "Bruto", "Bruxo", "Burguês", "Cientista", "Cigana", "Comandante", "Confessor 2.0",
    "Coveiro", "Curador", "Custódio", "Desejo", "Dor", "Engenheiro", "Espelho", "Espião",
    "Estrategista", "Executor", "Exorcista", "Fantasma", "Filósofo", "Fúria", "Guardião", "Guru",
    "Herdeiro", "Inimigo", "Instrutor", "Juiz", "Louco", "Luz", "Médico", "Mentor",
    "Mentorzinho", "Mestre", "Mordomo", "Narrador", "Orquestrador-Arquiteto", "Princesa", "Promotor", "Psicólogo",
    "Sócio", "Sombra", "Terapeuta", "Treinador", "Vazio", "Vidente", "Vigia", "Vingador"
];

export default function AgentsPage() {
    return (
        <main className="relative min-h-screen bg-[#050507] text-[#e1e1e6]">
            {/* Dark Immersive Background */}
            <div className="fixed inset-0 z-0">
                <div className="absolute inset-0 bg-black/60 z-10 backdrop-blur-[2px]"></div>
                {/* Placeholder for the Castle + Black Hole image */}
                <div className="w-full h-full bg-[#0a0a0c] bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2000')] bg-cover bg-center opacity-30 mix-blend-luminosity"></div>
            </div>

            {/* Header */}
            <header className="relative z-20 border-b border-[#c5a059]/20 bg-black/40 backdrop-blur-md px-8 py-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-serif medieval-text-gold">Nemosine</h1>
                    <div className="h-6 w-[1px] bg-[#c5a059]/30"></div>
                    <span className="text-[10px] uppercase tracking-widest opacity-60">Painel de Agentes Cognitivos</span>
                </div>
                <div className="flex gap-4">
                    <MedievalButton variant="secondary" className="!py-2 !px-4 !text-[10px]">
                        Sincronizar Backend
                    </MedievalButton>
                </div>
            </header>

            {/* Dashboard Grid */}
            <section className="relative z-10 p-4 md:p-8 lg:p-12">
                <div className="max-w-[1600px] mx-auto">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 md:gap-6">
                        {AGENTS.map((name) => (
                            <AgentCard key={name} name={name} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-20 p-8 border-t border-[#c5a059]/10 bg-black/60 text-center">
                <p className="text-[10px] medieval-text-gold opacity-40">
                    Existem 56 processos cognitivos ativos na rede Nemosine. Selecione uma persona para iniciar o processamento.
                </p>
            </footer>
        </main>
    );
}
