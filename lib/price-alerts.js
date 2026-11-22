// ============================================================================
// رادار الأسعار: تنبيهات مرتبطة بحساب المستخدم
// - الفحص يتم على النتائج المحفوظة أولاً (مجاناً)، والتحديث الليلي يكمل الباقي بحد أقصى معلوم.
// - لا يُرسل تنبيه عن السعر الشاذ (غالباً خطأ استخراج) ولا عن العرض نفسه مرتين.
// ============================================================================

import { isRelevantToQuery, computePriceStats, normalizeForMatch } from '../shared/price-engine.js';
import { cleanPlainText } from '../shared/sanitize.js';

export const MAX_ALERTS_PER_USER = 10;
export const MAX_ALERTS_PER_SUBSCRIBER = 50;

export async function initAlertColumns(sql) {
  if (!sql) return;
  await sql`ALTER TABLE dalal_iraq_alerts ADD COLUMN IF NOT EXISTS user_id INTEGER`;
  await sql`ALTER TABLE dalal_iraq_alerts ADD COLUMN IF NOT EXISTS section TEXT DEFAULT 'all'`;
  await sql`ALTER TABLE dalal_iraq_alerts ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true`;
  await sql`ALTER TABLE dalal_iraq_alerts ADD COLUMN IF NOT EXISTS notified_urls JSONB DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE dalal_iraq_alerts ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ`;
  // صياد الصفقات: تنبيه حين يظهر عرض أقل من وسيط السوق بهذه النسبة (بدل سعر ثابت)
  await sql`ALTER TABLE dalal_iraq_alerts ADD COLUMN IF NOT EXISTS below_market_pct INTEGER`;
  await sql`ALTER TABLE dalal_iraq_user_subscriptions ADD COLUMN IF NOT EXISTS reminded_for TIMESTAMPTZ`;
}

export function formatIQD(n) {
  return `${Math.round(Number(n)).toLocaleString('en-US')} د.ع`;
}

/**
 * العروض التي تستحق التنبيه: ذات صلة، بسعر بيع معروف، أقل من أو يساوي السعر المستهدف،
 * وليست شاذة مقارنة بالعروض المماثلة في النتيجة نفسها، ولم يُنبَّه عنها سابقاً.
 */
/** نسبة صياد الصفقات المسموحة (5% إلى 50% تحت الوسيط). */
export function cleanBelowMarketPct(v) {
  const n = Math.round(Number(v));
  return n >= 5 && n <= 50 ? n : null;
}

/**
 * @param {object} [opts] targetPriceIQD: السعر الفعلي للمقارنة (لصياد الصفقات يُحسب من وسيط السوق)،
 *   minPriceIQD: أدنى سعر يُنبَّه عنه (السعر الأقل كثيراً من السوق غالباً احتيال)
 */
export function findAlertMatches(alert, offers, alreadyNotified = [], opts = {}) {
  const target = Number(opts.targetPriceIQD ?? alert.targetPriceIQD);
  const minPrice = Number(opts.minPriceIQD || 0);
  if (!(target > 0)) return [];
  const keyword = alert.keyword;
  const relevant = (offers || []).filter(
    (o) => o && Number(o.priceIQD) > 0 && !o.priceIsRent && !o.isListingPage && o.directUrl && isRelevantToQuery(keyword, `${o.title} ${o.snippet}`)
  );
  if (!relevant.length) return [];
  const stats = computePriceStats(relevant.map((o) => Number(o.priceIQD)));
  const floor = Math.max(stats.count >= 4 ? stats.lowerFence : 0, stats.median * 0.35);
  const seen = new Set(alreadyNotified);
  return relevant
    .filter((o) => Number(o.priceIQD) <= target && Number(o.priceIQD) >= Math.max(floor, minPrice) && !seen.has(o.directUrl))
    .sort((a, b) => a.priceIQD - b.priceIQD);
}

