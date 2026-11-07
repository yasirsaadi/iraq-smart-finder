import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';
import { normalizeDigits, hasTerm, normalizeForMatch } from './shared/price-engine.js';
import { safeHttpUrl, safeIraqiMobile, cleanPlainText, decodeHtmlEntities } from './shared/sanitize.js';
import { parseYahooResults, buildLiveOffer } from './lib/live-results.js';
import { attachListingImages } from './lib/listing-images.js';
import { createSearchStore, initSearchStoreTables, readEconomicsConfig, quotaSubjectFor } from './lib/search-store.js';
import { timingSafeEqual } from 'node:crypto';
import { verifyGoogleIdToken } from './lib/google-auth.js';
import { readQiCardConfig, createQiPayment, getQiPaymentStatus, isPaymentSettled, verifyQiWebhookSignature } from './lib/qicard.js';
import {
  createAccountStore,
  initAccountTables,
  parseCookies,
  sessionCookieHeader,
  clearSessionCookieHeader,
  SESSION_COOKIE
} from './lib/accounts.js';
import { isSerperConfigured, buildSerperQueries, serperSearchRaw, needsResolve, serperResolve, mapSerperOrganic } from './lib/serper-provider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// مفاتيح التشغيل: كل ميزة غير مكتملة معطلة افتراضياً في الإنتاج ولا تُفعَّل إلا صراحةً.
// معرّف تطبيق غوغل لتسجيل الدخول: معرّف عام يظهر لكل زائر في الصفحة وليس سراً، لذا له قيمة افتراضية هنا.
// يمكن تجاوزه بمتغير البيئة GOOGLE_CLIENT_ID، أو تعطيل الدخول بضبطه على القيمة disabled.
const DEFAULT_GOOGLE_CLIENT_ID = '249349705532-ak2i17g7g579b6huvk8s1vjsuok58786.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID = (() => {
  const raw = String(process.env.GOOGLE_CLIENT_ID ?? DEFAULT_GOOGLE_CLIENT_ID).trim();
  if (raw === 'disabled') return '';
  return /^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(raw) ? raw : '';
})();
const QICARD = readQiCardConfig();
const PUBLIC_SITE_URL = String(process.env.PUBLIC_SITE_URL || '').trim().replace(/\/+$/, '');
const SUBSCRIPTION_PRICE_IQD = Number.parseInt(process.env.SUBSCRIPTION_PRICE_IQD, 10) > 0 ? Number.parseInt(process.env.SUBSCRIPTION_PRICE_IQD, 10) : 1000;
const SUBSCRIPTION_DAYS = Number.parseInt(process.env.SUBSCRIPTION_DAYS, 10) > 0 ? Number.parseInt(process.env.SUBSCRIPTION_DAYS, 10) : 30;

export const FEATURE_FLAGS = Object.freeze({
  // العروض التجريبية المكتوبة يدوياً (demo/demo-offers.js) لا تظهر إلا عند DEMO_MODE=true
  demoMode: process.env.DEMO_MODE === 'true',
  // تسجيل الدخول بحساب غوغل: يعمل عند ضبط GOOGLE_CLIENT_ID
  loginEnabled: Boolean(GOOGLE_CLIENT_ID),
  // الاشتراك المدفوع: لا يعمل إلا بثلاثة شروط معاً: تفعيل صريح + بوابة كي كارد مضبوطة + تسجيل دخول غوغل
  paymentsEnabled: process.env.PAYMENTS_ENABLED === 'true' && QICARD.configured && Boolean(GOOGLE_CLIENT_ID) && Boolean(PUBLIC_SITE_URL),
  // لا يوجد مرسل فعلي لرسائل واتساب أو تليغرام؛ التنبيهات معطلة حتى يُربط مزود إرسال
  alertsDeliveryEnabled: process.env.ALERTS_DELIVERY_ENABLED === 'true'
});

