// اختبار متصفح حقيقي (Playwright + Chromium). يُشغَّل بـ: npm run test:e2e
// يتخطى نفسه تلقائياً إذا لم تكن مكتبة playwright مثبتة.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
let chromium = null;
try {
  ({ chromium } = require('playwright'));
} catch {
  chromium = null;
}
const SKIP = chromium ? false : 'playwright غير مثبت';
const SHOTS = process.env.E2E_SCREENSHOT_DIR || '';

function startServer(port, extraEnv = {}) {
  const env = { ...process.env, PORT: String(port), DATABASE_URL: '', DEMO_MODE: '', PAYMENTS_ENABLED: '', ALERTS_DELIVERY_ENABLED: '', GOOGLE_CLIENT_ID: 'disabled', ...extraEnv };
  const child = spawn(process.execPath, ['server.js'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server did not start')), 8000);
    child.stdout.on('data', (d) => {
      if (String(d).includes('running on')) {
        clearTimeout(timer);
        resolve(child);
      }
    });
  });
}

const XSS_IMG = '<img src=x onerror="window.__xss=1">';
const liveOffer = (id, title, priceIQD, extra = {}) => ({
  id,
  source: 'live',
  section: 'products',
  specs: {},
  title,
  category: 'سلع وأجهزة',
  keywords: ['ايفون 15'],
  platform: 'facebook',
  storeName: 'منشور أو صفحة على فيسبوك',
  verified: false,
  allowsInspection: null,
  trustRating: null,
  reviewsCount: 0,
  priceIQD,
  priceBasis: 'IQD',
  amountUSD: null,
  priceSource: 'search_snippet',
  priceMeta: { matchedText: `${priceIQD} دينار` },
  deliveryLocalIQD: null,
  deliveryNationalIQD: null,
  governorate: 'baghdad',
  district: 'بغداد',
  locationDetected: true,
  phone: null,
  snippet: 'ايفون 15 للبيع',
  directUrl: `https://www.facebook.com/groups/x/posts/${id}`,
  postedAgo: null,
  postedAt: null,
  imageUrl: null,
  ...extra
});

const MOCK_LIVE = {
  providerOk: true,
  offers: [
    liveOffer('a1', `ايفون 15 ${XSS_IMG}`, 1_500_000, {
      storeName: "x');window.__xss=2;//",
      snippet: '<script>window.__xss=3</script> ايفون 15',
      directUrl: 'javascript:window.__xss=4',
      imageUrl: 'javascript:window.__xss=5',
      phone: "07701234567');window.__xss=6;//",
      district: '<svg onload="window.__xss=7">'
    }),
    liveOffer('a2', 'ايفون 15 برو', 1_550_000, { phone: '07701234567' }),
    liveOffer('a3', 'ايفون 15 نظيف', 1_600_000),
    liveOffer('a4', 'ايفون 15 مختوم', 1_620_000),
    liveOffer('a5', 'ايفون 15 سعر خاطئ', 20_000),
    liveOffer('a6', 'كفر ايفون 15 اصلي', 15_000)
  ]
};

let browser;
let prod;
let demo;
const PROD = 3881;
const DEMO = 3882;

before(async () => {
  if (SKIP) return;
  prod = await startServer(PROD);
  demo = await startServer(DEMO, { DEMO_MODE: 'true' });
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
  prod?.kill();
  demo?.kill();
});

async function openPage(port) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('dialog', (d) => {
    errors.push(`dialog: ${d.message()}`);
    d.dismiss();
  });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
  return { page, errors };
}

test('الإنتاج: لا بيانات تجريبية ولا وعود اشتراك أو تنبيهات', { skip: SKIP }, async () => {
  const { page, errors } = await openPage(PROD);
  assert.equal(await page.isVisible('#openSubscriptionBtn'), false);
  assert.equal(await page.isVisible('#openRadarBtn'), false);
  assert.equal(await page.isVisible('#createAlertFromMeterBtn'), false);
  assert.equal(await page.locator('#resultsGrid article').count(), 0);
  assert.match(await page.textContent('#resultsGrid'), /ابدأ بالبحث/);
  assert.equal(await page.textContent('#countAll'), '0');
  // فواصل الآلاف في حقول المبالغ دون أخطاء في القراءة
  assert.equal(await page.inputValue('#exchangeRateInput'), '150,000');
  await page.click('#maxBudgetInput');
  await page.keyboard.type('25000000');
  assert.equal(await page.inputValue('#maxBudgetInput'), '25,000,000');
  await page.keyboard.press('Home');
  await page.keyboard.press('Delete');
  assert.equal(await page.inputValue('#maxBudgetInput'), '5,000,000', 'حذف رقم يعيد التنسيق صحيحاً');
  await page.evaluate(() => document.getElementById('analyzerModal').showModal());
  assert.equal(await page.inputValue('#postDeliveryLocal'), '4,000', 'القيمة الافتراضية منسقة عند التحميل');
  await page.click('#postDeliveryLocal', { clickCount: 3 });
  await page.keyboard.type('١٢٥٠٠');
  assert.equal(await page.inputValue('#postDeliveryLocal'), '12,500', 'الأرقام العربية تتحول وتُنسَّق');
  assert.match(await page.textContent('#analyzerModal .money-hint'), /12,500 د\.ع/);
  await page.evaluate(() => document.getElementById('analyzerModal').close());
  // سعر الصرف الذي يختاره المستخدم يبقى بعد تحديث الصفحة
  await page.click('#exchangeRateInput', { clickCount: 3 });
  await page.keyboard.type('152500');
  assert.equal(await page.inputValue('#exchangeRateInput'), '152,500');
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.inputValue('#exchangeRateInput'), '152,500', 'سعر الصرف المختار يبقى بعد التحديث');
  await page.evaluate(() => localStorage.removeItem('radar_exchange_rate'));
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'prod-empty.png'), fullPage: false });
  assert.deepEqual(errors, []);
  await page.close();
});

