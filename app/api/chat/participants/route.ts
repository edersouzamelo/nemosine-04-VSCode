import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ENTITIES } from "@/app/data/entities";
import { isAdminEmail } from "@/app/lib/accessControl";
import {
  createCollectiveThreadWithHost,
  getCollectiveSchemaStatus,
  getParticipantSnapshot,
  invitePersona,
  isMissingCollectiveSchemaError,
  isMultiPersonaEnabled,
  removePersona,
  setPersonaMuted,
} from "@/app/lib/nemosine/conversation_participants";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

async function getAuthenticatedUserId() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return { id, email: session.user?.email };
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
    const user = await getAuthenticatedUserId();
    if (!user) return unauthorized();
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ enabled: false, participants: [], guestCount: 0 });
    }

    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get("threadId");
    const hostPersonaId = searchParams.get("personaId");
    const placeId = searchParams.get("placeId");
    const enabled = isMultiPersonaEnabled();

    if (!enabled) {
      return NextResponse.json({ enabled: false, participants: [], guestCount: 0 });
    }
    if (threadId) {
      const schemaStatus = await getCollectiveSchemaStatus();
      if (!schemaStatus.ready) {
        return NextResponse.json({
          enabled: false,
          migrationRequired: true,
          missing: schemaStatus.missing,
          participants: [],
          guestCount: 0,
          message: "A arquitetura multi-persona esta no codigo, mas a migracao do banco ainda nao foi aplicada.",
        });
      }
      const snapshot = await getParticipantSnapshot(user.id, threadId);
      return NextResponse.json({ enabled: true, ...snapshot });
    }

    if (!isValidPersona(hostPersonaId) || !isValidPlace(placeId)) {
      return NextResponse.json({ error: "Invalid host or place" }, { status: 400 });
    }
    const schemaStatus = await getCollectiveSchemaStatus();
    if (!schemaStatus.ready) {
      return NextResponse.json({
        enabled: false,
        migrationRequired: true,
        missing: schemaStatus.missing,
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
          muted: false,
          joinedAt: new Date().toISOString(),
          leftAt: null,
        }] : [],
        message: "A arquitetura multi-persona esta no codigo, mas a migracao do banco ainda nao foi aplicada.",
      });
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
        muted: false,
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
    const user = await getAuthenticatedUserId();
    if (!user) return unauthorized();
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: "DEV_ONLY" }, { status: 403 });
    }
    if (!isMultiPersonaEnabled()) {
      return NextResponse.json({ error: "Multi-persona disabled" }, { status: 403 });
    }
    const schemaStatus = await getCollectiveSchemaStatus();
    if (!schemaStatus.ready) {
      return NextResponse.json({
        error: "MIGRATION_REQUIRED",
        message: "A migracao multi-persona ainda nao foi aplicada no banco.",
        missing: schemaStatus.missing,
      }, { status: 409 });
    }

    const { action, threadId, personaId, hostPersonaId, placeId } = await request.json();
    if (!["invite", "remove", "mute", "unmute"].includes(action) || !isValidPersona(personaId)) {
      return NextResponse.json({ error: "Invalid participant action" }, { status: 400 });
    }

    let activeThreadId = typeof threadId === "string" && threadId.trim() ? threadId : "";

    if (!activeThreadId) {
      if (action !== "invite" || !isValidPersona(hostPersonaId) || !isValidPlace(placeId)) {
        return NextResponse.json({ error: "Thread required" }, { status: 400 });
      }
      const thread = await createCollectiveThreadWithHost({
        userId: user.id,
        hostPersonaId,
        placeId: placeId || null,
        title: `Conselho: ${hostPersonaId}`,
      });
      activeThreadId = thread.id;
    }

    if (action === "invite") {
      await invitePersona(user.id, activeThreadId, personaId);
    } else if (action === "remove") {
      await removePersona(user.id, activeThreadId, personaId);
    } else {
      await setPersonaMuted(user.id, activeThreadId, personaId, action === "mute");
    }

    const snapshot = await getParticipantSnapshot(user.id, activeThreadId);
    return NextResponse.json({ enabled: true, ...snapshot });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    if (isMissingCollectiveSchemaError(error)) {
      return NextResponse.json({
        error: "MIGRATION_REQUIRED",
        message: "A migracao multi-persona ainda nao foi aplicada no banco.",
      }, { status: 409 });
    }
    const status = [
      "INVALID_PERSONA",
      "HOST_ALREADY_PRESENT",
      "HOST_CANNOT_BE_REMOVED",
      "PERSONA_ALREADY_PRESENT",
      "PERSONA_NOT_PRESENT",
      "PARTICIPANT_LIMIT_EXCEEDED",
      "THREAD_NOT_FOUND",
    ].some((code) => message.startsWith(code)) ? 400 : 500;
    if (message.startsWith("MUTING_MIGRATION_REQUIRED")) {
      return NextResponse.json({
        error: "MIGRATION_REQUIRED",
        message: "A migracao de silenciamento ainda nao foi aplicada no banco.",
      }, { status: 409 });
    }
    console.error("[API/Chat Participants POST] Error:", { errorCode: message.split(":")[0] });
    return NextResponse.json({ error: message }, { status });
  }
}
