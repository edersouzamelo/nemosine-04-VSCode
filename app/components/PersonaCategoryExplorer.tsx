"use client";

import { useMemo, useState } from "react";
import CardCollectionGrid from "./CardCollectionGrid";

interface PersonaItem {
    name: string;
    image?: string;
    href: string;
}

type PersonaCategory = "strategic" | "symbolic" | "operational" | "emotional";

const categories: Array<{
    id: PersonaCategory;
    label: string;
    description: string;
    names: string[];
}> = [
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
        label: "Emocionais / Psicodinâmicas",
        description: "Escuta, conflito e transformação interna.",
        names: ["Confessor 2.0", "Psicólogo", "Custódio", "Desejo", "Dor", "Fúria", "Inimigo", "Exorcista", "Coveiro", "Terapeuta", "Espião", "Burguês", "Arqueólogo", "Mentorzinho", "Vazio", "Vingador"]
    }
];

export default function PersonaCategoryExplorer({ items }: { items: PersonaItem[] }) {
    const [activeCategory, setActiveCategory] = useState<PersonaCategory>("strategic");
    const itemMap = useMemo(() => new Map(items.map((item) => [item.name, item])), [items]);
    const allNames = useMemo(() => items.map((item) => item.name), [items]);
    const category = categories.find((option) => option.id === activeCategory) || categories[0];
    const visibleItems = category.names
        .map((name) => itemMap.get(name))
        .filter((item): item is PersonaItem => Boolean(item));

    return (
        <>
            <div className="mb-8 grid grid-cols-2 gap-2 md:grid-cols-4">
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
            <CardCollectionGrid collection="personas" items={visibleItems} orderUniverse={allNames} motionKey={activeCategory} />
        </>
    );
}
