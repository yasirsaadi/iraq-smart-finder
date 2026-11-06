// ============================================================================
// اقتصاديات البحث: ذاكرة نتائج مشتركة دائمة + حد استخدام عادل + سقف رصيد يومي
// - الذاكرة المشتركة: نتيجة البحث تُدفع مرة واحدة ويستفيد منها كل الزوار حتى انتهاء صلاحيتها.
// - حد الاستخدام العادل: عدد عمليات البحث *الجديدة* لكل متصفح شهرياً (النتائج المحفوظة بلا حد).
// - سقف الرصيد اليومي: حماية مالية للموقع كله مهما كان عدد الزوار أو محاولات التلاعب.
// تعمل مع قاعدة نيون، وتعود إلى الذاكرة المحلية عند غيابها.
// ============================================================================

export const DEFAULTS = Object.freeze({
  cacheTtlHours: 12,
  dailyCreditBudget: 200,
  freeNewSearchesPerMonth: 30,
  subscriberNewSearchesPerMonth: 100,
  refreshTopN: 25,
  creditsPerSearch: 4 // 3 استعلامات بحث + 1 بحث صور
});

function intFromEnv(name, fallback, { min = 0, max = 1_000_000 } = {}) {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}

export function readEconomicsConfig() {
  return {
    cacheTtlHours: intFromEnv('CACHE_TTL_HOURS', DEFAULTS.cacheTtlHours, { min: 1, max: 168 }),
    dailyCreditBudget: intFromEnv('DAILY_CREDIT_BUDGET', DEFAULTS.dailyCreditBudget),
    freeNewSearchesPerMonth: intFromEnv('FREE_NEW_SEARCHES_PER_MONTH', DEFAULTS.freeNewSearchesPerMonth),
    subscriberNewSearchesPerMonth: intFromEnv('SUBSCRIBER_NEW_SEARCHES_PER_MONTH', DEFAULTS.subscriberNewSearchesPerMonth),
    refreshTopN: intFromEnv('REFRESH_TOP_N', DEFAULTS.refreshTopN, { max: 2000 }),
    creditsPerSearch: DEFAULTS.creditsPerSearch
  };
}

const monthKey = (d = new Date()) => d.toISOString().slice(0, 7);
const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);

