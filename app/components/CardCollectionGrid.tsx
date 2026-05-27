"use client";

import React, { useEffect, useMemo, useState } from "react";
import AgentCard from "./AgentCard";
import { CardCollection, useLanguage } from "./LanguageProvider";

interface CardItem {
    name: string;
    image?: string;
}

interface CardCollectionGridProps {
    collection: CardCollection;
    items: CardItem[];
}

export default function CardCollectionGrid({ collection, items }: CardCollectionGridProps) {
    const {
        cardOrderMode,
        ensureRandomCardOrder,
        getOrderedCards,
        setCustomCardOrder
    } = useLanguage();
    const names = useMemo(() => items.map((item) => item.name), [items]);
    const itemsByName = useMemo(() => new Map(items.map((item) => [item.name, item])), [items]);
    const orderedNames = getOrderedCards(collection, names);
    const [draggingName, setDraggingName] = useState<string | null>(null);
    const [draftOrder, setDraftOrder] = useState<string[]>(orderedNames);
    const isCustom = cardOrderMode === "custom";

    useEffect(() => {
        if (cardOrderMode === "random") {
            ensureRandomCardOrder(collection, names);
        }
    }, [cardOrderMode, collection, ensureRandomCardOrder, names]);

    useEffect(() => {
        if (!draggingName) {
            setDraftOrder(orderedNames);
        }
    }, [draggingName, orderedNames]);

    const displayNames = draggingName ? draftOrder : orderedNames;

    const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>, name: string) => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        setDraftOrder(orderedNames);
        setDraggingName(name);
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
        if (!draggingName) return;
        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-card-name]");
        const targetName = target?.dataset.cardName;
        if (!targetName || targetName === draggingName) return;

        setDraftOrder((current) => {
            const fromIndex = current.indexOf(draggingName);
            const toIndex = current.indexOf(targetName);
            if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return current;
            const next = [...current];
            next.splice(fromIndex, 1);
            next.splice(toIndex, 0, draggingName);
            return next;
        });
    };

    const finishDrag = () => {
        if (!draggingName) return;
        setCustomCardOrder(collection, draftOrder);
        setDraggingName(null);
    };

    return (
        <div className="grid grid-cols-4 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-4 md:gap-6">
            {displayNames.map((name) => {
                const slug = name.toLowerCase().replace(/\s+/g, "-");
                const item = itemsByName.get(name);
                return (
                    <div
                        key={name}
                        data-card-name={name}
                        className={`relative ${draggingName === name ? "opacity-60 scale-[0.98]" : ""}`}
                    >
                        <AgentCard
                            name={name}
                            label={collection === "places" ? "Lugar" : "Persona"}
                            image={item?.image}
                            href={`/agents/${slug}`}
                            className={collection === "places" ? "aspect-[4/7]" : ""}
                        />
                        {isCustom && (
                            <button
                                type="button"
                                aria-label={`Mover ${name}`}
                                onPointerDown={(event) => handlePointerDown(event, name)}
                                onPointerMove={handlePointerMove}
                                onPointerUp={finishDrag}
                                onPointerCancel={finishDrag}
                                className="absolute right-1 top-1 z-20 flex h-7 w-7 touch-none items-center justify-center rounded-full border border-[#c5a059]/40 bg-black/75 text-[#c5a059] shadow-md cursor-grab active:cursor-grabbing"
                            >
                                <span className="material-icons text-base">drag_indicator</span>
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
