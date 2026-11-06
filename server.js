import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));
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

function normalizeDigits(str) {
  return String(str || '')
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
}

function decodeHtmlEntities(str) {
  return String(str || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}

function stripTags(html) {
  return decodeHtmlEntities(String(html || '').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function extractRealIraqiPrice(rawText, ratePer1USD = 1500) {
  const text = normalizeDigits(rawText);

  // 1. صيغة الدفتر والورقة (شائعة جداً للسيارات والعقارات في العراق)
  if (text.includes('دفترين')) {
    let usd = 20000;
    const extraW = text.match(/و\s*(\d+)\s*(?:ورقة|ورقات|اوراق|أوراق)/);
    if (extraW) usd += parseFloat(extraW[1]) * 100;
    return Math.round(usd * ratePer1USD);
  }

  const daftarMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:دفتر|دفاتر)/);
  if (daftarMatch) {
    let usd = parseFloat(daftarMatch[1]) * 10000;
    const extraW = text.match(/و\s*(\d+)\s*(?:ورقة|ورقات|اوراق|أوراق)/);
    if (extraW) usd += parseFloat(extraW[1]) * 100;
    if (usd > 0 && usd < 5000000) return Math.round(usd * ratePer1USD);
  }

  // 2. صيغة المليون دينار عراقي (للبيوت والأراضي والسيارات مثل: 250 مليون، 35 مليون)
  const millionWordMatch = text.match(/(\d{1,4}(?:\.\d+)?)\s*(?:مليون|ملايين)/);
  if (millionWordMatch) {
    const m = parseFloat(millionWordMatch[1]);
    if (m >= 1 && m <= 5000) return Math.round(m * 1000000);
  }

  if (text.includes('ورقتين')) return Math.round(200 * ratePer1USD);
  if (text.includes('ورقة ونص')) return Math.round(150 * ratePer1USD);

  const warqaMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:ورقة|ورقات|اوراق|أوراق)/);
  if (warqaMatch) {
    const val = parseFloat(warqaMatch[1]);
    if (val > 0 && val < 500) return Math.round(val * 100 * ratePer1USD);
  }

  const iqdDirect =
    text.match(/(\d{1,3}(?:,\d{3})+|\d{4,10})\s*(?:د\.ع|دينار|دع|IQD)/i) ||
    text.match(/(?:IQD|د\.ع|السعر)\s*:?\s*(\d{1,3}(?:,\d{3})+|\d{4,10})/i);
  if (iqdDirect) {
    const num = parseFloat(iqdDirect[1].replace(/,/g, ''));
    if (num >= 500 && num <= 5000000000) return Math.round(num);
  }

  const alfMatch = text.match(/(?:السعر|سعر|بـ|ب|فقط)?\s*(\d{1,4}(?:\.\d+)?)\s*(?:الف|ألف|الاف|آلاف)/);
  if (alfMatch) {
    const num = parseFloat(alfMatch[1]);
    if (num >= 1 && num <= 9999) return Math.round(num * 1000);
  }

  const usdMatch = text.match(/(?:\$\s*(\d{1,6}(?:\.\d+)?)|(\d{1,6}(?:\.\d+)?)\s*(?:\$|دولار|USD))/i);
  if (usdMatch) {
    const usd = parseFloat(usdMatch[1] || usdMatch[2]);
    if (usd >= 1 && usd <= 2000000) return Math.round(usd * ratePer1USD);
  }

  return null;
}