if (process.env.PAYMENTS_ENABLED === 'true' && !FEATURE_FLAGS.paymentsEnabled) {
  console.warn('PAYMENTS_ENABLED=true لكن الاشتراك بقي معطلاً: يلزم QICARD_USERNAME و QICARD_PASSWORD و QICARD_TERMINAL_ID و GOOGLE_CLIENT_ID و PUBLIC_SITE_URL.');
}
if (FEATURE_FLAGS.paymentsEnabled && QICARD.isSandbox) {
  console.warn('بوابة كي كارد تعمل على البيئة التجريبية (sandbox): لا تُحصَّل أموال حقيقية.');
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
    await sql`ALTER TABLE dalal_iraq_searches ADD COLUMN IF NOT EXISTS section TEXT DEFAULT 'all'`;
    await initSearchStoreTables(sql);
    await initAccountTables(sql);
  } catch (err) {
    console.error('Neon DB initialization warning:', err.message);
  }
}

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', service: 'iraq-price-radar', neonConnected: Boolean(sql) });
});

function liveSearchProviderName() {
  return isSerperConfigured() ? 'serper' : 'yahoo-html-experimental';
}

const ECONOMICS = readEconomicsConfig();
const searchStore = createSearchStore({ sql, config: ECONOMICS });
const accounts = createAccountStore({ sql });

// إرفاق المستخدم المسجّل (إن وُجد) بكل طلب واجهة برمجية
app.use('/api', async (req, _res, next) => {
  req.user = null;
  const token = parseCookies(req.get('cookie'))[SESSION_COOKIE];
  if (token) {
    try {
      req.user = await accounts.userForSessionToken(token);
    } catch (err) {
      console.warn('session lookup failed:', err.message);
    }
  }
  next();
});
// الأسعار تُحسب على سعر صرف ثابت وتُخزَّن مع أساسها بالدولار، والمتصفح يعيد حسابها بسعر الزائر
const STORED_USD_RATE = 1500;

// حد بسيط لكل زائر في الدقيقة: يحمي من الطلبات الآلية المتلاحقة
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_REQUESTS = 20;
const rateBuckets = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const bucket = rateBuckets.get(ip) || { start: now, count: 0 };
  if (now - bucket.start > RATE_WINDOW_MS) {
    bucket.start = now;
    bucket.count = 0;
  }
  bucket.count += 1;
  rateBuckets.set(ip, bucket);
  if (rateBuckets.size > 5000) rateBuckets.clear();
  return bucket.count > RATE_MAX_REQUESTS;
}

// عمليات المرحلة الثانية الجارية في الخلفية، حتى لا يتكرر البحث نفسه ولا يُدفع ثمنه مرتين
const liveInflight = new Map();

function toProviderResult(data, error) {
  if (error || !data) return { ok: false, httpOk: false, results: [], bytes: 0 };
  const results = mapSerperOrganic(data.organic);
  return { ok: results.length > 0, httpOk: true, results, bytes: null };
}

function liveCacheKey(query, gov, sectionHint) {
  return `${liveSearchProviderName()}|${normalizeForMatch(query)}|${gov}|${sectionHint}`;
}

function buildLivePayload({ query, gov, sectionHint, lists, provider, pending, debug = false }) {
  const merged = lists.flatMap((r) => r.results);
  const seenUrls = new Set();
  const uniqueOffers = [];
  for (const raw of merged) {
    if (seenUrls.has(raw.url)) continue;
    seenUrls.add(raw.url);
    const offer = buildLiveOffer(raw, { query, sectionHint, detectGov: detectGovFromText, usdRate: STORED_USD_RATE });
    if (offer) uniqueOffers.push(offer);
  }
  return {
    query,
    governorate: gov,
    section: sectionHint,
    provider,
    providerOk: lists.some((r) => r.ok),
    // pending=true: بقية النتائج قيد الاستكمال (روابط أصلية وصور)؛ يعيد المتصفح الطلب مع wait=1
    pending,
    // تشخيص بلا بيانات حساسة: كم نتيجة خام قُرئت من كل استعلام، وكم بقي بعد فلاتر الصلة والقسم
    diagnostics: {
      rawCounts: lists.map((r) => r.results.length),
      httpOk: lists.map((r) => r.httpOk),
      responseBytes: lists.map((r) => r.bytes),
      kept: uniqueOffers.length,
      ...(debug ? { sampleTitles: merged.slice(0, 30).map((r) => `${r.host} | ${r.title.slice(0, 90)}`) } : {})
    },
    offers: uniqueOffers
  };
}

