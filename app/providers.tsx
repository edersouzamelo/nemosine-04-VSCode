"use client";

import { SessionProvider } from "next-auth/react";
import { LanguageProvider } from "./components/LanguageProvider";
import SingularityImmersiveOverlay from "./components/SingularityImmersiveOverlay";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <LanguageProvider>
                <SingularityImmersiveOverlay>{children}</SingularityImmersiveOverlay>
            </LanguageProvider>
        </SessionProvider>
    );
}