function detectSectionAndSpecs(rawText) {
  const text = normalizeDigits(String(rawText || ''));

  if (/سيارة|النترا|سوناتا|تاهو|سبورتاج|سورينتو|لاندكروز|جيتور|كامري|كورولا|سنتافي|نيسان|بيك اب|هايلكس|وارد امريكي|رقم بغداد|رقم اربيل|معرض سيارات/i.test(text)) {
    const yearMatch = text.match(/\b(20[12]\d)\b/);
    const kmMatch = text.match(/(\d{1,3}(?:,\d{3})?)\s*(?:كم|كيلومتر|ماشي)/);
    return {
      section: 'cars',
      specs: {
        year: yearMatch ? yearMatch[1] : 'حديث',
        mileage: /زيرو|0\s*كم/.test(text) ? 'زيرو (0 كم)' : kmMatch ? `${kmMatch[1]} كم` : 'مفحوص',
        plate: /اربيل|أربيل|شمالي/.test(text) ? 'رقم أربيل' : /بغداد/.test(text) ? 'رقم بغداد' : 'مرقم جاهز',
        origin: /امريكي|أمريكي/.test(text) ? 'وارد أمريكي' : /خليجي|وكالة/.test(text) ? 'خليجي وكالة' : 'ضمان كير ومحرك'
      }
    };
  }

  if (/عقار|دار للبيع|بيت للبيع|شقة|قطعة ارض|أرض سكنية|طابو|دونم|متر مربع|م2|م²|بسماية|ايجار|إيجار|مشتمل|بناء حديث/i.test(text)) {
    const areaMatch = text.match(/(\d{2,4})\s*(?:متر|م2|م²)/);
    return {
      section: 'realestate',
      specs: {
        areaSqm: areaMatch ? Number(areaMatch[1]) : 200,
        deedType: /طابو صرف/.test(text) ? 'طابو صرف' : /استثماري|مجمع/.test(text) ? 'سند استثماري' : 'طابو رسمي',
        dealType: /ايجار|إيجار|للايجار/.test(text) ? 'إيجار' : 'بيع تمليك',
        propertyType: /شقة/.test(text) ? 'شقة سكنية' : /ارض|أرض/.test(text) ? 'قطعة أرض' : 'دار سكنية'
      }
    };
  }

  return { section: 'products', specs: {} };
}

function detectGovFromText(rawText, fallbackGov = 'baghdad') {
  const text = String(rawText || '').toLowerCase();
  for (const [govKey, govObj] of Object.entries(IRAQ_GOV_KEYWORDS)) {
    for (const kw of govObj.keywords) {
      if (text.includes(kw.toLowerCase())) {
        return { governorate: govKey, district: kw };
      }
    }
  }
  return { governorate: fallbackGov, district: IRAQ_GOV_KEYWORDS[fallbackGov]?.name || 'المركز' };
}

function extractPhoneFromText(rawText) {
  const text = normalizeDigits(rawText);
  const match = text.match(/(07[5789]\d{8})/);
  return match ? match[1] : '';
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
      return decodeHtmlEntities(murlMatch[1]);
    }
  } catch {}
  return null;
}

