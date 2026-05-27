interface OnboardingDestination {
    href: string;
    entityName: string;
    requiresNotice?: boolean;
}

const normalizeInput = (text: string) => text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const hasTerms = (text: string, terms: string[]) => terms.some((term) => text.includes(term));

export function routeInitialIntent(input: string): OnboardingDestination {
    const text = normalizeInput(input.trim());

    if (hasTerms(text, ["intimo", "segredo", "vergonha", "confissao", "sensivel"])) {
        return { href: "/agents/confessor-2.0", entityName: "Confessor 2.0", requiresNotice: true };
    }
    if (hasTerms(text, ["culpa", "justica", "erro", "responsabilidade", "acusacao", "reparacao"])) {
        return { href: "/agents/tribunal", entityName: "Tribunal" };
    }
    if (hasTerms(text, ["dinheiro", "produto", "venda", "monetizacao", "mercado", "valor"])) {
        return { href: "/agents/mercado-real", entityName: "Mercado Real" };
    }
    if (hasTerms(text, ["futuro", "possibilidade", "risco", "consequencia", "cenario"])) {
        return { href: "/agents/portal", entityName: "Portal" };
    }
    if (hasTerms(text, ["decisao", "duvida", "dilema", "escolha", "caminho", "prioridade", "direcao"])) {
        return { href: "/agents/núcleo", entityName: "Núcleo" };
    }
    if (hasTerms(text, ["emocao", "sofrimento", "ansiedade", "confusao interna", "autoconhecimento", "padrao repetitivo"])) {
        return { href: "/agents/claustro", entityName: "Claustro" };
    }
    if (hasTerms(text, ["escrita", "texto", "paper", "livro", "publicacao", "linguagem"])) {
        return { href: "/agents/biblioteca", entityName: "Biblioteca" };
    }
    if (hasTerms(text, ["projeto", "tarefa", "organizacao", "produtividade", "rotina", "plano", "execucao", "criacao"])) {
        return { href: "/agents/oficina", entityName: "Oficina" };
    }
    return { href: "/agents/campanário", entityName: "Campanário" };
}
