// ============================================================================
// الحسابات والجلسات والمدفوعات والاشتراكات
// - الحساب مرتبط بحساب غوغل (sub) وليس برقم هاتف يمكن انتحاله.
// - الجلسة: رمز عشوائي في كعكة HttpOnly، ويُحفظ في قاعدة البيانات بصيغة مشفرة (SHA-256) فقط.
// - الاشتراك لا يُفعَّل إلا بعد تأكيد الخادم لنجاح الدفع، ومرة واحدة لكل عملية دفع.
// ============================================================================

import { randomBytes, createHash } from 'node:crypto';

export const SESSION_COOKIE = 'radar_session';
export const SESSION_DAYS = 90;

const sha256 = (v) => createHash('sha256').update(String(v)).digest('hex');

export function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i <= 0) continue;
    const k = part.slice(0, i).trim();
    if (!k || k in out) continue;
    try {
      out[k] = decodeURIComponent(part.slice(i + 1).trim());
    } catch {
      out[k] = part.slice(i + 1).trim();
    }
  }
  return out;
}

export function sessionCookieHeader(token, { secure, maxAgeDays = SESSION_DAYS } = {}) {
  const attrs = [`${SESSION_COOKIE}=${encodeURIComponent(token)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeDays * 86400}`];
  if (secure) attrs.push('Secure');
  return attrs.join('; ');
}

