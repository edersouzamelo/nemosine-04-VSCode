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
                className={`flex min-h-32 w-12 items-center justify-center rounded-lg border px-1.5 py-3 text-[9px] font-bold uppercase tracking-[0.18em] transition-colors disabled:cursor-wait disabled:opacity-60 ${favorite
                    ? "border-rose-300/35 bg-rose-400/10 text-rose-200 hover:border-rose-200/65"
                    : "border-[#c5a059]/30 bg-black/55 text-[#c5a059]/80 hover:border-[#c5a059]/60 hover:bg-[#c5a059]/10"
                }`}
            >
                <span className="writing-vertical-rl text-orientation-mixed">
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
