import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';
import { normalizeDigits, hasTerm, normalizeForMatch } from './shared/price-engine.js';
import { safeHttpUrl, safeIraqiMobile, cleanPlainText, decodeHtmlEntities } from './shared/sanitize.js';
import { parseYahooResults, buildLiveOffer } from './lib/live-results.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// مفاتيح التشغيل: كل ميزة غير مكتملة معطلة افتراضياً في الإنتاج ولا تُفعَّل إلا صراحةً.
export const FEATURE_FLAGS = Object.freeze({
  // العروض التجريبية المكتوبة يدوياً (demo/demo-offers.js) لا تظهر إلا عند DEMO_MODE=true
  demoMode: process.env.DEMO_MODE === 'true',
  // لا يوجد ربط فعلي مع بوابة دفع؛ الاشتراك المدفوع معطل حتى يُربط ويُتحقق من الدفع
  paymentsEnabled: process.env.PAYMENTS_ENABLED === 'true',
  // لا يوجد مرسل فعلي لرسائل واتساب أو تليغرام؛ التنبيهات معطلة حتى يُربط مزود إرسال
  alertsDeliveryEnabled: process.env.ALERTS_DELIVERY_ENABLED === 'true'
});

if (FEATURE_FLAGS.paymentsEnabled) {
  console.warn('تحذير: PAYMENTS_ENABLED=true لكن لا يوجد تحقق من الدفع في الخادم؛ أي رقم هاتف سيحصل على اشتراك.');
}

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// فصل البيانات التجريبية عن الإنتاج: ملفاتها لا تُقدَّم أصلاً إلا في وضع العرض التجريبي
app.use('/demo', (req, res, next) => {
  if (!FEATURE_FLAGS.demoMode) return res.status(404).end();
  return next();
});

app.use(express.static(__dirname));

function extractCleanPostgresUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  const match = trimmed.match(/postgres(?:ql)?:\/\/[^\s"'`]+/i);
  return match ? match[0].trim() : null;
}

const databaseUrl = extractCleanPostgresUrl(process.env.DATABASE_URL);
let sql = null;
if (databaseUrl) {
  try {
    sql = neon(databaseUrl);
  } catch (err) {
    console.error('Invalid DATABASE_URL format, running with in-memory fallback:', err.message);
    sql = null;
  }
}

const IRAQ_GOV_KEYWORDS = {
  baghdad: { name: 'بغداد', keywords: ['بغداد', 'المنصور', 'الكرادة', 'زيونة', 'الأعظمية', 'الكاظمية', 'الدورة', 'شارع الصناعة', 'الربيعي', 'الشورجة', 'السنك', 'النهضة', 'البياع', 'اليرموك', 'بسماية', 'الجادرية', 'العامرية', 'baghdad'] },
  basra: { name: 'البصرة', keywords: ['البصرة', 'بصرة', 'العشار', 'الجزائر', 'الجبيلة', 'الزبير', 'البراضعية', 'basra'] },
  erbil: { name: 'أربيل', keywords: ['أربيل', 'اربيل', 'عنكاوة', 'امباير', 'القرية اللبنانية', 'القرية الإيطالية', 'erbil', 'hawler'] },
  nineveh: { name: 'نينوى (الموصل)', keywords: ['الموصل', 'موصل', 'نينوى', 'المجموعة الثقافية', 'الزهور', 'mosul'] },
  najaf: { name: 'النجف الأشرف', keywords: ['النجف', 'نجف', 'الكوفة', 'حي السعد', 'حي الأمير', 'najaf'] },
  karbala: { name: 'كربلاء المقدسة', keywords: ['كربلاء', 'حي الحسين', 'حي الأسرة', 'karbala'] },
  sulaymaniyah: { name: 'السليمانية', keywords: ['السليمانية', 'سليمانية', 'سالم', 'بختياري', 'sulaymaniyah', 'slemani'] },
  dhiqar: { name: 'ذي قار (الناصرية)', keywords: ['الناصرية', 'ذي قار', 'nasiriyah'] },
  babil: { name: 'بابل (الحلة)', keywords: ['بابل', 'الحلة', 'حلة', 'babil', 'hillah'] },
  kirkuk: { name: 'كركوك', keywords: ['كركوك', 'kirkuk'] },
  anbar: { name: 'الأنبار (الرمادي)', keywords: ['الأنبار', 'الانبار', 'الرمادي', 'الفلوجة', 'anbar'] },
  diyala: { name: 'ديالى (بعقوبة)', keywords: ['ديالى', 'بعقوبة', 'diyala'] },
  wasit: { name: 'واسط (الكوت)', keywords: ['واسط', 'الكوت', 'كوت', 'wasit'] },
  salahaddin: { name: 'صلاح الدين (تكريت)', keywords: ['صلاح الدين', 'تكريت', 'سامراء'] },
  maysan: { name: 'ميسان (العمارة)', keywords: ['ميسان', 'العمارة', 'maysan'] },
  qadisiyah: { name: 'القادسية (الديوانية)', keywords: ['الديوانية', 'القادسية'] },
  muthanna: { name: 'المثنى (السماوة)', keywords: ['السماوة', 'المثنى'] },
  duhok: { name: 'دهوك', keywords: ['دهوك', 'زاخو', 'duhok'] }
};

function detectGovFromText(rawText) {
  const text = normalizeForMatch(rawText);
  for (const [govKey, govObj] of Object.entries(IRAQ_GOV_KEYWORDS)) {
    for (const kw of govObj.keywords) {
      if (hasTerm(text, kw)) {
        return { governorate: govKey, district: kw };
      }
    }
  }
  // لا نفترض محافظة المستخدم عند غياب أي دليل في النص
  return null;
}

async function fetchRealProductThumbnail(query) {
  try {
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&first=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'ar,en;q=0.9'
      },
      signal: AbortSignal.timeout(4500)
    });
    const html = await res.text();
    const murlMatch =
      html.match(/murl&quot;:&quot;(https?:\/\/[^&]+?\.(?:jpg|jpeg|png|webp))/i) ||
      html.match(/src="(https:\/\/tse\d\.mm\.bing\.net\/th\?id=[^"]+)"/i);
    if (murlMatch && murlMatch[1]) {
      return safeHttpUrl(decodeHtmlEntities(murlMatch[1]));
    }
  } catch {}
  return null;
}

async function fetchSearchResultsHtml(searchQuery) {
  const encoded = encodeURIComponent(searchQuery);
  const url = `https://search.yahoo.com/search?p=${encoded}&n=10`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'ar-IQ,ar;q=0.9,en;q=0.8'
    },
    signal: AbortSignal.timeout(6000)
  });
  if (!res.ok) throw new Error(`search provider HTTP ${res.status}`);
  return res.text();
}

// مصدر تجريبي غير مضمون (كشط صفحة نتائج ياهو). انظر تقرير مزودي البيانات قبل الاعتماد عليه.
async function searchWebEngine(searchQuery) {
  try {
    const html = await fetchSearchResultsHtml(searchQuery);
    const results = parseYahooResults(html);
    // استجابة HTTP ناجحة لا تعني نجاح المصدر: قد تكون صفحة تحقق أو بنية تغيرت
    if (results.length === 0) {
      console.warn(`Live search: provider returned ${html.length} bytes but 0 parsable results`);
    }
    return { ok: results.length > 0, httpOk: true, results, bytes: html.length };
  } catch (err) {
    console.error('Live search error:', err.message);
    return { ok: false, httpOk: false, results: [], bytes: 0 };
  }
}

