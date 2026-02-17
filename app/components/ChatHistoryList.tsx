"use client";

import React, { useEffect, useState } from "react";

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
}

export default function ChatHistoryList({ personaId, onSelectThread, currentThreadId, refreshTrigger }: ChatHistoryListProps) {
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
        <div className="mt-6 w-full">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#c5a059]/60 font-serif mb-3 border-b border-[#c5a059]/20 pb-1">
                Memórias Recentes
            </h3>
            <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#c5a059]/30">
                {threads.map(thread => (
                    <button
                        key={thread.id}
                        onClick={() => onSelectThread(thread.id)}
                        className={`text-left text-xs p-2 rounded transition-all font-serif truncate ${currentThreadId === thread.id
                                ? "bg-[#c5a059]/20 text-[#c5a059] font-bold"
                                : "text-[#e1e1e6]/60 hover:text-[#c5a059] hover:bg-[#c5a059]/5"
                            }`}
                    >
                        {thread.title}
                    </button>
                ))}
            </div>
        </div>
    );
}
