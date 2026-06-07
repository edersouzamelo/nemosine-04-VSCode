import { redirect } from "next/navigation";
import { auth } from "@/auth";
import CastleScene3D from "../../components/CastleScene3D";
import { isAdminEmail } from "../../lib/accessControl";

export default async function CasteloPreview3DPage() {
    const session = await auth();
    if (!isAdminEmail(session?.user?.email)) {
        redirect("/inicio");
    }

    return (
        <main className="h-screen w-screen overflow-hidden bg-[#050507]">
            <CastleScene3D />
        </main>
    );
}
