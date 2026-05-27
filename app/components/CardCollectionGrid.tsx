"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AgentCard from "./AgentCard";
import { CardCollection, useLanguage } from "./LanguageProvider";

interface CardItem {
    name: string;
    image?: string;
    href: string;
}

interface CardCollectionGridProps {
    collection: CardCollection;
    items: CardItem[];
    orderUniverse?: string[];
    motionKey?: string;
}

export default function CardCollectionGrid({ collection, items, orderUniverse, motionKey }: CardCollectionGridProps) {
    const {
        cardOrderMode,
        ensureRandomCardOrder,
        getOrderedCards,
        setCustomCardOrder
    } = useLanguage();
    const names = useMemo(() => items.map((item) => item.name), [items]);
    const orderingNames = orderUniverse || names;
    const visibleNames = useMemo(() => new Set(names), [names]);
    const itemsByName = useMemo(() => new Map(items.map((item) => [item.name, item])), [items]);
    const completeOrderedNames = getOrderedCards(collection, orderingNames);
    const orderedNames = completeOrderedNames.filter((name) => visibleNames.has(name));
    const [draggingName, setDraggingName] = useState<string | null>(null);
    const [draftOrder, setDraftOrder] = useState<string[]>(orderedNames);
    const [isReordering, setIsReordering] = useState(true);
    const previousModeRef = useRef(cardOrderMode);
    const motionTimeoutRef = useRef<number | null>(null);
    const previousPositionsRef = useRef<Map<string, DOMRect> | null>(null);
    const cardNodesRef = useRef<Map<string, HTMLDivElement>>(new Map());
    const isCustom = cardOrderMode === "custom";

    const playCardMotion = () => {
        setIsReordering(true);
        if (motionTimeoutRef.current) {
            window.clearTimeout(motionTimeoutRef.current);
        }
        motionTimeoutRef.current = window.setTimeout(() => setIsReordering(false), 780);
    };

    useEffect(() => {
        playCardMotion();
        return () => {
            if (motionTimeoutRef.current) window.clearTimeout(motionTimeoutRef.current);
        };
    // Run the deal-in motion when a module opens or its visible group changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [collection, motionKey]);

    useEffect(() => {
        if (cardOrderMode === "random") {
            ensureRandomCardOrder(collection, orderingNames);
        }
        if (previousModeRef.current !== cardOrderMode) {
            playCardMotion();
            previousModeRef.current = cardOrderMode;
        }
        previousModeRef.current = cardOrderMode;
    // playCardMotion deliberately restarts the visual effect on mode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cardOrderMode, collection, ensureRandomCardOrder, orderingNames]);

    useEffect(() => {
        if (!draggingName) {
            setDraftOrder(orderedNames);
        }
    }, [draggingName, orderedNames]);

    const displayNames = draggingName ? draftOrder : orderedNames;

    useLayoutEffect(() => {
        const previousPositions = previousPositionsRef.current;
        if (!previousPositions) return;

        cardNodesRef.current.forEach((node, name) => {
            const previousPosition = previousPositions.get(name);
            if (!previousPosition || name === draggingName) return;
            const nextPosition = node.getBoundingClientRect();
            const x = previousPosition.left - nextPosition.left;
            const y = previousPosition.top - nextPosition.top;
            if (x || y) {
                node.animate(
                    [{ transform: `translate(${x}px, ${y}px)` }, { transform: "translate(0, 0)" }],
                    { duration: 190, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
                );
            }
        });
        previousPositionsRef.current = null;
    }, [draftOrder, draggingName]);

    const capturePositions = () => {
        previousPositionsRef.current = new Map(
            [...cardNodesRef.current.entries()].map(([name, node]) => [name, node.getBoundingClientRect()])
        );
    };

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>, name: string) => {
        if (!isCustom) return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        setDraftOrder(orderedNames);
        setDraggingName(name);
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!draggingName) return;
        event.preventDefault();
        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-card-name]");
        const targetName = target?.dataset.cardName;
        if (!targetName || targetName === draggingName) return;

        capturePositions();
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

    const finishDrag = (event?: React.PointerEvent<HTMLDivElement>) => {
        if (!draggingName) return;
        event?.preventDefault();
        event?.stopPropagation();
        if (orderingNames.length === names.length) {
            setCustomCardOrder(collection, draftOrder);
        } else {
            const reorderedVisibleNames = draftOrder[Symbol.iterator]();
            const mergedOrder = completeOrderedNames.map((name) => {
                if (!visibleNames.has(name)) return name;
                const nextName = reorderedVisibleNames.next();
                return nextName.done ? name : nextName.value;
            });
            setCustomCardOrder(collection, mergedOrder);
        }
        setDraggingName(null);
    };

    return (
        <div className="grid grid-cols-4 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-4 md:gap-6">
            {displayNames.map((name) => {
                const item = itemsByName.get(name);
                if (!item) return null;
                return (
                    <div
                        key={name}
                        data-card-name={name}
                        ref={(node) => {
                            if (node) cardNodesRef.current.set(name, node);
                            else cardNodesRef.current.delete(name);
                        }}
                        onPointerDown={isCustom ? (event) => handlePointerDown(event, name) : undefined}
                        onPointerMove={isCustom ? handlePointerMove : undefined}
                        onPointerUp={isCustom ? finishDrag : undefined}
                        onPointerCancel={isCustom ? finishDrag : undefined}
                        onContextMenu={isCustom ? (event) => event.preventDefault() : undefined}
                        style={{ animationDelay: isReordering ? `${Math.min(displayNames.indexOf(name), 15) * 22}ms` : undefined }}
                        className={`relative transition-[transform,filter,opacity] duration-200 ${isCustom ? "touch-none select-none cursor-grab active:cursor-grabbing" : ""} ${isReordering ? "card-shuffle-motion" : ""} ${draggingName === name ? "z-20 scale-[1.06] rotate-1 drop-shadow-[0_15px_18px_rgba(197,160,89,0.4)]" : ""}`}
                    >
                        <AgentCard
                            name={name}
                            label={collection === "places" ? "Lugar" : "Persona"}
                            image={item.image}
                            href={isCustom ? undefined : item.href}
                            className={collection === "places" ? "aspect-[4/7]" : ""}
                        />
                        {isCustom && (
                            <>
                                <span
                                    aria-hidden="true"
                                    className={`pointer-events-none absolute right-1 top-1 z-20 flex h-8 w-8 items-center justify-center rounded-full border bg-black/75 text-[#c5a059] shadow-md transition-all ${draggingName === name ? "border-[#c5a059] bg-[#c5a059] text-black scale-110" : "border-[#c5a059]/40"}`}
                                >
                                    <span className="material-icons text-base">drag_indicator</span>
                                </span>
                                <Link
                                    href={item.href}
                                    aria-label={`Abrir ${name}`}
                                    onPointerDown={(event) => event.stopPropagation()}
                                    onClick={(event) => event.stopPropagation()}
                                    className="absolute bottom-8 right-1 z-30 flex h-8 w-8 touch-manipulation items-center justify-center rounded-full border border-[#c5a059]/40 bg-black/80 text-[#c5a059] shadow-md hover:border-[#c5a059]"
                                >
                                    <span className="material-icons text-sm">open_in_new</span>
                                </Link>
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
