"use client";

import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";

interface DeveloperMessage {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  user_email: string | null;
  created_at: string;
  archived: boolean;
  is_read: boolean;
}

export default function DeveloperMessagesPage() {
  const [messages, setMessages] = useState<DeveloperMessage[]>([]);
  const [activeTab, setActiveTab] = useState<"inbox" | "archived">("inbox");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchMessages = async (tab: "inbox" | "archived") => {
    setLoading(true);
    try {
      const isArchived = tab === "archived";
      const response = await fetch(`/api/developer/messages?archived=${isArchived}`);
      if (!response.ok) throw new Error("Acesso negado");
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages(activeTab);
  }, [activeTab]);

  const handleArchive = async (id: string, currentArchived: boolean) => {
    try {
      const res = await fetch("/api/developer/messages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "archive", archived: !currentArchived }),
      });
      if (res.ok) {
        // Remove from list smoothly
        setMessages((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (err) {
      console.error("Error archiving message:", err);
    }
  };

  const handleMarkRead = async (id: string, currentRead: boolean) => {
    try {
      const res = await fetch("/api/developer/messages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "markRead", isRead: !currentRead }),
      });
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, is_read: !currentRead } : m))
        );
      }
    } catch (err) {
      console.error("Error marking message read:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/developer/messages?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== id));
        setConfirmDeleteId(null);
      }
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  };

  return (
    <main className="nemosine-main-container relative min-h-screen">
      <div className="fixed inset-0 z-0">
        <div className="nemosine-bg-overlay absolute inset-0 z-10 backdrop-blur-[2px]" />
        <div className="nemosine-mental-castle-bg h-full w-full bg-[url('https://images.unsplash.com/photo-1510519138101-570d1dca3d66?q=80&w=2000')] bg-cover bg-center" />
      </div>

      <Navbar />

      <section className="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:p-12 animate-fade-in">
        <header className="mb-10 text-center">
          <h1 className="mb-2 font-display text-4xl uppercase tracking-widest text-[#c5a059]">
            Mensagens ao Desenvolvedor
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#c5a059]/40 font-bold">
            Caixa de entrada do Nemosine
          </p>
        </header>

        {/* Tab Controls */}
        <div className="flex border-b border-[#c5a059]/20 mb-8 max-w-md mx-auto justify-center gap-4">
          <button
            type="button"
            onClick={() => setActiveTab("inbox")}
            className={`pb-3 text-xs uppercase tracking-widest font-bold transition-all px-4 cursor-pointer border-b-2 ${
              activeTab === "inbox"
                ? "border-[#c5a059] text-[#c5a059]"
                : "border-transparent text-white/40 hover:text-white/70"
            }`}
          >
            📬 Caixa de Entrada
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("archived")}
            className={`pb-3 text-xs uppercase tracking-widest font-bold transition-all px-4 cursor-pointer border-b-2 ${
              activeTab === "archived"
                ? "border-[#c5a059] text-[#c5a059]"
                : "border-transparent text-white/40 hover:text-white/70"
            }`}
          >
            📁 Arquivadas
          </button>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-12 animate-pulse">
            <div className="w-10 h-10 rounded-full border-2 border-[#c5a059]/20 border-t-[#c5a059] animate-spin mb-4"></div>
            <p className="text-xs uppercase tracking-widest text-[#c5a059]/70 font-bold">Carregando mensagens...</p>
          </div>
        )}
        
        {error && <p className="text-center text-rose-300 font-bold text-sm bg-rose-500/10 border border-rose-500/35 rounded-lg py-4">{error}</p>}

        <div className="grid gap-4">
          {messages.map((item) => (
            <article 
              key={item.id} 
              className={`rounded-xl border transition-all duration-300 p-6 backdrop-blur-md relative overflow-hidden group
                ${item.is_read 
                  ? "border-[#c5a059]/10 bg-black/35 hover:border-[#c5a059]/20" 
                  : "border-[#c5a059]/35 bg-black/60 shadow-[0_0_15px_rgba(197,160,89,0.08)] hover:border-[#c5a059]/50"
                }`}
            >
              {/* Unread dot indicator */}
              {!item.is_read && (
                <div className="absolute top-3 left-3 w-2 h-2 bg-[#c5a059] rounded-full animate-pulse" title="Mensagem Nova/Não lida" />
              )}

              <div className="flex flex-col gap-3 border-b border-[#c5a059]/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="font-display text-lg font-bold text-[#e7d4aa] tracking-wide">
                      {item.subject || "Sem assunto"}
                    </h2>
                    {!item.is_read && (
                      <span className="text-[7.5px] uppercase tracking-widest bg-[#c5a059]/20 text-[#c5a059] px-2 py-0.5 rounded-full border border-[#c5a059]/25 font-bold">
                        Nova
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/45 mt-1 font-body">
                    De: <strong className="text-white/70">{item.name}</strong> · <a href={`mailto:${item.email}`} className="hover:underline hover:text-[#c5a059]">{item.email}</a>
                  </p>
                  {item.user_email && (
                    <p className="text-[10px] text-[#c5a059]/55 mt-0.5">
                      Usuário logado: {item.user_email}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <time className="text-[10px] font-mono tracking-widest text-[#c5a059]/55">
                    {new Date(item.created_at).toLocaleString("pt-BR")}
                  </time>
                  
                  {/* Action Controls */}
                  <div className="flex items-center gap-2 mt-1">
                    {/* Mark Read/Unread */}
                    <button
                      type="button"
                      onClick={() => handleMarkRead(item.id, item.is_read)}
                      title={item.is_read ? "Marcar como não lida" : "Marcar como lida"}
                      className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer
                        ${item.is_read 
                          ? "border-[#c5a059]/10 text-white/40 hover:border-[#c5a059]/35 hover:text-white" 
                          : "border-[#c5a059]/40 text-[#c5a059] hover:bg-[#c5a059]/15"
                        }`}
                    >
                      <span className="material-icons text-base">
                        {item.is_read ? "mark_email_unread" : "mark_email_read"}
                      </span>
                    </button>

                    {/* Archive/Unarchive */}
                    <button
                      type="button"
                      onClick={() => handleArchive(item.id, item.archived)}
                      title={item.archived ? "Mover para Entrada" : "Arquivar mensagem"}
                      className="w-7 h-7 rounded-lg border border-[#c5a059]/10 text-white/40 hover:border-[#c5a059]/35 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                    >
                      <span className="material-icons text-base">
                        {item.archived ? "unarchive" : "archive"}
                      </span>
                    </button>

                    {/* Delete Trigger */}
                    {confirmDeleteId === item.id ? (
                      <div className="flex items-center gap-1 animate-fade-in">
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white text-[9px] uppercase tracking-widest font-bold cursor-pointer"
                        >
                          Sim
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white/80 text-[9px] uppercase tracking-widest font-bold cursor-pointer"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(item.id)}
                        title="Apagar mensagem"
                        className="w-7 h-7 rounded-lg border border-red-950/20 text-red-400/40 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300 flex items-center justify-center transition-all cursor-pointer"
                      >
                        <span className="material-icons text-base">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-[#e1e1e6]/80 font-body select-text">{item.message}</p>
            </article>
          ))}
          
          {!loading && !error && messages.length === 0 && (
            <div className="text-center py-16 bg-black/20 border border-[#c5a059]/10 rounded-xl">
              <span className="text-4xl block mb-3">📬</span>
              <p className="text-sm italic text-white/35 font-body">Nenhuma mensagem neste painel no momento.</p>
            </div>
          )}
        </div>

        {/* Back button */}
        <div className="mt-10 flex justify-center">
          <a
            href="/admin"
            className="cursor-pointer border border-[#c5a059]/40 bg-[#c5a059]/10 hover:bg-[#c5a059]/20 px-8 py-3 rounded-xl font-display text-[9px] uppercase tracking-widest text-[#fde68a] hover:text-white transition-all font-semibold shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
          >
            ← Retornar ao Painel do Criador
          </a>
        </div>
      </section>
    </main>
  );
}
