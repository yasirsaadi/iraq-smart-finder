// عامل خدمة رادار أسعار العراق: يعرض إشعارات المتصفح ويفتح الصفحة المناسبة عند الضغط عليها.
// لا يخزّن صفحات الموقع ولا يعترض طلباته؛ وظيفته الإشعارات فقط.

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'رادار أسعار العراق', body: event.data ? event.data.text() : '' };
  }
  const title = String(data.title || 'رادار أسعار العراق').slice(0, 140);
  const url = typeof data.url === 'string' && data.url.startsWith('/') ? data.url : '/';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: String(data.body || '').slice(0, 400),
      dir: 'rtl',
      lang: 'ar',
      tag: data.tag || 'radar',
      renotify: true,
      data: { url }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (new URL(w.url).origin === self.location.origin) {
          w.navigate(target);
          return w.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
