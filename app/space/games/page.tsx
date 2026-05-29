"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RedirectGamesPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/space/dominios");
    }, [router]);

    return null;
}
