import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DestinyLineClient from "./DestinyLineClient";

export default async function LinhaDoDestinoPage({
    searchParams,
}: {
    searchParams?: Promise<{ embed?: string }>;
}) {
    const session = await auth();
    const params = await searchParams;

    if (!session?.user?.id) {
        redirect("/access?callbackUrl=/soberano/linha-do-destino");
    }

    return <DestinyLineClient embed={params?.embed === "true"} />;
}
