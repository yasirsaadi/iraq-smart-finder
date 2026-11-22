// ============================================================================
// فهرس الإعلانات وذاكرة الأسعار
// - الإعلانات المجمّعة من المواقع التي تسمح بذلك (بياناتها المنظمة: سعر، موقع، صورة، تاريخ نشر)
//   تُحفظ هنا وتظهر في البحث مجاناً دون أي رصيد.
// - كل سعر نراه (من الفهرس أو من نتائج البحث الحي لإعلان فردي) يُسجَّل في ذاكرة الأسعار،
//   ومنها يُبنى دليل السعر: الوسيط والنطاق الشائع للعروض المماثلة خلال آخر الأشهر.
// ============================================================================

import {
  normalizeForMatch,
  isRelevantToQuery,
  comparisonGroupFor,
  computePriceStats,
  isPlausiblePrice,
  queryIntent,
  conflictsWithIntent,
  extractRealEstateSpecs,
  MIN_COMPARABLE_OFFERS
} from '../shared/price-engine.js';
import { cleanPlainText, safeHttpUrl } from '../shared/sanitize.js';

export const GUIDE_WINDOW_DAYS = 120;
const CANDIDATE_LIMIT = 4000;
const SECTIONS = ['products', 'cars', 'realestate'];

export async function initListingTables(sql) {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS dalal_iraq_listings (
      url TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      source_name TEXT NOT NULL,
      section TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      price_iqd BIGINT,
      price_amount NUMERIC,
      currency TEXT,
      deal TEXT DEFAULT 'sale',
      governorate TEXT,
      city TEXT,
      area_sqm NUMERIC,
      rooms INTEGER,
      item_condition TEXT,
      category TEXT,
      image_url TEXT,
      posted_at TIMESTAMPTZ,
      first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS dalal_iraq_listings_section_idx ON dalal_iraq_listings (section, last_seen DESC)`;
  await sql`
    CREATE TABLE IF NOT EXISTS dalal_iraq_price_observations (
      url TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      section TEXT NOT NULL,
      title TEXT NOT NULL,
      group_key TEXT NOT NULL,
      price_iqd BIGINT NOT NULL,
      area_sqm NUMERIC,
      governorate TEXT,
      price_kind TEXT NOT NULL,
      observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS dalal_iraq_price_obs_idx ON dalal_iraq_price_observations (section, observed_at DESC)`;
  // تنظيف: أسعار سُجلت سابقاً من صفحات تجمع منشورات كثيرة (مجموعات فيسبوك، حسابات انستغرام، صفحات رئيسية)
  await sql`
    DELETE FROM dalal_iraq_price_observations
    WHERE price_kind = 'estimated' AND (
      (url ~ '^https?://([a-z]+[.])?facebook[.]com/' AND url !~ '/posts/|/permalink|story_fbid=|/marketplace/item/|/photo|/videos?/|/reel/|/share/(p|v|r)/')
      OR (url ~ '^https?://([a-z]+[.])?instagram[.]com/' AND url !~ '/(p|reel|tv)/')
      OR url ~ '^https?://[^/]+/?([?].*)?$'
    )
  `;
}

/** يتحقق من إعلان قادم من الزاحف وينظفه. يعيد null إن كان غير صالح. */
export function normalizeIncomingListing(raw, { detectGov, usdRate = 1500 } = {}) {
  const url = safeHttpUrl(raw?.url);
  const title = cleanPlainText(raw?.title, 160);
  const section = SECTIONS.includes(raw?.section) ? raw.section : null;
  if (!url || !title || !section) return null;
  const description = cleanPlainText(raw.description, 600);
  const amount = Number(raw.priceAmount);
  const currency = String(raw.currency || '').toUpperCase();
  let priceIQD = null;
  if (Number.isFinite(amount) && amount > 0) {
    if (currency === 'IQD') priceIQD = Math.round(amount);
    else if (currency === 'USD') priceIQD = Math.round(amount * usdRate);
  }
  const deal = raw.deal === 'rent' ? 'rent' : 'sale';
  if (priceIQD && !isPlausiblePrice(priceIQD, section, deal === 'rent')) priceIQD = null;
  const place = cleanPlainText(`${raw.region || ''} ${raw.city || ''}`, 120);
  const gov = detectGov ? detectGov(`${place} ${title} ${description}`) : null;
  const posted = raw.postedAt ? new Date(raw.postedAt) : null;
  return {
    url,
    source: cleanPlainText(raw.source, 40),
    sourceName: cleanPlainText(raw.sourceName, 60) || cleanPlainText(raw.source, 40),
    section,
    title,
    description,
    priceIQD,
    priceAmount: Number.isFinite(amount) && amount > 0 ? amount : null,
    currency: priceIQD ? currency : null,
    deal,
    governorate: gov ? gov.governorate : null,
    city: cleanPlainText(raw.city, 80) || null,
    // المساحة من البيانات المنظمة، وإلا من نص الإعلان ("150 متر")
    areaSqm:
      Number(raw.areaSqm) > 0
        ? Number(raw.areaSqm)
        : section === 'realestate'
          ? extractRealEstateSpecs(`${title} ${description}`).areaSqm || null
          : null,
    rooms: Number.isInteger(Number(raw.rooms)) && Number(raw.rooms) > 0 ? Number(raw.rooms) : null,
    condition: raw.condition === 'new' || raw.condition === 'used' ? raw.condition : null,
    category: cleanPlainText(raw.category, 80) || null,
    imageUrl: safeHttpUrl(raw.imageUrl),
    postedAt: posted && Number.isFinite(posted.getTime()) && posted.getTime() <= Date.now() + 86400000 ? posted.toISOString() : null
  };
}

/** يحول سجل فهرس إلى عرض بنفس شكل عروض البحث الحي لتعرضه الواجهة. */
export function listingToOffer(row) {
  const specs = {};
  if (row.areaSqm) specs.areaSqm = Number(row.areaSqm);
  if (row.rooms) specs.rooms = Number(row.rooms);
  if (row.section === 'realestate') specs.dealType = row.deal === 'rent' ? 'إيجار' : 'بيع';
  return {
    id: `idx-${Buffer.from(row.url).toString('base64url').slice(-22)}`,
    source: 'indexed',
    section: row.section,
    specs,
    title: row.title,
    category: row.category || (row.section === 'cars' ? 'سيارات' : row.section === 'realestate' ? 'عقارات' : 'سلع وأجهزة'),
    keywords: [],
    platform: 'google',
    sourceHost: row.source,
    storeName: row.sourceName,
    verified: false,
    allowsInspection: null,
    trustRating: null,
    reviewsCount: 0,
    priceIQD: row.priceIQD ? Number(row.priceIQD) : null,
    priceBasis: row.currency || 'IQD',
    amountUSD: row.currency === 'USD' ? Number(row.priceAmount) : null,
    priceSource: 'listing_structured_data',
    priceIsRent: row.deal === 'rent',
    isListingPage: false,
    deliveryLocalIQD: null,
    deliveryNationalIQD: null,
    governorate: row.governorate || 'baghdad',
    district: row.city || '',
    locationDetected: Boolean(row.governorate),
    phone: null,
    snippet: row.description || '',
    directUrl: row.url,
    postedAgo: null,
    postedAt: row.postedAt ? new Date(row.postedAt).toISOString() : null,
    firstSeenAt: row.firstSeen ? new Date(row.firstSeen).toISOString() : null,
    imageUrl: row.imageUrl || null,
    imageIsIllustrative: false
  };
}

/** دليل السعر: يختار مجموعة المقارنة الغالبة بين الأسعار المطابقة ويحسب إحصاءاتها. */
export function buildPriceGuide(query, section, observations) {
  const intent = queryIntent(query);
  const relevant = observations
    .filter((o) => isRelevantToQuery(query, o.title))
    .map((o) => {
      if (section !== 'realestate') return o;
      // نوع العقار من العنوان إن ذكره (أدق من مفتاح قديم حُفظ بقواعد سابقة)
      const fromTitle = comparisonGroupFor({ section, title: o.title, snippet: '', specs: {} }).key;
      return fromTitle.endsWith('|any') ? o : { ...o, groupKey: fromTitle };
    })
    // لا تُخلط أرض ببيوت ولا إيجار ببيع حين يحدد الباحث ما يريد
    .filter((o) => !conflictsWithIntent(o.groupKey, intent));
  if (!relevant.length) return { count: 0, query, section };
  const groups = new Map();
  for (const o of relevant) {
    if (!groups.has(o.groupKey)) groups.set(o.groupKey, []);
    groups.get(o.groupKey).push(o);
  }
  const [groupKey, members] = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  const stats = computePriceStats(members.map((m) => Number(m.priceIQD)));
  const perSqm = computePriceStats(members.filter((m) => Number(m.areaSqm) > 0).map((m) => Number(m.priceIQD) / Number(m.areaSqm)));
  const label = comparisonGroupFor({ section, title: members[0].title, snippet: '', specs: {} }).label;
  const byKind = members.reduce((acc, m) => ({ ...acc, [m.priceKind]: (acc[m.priceKind] || 0) + 1 }), {});
  const latest = members.reduce((t, m) => Math.max(t, Date.parse(m.observedAt) || 0), 0);
  return {
    query,
    section,
    groupKey,
    label,
    count: stats.count,
    enough: stats.count >= MIN_COMPARABLE_OFFERS,
    median: Math.round(stats.median),
    q1: Math.round(stats.q1),
    q3: Math.round(stats.q3),
    min: Math.round(stats.inlierMin),
    max: Math.round(stats.inlierMax),
    outlierCount: stats.outlierCount,
    perSqmMedian: perSqm && perSqm.count >= MIN_COMPARABLE_OFFERS ? Math.round(perSqm.median) : null,
    perSqmQ1: perSqm && perSqm.count >= MIN_COMPARABLE_OFFERS ? Math.round(perSqm.q1) : null,
    perSqmQ3: perSqm && perSqm.count >= MIN_COMPARABLE_OFFERS ? Math.round(perSqm.q3) : null,
    perSqmCount: perSqm ? perSqm.count : 0,
    byKind,
    windowDays: GUIDE_WINDOW_DAYS,
    lastObservedAt: latest ? new Date(latest).toISOString() : null
  };
}

const rowToObservation = (r) => ({
  url: r.url,
  title: r.title,
  groupKey: r.group_key ?? r.groupKey,
  priceIQD: Number(r.price_iqd ?? r.priceIQD),
  areaSqm: r.area_sqm ?? r.areaSqm ?? null,
  priceKind: r.price_kind ?? r.priceKind,
  governorate: r.governorate ?? null,
  observedAt: r.observed_at ?? r.observedAt
});

export function createListingIndex({ sql = null } = {}) {
  const mem = { listings: new Map(), observations: new Map() };

  async function recordObservation(o) {
    if (!(Number(o.priceIQD) > 0) || !o.url || !SECTIONS.includes(o.section)) return;
    const groupKey = comparisonGroupFor({ section: o.section, title: o.title, snippet: o.snippet || '', specs: o.specs || {} }).key;
    const row = {
      url: o.url,
      source: o.source,
      section: o.section,
      title: o.title,
      groupKey,
      priceIQD: Math.round(Number(o.priceIQD)),
      areaSqm: Number(o.areaSqm) > 0 ? Number(o.areaSqm) : null,
      governorate: o.governorate || null,
      priceKind: o.priceKind,
      observedAt: new Date().toISOString()
    };
    if (!sql) {
      mem.observations.set(row.url, row);
      return;
    }
    await sql`
      INSERT INTO dalal_iraq_price_observations (url, source, section, title, group_key, price_iqd, area_sqm, governorate, price_kind, observed_at)
      VALUES (${row.url}, ${row.source}, ${row.section}, ${row.title}, ${row.groupKey}, ${row.priceIQD}, ${row.areaSqm}, ${row.governorate}, ${row.priceKind}, NOW())
      ON CONFLICT (url) DO UPDATE SET price_iqd = EXCLUDED.price_iqd, title = EXCLUDED.title, group_key = EXCLUDED.group_key,
        area_sqm = EXCLUDED.area_sqm, governorate = EXCLUDED.governorate, observed_at = NOW()
    `;
  }

  return {
    /** يحفظ إعلانات الزاحف (إدراج أو تحديث) ويسجل أسعارها في ذاكرة الأسعار. */
    async upsertListings(listings) {
      let saved = 0;
      for (const l of listings) {
        if (!sql) {
          const prev = mem.listings.get(l.url);
          mem.listings.set(l.url, { ...l, firstSeen: prev?.firstSeen || new Date().toISOString(), lastSeen: new Date().toISOString() });
        } else {
          await sql`
            INSERT INTO dalal_iraq_listings (url, source, source_name, section, title, description, price_iqd, price_amount, currency, deal,
              governorate, city, area_sqm, rooms, item_condition, category, image_url, posted_at)
            VALUES (${l.url}, ${l.source}, ${l.sourceName}, ${l.section}, ${l.title}, ${l.description}, ${l.priceIQD}, ${l.priceAmount}, ${l.currency}, ${l.deal},
              ${l.governorate}, ${l.city}, ${l.areaSqm}, ${l.rooms}, ${l.condition}, ${l.category}, ${l.imageUrl}, ${l.postedAt})
            ON CONFLICT (url) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, price_iqd = EXCLUDED.price_iqd,
              price_amount = EXCLUDED.price_amount, currency = EXCLUDED.currency, deal = EXCLUDED.deal, governorate = EXCLUDED.governorate,
              city = EXCLUDED.city, area_sqm = EXCLUDED.area_sqm, rooms = EXCLUDED.rooms, item_condition = EXCLUDED.item_condition,
              category = EXCLUDED.category, image_url = EXCLUDED.image_url, posted_at = COALESCE(EXCLUDED.posted_at, dalal_iraq_listings.posted_at),
              last_seen = NOW()
          `;
        }
        saved += 1;
        if (l.priceIQD && l.deal === 'sale') {
          await recordObservation({ ...l, priceKind: 'declared' });
        }
      }
      return saved;
    },

    /** يسجل أسعار الإعلانات الفردية من نتائج البحث الحي (السعر تقديري من المقتطف). */
    async recordLiveOffers(offers) {
      let n = 0;
      for (const o of offers || []) {
        if (o.isListingPage || o.priceIsRent || !(Number(o.priceIQD) > 0) || !o.directUrl) continue;
        await recordObservation({
          url: o.directUrl,
          source: o.sourceHost || o.platform || 'web',
          section: o.section,
          title: o.title,
          snippet: o.snippet,
          specs: o.specs,
          priceIQD: o.priceIQD,
          areaSqm: o.specs?.areaSqm,
          governorate: o.locationDetected ? o.governorate : null,
          priceKind: 'estimated'
        });
        n += 1;
      }
      return n;
    },

    /** بحث مجاني في الفهرس. الأحدث أولاً، ومع تفضيل محافظة المستخدم. */
    async search({ query, section = 'all', governorate = null, limit = 30 }) {
      let rows;
      if (!sql) {
        rows = [...mem.listings.values()].filter((l) => section === 'all' || l.section === section);
      } else {
        const raw = await sql`
          SELECT url, source, source_name AS "sourceName", section, title, description, price_iqd AS "priceIQD", price_amount AS "priceAmount",
                 currency, deal, governorate, city, area_sqm AS "areaSqm", rooms, category, image_url AS "imageUrl",
                 posted_at AS "postedAt", first_seen AS "firstSeen"
          FROM dalal_iraq_listings
          WHERE (${section} = 'all' OR section = ${section}) AND last_seen > NOW() - INTERVAL '45 days'
          ORDER BY COALESCE(posted_at, first_seen) DESC
          LIMIT ${CANDIDATE_LIMIT}
        `;
        rows = raw;
      }
      const hits = rows.filter((r) => isRelevantToQuery(query, `${r.title} ${r.description || ''} ${r.category || ''}`));
      const when = (r) => Date.parse(r.postedAt || r.firstSeen || 0) || 0;
      hits.sort((a, b) => Number(b.governorate === governorate) - Number(a.governorate === governorate) || when(b) - when(a));
      return hits.slice(0, limit).map(listingToOffer);
    },

    /** دليل السعر لسلعة خلال آخر GUIDE_WINDOW_DAYS يوماً. */
    /**
     * دليل السعر. مع governorate: يُفضَّل سعر المحافظة نفسها إن توفرت 3 أسعار مماثلة على الأقل،
     * وإلا العراق كله (scope يوضح أيهما استُخدم). العقار خصوصاً يختلف سعره كثيراً بين المحافظات.
     */
    async priceGuide({ query, section, governorate = null }) {
      let rows;
      if (!sql) {
        rows = [...mem.observations.values()].filter((o) => o.section === section);
      } else {
        rows = await sql`
          SELECT url, title, group_key, price_iqd, area_sqm, price_kind, governorate, observed_at
          FROM dalal_iraq_price_observations
          WHERE section = ${section} AND observed_at > NOW() - make_interval(days => ${GUIDE_WINDOW_DAYS}::int)
          ORDER BY observed_at DESC
          LIMIT ${CANDIDATE_LIMIT}
        `;
      }
      const all = rows.map(rowToObservation);
      if (governorate) {
        const local = buildPriceGuide(query, section, all.filter((o) => o.governorate === governorate));
        if (local.enough) return { ...local, scope: 'governorate', governorate };
      }
      return { ...buildPriceGuide(query, section, all), scope: 'iraq' };
    },

    /** إعلانات بيع العقار ذات السعر والمساحة (لدليل سعر المتر حسب المنطقة). */
    async realEstateSales() {
      if (!sql) {
        return [...mem.listings.values()]
          .filter((l) => l.section === 'realestate' && l.deal === 'sale' && l.priceIQD && l.areaSqm)
          .map((l) => ({ ...l, seenAt: l.lastSeen }));
      }
      return sql`
        SELECT title, description, price_iqd AS "priceIQD", area_sqm AS "areaSqm", governorate, city,
               COALESCE(posted_at, first_seen) AS "seenAt"
        FROM dalal_iraq_listings
        WHERE section = 'realestate' AND deal = 'sale' AND price_iqd IS NOT NULL AND area_sqm > 0
          AND last_seen > NOW() - INTERVAL '120 days'
        LIMIT 20000
      `;
    },

    async stats() {
      if (!sql) return { listings: mem.listings.size, observations: mem.observations.size };
      const [a] = await sql`SELECT COUNT(*)::int AS n FROM dalal_iraq_listings`;
      const [b] = await sql`SELECT COUNT(*)::int AS n FROM dalal_iraq_price_observations`;
      return { listings: a.n, observations: b.n };
    }
  };
}