async function initNeonDatabase() {
  if (!sql) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS dalal_iraq_offers (
        id SERIAL PRIMARY KEY,
        external_id TEXT UNIQUE,
        section TEXT DEFAULT 'products',
        specs JSONB DEFAULT '{}'::jsonb,
        title TEXT NOT NULL,
        category TEXT DEFAULT 'عام',
        keywords TEXT[] DEFAULT '{}',
        image_url TEXT,
        platform TEXT NOT NULL,
        store_name TEXT NOT NULL,
        verified BOOLEAN DEFAULT true,
        allows_inspection BOOLEAN DEFAULT true,
        trust_rating NUMERIC(3,2) DEFAULT 4.8,
        reviews_count INTEGER DEFAULT 15,
        price_iqd BIGINT,
        delivery_local_iqd INTEGER DEFAULT 4000,
        delivery_national_iqd INTEGER DEFAULT 7000,
        governorate TEXT NOT NULL,
        district TEXT DEFAULT 'المركز',
        delivery TEXT DEFAULT 'توصيل متوفر',
        phone TEXT DEFAULT '',
        snippet TEXT DEFAULT '',
        direct_url TEXT,
        posted_ago TEXT DEFAULT 'حديثاً',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`ALTER TABLE dalal_iraq_offers ADD COLUMN IF NOT EXISTS section TEXT DEFAULT 'products'`;
    await sql`ALTER TABLE dalal_iraq_offers ADD COLUMN IF NOT EXISTS specs JSONB DEFAULT '{}'::jsonb`;
    await sql`ALTER TABLE dalal_iraq_offers ALTER COLUMN price_iqd TYPE BIGINT`;
    await sql`ALTER TABLE dalal_iraq_offers ADD COLUMN IF NOT EXISTS allows_inspection BOOLEAN DEFAULT true`;
    await sql`ALTER TABLE dalal_iraq_offers ADD COLUMN IF NOT EXISTS trust_rating NUMERIC(3,2) DEFAULT 4.8`;
    await sql`ALTER TABLE dalal_iraq_offers ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 15`;
    await sql`ALTER TABLE dalal_iraq_offers ADD COLUMN IF NOT EXISTS delivery_local_iqd INTEGER DEFAULT 4000`;
    await sql`ALTER TABLE dalal_iraq_offers ADD COLUMN IF NOT EXISTS delivery_national_iqd INTEGER DEFAULT 7000`;
    await sql`ALTER TABLE dalal_iraq_offers ADD COLUMN IF NOT EXISTS direct_url TEXT`;

    await sql`
      CREATE TABLE IF NOT EXISTS dalal_iraq_alerts (
        id SERIAL PRIMARY KEY,
        keyword TEXT NOT NULL,
        target_price_iqd BIGINT NOT NULL,
        governorate TEXT NOT NULL,
        contact_phone TEXT NOT NULL,
        contact_channel TEXT DEFAULT 'whatsapp',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    await sql`ALTER TABLE dalal_iraq_alerts ALTER COLUMN target_price_iqd TYPE BIGINT`;

    await sql`
      CREATE TABLE IF NOT EXISTS dalal_iraq_reviews (
        id SERIAL PRIMARY KEY,
        store_name TEXT NOT NULL,
        platform TEXT DEFAULT 'facebook',
        rating INTEGER NOT NULL,
        allows_inspection BOOLEAN DEFAULT true,
        comment TEXT DEFAULT '',
        reviewer_gov TEXT DEFAULT 'baghdad',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS dalal_iraq_subscriptions (
        id SERIAL PRIMARY KEY,
        phone TEXT UNIQUE NOT NULL,
        plan_type TEXT DEFAULT 'shopper_1000_iqd',
        payment_method TEXT DEFAULT 'zaincash',
        status TEXT DEFAULT 'active',
        expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS dalal_iraq_searches (
        id SERIAL PRIMARY KEY,
        query TEXT NOT NULL,
        governorate TEXT NOT NULL,
        max_budget BIGINT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
  } catch (err) {
    console.error('Neon DB initialization warning:', err.message);
  }
}

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', service: 'iraq-price-radar', neonConnected: Boolean(sql) });
});

app.get('/api/config', (_req, res) => {
  res.json({
    ...FEATURE_FLAGS,
    liveSearchProvider: 'yahoo-html-experimental',
    databaseConnected: Boolean(sql)
  });
});

app.get('/api/live-search', async (req, res) => {
  const query = cleanPlainText(req.query.q, 120);
  const gov = IRAQ_GOV_KEYWORDS[String(req.query.gov || '')] ? String(req.query.gov) : 'baghdad';
  const sectionRaw = String(req.query.section || 'all').trim();
  const sectionHint = ['all', 'products', 'cars', 'realestate'].includes(sectionRaw) ? sectionRaw : 'all';
  const rate100 = Number(req.query.rate);
  const usdRate = rate100 >= 100000 && rate100 <= 300000 ? rate100 / 100 : 1500;
  const govName = IRAQ_GOV_KEYWORDS[gov].name.split(' ')[0];

  if (!query) return res.json({ offers: [] });

  let extraContext = 'السعر في العراق دينار OR د.ع';
  if (sectionHint === 'cars') extraContext = 'للبيع في العراق السعر دفتر OR ورقة OR مليون';
  else if (sectionHint === 'realestate') extraContext = 'عقار للبيع او ايجار في العراق السعر مليون OR دفتر';

  try {
    const [storeResults, fbResults, igResults, thumbnailUrl] = await Promise.all([
      searchWebEngine(`${query} ${extraContext} ${govName}`),
      searchWebEngine(`site:facebook.com "${query}" العراق ${govName} السعر`),
      searchWebEngine(`site:instagram.com "${query}" العراق ${govName}`),
      fetchRealProductThumbnail(query)
    ]);

    const merged = [...storeResults.results, ...fbResults.results, ...igResults.results];
    const seenUrls = new Set();
    const uniqueOffers = [];
    for (const raw of merged) {
      if (seenUrls.has(raw.url)) continue;
      seenUrls.add(raw.url);
      const offer = buildLiveOffer(raw, { query, sectionHint, detectGov: detectGovFromText, usdRate, thumbnailUrl });
      if (offer) uniqueOffers.push(offer);
    }

    res.json({
      query,
      governorate: gov,
      provider: 'yahoo-html-experimental',
      providerOk: storeResults.ok || fbResults.ok || igResults.ok,
      // تشخيص بلا بيانات حساسة: كم نتيجة خام قُرئت من كل استعلام، وكم بقي بعد فلاتر الصلة والقسم
      diagnostics: {
        rawCounts: [storeResults, fbResults, igResults].map((r) => r.results.length),
        httpOk: [storeResults, fbResults, igResults].map((r) => r.httpOk),
        responseBytes: [storeResults, fbResults, igResults].map((r) => r.bytes),
        kept: uniqueOffers.length,
        // عند ?debug=1 فقط: عناوين النتائج الخام العامة لتشخيص سبب الاستبعاد (لا بيانات مستخدمين)
        ...(req.query.debug === '1'
          ? { sampleTitles: merged.slice(0, 12).map((r) => `${r.host} | ${r.title.slice(0, 90)}`) }
          : {})
      },
      thumbnailUrl: safeHttpUrl(thumbnailUrl),
      offers: uniqueOffers
    });
  } catch (err) {
    res.status(500).json({ error: 'live_search_failed', offers: [] });
  }
});

const ALLOWED_SECTIONS = ['products', 'cars', 'realestate'];
const ALLOWED_PLATFORMS = ['facebook', 'instagram', 'google'];

function sanitizeSpecs(specs) {
  if (!specs || typeof specs !== 'object' || Array.isArray(specs)) return {};
  const out = {};
  for (const [k, v] of Object.entries(specs).slice(0, 12)) {
    const key = cleanPlainText(k, 30);
    if (!key) continue;
    if (typeof v === 'number' && Number.isFinite(v)) out[key] = v;
    else if (typeof v === 'string') out[key] = cleanPlainText(v, 80);
  }
  return out;
}

function toPositiveIntOrNull(value, max = 100_000_000_000) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && n <= max ? Math.round(n) : null;
}

