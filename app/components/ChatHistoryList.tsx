"use client";

import React, { useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";

interface ChatThread {
    id: string;
    title: string;
    updatedAt: number;
}

interface ChatHistoryListProps {
    personaId: string;
    onSelectThread: (threadId: string) => void;
    currentThreadId: string | null;
    refreshTrigger: number; // Increment to force refresh
    expanded?: boolean;
}

export default function ChatHistoryList({ personaId, onSelectThread, currentThreadId, refreshTrigger, expanded = false }: ChatHistoryListProps) {
    const { entityName } = useLanguage();
    const [threads, setThreads] = useState<ChatThread[]>([]);

    useEffect(() => {
        const fetchThreads = async () => {
            try {
                const res = await fetch(`/api/chat?personaId=${personaId}`);
                const data = await res.json();
                if (data.threads) {
                    setThreads(data.threads);
                }
            } catch (e) {
                console.error("Failed to load threads", e);
            }
        };
        fetchThreads();
    }, [personaId, refreshTrigger]);

    if (threads.length === 0) return null;

    return (
        <div className={expanded ? "w-full min-h-0 flex flex-col" : "w-full"}>
            <div className={expanded
                ? "flex max-h-[calc(100dvh-390px)] min-h-[160px] flex-col gap-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[#c5a059]/30"
                : "flex flex-col gap-1 max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#c5a059]/30"}
            >
                {threads.map(thread => (
                    <button
                        key={thread.id}
                        onClick={() => onSelectThread(thread.id)}
                        className={`text-left text-xs p-2 rounded transition-all font-serif ${expanded ? "whitespace-normal break-words leading-snug" : "truncate"} ${currentThreadId === thread.id
                                ? "bg-[#c5a059]/20 text-[#c5a059] font-bold"
                                : "text-[#e1e1e6]/60 hover:text-[#c5a059] hover:bg-[#c5a059]/5"
                            }`}
                    >
                        {thread.title.replaceAll("Confessor 2.0", entityName("Confessor 2.0"))}
                    </button>
                ))}
            </div>
        </div>
    );
}
