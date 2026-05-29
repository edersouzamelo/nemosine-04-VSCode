"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/app/components/LanguageProvider";
import MedievalButton from "@/app/components/MedievalButton";
import Navbar from "@/app/components/Navbar";
import InstitutionalFooter from "@/app/components/InstitutionalFooter";

// Tiers of Caste
interface CasteDetails {
    id: string;
    title: string;
    description: string;
    perks: string[];
}

const LOCALIZED_CASTES: Record<string, CasteDetails[]> = {
    pt: [
        {
            id: "Peregrino",
            title: "Peregrino",
            description: "Acesso inicial ao Castelo. Dando os primeiros passos na jornada da consciência.",
            perks: ["8 Personas Fundamentais", "Diário de Campanha Básico", "Capítulo I Ativo"]
        },
        {
            id: "Vassalo",
            title: "Vassalo",
            description: "Reconhecimento de fidelidade ao Codex. O círculo de influência existencial se expande.",
            perks: ["24 Personas Ativas", "Capítulo II Desbloqueado", "Novos Domínios Abertos"]
        },
        {
            id: "Regente",
            title: "Regente",
            description: "Guardião da ordem interna. Governa com sabedoria pragmática e lucidez.",
            perks: ["56 Personas Ativas", "Capítulo III Desbloqueado", "Acesso Total aos Domínios"]
        },
        {
            id: "Soberano",
            title: "Soberano",
            description: "Integração completa da consciência. O metasistema existencial está sob domínio pleno.",
            perks: ["Todas as 56 Personas", "Capítulo IV Desbloqueado", "Domínio Pleno do Codex"]
        }
    ],
    es: [
        {
            id: "Peregrino",
            title: "Peregrino",
            description: "Acceso inicial al Castillo. Dando los primeros pasos en el viaje de la conciencia.",
            perks: ["8 Personas Fundamentales", "Diario de Campaña Básico", "Capítulo I Activo"]
        },
        {
            id: "Vassalo",
            title: "Vasallo",
            description: "Reconocimiento de fidelidad al Códice. El círculo de influencia existencial se expande.",
            perks: ["24 Personas Activas", "Capítulo II Desbloqueado", "Nuevos Dominios Abiertos"]
        },
        {
            id: "Regente",
            title: "Regente",
            description: "Guardián del orden interno. Gobierna con sabiduría pragmática y lucidez.",
            perks: ["56 Personas Activas", "Capítulo III Desbloqueado", "Acceso Total a los Dominios"]
        },
        {
            id: "Soberano",
            title: "Soberano",
            description: "Integración completa de la conciencia. El metasistema existencial está bajo control total.",
            perks: ["Todas las 56 Personas", "Capítulo IV Desbloqueado", "Dominio Pleno del Códice"]
        }
    ],
    en: [
        {
            id: "Peregrino",
            title: "Pilgrim",
            description: "Initial access to the Castle. Taking the first steps in the journey of consciousness.",
            perks: ["8 Fundamental Personas", "Basic Campaign Diary", "Active Chapter I"]
        },
        {
            id: "Vassalo",
            title: "Vassal",
            description: "Recognition of loyalty to the Codex. The circle of existential influence expands.",
            perks: ["24 Active Personas", "Chapter II Unlocked", "New Domains Open"]
        },
        {
            id: "Regente",
            title: "Regent",
            description: "Guardian of the internal order. Governs with pragmatic wisdom and clarity.",
            perks: ["56 Active Personas", "Chapter III Unlocked", "Full Access to Domains"]
        },
        {
            id: "Soberano",
            title: "Sovereign",
            description: "Complete integration of consciousness. The existential metasystem is under full command.",
            perks: ["All 56 Personas", "Chapter IV Unlocked", "Full Domain of the Codex"]
        }
    ]
};

// Existential Chapters Journey
interface ChapterDetails {
    id: string;
    number: string;
    name: string;
    emoji: string;
    description: string;
    focus: string;
    unlockCondition: string;
    milestones: string[];
}

const LOCALIZED_CHAPTERS: Record<string, ChapterDetails[]> = {
    pt: [
        {
            id: "capitulo_1",
            number: "Capítulo I",
            name: "Capítulo I: Disciplina",
            emoji: "🛡️",
            description: "O despertar da força de vontade. Aqui, você confronta as distrações, a procrastinação e a inércia diária para forjar hábitos consistentes e recuperar a soberania do seu tempo.",
            focus: "Combate à inércia e estabelecimento de consistência",
            unlockCondition: "Disponível ao ingressar como Peregrino.",
            milestones: [
                "Derrotar a Distração (Foco)",
                "Superar a Procrastinação (Ação)",
                "Vencer a Autossabotagem (Vigilância)",
                "Romper a Inércia (Constância)"
            ]
        },
        {
            id: "capitulo_2",
            number: "Capítulo II",
            name: "Capítulo II: Emoções",
            emoji: "⚖️",
            description: "A jornada interior de integração e equilíbrio mental. Aprenda a compreender e canalizar seus impulsos, anseios e estados emocionais sem se deixar escravizar por eles.",
            focus: "Integração das sombras e equilíbrio emocional",
            unlockCondition: "Derrotar a 'Inércia' e ascender à casta de Vassalo.",
            milestones: [
                "Equilibrar a Impulsividade",
                "Acolher e canalizar a Ansiedade",
                "Superar o Desânimo Crônico"
            ]
        },
        {
            id: "capitulo_3",
            number: "Capítulo III",
            name: "Capítulo III: Recursos",
            emoji: "💰",
            description: "A sabedoria prática da Mordomia. Governe seus recursos materiais, finanças, tempo e energia com responsabilidade estratégica e consumo consciente.",
            focus: "Organização prática, finanças e mordomia",
            unlockCondition: "Concluir o Capítulo II e atingir a casta de Regente.",
            milestones: [
                "Superar o sentimento de Escassez",
                "Dominar o impulso do Consumismo",
                "Estruturar a Organização do Tempo"
            ]
        },
        {
            id: "capitulo_4",
            number: "Capítulo IV",
            name: "Capítulo IV: Vitalidade",
            emoji: "⚕️",
            description: "O templo do corpo físico. Otimize sua nutrição, sono, respiração e movimento para sustentar a clareza da mente e a alta energia existencial necessária para governar sua vida.",
            focus: "Cuidado corporal, sono sã e vigor vital",
            unlockCondition: "Concluir o Capítulo III e atingir a casta de Soberano.",
            milestones: [
                "Superar a letargia do Sedentarismo",
                "Equilibrar a Exaustão nervosa",
                "Honrar o Templo Físico e sono sã"
            ]
        }
    ],
    es: [
        {
            id: "capitulo_1",
            number: "Capítulo I",
            name: "Capítulo I: Disciplina",
            emoji: "🛡️",
            description: "El despertar de la fuerza de voluntad. Aquí confrontas las distracciones, la procrastinación y la inercia diaria para forjar hábitos consistentes y recuperar la soberanía de tu tiempo.",
            focus: "Combatir la inercia y establecer consistencia",
            unlockCondition: "Disponible al ingresar como Peregrino.",
            milestones: [
                "Derrotar la Distracción (Enfoque)",
                "Superar la Procrastinación (Acción)",
                "Vencer el Autosabotaje (Vigilancia)",
                "Romper la Inercia (Constancia)"
            ]
        },
        {
            id: "capitulo_2",
            number: "Capítulo II",
            name: "Capítulo II: Emociones",
            emoji: "⚖️",
            description: "El viaje interior de integración y equilibrio mental. Aprende a comprender y canalizar tus impulsos, anhelos y estados emocionales sin dejarte esclavizar por ellos.",
            focus: "Integración de sombras y equilibrio emocional",
            unlockCondition: "Derrotar a la 'Inercia' y ascender a la casta de Vasallo.",
            milestones: [
                "Equilibrar la Impulsividad",
                "Acoger y canalizar la Ansiedad",
                "Superar el Desaliento Crónico"
            ]
        },
        {
            id: "capitulo_3",
            number: "Capítulo III",
            name: "Capítulo III: Recursos",
            emoji: "💰",
            description: "La sabiduría práctica de la Mayordomía. Gobierna tus recursos materiales, finanzas, tiempo y energía con responsabilidad estratégica y consumo consciente.",
            focus: "Organización práctica, finanzas y mayordomía",
            unlockCondition: "Terminar el Capítulo II y alcanzar la casta de Regente.",
            milestones: [
                "Superar el sentimiento de Escasez",
                "Dominar el impulso del Consumismo",
                "Estructurar la Organización del Tiempo"
            ]
        },
        {
            id: "capitulo_4",
            number: "Capítulo IV",
            name: "Capítulo IV: Vitalidad",
            emoji: "⚕️",
            description: "El templo del cuerpo físico. Optimiza tu nutrición, sueño, respiración y movimiento para mantener la claridad mental y la alta energía existencial necesaria para gobernar tu vida.",
            focus: "Cuidado corporal, sueño sano y vigor vital",
            unlockCondition: "Terminar el Capítulo III y alcanzar la casta de Soberano.",
            milestones: [
                "Superar el letargo del Sedentarismo",
                "Equilibrar la Fatiga nerviosa",
                "Honrar el Templo Físico y el sueño reparador"
            ]
        }
    ],
    en: [
        {
            id: "capitulo_1",
            number: "Chapter I",
            name: "Chapter I: Discipline",
            emoji: "🛡️",
            description: "The awakening of willpower. Here, you confront distractions, procrastination, and daily inertia to forge consistent habits and reclaim sovereignty over your time.",
            focus: "Combating inertia and establishing consistency",
            unlockCondition: "Available upon entering as Pilgrim.",
            milestones: [
                "Defeat Distraction (Focus)",
                "Overcome Procrastination (Action)",
                "Vanquish Self-sabotage (Vigilance)",
                "Break Inertia (Consistency)"
            ]
        },
        {
            id: "capitulo_2",
            number: "Chapter II",
            name: "Chapter II: Emotions",
            emoji: "⚖️",
            description: "The inner journey of mental integration and balance. Learn to understand and channel your impulses, desires, and emotional states without letting yourself be enslaved by them.",
            focus: "Shadow integration and emotional balance",
            unlockCondition: "Defeat 'Inertia' and ascend to Vassal caste.",
            milestones: [
                "Balance Impulsivity",
                "Acknowledge and channel Anxiety",
                "Overcome Chronic Discouragement"
            ]
        },
        {
            id: "capitulo_3",
            number: "Chapter III",
            name: "Chapter III: Resources",
            emoji: "💰",
            description: "The practical wisdom of Stewardship. Govern your material resources, finances, time, and energy with strategic responsibility and conscious consumption.",
            focus: "Practical organization, finances, and stewardship",
            unlockCondition: "Complete Chapter II and reach Regent caste.",
            milestones: [
                "Overcome feeling of Scarcity",
                "Master impulse of Consumerism",
                "Structure Time Organization"
            ]
        },
        {
            id: "capitulo_4",
            number: "Chapter IV",
            name: "Chapter IV: Vitality",
            emoji: "⚕️",
            description: "The temple of the physical body. Optimize your nutrition, sleep, breathing, and movement to sustain mental clarity and high existential energy required to govern your life.",
            focus: "Physical care, healthy sleep, and vital vigor",
            unlockCondition: "Complete Chapter III and reach Sovereign caste.",
            milestones: [
                "Overcome sedentary lethargy",
                "Balance nervous exhaustion",
                "Honor the physical temple and sound sleep"
            ]
        }
    ]
};