export function createAlertStore({ sql = null } = {}) {
  const mem = { alerts: [], nextId: 1 };

  return {
    async create(userId, { keyword, targetPriceIQD, governorate, section, belowMarketPct }, limit) {
      const pct = cleanBelowMarketPct(belowMarketPct);
      const clean = {
        keyword: cleanPlainText(keyword, 120),
        target: pct ? 0 : Math.round(Number(targetPriceIQD)),
        pct,
        governorate,
        section: ['all', 'products', 'cars', 'realestate'].includes(section) ? section : 'all'
      };
      if (!clean.keyword || !(pct || (clean.target > 0 && clean.target <= 100_000_000_000))) return { error: 'invalid_alert' };
      if (!sql) {
        if (mem.alerts.filter((a) => a.userId === userId && a.active).length >= limit) return { error: 'alert_limit_reached', limit };
        const a = { id: mem.nextId++, userId, keyword: clean.keyword, targetPriceIQD: clean.target, belowMarketPct: clean.pct, governorate, section: clean.section, active: true, notifiedUrls: [], lastCheckedAt: null };
        mem.alerts.push(a);
        return { alert: a };
      }
      const count = await sql`SELECT COUNT(*)::int AS n FROM dalal_iraq_alerts WHERE user_id = ${userId} AND active = true`;
      if (count[0].n >= limit) return { error: 'alert_limit_reached', limit };
      const rows = await sql`
        INSERT INTO dalal_iraq_alerts (keyword, target_price_iqd, governorate, contact_phone, contact_channel, user_id, section, below_market_pct)
        VALUES (${clean.keyword}, ${clean.target}, ${governorate}, '', 'site', ${userId}, ${clean.section}, ${clean.pct})
        RETURNING id, keyword, target_price_iqd::bigint AS "targetPriceIQD", below_market_pct AS "belowMarketPct", governorate, section, created_at AS "createdAt"
      `;
      return { alert: { ...rows[0], targetPriceIQD: Number(rows[0].targetPriceIQD) } };
    },

    /**
     * تعديل تنبيه يملكه المستخدم. تغيير السلعة أو المحافظة أو القسم يبدأ المراقبة من جديد
     * (يمسح سجل العروض المنبَّه عنها)، وتغيير السعر وحده يُبقيه ويعيد الفحص قريباً.
     */
    async update(userId, id, fields) {
      const current = (await this.list(userId)).find((a) => Number(a.id) === Number(id));
      if (!current) return { error: 'not_found' };
      const next = {
        keyword: fields.keyword !== undefined ? cleanPlainText(fields.keyword, 120) : current.keyword,
        target: fields.targetPriceIQD !== undefined ? Math.round(Number(fields.targetPriceIQD)) || 0 : Number(current.targetPriceIQD),
        pct: fields.belowMarketPct !== undefined ? cleanBelowMarketPct(fields.belowMarketPct) : current.belowMarketPct || null,
        governorate: fields.governorate || current.governorate,
        section: ['all', 'products', 'cars', 'realestate'].includes(fields.section) ? fields.section : current.section || 'all'
      };
      if (next.pct) next.target = 0;
      if (!next.keyword || !(next.pct || (next.target > 0 && next.target <= 100_000_000_000))) return { error: 'invalid_alert' };
      const scopeChanged =
        normalizeForMatch(next.keyword) !== normalizeForMatch(current.keyword) ||
        next.governorate !== current.governorate ||
        next.section !== (current.section || 'all');
      if (!sql) {
        const a = mem.alerts.find((x) => x.id === Number(id) && x.userId === userId);
        Object.assign(a, { keyword: next.keyword, targetPriceIQD: next.target, belowMarketPct: next.pct, governorate: next.governorate, section: next.section, lastCheckedAt: null });
        if (scopeChanged) a.notifiedUrls = [];
        return { alert: a, scopeChanged };
      }
      const rows = await sql`
        UPDATE dalal_iraq_alerts
        SET keyword = ${next.keyword}, target_price_iqd = ${next.target}, below_market_pct = ${next.pct}, governorate = ${next.governorate}, section = ${next.section},
            last_checked_at = NULL,
            notified_urls = CASE WHEN ${scopeChanged} THEN '[]'::jsonb ELSE COALESCE(notified_urls, '[]'::jsonb) END
        WHERE id = ${Number(id)} AND user_id = ${userId} AND active = true
        RETURNING id, keyword, target_price_iqd::bigint AS "targetPriceIQD", below_market_pct AS "belowMarketPct", governorate, section, created_at AS "createdAt"
      `;
      if (!rows.length) return { error: 'not_found' };
      return { alert: { ...rows[0], targetPriceIQD: Number(rows[0].targetPriceIQD) }, scopeChanged };
    },

    async list(userId) {
      if (!sql) return mem.alerts.filter((a) => a.userId === userId && a.active);
      const rows = await sql`
        SELECT id, keyword, target_price_iqd::bigint AS "targetPriceIQD", below_market_pct AS "belowMarketPct", governorate, section, created_at AS "createdAt", last_checked_at AS "lastCheckedAt"
        FROM dalal_iraq_alerts WHERE user_id = ${userId} AND active = true ORDER BY created_at DESC LIMIT 60
      `;
      return rows.map((r) => ({ ...r, targetPriceIQD: Number(r.targetPriceIQD) }));
    },

    async remove(userId, id) {
      if (!sql) {
        const a = mem.alerts.find((x) => x.id === id && x.userId === userId);
        if (a) a.active = false;
        return Boolean(a);
      }
      const rows = await sql`UPDATE dalal_iraq_alerts SET active = false WHERE id = ${id} AND user_id = ${userId} RETURNING id`;
      return rows.length > 0;
    },

    /** التنبيهات الفعالة التي تطابق بحثاً معيناً (لفحصها مجاناً عند حفظ نتائجه). */
    async forSearch(query, governorate, section) {
      const q = normalizeForMatch(query);
      // نتائج "جميع الأقسام" تشمل كل قسم، وتنبيه "جميع الأقسام" يقبل نتائج أي قسم
      const sectionMatches = (a) => a.section === section || a.section === 'all' || section === 'all';
      if (!sql) return mem.alerts.filter((a) => a.active && normalizeForMatch(a.keyword) === q && a.governorate === governorate && sectionMatches(a));
      const rows = await sql`
        SELECT id, user_id AS "userId", keyword, target_price_iqd::bigint AS "targetPriceIQD", below_market_pct AS "belowMarketPct", governorate, section,
               COALESCE(notified_urls, '[]'::jsonb) AS "notifiedUrls"
        FROM dalal_iraq_alerts
        WHERE active = true AND user_id IS NOT NULL AND governorate = ${governorate}
          AND (section = ${section} OR section = 'all' OR ${section} = 'all')
      `;
      return rows.filter((a) => normalizeForMatch(a.keyword) === q).map((r) => ({ ...r, targetPriceIQD: Number(r.targetPriceIQD) }));
    },

    /** كل التنبيهات الفعالة في قسم ما (لفحص الإعلانات الجديدة فور تجميعها، دون أي رصيد). */
    async activeInSection(section) {
      const ok = (a) => a.active && (a.section === section || (a.section || 'all') === 'all');
      if (!sql) return mem.alerts.filter(ok);
      const rows = await sql`
        SELECT id, user_id AS "userId", keyword, target_price_iqd::bigint AS "targetPriceIQD", below_market_pct AS "belowMarketPct", governorate,
               COALESCE(section, 'all') AS section, COALESCE(notified_urls, '[]'::jsonb) AS "notifiedUrls"
        FROM dalal_iraq_alerts
        WHERE active = true AND user_id IS NOT NULL AND (section = ${section} OR COALESCE(section, 'all') = 'all')
        LIMIT 5000
      `;
      return rows.map((r) => ({ ...r, targetPriceIQD: Number(r.targetPriceIQD) }));
    },

    /** التنبيهات التي لم تُفحص منذ 20 ساعة، الأقدم فحصاً أولاً. */
    async due(limit) {
      if (!sql) {
        return mem.alerts
          .filter((a) => a.active && (!a.lastCheckedAt || Date.now() - a.lastCheckedAt > 20 * 3600000))
          .slice(0, limit);
      }
      const rows = await sql`
        SELECT id, user_id AS "userId", keyword, target_price_iqd::bigint AS "targetPriceIQD", below_market_pct AS "belowMarketPct", governorate, COALESCE(section, 'all') AS section,
               COALESCE(notified_urls, '[]'::jsonb) AS "notifiedUrls"
        FROM dalal_iraq_alerts
        WHERE active = true AND user_id IS NOT NULL AND (last_checked_at IS NULL OR last_checked_at < NOW() - INTERVAL '20 hours')
        ORDER BY last_checked_at NULLS FIRST, id
        LIMIT ${limit}
      `;
      return rows.map((r) => ({ ...r, targetPriceIQD: Number(r.targetPriceIQD) }));
    },

    async markChecked(id, newlyNotifiedUrls = []) {
      if (!sql) {
        const a = mem.alerts.find((x) => x.id === id);
        if (a) {
          a.lastCheckedAt = Date.now();
          a.notifiedUrls = [...(a.notifiedUrls || []), ...newlyNotifiedUrls].slice(-50);
        }
        return;
      }
      await sql`
        UPDATE dalal_iraq_alerts
        SET last_checked_at = NOW(),
            notified_urls = COALESCE(notified_urls, '[]'::jsonb) || ${JSON.stringify(newlyNotifiedUrls.slice(0, 20))}::jsonb
        WHERE id = ${id}
      `;
    },

    /** اشتراكات تنتهي خلال 3 أيام ولم يُذكَّر أصحابها بهذا الموعد بعد. */
    async subscriptionsNeedingReminder() {
      if (!sql) return [];
      return sql`
        SELECT user_id AS "userId", expires_at AS "expiresAt"
        FROM dalal_iraq_user_subscriptions
        WHERE expires_at > NOW() AND expires_at < NOW() + INTERVAL '3 days'
          AND (reminded_for IS NULL OR reminded_for <> expires_at)
        LIMIT 200
      `;
    },

    async markReminded(userId, expiresAt) {
      if (!sql) return;
      await sql`UPDATE dalal_iraq_user_subscriptions SET reminded_for = ${expiresAt} WHERE user_id = ${userId}`;
    }
  };
}
