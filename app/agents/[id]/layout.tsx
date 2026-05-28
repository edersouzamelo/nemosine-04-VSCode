import type { Metadata } from "next";
import { ENTITIES } from "@/app/data/entities";

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

    const image = entity.landscapeImage || entity.image || "/assets/nemosine-cube-v2.png";
    const title = `${entity.name} | Nemosine`;
    const description = entity.phrase || "Persona do Sistema Nemosine Nous.";
    const url = `/agents/${encodeURIComponent(slug)}`;

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
