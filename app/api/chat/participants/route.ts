import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ENTITIES } from "@/app/data/entities";
import {
  createCollectiveThreadWithHost,
  getParticipantSnapshot,
  invitePersona,
  isMultiPersonaEnabled,
  removePersona,
} from "@/app/lib/nemosine/conversation_participants";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

async function getAuthenticatedUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

function isValidPlace(placeId?: string | null) {
  if (!placeId) return true;
  return Object.values(ENTITIES).some((entity) => entity.type === "place" && entity.name === placeId);
}

function isValidPersona(personaId?: string | null) {
  if (!personaId) return false;
  return Object.values(ENTITIES).some((entity) => entity.type === "persona" && entity.name === personaId);
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorized();

    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get("threadId");
    const hostPersonaId = searchParams.get("personaId");
    const placeId = searchParams.get("placeId");
    const enabled = isMultiPersonaEnabled();

    if (!enabled) {
      return NextResponse.json({ enabled: false, participants: [], guestCount: 0 });
    }

    if (threadId) {
      const snapshot = await getParticipantSnapshot(userId, threadId);
      return NextResponse.json({ enabled: true, ...snapshot });
    }

    if (!isValidPersona(hostPersonaId) || !isValidPlace(placeId)) {
      return NextResponse.json({ error: "Invalid host or place" }, { status: 400 });
    }

    return NextResponse.json({
      enabled: true,
      threadId: null,
      hostPersonaId,
      placeId: placeId || null,
      mode: "SINGLE",
      guestCount: 0,
      participants: hostPersonaId ? [{
        id: "pending-host",
        threadId: null,
        personaId: hostPersonaId,
        role: "HOST",
        active: true,
        joinedAt: new Date().toISOString(),
        leftAt: null,
      }] : [],
    });
  } catch (error) {
    console.error("[API/Chat Participants GET] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorized();
    if (!isMultiPersonaEnabled()) {
      return NextResponse.json({ error: "Multi-persona disabled" }, { status: 403 });
    }

    const { action, threadId, personaId, hostPersonaId, placeId } = await request.json();
    if ((action !== "invite" && action !== "remove") || !isValidPersona(personaId)) {
      return NextResponse.json({ error: "Invalid participant action" }, { status: 400 });
    }

    let activeThreadId = typeof threadId === "string" && threadId.trim() ? threadId : "";

    if (!activeThreadId) {
      if (action !== "invite" || !isValidPersona(hostPersonaId) || !isValidPlace(placeId)) {
        return NextResponse.json({ error: "Thread required" }, { status: 400 });
      }
      const thread = await createCollectiveThreadWithHost({
        userId,
        hostPersonaId,
        placeId: placeId || null,
        title: `Conselho: ${hostPersonaId}`,
      });
      activeThreadId = thread.id;
    }

    if (action === "invite") {
      await invitePersona(userId, activeThreadId, personaId);
    } else {
      await removePersona(userId, activeThreadId, personaId);
    }

    const snapshot = await getParticipantSnapshot(userId, activeThreadId);
    return NextResponse.json({ enabled: true, ...snapshot });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = [
      "INVALID_PERSONA",
      "HOST_ALREADY_PRESENT",
      "HOST_CANNOT_BE_REMOVED",
      "PERSONA_ALREADY_PRESENT",
      "PERSONA_NOT_PRESENT",
      "PARTICIPANT_LIMIT_EXCEEDED",
      "THREAD_NOT_FOUND",
    ].some((code) => message.startsWith(code)) ? 400 : 500;
    console.error("[API/Chat Participants POST] Error:", { errorCode: message.split(":")[0] });
    return NextResponse.json({ error: message }, { status });
  }
}
