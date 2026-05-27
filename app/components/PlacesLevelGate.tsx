"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "./LanguageProvider";

export default function PlacesLevelGate({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { level } = useLanguage();

    useEffect(() => {
        if (level !== "Soberano") {
            router.replace("/agents");
        }
    }, [level, router]);

    if (level !== "Soberano") {
        return null;
    }

    return children;
}
