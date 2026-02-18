import { Geist } from "next/font/google";
import Link from "next/link";
import MedievalButton from "@/app/components/MedievalButton";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

export default function GamesHubPage() {
    return (
        <main className={`min-h-screen bg-[#0a0a0a] text-[#E5D0A1] ${geistSans.className} p-8 pt-24`}>
            <div className="max-w-7xl mx-auto">
                <header className="mb-12 border-b border-[#C5A059]/30 pb-6">
                    <h1 className="text-4xl medieval-header text-[#C5A059] mb-2">Sala de Lazer</h1>
                    <p className="text-gray-400">Um espaço para descanso e reflexão através das cartas.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

                    {/* Game Card: Oracle */}
                    <Link href="/space/games/oracle" className="group">
                        <div className="bg-[#111] border border-[#333] rounded-lg overflow-hidden hover:border-[#C5A059] transition-all hover:shadow-[0_0_20px_rgba(197,160,89,0.2)] h-full flex flex-col">
                            <div className="h-48 bg-black relative flex items-center justify-center overflow-hidden">
                                <div className="absolute inset-0 opacity-30 bg-[url('/assets/cards/Anverso%20padrão.png')] bg-cover bg-center group-hover:scale-105 transition-transform duration-700"></div>
                                <span className="text-5xl">🔮</span>
                            </div>
                            <div className="p-6 flex-1 flex flex-col">
                                <h3 className="text-xl font-bold text-[#C5A059] mb-2">Oráculo dos Personas</h3>
                                <p className="text-gray-500 text-sm mb-6 flex-1">
                                    tire uma carta e descubra qual arquétipo rege seu momento atual. Uma leitura simples para reflexão rápida.
                                </p>
                                <MedievalButton className="w-full text-sm py-2">Jogar</MedievalButton>
                            </div>
                        </div>
                    </Link>

                    {/* Game Card: Solitaire */}
                    <Link href="/space/games/solitaire" className="group">
                        <div className="bg-[#111] border border-[#333] rounded-lg overflow-hidden hover:border-[#C5A059] transition-all hover:shadow-[0_0_20px_rgba(197,160,89,0.2)] h-full flex flex-col">
                            <div className="h-48 bg-black relative flex items-center justify-center overflow-hidden">
                                <div className="absolute inset-0 opacity-30 bg-[url('/assets/cards/Anverso%20padrão.png')] bg-cover bg-center group-hover:scale-105 transition-transform duration-700"></div>
                                <span className="text-5xl">🃏</span>
                            </div>
                            <div className="p-6 flex-1 flex flex-col">
                                <h3 className="text-xl font-bold text-[#C5A059] mb-2">Paciência Nemosine</h3>
                                <p className="text-gray-500 text-sm mb-6 flex-1">
                                    O clássico jogo de cartas, reimaginado com o baralho Nemosine. Organize seus pensamentos.
                                </p>
                                <MedievalButton className="w-full text-sm py-2">Jogar</MedievalButton>
                            </div>
                        </div>
                    </Link>

                </div>
            </div>
        </main>
    );
}
