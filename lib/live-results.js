// ============================================================================
// تحويل نتائج محرك البحث إلى عروض "حية" بلا أي بيانات مختلقة
// كل حقل إما مستخرج من نص النتيجة نفسها أو يبقى فارغاً (null) ويُعلَّم بمصدره.
// ============================================================================

import { htmlToPlainText, safeHttpUrl, safeIraqiMobile, cleanPlainText } from '../shared/sanitize.js';
import {
  extractPriceForQuery,
  classifySection,
  extractCarSpecs,
  extractRealEstateSpecs,
  isPlausiblePrice,
  isRelevantToQuery,
  normalizeDigits
} from '../shared/price-engine.js';

/**
 * يستخرج النتائج الخام من صفحة نتائج ياهو.
 * هذا المصدر غير مضمون: أي تغيير في بنية الصفحة يعيد قائمة فارغة.
 */
export function parseYahooResults(html, limit = 8) {
  const results = [];
  const blocks = String(html || '').split(/class="[^"]*dd algo/i).slice(1, limit + 1);
  for (const block of blocks) {
    const linkMatch = block.match(/href="([^"]+)"/i);
    const titleMatch = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
    const snippetMatch = block.match(/class="[^"]*compText[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (!linkMatch || !titleMatch) continue;

    let realUrl = linkMatch[1].replace(/&amp;/g, '&');
    const ruMatch = realUrl.match(/\/RU=([^/]+)\//);
    if (ruMatch) {
      try {
        realUrl = decodeURIComponent(ruMatch[1]);
      } catch {
        continue;
      }
    }
    const url = safeHttpUrl(realUrl);
    if (!url) continue;
    let host;
    try {
      host = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      continue;
    }
    if (/(^|\.)yahoo\.com$/.test(host)) continue;

    const title = htmlToPlainText(titleMatch[1], 200)
      .replace(/\s*[-|]\s*(Facebook|Instagram|فيسبوك|انستغرام).*$/i, '')
      .trim();
    const snippet = snippetMatch ? htmlToPlainText(snippetMatch[1], 400) : '';
    if (!title || title.length < 4) continue;
    results.push({ url, host, title, snippet });
  }
  return results;
}

/**
 * المواقع العراقية المعروفة: اسمها المعروض، ونمط رابط الإعلان الفردي فيها.
 * أي رابط لا يطابق نمط الإعلان (قسم، بحث، مقارنة مواصفات، صفحة عامة) يُعامل كصفحة تجمع عروضاً بلا سعر مؤكد.
 * skip: روابط ليست عروض بيع أصلاً (مثل صفحات "مطلوب").
 */
