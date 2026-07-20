"use client";

import {
  createPresenceContract,
  resolveEffectivePresenceContract,
} from "./core";
import type {
  ConversationPresenceContract,
  PresenceFlowType,
  PresenceScope,
} from "./types";

const PREFIX = "nemosine-presence-v1";

function safeKey(value?: string | null) {
  return (value || "none")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}-]+/gu, "-")
    .toLowerCase();
}

function storageKey(scope: PresenceScope, userId: string, personaId?: string | null, conversationId?: string | null) {
  const user = safeKey(userId);
  if (scope === "GLOBAL") return `${PREFIX}:contract:global:${user}`;
  if (scope === "PERSONA") return `${PREFIX}:contract:persona:${user}:${safeKey(personaId)}`;
  if (scope === "CONVERSATION") return `${PREFIX}:contract:conversation:${user}:${safeKey(conversationId)}:${safeKey(personaId)}`;
  return `${PREFIX}:contract:session:${user}:${safeKey(conversationId)}:${safeKey(personaId)}`;
}

function shownKey(userId: string, personaId: string, flowType: PresenceFlowType, conversationId?: string | null) {
  return `${PREFIX}:shown:${safeKey(userId)}:${safeKey(personaId)}:${flowType}:${safeKey(conversationId || "draft")}`;
}

function lastSeenKey(userId: string) {
  return `${PREFIX}:last-seen:${safeKey(userId)}`;
}

function pulseKey(userId: string, personaId: string) {
  return `${PREFIX}:last-pulse:${safeKey(userId)}:${safeKey(personaId)}`;
}

export function readPresenceContract(scope: PresenceScope, input: {
  userId: string;
  personaId?: string | null;
  conversationId?: string | null;
}) {
  const storage = scope === "SESSION" ? window.sessionStorage : window.localStorage;
  try {
    const raw = storage.getItem(storageKey(scope, input.userId, input.personaId, input.conversationId));
    return raw ? JSON.parse(raw) as ConversationPresenceContract : null;
  } catch {
    return null;
  }
}

export function writePresenceContract(contract: ConversationPresenceContract) {
  const key = storageKey(contract.scope, contract.userId, contract.personaId, contract.conversationId);
  const storage = contract.scope === "SESSION" ? window.sessionStorage : window.localStorage;
  storage.setItem(key, JSON.stringify({ ...contract, updatedAt: new Date().toISOString() }));
}

export function removePresenceContract(scope: PresenceScope, input: {
  userId: string;
  personaId?: string | null;
  conversationId?: string | null;
}) {
  const storage = scope === "SESSION" ? window.sessionStorage : window.localStorage;
  storage.removeItem(storageKey(scope, input.userId, input.personaId, input.conversationId));
}

export function markPresenceShownThisSession(userId: string, personaId: string, flowType: PresenceFlowType, conversationId?: string | null) {
  window.sessionStorage.setItem(shownKey(userId, personaId, flowType, conversationId), "1");
}

export function wasPresenceShownThisSession(userId: string, personaId: string, flowType: PresenceFlowType, conversationId?: string | null) {
  return Boolean(window.sessionStorage.getItem(shownKey(userId, personaId, flowType, conversationId)));
}

export function readAndUpdateLastSeen(userId: string) {
  const key = lastSeenKey(userId);
  const previous = window.localStorage.getItem(key);
  window.localStorage.setItem(key, new Date().toISOString());
  return previous;
}

export function markContinuityPulse(userId: string, personaId: string) {
  window.localStorage.setItem(pulseKey(userId, personaId), new Date().toISOString());
}

export function readContinuityPulse(userId: string, personaId: string) {
  return window.localStorage.getItem(pulseKey(userId, personaId));
}

export function resolveClientPresenceContract(input: {
  userId: string;
  personaId: string;
  conversationId?: string | null;
}) {
  const globalContract = readPresenceContract("GLOBAL", input);
  const personaContract = readPresenceContract("PERSONA", input);
  const conversationContract = input.conversationId ? readPresenceContract("CONVERSATION", input) : null;
  const sessionContract = readPresenceContract("SESSION", input);

  if (!globalContract && !personaContract && !conversationContract && !sessionContract) {
    return null;
  }

  const defaultContract = createPresenceContract({
    userId: input.userId,
    personaId: input.personaId,
    conversationId: input.conversationId || undefined,
    scope: "PERSONA",
  });

  return resolveEffectivePresenceContract({
    defaultContract,
    globalContract,
    personaContract,
    conversationContract,
    sessionContract,
  });
}

export function shouldShowContinuityPulse(input: {
  userId: string;
  personaId: string;
  contract: ConversationPresenceContract | null;
  previousSeenAt: string | null;
  staleDays: number;
  minDaysBetweenPulses: number;
}) {
  if (!input.contract) return false;
  const now = Date.now();
  const staleMs = Math.max(1, input.staleDays) * 86_400_000;
  const minPulseMs = Math.max(1, input.minDaysBetweenPulses) * 86_400_000;
  const updatedAt = Date.parse(input.contract.updatedAt || input.contract.createdAt);
  const previousSeenAt = input.previousSeenAt ? Date.parse(input.previousSeenAt) : now;
  const lastPulseAt = Date.parse(readContinuityPulse(input.userId, input.personaId) || "");

  return Number.isFinite(updatedAt)
    && now - updatedAt >= staleMs
    && Number.isFinite(previousSeenAt)
    && now - previousSeenAt >= staleMs
    && (!Number.isFinite(lastPulseAt) || now - lastPulseAt >= minPulseMs);
}