async function searchWebEngine(searchQuery, targetPlatform, fallbackGov) {
  const results = [];
  try {
    const encoded = encodeURIComponent(searchQuery);
    const url = `https://search.yahoo.com/search?p=${encoded}&n=10`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'ar-IQ,ar;q=0.9,en;q=0.8'
      },
      signal: AbortSignal.timeout(6000)
    });
    const html = await res.text();

    const blocks = html.split(/class="[^"]*dd algo/i).slice(1, 9);
    for (const block of blocks) {
      const linkMatch = block.match(/href="([^"]+)"/i);
      const titleMatch = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
      const snippetMatch = block.match(/class="[^"]*compText[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

      if (!linkMatch || !titleMatch) continue;

      let realUrl = linkMatch[1];
      const ruMatch = realUrl.match(/\/RU=([^/]+)\//);
      if (ruMatch) {
        try {
          realUrl = decodeURIComponent(ruMatch[1]);
        } catch {}
      }

      if (realUrl.includes('yahoo.com')) continue;

      const cleanTitle = stripTags(titleMatch[1]).replace(/\s*-\s*(Facebook|Instagram|فيسبوك|انستغرام).*$/i, '').trim();
      const cleanSnippet = snippetMatch ? stripTags(snippetMatch[1]) : cleanTitle;
      if (!cleanTitle || cleanTitle.length < 4) continue;

      const combinedText = `${cleanTitle} ${cleanSnippet}`;
      const priceIQD = extractRealIraqiPrice(combinedText);
      const { governorate, district } = detectGovFromText(combinedText, fallbackGov);
      const phone = extractPhoneFromText(combinedText);
      const { section, specs } = detectSectionAndSpecs(combinedText);

      let platform = targetPlatform;
      let storeName = 'متجر أو معرض عراقي';
      try {
        const parsedHost = new URL(realUrl).hostname.replace(/^www\./, '');
        if (parsedHost.includes('facebook.com')) {
          platform = 'facebook';
          storeName = 'صفحة أو سوق فيسبوك العراق';
        } else if (parsedHost.includes('instagram.com')) {
          platform = 'instagram';
          storeName = 'حساب انستغرام العراق';
        } else {
          platform = 'google';
          if (parsedHost.includes('opensooq')) storeName = 'السوق المفتوح العراق (OpenSooq)';
          else if (parsedHost.includes('miswag')) storeName = 'متجر مسواك العراقي (Miswag)';
          else if (parsedHost.includes('elryan')) storeName = 'متجر الريان العراقي (Elryan)';
          else if (parsedHost.includes('alnabaa')) storeName = 'شركة النبأ (Alnabaa)';
          else storeName = `موقع ${parsedHost}`;
        }
      } catch {}

      results.push({
        id: `live-${platform}-${Buffer.from(realUrl).toString('base64').slice(0, 14)}`,
        section,
        specs,
        title: cleanTitle.slice(0, 110),
        category: section === 'cars' ? 'سيارات' : section === 'realestate' ? 'عقارات' : 'سلع وأجهزة',
        keywords: [searchQuery],
        platform,
        storeName,
        verified: true,
        allowsInspection: true,
        trustRating: 4.8,
        reviewsCount: 14,
        priceIQD,
        deliveryLocalIQD: section === 'products' ? 4000 : 0,
        deliveryNationalIQD: section === 'products' ? 7000 : 0,
        governorate,
        district,
        delivery: section === 'cars' ? 'معاينة وفحص في المعرض' : section === 'realestate' ? 'معاينة موقعية وسند رسمي' : 'توصيل متوفر حسب المتجر',
        phone: phone || 'داخل رابط العرض',
        snippet: cleanSnippet.slice(0, 220),
        directUrl: realUrl,
        postedAgo: 'نتيجة مباشرة'
      });
    }
  } catch (err) {
    console.error('Live search error:', err.message);
  }
  return results;
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

app.get('/api/live-search', async (req, res) => {
  const query = String(req.query.q || '').trim();
  const gov = String(req.query.gov || 'baghdad').trim();
  const sectionHint = String(req.query.section || 'all').trim();
  const govName = IRAQ_GOV_KEYWORDS[gov]?.name.split(' ')[0] || 'بغداد';

  if (!query) return res.json({ offers: [] });

  let extraContext = 'السعر في العراق دينار OR د.ع';
  if (sectionHint === 'cars') extraContext = 'للبيع في العراق السعر دفتر OR ورقة OR مليون';
  else if (sectionHint === 'realestate') extraContext = 'عقار للبيع او ايجار في العراق السعر مليون OR دفتر';

  try {
    const [storeResults, fbResults, igResults, thumbnailUrl] = await Promise.all([
      searchWebEngine(`${query} ${extraContext} ${govName}`, 'google', gov),
      searchWebEngine(`site:facebook.com "${query}" العراق ${govName} السعر`, 'facebook', gov),
      searchWebEngine(`site:instagram.com "${query}" العراق ${govName}`, 'instagram', gov),
      fetchRealProductThumbnail(query)
    ]);

    const merged = [...storeResults, ...fbResults, ...igResults];
    const seenUrls = new Set();
    const queryWords = normalizeDigits(query.toLowerCase()).split(/\s+/).filter((w) => w.length >= 2);

    const uniqueOffers = [];
    for (const item of merged) {
      if (seenUrls.has(item.directUrl)) continue;
      seenUrls.add(item.directUrl);

      const textToCheck = normalizeDigits(`${item.title} ${item.snippet}`.toLowerCase());
      const isRelevant = queryWords.length === 0 || queryWords.some((w) => textToCheck.includes(w));
      if (!isRelevant) continue;

      uniqueOffers.push({
        ...item,
        section: sectionHint !== 'all' ? sectionHint : item.section,
        imageUrl: thumbnailUrl || null
      });
    }

    res.json({
      query,
      governorate: gov,
      thumbnailUrl,
      offers: uniqueOffers
    });
  } catch (err) {
    res.status(500).json({ error: err.message, offers: [] });
  }
});

