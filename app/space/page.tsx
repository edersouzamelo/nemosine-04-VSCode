import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import AccountAdministrationPanel from "../components/AccountAdministrationPanel";
import InstitutionalFooter from "../components/InstitutionalFooter";
import Navbar from "../components/Navbar";
import { isAdminEmail } from "../lib/accessControl";
import { getUserStorageUsage } from "../lib/userStorageUsage";

const prisma = new PrismaClient();

export default async function SpacePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/access?callbackUrl=/space");
  }

  const [storageUsage, account] = await Promise.all([
    getUserStorageUsage(session.user.id),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    }),
  ]);

  return (
    <main className="nemosine-main-container relative flex min-h-screen flex-col">
      <div className="fixed inset-0 z-0">
        <div className="nemosine-bg-overlay absolute inset-0 z-10 backdrop-blur-[2px]" />
        <div className="nemosine-mental-castle-bg h-full w-full bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2000')] bg-cover bg-center" />
      </div>

      <Navbar />

      <section className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-5 py-8 sm:p-12">
        <header className="mb-12 flex flex-col items-center text-center">
          <h1 className="font-display mb-2 text-4xl uppercase tracking-widest text-[#c5a059] drop-shadow-[0_2px_10px_rgba(197,160,89,0.2)]">
            Meu Espaco
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#c5a059]/40">
            Conta, seguranca, dados e administracao pessoal
          </p>
        </header>

        <AccountAdministrationPanel
          user={{
            name: session.user?.name,
            email: session.user?.email,
            hasPassword: Boolean(account?.password),
            isAdmin: isAdminEmail(session.user?.email),
          }}
          storageUsage={storageUsage}
        />
      </section>

      <InstitutionalFooter />
    </main>
  );
}
