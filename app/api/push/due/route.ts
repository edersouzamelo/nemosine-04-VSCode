import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { auth } from "@/auth";
import {
  AgendaNotificationCandidate,
  AgendaEvent,
  deletePushSubscription,
  getAgendaEvents,
  getAgendaNotificationCandidates,
  getPushSubscriptions,
  hasAgendaNotificationDelivery,
  markAgendaNotificationDelivered,
} from "@/app/lib/sovereignStore";

export const dynamic = "force-dynamic";

const LOCAL_TIME_ZONE = "America/Cuiaba";
const DUE_WINDOW_MS = 10 * 60 * 1000;

let vapidConfigured = false;

function configureVapidDetails() {
  if (vapidConfigured) return true;
  const subject = process.env.VAPID_SUBJECT?.trim();
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!subject || !publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

function localParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: LOCAL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value || "00";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
    date: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

function localDateFromParts(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hour || 0, minute || 0, 0, 0);
}

function currentLocalDate() {
  const now = localParts();
  return new Date(now.year, now.month - 1, now.day, now.hour, now.minute, now.second, 0);
}

function isSameOrBeforeDate(dateA: string, dateB: string) {
  return dateA.localeCompare(dateB) <= 0;
}

function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(year, month - 1, day);
  value.setDate(value.getDate() + days);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function addMonths(date: string, months: number) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(year, month - 1, day);
  value.setMonth(value.getMonth() + months);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function occurrenceForToday<T extends AgendaEvent>(event: T, today: string): T | null {
  if (!event.date || event.date > today) return null;
  if (!event.recurrence || event.recurrence === "none") {
    return event.date === today ? event : null;
  }
  if (event.recurrenceEnd && event.recurrenceEnd < today) return null;

  let current = event.date;
  let iterations = 0;
  while (isSameOrBeforeDate(current, today) && iterations < 370) {
    if (current === today) return { ...event, date: today };
    iterations++;
    if (event.recurrence === "daily") current = addDays(current, 1);
    else if (event.recurrence === "weekly") current = addDays(current, 7);
    else if (event.recurrence === "monthly") current = addMonths(current, 1);
    else if (event.recurrence === "yearly") current = addMonths(current, 12);
    else return null;
  }
  return null;
}

function dueAtForEvent(event: AgendaEvent) {
  const notificationMinutes = Number(event.notificationMinutes ?? 0);
  const [hour, minute] = (event.startTime || "00:00").split(":").map(Number);
  const dueAt = localDateFromParts(event.date, `${String(hour || 0).padStart(2, "0")}:${String(minute || 0).padStart(2, "0")}`);
  dueAt.setMinutes(dueAt.getMinutes() - notificationMinutes);
  return dueAt;
}

async function sendPushToUser(userId: string, payload: Record<string, unknown>) {
  const subscriptions = await getPushSubscriptions(userId);
  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
    )
  );

  let sent = 0;
  let failed = 0;
  const expiredEndpoints: string[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      sent++;
      return;
    }
    failed++;
    const error = result.reason as { statusCode?: number };
    if (error?.statusCode === 404 || error?.statusCode === 410) {
      expiredEndpoints.push(subscriptions[index].endpoint);
    }
  });

  await Promise.all(expiredEndpoints.map(deletePushSubscription));
  return { sent, failed, cleaned: expiredEndpoints.length };
}

async function processDueEvents(candidates: AgendaNotificationCandidate[]) {
  const now = currentLocalDate();
  const today = localParts().date;
  let checked = 0;
  let delivered = 0;
  let sent = 0;
  let failed = 0;

  for (const baseEvent of candidates) {
    if (baseEvent.completed) continue;
    const notificationMinutes = Number(baseEvent.notificationMinutes ?? -1);
    if (notificationMinutes < 0) continue;

    const event = occurrenceForToday(baseEvent, today);
    if (!event) continue;

    checked++;
    const dueAt = dueAtForEvent(event);
    const delta = now.getTime() - dueAt.getTime();
    if (delta < 0 || delta > DUE_WINDOW_MS) continue;

    const alreadyDelivered = await hasAgendaNotificationDelivery(baseEvent.userId, baseEvent.id, event.date, notificationMinutes);
    if (alreadyDelivered) continue;

    const body = notificationMinutes === 0
      ? `Seu compromisso "${event.title}" esta começando agora (${event.startTime || "00:00"}).`
      : `Seu compromisso "${event.title}" começa em ${notificationMinutes} minutos (${event.startTime || "00:00"}).`;

    const result = await sendPushToUser(baseEvent.userId, {
      title: `Lembrete: ${event.title}`,
      body,
      icon: "/icons/nemosine-icon-192.png",
      url: "/space/dominios",
      tag: `agenda-${baseEvent.id}-${event.date}-${notificationMinutes}`,
      requireInteraction: true,
    });

    sent += result.sent;
    failed += result.failed;
    if (result.sent > 0) {
      delivered++;
      await markAgendaNotificationDelivered(baseEvent.userId, baseEvent.id, event.date, notificationMinutes);
    }
  }

  return { ok: true, checked, delivered, sent, failed, now: now.toISOString(), today };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!configureVapidDetails()) {
    return NextResponse.json({ error: "Push notifications are not configured." }, { status: 503 });
  }

  const userId = session.user.id;
  const events = await getAgendaEvents(userId);
  const candidates = events.map((event) => ({ ...event, userId }));
  return NextResponse.json(await processDueEvents(candidates));
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization") || "";
  const isAuthorizedCron = cronSecret
    ? authHeader === `Bearer ${cronSecret}`
    : req.headers.get("user-agent")?.toLowerCase().includes("vercel-cron");

  if (!isAuthorizedCron) {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!configureVapidDetails()) {
      return NextResponse.json({ error: "Push notifications are not configured." }, { status: 503 });
    }
    const userId = session.user.id;
    const events = await getAgendaEvents(userId);
    return NextResponse.json(await processDueEvents(events.map((event) => ({ ...event, userId }))));
  }

  if (!configureVapidDetails()) {
    return NextResponse.json({ error: "Push notifications are not configured." }, { status: 503 });
  }
  const candidates = await getAgendaNotificationCandidates();
  return NextResponse.json(await processDueEvents(candidates));
}