// Crossing Bosses / Challenges
interface BossDetails {
    id: string;
    chapterId: string;
    name: string;
    description: string;
    relicName: string;
    relicDescription: string;
}

const LOCALIZED_BOSSES: Record<string, BossDetails[]> = {
    pt: [
        // Capítulo I
        {
            id: "distracao",
            chapterId: "capitulo_1",
            name: "Distração",
            description: "O ruído constante de notificações, abas abertas e pequenos prazeres fugazes que roubam a sua presença.",
            relicName: "Relíquia do Foco 🔮",
            relicDescription: "Obtida ao silenciar o ruído externo e forjar clareza de presença."
        },
        {
            id: "procrastinacao",
            chapterId: "capitulo_1",
            name: "Procrastinação",
            description: "O adiar solene de compromissos sob o pretexto de 'esperar o momento ideal', alimentando a culpa silenciosa.",
            relicName: "Relíquia da Ação ⚔️",
            relicDescription: "Obtida ao quebrar a inação e realizar o primeiro passo com decisão imediata."
        },
        {
            id: "autossabotagem",
            chapterId: "capitulo_1",
            name: "Autossabotagem",
            description: "A voz interna que sussurra que você não é digno ou capaz, erguendo barreiras invisíveis antes do início.",
            relicName: "Relíquia da Vigilância 🛡️",
            relicDescription: "Obtida ao desarmar o medo subjetivo através da auto-observação atenta."
        },
        {
            id: "inercia",
            chapterId: "capitulo_1",
            name: "Inércia (Boss do Capítulo)",
            description: "A força oculta que atrai sua mente de volta à estagnação, testando sua resiliência após alguns dias de constância.",
            relicName: "Relíquia da Constância 🏅",
            relicDescription: "Obtida ao derrotar a estagnação e provar consistência inabalável na disciplina."
        },
        // Capítulo II
        {
            id: "impulsividade",
            chapterId: "capitulo_2",
            name: "Impulsividade",
            description: "A reação imediata e intempestiva guiada pela urgência emocional antes de qualquer ponderação prudente.",
            relicName: "Relíquia da Ponderação ⚓",
            relicDescription: "Obtida ao respirar no espaço entre o estímulo e a reação."
        },
        {
            id: "ansiedade",
            chapterId: "capitulo_2",
            name: "Ansiedade",
            description: "O turbilhão mental de cenários futuros catastróficos que impede o usufruto consciente do momento presente.",
            relicName: "Relíquia da Presença 🕊️",
            relicDescription: "Obtida ao ancorar-se no agora e aceitar o fluxo incerto da realidade."
        },
        {
            id: "desanimo",
            chapterId: "capitulo_2",
            name: "Desânimo (Boss do Capítulo)",
            description: "A apatia paralisante que sussurra que nenhum esforço vale a pena, nublando o horizonte de propósitos.",
            relicName: "Relíquia do Equilíbrio ⚖️",
            relicDescription: "Obtida ao acender a chama interior e resgatar o significado existencial de seus atos."
        },
        // Capítulo III
        {
            id: "escassez",
            chapterId: "capitulo_3",
            name: "Escassez",
            description: "O sentimento inconsciente de falta contínua que gera avareza, medo irracional de investir ou paralisia na prosperidade.",
            relicName: "Relíquia da Consciência 💎",
            relicDescription: "Obtida ao reconhecer os recursos disponíveis e agir com sabedoria e generosidade."
        },
        {
            id: "consumismo",
            chapterId: "capitulo_3",
            name: "Consumismo",
            description: "A compensação de vazios emocionais através da compra compulsiva de posses supérfluas e prazeres momentâneos.",
            relicName: "Relíquia da Sobriedade 💰",
            relicDescription: "Obtida ao diferenciar necessidade de desejo supérfluo com temperança límpida."
        },
        {
            id: "desorganizacao",
            chapterId: "capitulo_3",
            name: "Desorganização (Boss do Capítulo)",
            description: "A falta de clareza, limites e acompanhamento prático das próprias finanças e alocação do tempo.",
            relicName: "Relíquia da Prosperidade 📈",
            relicDescription: "Obtida ao estruturar com precisão e responsabilidade os fluxos materiais de sua vida."
        },
        // Capítulo IV
        {
            id: "sedentarismo",
            chapterId: "capitulo_4",
            name: "Sedentarismo",
            description: "A inércia corporal prolongada que atrofia a musculatura, prejudica a respiração e drena o vigor natural.",
            relicName: "Relíquia do Vigor 🏃",
            relicDescription: "Obtida ao honrar o templo físico através do movimento vigoroso e consciente."
        },
        {
            id: "exaustao",
            chapterId: "capitulo_4",
            name: "Exaustão",
            description: "Negligenciar os períodos de descanso e os limites do sistema nervoso em nome de um produtivismo cego.",
            relicName: "Relíquia da Regeneração 🔋",
            relicDescription: "Obtida ao respeitar os ciclos de pausa e nutrir o sono com reverência sagrada."
        },
        {
            id: "descuido",
            chapterId: "capitulo_4",
            name: "Descuido (Boss do Capítulo)",
            description: "Ignorar a saúde preventiva e os alertas biológicos do corpo, postergando check-ups e nutrição sã.",
            relicName: "Relíquia da Vitalidade 🩺",
            relicDescription: "Obtida ao abraçar a autoescuta corporal e a sabedoria da saúde integrada."
        }
    ],
    es: [
        // Capítulo I
        {
            id: "distracao",
            chapterId: "capitulo_1",
            name: "Distracción",
            description: "El ruido constante de notificaciones, pestañas abiertas y pequeños placeres fugaces que roban tu presencia.",
            relicName: "Reliquia del Enfoque 🔮",
            relicDescription: "Obtenida al silenciar el ruido externo y forjar claridad de presencia."
        },
        {
            id: "procrastinacao",
            chapterId: "capitulo_1",
            name: "Procrastinación",
            description: "El aplazamiento solemne de compromisos bajo el pretexto de 'esperar el momento ideal', alimentando la culpa silenciosa.",
            relicName: "Reliquia de la Acción ⚔️",
            relicDescription: "Obtenida al romper la inacción y dar el primer paso con decisión inmediata."
        },
        {
            id: "autossabotagem",
            chapterId: "capitulo_1",
            name: "Autosabotaje",
            description: "La voz interna que susurra que no eres digno o capaz, erigiendo barreras invisibles antes del inicio.",
            relicName: "Reliquia de la Vigilancia 🛡️",
            relicDescription: "Obtenida al desarmar el miedo subjetivo a través de la autoobservación atenta."
        },
        {
            id: "inercia",
            chapterId: "capitulo_1",
            name: "Inercia (Jefe del Capítulo)",
            description: "La fuerza oculta que atrae tu mente de vuelta al estancamiento, probando tu resiliencia tras unos días de constancia.",
            relicName: "Reliquia de la Constancia 🏅",
            relicDescription: "Obtenida al derrotar la inercia y demostrar una consistencia inquebrantable en la disciplina."
        },
        // Capítulo II
        {
            id: "impulsividade",
            chapterId: "capitulo_2",
            name: "Impulsividad",
            description: "La reacción inmediata e intempestiva guiada por la urgencia emocional antes de cualquier ponderación prudente.",
            relicName: "Reliquia de la Ponderación ⚓",
            relicDescription: "Obtenida al respirar en el espacio entre el estímulo y la reacción."
        },
        {
            id: "ansiedade",
            chapterId: "capitulo_2",
            name: "Ansiedad",
            description: "El torbellino mental de escenarios futuros catastróficos que impide disfrutar del momento presente de forma consciente.",
            relicName: "Reliquia de la Presencia 🕊️",
            relicDescription: "Obtenida al anclarse en el ahora y aceptar el flujo incierto de la realidad."
        },
        {
            id: "desanimo",
            chapterId: "capitulo_2",
            name: "Desaliento (Jefe del Capítulo)",
            description: "La apatía paralizante que susurra que ningún esfuerzo vale la pena, nublando el horizonte de propósitos.",
            relicName: "Reliquia del Equilibrio ⚖️",
            relicDescription: "Obtenida al encender la llama interior y rescatar el significado existencial de tus actos."
        },
        // Capítulo III
        {
            id: "escassez",
            chapterId: "capitulo_3",
            name: "Escasez",
            description: "El sentimiento inconsciente de falta constante que genera avaricia, miedo irracional a invertir o parálisis en la prosperidad.",
            relicName: "Reliquia de la Consciencia 💎",
            relicDescription: "Obtenida al reconocer los recursos disponibles y actuar con sabiduría y generosidad."
        },
        {
            id: "consumismo",
            chapterId: "capitulo_3",
            name: "Consumismo",
            description: "La compensación de vacíos emocionales a través de la compra compulsiva de posesiones superfluas y placeres momentáneos.",
            relicName: "Reliquia de la Sobriedad 💰",
            relicDescription: "Obtenida al diferenciar necesidad de deseo superfluo con una templanza límpida."
        },
        {
            id: "desorganizacao",
            chapterId: "capitulo_3",
            name: "Desorganización (Jefe del Capítulo)",
            description: "La falta de claridad, límites y seguimiento práctico de tus propias finanzas y de la asignación de tu tiempo.",
            relicName: "Reliquia de la Prosperidad 📈",
            relicDescription: "Obtenida al estructurar con precisión y responsabilidad los flujos materiales de tu vida."
        },
        // Capítulo IV
        {
            id: "sedentarismo",
            chapterId: "capitulo_4",
            name: "Sedentarismo",
            description: "La inercia corporal prolongada que atrofia la musculatura, perjudica la respiración y drena el vigor natural.",
            relicName: "Reliquia del Vigor 🏃",
            relicDescription: "Obtenida al honrar el templo físico mediante el movimiento vigoroso y consciente."
        },
        {
            id: "exaustao",
            chapterId: "capitulo_4",
            name: "Exhaustación",
            description: "Descuidar los periodos de descanso y los límites del sistema nervioso en nombre de un produtivismo ciego.",
            relicName: "Reliquia de la Regeneración 🔋",
            relicDescription: "Obtenida al respetar los ciclos de pausa y nutrir el sueño con reverencia sagrada."
        },
        {
            id: "descuido",
            chapterId: "capitulo_4",
            name: "Descuido (Jefe del Capítulo)",
            description: "Ignorar la salud preventiva y las alertas biológicas del cuerpo, posponiendo check-ups y una nutrición sana.",
            relicName: "Reliquia de la Vitalidade 🩺",
            relicDescription: "Obtenida al abrazar la autoescucha corporal y la sabiduría de la salud integrada."
        }
    ],
    en: [
        // Capítulo I
        {
            id: "distracao",
            chapterId: "capitulo_1",
            name: "Distraction",
            description: "The constant noise of notifications, open tabs, and fleeting pleasures that rob your presence.",
            relicName: "Relic of Focus 🔮",
            relicDescription: "Obtained by silencing external noise and forging clarity of presence."
        },
        {
            id: "procrastinacao",
            chapterId: "capitulo_1",
            name: "Procrastination",
            description: "The solemn postponement of commitments under the pretext of 'waiting for the ideal moment', feeding silent guilt.",
            relicName: "Relic of Action ⚔️",
            relicDescription: "Obtained by breaking inaction and taking the first step with immediate decision."
        },
        {
            id: "autossabotagem",
            chapterId: "capitulo_1",
            name: "Self-Sabotage",
            description: "The inner voice that whispers you are not worthy or capable, raising invisible barriers before you start.",
            relicName: "Relic of Vigilance 🛡️",
            relicDescription: "Obtained by disarming subjective fear through attentive self-observation."
        },
        {
            id: "inercia",
            chapterId: "capitulo_1",
            name: "Inertia (Chapter Boss)",
            description: "The hidden force that pulls your mind back to stagnation, testing your resilience after a few days of consistency.",
            relicName: "Relic of Consistency 🏅",
            relicDescription: "Obtained by defeating stagnation and proving unwavering consistency in discipline."
        },
        // Capítulo II
        {
            id: "impulsividade",
            chapterId: "capitulo_2",
            name: "Impulsivity",
            description: "The immediate and rash reaction guided by emotional urgency before any prudent consideration.",
            relicName: "Relic of Ponderation ⚓",
            relicDescription: "Obtained by breathing in the space between stimulus and response."
        },
        {
            id: "ansiedade",
            chapterId: "capitulo_2",
            name: "Anxiety",
            description: "The mental whirlwind of catastrophic future scenarios that prevents the conscious enjoyment of the present moment.",
            relicName: "Relic of Presence 🕊️",
            relicDescription: "Obtained by anchoring oneself in the now and accepting the uncertain flow of reality."
        },
        {
            id: "desanimo",
            chapterId: "capitulo_2",
            name: "Discouragement (Chapter Boss)",
            description: "The paralyzing apathy that whispers no effort is worthwhile, clouding the horizon of purpose.",
            relicName: "Relic of Balance ⚖️",
            relicDescription: "Obtained by lighting the inner flame and reclaiming the existential meaning of your actions."
        },
        // Capítulo III
        {
            id: "escassez",
            chapterId: "capitulo_3",
            name: "Scarcity",
            description: "The unconscious feeling of constant lack that generates greed, irrational fear of investing, or paralysis in prosperity.",
            relicName: "Relic of Consciousness 💎",
            relicDescription: "Obtained by recognizing available resources and acting with wisdom and generosity."
        },
        {
            id: "consumismo",
            chapterId: "capitulo_3",
            name: "Consumerism",
            description: "The compensation of emotional voids through the purchase of superfluous possessions and momentary pleasures.",
            relicName: "Relic of Sobriety 💰",
            relicDescription: "Obtained by differentiating need from superfluous desire with clear temperance."
        },
        {
            id: "desorganizacao",
            chapterId: "capitulo_3",
            name: "Disorganization (Chapter Boss)",
            description: "The lack of clarity, limits, and practical tracking of one's own finances and allocation of time.",
            relicName: "Relic of Prosperity 📈",
            relicDescription: "Obtained by precisely and responsibly structuring the material flows of your life."
        },
        // Capítulo IV
        {
            id: "sedentarismo",
            chapterId: "capitulo_4",
            name: "Sedentary lifestyle",
            description: "Prolonged bodily inertia that atrophies muscles, impairs breathing, and drains natural vigor.",
            relicName: "Relic of Vigor 🏃",
            relicDescription: "Obtained by honoring the physical temple through vigorous and conscious movement."
        },
        {
            id: "exaustao",
            chapterId: "capitulo_4",
            name: "Exhaustion",
            description: "Neglecting rest periods and nervous system limits in the name of blind productivism.",
            relicName: "Relic of Regeneration 🔋",
            relicDescription: "Obtained by respecting pause cycles and nurturing sleep with sacred reverence."
        },
        {
            id: "descuido",
            chapterId: "capitulo_4",
            name: "Neglect (Chapter Boss)",
            description: "Ignoring preventive health and biological alerts of the body, postponing check-ups and clean nutrition.",
            relicName: "Relic of Vitality 🩺",
            relicDescription: "Obtained by embracing physical self-listening and the wisdom of integrated health."
        }
    ]
};