export function clearSessionCookieHeader({ secure } = {}) {
  return [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0', ...(secure ? ['Secure'] : [])].join('; ');
}

export async function initAccountTables(sql) {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS dalal_iraq_users (
      id SERIAL PRIMARY KEY,
      google_sub TEXT UNIQUE NOT NULL,
      email TEXT,
      name TEXT,
      picture TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS dalal_iraq_sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES dalal_iraq_users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS dalal_iraq_payments (
      id SERIAL PRIMARY KEY,
      request_id TEXT UNIQUE NOT NULL,
      payment_id TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL REFERENCES dalal_iraq_users(id),
      provider TEXT NOT NULL DEFAULT 'qicard',
      amount_iqd INTEGER NOT NULL,
      plan_days INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'CREATED',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      confirmed_at TIMESTAMPTZ
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS dalal_iraq_user_subscriptions (
      user_id INTEGER PRIMARY KEY REFERENCES dalal_iraq_users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      last_payment_id TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  // تفضيلات المستخدم: سعر صرف 100 دولار الذي يختاره يبقى محفوظاً في حسابه
  await sql`ALTER TABLE dalal_iraq_users ADD COLUMN IF NOT EXISTS exchange_rate_100usd INTEGER`;
  if (Math.random() < 0.2) await sql`DELETE FROM dalal_iraq_sessions WHERE expires_at < NOW()`;
}

/** مخزن الحسابات. يعمل مع نيون، وفي الذاكرة عند غيابها (للتطوير والاختبار فقط). */
export function createAccountStore({ sql = null } = {}) {
  const mem = { users: new Map(), sessions: new Map(), payments: new Map(), subs: new Map(), nextUserId: 1 };

  return {
    async upsertGoogleUser(profile) {
      if (!sql) {
        let user = [...mem.users.values()].find((u) => u.google_sub === profile.sub);
        if (!user) {
          user = { id: mem.nextUserId++, google_sub: profile.sub };
          mem.users.set(user.id, user);
        }
        Object.assign(user, { email: profile.email, name: profile.name, picture: profile.picture });
        return user;
      }
      const rows = await sql`
        INSERT INTO dalal_iraq_users (google_sub, email, name, picture)
        VALUES (${profile.sub}, ${profile.email}, ${profile.name}, ${profile.picture})
        ON CONFLICT (google_sub) DO UPDATE
        SET email = EXCLUDED.email, name = EXCLUDED.name, picture = EXCLUDED.picture, last_login_at = NOW()
        RETURNING id, google_sub, email, name, picture, exchange_rate_100usd
      `;
      return rows[0];
    },

    async createSession(userId) {
      const token = randomBytes(32).toString('base64url');
      const hash = sha256(token);
      if (!sql) {
        mem.sessions.set(hash, { userId, expiresAt: Date.now() + SESSION_DAYS * 86400000 });
        return token;
      }
      await sql`
        INSERT INTO dalal_iraq_sessions (token_hash, user_id, expires_at)
        VALUES (${hash}, ${userId}, NOW() + make_interval(days => ${SESSION_DAYS}::int))
      `;
      return token;
    },

    async userForSessionToken(token) {
      if (!token || token.length > 200) return null;
      const hash = sha256(token);
      if (!sql) {
        const s = mem.sessions.get(hash);
        if (!s || s.expiresAt < Date.now()) return null;
        return mem.users.get(s.userId) || null;
      }
      const rows = await sql`
        SELECT u.id, u.google_sub, u.email, u.name, u.picture, u.exchange_rate_100usd
        FROM dalal_iraq_sessions s JOIN dalal_iraq_users u ON u.id = s.user_id
        WHERE s.token_hash = ${hash} AND s.expires_at > NOW()
        LIMIT 1
      `;
      return rows[0] || null;
    },

    /** يحفظ سعر صرف 100 دولار المفضل للمستخدم (null يعيده للافتراضي). */
    async setExchangeRate(userId, rate) {
      const value = rate === null ? null : Math.round(Number(rate));
      if (!sql) {
        const u = mem.users.get(userId);
        if (u) u.exchange_rate_100usd = value;
        return Boolean(u);
      }
      const rows = await sql`UPDATE dalal_iraq_users SET exchange_rate_100usd = ${value} WHERE id = ${userId} RETURNING id`;
      return rows.length > 0;
    },

    async deleteSession(token) {
      if (!token) return;
      const hash = sha256(token);
      if (!sql) {
        mem.sessions.delete(hash);
        return;
      }
      await sql`DELETE FROM dalal_iraq_sessions WHERE token_hash = ${hash}`;
    },

    async subscriptionFor(userId) {
      if (!sql) {
        const s = mem.subs.get(userId);
        return s && s.expiresAt > Date.now() ? { active: true, expiresAt: new Date(s.expiresAt).toISOString() } : { active: false };
      }
      const rows = await sql`
        SELECT expires_at, GREATEST(0, CEIL(EXTRACT(EPOCH FROM (expires_at - NOW())) / 86400.0))::int AS days_remaining
        FROM dalal_iraq_user_subscriptions WHERE user_id = ${userId} LIMIT 1
      `;
      if (!rows.length || rows[0].days_remaining <= 0) return { active: false };
      return { active: true, expiresAt: new Date(rows[0].expires_at).toISOString(), daysRemaining: rows[0].days_remaining };
    },

    async recordPayment({ requestId, paymentId, userId, amountIQD, planDays }) {
      if (!sql) {
        mem.payments.set(paymentId, { requestId, paymentId, userId, amountIQD, planDays, status: 'CREATED' });
        return;
      }
      await sql`
        INSERT INTO dalal_iraq_payments (request_id, payment_id, user_id, amount_iqd, plan_days)
        VALUES (${requestId}, ${paymentId}, ${userId}, ${amountIQD}, ${planDays})
      `;
    },

    async paymentById(paymentId) {
      if (!sql) return mem.payments.get(paymentId) || null;
      const rows = await sql`
        SELECT request_id AS "requestId", payment_id AS "paymentId", user_id AS "userId",
               amount_iqd AS "amountIQD", plan_days AS "planDays", status
        FROM dalal_iraq_payments WHERE payment_id = ${paymentId} LIMIT 1
      `;
      return rows[0] || null;
    },

    async latestPendingPaymentFor(userId) {
      if (!sql) return [...mem.payments.values()].reverse().find((p) => p.userId === userId && p.status === 'CREATED') || null;
      const rows = await sql`
        SELECT payment_id AS "paymentId" FROM dalal_iraq_payments
        WHERE user_id = ${userId} AND status = 'CREATED' AND created_at > NOW() - INTERVAL '1 day'
        ORDER BY created_at DESC LIMIT 1
      `;
      return rows[0] || null;
    },

    async markPaymentFailed(paymentId, status) {
      if (!sql) {
        const p = mem.payments.get(paymentId);
        if (p && p.status === 'CREATED') p.status = status;
        return;
      }
      await sql`UPDATE dalal_iraq_payments SET status = ${status} WHERE payment_id = ${paymentId} AND status = 'CREATED'`;
    },

    /**
     * يفعّل الاشتراك مرة واحدة فقط لكل عملية دفع ناجحة (حماية من تكرار الإشعارات).
     * التجديد يُضاف إلى المدة المتبقية ولا يضيعها.
     * @returns {Promise<boolean>} true إذا تم التفعيل الآن، false إذا كان مفعلاً سابقاً.
     */
    async activateFromPayment(paymentId) {
      if (!sql) {
        const p = mem.payments.get(paymentId);
        if (!p || p.status === 'SUCCESS') return false;
        p.status = 'SUCCESS';
        const current = mem.subs.get(p.userId);
        const base = current && current.expiresAt > Date.now() ? current.expiresAt : Date.now();
        mem.subs.set(p.userId, { expiresAt: base + p.planDays * 86400000 });
        return true;
      }
      const claimed = await sql`
        UPDATE dalal_iraq_payments SET status = 'SUCCESS', confirmed_at = NOW()
        WHERE payment_id = ${paymentId} AND status <> 'SUCCESS'
        RETURNING user_id, plan_days
      `;
      if (!claimed.length) return false;
      const { user_id: userId, plan_days: planDays } = claimed[0];
      await sql`
        INSERT INTO dalal_iraq_user_subscriptions (user_id, expires_at, last_payment_id)
        VALUES (${userId}, NOW() + make_interval(days => ${planDays}::int), ${paymentId})
        ON CONFLICT (user_id) DO UPDATE
        SET expires_at = GREATEST(dalal_iraq_user_subscriptions.expires_at, NOW()) + make_interval(days => ${planDays}::int),
            last_payment_id = EXCLUDED.last_payment_id,
            updated_at = NOW()
      `;
      return true;
    }
  };
}
