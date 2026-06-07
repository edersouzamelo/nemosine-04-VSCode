"use client";

import React from "react";
import { useLanguage } from "./LanguageProvider";

export default function SingularityImmersiveOverlay({ children }: { children: React.ReactNode }) {
    const { singularity } = useLanguage();

    return (
        <div className={`relative ${singularity === "on" ? "is-singularity-active" : ""}`}>
            {singularity === "on" && (
                <div
                    aria-hidden="true"
                    className="pointer-events-none fixed inset-0 z-0 opacity-35"
                    style={{
                        background:
                            "radial-gradient(circle at 50% 12%, rgba(197,160,89,0.08), transparent 32%), radial-gradient(circle at 18% 78%, rgba(197,160,89,0.05), transparent 28%)",
                    }}
                />
            )}
            {children}
        </div>
    );
}
