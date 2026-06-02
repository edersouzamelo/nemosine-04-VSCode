"use client";

import { FormEvent, useState } from "react";
import Navbar from "../components/Navbar";
import InstitutionalFooter from "../components/InstitutionalFooter";

export default function DeveloperContactPage() {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
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
      body: JSON.stringify({ name, city, email, whatsapp, subject, message }),
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
    setCity("");
    setWhatsapp("");
  }

  return (
    <main className="nemosine-main-container relative min-h-screen">
      <div className="fixed inset-0 z-0">
        <div className="nemosine-bg-overlay absolute inset-0 z-10 backdrop-blur-[2px]" />
        <div className="nemosine-mental-castle-bg h-full w-full bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2000')] bg-cover bg-center" />
      </div>

      <Navbar />

      <section className="relative z-10 mx-auto grid w-full max-w-5xl gap-8 px-5 py-8 sm:p-12 lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="rounded-lg border border-[#c5a059]/20 bg-black/35 p-6 backdrop-blur-md flex flex-col justify-between">
          <div>
            <img
              src="/assets/developer-photo.jpg"
              alt="Desenvolvedor do Nemosine"
              className="aspect-square w-full rounded-lg border border-[#c5a059]/20 object-cover shadow-lg shadow-black/50"
              onError={(event) => {
                event.currentTarget.src = "/assets/nemosine-logo.png";
                event.currentTarget.className = "w-full rounded-lg border border-[#c5a059]/20 bg-black/40 p-8 object-contain";
              }}
            />
            <h1 className="mt-6 font-display text-4xl uppercase tracking-widest text-[#c5a059] mb-2 drop-shadow-[0_2px_10px_rgba(197,160,89,0.2)]">
              Fale com o Desenvolvedor
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/60 font-body">
              Envie sugestões, relatos de erro, ideias de integração ou feedback sobre sua experiência com o Nemosine.
            </p>
          </div>
          <div className="mt-6 grid gap-2 text-sm font-serif">
            <a href="https://ufmt.academia.edu/EdervaldoMelo" target="_blank" rel="noopener noreferrer" className="text-[#c5a059] hover:text-[#e6c97a] transition-colors underline underline-offset-4 decoration-[#c5a059]/30">
              Entenda de onde veio essa bagunça
            </a>
          </div>
        </aside>

        <form onSubmit={handleSubmit} className="rounded-lg border border-[#c5a059]/20 bg-black/35 p-6 backdrop-blur-md shadow-2xl">
          <div className="grid gap-4">
            <ContactInput label="Nome" value={name} onChange={setName} required />
            <ContactInput label="Cidade" value={city} onChange={setCity} placeholder="Sua cidade e estado" />
            <ContactInput label="Email" value={email} onChange={setEmail} type="email" required />
            <ContactInput label="WhatsApp" value={whatsapp} onChange={setWhatsapp} placeholder="Ex: (00) 90000-0000" />
            <ContactInput label="Assunto" value={subject} onChange={setSubject} />
            <label className="block text-[10px] font-display font-bold uppercase tracking-[0.22em] text-[#c5a059]/70">
              Mensagem
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                required
                rows={8}
                className="mt-2 w-full rounded-lg border border-[#c5a059]/25 bg-black/45 px-3 py-3 text-sm normal-case tracking-normal text-[#e1e1e6] outline-none focus:border-[#c5a059]/70 font-body transition-all"
              />
            </label>
          </div>

          {status === "sent" && <p className="mt-4 text-sm text-emerald-300 font-bold uppercase tracking-wider animate-pulse">Mensagem enviada com sucesso!</p>}
          {status === "error" && <p className="mt-4 text-sm text-rose-300 font-bold">{error}</p>}

          <button
            type="submit"
            disabled={status === "sending"}
            className="mt-6 w-full rounded-lg bg-[#c5a059] hover:bg-[#e4c476] px-4 py-3.5 text-xs font-display font-extrabold uppercase tracking-[0.2em] text-black disabled:cursor-wait disabled:opacity-60 transition-all duration-300 shadow-md shadow-black/30 hover:scale-[1.01] active:scale-95 cursor-pointer"
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
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block text-[10px] font-display font-bold uppercase tracking-[0.22em] text-[#c5a059]/70">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        placeholder={placeholder}
        className="mt-2 w-full rounded-lg border border-[#c5a059]/25 bg-black/45 px-3 py-3 text-sm normal-case tracking-normal text-[#e1e1e6] outline-none focus:border-[#c5a059]/70 font-body placeholder:text-white/20 transition-all"
      />
    </label>
  );
}
