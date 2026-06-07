import type { Metadata } from "next";
import { ENTITIES } from "@/app/data/entities";

const appUrl = process.env.NEXT_PUBLIC_APP_URL
    || "https://app.nemosinenous.com";

type AgentLayoutProps = {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: AgentLayoutProps): Promise<Metadata> {
    const { id } = await params;
    const slug = decodeURIComponent(id);
    const entity = ENTITIES[slug];

    if (!entity) {
        return {
            title: "Nemosine | Entidade não encontrada",
            description: "Esta entidade permanece oculta no Sistema Nemosine.",
        };
    }

    let filename = entity.name;
    if (entity.name === "Bobo da Corte") filename = "Bobo";
    if (entity.name === "Confessor 2.0") filename = "Confessor";
    if (entity.name === "Orquestrador-Arquiteto") filename = "Orquestrador";

    const image = new URL(`/api/og/persona/${encodeURIComponent(slug)}`, appUrl).toString();
    const title = `${entity.name} | Nemosine`;
    const description = entity.phrase || "Persona do Sistema Nemosine Nous.";
    const url = new URL(`/agents/${encodeURIComponent(slug)}`, appUrl).toString();

    return {
        title,
        description,
        alternates: {
            canonical: url,
        },
        openGraph: {
            title,
            description,
            url,
            siteName: "Nemosine",
            type: "website",
            images: [
                {
                    url: image,
                    width: 1200,
                    height: 630,
                    type: "image/png",
                    alt: entity.name,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [image],
        },
    };
}

export default function AgentLayout({ children }: AgentLayoutProps) {
    return children;
}
