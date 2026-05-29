"use client";

import { FormEvent, useState } from "react";
import Navbar from "../components/Navbar";
import InstitutionalFooter from "../components/InstitutionalFooter";

export default function DeveloperContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setError("");

    const response = await fetch("/api/developer/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, subject, message }),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Não foi possível enviar sua mensagem.");
      setStatus("error");
      return;
    }

    setStatus("sent");
    setSubject("");
    setMessage("");
  }

  return (
    <main className="nemosine-main-container relative min-h-screen">
      <div className="fixed inset-0 z-0">
        <div className="nemosine-bg-overlay absolute inset-0 z-10 backdrop-blur-[2px]" />
        <div className="nemosine-mental-castle-bg h-full w-full bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2000')] bg-cover bg-center" />
      </div>

      <Navbar />

      <section className="relative z-10 mx-auto grid w-full max-w-5xl gap-8 px-5 py-8 sm:p-12 lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="rounded-lg border border-[#c5a059]/20 bg-black/35 p-6 backdrop-blur-md">
          <img
            src="/assets/developer-photo.jpg"
            alt="Desenvolvedor do Nemosine"
            className="aspect-square w-full rounded-lg border border-[#c5a059]/20 object-cover"
            onError={(event) => {
              event.currentTarget.src = "/assets/nemosine-logo.png";
              event.currentTarget.className = "w-full rounded-lg border border-[#c5a059]/20 bg-black/40 p-8 object-contain";
            }}
          />
          <h1 className="mt-6 font-serif text-3xl uppercase tracking-tight text-[#c5a059]">
            Fale com o Desenvolvedor
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Envie sugestões, relatos de erro, ideias de integração ou feedback sobre sua experiência com o Nemosine.
          </p>
          <div className="mt-6 grid gap-2 text-sm">
            <a href="https://ufmt.academia.edu/EdervaldoMelo" target="_blank" rel="noopener noreferrer" className="text-[#c5a059] hover:text-[#e6c97a]">
              Entenda de onde veio essa bagunça
            </a>
          </div>
        </aside>

        <form onSubmit={handleSubmit} className="rounded-lg border border-[#c5a059]/20 bg-black/35 p-6 backdrop-blur-md">
          <div className="grid gap-4">
            <ContactInput label="Nome" value={name} onChange={setName} required />
            <ContactInput label="Email" value={email} onChange={setEmail} type="email" required />
            <ContactInput label="Assunto" value={subject} onChange={setSubject} />
            <label className="block text-[10px] font-bold uppercase tracking-[0.22em] text-[#c5a059]/70">
              Mensagem
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                required
                rows={8}
                className="mt-2 w-full rounded-lg border border-[#c5a059]/25 bg-black/45 px-3 py-3 text-sm normal-case tracking-normal text-[#e1e1e6] outline-none focus:border-[#c5a059]/70"
              />
            </label>
          </div>

          {status === "sent" && <p className="mt-4 text-sm text-emerald-300">Mensagem enviada.</p>}
          {status === "error" && <p className="mt-4 text-sm text-rose-300">{error}</p>}

          <button
            type="submit"
            disabled={status === "sending"}
            className="mt-6 w-full rounded-lg bg-[#c5a059] px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-black disabled:cursor-wait disabled:opacity-60"
          >
            {status === "sending" ? "Enviando..." : "Enviar mensagem"}
          </button>
        </form>
      </section>
      <InstitutionalFooter />
    </main>
  );
}

function ContactInput({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-[10px] font-bold uppercase tracking-[0.22em] text-[#c5a059]/70">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-2 w-full rounded-lg border border-[#c5a059]/25 bg-black/45 px-3 py-3 text-sm normal-case tracking-normal text-[#e1e1e6] outline-none focus:border-[#c5a059]/70"
      />
    </label>
  );
}
