import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/app/lib/accessControl";
import { createDeveloperMessage, getDeveloperMessages } from "@/app/lib/userFeatureStore";

export async function GET() {
  const session = await auth();

  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const messages = await getDeveloperMessages();
  return NextResponse.json({ messages });
}

export async function POST(request: Request) {
  const session = await auth();

  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const subject = String(body.subject || "").trim();
    const message = String(body.message || "").trim();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Preencha nome, email e mensagem." }, { status: 400 });
    }

    await createDeveloperMessage({
      name,
      email,
      subject,
      message,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível enviar a mensagem." }, { status: 500 });
  }
}
