import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Navbar from "../components/Navbar";
import InstitutionalFooter from "../components/InstitutionalFooter";
import ExternalConnectionsPanel from "../components/ExternalConnectionsPanel";
import SpaceStatusCards from "../components/SpaceStatusCards";
import { getUserStorageUsage } from "../lib/userStorageUsage";

export default async function SpacePage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/access?callbackUrl=/space");
    }
    const storageUsage = await getUserStorageUsage(session.user.id);

    return (
        <main className="nemosine-main-container relative min-h-screen flex flex-col">
            {/* Dark Immersive Background */}
            <div className="fixed inset-0 z-0">
                <div className="nemosine-bg-overlay absolute inset-0 z-10 backdrop-blur-[2px]"></div>
                <div className="nemosine-mental-castle-bg w-full h-full bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2000')] bg-cover bg-center"></div>
            </div>

            <Navbar />

            <section className="relative z-10 flex-1 px-5 py-8 sm:p-12 max-w-4xl mx-auto w-full">
                <header className="mb-12 text-center flex flex-col items-center">
                    <h1 className="font-display text-4xl uppercase tracking-widest text-[#c5a059] mb-2 drop-shadow-[0_2px_10px_rgba(197,160,89,0.2)]">
                        Meu Espaço
                    </h1>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-[#c5a059]/40 font-bold">
                        Área privada e integrações pessoais
                    </p>
                </header>

                <div className="bg-black/40 border border-[#c5a059]/20 p-5 sm:p-8 rounded-xl backdrop-blur-md">
                    <p className="text-xl mb-4 font-serif text-white/90">Bem-vindo, {session.user?.name || session.user?.email}</p>
                    <p className="text-white/60 text-sm mb-6 font-body">
                        Este é o seu espaço privado no Sistema Nemosine. Aqui você poderá gerenciar seus dados e interações.
                    </p>

                    <SpaceStatusCards email={session.user?.email} storageUsage={storageUsage} />

                    <ExternalConnectionsPanel variant="space" />
                </div>
            </section>
            <InstitutionalFooter />
        </main>
    );
}
