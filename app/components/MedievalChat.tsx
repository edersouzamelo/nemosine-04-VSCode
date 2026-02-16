"use client";

import React, { useState } from "react";

interface Message {
    id: number;
    text: string;
    sender: "user" | "persona";
}

export default function MedievalChat() {
    const [messages, setMessages] = useState<Message[]>([
        { id: 1, text: "Saudações, viajante da mente. Como posso auxiliar em sua jornada hoje?", sender: "persona" },
    ]);
    const [input, setInput] = useState("");

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const newMessage: Message = {
            id: Date.now(),
            text: input,
            sender: "user",
        };

        setMessages([...messages, newMessage]);
        setInput("");

        // Simulate response
        setTimeout(() => {
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                text: "Entendido. Processando sua solicitação nos estratos da consciência...",
                sender: "persona"
            }]);
        }, 1000);
    };

    return (
        <div className="glass-medieval w-full flex flex-col h-[400px]">
            {/* Header */}
            <div className="border-b border-[#c5a059]/10 p-4 bg-black/20 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.2em] medieval-text-gold font-bold">Comunicação Arcona</span>
                <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#c5a059]/40"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#c5a059]/20"></div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-[#c5a059]/20">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div className={`max-w-[80%] p-3 text-xs leading-relaxed ${msg.sender === "user"
                                ? "bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#e1e1e6] rounded-tl-xl rounded-tr-sm rounded-br-sm rounded-bl-xl"
                                : "bg-black/40 border border-[#c5a059]/10 text-[#c5a059] italic rounded-tl-sm rounded-tr-xl rounded-br-xl rounded-bl-sm"
                            }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-black/40 border-t border-[#c5a059]/10">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Sussurre sua mensagem..."
                        className="w-full bg-black/40 border border-[#c5a059]/20 p-3 pr-12 text-xs text-[#e1e1e6] placeholder-[#c5a059]/20 focus:outline-none focus:border-[#c5a059]/50 transition-all font-serif italic"
                    />
                    <button
                        type="submit"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c5a059] hover:text-[#c5a059]/80 transition-colors"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                        </svg>
                    </button>
                </div>
            </form>
        </div>
    );
}
