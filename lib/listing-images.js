// ============================================================================
// صور الإعلانات الحقيقية: لا تُعرض إلا صورة مرتبطة برابط الإعلان نفسه.
// المصدر الأول: بحث الصور في سيربر (يعيد صورة كل صفحة مع رابطها، ومنها منشورات فيسبوك وانستغرام).
// المصدر الثاني: وسم og:image في صفحات المتاجر (الريان، مسواك، السوق المفتوح...) بلا أي رصيد.
// ============================================================================

import { safeHttpUrl } from '../shared/sanitize.js';

const SERPER_IMAGES_URL = 'https://google.serper.dev/images';
const SOCIAL_HOST = /(^|\.)(facebook\.com|fb\.com|instagram\.com)$/;
// روابط صور فيسبوك وانستغرام في نتائج البحث تُقدَّم لزواحف محركات البحث فقط، والمتصفح يتلقى صفحة دخول
const CRAWLER_ONLY_IMAGE_HOST = /(^|\.)(lookaside\.fbsbx\.com|lookaside\.instagram\.com|fbsbx\.com)$/;

/** صيغة موحدة لرابط الصفحة لمطابقة صورة بإعلان: بلا www ولا معاملات ولا شرطة أخيرة. */
export function normalizePageUrl(value) {
  const url = safeHttpUrl(value);
  if (!url) return null;
  try {
    const u = new URL(url);
    let path = u.pathname;
    try {
      path = decodeURIComponent(path);
    } catch {}
    return `${u.hostname.replace(/^(www|m|ar|en)\./, '')}${path.replace(/\/+$/, '')}`.toLowerCase();
  } catch {
    return null;
  }
}

/** بحث الصور في سيربر: خريطة من رابط الصفحة الموحد إلى رابط الصورة. رصيد واحد. */
export async function fetchSerperImageMap(query) {
  const map = new Map();
  if (!process.env.SERPER_API_KEY) return map;
  try {
    const res = await fetch(SERPER_IMAGES_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': process.env.SERPER_API_KEY.trim() },
      body: JSON.stringify({ q: query, gl: 'iq', hl: 'ar', num: 40 }),
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) throw new Error(`serper images HTTP ${res.status}`);
    const data = await res.json();
    for (const item of data.images || []) {
      const page = normalizePageUrl(item.link);
      const image = safeHttpUrl(item.imageUrl);
      if (page && image && !map.has(page)) map.set(page, image);
    }
  } catch (err) {
    console.warn('Serper images failed:', err.message);
  }
  return map;
}

/** يمنع جلب عناوين داخلية أو محلية (حماية من طلبات الخادم إلى شبكته الداخلية). */
function isPublicHttpUrl(value) {
  const url = safeHttpUrl(value);
  if (!url) return false;
  const host = new URL(url).hostname;
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':')) return false; // عناوين IP مباشرة
  return true;
}

/** يتحقق أن الرابط يعيد صورة فعلاً لمتصفح عادي (أول 2 كيلوبايت فقط). */
export async function isLoadableImage(imageUrl) {
  const url = safeHttpUrl(imageUrl);
  if (!url || !isPublicHttpUrl(url)) return false;
  if (CRAWLER_ONLY_IMAGE_HOST.test(new URL(url).hostname)) return false;
  try {
    const res = await fetch(url, {
      headers: { Range: 'bytes=0-2047', 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' },
      redirect: 'follow',
      signal: AbortSignal.timeout(4000)
    });
    res.body?.cancel().catch(() => {});
    return (res.status === 200 || res.status === 206) && /^image\//i.test(res.headers.get('content-type') || '');
  } catch {
    return false;
  }
}

/** يستخرج og:image (أو twitter:image) من أول 300 كيلوبايت من الصفحة. */
export function extractOgImage(html, pageUrl) {
  const text = String(html || '');
  const tag =
    text.match(/<meta[^>]+(?:property|name)=["']og:image(?::secure_url)?["'][^>]*>/i) ||
    text.match(/<meta[^>]+(?:property|name)=["']twitter:image["'][^>]*>/i);
  if (!tag) return null;
  const content = tag[0].match(/content=["']([^"']+)["']/i);
  if (!content) return null;
  try {
    return safeHttpUrl(new URL(content[1].replace(/&amp;/g, '&'), pageUrl).href);
  } catch {
    return null;
  }
}

export async function fetchOgImage(pageUrl) {
  if (!isPublicHttpUrl(pageUrl)) return null;
  try {
    const res = await fetch(pageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IraqPriceRadar/1.0)', Accept: 'text/html' },
      redirect: 'follow',
      signal: AbortSignal.timeout(4500)
    });
    if (!res.ok || !/text\/html/i.test(res.headers.get('content-type') || '')) return null;
    const reader = res.body.getReader();
    let html = '';
    const decoder = new TextDecoder();
    while (html.length < 300_000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      if (/<\/head>/i.test(html)) break;
    }
    reader.cancel().catch(() => {});
    return extractOgImage(html, pageUrl);
  } catch {
    return null;
  }
}

/**
 * يضيف لكل عرض صورته الحقيقية إن وُجدت، ويعيد قائمة جديدة.
 * العروض التي لا تُعرف صورتها تبقى بلا صورة (لا صور توضيحية عامة).
 */
export async function attachListingImages(offers, { imageQuery, maxPageFetches = 12 } = {}) {
  const imageMap = imageQuery ? await fetchSerperImageMap(imageQuery) : new Map();

  // المرشح لكل عرض: صورة صفحته من بحث الصور، وإلا og:image من صفحة المتجر نفسها
  const candidates = offers.map((o) => (o.isListingPage ? null : imageMap.get(normalizePageUrl(o.directUrl)) || null));
  const needPage = offers
    .map((o, i) => ({ o, i }))
    .filter(({ o, i }) => !candidates[i] && !o.isListingPage && o.sourceHost && !SOCIAL_HOST.test(o.sourceHost))
    .slice(0, maxPageFetches);
  const pageImages = await Promise.all(needPage.map(({ o }) => fetchOgImage(o.directUrl)));
  const sources = candidates.map((c) => (c ? 'search_image' : null));
  needPage.forEach(({ i }, k) => {
    if (pageImages[k]) {
      candidates[i] = pageImages[k];
      sources[i] = 'page_og_image';
    }
  });

  // لا تُعرض إلا صورة تأكدنا أنها تُحمَّل فعلاً في متصفح الزائر
  const loadable = await Promise.all(candidates.map((c) => (c ? isLoadableImage(c) : false)));
  return offers.map((o, i) =>
    loadable[i] ? { ...o, imageUrl: candidates[i], imageSource: sources[i], imageIsIllustrative: false } : o
  );
}
