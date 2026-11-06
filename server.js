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
app.use(express.json());
app.use(express.static(__dirname));

const databaseUrl = process.env.DATABASE_URL;
const sql = databaseUrl ? neon(databaseUrl) : null;

const IRAQ_GOV_KEYWORDS = {
  baghdad: { name: 'بغداد', keywords: ['بغداد', 'المنصور', 'الكرادة', 'زيونة', 'الأعظمية', 'الكاظمية', 'الدورة', 'شارع الصناعة', 'الربيعي', 'baghdad'] },
  basra: { name: 'البصرة', keywords: ['البصرة', 'بصرة', 'العشار', 'الجزائر', 'الجبيلة', 'الزبير', 'basra'] },
  erbil: { name: 'أربيل', keywords: ['أربيل', 'اربيل', 'عنكاوة', 'erbil', 'hawler'] },
  nineveh: { name: 'نينوى (الموصل)', keywords: ['الموصل', 'موصل', 'نينوى', 'mosul'] },
  najaf: { name: 'النجف الأشرف', keywords: ['النجف', 'نجف', 'الكوفة', 'najaf'] },
  karbala: { name: 'كربلاء المقدسة', keywords: ['كربلاء', 'حي الحسين', 'karbala'] },
  sulaymaniyah: { name: 'السليمانية', keywords: ['السليمانية', 'سليمانية', 'sulaymaniyah', 'slemani'] },
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

// استخراج دقيق للسعر الحقيقي فقط إذا كان مذكوراً بعملة أو صيغة سعر واضحة
function extractRealIraqiPrice(rawText, ratePer1USD = 1500) {
  const text = normalizeDigits(rawText);

  // 1. صيغة الدفتر والورقة
  const daftarMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:دفتر|دفاتر)/);
  if (daftarMatch) {
    const val = parseFloat(daftarMatch[1]);
    if (val > 0 && val < 50) return Math.round(val * 10000 * ratePer1USD);
  }

  if (text.includes('ورقتين')) return Math.round(200 * ratePer1USD);
  if (text.includes('ورقة ونص')) return Math.round(150 * ratePer1USD);

  const warqaMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:ورقة|ورقات|اوراق|أوراق)/);
  if (warqaMatch) {
    const val = parseFloat(warqaMatch[1]);
    if (val > 0 && val < 100) return Math.round(val * 100 * ratePer1USD);
  }

  // 2. صيغة الدينار العراقي الصريحة (مثل: 25,000 د.ع أو 15000 دينار أو IQD 25,000)
  const iqdDirect = text.match(/(\d{1,3}(?:,\d{3})+|\d{4,9})\s*(?:د\.ع|دينار|دع|IQD)/i) ||
                    text.match(/(?:IQD|د\.ع|السعر)\s*:?\s*(\d{1,3}(?:,\d{3})+|\d{4,9})/i);
  if (iqdDirect) {
    const num = parseFloat(iqdDirect[1].replace(/,/g, ''));
    if (num >= 500 && num <= 500000000) return Math.round(num);
  }

  // 3. صيغة الكسور والألوف العراقية (مثل: 15 الف، 25 ألف دينار، بـ 10 آلاف)
  const alfMatch = text.match(/(?:السعر|سعر|بـ|ب|فقط)?\s*(\d{1,4}(?:\.\d+)?)\s*(?:الف|ألف|الاف|آلاف)/);
  if (alfMatch) {
    const num = parseFloat(alfMatch[1]);
    if (num >= 1 && num <= 9999) return Math.round(num * 1000);
  }

  // 4. صيغة الدولار الصريحة ($50 أو 50 دولار)
  const usdMatch = text.match(/(?:\$\s*(\d{1,5}(?:\.\d+)?)|(\d{1,5}(?:\.\d+)?)\s*(?:\$|دولار|USD))/i);
  if (usdMatch) {
    const usd = parseFloat(usdMatch[1] || usdMatch[2]);
    if (usd >= 1 && usd <= 100000) return Math.round(usd * ratePer1USD);
  }

  return null;
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

// جلب صورة حقيقية للمنتج المبحوث عنه من محرك صور بينج
async function fetchRealProductThumbnail(query) {
  try {
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query + ' منتج')}&first=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'ar,en;q=0.9'
      },
      signal: AbortSignal.timeout(4500)
    });
    const html = await res.text();
    const murlMatch = html.match(/murl&quot;:&quot;(https?:\/\/[^&]+?\.(?:jpg|jpeg|png|webp))/i) ||
                      html.match(/src="(https:\/\/tse\d\.mm\.bing\.net\/th\?id=[^"]+)"/i);
    if (murlMatch && murlMatch[1]) {
      return decodeHtmlEntities(murlMatch[1]);
    }
  } catch {}
  return null;
}

