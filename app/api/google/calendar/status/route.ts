import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGoogleCalendarStatus } from "@/app/lib/googleCalendar";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const status = await getGoogleCalendarStatus(session.user.id);
  return NextResponse.json(status);
}
