import MedievalButton from "./components/MedievalButton";

export default function Home() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background Portal Effect */}
      <div className="portal-container">
        <div className="portal-ring"></div>
        <div className="portal-ring-outer"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(59,130,246,0.15)_0%,transparent_70%)]"></div>
      </div>

      {/* Decorative Overlays */}
      <div className="fixed inset-0 pointer-events-none border-[32px] border-black/20 z-50"></div>
      <div className="fixed inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20"></div>

      {/* Content Container */}
      <div className="relative z-20 flex flex-col items-center gap-12 max-w-md w-full px-6">
        {/* Title Group */}
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-serif text-[#c5a059] mb-2 drop-shadow-[0_0_15px_rgba(197,160,89,0.5)] tracking-tighter uppercase">
            Nemosine
          </h1>
          <p className="medieval-text-gold text-xs opacity-80">
            Interface de Agentes Cognitivos
          </p>
        </div>

        {/* Login Box */}
        <div className="glass-medieval p-8 w-full flex flex-col gap-6 items-center">
          <div className="w-full space-y-4">
            <MedievalButton className="w-full">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.26 1.07-3.71 1.07-2.87 0-5.3-1.94-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.14s.13-1.47.35-2.14V7.01H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.99l3.66-2.9z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.01l3.66 2.91c.86-2.59 3.3-4.54 6.16-4.54z" />
              </svg>
              Entrar com Google
            </MedievalButton>

            <MedievalButton variant="secondary" className="w-full">
              Outras Contas
            </MedievalButton>
          </div>

          <div className="w-full flex items-center gap-3">
            <div className="h-[1px] flex-1 bg-[#c5a059]/30"></div>
            <span className="text-[#c5a059]/50 text-[10px] uppercase font-bold">Iniciação</span>
            <div className="h-[1px] flex-1 bg-[#c5a059]/30"></div>
          </div>

          <p className="text-[#c5a059]/60 text-[10px] text-center max-w-[250px] leading-relaxed italic">
            "Para compreender o espírito, deve-se primeiro cruzar o portal da consciência."
          </p>
        </div>

        {/* Footer info */}
        <div className="flex flex-col items-center gap-2 opacity-40">
          <div className="flex gap-4 text-[9px] uppercase tracking-[0.2em] font-bold text-[#c5a059]">
            <span>Menu</span>
            <span>Criar Conta</span>
            <span>Sair</span>
          </div>
          <p className="text-[8px] text-[#c5a059]">Versão 0.4.0 (Midnight) - 2026</p>
        </div>
      </div>
    </main>
  );
}
