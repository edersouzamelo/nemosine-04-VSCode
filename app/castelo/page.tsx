import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Navbar from "../components/Navbar";
import InstitutionalFooter from "../components/InstitutionalFooter";
import CastleMap from "../components/CastleMap";
import OnboardingTour from "../components/OnboardingTour";
import { isAdminEmail } from "../lib/accessControl";
import { getTravessiaSnapshot } from "../lib/travessia/engine";
import { casteloTourSteps } from "../data/onboardingTours";

export default async function CasteloPage() {
    const session = await auth();
    if (!isAdminEmail(session?.user?.email)) {
        redirect("/inicio");
    }
    const travessiaSnapshot = session?.user?.id ? await getTravessiaSnapshot(session.user.id) : null;

    return (
        <main className="nemosine-main-container relative min-h-screen">
            <div className="fixed inset-0 z-0">
                <div className="nemosine-bg-overlay absolute inset-0 z-10 backdrop-blur-[2px]" />
                <div className="nemosine-mental-castle-bg h-full w-full bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2000')] bg-cover bg-center" />
            </div>

            <Navbar />

            <section className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-8 lg:px-12">
                <header data-tour="castelo-header" className="mx-auto mb-8 max-w-3xl text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#c5a059]/45">
                        Hub simbolico do Nemosine
                    </p>
                    <h1 className="mt-3 font-display text-4xl uppercase tracking-[0.24em] text-[#c5a059] drop-shadow-[0_2px_16px_rgba(197,160,89,0.18)] md:text-5xl">
                        Castelo
                    </h1>
                    <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#e9dfcb]/65">
                        Um mapa habitavel da arquitetura mental: personas, travessia, dominios, memorias e os futuros portoes dos Lugares da Mente.
                    </p>
                </header>

                <CastleMap travessiaSnapshot={travessiaSnapshot} />
            </section>

            <InstitutionalFooter />
            <OnboardingTour
                tourId="castelo"
                storageKey="nemosine_onboarding_castelo_completed"
                steps={casteloTourSteps}
            />
        </main>
    );
}
