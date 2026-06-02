"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DefaultChatTransport, UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ChatSession = {
  id: string;
  title: string;
  messages: UIMessage[];
  updatedAt: string;
};

const SESSIONS_KEY = "nemo_chat_sessions";
const ACTIVE_SESSION_KEY = "nemo_chat_active_session";

function getMessageText(message: UIMessage): string {
  return message.parts
    ? message.parts.filter((part) => part.type === "text").map((part) => part.text).join("")
    : (message as UIMessage & { content?: string }).content || "";
}

function normalizeSpeechSegment(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function titleFromMessages(messages: UIMessage[]) {
  const firstUserText = messages.find((message) => message.role === "user");
  const text = firstUserText ? getMessageText(firstUserText).replace(/\[NEMO_(?:FILE:[^\]]+|AUDIO)\]/g, "").trim() : "";
  return text ? `${text.slice(0, 34)}${text.length > 34 ? "..." : ""}` : "Nova conversa";
}

function AttachmentChip({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/75">
      <span className="material-icons text-[16px]">{icon}</span>
      <span className="truncate">{label}</span>
    </span>
  );
}

function UserMessage({ content }: { content: string }) {
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const hasAttachment = lines.some((line) => line.startsWith("[NEMO_FILE:") || line === "[NEMO_AUDIO]");

  if (!hasAttachment) return <MessageContent content={content} />;

  return (
    <div className="flex flex-col items-end gap-2">
      {lines.map((line, index) => {
        const fileMatch = line.match(/^\[NEMO_FILE:(.*)\]$/);
        if (fileMatch) return <AttachmentChip key={`${line}-${index}`} icon="description" label={fileMatch[1] || "Arquivo anexado"} />;
        if (line === "[NEMO_AUDIO]") return <AttachmentChip key={`${line}-${index}`} icon="graphic_eq" label="Audio anexado" />;
        return <MessageContent key={`${line}-${index}`} content={line} />;
      })}
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="my-3 list-disc space-y-1 pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="my-3 list-decimal space-y-1 pl-5">{children}</ol>,
        li: ({ children }) => <li className="pl-1">{children}</li>,
        blockquote: ({ children }) => <blockquote className="my-3 border-l-2 border-white/20 pl-3 text-white/75">{children}</blockquote>,
        code: ({ children }) => <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.92em] text-white">{children}</code>,
        pre: ({ children }) => <pre className="my-3 overflow-x-auto rounded-xl bg-black/45 p-3 text-sm">{children}</pre>,
        a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="text-emerald-300 underline underline-offset-2">{children}</a>,
      }}
    >
      {content}
    </Markdown>
  );
}

