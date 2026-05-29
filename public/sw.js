// ============================================================
// Nemosine Nous — Service Worker (Push Notifications)
// ============================================================

const CACHE_NAME = 'nemosine-v1';

// ── Install ──────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Instalado');
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativado');
  event.waitUntil(clients.claim());
});

// ── Push ─────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Nemosine', body: event.data.text() };
  }

  const title = data.title || 'Nemosine Nous';
  const options = {
    body: data.body || 'Você tem uma nova mensagem.',
    icon: data.icon || '/icons/nemosine-icon-192.png',
    badge: '/icons/nemosine-icon-192.png',
    tag: data.tag || 'nemosine-notification',
    data: {
      url: data.url || '/',
    },
    // Vibrar 200ms, pausa 100ms, vibrar 200ms
    vibrate: [200, 100, 200],
    requireInteraction: data.requireInteraction || false,
    silent: false,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ── Notification Click ────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se já há uma janela aberta, focar nela e navegar
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Caso contrário, abrir nova janela
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ── Push Subscription Change ──────────────────────────────────
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Subscription expirada, renovando…');
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: self.VAPID_PUBLIC_KEY,
    }).then((subscription) => {
      return fetch('/api/push/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      });
    })
  );
});
