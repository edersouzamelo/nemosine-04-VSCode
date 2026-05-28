import { ImageResponse } from "next/og";
import { ENTITIES } from "@/app/data/entities";

export const runtime = "edge";
export const alt = "Nemosine";
export const size = {
    width: 1200,
    height: 630,
};
export const contentType = "image/png";

const appUrl = process.env.NEXT_PUBLIC_APP_URL
    || "https://nemosine-04-vs-code.vercel.app";

type Props = {
    params: Promise<{ id: string }>;
};

export default async function Image({ params }: Props) {
    const { id } = await params;
    const slug = decodeURIComponent(id);
    const entity = ENTITIES[slug];
    const name = entity?.name || "Nemosine";
    const phrase = entity?.phrase || "Sistema de Cartas das Personas de Nemosine Nous";
    const imagePath = entity?.landscapeImage || entity?.image || "/assets/nemosine-cube-v2.png";
    const imageUrl = new URL(imagePath, appUrl).toString();

    return new ImageResponse(
        (
            <div
                style={{
                    position: "relative",
                    display: "flex",
                    width: "100%",
                    height: "100%",
                    overflow: "hidden",
                    background: "#050507",
                    color: "#ead9b6",
                    fontFamily: "serif",
                }}
            >
                <img
                    src={imageUrl}
                    alt=""
                    width={1200}
                    height={630}
                    style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        background: "linear-gradient(90deg, rgba(5,5,7,0.92) 0%, rgba(5,5,7,0.62) 42%, rgba(5,5,7,0.14) 100%)",
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        left: 70,
                        top: 82,
                        display: "flex",
                        flexDirection: "column",
                        width: 610,
                    }}
                >
                    <div
                        style={{
                            color: "#c5a059",
                            fontSize: 30,
                            letterSpacing: 8,
                            textTransform: "uppercase",
                            marginBottom: 28,
                        }}
                    >
                        Nemosine
                    </div>
                    <div
                        style={{
                            color: "#f2dfad",
                            fontSize: 82,
                            lineHeight: 0.96,
                            textTransform: "uppercase",
                            textShadow: "0 4px 20px rgba(0,0,0,0.45)",
                        }}
                    >
                        {name}
                    </div>
                    <div
                        style={{
                            marginTop: 28,
                            width: 120,
                            height: 3,
                            background: "#c5a059",
                        }}
                    />
                    <div
                        style={{
                            marginTop: 26,
                            color: "#d8c7a5",
                            fontSize: 30,
                            lineHeight: 1.25,
                        }}
                    >
                        {phrase.slice(0, 150)}
                    </div>
                </div>
            </div>
        ),
        size
    );
}
