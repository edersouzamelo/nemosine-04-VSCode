// app/lib/pushUtils.ts
// Utilitários client-side para:
//   1. Registrar o Service Worker
//   2. Subscrever o usuário para push notifications
//   3. Cancelar a subscrição
//   4. Verificar o status atual da permissão/subscription

'use client';

/** Converte a chave pública VAPID (base64url) para Uint8Array */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type PushStatus =
  | 'unsupported'     // Browser não suporta
  | 'denied'          // Usuário bloqueou
  | 'subscribed'      // Subscrito e registrado
  | 'unsubscribed'    // Permissão granted mas sem subscription
  | 'default';        // Ainda não pediu permissão

/**
 * Verifica se o browser suporta push notifications e Service Workers
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Retorna o status atual de push do browser
 */
export async function getPushStatus(): Promise<PushStatus> {
  if (!isPushSupported()) return 'unsupported';

  const permission = Notification.permission;
  if (permission === 'denied') return 'denied';

  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!registration) return 'default';

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) return 'subscribed';
    if (permission === 'granted') return 'unsubscribed';
    return 'default';
  } catch {
    return 'default';
  }
}

/**
 * Registra o Service Worker e subscreve o usuário para push.
 * Envia a subscription para /api/push/register.
 * @returns true se subscrito com sucesso, false caso contrário
 */
export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) {
    console.warn('[Push] Browser não suporta push notifications');
    return false;
  }

  try {
    // 1. Registrar (ou obter registro existente) do SW
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    // Aguardar ativação
    await navigator.serviceWorker.ready;

    // 2. Pedir permissão ao usuário
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[Push] Permissão negada pelo usuário');
      return false;
    }

    // 3. Verificar se já existe subscription
    let subscription = await registration.pushManager.getSubscription();

    // 4. Se não existe, criar nova
    if (!subscription) {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error('[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY não configurada');
        return false;
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    // 5. Enviar subscription para o servidor
    const response = await fetch('/api/push/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('[Push] Falha ao registrar no servidor:', err);
      return false;
    }

    console.log('[Push] Subscrito com sucesso:', subscription.endpoint);
    return true;
  } catch (error) {
    console.error('[Push] Erro ao subscrever:', error);
    return false;
  }
}

/**
 * Cancela a subscription de push e avisa o servidor.
 * @returns true se dessubscrito com sucesso
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!registration) return true;

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return true;

    const endpoint = subscription.endpoint;

    // 1. Cancelar no browser
    await subscription.unsubscribe();

    // 2. Remover do servidor
    await fetch('/api/push/register', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    });

    console.log('[Push] Dessubscrito com sucesso');
    return true;
  } catch (error) {
    console.error('[Push] Erro ao dessubscrever:', error);
    return false;
  }
}

/**
 * Dispara uma notificação push para o próprio usuário autenticado (via servidor).
 * Usado para testes ou notificações self-triggered.
 */
export async function sendSelfPush(payload: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}): Promise<boolean> {
  try {
    const response = await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    return data.success && data.sent > 0;
  } catch (error) {
    console.error('[Push] Erro ao disparar push self:', error);
    return false;
  }
}
