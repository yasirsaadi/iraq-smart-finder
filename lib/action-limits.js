// ============================================================================
// حدود الإرسال لكل حساب (إضافة العروض والتقييمات)
// تُحفظ في قاعدة البيانات فتبقى سارية بعد إعادة تشغيل الخادم، وفي الذاكرة عند غيابها (للتطوير فقط).
// الاحتساب ذري: عدّاد لكل حساب ونوع إرسال ونافذة زمنية، يُزاد بعبارة واحدة مشروطة،
// فلا تتجاوز الطلبات المتزامنة الحد.
// ============================================================================

export const ACTION_LIMITS = {
  offer: { max: 5, windowMs: 60 * 60 * 1000 },
  review: { max: 10, windowMs: 60 * 60 * 1000 }
};

export async function initActionLimitTable(sql) {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS dalal_iraq_action_counters (
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      window_start TIMESTAMPTZ NOT NULL,
      count INTEGER NOT NULL,
      PRIMARY KEY (user_id, action, window_start)
    );
  `;
}

/**
 * @param {{ sql?: Function|null, limits?: typeof ACTION_LIMITS, now?: () => number }} options
 */
export function createActionLimiter({ sql = null, limits = ACTION_LIMITS, now = () => Date.now() } = {}) {
  const mem = new Map();

  return {
    /**
     * يحجز محاولة واحدة ويعيد true إذا بلغ الحساب الحد في النافذة الحالية (فلا يُحجز شيء).
     * عند تعذر الوصول لقاعدة البيانات يرمي خطأً، فلا يُسمح بإرسال لا يمكن احتسابه.
     */
    async isLimited(action, userId) {
      const { max, windowMs } = limits[action];
      const at = now();
      const windowStart = new Date(Math.floor(at / windowMs) * windowMs);
      if (!sql) {
        const key = `${action}:${userId}:${windowStart.getTime()}`;
        const used = mem.get(key) || 0;
        if (used >= max) return true;
        mem.set(key, used + 1);
        return false;
      }
      // عبارة واحدة: تُنشئ العدّاد أو تزيده فقط إن كان دون الحد. قفل الصف يمنع تجاوز الحد بالتزامن.
      const rows = await sql`
        INSERT INTO dalal_iraq_action_counters AS c (user_id, action, window_start, count)
        VALUES (${userId}, ${action}, ${windowStart}, 1)
        ON CONFLICT (user_id, action, window_start) DO UPDATE SET count = c.count + 1
        WHERE c.count < ${max}
        RETURNING count
      `;
      // تنظيف دوري للعدّادات القديمة
      if (Math.random() < 0.02) {
        await sql`DELETE FROM dalal_iraq_action_counters WHERE window_start < ${new Date(at - 2 * 86400000)}`.catch(() => {});
      }
      return rows.length === 0;
    }
  };
}
