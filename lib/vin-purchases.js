// ============================================================================
// شراء تقرير تاريخ السيارة: حفظ التقارير المدفوعة، ورصيد التعويض، وتسليم التقرير بعد الدفع.
// قاعدة الإنصاف: إن لم توجد بيانات للشاصي لدى المزوّد، يحصل المستخدم على رصيد تقرير لشاصي آخر.
// ============================================================================

import { fetchVinHistory } from './vin-history.js';

export async function initVinPurchaseTables(sql) {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS dalal_iraq_vin_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      vin TEXT NOT NULL,
      payment_id TEXT,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS dalal_iraq_vin_history_payment_uidx ON dalal_iraq_vin_history (payment_id) WHERE payment_id IS NOT NULL`;
  await sql`
    CREATE TABLE IF NOT EXISTS dalal_iraq_vin_credits (
      user_id INTEGER PRIMARY KEY,
      credits INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
}

export function createVinPurchaseStore({ sql = null } = {}) {
  const mem = { reports: [], credits: new Map(), nextId: 1 };
  return {
    async saveReport(userId, vin, paymentId, data) {
      if (!sql) {
        const existing = paymentId && mem.reports.find((r) => r.paymentId === paymentId);
        if (existing) return existing.id;
        const r = { id: mem.nextId++, userId, vin, paymentId, data, createdAt: new Date().toISOString() };
        mem.reports.push(r);
        return r.id;
      }
      const rows = await sql`
        INSERT INTO dalal_iraq_vin_history (user_id, vin, payment_id, data) VALUES (${userId}, ${vin}, ${paymentId}, ${JSON.stringify(data)})
        ON CONFLICT (payment_id) WHERE payment_id IS NOT NULL DO UPDATE SET data = EXCLUDED.data
        RETURNING id
      `;
      return rows[0].id;
    },
    async reportFor(userId, id) {
      if (!sql) return mem.reports.find((r) => r.id === Number(id) && r.userId === userId) || null;
      const rows = await sql`SELECT id, vin, data, created_at AS "createdAt" FROM dalal_iraq_vin_history WHERE id = ${Number(id)} AND user_id = ${userId}`;
      return rows[0] || null;
    },
    async reportForPayment(paymentId) {
      if (!sql) return mem.reports.find((r) => r.paymentId === paymentId) || null;
      const rows = await sql`SELECT id, user_id AS "userId", vin FROM dalal_iraq_vin_history WHERE payment_id = ${paymentId}`;
      return rows[0] || null;
    },
    async listFor(userId) {
      if (!sql) return mem.reports.filter((r) => r.userId === userId).map(({ id, vin, createdAt }) => ({ id, vin, createdAt }));
      return sql`SELECT id, vin, created_at AS "createdAt" FROM dalal_iraq_vin_history WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 50`;
    },
    async addCredit(userId) {
      if (!sql) {
        mem.credits.set(userId, (mem.credits.get(userId) || 0) + 1);
        return;
      }
      await sql`
        INSERT INTO dalal_iraq_vin_credits (user_id, credits) VALUES (${userId}, 1)
        ON CONFLICT (user_id) DO UPDATE SET credits = dalal_iraq_vin_credits.credits + 1, updated_at = NOW()
      `;
    },
    /** يستهلك رصيداً واحداً ذرياً. true إن وُجد رصيد. */
    async useCredit(userId) {
      if (!sql) {
        const n = mem.credits.get(userId) || 0;
        if (n < 1) return false;
        mem.credits.set(userId, n - 1);
        return true;
      }
      const rows = await sql`UPDATE dalal_iraq_vin_credits SET credits = credits - 1, updated_at = NOW() WHERE user_id = ${userId} AND credits > 0 RETURNING credits`;
      return rows.length > 0;
    },
    async creditsOf(userId) {
      if (!sql) return mem.credits.get(userId) || 0;
      const rows = await sql`SELECT credits FROM dalal_iraq_vin_credits WHERE user_id = ${userId}`;
      return rows[0]?.credits || 0;
    }
  };
}

/**
 * يسلّم تقريراً مدفوعاً (بدفعة أو برصيد). عند غياب البيانات: رصيد بديل.
 * عند عطل مؤقت لدى المزوّد يرمي خطأً كي يُعاد المحاولة (الدفعة محفوظة كناجحة ولا تضيع).
 * @returns {{ status: 'ready'|'no_data', reportId?: number }}
 */
export async function fulfillVinReport({ userId, vin, paymentId = null }, { cfg, store, notifier, fetchImpl, siteUrl = '' }) {
  if (paymentId) {
    const done = await store.reportForPayment(paymentId);
    if (done) return { status: 'ready', reportId: done.id };
  }
  const history = await fetchVinHistory(cfg, vin, { fetchImpl });
  if (!history.found) {
    await store.addCredit(userId);
    await notifier
      ?.notifyUser(userId, {
        kind: 'vin_report',
        title: 'لا توجد بيانات لهذا الشاصي — أضفنا لك رصيد تقرير',
        body: `السجل الأمريكي لا يحوي تاريخاً للشاصي ${vin}. لم يضع مالك: يمكنك استخدام الرصيد لفحص شاصي آخر.`,
        url: '/'
      })
      .catch(() => {});
    return { status: 'no_data' };
  }
  const reportId = await store.saveReport(userId, vin, paymentId, history);
  await notifier
    ?.notifyUser(userId, {
      kind: 'vin_report',
      title: `تقرير تاريخ السيارة جاهز: ${vin}`,
      body: history.summary.headline,
      url: `${siteUrl}/vin-report/${reportId}`
    })
    .catch(() => {});
  return { status: 'ready', reportId };
}
