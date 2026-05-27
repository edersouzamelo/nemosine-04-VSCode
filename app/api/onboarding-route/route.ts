import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { auth } from "@/auth";
import { ENTITIES, PERSONAS } from "@/app/data/entities";
import { routeInitialIntent } from "@/app/lib/onboardingRouting";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const normalizeName = (text: string) => text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s.-]/gu, "")
    .trim()
    .toLowerCase();

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const need = typeof body.need === "string" ? body.need.trim().slice(0, 1500) : "";
    if (!need) {
        return NextResponse.json(routeInitialIntent(""));
    }

    try {
        const result = await generateText({
            model: openai("gpt-4o"),
            temperature: 0,
            system: `Você é o Orquestrador invisível da entrada do Nemosine Nous.
Sua única tarefa é encaminhar a necessidade inicial do usuário para UMA persona adequada. Não responda ao usuário, não explique a escolha e não encaminhe para Lugares da Mente.

Prioridades de encaminhamento:
- emagrecimento, composição corporal, dieta, alimentação, suplementação ou metabolismo: Aprovisionador.
- treino, exercício, força, condicionamento ou performance física: Treinador.
- sintomas, doença, exames, dor corporal ou preocupação clínica: Médico.
- ansiedade, sofrimento, emoção persistente ou padrões internos: Psicólogo.
- decisão, dilema, direção ou prioridades de vida: Mentor.
- organização, execução, projeto ou produtividade: Orquestrador-Arquiteto.
- escrita, livro, texto, publicação ou criação verbal: Autor.
- valor, dinheiro, venda ou mercado: Mordomo.
- segredo, confissão, vergonha ou assunto íntimo: Confessor 2.0.
- curiosidade ampla ou ausência de demanda reconhecível: Narrador.

Você pode escolher outra persona do catálogo apenas se ela for inequivocamente mais adequada que as prioridades acima.
Catálogo de personas permitidas: ${PERSONAS.join(", ")}.
Retorne somente o nome exato de uma persona do catálogo, sem pontuação adicional.`,
            prompt: need
        });

        const selectedName = normalizeName(result.text);
        const destination = Object.entries(ENTITIES).find(([, entity]) =>
            entity.type === "persona" && normalizeName(entity.name) === selectedName
        );

        if (!destination) {
            return NextResponse.json(routeInitialIntent(need));
        }

        const [slug, entity] = destination;
        return NextResponse.json({
            href: `/agents/${slug}`,
            entityName: entity.name,
            requiresNotice: entity.name === "Confessor 2.0"
        });
    } catch (error) {
        console.error("[API/OnboardingRoute] Falling back to deterministic routing:", error);
        return NextResponse.json(routeInitialIntent(need));
    }
}
