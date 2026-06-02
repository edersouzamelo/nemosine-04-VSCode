"use client";

import { useEffect, useState } from "react";

interface FavoritePersonaButtonProps {
    personaName: string;
    variant?: "side" | "icon";
}

export default function FavoritePersonaButton({ personaName, variant = "side" }: FavoritePersonaButtonProps) {
    const [favorite, setFavorite] = useState(false);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    useEffect(() => {
        let active = true;
        fetch("/api/favorites/personas")
            .then((response) => response.ok ? response.json() : { favorites: [] })
            .then((data) => {
                if (!active) return;
                setFavorite(Array.isArray(data.favorites) && data.favorites.includes(personaName));
            })
            .catch(() => undefined)
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [personaName]);

    async function toggleFavorite() {
        if (loading) return;
        setLoading(true);
        setMessage("");

        const response = await fetch("/api/favorites/personas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ personaId: personaName, favorite: !favorite }),
        });
        const data = await response.json();

        if (!response.ok) {
            setMessage(data.error || "Não foi possível atualizar favoritos.");
            setLoading(false);
            return;
        }

        setFavorite(Boolean(data.favorite));
        window.dispatchEvent(new Event("nemosine:favorites-updated"));
        setLoading(false);
    }

    return (
        <div className={variant === "icon" ? "w-full lg:w-10" : undefined}>
            <button
                type="button"
                onClick={toggleFavorite}
                disabled={loading}
                title={loading ? "Verificando favorito" : favorite ? "Remover dos favoritos" : "Favoritar"}
                aria-label={loading ? "Verificando favorito" : favorite ? "Remover dos favoritos" : "Favoritar"}
                className={variant === "icon"
                    ? `group/action relative flex h-10 w-full items-center gap-3 rounded-lg border border-[#c5a059]/25 bg-black/45 px-3 text-left text-[#c5a059]/75 transition-colors hover:border-[#c5a059]/60 hover:bg-[#c5a059]/10 hover:text-[#c5a059] disabled:cursor-wait disabled:opacity-60 lg:w-10 lg:justify-center lg:gap-0 lg:px-0 ${favorite ? "border-rose-300/35 bg-rose-500/10 text-rose-200" : ""}`
                    : `side-action-button flex min-h-36 w-12 items-center justify-center overflow-hidden rounded-lg px-1.5 py-3 text-[8px] font-bold uppercase tracking-[0.18em] disabled:cursor-wait disabled:opacity-60 ${favorite
                    ? "is-favorite"
                    : ""
                }`}
            >
                {variant === "icon" ? (
                    <>
                        <span className="material-icons text-[18px]">{favorite ? "favorite" : "favorite_border"}</span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] lg:hidden">{favorite ? "Favorito" : "Favoritar"}</span>
                        <span className="pointer-events-none absolute left-1/2 top-full z-[80] mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-[#c5a059]/25 bg-[#07070a]/95 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-[#c5a059] opacity-0 shadow-xl transition-opacity group-hover/action:opacity-100 lg:block">
                            {favorite ? "Favorito" : "Favoritar"}
                        </span>
                    </>
                ) : (
                    <span className="writing-vertical-rl whitespace-nowrap text-orientation-mixed">
                        {loading ? "Verificando..." : favorite ? "Favorito ❤️" : "Favoritar"}
                    </span>
                )}
            </button>
            {message && (
                <p className="fixed bottom-5 left-1/2 z-[60] max-w-[min(90vw,360px)] -translate-x-1/2 rounded-lg border border-rose-300/30 bg-[#12080b]/95 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-200 shadow-2xl">
                    escolha até 12 favoritos
                </p>
            )}
        </div>
    );
}