// التقييم يُحسب من جدول المراجعات الفعلية فقط، وليس من القيمة الافتراضية القديمة 4.8 في العمود trust_rating
app.get('/api/offers', async (_req, res) => {
  if (!sql) return res.json({ source: 'memory', offers: [] });
  try {
    const rows = await sql`
      SELECT
        COALESCE(o.external_id, 'db-' || o.id::text) AS id,
        COALESCE(o.section, 'products') AS section,
        COALESCE(o.specs, '{}'::jsonb) AS specs,
        o.title,
        o.category,
        o.keywords,
        o.image_url AS "imageUrl",
        o.platform,
        o.store_name AS "storeName",
        o.allows_inspection AS "allowsInspection",
        r.avg_rating::float AS "trustRating",
        COALESCE(r.review_count, 0)::int AS "reviewsCount",
        o.price_iqd::bigint AS "priceIQD",
        o.delivery_local_iqd AS "deliveryLocalIQD",
        o.delivery_national_iqd AS "deliveryNationalIQD",
        o.governorate,
        o.district,
        o.delivery,
        o.phone,
        o.snippet,
        o.direct_url AS "directUrl",
        o.created_at AS "postedAt"
      FROM dalal_iraq_offers o
      LEFT JOIN (
        SELECT store_name, ROUND(AVG(rating)::numeric, 1) AS avg_rating, COUNT(*) AS review_count
        FROM dalal_iraq_reviews
        GROUP BY store_name
      ) r ON r.store_name = o.store_name
      ORDER BY o.created_at DESC
      LIMIT 100;
    `;
    res.json({
      source: 'neon',
      offers: rows.map((r) => ({
        ...r,
        source: 'user',
        verified: false,
        priceIQD: r.priceIQD ? Number(r.priceIQD) : null,
        directUrl: safeHttpUrl(r.directUrl),
        imageUrl: safeHttpUrl(r.imageUrl),
        phone: safeIraqiMobile(r.phone)
      }))
    });
  } catch (err) {
    console.error('GET /api/offers failed:', err.message);
    res.status(500).json({ error: 'offers_unavailable', offers: [] });
  }
});

