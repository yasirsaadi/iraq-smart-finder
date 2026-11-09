// ============================================================================
// حدود الإرسال لكل حساب (إضافة العروض والتقييمات)
// تُحفظ في قاعدة البيانات فتبقى سارية بعد إعادة تشغيل الخادم، وفي الذاكرة عند غيابها (للتطوير فقط).
// ============================================================================

export const ACTION_LIMITS = {
  offer: { max: 5, windowMs: 60 * 60 * 1000 },
  review: { max: 10, windowMs: 60 * 60 * 1000 }
};

export async function initActionLimitTable(sql) {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS dalal_iraq_action_log (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS dalal_iraq_action_log_idx ON dalal_iraq_action_log (user_id, action, created_at)`;
}

/**
 * @param {{ sql?: Function|null, limits?: typeof ACTION_LIMITS, now?: () => number }} options
 */
export function createActionLimiter({ sql = null, limits = ACTION_LIMITS, now = () => Date.now() } = {}) {
  const mem = new Map();

  return {
    /**
     * يسجّل المحاولة ويعيد true إذا تجاوز الحساب الحد خلال النافذة الزمنية.
     * عند تعذر الوصول لقاعدة البيانات يرمي خطأً، فلا يُسمح بإرسال لا يمكن احتسابه.
     */
    async isLimited(action, userId) {
      const { max, windowMs } = limits[action];
      const at = now();
      const since = new Date(at - windowMs);
      if (!sql) {
        const key = `${action}:${userId}`;
        const recent = (mem.get(key) || []).filter((t) => t > since.getTime());
        if (recent.length >= max) {
          mem.set(key, recent);
          return true;
        }
        recent.push(at);
        mem.set(key, recent);
        return false;
      }
      const rows = await sql`
        SELECT COUNT(*)::int AS n FROM dalal_iraq_action_log
        WHERE user_id = ${userId} AND action = ${action} AND created_at > ${since}
      `;
      if (Number(rows[0]?.n) >= max) return true;
      await sql`INSERT INTO dalal_iraq_action_log (user_id, action, created_at) VALUES (${userId}, ${action}, ${new Date(at)})`;
      // تنظيف دوري للسجلات القديمة
      if (Math.random() < 0.02) await sql`DELETE FROM dalal_iraq_action_log WHERE created_at < ${new Date(at - 2 * 86400000)}`.catch(() => {});
      return false;
    }
  };
}
