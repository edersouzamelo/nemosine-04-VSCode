import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CALENDAR_READONLY_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  htmlLink?: string;
}

export async function getGoogleCalendarStatus(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
    select: {
      scope: true,
      access_token: true,
      refresh_token: true,
      expires_at: true,
    },
  });

  const hasCalendarScope = account?.scope?.split(" ").includes(CALENDAR_READONLY_SCOPE) ?? false;
  const hasToken = Boolean(account?.access_token || account?.refresh_token);

  return {
    connected: hasCalendarScope && hasToken,
    hasGoogleAccount: Boolean(account),
    hasCalendarScope,
    expiresAt: account?.expires_at ?? null,
  };
}

export async function fetchUpcomingGoogleCalendarEvents(userId: string): Promise<GoogleCalendarEvent[]> {
  const accessToken = await getGoogleCalendarAccessToken(userId);
  const params = new URLSearchParams({
    maxResults: "10",
    orderBy: "startTime",
    singleEvents: "true",
    timeMin: new Date().toISOString(),
  });

  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Não foi possível ler a Agenda Google. ${errorText}`);
  }

  const data = await response.json();
  return (data.items ?? []).map((event: any) => ({
    id: event.id,
    summary: event.summary ?? "Compromisso sem título",
    start: event.start?.dateTime ?? event.start?.date ?? "",
    end: event.end?.dateTime ?? event.end?.date ?? "",
    htmlLink: event.htmlLink,
  }));
}

async function getGoogleCalendarAccessToken(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });

  if (!account?.scope?.split(" ").includes(CALENDAR_READONLY_SCOPE)) {
    throw new Error("A Agenda Google ainda não foi autorizada.");
  }

  const now = Math.floor(Date.now() / 1000);
  if (account.access_token && account.expires_at && account.expires_at > now + 60) {
    return account.access_token;
  }

  if (!account.refresh_token) {
    if (account.access_token) return account.access_token;
    throw new Error("É preciso reconectar o Google para renovar a autorização.");
  }

  const refreshed = await refreshGoogleAccessToken(account.refresh_token);
  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: refreshed.access_token,
      expires_at: refreshed.expires_at,
      scope: refreshed.scope ?? account.scope,
      token_type: refreshed.token_type ?? account.token_type,
    },
  });

  return refreshed.access_token;
}

async function refreshGoogleAccessToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID ?? "",
      client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Não foi possível renovar a autorização do Google. ${errorText}`);
  }

  const data = await response.json();
  return {
    access_token: data.access_token as string,
    expires_at: Math.floor(Date.now() / 1000) + Number(data.expires_in ?? 3600),
    scope: data.scope as string | undefined,
    token_type: data.token_type as string | undefined,
  };
}
