import { Geist } from "next/font/google";
import Link from "next/link";
import MedievalButton from "@/app/components/MedievalButton";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

export default function VerifyRequestPage() {
    return (
        <main className={`relative min-h-screen flex flex-col items-center justify-center overflow-hidden ${geistSans.className} bg-black text-white`}>

            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#1a110a] via-black to-black opacity-80"></div>
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]"></div>
            </div>

            <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg mx-auto animate-fade-in">

                {/* Icon / Graphics */}
                <div className="mb-8 relative">
                    <div className="w-24 h-24 rounded-full border border-[#C5A059]/30 flex items-center justify-center bg-black/50 shadow-[0_0_30px_rgba(197,160,89,0.2)]">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#C5A059" className="w-12 h-12">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                        </svg>
                    </div>
                    <div className="absolute -inset-4 border border-[#C5A059]/10 rounded-full animate-pulse-slow"></div>
                </div>

                <h1 className="text-3xl md:text-4xl font-light tracking-wide text-[#E5D0A1] mb-4 medieval-header">
                    Verifique seu Grimório
                </h1>

                <p className="text-gray-400 leading-relaxed mb-10">
                    Um link de acesso místico foi enviado para o seu endereço de e-mail.
                    Use-o para entrar no Nemosine e acessar seu espaço local.
                </p>

                <div className="flex flex-col gap-4 w-full">
                    <Link href="/" className="w-full">
                        <button className="w-full py-3 px-6 rounded-full border border-[#C5A059]/30 text-[#C5A059] hover:bg-[#C5A059]/10 transition-colors uppercase tracking-widest text-xs">
                            Voltar ao Início
                        </button>
                    </Link>
                </div>

                <div className="mt-12 text-xs text-gray-600 font-mono">
                    Esperando conexão neural...
                </div>

            </div>
        </main>
    );
}
