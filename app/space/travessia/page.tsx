"use client";

import { useRouter } from "next/navigation";
import MedievalButton from "@/app/components/MedievalButton";
import Navbar from "@/app/components/Navbar";
import InstitutionalFooter from "@/app/components/InstitutionalFooter";

export default function TravessiaPage() {
    const router = useRouter();

    return (
        <main className="min-h-screen bg-[#050507] text-[#e1e1e6] relative overflow-hidden flex flex-col justify-between">
            {/* Background elements */}
            <div className="portal-container" />
            <div className="portal-ring opacity-20" />
            <div className="portal-ring-outer opacity-10" />

            <div className="sticky top-0 z-50">
                <Navbar />
            </div>

            <div className="flex-1 max-w-4xl mx-auto px-6 py-16 flex flex-col items-center justify-center relative z-10 text-center">
                <div className="glass-medieval w-full max-w-2xl rounded-2xl p-10 sm:p-14 border border-[#c5a059]/30 relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                    {/* Glowing golden circular blur */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-[#c5a059]/5 blur-3xl pointer-events-none" />

                    {/* Badge */}
                    <span className="mx-auto inline-block mb-6 bg-amber-500/10 border border-amber-500/40 text-amber-500 font-display text-xs tracking-widest uppercase px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                        Em Breve
                    </span>

                    {/* Header */}
                    <h1 className="font-display text-4xl sm:text-5xl uppercase tracking-widest text-[#c5a059] mb-6 drop-shadow-[0_0_10px_rgba(197,160,89,0.3)]">
                        Travessia
                    </h1>

                    <div className="h-px w-32 bg-gradient-to-r from-transparent via-[#c5a059]/40 to-transparent mx-auto mb-8" />

                    {/* Description */}
                    <p className="font-body text-[#e1e1e6]/80 text-xl leading-relaxed italic max-w-lg mx-auto mb-10">
                        "Prepare-se para a travessia entre os limites da mente. Um novo portal de exploração cognitiva está sendo canalizado pelas forças do Codex."
                    </p>

                    {/* Navigation */}
                    <div className="flex justify-center">
                        <MedievalButton onClick={() => router.back()} variant="primary" className="text-xs py-3 px-10">
                            Voltar
                        </MedievalButton>
                    </div>
                </div>
            </div>

            <InstitutionalFooter />
        </main>
    );
}
