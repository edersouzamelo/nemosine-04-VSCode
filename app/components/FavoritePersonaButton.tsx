"use client";

import { useEffect, useState } from "react";

export default function FavoritePersonaButton({ personaName }: { personaName: string }) {
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
        <div>
            <button
                type="button"
                onClick={toggleFavorite}
                disabled={loading}
                className={`side-action-button flex min-h-36 w-12 items-center justify-center overflow-hidden rounded-lg px-1.5 py-3 text-[8px] font-bold uppercase tracking-[0.18em] disabled:cursor-wait disabled:opacity-60 ${favorite
                    ? "is-favorite"
                    : ""
                }`}
            >
                <span className="writing-vertical-rl whitespace-nowrap text-orientation-mixed">
                    {loading ? "Verificando..." : favorite ? "Favorito ❤️" : "Favoritar"}
                </span>
            </button>
            {message && (
                <p className="fixed bottom-5 left-1/2 z-[60] max-w-[min(90vw,360px)] -translate-x-1/2 rounded-lg border border-rose-300/30 bg-[#12080b]/95 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-200 shadow-2xl">
                    escolha até 12 favoritos
                </p>
            )}
        </div>
    );
}