/**
 * خط البحث عبر سيربر بمرحلتيه. يعيد { first, full } حيث full وعد يكتمل بعد استعادة الروابط والصور
 * ويُحفظ في الذاكرة المشتركة تلقائياً.
 */
async function runSerperPipeline({ query, gov, sectionHint, debug = false }) {
  const govName = IRAQ_GOV_KEYWORDS[gov].name.split(' ')[0];
  const plans = buildSerperQueries(query, govName, sectionHint);
  const raws = await Promise.all(
    plans.map((plan) =>
      serperSearchRaw(plan.q).catch((err) => {
        console.error('Serper search error:', err.message);
        return null;
      })
    )
  );
  const anyResults = raws.some((d) => d && Array.isArray(d.organic) && d.organic.length > 0);
  const pending = anyResults && !debug;
  const first = buildLivePayload({ query, gov, sectionHint, lists: raws.map((d) => toProviderResult(d, !d)), provider: 'serper', pending, debug });
  if (!pending) return { first, full: Promise.resolve(first) };

  const key = liveCacheKey(query, gov, sectionHint);
  const full = (async () => {
    const resolved = await Promise.all(raws.map((d) => (needsResolve(d) ? serperResolve(d) : d)));
    const payload = buildLivePayload({ query, gov, sectionHint, lists: resolved.map((d) => toProviderResult(d, !d)), provider: 'serper', pending: false });
    payload.offers = await attachListingImages(payload.offers, { imageQuery: `${query} ${govName}` });
    payload.diagnostics.withImages = payload.offers.filter((o) => o.imageUrl).length;
    if (payload.providerOk) await searchStore.setCached(key, payload, { query, governorate: gov, section: sectionHint });
    return payload;
  })();
  liveInflight.set(key, { first, job: full });
  full.catch(() => {}).finally(() => liveInflight.delete(key));
  return { first, full };
}

async function subscriberLimitFor(req) {
  // حصة المشترك: حساب غوغل مسجّل الدخول + اشتراك فعال مدفوع ومؤكد من بوابة الدفع
  if (!req.user) return null;
  if (FEATURE_FLAGS.paymentsEnabled) {
    try {
      const sub = await accounts.subscriptionFor(req.user.id);
      if (sub.active) return { subject: `u:${req.user.id}`, limit: ECONOMICS.subscriberNewSearchesPerMonth };
    } catch {}
  }
  return { subject: `u:${req.user.id}`, limit: ECONOMICS.freeNewSearchesPerMonth };
}

app.set('trust proxy', 1); // رندر يمرر عنوان الزائر الحقيقي عبر الوسيط

app.get('/api/config', (_req, res) => {
  res.json({
    ...FEATURE_FLAGS,
    liveSearchProvider: liveSearchProviderName(),
    databaseConnected: Boolean(sql),
    cacheTtlHours: ECONOMICS.cacheTtlHours,
    freeNewSearchesPerMonth: ECONOMICS.freeNewSearchesPerMonth,
    googleClientId: GOOGLE_CLIENT_ID || null,
    subscriptionPriceIQD: SUBSCRIPTION_PRICE_IQD,
    subscriptionDays: SUBSCRIPTION_DAYS,
    paymentsSandbox: FEATURE_FLAGS.paymentsEnabled ? QICARD.isSandbox : null
  });
});