export async function initSearchStoreTables(sql) {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS dalal_iraq_search_cache (
      cache_key TEXT PRIMARY KEY,
      query TEXT NOT NULL,
      governorate TEXT NOT NULL,
      section TEXT NOT NULL DEFAULT 'all',
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      hits INTEGER NOT NULL DEFAULT 0
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS dalal_iraq_search_cache_expires_idx ON dalal_iraq_search_cache (expires_at)`;
  await sql`
    CREATE TABLE IF NOT EXISTS dalal_iraq_credit_usage (
      day DATE PRIMARY KEY,
      credits INTEGER NOT NULL DEFAULT 0
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS dalal_iraq_search_quota (
      subject TEXT NOT NULL,
      period TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (subject, period)
    );
  `;
}

/**
 * @param {{ sql?: Function|null, config?: ReturnType<typeof readEconomicsConfig> }} options
 */
export function createSearchStore({ sql = null, config = readEconomicsConfig() } = {}) {
  const ttlMs = config.cacheTtlHours * 3600 * 1000;
  const memCache = new Map(); // key -> { createdAt, value }
  const memCredits = new Map(); // day -> credits
  const memQuota = new Map(); // subject|period -> count
  const MEM_CACHE_MAX = 500;

  function memPut(key, value, createdAt) {
    if (memCache.size >= MEM_CACHE_MAX) memCache.delete(memCache.keys().next().value);
    memCache.set(key, { createdAt, value });
  }

  return {
    config,

    /** يعيد { value, cachedAt } إن وُجدت نتيجة صالحة، وإلا null. */
    async getCached(key) {
      const mem = memCache.get(key);
      if (mem && Date.now() - mem.createdAt < ttlMs) return { value: mem.value, cachedAt: new Date(mem.createdAt).toISOString() };
      if (mem) memCache.delete(key);
      if (!sql) return null;
      try {
        const rows = await sql`
          UPDATE dalal_iraq_search_cache SET hits = hits + 1
          WHERE cache_key = ${key} AND expires_at > NOW()
          RETURNING payload, created_at
        `;
        if (rows.length === 0) return null;
        const createdAt = new Date(rows[0].created_at).getTime();
        memPut(key, rows[0].payload, createdAt);
        return { value: rows[0].payload, cachedAt: new Date(createdAt).toISOString() };
      } catch (err) {
        console.warn('search cache read failed:', err.message);
        return null;
      }
    },

    /** عمر النتيجة المحفوظة بالمللي ثانية، أو null إن لم توجد أو انتهت. */
    async cachedAgeMs(key) {
      const hit = await this.getCached(key);
      return hit ? Date.now() - Date.parse(hit.cachedAt) : null;
    },

    async setCached(key, value, meta) {
      const createdAt = Date.now();
      memPut(key, value, createdAt);
      if (!sql) return;
      try {
        await sql`
          INSERT INTO dalal_iraq_search_cache (cache_key, query, governorate, section, payload, created_at, expires_at)
          VALUES (${key}, ${meta.query}, ${meta.governorate}, ${meta.section}, ${JSON.stringify(value)},
                  NOW(), NOW() + make_interval(hours => ${config.cacheTtlHours}::int))
          ON CONFLICT (cache_key) DO UPDATE
          SET payload = EXCLUDED.payload, created_at = NOW(), expires_at = EXCLUDED.expires_at
        `;
        // تنظيف خفيف للنتائج المنتهية منذ أكثر من يوم
        if (Math.random() < 0.05) await sql`DELETE FROM dalal_iraq_search_cache WHERE expires_at < NOW() - INTERVAL '1 day'`;
      } catch (err) {
        console.warn('search cache write failed:', err.message);
      }
    },

    /**
     * يحجز رصيداً من سقف اليوم بشكل ذري. يعيد true إذا سُمح.
     * @param {number} credits
     * @param {{ enforce?: boolean }} [opts] enforce=false يسجّل دون منع (للتحديث الليلي المحدود أصلاً).
     */
    async reserveCredits(credits, { enforce = true } = {}) {
      const budget = enforce ? config.dailyCreditBudget : 1_000_000_000;
      if (!sql) {
        const day = dayKey();
        const used = memCredits.get(day) || 0;
        if (used + credits > budget) return false;
        memCredits.set(day, used + credits);
        return true;
      }
      try {
        if (credits > budget) return false;
        const rows = await sql`
          INSERT INTO dalal_iraq_credit_usage AS u (day, credits) VALUES (CURRENT_DATE, ${credits})
          ON CONFLICT (day) DO UPDATE SET credits = u.credits + EXCLUDED.credits
          WHERE u.credits + EXCLUDED.credits <= ${budget}
          RETURNING credits
        `;
        return rows.length > 0;
      } catch (err) {
        console.warn('credit reservation failed:', err.message);
        return false; // عند الشك لا نصرف مالاً
      }
    },

    async refundCredits(credits) {
      if (!sql) {
        const day = dayKey();
        memCredits.set(day, Math.max(0, (memCredits.get(day) || 0) - credits));
        return;
      }
      try {
        await sql`UPDATE dalal_iraq_credit_usage SET credits = GREATEST(0, credits - ${credits}) WHERE day = CURRENT_DATE`;
      } catch {}
    },

    async creditsUsedToday() {
      if (!sql) return memCredits.get(dayKey()) || 0;
      try {
        const rows = await sql`SELECT credits FROM dalal_iraq_credit_usage WHERE day = CURRENT_DATE`;
        return rows.length ? Number(rows[0].credits) : 0;
      } catch {
        return null;
      }
    },

    /** يستهلك عملية بحث جديدة من حصة الشهر بشكل ذري. يعيد { allowed, used, limit }. */
    async consumeNewSearch(subject, limit) {
      const period = monthKey();
      if (limit <= 0) return { allowed: false, used: 0, limit };
      if (!sql) {
        const k = `${subject}|${period}`;
        const used = memQuota.get(k) || 0;
        if (used >= limit) return { allowed: false, used, limit };
        memQuota.set(k, used + 1);
        return { allowed: true, used: used + 1, limit };
      }
      try {
        const rows = await sql`
          INSERT INTO dalal_iraq_search_quota AS q (subject, period, count) VALUES (${subject}, ${period}, 1)
          ON CONFLICT (subject, period) DO UPDATE SET count = q.count + 1
          WHERE q.count < ${limit}
          RETURNING count
        `;
        if (rows.length === 0) return { allowed: false, used: limit, limit };
        return { allowed: true, used: Number(rows[0].count), limit };
      } catch (err) {
        console.warn('quota check failed:', err.message);
        return { allowed: false, used: null, limit };
      }
    },

    async releaseNewSearch(subject) {
      const period = monthKey();
      if (!sql) {
        const k = `${subject}|${period}`;
        memQuota.set(k, Math.max(0, (memQuota.get(k) || 0) - 1));
        return;
      }
      try {
        await sql`UPDATE dalal_iraq_search_quota SET count = GREATEST(0, count - 1) WHERE subject = ${subject} AND period = ${period}`;
      } catch {}
    },

    /** أكثر عمليات البحث طلباً خلال 30 يوماً، للتحديث الليلي. */
    async popularSearches(limit) {
      if (!sql || limit <= 0) return [];
      try {
        return await sql`
          SELECT LOWER(TRIM(query)) AS query, governorate, COALESCE(section, 'all') AS section, COUNT(*)::int AS times
          FROM dalal_iraq_searches
          WHERE created_at > NOW() - INTERVAL '30 days' AND LENGTH(TRIM(query)) >= 2
          GROUP BY 1, 2, 3
          ORDER BY times DESC, MAX(created_at) DESC
          LIMIT ${limit}
        `;
      } catch (err) {
        console.warn('popular searches query failed:', err.message);
        return [];
      }
    }
  };
}

/** هوية الزائر لحد الاستخدام: معرّف مجهول من المتصفح، وإلا عنوان الشبكة. */
export function quotaSubjectFor(req) {
  const id = String(req.get?.('x-client-id') || '').trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return `c:${id.toLowerCase()}`;
  return `ip:${req.ip || 'unknown'}`;
}
