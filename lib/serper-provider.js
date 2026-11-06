// ============================================================================
// مزود البحث الرسمي: سيربر (نتائج غوغل الحقيقية عبر واجهة مدفوعة)
// - يعمل فقط عند وجود SERPER_API_KEY في متغيرات البيئة.
// - نتائج البحث المقيّد بالمواقع (site:) لا تحمل روابط حقيقية إلا لأول 3 نتائج،
//   فتُرسل الاستجابة إلى /resolve لاستعادة الروابط الأصلية لبقية النتائج (بلا رصيد إضافي).
// ============================================================================

import { safeHttpUrl, htmlToPlainText } from '../shared/sanitize.js';

const SERPER_SEARCH_URL = 'https://google.serper.dev/search';
const SERPER_RESOLVE_URL = 'https://google.serper.dev/resolve';

// المواقع العراقية التي يُبحث داخلها. أضف أي موقع جديد هنا بسطر واحد.
export const IRAQI_STORE_SITES = ['iq.opensooq.com', 'elryan.com', 'miswag.com', 'alnabaa.com'];
export const SOCIAL_SITES = ['facebook.com', 'instagram.com'];

export function isSerperConfigured() {
  return Boolean(process.env.SERPER_API_KEY && process.env.SERPER_API_KEY.trim());
}

function siteClause(sites) {
  return `(${sites.map((s) => `site:${s}`).join(' OR ')})`;
}

/** خطة الاستعلامات لعملية بحث واحدة: 3 أرصدة لكل عملية بحث. */
export function buildSerperQueries(query, govName, sectionHint = 'all') {
  const context =
    sectionHint === 'cars' ? 'سيارة للبيع السعر' : sectionHint === 'realestate' ? 'عقار للبيع او ايجار السعر' : 'السعر';
  return [
    { label: 'web', q: `${query} ${context} ${govName}` },
    { label: 'social', q: `${query} ${siteClause(SOCIAL_SITES)} ${govName} السعر` },
    { label: 'stores', q: `${query} ${siteClause(IRAQI_STORE_SITES)}` }
  ];
}

async function postJson(url, body, timeoutMs) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-KEY': process.env.SERPER_API_KEY.trim() },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!res.ok) throw new Error(`serper HTTP ${res.status}`);
  return res.json();
}

const isGoogleRedirect = (link) => /^https?:\/\/(www\.)?google\.[a-z.]+\/goto\?/i.test(String(link || ''));

/** يحول عناصر organic من سيربر إلى نتائج خام موحدة مع الاستغناء عن الروابط غير الحقيقية. */
export function mapSerperOrganic(organic) {
  const rows = [];
  for (const item of Array.isArray(organic) ? organic : []) {
    if (isGoogleRedirect(item.link)) continue; // لم تُستعد: لا نعرض رابطاً لا يصل للإعلان الأصلي
    const url = safeHttpUrl(item.link);
    if (!url) continue;
    let host;
    try {
      host = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      continue;
    }
    const title = htmlToPlainText(item.title, 200);
    if (!title || title.length < 4) continue;
    rows.push({
      url,
      host,
      title,
      snippet: htmlToPlainText(item.snippet, 400),
      searchDateText: item.date ? htmlToPlainText(item.date, 40) : null
    });
  }
  return rows;
}

/** المرحلة الأولى: استعلام سريع (ثانيتان تقريباً) يستهلك رصيداً واحداً. */
export async function serperSearchRaw(q, { gl = 'iq', hl = 'ar', num = 10 } = {}) {
  return postJson(SERPER_SEARCH_URL, { q, gl, hl, num }, 8000);
}

/** هل في الاستجابة روابط تحويل تحتاج استعادة؟ (يحدث مع البحث المقيّد بالمواقع بعد أول 3 نتائج) */
export function needsResolve(data) {
  return Boolean(data && Array.isArray(data.organic) && data.organic.some((o) => isGoogleRedirect(o.link)));
}

/**
 * المرحلة الثانية: استعادة الروابط الأصلية (قرابة 22 ثانية، بلا رصيد إضافي).
 * عند الفشل تُعاد الاستجابة الأصلية كما هي فتبقى النتائج ذات الروابط الحقيقية فقط.
 */
export async function serperResolve(data) {
  try {
    const resolved = await postJson(SERPER_RESOLVE_URL, data, 45000);
    return Array.isArray(resolved.organic) ? resolved : data;
  } catch (err) {
    console.warn('Serper resolve failed:', err.message);
    return data;
  }
}

/** استعلام كامل بمرحلتيه (للاستخدامات التي لا تحتاج عرضاً سريعاً). */
export async function searchSerper(q, options) {
  let data = await serperSearchRaw(q, options);
  if (needsResolve(data)) data = await serperResolve(data);
  return mapSerperOrganic(data.organic);
}