app.get('/api/live-search', async (req, res) => {
  const query = cleanPlainText(req.query.q, 120);
  const gov = IRAQ_GOV_KEYWORDS[String(req.query.gov || '')] ? String(req.query.gov) : 'baghdad';
  const sectionRaw = String(req.query.section || 'all').trim();
  const sectionHint = ['all', 'products', 'cars', 'realestate'].includes(sectionRaw) ? sectionRaw : 'all';
  const debug = req.query.debug === '1';

  if (!query) return res.json({ offers: [] });
  if (isRateLimited(req.ip || 'unknown')) {
    return res.status(429).json({ error: 'rate_limited', providerOk: false, offers: [] });
  }

  const key = liveCacheKey(query, gov, sectionHint);

  // تسجيل البحث لقائمة الأكثر طلباً (التحديث الليلي يعتمد عليها). طلب wait=1 هو استكمال للبحث نفسه فلا يُسجَّل.
  if (sql && !debug && req.query.wait !== '1') {
    sql`INSERT INTO dalal_iraq_searches (query, governorate, section) VALUES (${query}, ${gov}, ${sectionHint})`.catch(() => {});
  }

  // ١) الذاكرة المشتركة: مجانية دائماً ولا تُحسب من حصة الزائر
  if (!debug) {
    const hit = await searchStore.getCached(key);
    if (hit) return res.json({ ...hit.value, pending: false, cached: true, cachedAt: hit.cachedAt });
  }

  // ٢) بحث مماثل قيد الاستكمال: لا رصيد جديد
  const inflight = debug ? null : liveInflight.get(key);
  if (inflight) {
    if (req.query.wait !== '1') return res.json(inflight.first);
    try {
      return res.json(await inflight.job);
    } catch {
      return res.status(500).json({ error: 'live_search_failed', offers: [] });
    }
  }

  try {
    if (isSerperConfigured()) {
      // ٣) سقف الرصيد اليومي للموقع كله، ثم حصة الزائر الشهرية من عمليات البحث الجديدة
      const reserved = await searchStore.reserveCredits(ECONOMICS.creditsPerSearch);
      if (!reserved) {
        return res.json({ query, providerOk: false, budgetExhausted: true, offers: [] });
      }
      // المسجّل يُحسب بحسابه (لا يتأثر بمسح المتصفح)، وغيره بمعرّف متصفحه المجهول
      const account = await subscriberLimitFor(req);
      const subject = account ? account.subject : quotaSubjectFor(req);
      const limit = account ? account.limit : ECONOMICS.freeNewSearchesPerMonth;
      const quota = await searchStore.consumeNewSearch(subject, limit);
      if (!quota.allowed) {
        await searchStore.refundCredits(ECONOMICS.creditsPerSearch);
        return res.json({ query, providerOk: false, quotaExceeded: true, quotaLimit: quota.limit, offers: [] });
      }

      const { first } = await runSerperPipeline({ query, gov, sectionHint, debug });
      if (!first.providerOk) {
        // لم تُرجع أي نتيجة: لا نحسبها على الزائر
        await searchStore.releaseNewSearch(subject);
      }
      return res.json({ ...first, quotaUsed: quota.used, quotaLimit: quota.limit });
    }

    // المصدر الاحتياطي المجاني (بلا مفتاح سيربر)
    const govName = IRAQ_GOV_KEYWORDS[gov].name.split(' ')[0];
    let extraContext = 'السعر في العراق دينار OR د.ع';
    if (sectionHint === 'cars') extraContext = 'للبيع في العراق السعر دفتر OR ورقة OR مليون';
    else if (sectionHint === 'realestate') extraContext = 'عقار للبيع او ايجار في العراق السعر مليون OR دفتر';
    const lists = await Promise.all([
      searchWebEngine(`${query} ${extraContext} ${govName}`),
      searchWebEngine(`site:facebook.com "${query}" العراق ${govName} السعر`),
      searchWebEngine(`site:instagram.com "${query}" العراق ${govName}`)
    ]);
    const payload = buildLivePayload({ query, gov, sectionHint, lists, provider: 'yahoo-html-experimental', pending: false, debug });
    if (payload.providerOk && !debug) await searchStore.setCached(key, payload, { query, governorate: gov, section: sectionHint });
    res.json(payload);
  } catch (err) {
    console.error('live-search failed:', err.message);
    res.status(500).json({ error: 'live_search_failed', offers: [] });
  }
});

