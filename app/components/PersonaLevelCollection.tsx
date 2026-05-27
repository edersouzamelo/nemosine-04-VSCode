"use client";

import { useLanguage } from "./LanguageProvider";
import PersonaCategoryExplorer from "./PersonaCategoryExplorer";

interface PersonaItem {
    name: string;
    image?: string;
    href: string;
}

const PEREGRINO_AGENTS = [
    "Mentor", "Inimigo", "Bruxo", "Vidente", "Estrategista", "Cientista", "Narrador", "Psicólogo"
];

const VASSALO_AGENTS = [
    ...PEREGRINO_AGENTS,
    "Orquestrador-Arquiteto", "Vigia", "Executor", "Arauto", "Curador", "Artista", "Autor", "Espelho",
    "Sombra", "Desejo", "Dor", "Terapeuta", "Mordomo", "Mestre", "Sócio", "Burguês"
];

export default function PersonaLevelCollection({ items }: { items: PersonaItem[] }) {
    const { level } = useLanguage();
    const allowedNames = level === "Peregrino"
        ? PEREGRINO_AGENTS
        : level === "Vassalo"
            ? VASSALO_AGENTS
            : null;
    const visibleItems = allowedNames
        ? allowedNames
            .map((name) => items.find((item) => item.name === name))
            .filter((item): item is PersonaItem => Boolean(item))
        : items;
    const showCategories = level === "Regente" || level === "Soberano";

    return (
        <PersonaCategoryExplorer
            key={level}
            showCategories={showCategories}
            initialCategory={level === "Regente" ? "all" : "strategic"}
            items={visibleItems}
        />
    );
}

export function PersonaLevelFooter() {
    const { level } = useLanguage();
    const count = level === "Peregrino" ? PEREGRINO_AGENTS.length : level === "Vassalo" ? VASSALO_AGENTS.length : 56;

    return (
        <footer className="relative z-20 border-t border-[#c5a059]/10 bg-black/60 p-8 text-center">
            <p className="text-[10px] medieval-text-gold opacity-40">
                Existem {count} processos cognitivos ativos neste nível da rede Nemosine. Selecione uma persona para iniciar o processamento.
            </p>
        </footer>
    );
}
