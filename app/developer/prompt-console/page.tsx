import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdminEmail } from "@/app/lib/accessControl";
import Navbar from "@/app/components/Navbar";
import PromptConsoleClient from "./PromptConsoleClient";

export const dynamic = "force-dynamic";

export default async function PromptConsolePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/access?callbackUrl=/developer/prompt-console");
  }

  if (!isAdminEmail(session.user.email)) {
    return (
      <main className="min-h-screen bg-[#07070a] text-[#f5ead4]">
        <Navbar />
        <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-5">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-red-300">403</p>
          <h1 className="mt-3 font-serif text-3xl text-[#f1ddb0]">Acesso negado</h1>
          <p className="mt-3 text-sm leading-6 text-white/55">
            Este painel e exclusivo da conta Dev autorizada.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07070a] text-[#f5ead4]">
      <Navbar />
      <PromptConsoleClient />
    </main>
  );
}
