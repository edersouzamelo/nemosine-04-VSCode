"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "./LanguageProvider";

const relicsByLevel: Record<string, string[]> = {
    Peregrino: [
        "O portão ainda reconhece seus passos.",
        "A primeira lâmpada permanece acesa.",
        "O Castelo observa em baixa voz.",
        "Uma chave sem nome repousa no átrio."
    ],
    Vassalo: [
        "O Vigia registra presença estável.",
        "A Oficina conserva calor discreto.",
        "Três corredores respondem ao chamado.",
        "A rotina sustenta pequenas engrenagens."
    ],
    Regente: [
        "O Conselho permanece em silêncio.",
        "Arquitetura parcial estabilizada.",
        "O Regente hesita diante do mapa.",
        "Há movimento no Observatório."
    ],
    Soberano: [
        "A Sala do Trono mantém vigília.",
        "O Castelo opera sob comando alto.",
        "A Biblioteca aguarda retorno.",
        "As torres reconhecem a assinatura."
    ]
};

const generalRelics = [
    "O Vigia detecta dispersão.",
    "Três vozes permanecem acordadas.",
    "O Castelo opera em baixa luminosidade.",
    "A Ponte sustenta passagem estreita.",
    "O Núcleo preserva silêncio funcional.",
    "O Arquivo fechou uma gaveta recente."
];

export default function RelicPhrase({ className = "" }: { className?: string }) {
    const { level } = useLanguage();
    const [phrase, setPhrase] = useState("");
    const candidates = useMemo(() => [...(relicsByLevel[level] || []), ...generalRelics], [level]);

    useEffect(() => {
        const index = Math.floor(Math.random() * candidates.length);
        setPhrase(candidates[index] || "O Castelo permanece atento.");
    }, [candidates]);

    if (!phrase) return null;

    return <span className={className}>{phrase}</span>;
}
