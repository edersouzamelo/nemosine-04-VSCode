"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import PersonaSpeakerBadge from "@/app/components/PersonaSpeakerBadge";

type SharedMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content?: string;
  parts?: Array<{ type: string; text?: string }>;
  speakerPersonaId?: string | null;
  messageKind?: "USER" | "PERSONA" | "SYSTEM_EVENT" | null;
  generationStatus?: string | null;
};

type SharedChat = {
  title: string;
  personaId: string;
  messages: SharedMessage[];
  createdAt: string;
};

function getMessageText(message: SharedMessage) {
  if (message.parts) {
    return message.parts.filter((part) => part.type === "text").map((part) => part.text || "").join("");
  }
  return message.content || "";
}

export default function SharedChatPage() {
  const params = useParams();
  const token = String(params.token || "");
  const [chat, setChat] = useState<SharedChat | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/chat/share?token=${encodeURIComponent(token)}`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setChat(data?.chat || null))
      .catch(() => setChat(null))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <main className="relative min-h-screen bg-[#050507] text-[#e1e1e6]">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1505664194779-8beaceb93744?q=80&w=2000')] bg-cover bg-center opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-[#050507]/82 to-black" />
      </div>

      <section className="relative z-10 mx-auto max-w-4xl px-4 py-10 sm:px-8">
        <a href="/inicio" className="mb-8 inline-flex text-[10px] font-bold uppercase tracking-[0.25em] text-[#c5a059]/70 hover:text-[#c5a059]">
          Nemosine Nous
        </a>

        {loading ? (
          <div className="rounded-2xl border border-[#c5a059]/20 bg-black/50 p-10 text-center text-[#c5a059]/70">Carregando conversa...</div>
        ) : !chat ? (
          <div className="rounded-2xl border border-[#c5a059]/20 bg-black/50 p-10 text-center text-white/55">Conversa compartilhada não encontrada.</div>
        ) : (
          <div className="rounded-2xl border border-[#c5a059]/20 bg-black/60 shadow-2xl backdrop-blur-md">
            <header className="border-b border-[#c5a059]/15 p-5">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#c5a059]/55">Conversa compartilhada</p>
              <h1 className="mt-2 font-display text-2xl uppercase tracking-widest text-[#c5a059]">{chat.title}</h1>
              <p className="mt-2 text-xs uppercase tracking-widest text-white/35">{chat.personaId}</p>
            </header>
            <div className="space-y-4 p-5">
              {chat.messages.map((message) => {
                if (message.role === "system" || message.messageKind === "SYSTEM_EVENT") {
                  return (
                    <div key={message.id} className="text-center text-[10px] uppercase tracking-[0.22em] text-[#c5a059]/55">
                      {getMessageText(message)}
                    </div>
                  );
                }
                const speaker = message.role === "user" ? "Usuário" : (message.speakerPersonaId || chat.personaId);
                return (
                  <article key={message.id} className={`rounded-2xl border p-4 ${message.role === "user" ? "ml-auto border-[#c5a059]/30 bg-[#c5a059]/10" : "mr-auto border-[#c5a059]/15 bg-black/45"}`}>
                    {message.role === "assistant"
                      ? <PersonaSpeakerBadge personaId={speaker} status={message.generationStatus} />
                      : <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-[#c5a059]/60">{speaker}</p>}
                    <div className="chat-readable chat-rich-assistant max-w-none text-sm leading-relaxed text-[#eee8dc]">
                      <Markdown remarkPlugins={[remarkGfm]}>{getMessageText(message).replace(/\[MEMORY:\s*.*?\]/ig, "").trim()}</Markdown>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