test('النصوص الخارجية الخبيثة لا تُنفَّذ، والمقارنة داخل المماثل فقط', { skip: SKIP }, async () => {
  const { page, errors } = await openPage(PROD);
  await page.route('**/api/live-search**', (route) => route.fulfill({ json: MOCK_LIVE }));
  await page.route('**/api/reviews**', (route) =>
    route.fulfill({ json: { reviews: [{ rating: 5, allows_inspection: true, comment: '<img src=x onerror="window.__xss=8">', reviewer_gov: 'baghdad' }] } })
  );
  await page.fill('#searchQuery', 'ايفون 15');
  await page.press('#searchQuery', 'Enter');
  await page.waitForSelector('#resultsGrid article');
  assert.equal(await page.locator('#resultsGrid article').count(), 6);

  // لا تنفيذ لأي شيفرة محقونة
  assert.equal(await page.evaluate(() => window.__xss), undefined);
  assert.equal(await page.locator('#resultsGrid img[src="x"], #resultsGrid script, #resultsGrid svg[onload]').count(), 0);
  const hrefs = await page.$$eval('#resultsGrid a.btn-open-offer', (as) => as.map((a) => a.getAttribute('href')));
  assert.ok(hrefs.every((h) => /^https:\/\//.test(h)), hrefs.join(' | '));
  assert.match(await page.textContent('[data-offer-id="a1"] .product-title'), /<img src=x/);

  // زر التقييم بالتفويض يعرض اسم المتجر نصاً فقط، والتعليق الخبيث لا يُنفَّذ
  await page.click('[data-offer-id="a1"] .trust-rate-btn');
  await page.waitForSelector('#storeReviewsList .alert-row strong');
  assert.equal(await page.evaluate(() => window.__xss), undefined);
  assert.match(await page.textContent('#reviewModalStoreTitle'), /window\.__xss=2/);
  await page.click('#closeReviewBtn');

  // لا تقييم ولا وقت ولا توثيق مختلق
  const card = await page.textContent('[data-offer-id="a2"]');
  assert.match(card, /لا توجد تقييمات/);
  assert.match(card, /بلا تاريخ نشر/);
  assert.match(card, /غير موثق/);
  assert.doesNotMatch(card, /4\.8/);

  // المؤشر: الوسيط والمتوسط الحسابي لمجموعة الهواتف فقط (الكفر مستبعد، والسعر الخاطئ شاذ)
  assert.match(await page.textContent('#meterAvgPrice'), /1,550,000/);
  const fair = await page.textContent('#meterFairNote');
  assert.match(fair, /الوسيط لـ 5 عرض مماثل/);
  assert.match(fair, /هواتف ذكية/);
  assert.match(fair, /المتوسط الحسابي: 1,258,000/);
  assert.match(await page.textContent('#meterMinPrice'), /1,500,000/);
  assert.match(await page.textContent('#meterMinNote'), /استُبعد 1/);
  const outlierCard = await page.textContent('[data-offer-id="a5"]');
  assert.match(outlierCard, /سعر شاذ/);
  assert.doesNotMatch(outlierCard, /الترشيح الأفضل|الأقل سعراً/, 'السعر الشاذ لا يُرشَّح');
  assert.doesNotMatch(await page.textContent('[data-offer-id="a6"]'), /أغلى من الوسيط|الأقل سعراً/);
  assert.equal(await page.textContent('#bestPriceValue'), '1,500,000 د.ع');

  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'live-mock.png'), fullPage: true });
  assert.deepEqual(errors, []);
  await page.close();
});