export const KNOWN_SITES = {
  'iq.opensooq.com': { name: 'السوق المفتوح' },
  'elryan.com': { name: 'الريان' },
  'miswag.com': { name: 'مسواك' },
  'alnabaa.com': { name: 'النبأ' },
  'cars.iq': { name: 'Cars.iq', ad: /\/front\/car-detail\/\d+/ },
  // المفهرس منه حالياً صفحات مقارنة مواصفات لا إعلانات؛ لا نعرف نمط إعلان مؤكداً فيه
  'iqcars.iq': { name: 'IQ Cars', ad: null },
  'shanashel.com': { name: 'شناشيل', ad: /\/property\/[\w-]*\d/ },
  'albastiya.com': { name: 'البسطية', ad: /\/listings\/[0-9a-f-]{20,}/i, skip: /\/wanted\// },
  'soqna-iq.com': { name: 'سوقنه', ad: /\/(?:view_ad|ad|item)\.php\?id=\d+/ },
  'ajiiba.com': { name: 'Ajiiba', ad: /\/listings\/[0-9a-f-]{20,}/i },
  'kryari.com': { name: 'KRYARI', ad: /\/l\/[0-9a-f-]{20,}/i },
  'iraq-sooq.com': { name: 'سوق العراق', ad: /\/(?:product|products|ad|item|listing)s?\/[\w-]*\d/ }
};

export function knownSiteFor(host) {
  const h = String(host || '').toLowerCase();
  for (const [domain, info] of Object.entries(KNOWN_SITES)) {
    if (h === domain || h.endsWith(`.${domain}`)) return { domain, ...info };
  }
  return null;
}

/** اسم وصفي للمصدر مأخوذ من نطاق الرابط فقط، دون ادعاء هوية متجر بعينه. */
export function describeSource(host) {
  if (/(^|\.)facebook\.com$|(^|\.)fb\.com$/.test(host)) return { platform: 'facebook', storeName: 'منشور أو صفحة على فيسبوك' };
  if (/(^|\.)instagram\.com$/.test(host)) return { platform: 'instagram', storeName: 'منشور أو حساب على انستغرام' };
  const site = knownSiteFor(host);
  // اسم الموقع مع نطاقه: يبيّن المصدر بوضوح ولا يُعدّ اسم تاجر بعينه
  if (site) return { platform: 'google', storeName: `${site.name} (${site.domain})` };
  return { platform: 'google', storeName: cleanPlainText(host, 80) };
}

function extractPhone(text) {
  const m = normalizeDigits(text).match(/(?:^|[^\d])(07[3-9]\d{8})(?!\d)/);
  return m ? safeIraqiMobile(m[1]) : null;
}

/**
 * يبني عرضاً حياً من نتيجة بحث واحدة.
 * @returns {object|null} null إذا كانت النتيجة غير ذات صلة أو لا تنتمي للقسم المطلوب.
 */
export function buildLiveOffer(raw, ctx) {
  const { query = '', sectionHint = 'all', detectGov, usdRate } = ctx || {};
  const combinedText = `${raw.title} ${raw.snippet}`;
  if (!isRelevantToQuery(query, combinedText)) return null;
  // منشورات الطلب ("مطلوب ايفون...") ليست عروض بيع
  if (/^\s*(?:مطلو+ب|ابحث عن|اريد)\s/.test(raw.title)) return null;
  const site = knownSiteFor(raw.host);
  if (site?.skip && site.skip.test(raw.url)) return null;
  // صفحات الفئات مثل "موبايل ايفون 15 للبيع في العراق (171)" تجمع إعلانات كثيرة: رابط مفيد لكن سعرها ليس سعر عرض واحد
  const isListingPage =
    /[(\u200f]\s*\d{1,6}\s*\)/.test(raw.title) || // "للبيع في العراق (171)"
    /^\s*\d{1,5}\s+[^\d\s]/.test(raw.title) || // "68 كيا سبورتاج 2023 مستعملة للبيع"
    /للبيع في العراق\s*[\u200f]?\(/.test(raw.title) ||
    // صفحة في السوق المفتوح بلا رقم إعلان (مثل 286896354) هي صفحة بحث أو فئة
    (/(^|\.)opensooq\.com$/.test(raw.host) && !/\(\s*\d{6,}\s*\)|\/\d{6,}(?:[/?#]|$)/.test(`${raw.title} ${raw.url}`)) ||
    // المواقع المضافة: ما لا يطابق نمط الإعلان الفردي فيها صفحة قسم أو مواصفات
    Boolean(site && 'ad' in site && !(site.ad && site.ad.test(raw.url)));

  const classified = classifySection(combinedText);
  let section = classified.section;
  if (section === 'unknown') section = sectionHint !== 'all' ? sectionHint : 'products';
  if (sectionHint !== 'all' && section !== sectionHint) return null;

  // السعر يُؤخذ فقط من جزء المقتطف الذي يخص السلعة المطلوبة (المقتطف قد يدمج عدة منشورات)
  const extracted = isListingPage ? null : extractPriceForQuery(query, raw.title, raw.snippet, { usdRate });
  let priceIQD = null;
  let priceMeta = null;
  if (extracted) {
    const plausible = isPlausiblePrice(extracted.priceIQD, section, extracted.isRent);
    priceMeta = {
      unit: extracted.unit,
      currency: extracted.currency,
      matchedText: extracted.matchedText,
      confidence: extracted.confidence,
      plausible
    };
    if (plausible) priceIQD = extracted.priceIQD;
  }

  const location = detectGov ? detectGov(combinedText) : null;
  const specs = section === 'cars' ? extractCarSpecs(combinedText) : section === 'realestate' ? extractRealEstateSpecs(combinedText) : {};
  if (section === 'realestate' && extracted?.isRent) specs.dealType = 'إيجار';
  const { platform, storeName } = describeSource(raw.host);
  const phone = extractPhone(combinedText);

  return {
    id: `live-${platform}-${Buffer.from(raw.url).toString('base64url').slice(-18)}`,
    source: 'live',
    section,
    specs,
    title: cleanPlainText(raw.title, 110),
    category: section === 'cars' ? 'سيارات' : section === 'realestate' ? 'عقارات' : 'سلع وأجهزة',
    keywords: [cleanPlainText(query, 80)],
    platform,
    sourceHost: raw.host,
    storeName,
    verified: false,
    allowsInspection: null,
    trustRating: null,
    reviewsCount: 0,
    priceIQD,
    priceIsRent: Boolean(extracted?.isRent && priceIQD),
    rentPeriod: priceIQD ? extracted?.rentPeriod || null : null,
    priceBasis: priceIQD ? extracted.currency : null,
    amountUSD: priceIQD && extracted.currency === 'USD' ? extracted.amountUSD : null,
    priceSource: priceIQD ? 'search_snippet' : null,
    priceMeta,
    deliveryLocalIQD: null,
    deliveryNationalIQD: null,
    governorate: location?.governorate || null,
    district: location?.district || null,
    locationDetected: Boolean(location),
    delivery: '',
    phone,
    phoneSource: phone ? 'search_snippet' : null,
    snippet: cleanPlainText(raw.snippet || raw.title, 220),
    directUrl: raw.url,
    postedAgo: null,
    postedAt: null,
    // التاريخ الذي يعرضه محرك البحث بجانب النتيجة (قد يكون تاريخ النشر أو الفهرسة، وغير موثق)
    searchDateText: raw.searchDateText ? cleanPlainText(raw.searchDateText, 40) : null,
    isListingPage,
    // الصورة تُضاف لاحقاً فقط إذا كانت صورة هذا الإعلان نفسه (انظر lib/listing-images.js)
    imageUrl: null,
    imageSource: null,
    imageIsIllustrative: false
  };
}