// البحث الحي في الويب عبر محرك ياهو ودك دك جو لاستخراج النتائج الحقيقية
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

    // استخراج كتل النتائج من صفحة البحث
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

      // تحديد المنصة واسم المتجر من الرابط
      let platform = targetPlatform;
      let storeName = 'متجر عراقي';
      try {
        const parsedHost = new URL(realUrl).hostname.replace(/^www\./, '');
        if (parsedHost.includes('facebook.com')) {
          platform = 'facebook';
          storeName = 'صفحة أو سوق فيسبوك العراق';
        } else if (parsedHost.includes('instagram.com')) {
          platform = 'instagram';
          storeName = 'حساب متجر انستغرام العراق';
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
        title: cleanTitle.slice(0, 110),
        category: 'نتيجة بحث حية',
        keywords: [searchQuery],
        platform,
        storeName,
        verified: true,
        priceIQD, // قد يكون رقماً حقيقياً أو null إذا لم يذكر السعر في المقتطف
        governorate,
        district,
        delivery: 'حسب سياسة البائع في الرابط الأصلي',
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
        title TEXT NOT NULL,
        category TEXT DEFAULT 'عام',
        keywords TEXT[] DEFAULT '{}',
        image_url TEXT,
        platform TEXT NOT NULL,
        store_name TEXT NOT NULL,
        verified BOOLEAN DEFAULT true,
        price_iqd INTEGER,
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

    // تنظيف أي بطاقات قديمة كانت بدون رابط حقيقي أو مولدة بقالب وهمي
    await sql`DELETE FROM dalal_iraq_offers WHERE external_id LIKE 'dyn-%'`;

    await sql`
      CREATE TABLE IF NOT EXISTS dalal_iraq_searches (
        id SERIAL PRIMARY KEY,
        query TEXT NOT NULL,
        governorate TEXT NOT NULL,
        max_budget INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
  } catch (err) {
    console.error('Neon DB initialization warning:', err.message);
  }
}

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', service: 'iraq-smart-finder', neonConnected: Boolean(sql) });
});

// البحث الحي الفعلي في فيسبوك وانستغرام ومتاجر العراق عبر الإنترنت
app.get('/api/live-search', async (req, res) => {
  const query = String(req.query.q || '').trim();
  const gov = String(req.query.gov || 'baghdad').trim();
  const govName = IRAQ_GOV_KEYWORDS[gov]?.name.split(' ')[0] || 'بغداد';

  if (!query) {
    return res.json({ offers: [] });
  }

  try {
    // تشغيل 3 عمليات بحث حية متوازية (متاجر العراق + فيسبوك العراق + انستغرام العراق) مع جلب صورة حقيقية للمنتج
    const [storeResults, fbResults, igResults, thumbnailUrl] = await Promise.all([
      searchWebEngine(`${query} السعر في العراق دينار OR د.ع ${govName}`, 'google', gov),
      searchWebEngine(`site:facebook.com "${query}" العراق السعر ${govName}`, 'facebook', gov),
      searchWebEngine(`site:instagram.com "${query}" العراق السعر OR توصيل`, 'instagram', gov),
      fetchRealProductThumbnail(query)
    ]);

    const merged = [...storeResults, ...fbResults, ...igResults];

    // إزالة التكرار بالروابط والتأكد من صلة النتيجة بالبحث
    const seenUrls = new Set();
    const queryWords = normalizeDigits(query.toLowerCase()).split(/\s+/).filter((w) => w.length >= 2);

    const uniqueOffers = [];
    for (const item of merged) {
      if (seenUrls.has(item.directUrl)) continue;
      seenUrls.add(item.directUrl);

      const textToCheck = normalizeDigits(`${item.title} ${item.snippet}`.toLowerCase());
      // التأكد من أن النتيجة تحتوي على الأقل على كلمة أساسية من كلمات البحث
      const isRelevant = queryWords.length === 0 || queryWords.some((w) => textToCheck.includes(w));
      if (!isRelevant) continue;

      uniqueOffers.push({
        ...item,
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
        title,
        category,
        keywords,
        platform,
        store_name AS "storeName",
        verified,
        price_iqd AS "priceIQD",
        governorate,
        district,
        delivery,
        phone,
        snippet,
        posted_ago AS "postedAgo"
      FROM dalal_iraq_offers
      ORDER BY created_at DESC
      LIMIT 60;
    `;
    res.json({ source: 'neon', offers: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/offers', async (req, res) => {
  const {
    title,
    category = 'منشور مضاف',
    keywords = [],
    platform = 'facebook',
    storeName = 'متجر عراقي',
    verified = true,
    priceIQD = null,
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
        external_id, title, category, keywords, platform, store_name,
        verified, price_iqd, governorate, district, delivery, phone, snippet, posted_ago
      ) VALUES (
        ${extId}, ${title}, ${category}, ${Array.isArray(keywords) ? keywords : [title]},
        ${platform}, ${storeName}, ${verified}, ${priceIQD ? Number(priceIQD) : null},
        ${governorate}, ${district}, ${delivery}, ${phone}, ${snippet}, 'أضيف الآن'
      )
      RETURNING
        external_id AS id,
        title,
        category,
        keywords,
        platform,
        store_name AS "storeName",
        verified,
        price_iqd AS "priceIQD",
        governorate,
        district,
        delivery,
        phone,
        snippet,
        posted_ago AS "postedAgo";
    `;
    res.status(201).json({ saved: true, source: 'neon', offer: inserted[0] });
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

initNeonDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dalal Al-Iraq server running on http://localhost:${PORT}`);
  });
});
