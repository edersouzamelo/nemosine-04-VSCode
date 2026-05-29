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
}

export default function DeveloperMessagesPage() {
  const [messages, setMessages] = useState<DeveloperMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/developer/messages")
      .then((response) => {
        if (!response.ok) throw new Error("Acesso negado");
        return response.json();
      })
      .then((data) => setMessages(data.messages || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="nemosine-main-container relative min-h-screen">
      <div className="fixed inset-0 z-0">
        <div className="nemosine-bg-overlay absolute inset-0 z-10 backdrop-blur-[2px]" />
        <div className="nemosine-mental-castle-bg h-full w-full bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2000')] bg-cover bg-center" />
      </div>

      <Navbar />

      <section className="relative z-10 mx-auto max-w-5xl px-5 py-8 sm:p-12">
        <header className="mb-12 text-center">
          <h1 className="mb-2 font-serif text-4xl uppercase tracking-tight text-[#c5a059]">
            Mensagens ao Desenvolvedor
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#c5a059]/40">
            Caixa de entrada do Nemosine
          </p>
        </header>

        {loading && <p className="text-center text-[#c5a059]/70">Carregando mensagens...</p>}
        {error && <p className="text-center text-rose-300">{error}</p>}

        <div className="grid gap-4">
          {messages.map((item) => (
            <article key={item.id} className="rounded-lg border border-[#c5a059]/20 bg-black/35 p-5 backdrop-blur-md">
              <div className="flex flex-col gap-1 border-b border-[#c5a059]/10 pb-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-serif text-xl text-[#e7d4aa]">{item.subject || "Sem assunto"}</h2>
                  <p className="text-xs text-white/45">
                    {item.name} · {item.email}
                  </p>
                  {item.user_email && <p className="text-[11px] text-[#c5a059]/45">Usuário logado: {item.user_email}</p>}
                </div>
                <time className="text-[11px] uppercase tracking-[0.16em] text-[#c5a059]/45">
                  {new Date(item.created_at).toLocaleString("pt-BR")}
                </time>
              </div>
              <p className="mt-4 whitespace-pre-line text-sm leading-6 text-[#e1e1e6]/82">{item.message}</p>
            </article>
          ))}
          {!loading && !error && messages.length === 0 && (
            <p className="text-center text-sm italic text-white/35">Nenhuma mensagem recebida ainda.</p>
          )}
        </div>
      </section>
    </main>
  );
}