// ===== التحديث الليلي لأشهر عمليات البحث =====
// تستدعيه مهمة مجدولة (.github/workflows/nightly-refresh.yml) على دفعات صغيرة كي لا ينام خادم رندر أثناء العمل.
function isAuthorizedRefresh(req) {
  const expected = String(process.env.ADMIN_REFRESH_TOKEN || '');
  const given = String(req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (expected.length < 24 || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

app.post('/api/admin/refresh-popular', async (req, res) => {
  if (!isAuthorizedRefresh(req)) return res.status(401).json({ error: 'unauthorized' });
  if (!isSerperConfigured()) return res.status(503).json({ error: 'serper_not_configured' });

  const offset = Math.max(0, Number.parseInt(req.query.offset, 10) || 0);
  const batch = Math.min(10, Math.max(1, Number.parseInt(req.query.limit, 10) || 5));
  const popular = await searchStore.popularSearches(ECONOMICS.refreshTopN);
  const slice = popular.slice(offset, offset + batch);
  // لا نعيد تحديث نتيجة ما زال أمامها أكثر من نصف عمرها
  const freshEnoughMs = (ECONOMICS.cacheTtlHours * 3600 * 1000) / 2;

  const report = { total: popular.length, offset, refreshed: 0, skipped: 0, failed: 0 };
  for (const row of slice) {
    const query = cleanPlainText(row.query, 120);
    const gov = IRAQ_GOV_KEYWORDS[row.governorate] ? row.governorate : 'baghdad';
    const sectionHint = ['all', 'products', 'cars', 'realestate'].includes(row.section) ? row.section : 'all';
    const key = liveCacheKey(query, gov, sectionHint);
    const age = await searchStore.cachedAgeMs(key);
    if (age !== null && age < freshEnoughMs) {
      report.skipped += 1;
      continue;
    }
    try {
      await searchStore.reserveCredits(ECONOMICS.creditsPerSearch, { enforce: false });
      const { full } = await runSerperPipeline({ query, gov, sectionHint });
      const payload = await full;
      if (payload.providerOk) report.refreshed += 1;
      else report.failed += 1;
    } catch (err) {
      console.error('nightly refresh failed for one query:', err.message);
      report.failed += 1;
    }
  }
  const nextOffset = offset + slice.length;
  res.json({ ...report, nextOffset, done: nextOffset >= popular.length, creditsUsedToday: await searchStore.creditsUsedToday() });
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

// ===== الحساب وتسجيل الدخول بغوغل =====

function isSameOriginRequest(req) {
  // حماية من الطلبات المزورة من مواقع أخرى: المتصفحات ترسل Origin مع طلبات POST
  const origin = req.get('origin');
  if (!origin) return true;
  try {
    const o = new URL(origin);
    const allowed = new Set([req.get('host')]);
    if (PUBLIC_SITE_URL) allowed.add(new URL(PUBLIC_SITE_URL).host);
    return allowed.has(o.host);
  } catch {
    return false;
  }
}

const useSecureCookie = (req) => req.secure || PUBLIC_SITE_URL.startsWith('https://');

async function accountPayload(user) {
  if (!user) return { user: null, subscription: { active: false } };
  let subscription = { active: false };
  try {
    subscription = await accounts.subscriptionFor(user.id);
  } catch {}
  return {
    user: { id: user.id, name: user.name, email: user.email, picture: user.picture },
    subscription
  };
}

app.get('/api/auth/me', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await accountPayload(req.user));
});

app.post('/api/auth/google', async (req, res) => {
  if (!FEATURE_FLAGS.loginEnabled) return res.status(503).json({ error: 'login_disabled' });
  if (!isSameOriginRequest(req)) return res.status(403).json({ error: 'bad_origin' });
  if (isRateLimited(`auth:${req.ip || 'unknown'}`)) return res.status(429).json({ error: 'rate_limited' });
  try {
    const profile = await verifyGoogleIdToken(String(req.body?.credential || ''), { clientId: GOOGLE_CLIENT_ID });
    const user = await accounts.upsertGoogleUser(profile);
    const token = await accounts.createSession(user.id);
    res.set('Set-Cookie', sessionCookieHeader(token, { secure: useSecureCookie(req) }));
    res.set('Cache-Control', 'no-store');
    res.json(await accountPayload(user));
  } catch (err) {
    console.warn('google login rejected:', err.message);
    res.status(401).json({ error: 'invalid_google_credential' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  if (!isSameOriginRequest(req)) return res.status(403).json({ error: 'bad_origin' });
  const token = parseCookies(req.get('cookie'))[SESSION_COOKIE];
  try {
    await accounts.deleteSession(token);
  } catch {}
  res.set('Set-Cookie', clearSessionCookieHeader({ secure: useSecureCookie(req) }));
  res.json({ ok: true });
});

// ===== الاشتراك المدفوع عبر كي كارد =====

/** يسأل بوابة كي كارد مباشرة عن حالة الدفع، ويفعّل الاشتراك مرة واحدة فقط عند النجاح المؤكد. */
async function confirmQiPayment(paymentId) {
  const payment = await accounts.paymentById(paymentId);
  if (!payment) return { found: false };
  if (payment.status === 'SUCCESS') return { found: true, status: 'SUCCESS', activatedNow: false, userId: payment.userId };
  const remote = await getQiPaymentStatus(QICARD, paymentId);
  if (isPaymentSettled(remote, { expectedAmountIQD: payment.amountIQD, expectedRequestId: payment.requestId })) {
    const activatedNow = await accounts.activateFromPayment(paymentId);
    return { found: true, status: 'SUCCESS', activatedNow, userId: payment.userId };
  }
  if (remote.canceled === true || ['FAILED', 'AUTHENTICATION_FAILED'].includes(remote.status)) {
    await accounts.markPaymentFailed(paymentId, remote.canceled ? 'CANCELED' : remote.status);
  }
  return { found: true, status: remote.canceled ? 'CANCELED' : remote.status, activatedNow: false, userId: payment.userId };
}

app.post('/api/payments/qicard/create', async (req, res) => {
  if (!FEATURE_FLAGS.paymentsEnabled) return res.status(503).json({ error: 'payments_disabled' });
  if (!isSameOriginRequest(req)) return res.status(403).json({ error: 'bad_origin' });
  if (!req.user) return res.status(401).json({ error: 'login_required' });
  if (!sql) return res.status(503).json({ error: 'database_unavailable' });
  if (isRateLimited(`pay:${req.user.id}`)) return res.status(429).json({ error: 'rate_limited' });
  try {
    const payment = await createQiPayment(QICARD, {
      amountIQD: SUBSCRIPTION_PRICE_IQD,
      finishPaymentUrl: `${PUBLIC_SITE_URL}/?payment=return`,
      notificationUrl: `${PUBLIC_SITE_URL}/api/payments/qicard/webhook`,
      customerInfo: { email: req.user.email || undefined, accountId: `user-${req.user.id}` },
      // يظهر هذا الوصف للزبون في صفحة الدفع لدى كي كارد، لذا لا نضع فيه بيانات داخلية
      additionalInfo: { الخدمة: `عضوية رادار أسعار العراق لمدة ${SUBSCRIPTION_DAYS} يوماً` }
    });
    await accounts.recordPayment({
      requestId: payment.requestId,
      paymentId: payment.paymentId,
      userId: req.user.id,
      amountIQD: SUBSCRIPTION_PRICE_IQD,
      planDays: SUBSCRIPTION_DAYS
    });
    res.json({ formUrl: payment.formUrl, paymentId: payment.paymentId, amountIQD: SUBSCRIPTION_PRICE_IQD, sandbox: QICARD.isSandbox });
  } catch (err) {
    console.error('qicard create payment failed:', err.message);
    res.status(502).json({ error: 'payment_gateway_error' });
  }
});

// إشعار بوابة كي كارد (webhook): لا نثق بمحتواه، بل نسأل البوابة عن الحالة الحقيقية قبل أي تفعيل
app.post('/api/payments/qicard/webhook', async (req, res) => {
  const body = req.body || {};
  const paymentId = String(body.paymentId || '');
  if (QICARD.webhookPublicKey && !verifyQiWebhookSignature(body, req.get('x-signature'), QICARD.webhookPublicKey)) {
    console.warn('qicard webhook: invalid signature for', paymentId.slice(0, 36));
    return res.status(401).json({ error: 'invalid_signature' });
  }
  if (!FEATURE_FLAGS.paymentsEnabled || !/^[0-9a-f-]{36}$/i.test(paymentId)) return res.status(200).json({ ignored: true });
  try {
    const result = await confirmQiPayment(paymentId);
    return res.status(200).json({ received: true, status: result.status || 'UNKNOWN' });
  } catch (err) {
    // 500 يجعل البوابة تعيد المحاولة لاحقاً، وهذا مطلوب عند تعذر التحقق مؤقتاً
    console.error('qicard webhook processing failed:', err.message);
    return res.status(500).json({ error: 'temporary_failure' });
  }
});

// عودة المشترك من صفحة الدفع: نتحقق فوراً دون انتظار الإشعار
app.get('/api/payments/qicard/confirm', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!FEATURE_FLAGS.paymentsEnabled) return res.status(503).json({ error: 'payments_disabled' });
  if (!req.user) return res.status(401).json({ error: 'login_required' });
  try {
    // كي كارد تضيف paymentId إلى رابط العودة؛ نتحقق أنه يخص المستخدم نفسه، وإلا نأخذ آخر دفعة معلقة له
    const requested = /^[0-9a-f-]{36}$/i.test(String(req.query.paymentId || '')) ? await accounts.paymentById(String(req.query.paymentId)) : null;
    const pending = requested && requested.userId === req.user.id ? requested : await accounts.latestPendingPaymentFor(req.user.id);
    let status = 'NONE';
    if (pending) {
      const result = await confirmQiPayment(pending.paymentId);
      if (result.userId !== req.user.id) return res.status(403).json({ error: 'forbidden' });
      status = result.status;
    }
    res.json({ paymentStatus: status, ...(await accountPayload(req.user)) });
  } catch (err) {
    console.error('qicard confirm failed:', err.message);
    res.status(502).json({ error: 'payment_gateway_error' });
  }
});

// المسارات القديمة للاشتراك برقم الهاتف كانت تمنح عضوية دون دفع؛ استُبدلت بمسار كي كارد المؤكد
app.get('/api/subscription-status', (_req, res) => {
  res.json({ active: false, deprecated: true, use: '/api/auth/me' });
});
app.post('/api/subscribe', (_req, res) => {
  res.status(FEATURE_FLAGS.paymentsEnabled ? 410 : 503).json({
    subscribed: false,
    error: FEATURE_FLAGS.paymentsEnabled ? 'use_qicard_checkout' : 'payments_disabled'
  });
});

app.post('/api/searches', async (req, res) => {
  if (!sql) return res.json({ logged: false });
  const { query, governorate, maxBudget, section } = req.body || {};
  if (!query) return res.json({ logged: false });
  const cleanSection = ['all', 'products', 'cars', 'realestate'].includes(section) ? section : 'all';
  try {
    await sql`
      INSERT INTO dalal_iraq_searches (query, governorate, max_budget, section)
      VALUES (${cleanPlainText(query, 120)}, ${IRAQ_GOV_KEYWORDS[governorate] ? governorate : 'baghdad'}, ${toPositiveIntOrNull(maxBudget)}, ${cleanSection});
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
