import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdminEmail } from "@/app/lib/accessControl";

export default async function TravessiaLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();
    if (!isAdminEmail(session?.user?.email)) {
        redirect("/inicio");
    }

    return children;
}
