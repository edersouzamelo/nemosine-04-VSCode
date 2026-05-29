// app/api/push/register/route.ts
// Endpoint para registrar (salvar) a push subscription do browser do usuário

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { savePushSubscription } from '@/app/lib/sovereignStore';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { subscription } = body as {
      subscription: {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
    };

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: 'Subscription inválida' }, { status: 400 });
    }

    const userAgent = req.headers.get('user-agent') ?? undefined;

    await savePushSubscription(session.user.id, {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent,
    });

    return NextResponse.json({ success: true, message: 'Subscrição registrada com sucesso.' });
  } catch (error) {
    console.error('[push/register] Erro:', error);
    return NextResponse.json({ error: 'Erro interno ao salvar subscrição' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { endpoint } = await req.json();
    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint obrigatório' }, { status: 400 });
    }

    const { deletePushSubscription } = await import('@/app/lib/sovereignStore');
    await deletePushSubscription(endpoint);

    return NextResponse.json({ success: true, message: 'Subscrição removida.' });
  } catch (error) {
    console.error('[push/register] DELETE error:', error);
    return NextResponse.json({ error: 'Erro ao remover subscrição' }, { status: 500 });
  }
}
