import Link from "next/link";

export default function InstitutionalFooter() {
    return (
        <footer className="relative z-20 mt-auto border-t border-[#c5a059]/15 bg-black/70 px-6 py-8 text-center text-[10px] leading-relaxed text-[#c8bfaf]/60">
            <div className="mx-auto max-w-4xl space-y-1.5 font-serif tracking-wide">
                <div className="mb-3 flex flex-wrap items-center justify-center gap-3">
                    <a
                        href="https://linktr.ee/nemosinenous"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-8 items-center justify-center rounded-lg border border-[#c5a059]/35 bg-[#c5a059]/10 px-5 py-1 text-[9px] font-bold uppercase tracking-[0.22em] text-[#c5a059] transition-colors hover:border-[#c5a059]/70 hover:bg-[#c5a059]/18 hover:text-[#e4c476]"
                    >
                        Comunidade
                    </a>
                    <Link
                        href="/constitution"
                        className="inline-flex min-h-8 items-center justify-center rounded-lg border border-[#c5a059]/35 bg-[#c5a059]/10 px-5 py-1 text-[9px] font-bold uppercase tracking-[0.22em] text-[#c5a059] transition-colors hover:border-[#c5a059]/70 hover:bg-[#c5a059]/18 hover:text-[#e4c476]"
                    >
                        Constituição
                    </Link>
                </div>
                <p className="text-[#c5a059]/75 font-semibold">
                    © Sistema Nemosine — software registrado no INPI sob número BR512025003335-4.
                </p>
                <p>Todos os direitos reservados. Distribuição autorizada somente sob licença expressa do autor.</p>
                <p>
                    Documento autenticado com DOI:{" "}
                    <a
                        href="https://doi.org/10.5281/zenodo.16740262"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#c5a059]/75 hover:text-[#e4c476] transition-colors underline underline-offset-2"
                    >
                        https://doi.org/10.5281/zenodo.16740262
                    </a>
                </p>
                <p>Autor responsável: Edervaldo José de Souza Melo</p>
                <p>
                    Licença: Creative Commons – Atribuição-NãoComercial-CompartilhaIgual 4.0 Internacional (CC BY-NC-SA 4.0).{" "}
                    <a
                        href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#c5a059]/75 hover:text-[#e4c476] transition-colors underline underline-offset-2"
                    >
                        https://creativecommons.org/licenses/by-nc-sa/4.0/
                    </a>
                </p>
            </div>
        </footer>
    );
}
