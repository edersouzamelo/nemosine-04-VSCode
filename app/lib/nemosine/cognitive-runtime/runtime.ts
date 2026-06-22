import { createUIMessageStream, createUIMessageStreamResponse, UIMessage } from "ai";
import { readCognitiveRuntimeConfig } from "./config";
import { isPrivateCognitiveRun } from "./privacy-policy";
import { runCognitiveRuntime } from "./orchestrator";
import { CognitiveRequest } from "./types";

export function createCognitiveRequest(input: {
  userId: string;
  threadId: string;
  personaId: string;
  placeId?: string | null;
  language: "pt-BR" | "es" | "en";
  userText: string;
  displayUserText: string;
  memoryScope: string;
  priorHistory?: CognitiveRequest["priorHistory"];
}) {
  const config = readCognitiveRuntimeConfig();
  const privateRun = isPrivateCognitiveRun(input.personaId, input.placeId);

  return {
    runId: crypto.randomUUID(),
    userId: input.userId,
    threadId: input.threadId,
    personaId: input.personaId,
    placeId: input.placeId,
    language: input.language,
    userText: input.userText,
    displayUserText: input.displayUserText,
    memoryScope: input.memoryScope,
    runtimeMode: config.mode,
    privateRun,
    startedAt: new Date(),
    priorHistory: input.priorHistory,
  } satisfies CognitiveRequest;
}

export async function executeCognitiveRuntime(request: CognitiveRequest) {
  return runCognitiveRuntime(request);
}

export function createPromotedUIMessageStreamResponse(input: {
  text: string;
  headers?: HeadersInit;
}) {
  const stream = createUIMessageStream<UIMessage>({
    execute({ writer }) {
      const textPartId = "text-1";
      writer.write({ type: "start" } as any);
      writer.write({ type: "start-step" } as any);
      writer.write({ type: "text-start", id: textPartId });
      writer.write({ type: "text-delta", id: textPartId, delta: input.text });
      writer.write({ type: "text-end", id: textPartId });
      writer.write({ type: "finish-step" } as any);
      writer.write({ type: "finish" } as any);
    },
  });

  return createUIMessageStreamResponse({
    stream,
    headers: input.headers,
  });
}
