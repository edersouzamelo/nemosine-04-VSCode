import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchUpcomingGoogleCalendarEvents } from "@/app/lib/googleCalendar";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const events = await fetchUpcomingGoogleCalendarEvents(session.user.id);
    return NextResponse.json({ events });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao consultar a Agenda Google" },
      { status: 400 }
    );
  }
}