app.post('/api/offers', async (req, res) => {
  const body = req.body || {};
  const title = cleanPlainText(body.title, 160);
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const section = ALLOWED_SECTIONS.includes(body.section) ? body.section : 'products';
  const platform = ALLOWED_PLATFORMS.includes(body.platform) ? body.platform : 'facebook';
  const governorate = IRAQ_GOV_KEYWORDS[body.governorate] ? body.governorate : 'baghdad';
  const keywords = Array.isArray(body.keywords) ? body.keywords.slice(0, 40).map((k) => cleanPlainText(k, 40)).filter(Boolean) : [title];
  const offer = {
    section,
    specs: sanitizeSpecs(body.specs),
    title,
    category: cleanPlainText(body.category, 60) || 'عروض التجار',
    keywords,
    imageUrl: safeHttpUrl(body.imageUrl),
    directUrl: safeHttpUrl(body.directUrl),
    platform,
    storeName: cleanPlainText(body.storeName, 120) || 'معلن غير مسمى',
    allowsInspection: Boolean(body.allowsInspection),
    priceIQD: toPositiveIntOrNull(body.priceIQD),
    deliveryLocalIQD: section === 'products' ? toPositiveIntOrNull(body.deliveryLocalIQD, 1_000_000) : null,
    deliveryNationalIQD: section === 'products' ? toPositiveIntOrNull(body.deliveryNationalIQD, 1_000_000) : null,
    governorate,
    district: cleanPlainText(body.district, 80) || 'المركز',
    delivery: cleanPlainText(body.delivery, 160),
    phone: safeIraqiMobile(body.phone) || '',
    snippet: cleanPlainText(body.snippet, 1000)
  };

  if (!sql) return res.status(503).json({ saved: false, source: 'memory', error: 'database_unavailable' });

  try {
    const extId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // verified=false دائماً: العروض المضافة من المستخدمين لم يتحقق منها أحد
    const inserted = await sql`
      INSERT INTO dalal_iraq_offers (
        external_id, section, specs, title, category, keywords, image_url, platform, store_name,
        verified, allows_inspection, trust_rating, reviews_count, price_iqd, delivery_local_iqd, delivery_national_iqd,
        governorate, district, delivery, phone, snippet, direct_url, posted_ago
      ) VALUES (
        ${extId}, ${offer.section}, ${JSON.stringify(offer.specs)}, ${offer.title}, ${offer.category},
        ${offer.keywords}, ${offer.imageUrl}, ${offer.platform}, ${offer.storeName}, false, ${offer.allowsInspection},
        NULL, 0, ${offer.priceIQD}, ${offer.deliveryLocalIQD}, ${offer.deliveryNationalIQD},
        ${offer.governorate}, ${offer.district}, ${offer.delivery}, ${offer.phone}, ${offer.snippet}, ${offer.directUrl}, NULL
      )
      RETURNING external_id AS id, created_at AS "postedAt";
    `;
    const row = inserted[0];
    res.status(201).json({
      saved: true,
      source: 'neon',
      offer: { ...offer, id: row.id, postedAt: row.postedAt, source: 'user', verified: false, trustRating: null, reviewsCount: 0 }
    });
  } catch (err) {
    console.error('POST /api/offers failed:', err.message);
    res.status(500).json({ error: 'offer_save_failed' });
  }
});

