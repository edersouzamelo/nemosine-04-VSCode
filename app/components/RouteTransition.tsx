"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";

export default function RouteTransition({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const previousPathRef = useRef(pathname);
    const timeoutRef = useRef<number | null>(null);
    const [mounted, setMounted] = useState(false);
    const [active, setActive] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => {
            if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        };
    }, []);

    useEffect(() => {
        if (!mounted) return;
        if (previousPathRef.current === pathname) return;
        previousPathRef.current = pathname;

        if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        setActive(true);
        timeoutRef.current = window.setTimeout(() => {
            setActive(false);
            timeoutRef.current = null;
        }, 520);
    }, [mounted, pathname]);

    return (
        <>
            <div key={pathname} className="route-transition-shell">
                {children}
            </div>
            {mounted && active && createPortal(
                <div
                    id="nemosine-route-transition-root"
                    data-route-transition-root="true"
                    aria-hidden="true"
                    className="nemosine-route-transition-root"
                >
                    <div className="nemosine-route-transition-stage">
                        <span className="nemosine-route-transition-ring nemosine-route-transition-ring-a" />
                        <span className="nemosine-route-transition-ring nemosine-route-transition-ring-b" />
                        <span className="nemosine-route-transition-core" />
                    </div>
                    <style jsx global>{`
                        .nemosine-route-transition-root {
                            position: fixed;
                            inset: 0;
                            z-index: 9997;
                            pointer-events: none;
                            display: grid;
                            place-items: center;
                            background: rgba(5, 5, 7, 0.18);
                            backdrop-filter: blur(1.5px);
                            isolation: isolate;
                            contain: layout paint style;
                        }
                        .nemosine-route-transition-stage {
                            position: relative;
                            width: 88px;
                            height: 88px;
                            display: grid;
                            place-items: center;
                            transform: none;
                        }
                        .nemosine-route-transition-ring,
                        .nemosine-route-transition-core {
                            position: absolute;
                            display: block;
                            border-radius: 9999px;
                            transform-origin: center;
                        }
                        .nemosine-route-transition-ring {
                            border: 1px solid rgba(253, 230, 138, 0.72);
                            box-shadow: 0 0 18px rgba(253, 230, 138, 0.22);
                            animation-name: nemosine-route-transition-ring-pulse;
                            animation-duration: 520ms;
                            animation-timing-function: ease-out;
                            animation-fill-mode: both;
                        }
                        .nemosine-route-transition-ring-a {
                            width: 70px;
                            height: 70px;
                        }
                        .nemosine-route-transition-ring-b {
                            width: 42px;
                            height: 42px;
                            animation-delay: 70ms;
                        }
                        .nemosine-route-transition-core {
                            width: 12px;
                            height: 12px;
                            border-radius: 2px;
                            background: #facc15;
                            box-shadow: 0 0 22px rgba(250, 204, 21, 0.9);
                            animation: nemosine-route-transition-core-pulse 520ms ease-out both;
                        }
                        @keyframes nemosine-route-transition-ring-pulse {
                            0% { opacity: 0; transform: scale(0.55); }
                            35% { opacity: 1; }
                            100% { opacity: 0; transform: scale(1.45); }
                        }
                        @keyframes nemosine-route-transition-core-pulse {
                            0% { opacity: 0; transform: rotate(45deg) scale(0.7); }
                            35% { opacity: 1; transform: rotate(45deg) scale(1); }
                            100% { opacity: 0.88; transform: rotate(45deg) scale(0.86); }
                        }
                        @media (prefers-reduced-motion: reduce) {
                            .nemosine-route-transition-ring,
                            .nemosine-route-transition-core {
                                animation: none;
                            }
                            .nemosine-route-transition-root {
                                display: none;
                            }
                        }
                    `}</style>
                </div>,
                document.body,
            )}
        </>
    );
}
