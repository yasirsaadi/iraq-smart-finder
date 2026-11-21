// ============================================================================
// محللات صفحات الإعلانات للزاحف الليلي
// نقرأ فقط البيانات المنظمة (JSON-LD) التي ينشرها الموقع نفسه لمحركات البحث:
// العنوان والسعر والموقع والصورة وتاريخ النشر ورابط الإعلان. لا أرقام هواتف ولا بيانات شخصية.
//
// المواقع المشمولة يجب أن تسمح بالزحف في robots.txt ولا تمنعه في شروط استخدامها.
// مستبعدة عمداً: السوق المفتوح وKRYARI (شروطهما تمنع الجمع الآلي)، iqcars (حماية من الروبوتات)،
// cars.iq (لا إعلانات جديدة منذ 2025)، والبسطية وسوق العراق (صفحاتها لا تحمل بيانات بلا متصفح).
// ============================================================================

import { classifySection } from '../shared/price-engine.js';

export const CRAWLER_USER_AGENT = 'IraqPriceRadarBot/1.0 (+https://iraq-smart-finder.onrender.com/bot)';

/** يستخرج كائنات JSON-LD من صفحة، مع فك @graph. */
export function extractJsonLd(html) {
  const out = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(String(html || '')))) {
    try {
      const data = JSON.parse(m[1].trim());
      const items = Array.isArray(data) ? data : data && Array.isArray(data['@graph']) ? data['@graph'] : [data];
      for (const it of items) if (it && typeof it === 'object') out.push(it);
    } catch {
      // كتلة غير صالحة: نتجاوزها
    }
  }
  return out;
}

const typeIs = (item, ...types) => {
  const t = item['@type'];
  return (Array.isArray(t) ? t : [t]).some((x) => types.includes(x));
};
const firstImage = (img) => {
  if (!img) return null;
  if (typeof img === 'string') return img;
  if (Array.isArray(img)) return firstImage(img[0]);
  return img.contentUrl || img.url || null;
};
const conditionOf = (v) => (/NewCondition/i.test(String(v || '')) ? 'new' : /UsedCondition|Refurbished/i.test(String(v || '')) ? 'used' : null);

const PROPERTY_TYPES = {
  House: 'بيت',
  SingleFamilyResidence: 'بيت',
  Apartment: 'شقة',
  Residence: 'عقار سكني',
  Accommodation: 'عقار',
  LandForm: 'أرض',
  Place: 'عقار'
};

/** شناشيل: إعلان عقاري واحد من نوع RealEstateListing. */
export function parseShanashel(html, url) {
  const item = extractJsonLd(html).find((x) => typeIs(x, 'RealEstateListing'));
  if (!item) return null;
  const entity = item.mainEntity || {};
  const address = entity.address || {};
  const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers || {};
  const entityType = Array.isArray(entity['@type']) ? entity['@type'][0] : entity['@type'];
  const typeName = PROPERTY_TYPES[entityType] || 'عقار';
  const isRent = /Lease|Rent/i.test(String(offer.businessFunction || ''));
  return {
    url: item.url || url,
    source: 'shanashel.com',
    sourceName: 'شناشيل (shanashel.com)',
    section: 'realestate',
    title: item.name || entity.name,
    description: item.description || '',
    priceAmount: Number(offer.price) || null,
    currency: offer.priceCurrency || 'IQD',
    deal: isRent ? 'rent' : 'sale',
    region: address.addressRegion || '',
    city: address.addressLocality || '',
    areaSqm: Number(entity.floorSize?.value) || null,
    rooms: Number(entity.numberOfRooms || entity.numberOfBedrooms) || null,
    category: `${typeName} ${isRent ? 'للإيجار' : 'للبيع'}`,
    imageUrl: firstImage(item.image),
    postedAt: item.datePosted || null
  };
}