// التنبيهات: كل مستخدم يرى ويحذف تنبيهاته فقط عبر رقم هاتفه، ولا تُكشف أرقام الآخرين.
app.get('/api/alerts', async (req, res) => {
  const phone = safeIraqiMobile(normalizeDigits(String(req.query.phone || '')));
  if (!phone) return res.json({ alerts: [], deliveryEnabled: FEATURE_FLAGS.alertsDeliveryEnabled });
  if (!sql) return res.json({ alerts: [], deliveryEnabled: FEATURE_FLAGS.alertsDeliveryEnabled });
  try {
    const rows = await sql`
      SELECT id, keyword, target_price_iqd::bigint AS "targetPriceIQD", governorate,
             contact_phone AS "contactPhone", contact_channel AS "contactChannel", created_at AS "createdAt"
      FROM dalal_iraq_alerts
      WHERE contact_phone = ${phone}
      ORDER BY created_at DESC
      LIMIT 30;
    `;
    res.json({ alerts: rows.map((r) => ({ ...r, targetPriceIQD: Number(r.targetPriceIQD) })), deliveryEnabled: FEATURE_FLAGS.alertsDeliveryEnabled });
  } catch (err) {
    console.error('GET /api/alerts failed:', err.message);
    res.status(500).json({ error: 'alerts_unavailable', alerts: [] });
  }
});

app.post('/api/alerts', async (req, res) => {
  if (!FEATURE_FLAGS.alertsDeliveryEnabled) {
    return res.status(503).json({ saved: false, error: 'alerts_delivery_disabled' });
  }
  const { keyword, targetPriceIQD, governorate = 'baghdad', contactPhone, contactChannel = 'whatsapp' } = req.body || {};
  const cleanKeyword = cleanPlainText(keyword, 120);
  const target = toPositiveIntOrNull(targetPriceIQD);
  const phone = safeIraqiMobile(normalizeDigits(String(contactPhone || '')));
  if (!cleanKeyword || !target || !phone) {
    return res.status(400).json({ error: 'Missing required alert fields' });
  }
  if (!sql) return res.status(503).json({ saved: false, error: 'database_unavailable' });
  try {
    const rows = await sql`
      INSERT INTO dalal_iraq_alerts (keyword, target_price_iqd, governorate, contact_phone, contact_channel)
      VALUES (${cleanKeyword}, ${target}, ${IRAQ_GOV_KEYWORDS[governorate] ? governorate : 'baghdad'}, ${phone},
              ${contactChannel === 'telegram' ? 'telegram' : 'whatsapp'})
      RETURNING id, keyword, target_price_iqd::bigint AS "targetPriceIQD", governorate,
                contact_phone AS "contactPhone", contact_channel AS "contactChannel";
    `;
    res.status(201).json({ saved: true, alert: rows[0] });
  } catch (err) {
    console.error('POST /api/alerts failed:', err.message);
    res.status(500).json({ error: 'alert_save_failed' });
  }
});

