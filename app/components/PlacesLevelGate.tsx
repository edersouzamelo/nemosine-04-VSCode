"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "./LanguageProvider";

export default function PlacesLevelGate({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { level } = useLanguage();
    // Guard against the hydration race: localStorage is read inside a useEffect in
    // LanguageProvider, so on the very first render `level` is still "Peregrino".
    // We wait one tick after mount before enforcing the gate.
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        // This runs after LanguageProvider has already applied the stored level.
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (hydrated && level !== "Soberano") {
            router.replace("/agents");
        }
    }, [hydrated, level, router]);

    // While hydrating show nothing (avoids flash of wrong content).
    if (!hydrated) return null;
    if (level !== "Soberano") return null;

    return children;
}
