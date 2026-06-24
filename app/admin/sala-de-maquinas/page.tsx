import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdminEmail } from "@/app/lib/accessControl";
import SalaDeMaquinasClient from "./SalaDeMaquinasClient";

export const dynamic = "force-dynamic";

export default async function SalaDeMaquinasPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/access?callbackUrl=/admin/sala-de-maquinas");
  }

  if (!isAdminEmail(session.user.email)) {
    redirect("/space");
  }

  return <SalaDeMaquinasClient />;
}