app.delete('/api/alerts/:id', async (req, res) => {
  const phone = safeIraqiMobile(normalizeDigits(String(req.query.phone || '')));
  const id = toPositiveIntOrNull(req.params.id, 2_147_483_647);
  if (!phone || !id) return res.status(400).json({ deleted: false, error: 'phone_and_id_required' });
  if (!sql) return res.status(503).json({ deleted: false, error: 'database_unavailable' });
  try {
    const rows = await sql`DELETE FROM dalal_iraq_alerts WHERE id = ${id} AND contact_phone = ${phone} RETURNING id`;
    res.json({ deleted: rows.length > 0 });
  } catch (err) {
    console.error('DELETE /api/alerts failed:', err.message);
    res.status(500).json({ error: 'alert_delete_failed' });
  }
});

app.get('/api/reviews', async (req, res) => {
  if (!sql) return res.json({ reviews: [] });
  const storeName = cleanPlainText(req.query.store, 120);
  try {
    const rows = storeName
      ? await sql`SELECT id, store_name, platform, rating, allows_inspection, comment, reviewer_gov, created_at FROM dalal_iraq_reviews WHERE store_name = ${storeName} ORDER BY created_at DESC LIMIT 20`
      : await sql`SELECT id, store_name, platform, rating, allows_inspection, comment, reviewer_gov, created_at FROM dalal_iraq_reviews ORDER BY created_at DESC LIMIT 30`;
    res.json({ reviews: rows });
  } catch (err) {
    console.error('GET /api/reviews failed:', err.message);
    res.status(500).json({ error: 'reviews_unavailable', reviews: [] });
  }
});

app.post('/api/reviews', async (req, res) => {
  const { storeName, platform = 'facebook', rating = 5, allowsInspection = true, comment = '', reviewerGov = 'baghdad' } = req.body || {};
  const cleanStore = cleanPlainText(storeName, 120);
  const cleanRating = Math.round(Number(rating));
  if (!cleanStore) return res.status(400).json({ error: 'Store name required' });
  if (!(cleanRating >= 1 && cleanRating <= 5)) return res.status(400).json({ error: 'rating_must_be_1_to_5' });
  if (!sql) return res.status(503).json({ saved: false, error: 'database_unavailable' });
  try {
    const inserted = await sql`
      INSERT INTO dalal_iraq_reviews (store_name, platform, rating, allows_inspection, comment, reviewer_gov)
      VALUES (${cleanStore}, ${ALLOWED_PLATFORMS.includes(platform) ? platform : 'facebook'}, ${cleanRating},
              ${Boolean(allowsInspection)}, ${cleanPlainText(comment, 600)}, ${IRAQ_GOV_KEYWORDS[reviewerGov] ? reviewerGov : 'baghdad'})
      RETURNING id, store_name, platform, rating, allows_inspection, comment, reviewer_gov, created_at;
    `;
    res.status(201).json({ saved: true, review: inserted[0] });
  } catch (err) {
    console.error('POST /api/reviews failed:', err.message);
    res.status(500).json({ error: 'review_save_failed' });
  }
});

