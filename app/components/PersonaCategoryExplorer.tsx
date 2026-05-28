"use client";

import { useEffect, useMemo, useState } from "react";
import CardCollectionGrid from "./CardCollectionGrid";

interface PersonaItem {
    name: string;
    image?: string;
    href: string;
}

type PersonaCategory = "favorites" | "all" | "strategic" | "symbolic" | "operational" | "emotional";

const categories: Array<{
    id: PersonaCategory;
    label: string;
    description: string;
    names?: string[];
}> = [
    {
        id: "favorites",
        label: "Favoritos",
        description: "Até 12 personas escolhidas por você."
    },
    {
        id: "strategic",
        label: "Estratégicas",
        description: "Direção, decisão e perspectiva.",
        names: ["Mentor", "Estrategista", "Orquestrador-Arquiteto", "Cientista", "Juiz", "Vidente", "Cigana", "Astrônomo", "Guru", "Comandante", "Advogado", "Promotor"]
    },
    {
        id: "symbolic",
        label: "Simbólicas",
        description: "Narrativa, significado e imaginação.",
        names: ["Narrador", "Autor", "Artista", "Bruxo", "Filósofo", "Luz", "Sombra", "Fantasma", "Herdeiro", "Princesa", "Bobo da Corte", "Louco", "Espelho"]
    },
    {
        id: "operational",
        label: "Operacionais",
        description: "Execução, cuidado e sustentação.",
        names: ["Adjunto", "Aprovisionador", "Executor", "Engenheiro", "Instrutor", "Mestre", "Mordomo", "Sócio", "Treinador", "Vigia", "Guardião", "Curador", "Médico", "Arauto", "Bruto"]
    },
    {
        id: "emotional",
        label: "Emocionais",
        description: "Escuta, conflito e transformação interna.",
        names: ["Confessor 2.0", "Psicólogo", "Custódio", "Desejo", "Dor", "Fúria", "Inimigo", "Exorcista", "Coveiro", "Terapeuta", "Espião", "Burguês", "Arqueólogo", "Mentorzinho", "Vazio", "Vingador"]
    },
    {
        id: "all",
        label: "Todos",
        description: "Todas as vozes disponíveis no sistema."
    }
];

export default function PersonaCategoryExplorer({
    items,
    showCategories = true,
    initialCategory = "strategic"
}: {
    items: PersonaItem[];
    showCategories?: boolean;
    initialCategory?: PersonaCategory;
}) {
    const [activeCategory, setActiveCategory] = useState<PersonaCategory>(initialCategory);
    const [favoriteNames, setFavoriteNames] = useState<string[]>([]);
    const itemMap = useMemo(() => new Map(items.map((item) => [item.name, item])), [items]);
    const allNames = useMemo(() => items.map((item) => item.name), [items]);
    const category = categories.find((option) => option.id === activeCategory) || categories[0];
    useEffect(() => {
        if (!showCategories) return;
        const loadFavorites = () => fetch("/api/favorites/personas")
            .then((response) => response.ok ? response.json() : { favorites: [] })
            .then((data) => setFavoriteNames(Array.isArray(data.favorites) ? data.favorites : []))
            .catch(() => setFavoriteNames([]));
        loadFavorites();
        window.addEventListener("nemosine:favorites-updated", loadFavorites);

        return () => window.removeEventListener("nemosine:favorites-updated", loadFavorites);
    }, [showCategories]);

    const visibleItems = !showCategories || category.id === "all"
        ? items
        : category.id === "favorites"
            ? favoriteNames
                .slice(0, 12)
                .map((name) => itemMap.get(name))
                .filter((item): item is PersonaItem => Boolean(item))
        : (category.names || [])
            .map((name) => itemMap.get(name))
            .filter((item): item is PersonaItem => Boolean(item));

    return (
        <>
            {showCategories && (
                <>
                    <div className="mb-8 grid grid-cols-2 gap-2 md:grid-cols-6">
                        {categories.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => setActiveCategory(option.id)}
                                className={`rounded-xl border p-3 text-left transition-colors ${option.id === activeCategory ? "border-[#c5a059]/55 bg-[#c5a059]/10 text-[#d9bb78]" : "border-[#c5a059]/12 bg-black/15 text-[#c5a059]/55 hover:border-[#c5a059]/32"}`}
                            >
                                <span className="block text-[10px] font-bold uppercase tracking-[0.14em]">{option.label}</span>
                            </button>
                        ))}
                    </div>
                    <p className="mb-7 text-center text-sm italic text-[#c5a059]/58">{category.description}</p>
                    {category.id === "favorites" && visibleItems.length === 0 && (
                        <p className="mb-7 text-center text-xs uppercase tracking-[0.22em] text-[#c5a059]/35">
                            Nenhuma persona favorita ainda.
                        </p>
                    )}
                </>
            )}
            <CardCollectionGrid collection="personas" items={visibleItems} orderUniverse={allNames} motionKey={activeCategory} />
        </>
    );
}