export default function NemoChatPage() {
  const [input, setInput] = useState("");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState(() => crypto.randomUUID());
  const [mounted, setMounted] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [liveVoiceTranscript, setLiveVoiceTranscript] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const shouldKeepListeningRef = useRef(false);
  const finalVoiceSegmentsRef = useRef<string[]>([]);
  const finalVoiceSegmentKeysRef = useRef<Set<string>>(new Set());

  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/sovereign/pure-chat" }), []);
  const { messages, sendMessage, status, setMessages, error, clearError } = useChat({
    id: `nemo-chat-${activeSessionId}`,
    transport,
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    setMounted(true);
    try {
      const storedSessions = JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]") as ChatSession[];
      const storedActive = localStorage.getItem(ACTIVE_SESSION_KEY);
      setSessions(storedSessions);
      if (storedActive && storedSessions.some((session) => session.id === storedActive)) {
        setActiveSessionId(storedActive);
        setMessages(storedSessions.find((session) => session.id === storedActive)?.messages || []);
      } else if (storedSessions[0]) {
        setActiveSessionId(storedSessions[0].id);
        setMessages(storedSessions[0].messages);
      }
    } catch {
      localStorage.removeItem(SESSIONS_KEY);
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    }
  }, [setMessages]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
  }, [activeSessionId, mounted]);

  useEffect(() => {
    if (!mounted || messages.length === 0) return;

    setSessions((current) => {
      const nextSession: ChatSession = {
        id: activeSessionId,
        title: titleFromMessages(messages),
        messages,
        updatedAt: new Date().toISOString(),
      };
      const next = [nextSession, ...current.filter((session) => session.id !== activeSessionId)].slice(0, 20);
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
      return next;
    });
  }, [activeSessionId, messages, mounted]);

  useEffect(() => {
    if (typeof window === "undefined" || (!("SpeechRecognition" in window) && !("webkitSpeechRecognition" in window))) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = "pt-BR";

    recognitionRef.current.onresult = (event: any) => {
      const interimSegments: string[] = [];
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const segment = event.results[i][0].transcript.trim();
        if (!segment) continue;
        if (event.results[i].isFinal) {
          const key = normalizeSpeechSegment(segment);
          if (!finalVoiceSegmentKeysRef.current.has(key)) {
            finalVoiceSegmentKeysRef.current.add(key);
            finalVoiceSegmentsRef.current.push(segment);
          }
        } else {
          interimSegments.push(segment);
        }
      }
      setVoiceTranscript(finalVoiceSegmentsRef.current.join(" ").trim());
      setLiveVoiceTranscript(interimSegments.join(" ").trim());
    };

    recognitionRef.current.onerror = (event: any) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        shouldKeepListeningRef.current = false;
      }
      setIsListening(false);
    };
    recognitionRef.current.onend = () => {
      setLiveVoiceTranscript("");
      if (shouldKeepListeningRef.current) {
        window.setTimeout(() => {
          if (!shouldKeepListeningRef.current || !recognitionRef.current) return;
          try {
            recognitionRef.current.start();
            setIsListening(true);
          } catch {
            window.setTimeout(() => {
              if (!shouldKeepListeningRef.current || !recognitionRef.current) return;
              try {
                recognitionRef.current.start();
                setIsListening(true);
              } catch {
                setIsListening(false);
              }
            }, 500);
          }
        }, 180);
        return;
      }
      setIsListening(false);
    };

    return () => {
      shouldKeepListeningRef.current = false;
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const startNewChat = () => {
    clearError();
    setInput("");
    setSelectedFile(null);
    setVoiceTranscript("");
    setLiveVoiceTranscript("");
    shouldKeepListeningRef.current = false;
    recognitionRef.current?.stop();
    const id = crypto.randomUUID();
    setActiveSessionId(id);
    setMessages([]);
  };

  const openSession = (session: ChatSession) => {
    clearError();
    setInput("");
    setSelectedFile(null);
    setVoiceTranscript("");
    setLiveVoiceTranscript("");
    shouldKeepListeningRef.current = false;
    recognitionRef.current?.stop();
    setActiveSessionId(session.id);
    setMessages(session.messages);
  };

  const toggleListening = () => {
    if (isListening) {
      shouldKeepListeningRef.current = false;
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    shouldKeepListeningRef.current = true;
    setVoiceTranscript("");
    setLiveVoiceTranscript("");
    finalVoiceSegmentsRef.current = [];
    finalVoiceSegmentKeysRef.current = new Set();
    try {
      recognitionRef.current?.start();
    } catch {
      // Browsers can throw if recognition is already starting.
    }
    setIsListening(true);
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    const audioText = voiceTranscript.trim();
    if ((!text && !selectedFile && !audioText) || isLoading) return;

    let files: FileList | undefined;
    if (selectedFile) {
      const transfer = new DataTransfer();
      transfer.items.add(selectedFile);
      files = transfer.files;
    }

    const displayText = [
      text,
      selectedFile ? `[NEMO_FILE:${selectedFile.name || "Arquivo anexado"}]` : "",
      audioText ? "[NEMO_AUDIO]" : "",
    ].filter(Boolean).join("\n");

    clearError();
    shouldKeepListeningRef.current = false;
    recognitionRef.current?.stop();
    setInput("");
    setSelectedFile(null);
    setVoiceTranscript("");
    setLiveVoiceTranscript("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    await sendMessage({ text: displayText, files }, { body: { voiceTranscript: audioText || undefined } });
  };

  return (
    <main className="flex h-screen min-h-[520px] w-full overflow-hidden bg-[#212121] text-[#ececec]">
      <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-[#171717] p-3 md:flex md:flex-col">
        <button
          type="button"
          onClick={startNewChat}
          className="mb-4 flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-sm font-medium text-white/85 transition-colors hover:bg-white/10"
        >
          <span className="material-icons text-base">edit_square</span>
          Novo chat
        </button>

        <div className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-widest text-white/35">Recentes</div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {sessions.length === 0 ? (
            <p className="px-2 text-xs text-white/35">Nenhum chat recente.</p>
          ) : (
            sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => openSession(session)}
                className={`block w-full truncate rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                  session.id === activeSessionId ? "bg-white/12 text-white" : "text-white/65 hover:bg-white/8 hover:text-white"
                }`}
              >
                {session.title}
              </button>
            ))
          )}
        </nav>

        <div className="mt-3 rounded-xl bg-white/5 p-3 text-xs leading-relaxed text-white/55">
          <p className="font-semibold text-white/75">Nemo Chat</p>
          <p className="mt-1">Assistente generalista, sem persona ativa, para conversas diretas.</p>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#212121]/95 px-4">
          <div>
            <h1 className="text-sm font-semibold text-white">Nemo Chat</h1>
            <p className="text-[11px] text-white/45">Chat puro dentro do Sovereign</p>
          </div>
          <button
            type="button"
            onClick={startNewChat}
            className="flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs text-white/75 transition-colors hover:bg-white/10 md:hidden"
          >
            <span className="material-icons text-base">edit_square</span>
            Novo
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-3 py-6 sm:px-6">
          {messages.length === 0 ? (
            <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center text-center">
              <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-white text-xl font-bold text-[#212121]">N</div>
              <h2 className="text-2xl font-semibold text-white">Como posso ajudar?</h2>
              <div className="mt-6 grid w-full gap-3 sm:grid-cols-2">
                {["Explique com detalhes", "Organize uma ideia", "Escreva um texto", "Compare alternativas"].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setInput(item)}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left text-sm text-white/70 transition-colors hover:bg-white/10"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-6">
              {messages.map((message) => {
                const content = getMessageText(message);
                if (!content.trim()) return null;
                const isUser = message.role === "user";
                return (
                  <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[88%] rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                      isUser ? "bg-[#303030] text-white" : "bg-transparent text-[#ececec]"
                    }`}>
                      {isUser ? <UserMessage content={content} /> : <MessageContent content={content} />}
                    </div>
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1 rounded-3xl px-4 py-3 text-white/50">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50 [animation-delay:0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50 [animation-delay:0.3s]" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 bg-gradient-to-t from-[#212121] via-[#212121] to-[#212121]/0 px-3 pb-4 sm:px-6">
          {error && (
            <div className="mx-auto mb-2 max-w-3xl rounded-xl border border-red-400/30 bg-red-950/30 px-3 py-2 text-xs text-red-100">
              Nao consegui responder agora. Tente novamente.
            </div>
          )}

          {(selectedFile || voiceTranscript || liveVoiceTranscript) && (
            <div className="mx-auto mb-2 flex max-w-3xl flex-wrap gap-2">
              {selectedFile && <AttachmentChip icon="description" label={`${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`} />}
              {voiceTranscript && <AttachmentChip icon="graphic_eq" label="Audio capturado como contexto" />}
              {isListening && liveVoiceTranscript && <span className="rounded-full bg-white/5 px-3 py-1.5 text-xs italic text-white/45">Ouvindo: {liveVoiceTranscript}</span>}
            </div>
          )}

          <form onSubmit={send} className="mx-auto flex max-w-3xl items-end gap-2 rounded-3xl border border-white/10 bg-[#2f2f2f] p-2 shadow-2xl">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.csv,.pdf,text/plain,text/markdown,text/csv,application/pdf"
              className="hidden"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white/65 transition-colors hover:bg-white/10 hover:text-white"
              title="Anexar documento"
            >
              <span className="material-icons text-base">attach_file</span>
            </button>
            <button
              type="button"
              onClick={toggleListening}
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors ${
                isListening ? "bg-red-500/20 text-red-200" : "text-white/65 hover:bg-white/10 hover:text-white"
              }`}
              title={isListening ? "Parar audio" : "Captar audio"}
            >
              <span className="material-icons text-base">{isListening ? "stop_circle" : "mic"}</span>
            </button>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              rows={1}
              placeholder="Envie uma mensagem..."
              className="max-h-36 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-white/35"
            />
            <button
              type="submit"
              disabled={(!input.trim() && !selectedFile && !voiceTranscript.trim()) || isLoading}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#212121] transition-opacity disabled:opacity-30"
              aria-label="Enviar"
            >
              <span className="material-icons text-base">arrow_upward</span>
            </button>
          </form>
          <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-white/30">
            O Nemo Chat pode cometer erros. Confira informacoes importantes.
          </p>
        </div>
      </section>
    </main>
  );
}