app.get('/api/subscription-status', async (req, res) => {
  const cleanPhone = normalizeDigits(String(req.query.phone || '')).replace(/[^\d]/g, '');
  if (!cleanPhone) return res.json({ active: false });
  // لا اشتراك وهمياً: بدون بوابة دفع مفعلة أو بدون قاعدة بيانات لا توجد عضوية فعالة
  if (!FEATURE_FLAGS.paymentsEnabled) return res.json({ active: false, paymentsEnabled: false });
  if (!sql) return res.json({ active: false, error: 'database_unavailable' });
  try {
    const rows = await sql`
      SELECT
        phone,
        plan_type AS "planType",
        payment_method AS "paymentMethod",
        status,
        expires_at AS "expiresAt",
        GREATEST(0, CEIL(EXTRACT(EPOCH FROM (expires_at - NOW())) / 86400.0))::int AS "daysRemaining"
      FROM dalal_iraq_subscriptions
      WHERE phone = ${cleanPhone}
      LIMIT 1;
    `;
    if (rows.length === 0) {
      return res.json({ active: false, found: false });
    }
    const sub = rows[0];
    const isActive = sub.status === 'active' && sub.daysRemaining > 0;
    return res.json({
      active: isActive,
      found: true,
      phone: sub.phone,
      planType: sub.planType,
      paymentMethod: sub.paymentMethod,
      expiresAt: sub.expiresAt,
      daysRemaining: sub.daysRemaining
    });
  } catch (err) {
    console.error('GET /api/subscription-status failed:', err.message);
    return res.status(500).json({ active: false, error: 'subscription_status_unavailable' });
  }
});

app.post('/api/subscribe', async (req, res) => {
  if (!FEATURE_FLAGS.paymentsEnabled) {
    return res.status(503).json({ subscribed: false, error: 'payments_disabled' });
  }
  const rawPhone = req.body?.phone || '';
  const phone = safeIraqiMobile(normalizeDigits(String(rawPhone)));
  const { planType = 'shopper_1000_iqd', paymentMethod = 'zaincash' } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'Phone number required' });
  if (!sql) return res.status(503).json({ subscribed: false, error: 'database_unavailable' });
  try {
    // تنبيه: لا يوجد هنا تحقق من إتمام الدفع. يجب ربط بوابة الدفع والتحقق من معاملتها قبل التفعيل.
    const rows = await sql`
      INSERT INTO dalal_iraq_subscriptions (phone, plan_type, payment_method, status, expires_at)
      VALUES (${phone}, ${cleanPlainText(planType, 40)}, ${cleanPlainText(paymentMethod, 40)}, 'active', NOW() + INTERVAL '30 days')
      ON CONFLICT (phone) DO UPDATE
      SET plan_type = EXCLUDED.plan_type,
          payment_method = EXCLUDED.payment_method,
          status = 'active',
          expires_at = NOW() + INTERVAL '30 days'
      RETURNING
        phone,
        plan_type AS "planType",
        payment_method AS "paymentMethod",
        expires_at AS "expiresAt",
        30 AS "daysRemaining";
    `;
    res.status(201).json({ subscribed: true, subscription: rows[0] });
  } catch (err) {
    console.error('POST /api/subscribe failed:', err.message);
    res.status(500).json({ error: 'subscribe_failed' });
  }
});

app.post('/api/searches', async (req, res) => {
  if (!sql) return res.json({ logged: false });
  const { query, governorate, maxBudget } = req.body || {};
  if (!query) return res.json({ logged: false });
  try {
    await sql`
      INSERT INTO dalal_iraq_searches (query, governorate, max_budget)
      VALUES (${cleanPlainText(query, 120)}, ${IRAQ_GOV_KEYWORDS[governorate] ? governorate : 'baghdad'}, ${toPositiveIntOrNull(maxBudget)});
    `;
    res.json({ logged: true });
  } catch {
    res.json({ logged: false });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Iraq Price Radar server running on http://0.0.0.0:${PORT}`);
  initNeonDatabase().catch((err) => {
    console.error('Database init warning:', err.message);
  });
});
