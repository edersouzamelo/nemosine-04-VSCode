"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useLanguage } from "./LanguageProvider";

export default function OnboardingVideo({ openSignal = 0 }: { openSignal?: number }) {
    const { data: session } = useSession();
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const identity = session?.user?.email;
        if (!identity) return;
        const key = `nemosine-onboarding-video:${identity}`;
        if (!window.localStorage.getItem(key)) {
            setIsOpen(true);
            window.localStorage.setItem(key, "shown");
        }
    }, [session?.user?.email]);

    useEffect(() => {
        if (openSignal > 0) setIsOpen(true);
    }, [openSignal]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <section className="w-full max-w-4xl rounded-lg border border-[#c5a059]/40 bg-[#080809] p-4 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-serif text-xl text-[#c5a059]">{t("onboardingTitle")}</h2>
                    <button type="button" onClick={() => setIsOpen(false)} className="text-sm text-[#c5a059] hover:text-white">
                        {t("close")}
                    </button>
                </div>
                <div className="aspect-video overflow-hidden rounded border border-[#c5a059]/20">
                    <iframe
                        className="h-full w-full"
                        src="https://www.youtube.com/embed/J6P2EmmubAo"
                        title={t("onboardingTitle")}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                    />
                </div>
            </section>
        </div>
    );
}
