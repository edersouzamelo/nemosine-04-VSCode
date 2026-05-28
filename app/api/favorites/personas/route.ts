import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getFavoritePersonas, setFavoritePersona } from "@/app/lib/userFeatureStore";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const favorites = await getFavoritePersonas(session.user.id);
  return NextResponse.json({ favorites });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const personaId = String(body.personaId || "").trim();
    const favorite = Boolean(body.favorite);

    if (!personaId) {
      return NextResponse.json({ error: "Persona inválida" }, { status: 400 });
    }

    const result = await setFavoritePersona(session.user.id, personaId, favorite);
    const favorites = await getFavoritePersonas(session.user.id);
    return NextResponse.json({ ...result, favorites });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível atualizar favoritos" },
      { status: 400 }
    );
  }
}
