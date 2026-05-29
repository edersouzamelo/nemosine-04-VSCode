import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Navbar from "../components/Navbar";
import InstitutionalFooter from "../components/InstitutionalFooter";
import ExternalConnectionsPanel from "../components/ExternalConnectionsPanel";
import SpaceStatusCards from "../components/SpaceStatusCards";

export default async function SpacePage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/access?callbackUrl=/space");
    }

    return (
        <main className="nemosine-main-container relative min-h-screen flex flex-col">
            {/* Dark Immersive Background */}
            <div className="fixed inset-0 z-0">
                <div className="nemosine-bg-overlay absolute inset-0 z-10 backdrop-blur-[2px]"></div>
                <div className="nemosine-mental-castle-bg w-full h-full bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2000')] bg-cover bg-center"></div>
            </div>

            <Navbar />

            <section className="relative z-10 flex-1 px-5 py-8 sm:p-12 max-w-4xl mx-auto w-full">
                <header className="mb-12 text-center">
                    <h1 className="text-4xl font-serif text-[#c5a059] mb-2 uppercase tracking-tight">Meu Espaço</h1>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-[#c5a059]/40">Área privada e integrações pessoais</p>
                </header>

                <div className="bg-black/40 border border-[#c5a059]/20 p-5 sm:p-8 rounded-lg backdrop-blur-md">
                    <p className="text-xl mb-4">Bem-vindo, {session.user?.name || session.user?.email}</p>
                    <p className="text-white/60 text-sm mb-6">
                        Este é o seu espaço privado no Sistema Nemosine. Aqui você poderá gerenciar seus dados e interações.
                    </p>

                    <SpaceStatusCards email={session.user?.email} />

                    <ExternalConnectionsPanel variant="space" />
                </div>
            </section>
            <InstitutionalFooter />
        </main>
    );
}
