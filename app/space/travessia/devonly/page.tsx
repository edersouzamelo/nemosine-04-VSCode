import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import InstitutionalFooter from "@/app/components/InstitutionalFooter";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTravessiaSnapshot } from "@/app/lib/travessia/engine";
import OnboardingTour from "@/app/components/OnboardingTour";
import { travessiaDevTourSteps } from "@/app/data/onboardingTours";

function ProgressBar({ value, royal = false }: { value: number; royal?: boolean }) {
    return (
        <div className="h-2 overflow-hidden rounded-full border border-[#c5a059]/15 bg-black/55">
            <div
                className={`h-full rounded-full ${royal ? "bg-[#4169e1]" : "bg-[#c5a059]"}`}
                style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
            />
        </div>
    );
}

export default async function TravessiaDevonlyPage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/access?callbackUrl=/space/travessia/devonly");

    const snapshot = await getTravessiaSnapshot(session.user.id);
    const bossAtivo = snapshot.bossAtivo;
    const reliquiasConquistadas = snapshot.reliquias.filter((reliquia) => reliquia.status === "conquistada").length;
    const bossesDerrotados = snapshot.bosses.filter((boss) => boss.status === "derrotado").length;

    return (
        <main className="nemosine-main-container relative min-h-screen">
            <div className="fixed inset-0 z-0">
                <div className="nemosine-bg-overlay absolute inset-0 z-10 backdrop-blur-[2px]" />
                <div className="nemosine-mental-castle-bg h-full w-full bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2000')] bg-cover bg-center" />
            </div>

            <Navbar />

            <section className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-8 lg:px-12">
                <header data-tour="travessia-dev-header" className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#4169e1]">devonly</p>
                        <h1 className="font-display text-4xl uppercase tracking-[0.2em] text-[#4169e1]">Travessia Devonly</h1>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/60">
                            Rastros reais sao interpretados pelo Vigia e aplicados ao progresso da Travessia. O Castelo apenas consome esse resumo.
                        </p>
                    </div>
                    <Link href="/space/travessia" className="w-fit rounded-lg border border-[#4169e1]/50 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#4169e1] hover:bg-[#4169e1]/10">
                        Travessia classica devonly
                    </Link>
                </header>

                <div className="grid gap-5 lg:grid-cols-4">
                    <section data-tour="travessia-dev-progress" className="rounded-xl border border-[#4169e1]/25 bg-black/45 p-5 backdrop-blur-md lg:col-span-4">
                        <div className="grid gap-5 md:grid-cols-5">
                            <div className="md:col-span-2">
                                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#4169e1]">Progresso percebido</p>
                                <p className="mt-2 font-display text-5xl text-[#d9b865]">{snapshot.progressoGeral}%</p>
                                <div className="mt-4"><ProgressBar value={snapshot.progressoGeral} royal /></div>
                            </div>
                            <div className="rounded-lg border border-[#c5a059]/12 bg-black/25 p-4">
                                <p className="text-[10px] uppercase tracking-[0.18em] text-[#c5a059]/55">Boss ativo</p>
                                <p className="mt-2 text-sm font-semibold text-[#e9dfcb]">{bossAtivo?.nome || "Nenhum"}</p>
                            </div>
                            <div className="rounded-lg border border-[#c5a059]/12 bg-black/25 p-4">
                                <p className="text-[10px] uppercase tracking-[0.18em] text-[#c5a059]/55">Proxima evidencia</p>
                                <p className="mt-2 text-sm font-semibold text-[#e9dfcb]">{snapshot.proximaEvidenciaRecomendada || "Aguardando rastro"}</p>
                            </div>
                            <div className="rounded-lg border border-[#c5a059]/12 bg-black/25 p-4">
                                <p className="text-[10px] uppercase tracking-[0.18em] text-[#c5a059]/55">Reliquias / Bosses</p>
                                <p className="mt-2 text-sm font-semibold text-[#e9dfcb]">{reliquiasConquistadas}/3 reliquias</p>
                                <p className="text-sm font-semibold text-[#e9dfcb]">{bossesDerrotados}/7 bosses</p>
                            </div>
                        </div>
                    </section>

                    <section data-tour="travessia-dev-boss" className="rounded-xl border border-[#c5a059]/20 bg-black/45 p-5 backdrop-blur-md lg:col-span-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#c5a059]">Boss atual</p>
                        {bossAtivo ? (
                            <>
                                <h2 className="mt-3 font-display text-2xl uppercase tracking-[0.16em] text-[#d9b865]">{bossAtivo.nome}</h2>
                                <p className="mt-3 text-sm leading-7 text-white/65">{bossAtivo.descricao}</p>
                                <div className="mt-5">
                                    <div className="mb-2 flex justify-between text-[10px] uppercase tracking-[0.16em] text-white/45">
                                        <span>{bossAtivo.evidenciasAtuais}/{bossAtivo.evidenciasNecessarias} evidencias</span>
                                        <span>{bossAtivo.status}</span>
                                    </div>
                                    <ProgressBar value={(bossAtivo.evidenciasAtuais / bossAtivo.evidenciasNecessarias) * 100} />
                                </div>
                            </>
                        ) : (
                            <p className="mt-3 text-sm text-white/50">Nenhum boss ativo.</p>
                        )}
                    </section>

                    <section className="rounded-xl border border-[#c5a059]/20 bg-black/45 p-5 backdrop-blur-md lg:col-span-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#c5a059]">Selo de Travessia</p>
                        <p className="mt-3 rounded-lg border border-[#4169e1]/25 bg-[#4169e1]/10 p-4 text-sm text-[#b9c8ff]">
                            Selo indisponivel: requisitos incompletos.
                        </p>
                        <p className="mt-4 text-xs leading-6 text-white/45">
                            Estrutura preparada: uid_selo, userId, bosses, reliquias, inimigo, mentor_atestado, tribunal_parecer,
                            orquestrador_carimbo, hash_registros, data_selo e assinatura.
                        </p>
                    </section>

                    <section data-tour="travessia-dev-vigia" className="rounded-xl border border-[#c5a059]/20 bg-black/45 p-5 backdrop-blur-md lg:col-span-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#c5a059]">Rastros interpretados pelo Vigia</p>
                        <div className="mt-4 max-h-[520px] space-y-3 overflow-y-auto pr-2">
                            {snapshot.evidencias.length === 0 && <p className="text-sm text-white/45">Nenhuma evidencia classificada ainda.</p>}
                            {snapshot.evidencias.map((evidence) => {
                                const rastro = snapshot.rastros.find((item) => item.id === evidence.rastroId);
                                return (
                                    <article key={`${evidence.rastroId}-${evidence.categoria}`} className="rounded-lg border border-[#c5a059]/12 bg-black/25 p-4">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-full border border-[#4169e1]/40 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-[#4169e1]">{evidence.categoria}</span>
                                            <span className="text-[10px] uppercase tracking-[0.14em] text-white/35">intensidade {evidence.intensidade}/5</span>
                                            <span className="text-[10px] uppercase tracking-[0.14em] text-white/35">conf. {Math.round(evidence.confianca * 100)}%</span>
                                        </div>
                                        <h3 className="mt-3 text-sm font-semibold text-[#e9dfcb]">{rastro?.titulo || "Rastro"}</h3>
                                        <p className="mt-2 text-xs leading-5 text-white/55">{evidence.justificativa}</p>
                                    </article>
                                );
                            })}
                        </div>
                    </section>

                    <section data-tour="travessia-dev-metas" className="rounded-xl border border-[#c5a059]/20 bg-black/45 p-5 backdrop-blur-md lg:col-span-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#c5a059]">Metas vinculadas</p>
                        <div className="mt-4 space-y-3">
                            {snapshot.metas.map((meta) => (
                                <article key={meta.id} className="rounded-lg border border-[#c5a059]/12 bg-black/25 p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h3 className="text-sm font-semibold text-[#e9dfcb]">{meta.titulo}</h3>
                                            <p className="mt-1 text-xs leading-5 text-white/50">{meta.descricao}</p>
                                        </div>
                                        <span className="text-[10px] uppercase tracking-[0.16em] text-[#4169e1]">{meta.status}</span>
                                    </div>
                                    <div className="mt-4"><ProgressBar value={meta.progresso} /></div>
                                    <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-white/35">
                                        {meta.evidenciasVinculadas.length} evidencias vinculadas
                                    </p>
                                </article>
                            ))}
                        </div>
                    </section>
                </div>
            </section>

            <InstitutionalFooter />
            <OnboardingTour
                tourId="travessia-devonly"
                storageKey="nemosine_onboarding_travessia_dev_completed"
                steps={travessiaDevTourSteps}
            />
        </main>
    );
}
