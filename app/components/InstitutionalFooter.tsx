"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const footerButtonClassName = "inline-flex min-h-8 items-center justify-center rounded-lg border border-[#c5a059]/35 bg-[#c5a059]/10 px-5 py-1 text-[9px] font-bold uppercase tracking-[0.22em] text-[#c5a059] transition-colors hover:border-[#c5a059]/70 hover:bg-[#c5a059]/18 hover:text-[#e4c476]";

export default function InstitutionalFooter() {
    const pathname = usePathname();
    const router = useRouter();

    const restartGuide = () => {
        if (pathname === "/inicio") {
            window.dispatchEvent(new Event("nemosine:restart-onboarding-tour"));
            return;
        }
        router.push("/inicio?guia=1");
    };

    return (
        <footer className="relative z-20 mt-auto border-t border-[#c5a059]/15 bg-black/70 px-6 py-8 text-center text-[10px] leading-relaxed text-[#c8bfaf]/60">
            <div className="mx-auto max-w-4xl space-y-1.5 font-serif tracking-wide">
                <div className="mb-3 flex flex-wrap items-center justify-center gap-3">
                    <button
                        type="button"
                        onClick={restartGuide}
                        className={footerButtonClassName}
                    >
                        Guia
                    </button>
                    <a
                        href="https://linktr.ee/nemosinenous"
                        target="_blank"
                        rel="noopener noreferrer"
                        data-tour="comunidade"
                        className={footerButtonClassName}
                    >
                        Comunidade
                    </a>
                    <Link
                        href="/exposicoes"
                        className={footerButtonClassName}
                    >
                        {"Exposi\u00e7\u00f5es"}
                    </Link>
                    <Link
                        href="/constitution"
                        data-tour="constituicao"
                        className={footerButtonClassName}
                    >
                        {"Constitui\u00e7\u00e3o"}
                    </Link>
                    <Link
                        href="/legal"
                        data-tour="termos-politicas"
                        className={footerButtonClassName}
                    >
                        {"Termos e Pol\u00edticas"}
                    </Link>
                </div>
                <p className="text-[#c5a059]/75 font-semibold">
                    {"\u00a9 Sistema Nemosine \u2014 software registrado no INPI sob n\u00famero BR512025003335-4."}
                </p>
                <p>{"Todos os direitos reservados. Distribui\u00e7\u00e3o autorizada somente sob licen\u00e7a expressa do autor."}</p>
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
                <p>{"Autor respons\u00e1vel: Edervaldo Jos\u00e9 de Souza Melo"}</p>
                <p>
                    {"Licen\u00e7a: Creative Commons \u2013 Atribui\u00e7\u00e3o-N\u00e3oComercial-CompartilhaIgual 4.0 Internacional (CC BY-NC-SA 4.0)."}{" "}
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
