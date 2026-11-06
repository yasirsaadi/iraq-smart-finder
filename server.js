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

// إعداد اتصال قاعدة بيانات نيون (Neon PostgreSQL)
const databaseUrl = process.env.DATABASE_URL;
const sql = databaseUrl ? neon(databaseUrl) : null;

const SEED_OFFERS = [
  {
    external_id: 'ip15-1',
    title: 'آيفون 15 برو ماكس 256 جيجا تيتانيوم طبيعي - ضمان وكالة',
    category: 'موبايلات',
    keywords: ['ايفون', 'آيفون', 'iphone', '15', 'برو ماكس', 'موبايل', 'ابل'],
    emoji: '📱',
    platform: 'facebook',
    store_name: 'بيج كلكسي المنصور للموبايلات',
    verified: true,
    price_iqd: 1620000,
    governorate: 'baghdad',
    district: 'المنصور - شارع 14 رمضان',
    delivery: 'توصيل بغداد 5,000 د.ع والمحافظات 8,000 د.ع',
    phone: '07701122334',
    snippet: 'عرض خاص اليوم فقط! آيفون 15 برو ماكس ذاكرة 256 جيجا نسخة الشرق الأوسط فيس تايم فعال، السعر 1,620,000 دينار عراقي فقط.',
    posted_ago: 'منذ ساعتين'
  },
  {
    external_id: 'ip15-2',
    title: 'iPhone 15 Pro Max 256GB (جديد غير مفتوح مع كفر وشاحن أصلي هدية)',
    category: 'موبايلات',
    keywords: ['ايفون', 'آيفون', 'iphone', '15', 'برو ماكس', 'موبايل', 'ابل'],
    emoji: '📱',
    platform: 'instagram',
    store_name: 'iStore.Erbil (آي ستور أربيل)',
    verified: true,
    price_iqd: 1585000,
    governorate: 'erbil',
    district: 'شارع 60 - مقابل القلعة',
    delivery: 'شحن سريع لكافة محافظات العراق خلال 24 ساعة',
    phone: '07504455667',
    snippet: 'أرخص سعر بالعراق من آي ستور أربيل! 10 أوراق و55 دولار (1,585,000 د.ع) شامل شاحن أصلي وكفر ماك سيف.',
    posted_ago: 'منذ 4 ساعات'
  },
  {
    external_id: 'ip15-3',
    title: 'أبل آيفون 15 برو ماكس 256 جيجابايت - ضمان رسمي سنة كاملة',
    category: 'موبايلات',
    keywords: ['ايفون', 'آيفون', 'iphone', '15', 'برو ماكس', 'موبايل', 'ابل'],
    emoji: '📱',
    platform: 'google',
    store_name: 'متجر مسواك العراقي (Miswag.iq)',
    verified: true,
    price_iqd: 1690000,
    governorate: 'baghdad',
    district: 'الكرادة داخل - مستودع بغداد الرئيسي',
    delivery: 'توصيل مجاني لجميع المحافظات',
    phone: '6007',
    snippet: 'متوفر الآن على موقع مسواك الرسمي مع إمكانية الدفع عند الاستلام وفحص الجهاز قبل الدفع.',
    posted_ago: 'متوفر بالمخزن'
  },
  {
    external_id: 'ip15-4',
    title: 'آيفون 15 برو ماكس 256GB نظيف جداً بطارية 100% أخو الجديد',
    category: 'موبايلات',
    keywords: ['ايفون', 'آيفون', 'iphone', '15', 'برو ماكس', 'موبايل', 'ابل'],
    emoji: '📱',
    platform: 'facebook',
    store_name: 'سوق البصرة المفتوح للموبايلات (ماركت بليس)',
    verified: false,
    price_iqd: 1475000,
    governorate: 'basra',
    district: 'البصرة - العشار',
    delivery: 'استلام مباشر بالبصرة أو توصيل للمحافظات',
    phone: '07809988776',
    snippet: 'الجهاز استخدام أسبوعين فقط بطارية 100% عدد الشحنات 12 مرة، بالكارتون مالته السعر 1,475,000 د.ع نهائي.',
    posted_ago: 'منذ 55 دقيقة'
  },
  {
    external_id: 'ps5-1',
    title: 'بلاي ستيشن 5 سليم (PS5 Slim CD) نسخة القرص 1 تيرا مع يدتين أصلية',
    category: 'ألعاب',
    keywords: ['بلاي', 'بلاي ستيشن', 'ps5', 'سوني', '5', 'سليم', 'العاب'],
    emoji: '🎮',
    platform: 'facebook',
    store_name: 'بيج عالم الألعاب - بغداد الربيعي',
    verified: true,
    price_iqd: 695000,
    governorate: 'baghdad',
    district: 'زيونة - شارع الربيعي',
    delivery: 'توصيل فوري بغداد 5,000 د.ع والمحافظات 10,000 د.ع',
    phone: '07712345678',
    snippet: 'عرض ناري! جهاز PS5 Slim نسخة الدسك 1 تيرابايت مع يدتين أصلية وضمان سنة بسعر 695 ألف دينار فقط.',
    posted_ago: 'منذ 3 ساعات'
  },
  {
    external_id: 'ps5-2',
    title: 'Sony PlayStation 5 Slim Digital Edition - جديد بالكارتون',
    category: 'ألعاب',
    keywords: ['بلاي', 'بلاي ستيشن', 'ps5', 'سوني', '5', 'سليم', 'العاب'],
    emoji: '🎮',
    platform: 'instagram',
    store_name: 'GamerZone.Najaf (كيمر زون النجف)',
    verified: true,
    price_iqd: 635000,
    governorate: 'najaf',
    district: 'النجف - شارع الروان',
    delivery: 'توصيل الفرات الأوسط 5,000 د.ع وبغداد وباقي المحافظات',
    phone: '07811223344',
    snippet: 'نسخة الديجيتال سليم الجديدة 1 تيرا أرخص سعر بالعراق 635 ألف دينار فقط مع حساب ألعاب هدية.',
    posted_ago: 'منذ ساعة'
  },
  {
    external_id: 'ac-1',
    title: 'سبلت جري (GREE) 2 طن انفرتر اقتصادي يسحب 6 أمبير فقط - أصلي',
    category: 'أجهزة منزلية',
    keywords: ['سبلت', 'جري', 'gree', 'تبريد', 'مكيف', '2 طن', 'انفرتر'],
    emoji: '❄️',
    platform: 'facebook',
    store_name: 'معرض النهرين للأجهزة الكهربائية - الكرادة',
    verified: true,
    price_iqd: 845000,
    governorate: 'baghdad',
    district: 'الكرادة خارج - قرب المسرح الوطني',
    delivery: 'توصيل مجاني داخل بغداد مع أنابيب نحاس 4 متر',
    phone: '07722334455',
    snippet: 'سبلت جري كفالة 5 سنوات على الضاغط، انفرتر يشتغل على المولدة 6 أمبير، السعر 845 ألف دينار.',
    posted_ago: 'منذ 5 ساعات'
  },
  {
    external_id: 'ac-2',
    title: 'سبلت GREE 2 Ton تروبيكال يتحمل حرارة البصرة لغاية 65 درجة',
    category: 'أجهزة منزلية',
    keywords: ['سبلت', 'جري', 'gree', 'تبريد', 'مكيف', '2 طن', 'انفرتر'],
    emoji: '❄️',
    platform: 'instagram',
    store_name: 'Basra.Cooling (البصرة للتبريد والأجهزة)',
    verified: true,
    price_iqd: 815000,
    governorate: 'basra',
    district: 'البصرة - الجزائر',
    delivery: 'توصيل وتنصيب داخل البصرة والمحافظات الجنوبية',
    phone: '07822334499',
    snippet: 'عرض الصيف من معرض البصرة للتبريد! سبلت جري 2 طن أصلي بسعر الجملة 815,000 د.ع فقط.',
    posted_ago: 'منذ 3 ساعات'
  },
  {
    external_id: 'lap-1',
    title: 'لابتوب Lenovo LOQ 15 للألعاب والهندسة Core i7 الجيل 13 + RTX 4050',
    category: 'لابتوبات',
    keywords: ['لابتوب', 'لينوفو', 'lenovo', 'loq', 'حاسبة', 'كمبيوتر', 'كيمينج'],
    emoji: '💻',
    platform: 'google',
    store_name: 'شركة النبأ للحاسبات - شارع الصناعة (Alnabaa.com)',
    verified: true,
    price_iqd: 1125000,
    governorate: 'baghdad',
    district: 'بغداد - شارع الصناعة مقابل الجامعة التكنولوجية',
    delivery: 'توصيل مجاني لجميع محافظات العراق مع جنطة وماوس هدية',
    phone: '07700011122',
    snippet: 'رام 16GB DDR5، هارد 512GB NVMe، كارت شاشة RTX 4050 6GB، شاشة 144Hz ضمان سنة كاملة.',
    posted_ago: 'متوفر بالموقع'
  },
  {
    external_id: 'lap-2',
    title: 'Lenovo LOQ Gaming i7-13620H / RTX 4050 - عرض خاص لطلاب الجامعات',
    category: 'لابتوبات',
    keywords: ['لابتوب', 'لينوفو', 'lenovo', 'loq', 'حاسبة', 'كمبيوتر', 'كيمينج'],
    emoji: '💻',
    platform: 'facebook',
    store_name: 'مكتب الموصل تكنولوجي للحاسبات',
    verified: true,
    price_iqd: 1080000,
    governorate: 'nineveh',
    district: 'الموصل - المجموعة الثقافية',
    delivery: 'توصيل داخل الموصل وأربيل وكركوك وبغداد 5,000 د.ع',
    phone: '07733445566',
    snippet: 'أرخص سعر بالعراق لطلاب الهندسة والمصممين! 7 أوراق و20 دولار (1,080,000 د.ع) جديد بالكارتون.',
    posted_ago: 'منذ ساعتين'
  }
];