/** عجيبة: منتج واحد من نوع Product مع عرض سعر وموقع (أغلبه في إقليم كردستان). */
export function parseAjiiba(html, url) {
  const items = extractJsonLd(html);
  const product = items.find((x) => typeIs(x, 'Product'));
  if (!product) return null;
  const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers || {};
  const crumbs = items.find((x) => typeIs(x, 'BreadcrumbList'))?.itemListElement || [];
  const category = crumbs.length >= 3 ? crumbs[crumbs.length - 2]?.name : crumbs[1]?.name || '';
  const city = offer.areaServed?.name || '';
  const classified = classifySection(`${category} ${product.name}`).section;
  return {
    url: product.url || url,
    source: 'ajiiba.com',
    sourceName: 'Ajiiba (ajiiba.com)',
    section: classified === 'unknown' ? 'products' : classified,
    title: product.name,
    description: product.description || '',
    priceAmount: Number(offer.price) || null,
    currency: offer.priceCurrency || 'IQD',
    deal: 'sale',
    region: '',
    city,
    condition: conditionOf(offer.itemCondition),
    category,
    imageUrl: firstImage(product.image),
    postedAt: null
  };
}

/** يستخرج روابط sitemap مع تاريخ آخر تعديل إن وُجد. */
export function parseSitemap(xml) {
  const out = [];
  const re = /<url>([\s\S]*?)<\/url>/gi;
  let m;
  while ((m = re.exec(String(xml || '')))) {
    const loc = /<loc>\s*([^<\s]+)\s*<\/loc>/i.exec(m[1])?.[1];
    if (!loc) continue;
    const lastmod = /<lastmod>\s*([^<\s]+)\s*<\/lastmod>/i.exec(m[1])?.[1] || null;
    out.push({ loc: loc.replace(/&amp;/g, '&'), lastmod });
  }
  return out;
}

/**
 * قواعد robots.txt المطبقة على زاحفنا: مجموعة وكيلنا إن وُجدت، وإلا مجموعة "*".
 * يعيد دالة تقرر إن كان المسار مسموحاً (أطول قاعدة مطابقة تفوز، وAllow عند التساوي).
 */
export function robotsAllows(robotsTxt, agentToken = 'IraqPriceRadarBot') {
  const groups = [];
  let current = null;
  let lastWasAgent = false;
  for (const rawLine of String(robotsTxt || '').split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    const m = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line);
    if (!m) continue;
    const field = m[1].toLowerCase();
    const value = m[2].trim();
    if (field === 'user-agent') {
      if (!lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (current && (field === 'allow' || field === 'disallow')) current.rules.push({ allow: field === 'allow', path: value });
    }
  }
  const own = groups.filter((g) => g.agents.some((a) => a !== '*' && agentToken.toLowerCase().includes(a)));
  const chosen = own.length ? own : groups.filter((g) => g.agents.includes('*'));
  const rules = chosen.flatMap((g) => g.rules).filter((r) => r.path !== '' || r.allow === false);
  const toRegex = (p) => new RegExp(`^${p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$')}`);
  return (path) => {
    let best = null;
    for (const r of rules) {
      if (r.path === '') continue; // "Disallow:" فارغ يعني السماح بكل شيء
      if (toRegex(r.path).test(path) && (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow))) best = r;
    }
    return !best || best.allow;
  };
}

export const CRAWL_SOURCES = [
  {
    id: 'shanashel',
    origin: 'https://shanashel.com',
    sitemaps: ['https://shanashel.com/sitemap/properties.xml'],
    urlFilter: /^https:\/\/shanashel\.com\/property\/\d+$/,
    parse: parseShanashel
  },
  {
    id: 'ajiiba',
    origin: 'https://ajiiba.com',
    sitemaps: ['https://ajiiba.com/sitemap.xml'],
    urlFilter: /^https:\/\/ajiiba\.com\/ar\/listings\/[0-9a-f-]{20,}$/i,
    parse: parseAjiiba
  }
];