app.get('/api/offers', async (_req, res) => {
  if (!sql) return res.json({ source: 'memory', offers: [] });
  try {
    const rows = await sql`
      SELECT
        COALESCE(external_id, 'db-' || id::text) AS id,
        COALESCE(section, 'products') AS section,
        COALESCE(specs, '{}'::jsonb) AS specs,
        title,
        category,
        keywords,
        image_url AS "imageUrl",
        platform,
        store_name AS "storeName",
        verified,
        COALESCE(allows_inspection, true) AS "allowsInspection",
        COALESCE(trust_rating, 4.8)::float AS "trustRating",
        COALESCE(reviews_count, 12) AS "reviewsCount",
        price_iqd::bigint AS "priceIQD",
        COALESCE(delivery_local_iqd, 4000) AS "deliveryLocalIQD",
        COALESCE(delivery_national_iqd, 7000) AS "deliveryNationalIQD",
        governorate,
        district,
        delivery,
        phone,
        snippet,
        posted_ago AS "postedAgo"
      FROM dalal_iraq_offers
      ORDER BY created_at DESC
      LIMIT 100;
    `;
    res.json({ source: 'neon', offers: rows.map((r) => ({ ...r, priceIQD: r.priceIQD ? Number(r.priceIQD) : null })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/offers', async (req, res) => {
  const {
    section = 'products',
    specs = {},
    title,
    category = 'عروض التجار',
    keywords = [],
    imageUrl = null,
    platform = 'facebook',
    storeName = 'متجر عراقي',
    verified = true,
    allowsInspection = true,
    priceIQD = null,
    deliveryLocalIQD = 4000,
    deliveryNationalIQD = 7000,
    governorate = 'baghdad',
    district = 'المركز',
    delivery = 'توصيل متوفر',
    phone = '',
    snippet = ''
  } = req.body || {};

  if (!title) return res.status(400).json({ error: 'Title is required' });
  if (!sql) return res.status(201).json({ saved: false, source: 'memory' });

  try {
    const extId = `custom-${Date.now()}`;
    const inserted = await sql`
      INSERT INTO dalal_iraq_offers (
        external_id, section, specs, title, category, keywords, image_url, platform, store_name,
        verified, allows_inspection, price_iqd, delivery_local_iqd, delivery_national_iqd,
        governorate, district, delivery, phone, snippet, posted_ago
      ) VALUES (
        ${extId}, ${section}, ${JSON.stringify(specs)}, ${title}, ${category},
        ${Array.isArray(keywords) ? keywords : [title]},
        ${imageUrl}, ${platform}, ${storeName}, ${verified}, ${Boolean(allowsInspection)},
        ${priceIQD ? Number(priceIQD) : null}, ${Number(deliveryLocalIQD)}, ${Number(deliveryNationalIQD)},
        ${governorate}, ${district}, ${delivery}, ${phone}, ${snippet}, 'أضيف الآن'
      )
      RETURNING
        external_id AS id,
        section,
        specs,
        title,
        category,
        keywords,
        image_url AS "imageUrl",
        platform,
        store_name AS "storeName",
        verified,
        allows_inspection AS "allowsInspection",
        trust_rating::float AS "trustRating",
        reviews_count AS "reviewsCount",
        price_iqd::bigint AS "priceIQD",
        delivery_local_iqd AS "deliveryLocalIQD",
        delivery_national_iqd AS "deliveryNationalIQD",
        governorate,
        district,
        delivery,
        phone,
        snippet,
        posted_ago AS "postedAgo";
    `;
    const row = inserted[0];
    res.status(201).json({ saved: true, source: 'neon', offer: { ...row, priceIQD: row.priceIQD ? Number(row.priceIQD) : null } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/alerts', async (_req, res) => {
  if (!sql) return res.json({ alerts: [] });
  try {
    const rows = await sql`
      SELECT id, keyword, target_price_iqd::bigint AS "targetPriceIQD", governorate,
             contact_phone AS "contactPhone", contact_channel AS "contactChannel", created_at AS "createdAt"
      FROM dalal_iraq_alerts
      ORDER BY created_at DESC
      LIMIT 30;
    `;
    res.json({ alerts: rows.map((r) => ({ ...r, targetPriceIQD: Number(r.targetPriceIQD) })) });
  } catch (err) {
    res.status(500).json({ error: err.message, alerts: [] });
  }
});

app.post('/api/alerts', async (req, res) => {
  const { keyword, targetPriceIQD, governorate = 'baghdad', contactPhone, contactChannel = 'whatsapp' } = req.body || {};
  if (!keyword || !targetPriceIQD || !contactPhone) {
    return res.status(400).json({ error: 'Missing required alert fields' });
  }
  if (!sql) return res.status(201).json({ saved: true });
  try {
    const rows = await sql`
      INSERT INTO dalal_iraq_alerts (keyword, target_price_iqd, governorate, contact_phone, contact_channel)
      VALUES (${keyword}, ${Number(targetPriceIQD)}, ${governorate}, ${contactPhone}, ${contactChannel})
      RETURNING id, keyword, target_price_iqd::bigint AS "targetPriceIQD", governorate,
                contact_phone AS "contactPhone", contact_channel AS "contactChannel";
    `;
    res.status(201).json({ saved: true, alert: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/alerts/:id', async (req, res) => {
  if (!sql) return res.json({ deleted: true });
  try {
    await sql`DELETE FROM dalal_iraq_alerts WHERE id = ${Number(req.params.id)}`;
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reviews', async (req, res) => {
  if (!sql) return res.json({ reviews: [] });
  const storeName = req.query.store;
  try {
    const rows = storeName
      ? await sql`SELECT * FROM dalal_iraq_reviews WHERE store_name = ${String(storeName)} ORDER BY created_at DESC LIMIT 20`
      : await sql`SELECT * FROM dalal_iraq_reviews ORDER BY created_at DESC LIMIT 30`;
    res.json({ reviews: rows });
  } catch (err) {
    res.status(500).json({ error: err.message, reviews: [] });
  }
});

app.post('/api/reviews', async (req, res) => {
  const { storeName, platform = 'facebook', rating = 5, allowsInspection = true, comment = '', reviewerGov = 'baghdad' } = req.body || {};
  if (!storeName) return res.status(400).json({ error: 'Store name required' });
  if (!sql) return res.status(201).json({ saved: true });
  try {
    const inserted = await sql`
      INSERT INTO dalal_iraq_reviews (store_name, platform, rating, allows_inspection, comment, reviewer_gov)
      VALUES (${storeName}, ${platform}, ${Number(rating)}, ${Boolean(allowsInspection)}, ${comment}, ${reviewerGov})
      RETURNING *;
    `;
    res.status(201).json({ saved: true, review: inserted[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/subscribe', async (req, res) => {
  const { phone, planType = 'shopper_1000_iqd', paymentMethod = 'zaincash' } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'Phone number required' });
  if (!sql) {
    return res.status(201).json({ subscribed: true, phone, planType, paymentMethod });
  }
  try {
    const rows = await sql`
      INSERT INTO dalal_iraq_subscriptions (phone, plan_type, payment_method, status, expires_at)
      VALUES (${phone}, ${planType}, ${paymentMethod}, 'active', NOW() + INTERVAL '30 days')
      ON CONFLICT (phone) DO UPDATE
      SET plan_type = EXCLUDED.plan_type,
          payment_method = EXCLUDED.payment_method,
          status = 'active',
          expires_at = NOW() + INTERVAL '30 days'
      RETURNING phone, plan_type AS "planType", payment_method AS "paymentMethod", expires_at AS "expiresAt";
    `;
    res.status(201).json({ subscribed: true, subscription: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/searches', async (req, res) => {
  if (!sql) return res.json({ logged: false });
  const { query, governorate, maxBudget } = req.body || {};
  if (!query) return res.json({ logged: false });
  try {
    await sql`
      INSERT INTO dalal_iraq_searches (query, governorate, max_budget)
      VALUES (${query}, ${governorate || 'baghdad'}, ${maxBudget ? Number(maxBudget) : null});
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
