// app/api/push/send/route.ts
// Endpoint interno para disparar notificações push para um ou todos os usuários
// Use: POST /api/push/send
// Body: { userId?: string, title: string, body: string, url?: string, tag?: string }

import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { auth } from '@/auth';
import { getPushSubscriptions, getAllPushSubscriptions, deletePushSubscription } from '@/app/lib/sovereignStore';

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

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (!configureVapidDetails()) {
      return NextResponse.json({ error: 'Push notifications are not configured.' }, { status: 503 });
    }

    const body = await req.json() as {
      userId?: string;      // Se omitido, envia para o próprio usuário autenticado
      title: string;
      body: string;
      icon?: string;
      url?: string;
      tag?: string;
      requireInteraction?: boolean;
    };

    if (!body.title || !body.body) {
      return NextResponse.json({ error: 'title e body são obrigatórios' }, { status: 400 });
    }

    const targetUserId = body.userId || session.user.id;
    const subscriptions = await getPushSubscriptions(targetUserId);

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nenhuma subscrição encontrada para este usuário.',
        sent: 0,
        failed: 0,
      });
    }

    const payload: PushPayload = {
      title: body.title,
      body: body.body,
      icon: body.icon || '/icons/nemosine-icon-192.png',
      url: body.url || '/',
      tag: body.tag || 'nemosine',
      requireInteraction: body.requireInteraction || false,
    };

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        )
      )
    );

    let sent = 0;
    let failed = 0;
    const expiredEndpoints: string[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled') {
        sent++;
      } else {
        failed++;
        const error = result.reason as any;
        // Status 410 Gone = subscription expirada/inválida → remover do banco
        if (error?.statusCode === 410 || error?.statusCode === 404) {
          expiredEndpoints.push(subscriptions[i].endpoint);
        }
        console.error('[push/send] Falha ao enviar para', subscriptions[i].endpoint, error?.message);
      }
    }

    // Limpeza automática de subscriptions expiradas
    await Promise.all(expiredEndpoints.map(deletePushSubscription));

    return NextResponse.json({
      success: true,
      sent,
      failed,
      cleaned: expiredEndpoints.length,
    });
  } catch (error) {
    console.error('[push/send] Erro interno:', error);
    return NextResponse.json({ error: 'Erro interno ao enviar notificação' }, { status: 500 });
  }
}