async function initNeonDatabase() {
  if (!sql) {
    console.log('ℹ️ DATABASE_URL not set — running with in-memory fallback.');
    return;
  }
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS dalal_iraq_offers (
        id SERIAL PRIMARY KEY,
        external_id TEXT UNIQUE,
        title TEXT NOT NULL,
        category TEXT DEFAULT 'عام',
        keywords TEXT[] DEFAULT '{}',
        emoji TEXT DEFAULT '🛍️',
        platform TEXT NOT NULL,
        store_name TEXT NOT NULL,
        verified BOOLEAN DEFAULT true,
        price_iqd INTEGER NOT NULL,
        governorate TEXT NOT NULL,
        district TEXT DEFAULT 'المركز',
        delivery TEXT DEFAULT 'توصيل متوفر',
        phone TEXT DEFAULT '',
        snippet TEXT DEFAULT '',
        posted_ago TEXT DEFAULT 'حديثاً',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS dalal_iraq_searches (
        id SERIAL PRIMARY KEY,
        query TEXT NOT NULL,
        governorate TEXT NOT NULL,
        max_budget INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    const existing = await sql`SELECT COUNT(*)::int AS count FROM dalal_iraq_offers`;
    if (existing[0].count === 0) {
      for (const item of SEED_OFFERS) {
        await sql`
          INSERT INTO dalal_iraq_offers (
            external_id, title, category, keywords, emoji, platform, store_name,
            verified, price_iqd, governorate, district, delivery, phone, snippet, posted_ago
          ) VALUES (
            ${item.external_id}, ${item.title}, ${item.category}, ${item.keywords},
            ${item.emoji}, ${item.platform}, ${item.store_name}, ${item.verified},
            ${item.price_iqd}, ${item.governorate}, ${item.district}, ${item.delivery},
            ${item.phone}, ${item.snippet}, ${item.posted_ago}
          )
          ON CONFLICT (external_id) DO NOTHING;
        `;
      }
      console.log('✅ Seeded Neon database with initial Iraqi offers.');
    } else {
      console.log(`✅ Connected to Neon PostgreSQL (${existing[0].count} offers stored).`);
    }
  } catch (err) {
    console.error('⚠️ Neon DB initialization warning:', err.message);
  }
}

// نقطة فحص صحة الخادم لمنصة Render
app.get('/healthz', async (_req, res) => {
  res.json({
    status: 'ok',
    service: 'iraq-smart-finder',
    neonConnected: Boolean(sql)
  });
});

// جلب جميع العروض من قاعدة بيانات نيون
app.get('/api/offers', async (_req, res) => {
  if (!sql) {
    return res.json({ source: 'memory', offers: [] });
  }
  try {
    const rows = await sql`
      SELECT
        COALESCE(external_id, 'db-' || id::text) AS id,
        title,
        category,
        keywords,
        emoji,
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
      ORDER BY created_at DESC;
    `;
    res.json({ source: 'neon', offers: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// حفظ عرض جديد أو منشور محلل في قاعدة بيانات نيون
app.post('/api/offers', async (req, res) => {
  const {
    title,
    category = 'منشور مضاف',
    keywords = [],
    emoji = '🛍️',
    platform = 'facebook',
    storeName = 'متجر عراقي',
    verified = true,
    priceIQD = 100000,
    governorate = 'baghdad',
    district = 'المركز',
    delivery = 'توصيل متوفر',
    phone = '',
    snippet = ''
  } = req.body || {};

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  if (!sql) {
    return res.status(201).json({ saved: false, source: 'memory' });
  }

  try {
    const extId = `custom-${Date.now()}`;
    const inserted = await sql`
      INSERT INTO dalal_iraq_offers (
        external_id, title, category, keywords, emoji, platform, store_name,
        verified, price_iqd, governorate, district, delivery, phone, snippet, posted_ago
      ) VALUES (
        ${extId}, ${title}, ${category}, ${Array.isArray(keywords) ? keywords : [title]},
        ${emoji}, ${platform}, ${storeName}, ${verified}, ${Number(priceIQD)},
        ${governorate}, ${district}, ${delivery}, ${phone}, ${snippet}, 'أضيف الآن'
      )
      RETURNING
        external_id AS id,
        title,
        category,
        keywords,
        emoji,
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

// تسجيل عمليات البحث في نيون لمعرفة أكثر المنتجات طلباً في كل محافظة
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
    console.log(`🚀 Dalal Al-Iraq running on http://localhost:${PORT}`);
  });
});
