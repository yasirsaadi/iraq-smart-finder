// ============================================================================
// الإشعارات: داخل الموقع + إشعارات المتصفح (Web Push) — بلا ميتا ولا رسائل نصية مدفوعة
// - مفاتيح VAPID تُولَّد تلقائياً مرة واحدة وتُحفظ في قاعدة البيانات (أو تُقرأ من متغيرات البيئة إن وُجدت).
// - كل إشعار يُحفظ في صندوق المستخدم داخل الموقع، ويُرسل لمتصفحاته المشتركة إن وافق عليها.
// ============================================================================

import webpush from 'web-push';
import { safeHttpUrl, cleanPlainText } from '../shared/sanitize.js';

export async function initNotificationTables(sql) {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS dalal_iraq_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS dalal_iraq_notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES dalal_iraq_users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      read_at TIMESTAMPTZ
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS dalal_iraq_notifications_user_idx ON dalal_iraq_notifications (user_id, created_at DESC)`;
  await sql`
    CREATE TABLE IF NOT EXISTS dalal_iraq_push_subscriptions (
      endpoint TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES dalal_iraq_users(id) ON DELETE CASCADE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
}

/** يتحقق من بنية اشتراك Web Push القادم من المتصفح. */
export function validatePushSubscription(sub) {
  const endpoint = safeHttpUrl(sub?.endpoint);
  const p256dh = String(sub?.keys?.p256dh || '');
  const auth = String(sub?.keys?.auth || '');
  if (!endpoint || !endpoint.startsWith('https://')) return null;
  if (!/^[A-Za-z0-9_-]{40,200}$/.test(p256dh) || !/^[A-Za-z0-9_-]{8,64}$/.test(auth)) return null;
  return { endpoint, keys: { p256dh, auth } };
}

/**
 * @param {{ sql?: Function|null, subject?: string }} options
 */
export function createNotifier({ sql = null, subject = 'mailto:yasir.s81@gmail.com' } = {}) {
  const mem = { inbox: [], pushSubs: new Map(), nextId: 1 };
  let vapid = null;

  async function loadVapidKeys() {
    if (vapid) return vapid;
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      vapid = { publicKey: process.env.VAPID_PUBLIC_KEY.trim(), privateKey: process.env.VAPID_PRIVATE_KEY.trim() };
    } else if (sql) {
      const rows = await sql`SELECT value FROM dalal_iraq_settings WHERE key = 'vapid_keys'`;
      if (rows.length) {
        vapid = JSON.parse(rows[0].value);
      } else {
        const generated = webpush.generateVAPIDKeys();
        // ON CONFLICT: إذا ولّدت نسختان من الخادم المفاتيح معاً، تبقى الأولى فقط
        await sql`INSERT INTO dalal_iraq_settings (key, value) VALUES ('vapid_keys', ${JSON.stringify(generated)}) ON CONFLICT (key) DO NOTHING`;
        const again = await sql`SELECT value FROM dalal_iraq_settings WHERE key = 'vapid_keys'`;
        vapid = JSON.parse(again[0].value);
      }
    } else {
      vapid = webpush.generateVAPIDKeys(); // بلا قاعدة بيانات: مفاتيح مؤقتة للتطوير فقط
    }
    webpush.setVapidDetails(subject, vapid.publicKey, vapid.privateKey);
    return vapid;
  }

  async function sendPushToUser(userId, payload) {
    let subs;
    if (sql) {
      subs = await sql`SELECT endpoint, p256dh, auth FROM dalal_iraq_push_subscriptions WHERE user_id = ${userId}`;
    } else {
      subs = [...mem.pushSubs.values()].filter((s) => s.userId === userId).map((s) => ({ endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth }));
    }
    if (!subs.length) return { sent: 0 };
    await loadVapidKeys();
    let sent = 0;
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 86400, urgency: 'normal' });
          sent += 1;
        } catch (err) {
          // 404/410: ألغى المستخدم الإذن أو انتهى الاشتراك، فنحذفه
          if (err.statusCode === 404 || err.statusCode === 410) {
            if (sql) await sql`DELETE FROM dalal_iraq_push_subscriptions WHERE endpoint = ${s.endpoint}`.catch(() => {});
            else mem.pushSubs.delete(s.endpoint);
          } else {
            console.warn('web push failed:', err.statusCode || err.message);
          }
        }
      })
    );
    return { sent };
  }

  return {
    async publicKey() {
      return (await loadVapidKeys()).publicKey;
    },

    async savePushSubscription(userId, subscription) {
      const sub = validatePushSubscription(subscription);
      if (!sub) return false;
      if (!sql) {
        mem.pushSubs.set(sub.endpoint, { userId, ...sub });
        return true;
      }
      await sql`
        INSERT INTO dalal_iraq_push_subscriptions (endpoint, user_id, p256dh, auth)
        VALUES (${sub.endpoint}, ${userId}, ${sub.keys.p256dh}, ${sub.keys.auth})
        ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth
      `;
      return true;
    },

    async removePushSubscription(userId, endpoint) {
      if (!sql) {
        const s = mem.pushSubs.get(endpoint);
        if (s && s.userId === userId) mem.pushSubs.delete(endpoint);
        return;
      }
      await sql`DELETE FROM dalal_iraq_push_subscriptions WHERE endpoint = ${String(endpoint || '')} AND user_id = ${userId}`;
    },

    /** يحفظ الإشعار في صندوق المستخدم ويرسله لمتصفحاته المشتركة. */
    async notifyUser(userId, { kind, title, body = '', url = '/' }) {
      const clean = {
        kind: cleanPlainText(kind, 40),
        title: cleanPlainText(title, 140),
        body: cleanPlainText(body, 400),
        url: url && url.startsWith('/') ? url.slice(0, 500) : safeHttpUrl(url) || '/'
      };
      if (sql) {
        await sql`INSERT INTO dalal_iraq_notifications (user_id, kind, title, body, url) VALUES (${userId}, ${clean.kind}, ${clean.title}, ${clean.body}, ${clean.url})`;
      } else {
        mem.inbox.push({ id: mem.nextId++, userId, ...clean, createdAt: new Date().toISOString(), readAt: null });
      }
      const push = await sendPushToUser(userId, { title: clean.title, body: clean.body, url: clean.url, tag: clean.kind }).catch((err) => {
        console.warn('push dispatch failed:', err.message);
        return { sent: 0 };
      });
      return { stored: true, pushed: push.sent };
    },

    async inbox(userId, limit = 30) {
      if (!sql) {
        const items = mem.inbox.filter((n) => n.userId === userId).slice(-limit).reverse();
        return { items, unread: items.filter((n) => !n.readAt).length };
      }
      const items = await sql`
        SELECT id, kind, title, body, url, created_at AS "createdAt", read_at AS "readAt"
        FROM dalal_iraq_notifications WHERE user_id = ${userId}
        ORDER BY created_at DESC LIMIT ${limit}
      `;
      const unread = await sql`SELECT COUNT(*)::int AS n FROM dalal_iraq_notifications WHERE user_id = ${userId} AND read_at IS NULL`;
      return { items, unread: unread[0].n };
    },

    async markAllRead(userId) {
      if (!sql) {
        for (const n of mem.inbox) if (n.userId === userId && !n.readAt) n.readAt = new Date().toISOString();
        return;
      }
      await sql`UPDATE dalal_iraq_notifications SET read_at = NOW() WHERE user_id = ${userId} AND read_at IS NULL`;
    }
  };
}
