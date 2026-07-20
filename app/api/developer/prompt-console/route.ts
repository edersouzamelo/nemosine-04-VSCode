import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/app/lib/accessControl";
import {
  readPromptConsoleState,
  restoreDefaultPromptStackPreset,
  savePromptStackPresetCopy,
  updateActivePromptStackPreset,
  getPromptConsoleRuntime,
} from "@/app/lib/nemosine/prompt_console_store";
import {
  buildV1StablePromptStack,
  normalizePromptStackPreset,
  type PromptStackPreset,
} from "@/app/lib/nemosine/prompt_stack";
import { selectResponseDepthProfile } from "@/app/lib/nemosine/response_depth";

export const dynamic = "force-dynamic";

async function requireDev() {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (!isAdminEmail(session.user.email)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "DEV_ONLY" }, { status: 403 }),
    };
  }
  return {
    ok: true as const,
    session,
  };
}

function buildPreview(preset: PromptStackPreset, input?: { personaId?: string; userText?: string }) {
  const personaId = input?.personaId || "Aprovisionador";
  const userText = input?.userText || "Preciso ajustar dieta e treino; qual persona deveria cuidar de cada parte?";
  const depthProfile = selectResponseDepthProfile({
    userText,
    priorHistory: [],
    personaId,
    presenceContract: null,
  });
  return buildV1StablePromptStack({
    userId: "dev-preview",
    personaId,
    memoryScope: personaId,
    userText,
    language: "pt-BR",
    priorHistory: [],
    activeThreadId: "dev-preview-thread",
    presenceContract: null,
    depthProfile,
    memories: [],
    episodes: [],
    topics: [],
    preset,
    overlayStatus: {
      overlayEnabled: true,
      overlayShouldAppear: true,
      overlayAppeared: false,
      userConfirmed: false,
    },
  });
}

export async function GET() {
  const access = await requireDev();
  if (!access.ok) return access.response;

  const state = readPromptConsoleState();
  const runtime = getPromptConsoleRuntime({ userEmail: access.session.user?.email || null });
  const preview = buildPreview(state.activePreset);

  return NextResponse.json({
    ...state,
    runtime,
    preview,
  }, {
    headers: { "cache-control": "no-store" },
  });
}

export async function PUT(request: Request) {
  const access = await requireDev();
  if (!access.ok) return access.response;

  const body = await request.json().catch(() => null) as { preset?: PromptStackPreset } | null;
  if (!body?.preset) {
    return NextResponse.json({ error: "Missing preset" }, { status: 400 });
  }
  const preset = updateActivePromptStackPreset(normalizePromptStackPreset(body.preset));
  const preview = buildPreview(preset);
  return NextResponse.json({ preset, preview });
}

export async function POST(request: Request) {
  const access = await requireDev();
  if (!access.ok) return access.response;

  const body = await request.json().catch(() => ({})) as {
    action?: "restore" | "save-copy" | "preview";
    preset?: PromptStackPreset;
    personaId?: string;
    userText?: string;
  };
  const action = body.action || "preview";

  if (action === "restore") {
    const preset = restoreDefaultPromptStackPreset();
    return NextResponse.json({ preset, preview: buildPreview(preset, body) });
  }

  if (action === "save-copy") {
    const source = normalizePromptStackPreset(body.preset || readPromptConsoleState().activePreset);
    const saved = savePromptStackPresetCopy(source);
    return NextResponse.json({ saved, savedPresets: readPromptConsoleState().savedPresets });
  }

  const preset = normalizePromptStackPreset(body.preset || readPromptConsoleState().activePreset);
  return NextResponse.json({ preview: buildPreview(preset, body), preset });
}