test('لا حكم على الأرخص أو السعر العادل دون 3 عروض متجانسة، والأسعار المستخرجة تقديرية والمسافات صادقة', { skip: SKIP }, async () => {
  const { page, errors } = await openPage(PROD);
  const two = {
    providerOk: true,
    offers: [
      liveOffer('b1', 'ايفون 15 نظيف', 1_500_000),
      liveOffer('b2', 'ايفون 15 مستعمل', 1_400_000, { governorate: 'basra', district: 'البصرة' }),
      liveOffer('b3', 'ايفون 15 بدون سعر', null, { governorate: 'baghdad', locationDetected: false })
    ]
  };
  await page.route('**/api/live-search**', (route) => route.fulfill({ json: two }));
  await page.fill('#searchQuery', 'ايفون 15');
  await page.press('#searchQuery', 'Enter');
  await page.waitForSelector('#resultsGrid article');

  assert.match(await page.textContent('#bestPriceTitle'), /لا توجد 3 عروض متجانسة/);
  assert.equal(await page.textContent('#bestPriceValue'), '—');
  assert.match(await page.textContent('#smartMatchTitle'), /لا توجد 3 عروض متجانسة/);
  assert.equal(await page.textContent('#meterAvgPrice'), '—');
  assert.match(await page.textContent('#meterFairNote'), /عينة غير كافية: 2/);
  const grid = await page.textContent('#resultsGrid');
  assert.doesNotMatch(grid, /الأقل سعراً بين العروض المماثلة|الترشيح الأفضل|أغلى من الوسيط/);

  const local = await page.textContent('[data-offer-id="b1"]');
  assert.match(local, /سعر تقديري مستخرج آلياً من مقتطف البحث/);
  assert.match(local, /• تقديري/);
  assert.match(local, /داخل محافظتك \(المسافة الفعلية غير معروفة\)/);
  assert.doesNotMatch(local, /(^|\D)0 كم/);
  assert.match(await page.textContent('[data-offer-id="b2"]'), /نحو \d+0 كم بخط مستقيم بين مركزي المحافظتين \(ليست مسافة الطريق\)/);
  assert.match(await page.textContent('[data-offer-id="b3"]'), /الموقع غير محدد في الإعلان/);
  assert.doesNotMatch(await page.textContent('#nearestItemDistance'), /(^|\D)0 كم/);
  assert.deepEqual(errors, []);
  await page.close();
});

test('البحث بصورة: الصورة للمعاينة فقط ولا يُستنتج شيء من اسم الملف', { skip: SKIP }, async () => {
  const { page, errors } = await openPage(PROD);
  await page.click('#openImageSearchBtn');
  const text = await page.textContent('#imageSearchModal');
  assert.match(text, /للمعاينة فقط/);
  assert.doesNotMatch(text, /نستخرج|لنستخرج|تحليل الصورة آلياً/);
  await page.setInputFiles('#adScreenshotInput', { name: 'iphone-15-pro-max.png', mimeType: 'image/png', buffer: Buffer.from('89504e470d0a1a0a', 'hex') });
  assert.equal(await page.inputValue('#imageExtractedQuery'), '', 'لا تعبئة آلية من اسم الملف');
  assert.deepEqual(errors, []);
  await page.close();
});

test('إضافة عرض دون تسجيل دخول: لا يظهر العرض ولا رسالة نجاح', { skip: SKIP }, async () => {
  const { page, errors } = await openPage(PROD);
  let posted = false;
  await page.route('**/api/offers', (route) => {
    if (route.request().method() === 'POST') posted = true;
    route.continue();
  });
  await page.click('#openAnalyzerBtn');
  await page.fill('#postStoreName', 'متجر تجريبي');
  await page.fill('#postRawText', 'ايفون 15 للبيع السعر مليون ونص بغداد 07701234567');
  await page.click('#analyzerSubmitBtn');
  await page.waitForSelector('#analyzerFormStatus:not([hidden])');
  assert.match(await page.textContent('#analyzerFormStatus'), /تتطلب تسجيل الدخول/);
  assert.equal(posted, false);
  assert.equal(await page.locator('#resultsGrid article').count(), 0);
  assert.deepEqual(errors, []);
  await page.close();
});

test('وضع العرض التجريبي: العروض موسومة وأسعار العقارات لا تدخل في مقارنة الأجهزة', { skip: SKIP }, async () => {
  const { page, errors } = await openPage(DEMO);
  await page.waitForSelector('#resultsGrid article');
  assert.equal(await page.locator('#resultsGrid article').count(), 30);
  assert.equal(await page.locator('#resultsGrid .ribbon-tag', { hasText: 'عرض تجريبي' }).count(), 30);
  assert.match(await page.textContent('#searchStatusBanner'), /وضع العرض التجريبي/);

  await page.click('.vertical-tab[data-section="products"]');
  const fair = await page.textContent('#meterFairNote');
  assert.doesNotMatch(await page.textContent('#meterAvgPrice'), /مليون/, 'وسيط الأجهزة بالآلاف لا بالملايين');
  assert.match(fair, /سلع •/);
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'demo-products.png'), fullPage: false });
  assert.deepEqual(errors, []);
  await page.close();
});