interface UserRelic {
    id: string;
    name: string;
    description: string;
    origin: string;
    dateObtained: string;
}

interface BossLog {
    id: string;
    crossingId: string;
    bossId: string;
    date: string;
    context: string;
    strategy: string;
    outcome: string;
}

export default function TravessiaPage() {
    const router = useRouter();
    const { language } = useLanguage();

    const CASTES = useMemo(() => {
        if (language.startsWith("es")) return LOCALIZED_CASTES.es;
        if (language.startsWith("en")) return LOCALIZED_CASTES.en;
        return LOCALIZED_CASTES.pt;
    }, [language]);

    const CHAPTERS = useMemo(() => {
        if (language.startsWith("es")) return LOCALIZED_CHAPTERS.es;
        if (language.startsWith("en")) return LOCALIZED_CHAPTERS.en;
        return LOCALIZED_CHAPTERS.pt;
    }, [language]);

    const BOSSES = useMemo(() => {
        if (language.startsWith("es")) return LOCALIZED_BOSSES.es;
        if (language.startsWith("en")) return LOCALIZED_BOSSES.en;
        return LOCALIZED_BOSSES.pt;
    }, [language]);

    const [dbSyncStatus, setDbSyncStatus] = useState<"syncing" | "synced" | "offline">("syncing");

    // Travessia Dynamic States
    const [currentCaste, setCurrentCaste] = useState<string>("Peregrino");
    const [unlockedRegions, setUnlockedRegions] = useState<string[]>(["capitulo_1"]);
    const [relics, setRelics] = useState<UserRelic[]>([]);
    const [bossLogs, setBossLogs] = useState<BossLog[]>([]);

    // UI state indicators
    const [selectedChapter, setSelectedChapter] = useState<ChapterDetails | null>(null);
    const [activeCampaignChapterId, setActiveCampaignChapterId] = useState<string>("capitulo_1");
    const [confrontingBoss, setConfrontingBoss] = useState<BossDetails | null>(null);
    const [isSealingCompleted, setIsSealingCompleted] = useState(false);
    const [currentSealingChapter, setCurrentSealingChapter] = useState<string>("");

    // Battle inputs
    const [battleContext, setBattleContext] = useState("");
    const [battleStrategy, setBattleStrategy] = useState("");
    const [battleOutcome, setBattleOutcome] = useState("");

    // ==========================================
    // DATA FETCHING & SYNCHRONIZATION
    // ==========================================

    useEffect(() => {
        const fetchTravessiaData = async () => {
            setDbSyncStatus("syncing");
            try {
                const response = await fetch("/api/sovereign", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "get_travessia_data" })
                });

                if (response.status === 401) {
                    throw new Error("Unauthorized");
                }

                const data = await response.json();
                setCurrentCaste(data.caste || "Peregrino");
                
                let loadedChapters: string[] = data.unlockedRegions || [];
                
                // Map old physical room IDs to new existential chapters for backwards compatibility
                if (loadedChapters.includes("biblioteca") || loadedChapters.includes("claustro") || loadedChapters.includes("jardim") || loadedChapters.includes("tribunal")) {
                    if (!loadedChapters.includes("capitulo_1")) loadedChapters.push("capitulo_1");
                }
                if (loadedChapters.includes("observatorio") || loadedChapters.includes("portal") || loadedChapters.includes("mosteiro")) {
                    if (!loadedChapters.includes("capitulo_1")) loadedChapters.push("capitulo_1");
                    if (!loadedChapters.includes("capitulo_2")) loadedChapters.push("capitulo_2");
                }
                if (loadedChapters.includes("sala_trono")) {
                    if (!loadedChapters.includes("capitulo_1")) loadedChapters.push("capitulo_1");
                    if (!loadedChapters.includes("capitulo_2")) loadedChapters.push("capitulo_2");
                    if (!loadedChapters.includes("capitulo_3")) loadedChapters.push("capitulo_3");
                    if (!loadedChapters.includes("capitulo_4")) loadedChapters.push("capitulo_4");
                }
                
                if (loadedChapters.length === 0 || !loadedChapters.includes("capitulo_1")) {
                    loadedChapters.push("capitulo_1");
                }
                
                // Keep chapters unlocked in sync with Caste levels for seamless transition
                const caste = data.caste || "Peregrino";
                if (caste === "Vassalo" && !loadedChapters.includes("capitulo_2")) loadedChapters.push("capitulo_2");
                if (caste === "Regente") {
                    if (!loadedChapters.includes("capitulo_2")) loadedChapters.push("capitulo_2");
                    if (!loadedChapters.includes("capitulo_3")) loadedChapters.push("capitulo_3");
                }
                if (caste === "Soberano") {
                    if (!loadedChapters.includes("capitulo_2")) loadedChapters.push("capitulo_2");
                    if (!loadedChapters.includes("capitulo_3")) loadedChapters.push("capitulo_3");
                    if (!loadedChapters.includes("capitulo_4")) loadedChapters.push("capitulo_4");
                }

                setUnlockedRegions(loadedChapters);
                setRelics(data.relics || []);
                setBossLogs(data.bossLogs || []);
                setDbSyncStatus("synced");
                
                // Auto switch active campaign selector to latest unlocked chapter
                if (loadedChapters.includes("capitulo_4")) setActiveCampaignChapterId("capitulo_4");
                else if (loadedChapters.includes("capitulo_3")) setActiveCampaignChapterId("capitulo_3");
                else if (loadedChapters.includes("capitulo_2")) setActiveCampaignChapterId("capitulo_2");
                else setActiveCampaignChapterId("capitulo_1");
                
            } catch {
                console.log("Travessia offline/unauthenticated fallback to LocalStorage.");
                // Local fallback
                const fallbackCaste = localStorage.getItem("sovereign_caste") || "Peregrino";
                setCurrentCaste(fallbackCaste);
                
                let loadedChapters: string[] = JSON.parse(localStorage.getItem("sovereign_unlocked_regions") || '["capitulo_1"]');
                
                // Map old physical room IDs to new existential chapters for backwards compatibility
                if (loadedChapters.includes("biblioteca") || loadedChapters.includes("claustro") || loadedChapters.includes("jardim") || loadedChapters.includes("tribunal")) {
                    if (!loadedChapters.includes("capitulo_1")) loadedChapters.push("capitulo_1");
                }
                if (loadedChapters.includes("observatorio") || loadedChapters.includes("portal") || loadedChapters.includes("mosteiro")) {
                    if (!loadedChapters.includes("capitulo_1")) loadedChapters.push("capitulo_1");
                    if (!loadedChapters.includes("capitulo_2")) loadedChapters.push("capitulo_2");
                }
                if (loadedChapters.includes("sala_trono")) {
                    if (!loadedChapters.includes("capitulo_1")) loadedChapters.push("capitulo_1");
                    if (!loadedChapters.includes("capitulo_2")) loadedChapters.push("capitulo_2");
                    if (!loadedChapters.includes("capitulo_3")) loadedChapters.push("capitulo_3");
                    if (!loadedChapters.includes("capitulo_4")) loadedChapters.push("capitulo_4");
                }
                
                if (!loadedChapters.includes("capitulo_1")) {
                    loadedChapters.push("capitulo_1");
                }

                if (fallbackCaste === "Vassalo" && !loadedChapters.includes("capitulo_2")) loadedChapters.push("capitulo_2");
                if (fallbackCaste === "Regente") {
                    if (!loadedChapters.includes("capitulo_2")) loadedChapters.push("capitulo_2");
                    if (!loadedChapters.includes("capitulo_3")) loadedChapters.push("capitulo_3");
                }
                if (fallbackCaste === "Soberano") {
                    if (!loadedChapters.includes("capitulo_2")) loadedChapters.push("capitulo_2");
                    if (!loadedChapters.includes("capitulo_3")) loadedChapters.push("capitulo_3");
                    if (!loadedChapters.includes("capitulo_4")) loadedChapters.push("capitulo_4");
                }

                setUnlockedRegions(loadedChapters);
                setRelics(JSON.parse(localStorage.getItem("sovereign_relics") || "[]"));
                setBossLogs(JSON.parse(localStorage.getItem("sovereign_boss_logs") || "[]"));
                setDbSyncStatus("offline");
                
                if (loadedChapters.includes("capitulo_4")) setActiveCampaignChapterId("capitulo_4");
                else if (loadedChapters.includes("capitulo_3")) setActiveCampaignChapterId("capitulo_3");
                else if (loadedChapters.includes("capitulo_2")) setActiveCampaignChapterId("capitulo_2");
                else setActiveCampaignChapterId("capitulo_1");
            }
        };

        fetchTravessiaData();
    }, []);

    // DB/Local Save triggers
    const saveCasteLocal = async (caste: string) => {
        setCurrentCaste(caste);
        if (dbSyncStatus === "synced") {
            try {
                await fetch("/api/sovereign", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "update_caste", caste })
                });
            } catch {
                console.error("Failed to sync caste.");
            }
        } else {
            localStorage.setItem("sovereign_caste", caste);
        }
    };

    const saveUnlockedRegionLocal = async (regionId: string) => {
        if (unlockedRegions.includes(regionId)) return;
        const updated = [...unlockedRegions, regionId];
        setUnlockedRegions(updated);

        if (dbSyncStatus === "synced") {
            try {
                await fetch("/api/sovereign", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "unlock_region", regionId })
                });
            } catch {
                console.error("Failed to sync region unlock.");
            }
        } else {
            localStorage.setItem("sovereign_unlocked_regions", JSON.stringify(updated));
        }
    };

    const saveBossDefeatLocal = async (log: BossLog, relic: UserRelic) => {
        const updatedLogs = [...bossLogs, log];
        const updatedRelics = [...relics, relic];

        setBossLogs(updatedLogs);
        setRelics(updatedRelics);

        // Automatic Caste progress & Chapter unlock checks
        let updatedCaste = currentCaste;
        if (log.bossId === "inercia") {
            updatedCaste = "Vassalo";
            saveCasteLocal("Vassalo");
            saveUnlockedRegionLocal("capitulo_2");
            setActiveCampaignChapterId("capitulo_2");
        } else if (log.bossId === "desanimo") {
            updatedCaste = "Regente";
            saveCasteLocal("Regente");
            saveUnlockedRegionLocal("capitulo_3");
            setActiveCampaignChapterId("capitulo_3");
        } else if (log.bossId === "desorganizacao") {
            updatedCaste = "Soberano";
            saveCasteLocal("Soberano");
            saveUnlockedRegionLocal("capitulo_4");
            setActiveCampaignChapterId("capitulo_4");
        }

        if (dbSyncStatus === "synced") {
            try {
                await Promise.all([
                    fetch("/api/sovereign", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "save_boss_log", log })
                    }),
                    fetch("/api/sovereign", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "save_relic", relic })
                    })
                ]);
            } catch {
                console.error("Failed to sync campaign log.");
            }
        } else {
            localStorage.setItem("sovereign_boss_logs", JSON.stringify(updatedLogs));
            localStorage.setItem("sovereign_relics", JSON.stringify(updatedRelics));
        }
    };

    // ==========================================
    // INTERACTIVE ACTIONS
    // ==========================================

    const handleConfrontBoss = (boss: BossDetails) => {
        setConfrontingBoss(boss);
        setBattleContext("");
        setBattleStrategy("");
        setBattleOutcome("");
    };

    const handleResolveConfront = (e: React.FormEvent) => {
        e.preventDefault();
        if (!confrontingBoss || !battleContext || !battleStrategy || !battleOutcome) return;

        const dateStr = new Date().toLocaleDateString(language.startsWith("pt") ? "pt-BR" : "en-US");
        const logId = Math.random().toString(36).substring(2, 9);
        
        // Find which chapter this boss belongs to
        const currentChapterObj = CHAPTERS.find(c => c.id === confrontingBoss.chapterId);
        const crossingTitle = currentChapterObj ? currentChapterObj.name : "Jornada Existencial";

        const newLog: BossLog = {
            id: logId,
            crossingId: crossingTitle,
            bossId: confrontingBoss.id,
            date: dateStr,
            context: battleContext,
            strategy: battleStrategy,
            outcome: battleOutcome
        };

        const relicId = Math.random().toString(36).substring(2, 9);
        const newRelic: UserRelic = {
            id: relicId,
            name: confrontingBoss.relicName,
            description: confrontingBoss.relicDescription,
            origin: `Superação de Obstáculo: ${confrontingBoss.name}`,
            dateObtained: dateStr
        };

        saveBossDefeatLocal(newLog, newRelic);
        setConfrontingBoss(null);

        // If the defeated boss is a chapter final boss, trigger a dynamic parchment seal ceremony!
        const isChapterBoss = ["inercia", "desanimo", "desorganizacao", "descuido"].includes(confrontingBoss.id);
        if (isChapterBoss) {
            setCurrentSealingChapter(confrontingBoss.chapterId);
            setIsSealingCompleted(true);
        }
    };

    // Progression variables
    const completedBossIds = bossLogs.map(l => l.bossId);
    const isBossDefeated = (bossId: string) => completedBossIds.includes(bossId);

    const activeCasteDetails = CASTES.find(c => c.id === currentCaste) || CASTES[0];

    const dict = {
        activeFocus: language.startsWith("pt") ? "Foco Ativo" : language.startsWith("es") ? "Enfoque Activo" : "Active Focus",
        active: language.startsWith("pt") ? "Ativo" : language.startsWith("es") ? "Activo" : "Active",
        focus: language.startsWith("pt") ? "Foco: " : language.startsWith("es") ? "Enfoque: " : "Focus: ",
        viewDiary: language.startsWith("pt") ? "Ver Diário" : language.startsWith("es") ? "Ver Diario" : "View Diary",
        locked: language.startsWith("pt") ? "Bloqueado" : language.startsWith("es") ? "Bloqueado" : "Locked",
        requirement: language.startsWith("pt") ? "Requisito: " : language.startsWith("es") ? "Requisito: " : "Requirement: ",
        phaseConquered: language.startsWith("pt") ? "Fase Existencial Conquistada" : language.startsWith("es") ? "Fase Existencial Conquistada" : "Existential Phase Conquered",
        chapterPhilosophy: language.startsWith("pt") ? "Filosofia do Capítulo:" : language.startsWith("es") ? "Filosofía del Capítulo:" : "Chapter Philosophy:",
        focusOfEvolution: language.startsWith("pt") ? "Foco de Evolução:" : language.startsWith("es") ? "Enfoque de Evolución:" : "Focus of Evolution:",
        milestones: language.startsWith("pt") ? "Marcos da Jornada (Desafios):" : language.startsWith("es") ? "Hitos del Viaje (Desafíos):" : "Journey Milestones (Challenges):",
        chancelled: language.startsWith("pt") ? "Chancelado" : language.startsWith("es") ? "Chancelado" : "Sealed",
        closeDiary: language.startsWith("pt") ? "Fechar Diário" : language.startsWith("es") ? "Cerrar Diario" : "Close Diary",
        campaignDiary: language.startsWith("pt") ? "Diário de Campanhas" : language.startsWith("es") ? "Diario de Campañas" : "Campaign Diary",
        confrontDemons: language.startsWith("pt") ? "Confronte os demônios existenciais e declare suas vitórias diárias para chancelar os capítulos." : language.startsWith("es") ? "Confronte los demonios existenciales y declare sus victorias diarias para sellar los capítulos." : "Confront existential demons and declare your daily victories to seal the chapters.",
        conquering: language.startsWith("pt") ? "CONQUISTANDO" : language.startsWith("es") ? "CONQUISTANDO" : "CONQUERING",
        chapter: language.startsWith("pt") ? "Capítulo" : language.startsWith("es") ? "Capítulo" : "Chapter",
        challenge: language.startsWith("pt") ? "Desafio" : language.startsWith("es") ? "Desafío" : "Challenge",
        confront: language.startsWith("pt") ? "⚔️ Confrontar" : language.startsWith("es") ? "⚔️ Confrontar" : "⚔️ Confront",
        overcome: language.startsWith("pt") ? "Superado" : language.startsWith("es") ? "Superado" : "Overcome",
        sealCompleted: language.startsWith("pt") ? "Selo de Expedição Concluída" : language.startsWith("es") ? "Sello de Expedición Concluida" : "Seal of Completed Expedition",
        codex: language.startsWith("pt") ? "Nemosine Nous Codex" : language.startsWith("es") ? "Nemosine Nous Codex" : "Nemosine Nous Codex",
        sealExpedition: language.startsWith("pt") ? "Expedição Chancelada:" : language.startsWith("es") ? "Expedición Sellada:" : "Sealed Expedition:",
        conqueredChapters: language.startsWith("pt") ? "Capítulos Conquistados:" : language.startsWith("es") ? "Capítulos Conquistados:" : "Conquered Chapters:",
        conqueredText: language.startsWith("pt") ? "Conquistados" : language.startsWith("es") ? "Conquistados" : "Conquered",
        relicsText: language.startsWith("pt") ? "Relíquias de Campanha:" : language.startsWith("es") ? "Reliquias de Campaña:" : "Campaign Relics:",
        artifacts: language.startsWith("pt") ? "Artefatos" : language.startsWith("es") ? "Artefactos" : "Artifacts",
        accessSeal: language.startsWith("pt") ? "Chancela de Acesso:" : language.startsWith("es") ? "Sello de Acceso:" : "Access Seal:",
        imperialSeal: language.startsWith("pt") ? "Chancela Imperial de Nous" : language.startsWith("es") ? "Sello Imperial de Nous" : "Imperial Seal of Nous",
        diaryWins: language.startsWith("pt") ? "Diário de Vitórias e Aprendizados" : language.startsWith("es") ? "Diario de Victorias y Aprendizajes" : "Diary of Victories and Learnings",
        victory: language.startsWith("pt") ? "Vitória: " : language.startsWith("es") ? "Victoria: " : "Victory: ",
        obstacleLabel: language.startsWith("pt") ? "O Obstáculo:" : language.startsWith("es") ? "El Obstáculo:" : "The Obstacle:",
        strategyLabel: language.startsWith("pt") ? "A Estratégia:" : language.startsWith("es") ? "La Estrategia:" : "The Strategy:",
        outcomeLabel: language.startsWith("pt") ? "O Resultado Existencial:" : language.startsWith("es") ? "El Resultado Existencial:" : "The Existential Outcome:",
        relicsTitle: language.startsWith("pt") ? "Relíquias Conquistadas" : language.startsWith("es") ? "Reliquias Conquistadas" : "Conquered Relics",
        relicsDesc: language.startsWith("pt") ? "Artefatos que atestam marcos de vitórias internas e transformações concretas." : language.startsWith("es") ? "Artefactos que atestiguan hitos de victorias internas y transformaciones concretas." : "Artifacts that attest milestones of internal victories and concrete transformations.",
        noRelics: language.startsWith("pt") ? "Nenhum artefato existencial obtido ainda nesta campanha. Confronte e vença um desafio para ganhar uma relíquia." : language.startsWith("es") ? "Ningún artefacto existencial obtenido aún en esta campaña. Confronte y venza un desafío para ganar una reliquia." : "No existential artifacts obtained yet in this campaign. Confront and overcome a challenge to earn a relic.",
        confronting: language.startsWith("pt") ? "Confrontando: " : language.startsWith("es") ? "Confrontando: " : "Confronting: ",
        realConfront: language.startsWith("pt") ? "Confronto de Consciência Real" : language.startsWith("es") ? "Confrontación de Conciencia Real" : "Real Consciousness Confrontation",
        realConfrontDesc: language.startsWith("pt") ? "Registre a batalha travada hoje. Ao declarar o contexto de superação real, você conquistará a relíquia associada a esta vitória no seu diário de jornada." : language.startsWith("es") ? "Registre la batalla librada hoy. Al declarar el contexto de superación real, ganará la reliquia asociada con esta victoria en su diario de viaje." : "Record the battle fought today. By declaring the context of real overcoming, you will earn the relic associated with this victory in your journey diary.",
        question1: language.startsWith("pt") ? "Como esse obstáculo existencial se apresentou na prática?" : language.startsWith("es") ? "¿Cómo se presentó este obstáculo existencial en la práctica?" : "How did this existential obstacle present itself in practice?",
        placeholder1: language.startsWith("pt") ? "Ex: Fiquei procrastinando ao invés de iniciar o relatório, enrolando com distrações no celular..." : language.startsWith("es") ? "Ej: Estuve procrastinando en lugar de comenzar el informe, perdiendo el tiempo con distracciones en el celular..." : "E.g., I kept procrastinating instead of starting the report, wasting time with distractions on my phone...",
        question2: language.startsWith("pt") ? "Qual estratégia consciente você utilizou para superá-lo?" : language.startsWith("es") ? "¿Qué estrategia consciente utilizaste para superarlo?" : "What conscious strategy did you use to overcome it?",
        placeholder2: language.startsWith("pt") ? "Ex: Apliquei a regra dos 5 segundos, silenciei as notificações e comecei pequeno por apenas 10 minutos..." : language.startsWith("es") ? "Ej: Apliqué la regla de los 5 segundos, silencié las notificaciones y comencé de a poco por solo 10 minutos..." : "E.g., I applied the 5-second rule, silenced notifications, and started small for just 10 minutes...",
        question3: language.startsWith("pt") ? "Qual foi o resultado ou aprendizado dessa vitória?" : language.startsWith("es") ? "¿Cuál fue el resultado o aprendizaje de esta victoria?" : "What was the result or learning of this victory?",
        placeholder3: language.startsWith("pt") ? "Ex: Consegui focar por 1 hora e finalizei a maior parte da tarefa com clareza." : language.startsWith("es") ? "Ej: Logré concentrarme durante 1 hora y completé la mayor parte de la tarea con claridad." : "E.g., I managed to focus for 1 hour and completed most of the task with clarity.",
        retreat: language.startsWith("pt") ? "Recuar" : language.startsWith("es") ? "Retroceder" : "Retreat",
        recordVictory: language.startsWith("pt") ? "Registrar Vitória ⚔️" : language.startsWith("es") ? "Registrar Victoria ⚔️" : "Record Victory ⚔️",
        returnToDomains: language.startsWith("pt") ? "← Retornar aos Domínios" : language.startsWith("es") ? "← Retornar a los Dominios" : "← Return to Domains",
        chaptersWord: language.startsWith("pt") ? "Capítulos" : language.startsWith("es") ? "Capítulos" : "Chapters",
        progressWord: language.startsWith("pt") ? "Progresso" : language.startsWith("es") ? "Progreso" : "Progress",
        closeDiaryBtn: language.startsWith("pt") ? "Fechar Diário" : language.startsWith("es") ? "Cerrar Diario" : "Close Diary"
    };

    return (
        <main className="nemosine-main-container min-h-screen relative overflow-hidden flex flex-col justify-between select-none">
            {/* Ancient Atlas Atmosphere */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="nemosine-bg-overlay absolute inset-0 z-10 backdrop-blur-[1px]"></div>
                <div className="nemosine-mental-castle-bg w-full h-full bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=2000')] bg-cover bg-center"></div>
            </div>

            <div className="sticky top-0 z-50">
                <Navbar />
            </div>

            <div className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-8 py-10 md:py-16 flex-1 flex flex-col gap-10">
                
                {/* 1. TOP SECTION: CASTE HEADER */}
                <header className="glass-medieval w-full rounded-3xl p-6 md:p-8 border-2 border-[#c5a059]/40 bg-black/60 shadow-[0_15px_40px_rgba(0,0,0,0.8)] relative overflow-hidden text-left flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#c5a059]/5 to-transparent pointer-events-none"></div>
                    
                    <div className="space-y-3 max-w-xl">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl drop-shadow-[0_0_10px_rgba(197,160,89,0.5)]">🛡️</span>
                            <div>
                                <span className="text-[9px] uppercase tracking-[0.3em] text-[#c5a059]/60 font-bold block">
                                    {language.startsWith("pt") ? "Nível de Acesso Estrutural" : language === "es" ? "Nivel de Acceso Estructural" : "Structural Access Level"}
                                </span>
                                <h1 className="font-display text-2xl uppercase tracking-widest text-[#c5a059] font-bold">
                                    {language.startsWith("pt") ? "Casta" : language === "es" ? "Casta" : "Caste"}: {activeCasteDetails.title}
                                </h1>
                            </div>
                        </div>
                        <p className="font-body text-xs md:text-sm italic text-stone-400">
                            "{activeCasteDetails.description}"
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                            {activeCasteDetails.perks.map((p, idx) => (
                                <span key={idx} className="bg-[#c5a059]/5 border border-[#c5a059]/20 text-stone-300 text-[8.5px] uppercase tracking-wider px-2 py-0.5 rounded font-mono font-bold">
                                    ✓ {p}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 text-right">
                        <div className="flex items-center gap-1.5 bg-black/75 px-3 py-1 rounded-full border border-stone-850 text-[8px] uppercase tracking-widest text-stone-400 font-bold font-mono">
                            <span className={`w-1.5 h-1.5 rounded-full ${dbSyncStatus === 'synced' ? 'bg-emerald-500 animate-pulse' : dbSyncStatus === 'syncing' ? 'bg-amber-500 animate-spin' : 'bg-stone-500'}`}></span>
                            {dbSyncStatus === 'synced' 
                                ? (language.startsWith("pt") ? "Atlas Sincronizado" : language === "es" ? "Atlas Sincronizado" : "Synchronized Atlas") 
                                : dbSyncStatus === 'syncing' 
                                    ? (language.startsWith("pt") ? "Sincronizando..." : language === "es" ? "Sincronizando..." : "Synchronizing...") 
                                    : (language.startsWith("pt") ? "Atlas Local" : language === "es" ? "Atlas Local" : "Local Atlas")}
                        </div>
                        <p className="text-[7.5px] text-stone-500 uppercase tracking-wider font-semibold">
                            {language.startsWith("pt") 
                                ? "Casta atualizada automaticamente conforme seu amadurecimento existencial." 
                                : language === "es" 
                                    ? "Casta actualizada automáticamente según tu maduración existencial." 
                                    : "Caste updated automatically in accordance with your existential maturity."}
                        </p>
                    </div>
                </header>

                {/* 2. LINHA DO TEMPO DOS CAPÍTULOS */}
                <section className="space-y-6 text-left">
                    <div className="flex justify-between items-end border-b border-[#c5a059]/25 pb-2">
                        <div>
                            <h2 className="font-display text-lg uppercase tracking-wider text-[#c5a059] font-bold">
                                {language.startsWith("pt") ? "Atlas da Travessia" : language === "es" ? "Atlas de la Travesía" : "Crossing Atlas"}
                            </h2>
                            <p className="text-[9px] text-stone-400 font-body">
                                {language.startsWith("pt") 
                                    ? "Os quatro capítulos fundamentais do seu amadurecimento e campanha pessoal." 
                                    : language === "es" 
                                        ? "Los cuatro capítulos fundamentales de tu crecimiento y campaña personal." 
                                        : "The four fundamental chapters of your personal growth and campaign."}
                            </p>
                        </div>
                        <span className="text-[10px] font-mono text-[#c5a059]/60 font-bold">
                            {dict.progressWord}: {unlockedRegions.length} / {CHAPTERS.length} {dict.chaptersWord}
                        </span>
                    </div>

                    {/* Timeline Path of Chapters */}
                    <div className="relative">
                        {/* Golden/stone connective line in desktop */}
                        <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-gradient-to-r from-[#c5a059]/40 via-stone-800 to-transparent -translate-y-1/2 hidden md:block z-0"></div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
                            {CHAPTERS.map((chapter, index) => {
                                const isUnlocked = unlockedRegions.includes(chapter.id);
                                const isCurrent = (index === 0 && !isBossDefeated("inercia")) ||
                                                  (index === 1 && isBossDefeated("inercia") && !isBossDefeated("desanimo")) ||
                                                  (index === 2 && isBossDefeated("desanimo") && !isBossDefeated("desorganizacao")) ||
                                                  (index === 3 && isBossDefeated("desorganizacao") && !isBossDefeated("descuido"));
                                
                                return (
                                    <button
                                        key={chapter.id}
                                        onClick={() => isUnlocked && setSelectedChapter(chapter)}
                                        disabled={!isUnlocked}
                                        className={`relative rounded-2xl border p-5 flex flex-col justify-between text-left transition-all duration-500 ${
                                            isUnlocked 
                                                ? isCurrent
                                                    ? "bg-[#1c1a24]/50 border-[#c5a059] shadow-[0_0_25px_rgba(197,160,89,0.25)] hover:shadow-[0_0_35px_rgba(197,160,89,0.4)] cursor-pointer group/chapter ring-1 ring-[#c5a059]/40"
                                                    : "bg-[#1c1a24]/30 border-[#c5a059]/40 hover:border-[#c5a059] cursor-pointer hover:shadow-[0_0_20px_rgba(197,160,89,0.15)] group/chapter"
                                                : "bg-[#0b0a0f]/80 border-stone-900 opacity-40 cursor-not-allowed select-none"
                                        }`}
                                    >
                                        {/* Chapter Label */}
                                        <div className="absolute -top-3 left-4 bg-[#0a0a0c] border border-[#c5a059]/40 text-[#c5a059] text-[7.5px] uppercase tracking-widest font-mono font-bold px-2 py-0.5 rounded-full">
                                            {chapter.number}
                                        </div>
                                        
                                        {isUnlocked ? (
                                            <>
                                                <div className="flex justify-between items-start mt-2 mb-4">
                                                    <span className="text-3.5xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] group-hover/chapter:scale-110 transition-transform">
                                                        {chapter.emoji}
                                                    </span>
                                                    <div className="flex flex-col items-end gap-1">
                                                        {isCurrent && (
                                                            <span className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[6px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded font-mono animate-pulse">
                                                                {dict.activeFocus}
                                                            </span>
                                                        )}
                                                        <span className="bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#fde68a] text-[6.5px] uppercase font-bold px-1.5 py-0.5 rounded font-mono">
                                                            {dict.active}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-1">
                                                    <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[#c5a059] group-hover/chapter:text-amber-300 transition-colors">
                                                        {chapter.name.replace(/Capítulo [I|V|X]+: /, '')}
                                                    </h3>
                                                    <p className="text-[8.5px] text-stone-400 font-bold uppercase tracking-wider">
                                                        {dict.focus}{chapter.focus}
                                                    </p>
                                                    <p className="text-[8px] text-stone-500 line-clamp-2 leading-relaxed italic pt-1 border-t border-stone-850">
                                                        "{chapter.description}"
                                                    </p>
                                                </div>
                                                
                                                <div className="mt-4 pt-2 border-t border-stone-850 w-full flex justify-between items-center text-[7.5px] text-[#c5a059] font-mono font-bold uppercase">
                                                    <span>{dict.viewDiary}</span>
                                                    <span className="group-hover/chapter:translate-x-1 transition-transform">→</span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex justify-between items-start mt-2 mb-4">
                                                    <span className="text-3xl filter grayscale opacity-25">🔒</span>
                                                    <span className="bg-stone-900 border border-stone-800 text-stone-500 text-[6.5px] uppercase font-bold px-1.5 py-0.5 rounded font-mono">
                                                        {dict.locked}
                                                    </span>
                                                </div>
                                                
                                                <div className="space-y-1.5">
                                                    <h3 className="font-display text-xs font-bold uppercase tracking-wider text-stone-600">
                                                        {chapter.name.replace(/Capítulo [I|V|X]+: /, '')}
                                                    </h3>
                                                    <div className="p-1.5 bg-black/40 border border-stone-850 rounded text-[7.5px] text-stone-500 font-bold uppercase tracking-wide leading-tight">
                                                        {dict.requirement}{chapter.unlockCondition}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* Chapter details popup */}
                {selectedChapter && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in text-left">
                        <div className="glass-medieval w-full max-w-lg rounded-2xl p-6 md:p-8 border-2 border-[#c5a059]/65 bg-[#0e0d12] relative space-y-5 shadow-[0_20px_60px_rgba(0,0,0,0.9)] max-h-[90vh] overflow-y-auto">
                            <button onClick={() => setSelectedChapter(null)} className="absolute top-4 right-4 text-stone-500 hover:text-stone-300 cursor-pointer p-1">
                                <span className="material-icons text-base">close</span>
                            </button>
                            
                            <div className="flex items-center gap-4 border-b border-[#c5a059]/20 pb-4">
                                <span className="text-5xl drop-shadow-[0_4px_10px_rgba(197,160,89,0.3)]">{selectedChapter.emoji}</span>
                                <div>
                                    <span className="text-[7.5px] text-[#c5a059] uppercase tracking-[0.2em] font-mono font-bold">{selectedChapter.number}</span>
                                    <h3 className="font-display text-lg font-bold uppercase tracking-wider text-[#c5a059]">{selectedChapter.name}</h3>
                                    <p className="text-[8px] text-emerald-400 uppercase tracking-widest font-bold font-mono">{dict.phaseConquered}</p>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <span className="text-[8.5px] uppercase tracking-wider font-bold text-[#c5a059]/60 block mb-1">{dict.chapterPhilosophy}</span>
                                    <p className="font-body text-xs leading-relaxed text-[#eee8dc]/90 italic bg-stone-900/40 p-3 rounded-lg border border-stone-850">
                                        "{selectedChapter.description}"
                                    </p>
                                </div>
                                
                                <div>
                                    <span className="text-[8.5px] uppercase tracking-wider font-bold text-[#c5a059]/60 block mb-1.5">{dict.focusOfEvolution}</span>
                                    <div className="text-xs text-stone-300 flex items-center gap-2 font-bold font-display uppercase tracking-wide">
                                        <span className="text-amber-400 text-sm">🎯</span>
                                        <span>{selectedChapter.focus}</span>
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <span className="text-[8.5px] uppercase tracking-wider font-bold text-[#c5a059] block">{dict.milestones}</span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {selectedChapter.milestones.map((milestone, idx) => {
                                            let isMet = false;
                                            if (selectedChapter.id === "capitulo_1") {
                                                if (idx === 0) isMet = isBossDefeated("distracao");
                                                if (idx === 1) isMet = isBossDefeated("procrastinacao");
                                                if (idx === 2) isMet = isBossDefeated("autossabotagem");
                                                if (idx === 3) isMet = isBossDefeated("inercia");
                                            } else if (selectedChapter.id === "capitulo_2") {
                                                if (idx === 0) isMet = isBossDefeated("impulsividade");
                                                if (idx === 1) isMet = isBossDefeated("ansiedade");
                                                if (idx === 2) isMet = isBossDefeated("desanimo");
                                            } else if (selectedChapter.id === "capitulo_3") {
                                                if (idx === 0) isMet = isBossDefeated("escassez");
                                                if (idx === 1) isMet = isBossDefeated("consumismo");
                                                if (idx === 2) isMet = isBossDefeated("desorganizacao");
                                            } else if (selectedChapter.id === "capitulo_4") {
                                                if (idx === 0) isMet = isBossDefeated("sedentarismo");
                                                if (idx === 1) isMet = isBossDefeated("exaustao");
                                                if (idx === 2) isMet = isBossDefeated("descuido");
                                            }
                                            
                                            return (
                                                <div key={idx} className={`flex items-center gap-2.5 p-2 rounded-lg border text-[10px] ${
                                                    isMet 
                                                        ? "bg-emerald-950/15 border-emerald-900/40 text-emerald-300 font-bold" 
                                                        : "bg-black/40 border-stone-850 text-stone-400"
                                                }`}>
                                                    <span className={isMet ? "text-emerald-400" : "text-stone-600"}>
                                                        {isMet ? "✦" : "✧"}
                                                    </span>
                                                    <span>{milestone}</span>
                                                    {isMet && <span className="ml-auto text-[8px] uppercase px-1 py-0.2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded font-mono">{dict.chancelled}</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="pt-3 border-t border-stone-850 flex justify-end">
                                <button onClick={() => setSelectedChapter(null)} className="px-6 py-2 bg-[#c5a059]/10 hover:bg-[#c5a059]/20 border border-[#c5a059]/40 text-stone-200 rounded font-display text-[9.5px] uppercase tracking-wider transition-all cursor-pointer">{dict.closeDiaryBtn}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. CAMPAIGN DIARY: THEMATED QUEST & BOSS CONFRONT */}
                <section className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start text-left">
                    
                    {/* Thematic crossings list (8 columns) */}
                    <div className="md:col-span-8 space-y-4">
                        <div className="border-b border-[#c5a059]/25 pb-2">
                            <h2 className="font-display text-lg uppercase tracking-wider text-[#c5a059] font-bold">{dict.campaignDiary}</h2>
                            <p className="text-[9px] text-stone-400 font-body">{dict.confrontDemons}</p>
                        </div>

                        {/* Chapter Tabs Selectors */}
                        <div className="flex gap-2 border-b border-stone-900 pb-2 overflow-x-auto scrollbar-none">
                            {CHAPTERS.map((chap) => {
                                const isUnlocked = unlockedRegions.includes(chap.id);
                                if (!isUnlocked) return null;
                                
                                return (
                                    <button
                                        key={chap.id}
                                        onClick={() => setActiveCampaignChapterId(chap.id)}
                                        className={`px-3 py-1.5 border rounded-t-xl font-display text-[8.5px] uppercase tracking-wider transition-all cursor-pointer ${
                                            activeCampaignChapterId === chap.id
                                                ? "bg-[#1c1a24]/40 border-b-transparent border-[#c5a059] text-amber-300 font-bold"
                                                : "bg-transparent border-transparent text-stone-400 hover:text-stone-200"
                                        }`}
                                    >
                                        {chap.emoji} {chap.name.replace(/Capítulo [I|V|X]+: /, '')}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Active Chapter parchment panel */}
                        {(() => {
                            const currentChapterObj = CHAPTERS.find(c => c.id === activeCampaignChapterId) || CHAPTERS[0];
                            const chapterBosses = BOSSES.filter(b => b.chapterId === activeCampaignChapterId);
                            
                            return (
                                <div className="glass-medieval w-full rounded-2xl p-5 border border-[#c5a059]/20 bg-black/40 text-left space-y-5">
                                    <div className="flex justify-between items-center border-b border-[#c5a059]/10 pb-3">
                                        <div>
                                            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-amber-200">
                                                {currentChapterObj.name}
                                            </h3>
                                            <p className="text-[8px] text-stone-400 font-bold uppercase tracking-wider mt-0.5">
                                                {language.startsWith("pt") ? "Meta existencial: " : language.startsWith("es") ? "Meta existencial: " : "Existential goal: "}{currentChapterObj.focus}
                                            </p>
                                        </div>
                                        <span className="bg-[#c5a059]/10 border border-[#c5a059]/25 text-[#fde68a] text-[7.5px] uppercase tracking-wider px-2 py-0.5 rounded font-mono font-bold">
                                            {dict.conquering}
                                        </span>
                                    </div>

                                    <p className="font-body text-xs leading-relaxed text-stone-300 italic">
                                        "{currentChapterObj.description}"
                                    </p>

                                    {/* Bosses linear road map */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 select-none">
                                        {chapterBosses.map((boss) => {
                                            const defeated = isBossDefeated(boss.id);
                                            const isFinalBoss = boss.id.endsWith("inercia") || boss.id.endsWith("desanimo") || boss.id.endsWith("desorganizacao") || boss.id.endsWith("descuido");
                                            
                                            return (
                                                <div key={boss.id} className={`p-3 border rounded-xl flex flex-col justify-between text-left transition-all ${
                                                    defeated 
                                                        ? "bg-emerald-950/10 border-emerald-800/40 text-stone-400 opacity-70 shadow-inner" 
                                                        : isFinalBoss
                                                            ? "bg-black/60 border-amber-500/35 shadow-[0_0_15px_rgba(245,158,11,0.06)] ring-1 ring-amber-500/20"
                                                            : "bg-black/45 border-stone-850"
                                                }`}>
                                                    <div>
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className={`font-display text-[9.5px] font-bold uppercase tracking-wider ${isFinalBoss && !defeated ? "text-amber-300" : "text-[#eae3d5]"}`}>
                                                                {boss.name}
                                                            </span>
                                                            {defeated ? (
                                                                <span className="text-emerald-400 text-xs font-bold">✓</span>
                                                            ) : (
                                                                <span className={`text-[6.5px] font-bold uppercase px-1 py-0.2 rounded font-mono ${isFinalBoss ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-stone-900 text-stone-500"}`}>
                                                                    {isFinalBoss ? dict.chapter : dict.challenge}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[8px] text-stone-500 line-clamp-3 leading-relaxed mb-3">{boss.description}</p>
                                                    </div>
                                                    {!defeated ? (
                                                        <button
                                                            onClick={() => handleConfrontBoss(boss)}
                                                            className={`w-full py-1.5 rounded font-display text-[7.5px] uppercase tracking-widest transition-all cursor-pointer ${
                                                                isFinalBoss 
                                                                    ? "bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200" 
                                                                    : "bg-[#c5a059]/10 hover:bg-[#c5a059]/20 border border-[#c5a059]/40 text-stone-200"
                                                            }`}
                                                        >
                                                            {dict.confront}
                                                        </button>
                                                    ) : (
                                                        <span className="text-[7.5px] font-mono text-emerald-400 font-bold uppercase tracking-wider block text-center border border-emerald-850/50 py-0.5 rounded bg-emerald-950/20">
                                                            {dict.overcome}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Completed Crossing Seal scroll */}
                        {isSealingCompleted && (
                            <div className="glass-medieval w-full rounded-2xl p-6 border-2 border-dashed border-[#c5a059] bg-[#121118]/80 text-left space-y-4 animate-scale-up relative">
                                <div className="absolute top-3 right-3 text-stone-500 hover:text-stone-300 cursor-pointer" onClick={() => setIsSealingCompleted(false)}>
                                    <span className="material-icons text-base">close</span>
                                </div>
                                <div className="text-center space-y-1">
                                    <span className="text-4xl block">📜</span>
                                    <h4 className="font-display text-sm font-bold uppercase tracking-widest text-[#c5a059]">{dict.sealCompleted}</h4>
                                    <p className="text-[7.5px] uppercase tracking-widest text-stone-500 font-bold font-mono">{dict.codex}</p>
                                </div>

                                <div className="h-px bg-gradient-to-r from-transparent via-[#c5a059]/30 to-transparent my-3" />

                                <p className="font-body text-xs text-center text-stone-300 italic max-w-md mx-auto">
                                    {(() => {
                                        if (currentSealingChapter === "capitulo_1") {
                                            return language.startsWith("pt")
                                                ? '"Por meio deste pergaminho de expedição concluída, declara-se que o Peregrino confrontou com lucidez e coragem todos os demônios da inércia interna, conquistando passagem livre para o Capítulo II: O Domínio das Emoções."'
                                                : language.startsWith("es")
                                                    ? '"Por medio de este pergamino de expedición completada, se declara que el Peregrino confrontó con lucidez y coraje todos los demonios de la inercia interna, ganando paso libre al Capítulo II: El Dominio de las Emociones."'
                                                    : '"Through this scroll of completed expedition, it is declared that the Pilgrim confronted with lucidity and courage all the demons of internal inertia, gaining free passage to Chapter II: The Domain of Emotions."';
                                        }
                                        if (currentSealingChapter === "capitulo_2") {
                                            return language.startsWith("pt")
                                                ? '"Por meio deste pergaminho de expedição concluída, declara-se que o peregrino obteve equilíbrio interno frente às marés de suas paixões e impulsos, conquistando acesso e soberania para o Capítulo III: Governança de Recursos."'
                                                : language.startsWith("es")
                                                    ? '"Por medio de este pergamino de expedición completada, se declara que el peregrino obtuvo equilibrio interno frente a las mareas de sus pasiones e impulsos, ganando acceso y soberanía al Capítulo III: Gobernanza de Recursos."'
                                                    : '"Through this scroll of completed expedition, it is declared that the pilgrim obtained internal balance against the tides of their passions and impulses, gaining access and sovereignty to Chapter III: Governance of Resources."';
                                        }
                                        if (currentSealingChapter === "capitulo_3") {
                                            return language.startsWith("pt")
                                                ? '"Por meio deste pergaminho de expedição concluída, chancelamos a capacidade do peregrino de ordenar seu reino material com responsabilidade e pragmatismo, abrindo passagem para o Capítulo IV: Templo da Vitalidade."'
                                                : language.startsWith("es")
                                                    ? '"Por medio de este pergamino de expedición completada, sellamos la capacidad del peregrino para ordenar su reino material con responsabilidad y pragmatismo, abriendo el paso al Capítulo IV: Templo de la Vitalidad."'
                                                    : '"Through this scroll of completed expedition, we seal the pilgrim\'s capacity to order their material realm with responsibility and pragmatism, opening the passage to Chapter IV: Temple of Vitality."';
                                        }
                                        if (currentSealingChapter === "capitulo_4") {
                                            return language.startsWith("pt")
                                                ? '"Por meio deste pergaminho imperial, declara-se a vitória absoluta do Soberano sobre todas as inércias e letargias. Seu templo físico e mental encontra-se integrado e chancelado em sabedoria plena."'
                                                : language.startsWith("es")
                                                    ? '"Por medio de este pergamino imperial, se declara la victoria absoluta del Soberano sobre todas las inercias y letargos. Su templo físico y mental se encuentra integrado y sellado en plena sabiduría."'
                                                    : '"Through this imperial scroll, the absolute victory of the Sovereign over all inertias and lethargies is declared. Their physical and mental temple is integrated and sealed in full wisdom."';
                                        }
                                        return "";
                                    })()}
                                </p>

                                <div className="space-y-1.5 text-[9.5px] text-stone-400 font-mono max-w-sm mx-auto bg-black/40 p-3 rounded-lg border border-stone-850 mt-4">
                                    <div className="flex justify-between border-b border-stone-900 pb-0.5">
                                        <span>{dict.sealExpedition}</span>
                                        <span className="font-bold text-[#c5a059]">
                                            {(() => {
                                                const chap = CHAPTERS.find(c => c.id === currentSealingChapter);
                                                return chap ? chap.name : "Conclusão de Capítulo";
                                            })()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-b border-stone-900 pb-0.5">
                                        <span>{dict.conqueredChapters}</span>
                                        <span className="font-bold">{unlockedRegions.length} / {CHAPTERS.length} {dict.conqueredText}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-stone-900 pb-0.5">
                                        <span>{dict.relicsText}</span>
                                        <span className="font-bold">{relics.length} {dict.artifacts}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>{dict.accessSeal}</span>
                                        <span className="font-bold text-[#c5a059]">{currentCaste}</span>
                                    </div>
                                </div>

                                <div className="pt-3 text-center">
                                    <span className="text-2xl opacity-40 select-none block mb-1">⚜️</span>
                                    <p className="text-[7px] uppercase tracking-widest text-stone-500">{dict.imperialSeal}</p>
                                </div>
                            </div>
                        )}

                        {/* Defeated logs list */}
                        {bossLogs.length > 0 && (
                            <div className="space-y-2.5">
                                <span className="text-[10px] uppercase font-bold text-[#c5a059] block">{dict.diaryWins} ({bossLogs.length})</span>
                                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                    {bossLogs.map((log) => {
                                        const boss = BOSSES.find(b => b.id === log.bossId);
                                        return (
                                            <div key={log.id} className="p-3 border border-[#c5a059]/15 bg-[#1c1a24]/10 rounded-xl space-y-1.5 text-left">
                                                <div className="flex justify-between items-center text-[10px]">
                                                    <span className="font-display font-bold uppercase tracking-wider text-[#c5a059]">{dict.victory}{boss?.name || log.bossId}</span>
                                                    <span className="text-stone-500 font-mono text-[8px]">{log.date}</span>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[9px] leading-relaxed text-stone-400">
                                                    <div>
                                                        <span className="font-bold uppercase text-[7.5px] text-[#c5a059]/60 block mb-0.5">{dict.obstacleLabel}</span>
                                                        <p className="italic">"{log.context}"</p>
                                                    </div>
                                                    <div>
                                                        <span className="font-bold uppercase text-[7.5px] text-[#c5a059]/60 block mb-0.5">{dict.strategyLabel}</span>
                                                        <p className="italic">"{log.strategy}"</p>
                                                    </div>
                                                    <div>
                                                        <span className="font-bold uppercase text-[7.5px] text-[#c5a059]/60 block mb-0.5">{dict.outcomeLabel}</span>
                                                        <p className="italic text-emerald-300">"{log.outcome}"</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Relics Column (4 columns) */}
                    <div className="md:col-span-4 space-y-4">
                        <div className="border-b border-[#c5a059]/25 pb-2">
                            <h2 className="font-display text-lg uppercase tracking-wider text-[#c5a059] font-bold">{dict.relicsTitle}</h2>
                            <p className="text-[9px] text-stone-400 font-body">{dict.relicsDesc}</p>
                        </div>

                        {/* Relics list */}
                        <div className="space-y-3">
                            {relics.length === 0 ? (
                                <div className="p-6 border border-stone-900 bg-[#07070a]/40 rounded-2xl text-center">
                                    <span className="text-4xl block mb-2 opacity-35">🏆</span>
                                    <p className="text-[10px] text-stone-500 italic">{dict.noRelics}</p>
                                </div>
                            ) : (
                                relics.map((relic) => (
                                    <div key={relic.id} className="p-3 border border-[#c5a059]/25 bg-[#1c1a24]/30 rounded-xl space-y-2 text-left relative overflow-hidden shadow-md">
                                        <div className="absolute inset-0 bg-gradient-to-br from-[#c5a059]/5 via-transparent to-transparent pointer-events-none" />
                                        <div className="flex justify-between items-start">
                                            <span className="font-display text-xs font-bold text-amber-200">{relic.name}</span>
                                            <span className="text-[7.5px] text-stone-500 font-mono">{relic.dateObtained}</span>
                                        </div>
                                        <p className="text-[9px] leading-relaxed text-stone-400 italic">"{relic.description}"</p>
                                        <span className="text-[7.5px] uppercase font-bold text-[#c5a059]/75 block pt-1 border-t border-stone-900/60">{relic.origin}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </section>

                {/* Confront popup */}
                {confrontingBoss && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in text-left">
                        <form onSubmit={handleResolveConfront} className="glass-medieval w-full max-w-md rounded-2xl p-6 border-2 border-[#c5a059]/65 bg-[#0e0d12] relative space-y-4">
                            <button type="button" onClick={() => setConfrontingBoss(null)} className="absolute top-3 right-3 text-stone-500 hover:text-stone-300 cursor-pointer">
                                <span className="material-icons text-base">close</span>
                            </button>
                            <div className="flex items-center gap-3 border-b border-[#c5a059]/20 pb-3">
                                <span className="text-3xl">⚔️</span>
                                <div>
                                    <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#c5a059]">{dict.confronting}{confrontingBoss.name}</h3>
                                    <p className="text-[7.5px] text-stone-500 uppercase tracking-widest font-bold font-mono">{dict.realConfront}</p>
                                </div>
                            </div>
                            
                            <p className="text-[9px] text-stone-400 leading-relaxed italic">
                                "{dict.realConfrontDesc}"
                            </p>

                            <div className="space-y-3 text-xs">
                                <div>
                                    <label className="text-[8px] text-[#c5a059] uppercase font-bold block mb-1">{dict.question1}</label>
                                    <textarea 
                                        rows={2} 
                                        placeholder={dict.placeholder1} 
                                        value={battleContext}
                                        onChange={(e) => setBattleContext(e.target.value)}
                                        className="w-full bg-[#121118] border border-[#c5a059]/30 rounded p-2 text-xs text-stone-200 focus:outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[8px] text-[#c5a059] uppercase font-bold block mb-1">{dict.question2}</label>
                                    <textarea 
                                        rows={2} 
                                        placeholder={dict.placeholder2} 
                                        value={battleStrategy}
                                        onChange={(e) => setBattleStrategy(e.target.value)}
                                        className="w-full bg-[#121118] border border-[#c5a059]/30 rounded p-2 text-xs text-stone-200 focus:outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[8px] text-[#c5a059] uppercase font-bold block mb-1">{dict.question3}</label>
                                    <input 
                                        type="text" 
                                        placeholder={dict.placeholder3} 
                                        value={battleOutcome}
                                        onChange={(e) => setBattleOutcome(e.target.value)}
                                        className="w-full bg-[#121118] border border-[#c5a059]/30 rounded px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="pt-2 flex gap-2">
                                <button type="button" onClick={() => setConfrontingBoss(null)} className="flex-1 py-1.5 bg-black/60 border border-stone-850 hover:border-stone-700 text-stone-300 rounded font-display text-[9px] uppercase tracking-wider transition-all cursor-pointer">{dict.retreat}</button>
                                <button type="submit" className="flex-1 py-1.5 bg-[#c5a059]/15 hover:bg-[#c5a059]/25 border border-[#c5a059]/40 text-[#fde68a] rounded font-display text-[9px] uppercase tracking-wider transition-all cursor-pointer">{dict.recordVictory}</button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Footnotes navigation back to domains */}
                <div className="pt-4 flex justify-center">
                    <MedievalButton onClick={() => router.push("/space/dominios")} variant="secondary" className="text-[10px] py-3 px-12 tracking-widest uppercase">
                        ← Retornar aos Domínios
                    </MedievalButton>
                </div>
            </div>

            <InstitutionalFooter />
        </main>
    );
}
