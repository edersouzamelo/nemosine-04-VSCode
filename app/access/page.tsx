"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AccessPage() {
  const router = useRouter();
  const [callbackUrl, setCallbackUrl] = useState("/agents");
  const [registering, setRegistering] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const target = new URLSearchParams(window.location.search).get("callbackUrl");
    if (target?.startsWith("/") && !target.startsWith("//")) setCallbackUrl(target);
  }, []);

  const handleCredentials = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (registering) {
        const registration = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password })
        });
        if (!registration.ok) {
          const data = await registration.json();
          setError(data.message || "Não foi possível criar sua conta.");
          setLoading(false);
          return;
        }
      }

      const result = await signIn("credentials", { redirect: false, email, password });
      if (result?.error) {
        setError("E-mail ou senha incorretos.");
        setLoading(false);
        return;
      }
      router.push(callbackUrl);
    } catch {
      setError("Não foi possível concluir o acesso agora.");
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#06070a] px-5 py-10 text-[#eee8dc]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(197,160,89,0.12),transparent_38%),linear-gradient(180deg,#0c0e13,#040508)]" />
      <div className="relative w-full max-w-md rounded-[26px] border border-[#c5a059]/18 bg-black/35 p-7 shadow-2xl backdrop-blur-md sm:p-9">
        <Link href="/" className="text-[10px] uppercase tracking-[0.3em] text-[#c5a059]/65">Nemosine Nous</Link>
        <h1 className="mt-7 font-serif text-2xl text-[#e7d4aa]">
          {registering ? "Criar acesso" : "Continuar sua entrada"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#d7d1c8]/68">
          {registering ? "Crie sua conta para iniciar sua jornada." : "Acesse para continuar ao espaço indicado."}
        </p>

        <button
          type="button"
          onClick={() => signIn("google", { redirectTo: callbackUrl })}
          className="mt-7 w-full rounded-xl border border-[#c5a059]/25 bg-white/[0.03] px-4 py-3 text-sm text-[#e8dfd1] transition-colors hover:border-[#c5a059]/55"
        >
          Continuar com Google
        </button>

        <form onSubmit={handleCredentials} className="mt-5 space-y-3">
          {registering && (
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              placeholder="Como deseja ser chamado?"
              className="w-full rounded-xl border border-[#c5a059]/16 bg-black/30 px-4 py-3 outline-none placeholder:text-white/30 focus:border-[#c5a059]/55"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="E-mail"
            className="w-full rounded-xl border border-[#c5a059]/16 bg-black/30 px-4 py-3 outline-none placeholder:text-white/30 focus:border-[#c5a059]/55"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            placeholder="Senha"
            className="w-full rounded-xl border border-[#c5a059]/16 bg-black/30 px-4 py-3 outline-none placeholder:text-white/30 focus:border-[#c5a059]/55"
          />
          {error && <p className="rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-sm text-red-200">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#c5a059] px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-black disabled:opacity-50"
          >
            {loading ? "Processando..." : "Continuar"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => {
            setRegistering((current) => !current);
            setError("");
          }}
          className="mt-5 w-full text-xs text-[#c5a059]/68 hover:text-[#c5a059]"
        >
          {registering ? "Já possui acesso? Entrar" : "Primeiro acesso? Criar conta"}
        </button>
      </div>
    </main>
  );
}
