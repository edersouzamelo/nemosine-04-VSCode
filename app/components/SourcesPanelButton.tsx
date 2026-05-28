"use client";

import { useEffect, useRef, useState } from "react";

type SourceItem = {
    id: string;
    filename: string;
    personaId?: string | null;
    createdAt: string;
    preview: string;
};

export default function SourcesPanelButton({ personaName }: { personaName: string }) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState(false);
    const [sources, setSources] = useState<SourceItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    async function loadSources() {
        const response = await fetch("/api/sources");
        const data = await response.json();
        setSources(data.sources || []);
    }

    useEffect(() => {
        if (open) {
            loadSources().catch(() => setMessage("Não foi possível carregar as fontes."));
        }
    }, [open]);

    async function upload(file: File) {
        setLoading(true);
        setMessage("");
        const formData = new FormData();
        formData.append("file", file);
        formData.append("personaId", personaName);

        const response = await fetch("/api/sources", {
            method: "POST",
            body: formData,
        });
        const data = await response.json();

        if (!response.ok) {
            setMessage(data.error || "Não foi possível processar a fonte.");
            setLoading(false);
            return;
        }

        if (fileRef.current) fileRef.current.value = "";
        await loadSources();
        setMessage("Fonte incorporada ao sistema.");
        setLoading(false);
    }

    async function removeSource(id: string) {
        setMessage("");
        await fetch(`/api/sources?id=${encodeURIComponent(id)}`, { method: "DELETE" });
        await loadSources();
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex min-h-32 w-12 items-center justify-center rounded-lg border border-[#c5a059]/30 bg-black/55 px-1.5 py-3 text-[9px] font-bold uppercase tracking-[0.18em] text-[#c5a059]/80 transition-colors hover:border-[#c5a059]/60 hover:bg-[#c5a059]/10"
            >
                <span className="writing-vertical-rl text-orientation-mixed">Fontes</span>
            </button>

            <div className={`fixed top-0 right-0 z-50 h-full w-full max-w-[420px] transform border-l border-[#c5a059]/30 bg-[#050507]/95 shadow-2xl backdrop-blur-xl transition-transform duration-500 ease-in-out ${open ? "translate-x-0" : "translate-x-full"}`}>
                <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="absolute left-6 top-6 text-[#c5a059] transition-colors hover:text-white"
                    aria-label="Fechar fontes"
                >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="h-full overflow-y-auto p-8 pt-20">
                    <h2 className="mb-6 border-b border-[#c5a059]/20 pb-4 font-serif text-2xl text-[#c5a059]">Fontes</h2>

                    <div className="space-y-5 text-[#e1e1e6]">
                        <div className="rounded-lg border border-[#c5a059]/15 bg-black/30 p-4">
                            <label className="mb-3 block text-[10px] font-bold uppercase tracking-[0.22em] text-[#c5a059]/70">
                                Adicionar arquivo
                            </label>
                            <input
                                ref={fileRef}
                                type="file"
                                accept=".pdf,.docx,.txt,.md,.csv,application/pdf,text/plain,text/markdown,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                disabled={loading}
                                onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (file) upload(file);
                                }}
                                className="w-full rounded border border-[#c5a059]/20 bg-black/40 p-3 text-xs text-[#e1e1e6] file:mr-3 file:rounded file:border-0 file:bg-[#c5a059] file:px-3 file:py-2 file:text-xs file:font-bold file:uppercase file:tracking-widest file:text-black"
                            />
                            <p className="mt-3 text-xs leading-5 text-white/45">
                                PDF, DOCX, TXT, MD ou CSV. O texto extraído passa a orientar este persona e o contexto geral do usuário.
                            </p>
                        </div>

                        {message && (
                            <p className="rounded border border-[#c5a059]/20 bg-[#c5a059]/10 px-3 py-2 text-xs text-[#ead9b6]">
                                {message}
                            </p>
                        )}

                        <div className="space-y-3">
                            {sources.map((source) => (
                                <article key={source.id} className="rounded-lg border border-[#c5a059]/12 bg-black/25 p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="truncate text-sm font-semibold text-[#ead9b6]">{source.filename}</h3>
                                            <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#c5a059]/55">
                                                {source.personaId ? `Inserida em ${source.personaId}` : "Fonte geral"}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeSource(source.id)}
                                            className="rounded border border-rose-300/20 px-2 py-1 text-[10px] uppercase tracking-widest text-rose-200/70 hover:bg-rose-400/10"
                                        >
                                            Excluir
                                        </button>
                                    </div>
                                    <p className="mt-3 line-clamp-4 text-xs leading-5 text-white/55">{source.preview}</p>
                                </article>
                            ))}

                            {!loading && sources.length === 0 && (
                                <p className="rounded-lg border border-dashed border-[#c5a059]/20 p-4 text-sm italic text-white/40">
                                    Nenhuma fonte incorporada ainda.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {open && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                    onClick={() => setOpen(false)}
                />
            )}
        </>
    );
}
