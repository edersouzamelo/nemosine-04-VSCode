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
        return { href: "/agents/juiz", entityName: "Juiz" };
    }
    if (hasTerms(text, ["dinheiro", "produto", "venda", "monetizacao", "mercado", "valor"])) {
        return { href: "/agents/mordomo", entityName: "Mordomo" };
    }
    if (hasTerms(text, ["futuro", "possibilidade", "risco", "consequencia", "cenario"])) {
        return { href: "/agents/vidente", entityName: "Vidente" };
    }
    if (hasTerms(text, ["decisao", "duvida", "dilema", "escolha", "caminho", "prioridade", "direcao"])) {
        return { href: "/agents/mentor", entityName: "Mentor" };
    }
    if (hasTerms(text, ["emocao", "sofrimento", "ansiedade", "confusao interna", "autoconhecimento", "padrao repetitivo"])) {
        return { href: "/agents/psicólogo", entityName: "Psicólogo" };
    }
    if (hasTerms(text, ["escrita", "texto", "paper", "livro", "publicacao", "linguagem"])) {
        return { href: "/agents/autor", entityName: "Autor" };
    }
    if (hasTerms(text, ["projeto", "tarefa", "organizacao", "produtividade", "rotina", "plano", "execucao", "criacao"])) {
        return { href: "/agents/orquestrador-arquiteto", entityName: "Orquestrador-Arquiteto" };
    }
    return { href: "/agents/narrador", entityName: "Narrador" };
}
