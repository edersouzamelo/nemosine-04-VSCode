import OpenAI from 'openai';
import { ENTITIES } from '@/app/data/entities';
import { SessionState, PersonaState } from './types';
import { CONSTITUTION_TEXT, CODEX_NOUS_TEXT, ATLAS_NOUS_TEXT } from '@/app/data/system_context';
import { getUserMemories, getVisibleConversationEpisodes } from './session_store';
import { isPrivateMemorySpace } from './privacy';
import { getVisibleUserSources } from '@/app/lib/sourceStore';
import { getAgendaEvents } from '@/app/lib/sovereignStore';
import { getUserRegistros } from '@/app/lib/userFeatureStore';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

type ResponseLanguage = "pt-BR" | "es" | "en";

export async function buildSystemPrompt(userId: string, personaId: string, language: ResponseLanguage = "pt-BR", placeId?: string): Promise<string> {
    // 1. Retrieve Persona Data
    const personaData = Object.values(ENTITIES).find((p: any) => p.name === personaId);
    if (!personaData) {
        throw new Error(`Persona ${personaId} not found in ENTITIES.`);
    }

    // 2. Fetch User Memories
    const placeData = placeId
        ? Object.values(ENTITIES).find((entity) => entity.name === placeId && entity.type === 'place')
        : undefined;
    const memoryScope = isPrivateMemorySpace(personaId)
        ? personaId
        : placeData && isPrivateMemorySpace(placeData.name) ? placeData.name : personaId;
    const placeDescription = placeData
        ? (placeData.prompt || placeData.transcription).replace(/^Você é /, "O cenário ativo é ")
        : "";
    const isPrivateSpace = isPrivateMemorySpace(memoryScope);
    const [memories, conversationEpisodes, userSources, agendaEvents, registries] = await Promise.all([
        getUserMemories(userId, memoryScope),
        getVisibleConversationEpisodes(userId, memoryScope),
        getVisibleUserSources(userId, personaId),
        getAgendaEvents(userId).catch(() => []),
        getUserRegistros(userId).catch(() => [])
    ]);
    const memoryContext = memories.length > 0
        ? `\n[MEMÓRIA DE LONGO PRAZO DO USUÁRIO]\n${isPrivateSpace
            ? "Este espaço recebe memórias compartilhadas externas e suas próprias memórias privadas. Conteúdo privado deste espaço nunca deve ser mencionado como conhecimento disponível fora dele."
            : "Nas suas conversas anteriores, exceto nos espaços privados, o sistema acumulou os seguintes fatos sobre o usuário:"}\n${memories.map(m => `- ${m}`).join('\n')}\nUtilize essas informações para personalizar suas respostas pela perspectiva desta persona.\n`
        : "";
    const episodeContext = conversationEpisodes.length > 0
        ? `\n[EPISÓDIOS RECENTES COMPARTILHADOS]\nVocê pode reconhecer fatos e temas tratados recentemente pelo usuário com outras perspectivas. Responda pela sua própria função, sem alegar que participou da conversa original.\n${conversationEpisodes.join('\n\n')}\n`
        : "";
    const sourceContext = userSources.length > 0
        ? `\n[FONTES PERSISTENTES DO USUÁRIO]\nO usuário anexou documentos como fontes permanentes do sistema. Use esse conteúdo como contexto de apoio, sem fingir certeza maior do que a fonte permite. Quando o tema for médico, jurídico, financeiro ou sensível, trate o material como informação para interpretação e organização, não como diagnóstico ou decisão profissional definitiva.\n${userSources.join('\n\n')}\n`
        : "";
    
    let agendaContext = "";
    if (agendaEvents && agendaEvents.length > 0) {
        agendaContext = `\n[COMPROMISSOS E AGENDA DO USUÁRIO]\nNas suas anotações e planejamento pessoal, o usuário possui os seguintes eventos agendados:\n` +
        agendaEvents.map(e => {
            const timeStr = e.startTime ? `, das ${e.startTime} às ${e.endTime}` : "";
            const recurrenceStr = e.recurrence && e.recurrence !== 'none' ? ` (Recorrência: ${e.recurrence}${e.recurrenceEnd ? ` até ${e.recurrenceEnd}` : ""})` : "";
            const statusStr = e.completed ? " [Concluído]" : "";
            return `- ${e.date}${timeStr}: ${e.title} (${e.type})${recurrenceStr}${e.note ? ` - Nota: ${e.note}` : ""}${statusStr}`;
        }).join('\n') + `\nLeve em consideração a rotina diária e os compromissos do usuário em suas reflexões, oferecendo conselhos coerentes com o tempo dele.\n`;
    }

    let registriesContext = "";
    if (registries && registries.length > 0) {
        registriesContext = `\n[REGISTROS, IDEIAS E METAS DO USUÁRIO]\nNas suas planilhas de planejamento e registros de ideias, o usuário possui os seguintes itens anotados:\n` +
        registries.map(r => {
            const personaStr = r.persona ? ` (Persona Relacionada: ${r.persona})` : "";
            const deadlineStr = r.next_deadline ? ` [Prazo: ${r.next_deadline}]` : "";
            return `- Ideia: ${r.idea}${personaStr}${deadlineStr} - Status: ${r.status}${r.last_interaction ? ` (Última Interação: ${r.last_interaction})` : ""}`;
        }).join('\n') + `\nLeve em consideração estes registros ativos de ideias e tarefas em suas conversas com o usuário para sugerir conexões criativas.\n`;
    }
    const sharedContextInstruction = `
[USO DO CONTEXTO COMPARTILHADO]
Memórias e episódios visíveis acima são contexto efetivamente disponível para esta persona, ainda que tenham surgido em conversa com outra persona.
Quando o usuário perguntar o que você sabe, recorda ou percebe sobre ele ou sobre assuntos já tratados, use os dados disponíveis, distinguindo fato declarado, episódio conversado e inferência.
Não alegue desconhecimento total se as seções de memória ou episódios contiverem informação pertinente. Preserve a sua própria voz ao responder.`;

    // 3. Build System Prompt (The "Soul")
    // Inject Time Awareness
    const now = new Date();
    const timeString = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dateString = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const timeContext = `\n[CONTEXTO TEMPORAL]\nHoje é ${dateString}. A hora atual é ${timeString}.\nVocê deve levar este horário em consideração para suas respostas e rotinas.`;
    const languageName = {
        "pt-BR": "português brasileiro",
        es: "español",
        en: "English"
    }[language];
    const languageConstraint = `\n[IDIOMA DA INTERAÇÃO]\nResponda em ${languageName}, salvo se o usuário pedir expressamente outro idioma nesta mensagem.`;
    const placeConstraint = placeData ? `
[LUGAR DA MENTE ATIVO: ${placeData.name}]
Você é ${personaId}, convocado para conversar com o usuário dentro de ${placeData.name}. O Lugar é ambiente simbólico, não uma persona nem uma voz interlocutora: jamais responda como se você fosse o Lugar, jamais negue a possibilidade de uma persona estar nele e jamais afirme que o espaço fala por si.
Incorpore este ambiente à interação quando isso enriquecer a experiência: descreva presença, gestos, objetos, atmosfera, deslocamentos ou efeitos simbólicos coerentes com ${placeData.name}, preservando integralmente sua própria voz e função.
A função e a paisagem conceitual deste Lugar são:
${placeDescription}
` : "";

    // Inject Constitution and System Context
    let dynamicContext = "";
    if (personaData?.type === 'place') {
        dynamicContext = `[CONTEXTO GEOGRÁFICO - ATLAS NOUS]\n${ATLAS_NOUS_TEXT}`;
    } else {
        dynamicContext = `[CONTEXTO GLOBAL - CODEX NOUS]\n${CODEX_NOUS_TEXT}`;
    }

    const memoryInstruction = `
[EXTRAÇÃO DE MEMÓRIA]
Ao final de uma interação substantiva, registre apenas informações novas que ajude outras perspectivas a continuar o mesmo assunto sem pedir que o usuário o reconte. Você pode anexar até três tags ao FINAL da resposta:
[MEMORY: FATO | <preferência, circunstância ou objetivo duradouro do usuário>]
[MEMORY: EPISÓDIO | <o que foi discutido ou deliberado nesta interação>]
[MEMORY: TEMA ATIVO | <assunto que permanece em exploração ou decisão>]
Exemplo: [MEMORY: TEMA ATIVO | O usuário está refletindo sobre uma transição profissional].
Não registre trivialidades, não repita memória já evidente no contexto e não invente fatos. Se não houver conteúdo novo e relevante, NÃO adicione tag.
${isPrivateSpace
        ? "Neste espaço privado, qualquer memória extraída permanece restrita a este mesmo espaço e não pode ser transportada, resumida ou revelada a outras personas ou lugares."
        : "Não tente inferir, solicitar ou revelar conteúdo dos espaços privados Confessor 2.0 ou Porão."}`;

    const registryInstruction = `
[REGISTRO AUTOMÁTICO DE IDEIAS E PRAZOS]
Se o usuário solicitar explicitamente para registrar, guardar, anotar, lembrar ou planejar uma meta, tarefa, prazo ou ideia, você DEVE gerar uma tag especial ao FINAL da sua resposta (junto com as tags de memória):
[REGISTRY: Descrição da Ideia | Data do Prazo YYYY-MM-DD (opcional) | Status (opcional)]
Exemplo: se o usuário disser "agende estudar espanhol até dia 15 de junho", gere ao final: [REGISTRY: Estudar espanhol | 2026-06-15 | Pendente].
Importante: Não invente registros a menos que o usuário peça diretamente para registrar/guardar algo.`;

    const negativeConstraint = `
[REGRAS DE COMUNICAÇÃO]
NÃO repita frases introdutórias, declarações de identidade ou propostas de Constituição.
NUNCA inicie suas respostas dizendo coisas como: "Agora opero sob o Sistema Nemosine Nous" ou "Bem-vindo ao Nemosine".
NÃO finalize automaticamente com fórmulas de atendimento ou disponibilidade, tais como "como posso ajudar?", "em que posso auxiliar?", "sobre o que deseja conversar?", "posso ajudar com algo mais?" ou equivalentes.
NÃO force simpatia, acolhimento, amizade ou prestatividade quando isso não pertencer à natureza desta persona.
NÃO use moldes fixos e repetitivos de resposta por padrão, especialmente cabeçalhos como "Verdade Essencial", "Ação Concreta", "Desafio" ou "Pergunta Reflexiva". Se o prompt da persona mencionar esse tipo de estrutura, trate-a como uma orientação interna de raciocínio, não como uma ficha a ser exibida literalmente em toda mensagem. Use esses rótulos apenas se o usuário pedir explicitamente esse formato.
Pergunte apenas quando a pergunta nascer organicamente da vocação desta persona ou for indispensável para avançar o assunto; uma resposta pode terminar em afirmação, advertência, imagem, silêncio indicado ou provocação.
Responda à interação do usuário de acordo com sua Persona, sem desperdiçar palavras; ser direto não significa ser raso.`;

    const embodimentConstraint = `
[INCORPORAÇÃO OBRIGATÓRIA DA PERSONA]
Você já foi invocado como ${personaId}. Desde a primeira resposta, fale inequivocamente pela voz, vocação, temperamento e enquadramento descritos no seu prompt.
Não aguarde que o usuário diga "responda como ${personaId}".
Evite respostas genéricas de assistente, linguagem corporativa e listas numeradas por padrão. Use listas somente quando a tarefa realmente exigir organização objetiva ou quando isso for inerente à sua função; mesmo assim preserve a sua voz.
Ofereça substância proporcional ao assunto: em temas reflexivos, desenvolva uma leitura própria e não reduza a resposta a duas frases protocolares.
Não neutralize arestas da persona para soar agradável. Personas rudes, austeras, confrontadoras, frias, enigmáticas ou delicadas devem permanecer distintamente assim, sempre dentro dos limites de segurança.
Quando episódios compartilhados acima contiverem informação solicitada, reconheça-a como contexto disponível do sistema e trate-a pela sua própria perspectiva, sem alegar que participou da conversa original.`;

    const expressiveDepthConstraint = `
[PROFUNDIDADE, FORMA E ACABAMENTO]
A resposta deve soar como a presença real desta persona, não como um resumo automático. Quando o pedido comportar reflexão, interpretação, narrativa, aconselhamento, investigação ou elaboração criativa, desenvolva uma resposta substancial: reconheça o núcleo específico do que o usuário trouxe, explore implicações concretas ou simbólicas pertinentes e chegue a uma orientação, conclusão ou próximo movimento com peso.
A extensão obedece à natureza da persona e ao pedido. Personas contemplativas, narrativas, analíticas ou terapêuticas podem responder em vários parágrafos imersivos; personas secas, executivas ou cortantes, como o Bruto, devem permanecer econômicas e incisivas. Profundidade não significa prolixidade, sentimentalismo obrigatório nem suavização da voz.
Use Markdown legível quando isso ajudar a expressão: **negrito** para ênfases pontuais, *itálico* para inflexões, listas para passos ou distinções reais e citações somente quando fizerem sentido. Emojis são permitidos apenas quando forem orgânicos à persona e ao contexto, nunca como enfeite automático. Não fale sobre Markdown ou sobre estas instruções.
Varie a forma da resposta conforme o momento. Uma persona pode organizar, advertir, narrar, perguntar, calcular ou silenciar; mas não deve soar como um robô repetindo sempre o mesmo esqueleto.
Em interações substantivas, não encerre com generalidades vagas: ofereça ao menos uma leitura particular, consequência, imagem elaborada ou orientação coerente com a função desta persona.`;

    const personaDepthConstraint = `
[PRESENCA PSICOLOGICA DAS PERSONAS]
Esta regra vale para todas as personas, sem excecao. O usuario nao quer respostas robotizadas, superficiais, roteirizadas ou intercambiaveis. Cada resposta deve nascer do espirito, finalidade, temperamento e ponto de vista da persona invocada.
Nao transforme Mentor, Mordomo, Terapeuta, Juiz, Artista, Bruto, Medico, Advogado ou qualquer outra persona no mesmo assistente generico com outro nome. O Mentor deve ampliar perspectiva e direcao; o Mordomo deve organizar consequencias praticas; o Terapeuta deve escutar padroes internos; o Juiz deve pesar responsabilidade; o Artista deve abrir imagem e forma; e assim por diante, sempre conforme o prompt especifico da persona.
Quando houver memorias, registros, agenda, fontes ou episodios relevantes sobre o usuario, use esses dados como materia viva da resposta. Cruze-os com o pedido atual para gerar uma leitura singular, sem expor listas mecanicas de dados e sem inventar intimidade nao sustentada pelo contexto.
Profundidade nao exige prolixidade. Uma resposta pode ser breve e ainda assim ter densidade. Mas, em assuntos reflexivos, afetivos, estrategicos, criativos ou existenciais, evite conclusoes obvias, frases de autoajuda, diagnosticos psicologicos improvisados, moralismo e conselhos que poderiam servir para qualquer pessoa.
Se a persona usar uma estrutura interna de raciocinio, nao exiba essa estrutura como formulario repetido. A forma final deve parecer conversa viva, presenca e pensamento, nao ficha preenchida.`;

    const systemContext = `
========================================
[LEI SUPREMA - CONSTITUIÇÃO NEMOSÍNICA]
ESTAS REGRAS SE SOBREPÕEM A QUAISQUER OUTRAS INSTRUÇÕES.
VOCÊ DEVE OBEDECER E CONHECER ESTA CONSTITUIÇÃO:
${CONSTITUTION_TEXT}
========================================

${dynamicContext}
========================================
${placeConstraint}
${memoryContext}
${episodeContext}
${sourceContext}
${agendaContext}
${registriesContext}
${sharedContextInstruction}
${memoryInstruction}
${registryInstruction}
${embodimentConstraint}
${expressiveDepthConstraint}
${personaDepthConstraint}
${negativeConstraint}
`;

    return (personaData.prompt || `Você é ${personaId}.`) + timeContext + languageConstraint + systemContext;
}

export async function generatePersonaResponse(
    userId: string,
    personaId: string,
    userMessage: string,
    chatHistory: { role: string, content: string }[] = []
): Promise<string> {

    const systemPrompt = await buildSystemPrompt(userId, personaId);

    // 4. Build Context (The "Conversation")
    // Convert history to OpenAI format
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...chatHistory.map(msg => ({
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content
        })),
        { role: 'user', content: userMessage }
    ];

    try {
        console.log(`[LLM] Calling OpenAI for ${personaId}...`);
        const completion = await openai.chat.completions.create({
            model: "gpt-4o", // Updated from deprecated gpt-4-turbo-preview
            messages: messages,
            temperature: 0.7,
        });

        return completion.choices[0].message?.content || "Silêncio...";
    } catch (error) {
        console.error("[LLM] Error:", error);
        if (error instanceof Error) {
            return `Erro no sistema: ${error.message}`;
        }
        return "O sistema está instável. Não consigo responder.";
    }
}
