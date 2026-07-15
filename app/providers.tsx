"use client";

import { SessionProvider } from "next-auth/react";
import { LanguageProvider } from "./components/LanguageProvider";
import RouteTransition from "./components/RouteTransition";
import SingularityImmersiveOverlay from "./components/SingularityImmersiveOverlay";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <LanguageProvider>
                <SingularityImmersiveOverlay>
                    <RouteTransition>{children}</RouteTransition>
                </SingularityImmersiveOverlay>
            </LanguageProvider>
        </SessionProvider>
    );
}
