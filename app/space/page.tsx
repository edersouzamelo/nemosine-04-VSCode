import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Navbar from "../components/Navbar";

export default async function SpacePage() {
    const session = await auth();

    if (!session) {
        redirect("/");
    }

    return (
        <main className="relative min-h-screen bg-[#050507] text-[#e1e1e6]">
            {/* Dark Immersive Background */}
            <div className="fixed inset-0 z-0">
                <div className="absolute inset-0 bg-black/60 z-10 backdrop-blur-[2px]"></div>
                <div className="w-full h-full bg-[#0a0a0c] bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2000')] bg-cover bg-center opacity-30 mix-blend-luminosity"></div>
            </div>

            <Navbar />

            <section className="relative z-10 p-12 max-w-4xl mx-auto">
                <h1 className="text-4xl font-serif text-[#c5a059] mb-8 uppercase tracking-tight">Espaço Local</h1>

                <div className="bg-black/40 border border-[#c5a059]/20 p-8 rounded-lg backdrop-blur-md">
                    <p className="text-xl mb-4">Bem-vindo, {session.user?.name || session.user?.email}</p>
                    <p className="text-white/60 text-sm mb-6">
                        Este é o seu espaço privado no Sistema Nemosine. Aqui você poderá gerenciar seus dados e interações.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 border border-[#c5a059]/10 rounded bg-black/20">
                            <h3 className="text-[#c5a059] font-bold mb-2 uppercase text-xs tracking-widest">Status</h3>
                            <p className="text-green-400 text-sm">Conectado via {session.user?.email}</p>
                        </div>
                        {/* More widgets can go here */}
                    </div>
                </div>
            </section>
        </main>
    );
}
