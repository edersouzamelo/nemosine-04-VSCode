import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Navbar from "@/app/components/Navbar";
import InstitutionalFooter from "@/app/components/InstitutionalFooter";
import TravessiaInicialClient from "./TravessiaInicialClient";

export default async function TravessiaInicialPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/access?callbackUrl=/space/travessia-inicial");

  return (
    <main className="nemosine-main-container relative min-h-screen text-[#e1e1e6]">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 z-10 bg-[#050507]/82 backdrop-blur-[2px]" />
        <div className="h-full w-full bg-[url('/assets/castle-gate-entrance.png')] bg-cover bg-center" />
      </div>
      <Navbar />
      <TravessiaInicialClient />
      <InstitutionalFooter />
    </main>
  );
}
