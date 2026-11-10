import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseYahooResults, buildLiveOffer, describeSource } from '../lib/live-results.js';

const block = (url, title, snippet) =>
  `<div class="dd algo algo-sr"><a href="https://r.search.yahoo.com/_ylt=x/RU=${encodeURIComponent(url)}/RK=2/RS=y">` +
  `<h3 class="title">${title}</h3></a><div class="compText aAbs">${snippet}</div></div>`;

const FIXTURE = [
  block('https://www.facebook.com/groups/iqcars/posts/123', 'كيا سبورتاج 2023 للبيع - Facebook', 'كيا سبورتاج 2023 وارد امريكي ماشية 18 الف ميل السعر دفتر و95 ورقة 07701234567 بغداد'),
  block('https://www.instagram.com/p/abc/', 'كيا سبورتاج &lt;img src=x onerror=alert(1)&gt;', 'سبورتاج 2024 زيرو السعر 3 دفاتر'),
  block('javascript:alert(1)', 'كيا سبورتاج خبيث', 'السعر دفترين'),
  block('https://example.iq/item', 'كيا سبورتاج 2022', 'ماشية 150 الف كم بدون سعر'),
  block('https://search.yahoo.com/other', 'نتيجة من ياهو', 'تجاهل')
].join('\n');

test('parseYahooResults يستخرج الرابط الأصلي ويرفض الخطير', () => {
  const rows = parseYahooResults(`<html>${FIXTURE}</html>`);
  assert.deepEqual(rows.map((r) => r.host), ['facebook.com', 'instagram.com', 'example.iq']);
  assert.equal(rows[0].url, 'https://www.facebook.com/groups/iqcars/posts/123');
  assert.ok(!rows[1].title.includes('<'), 'لا وسوم في العنوان بعد فك الترميز');
});

test('buildLiveOffer لا يختلق تقييماً أو توثيقاً أو وقتاً أو أجور توصيل', () => {
  const rows = parseYahooResults(FIXTURE);
  const offer = buildLiveOffer(rows[0], { query: 'كيا سبورتاج', sectionHint: 'cars', usdRate: 1500, detectGov: () => ({ governorate: 'baghdad', district: 'بغداد' }) });
  assert.equal(offer.source, 'live');
  assert.equal(offer.verified, false);
  assert.equal(offer.trustRating, null);
  assert.equal(offer.reviewsCount, 0);
  assert.equal(offer.allowsInspection, null);
  assert.equal(offer.postedAgo, null);
  assert.equal(offer.postedAt, null);
  assert.equal(offer.deliveryLocalIQD, null);
  assert.equal(offer.priceIQD, 29_250_000);
  assert.equal(offer.priceSource, 'search_snippet');
  assert.equal(offer.priceBasis, 'USD');
  assert.equal(offer.amountUSD, 19_500);
  assert.equal(offer.phone, '07701234567');
  assert.equal(offer.phoneSource, 'search_snippet');
  assert.equal(offer.directUrl, 'https://www.facebook.com/groups/iqcars/posts/123');
  assert.equal(offer.specs.origin, 'وارد أمريكي');
  assert.equal(offer.specs.plate, undefined, 'لا رقم لوحة مفترض');
});

test('buildLiveOffer: الموقع غير المكتشف يبقى فارغاً', () => {
  const rows = parseYahooResults(FIXTURE);
  const offer = buildLiveOffer(rows[2], { query: 'كيا سبورتاج', sectionHint: 'cars', usdRate: 1500, detectGov: () => null });
  assert.equal(offer.locationDetected, false);
  assert.equal(offer.governorate, null);
  assert.equal(offer.priceIQD, null, 'الممشى ليس سعراً');
});

test('buildLiveOffer يستبعد غير ذي الصلة والأقسام المخالفة', () => {
  const raw = { url: 'https://x.iq/1', host: 'x.iq', title: 'شقة للبيع في بسماية', snippet: 'شقة 100 م2 السعر 105 مليون' };
  assert.equal(buildLiveOffer(raw, { query: 'شقة بسماية', sectionHint: 'cars' }), null);
  assert.equal(buildLiveOffer(raw, { query: 'ايفون 15', sectionHint: 'all' }), null);
  const ok = buildLiveOffer(raw, { query: 'شقة بسماية', sectionHint: 'all' });
  assert.equal(ok.section, 'realestate');
  assert.equal(ok.priceIQD, 105_000_000);
});

test('describeSource لا يدعي هوية متجر', () => {
  assert.equal(describeSource('m.facebook.com').platform, 'facebook');
  assert.equal(describeSource('opensooq.com').storeName, 'opensooq.com');
  assert.equal(describeSource('evilfacebook.com').platform, 'google');
});

test('صفحة بلا نتائج قابلة للقراءة (تحقق أو بنية متغيرة) تعيد قائمة فارغة', () => {
  assert.deepEqual(parseYahooResults('<html><body>Please verify you are human</body></html>'), []);
  assert.deepEqual(parseYahooResults(''), []);
});

test('المواقع العراقية المضافة: اسم المصدر الصحيح، والإعلان الفردي فقط يعطي سعراً', () => {
  const ctx2 = { gov: 'baghdad', detectGov: () => ({ gov: 'baghdad', district: 'بغداد', detected: true }), usdRate: 1500 };
  const mk = (url, title, snippet, query, sectionHint) =>
    buildLiveOffer({ url, host: new URL(url).hostname.replace(/^www\./, ''), title, snippet }, { ...ctx2, query, sectionHint });

  const carAd = mk('https://www.cars.iq/front/car-detail/12482', 'تويوتا كامري 2020 - Cars.iq', 'Toyota Camry 2020 تويوتا كامري 2020 وارد امريكي السعر 21 مليون', 'تويوتا كامري 2020', 'cars');
  assert.equal(carAd.storeName, 'Cars.iq (cars.iq)');
  assert.equal(carAd.directUrl, 'https://www.cars.iq/front/car-detail/12482', 'الرابط الأصلي كما هو');
  assert.equal(carAd.isListingPage, false);
  assert.equal(carAd.priceIQD, 21_000_000);

  const compare = mk('https://www.iqcars.iq/ar/compare/toyota-camry-2021-vs-nissan', 'تويوتا كامري 2021 LE-2.5-vs-نيسان باترول 2026', 'تويوتا كامري السعر 30 مليون', 'تويوتا كامري', 'cars');
  assert.equal(compare.storeName, 'IQ Cars (iqcars.iq)');
  assert.equal(compare.isListingPage, true, 'صفحة مقارنة مواصفات ليست إعلاناً');
  assert.equal(compare.priceIQD, null);

  const estateCat = mk('https://shanashel.com/properties/baghdad/hay-al-bunuk/sell-houses', 'بيوت للبيع في حي البنوك بغداد | شناشيل', 'بيت للبيع 250 متر السعر 300 مليون', 'بيت للبيع بغداد', 'realestate');
  assert.equal(estateCat.storeName, 'شناشيل (shanashel.com)');
  assert.equal(estateCat.isListingPage, true);
  assert.equal(estateCat.priceIQD, null);

  const phoneAd = mk('https://albastiya.com/listings/ad5f29fa-a906-4d4a-a969-e413576f911d', 'ايفون 15 — موبايلات | البسطية', 'ايفون 15 للبيع 1,250,000 IQD بغداد', 'ايفون 15', 'products');
  assert.equal(phoneAd.storeName, 'البسطية (albastiya.com)');
  assert.equal(phoneAd.isListingPage, false);
  assert.ok(phoneAd.priceIQD > 0);
  assert.equal(mk('https://albastiya.com/wanted/5fd9be92-0139-47cc-89dd-c10a500a44d0', 'ايفون 15 للشراء | البسطية', 'ايفون 15', 'ايفون 15', 'products'), null, 'صفحات "مطلوب" ليست عروضاً');
  assert.equal(mk('https://albastiya.com/category/electronics', 'ايفون 15 إعلانات الهواتف - البسطية', 'ايفون 15 1,250,000 IQD', 'ايفون 15', 'products').isListingPage, true);

  assert.equal(mk('https://www.soqna-iq.com/view_category.php?cat=phones', 'ايفون 15 قسم الهواتف - سوقنه', 'ايفون 15 5,000,000 دينار', 'ايفون 15', 'products').isListingPage, true);
  assert.equal(mk('https://ajiiba.com/en/listings/7de5df64-739d-4250-95c0-538ff995a0c5', 'For Sale – ايفون 15 · Erbil - Ajiiba', 'ايفون 15 1 730 000 IQD', 'ايفون 15', 'products').isListingPage, false);
  assert.equal(mk('https://ajiiba.com/en/c/electronics', 'ايفون 15 Electronics for sale - Ajiiba', 'ايفون 15', 'ايفون 15', 'products').isListingPage, true);
  const kryari = mk('https://kryari.com/ar/l/9190db1c-382f-4e84-9d39-a0795a7a60fc/apple-iphone-15-case', 'ايفون 15 كفر · 98,000 د.ع · KRYARI', 'ايفون 15 كفر', 'ايفون 15', 'products');
  assert.equal(kryari.storeName, 'KRYARI (kryari.com)');
  assert.equal(kryari.isListingPage, false);
  assert.equal(mk('https://iraq-sooq.com/category/tibbi', 'ايفون 15 المستلزمات - سوق العراق', 'ايفون 15', 'ايفون 15', 'products').isListingPage, true);
  // أسماء المصادر ليست أسماء تجار
  assert.equal(describeSource('elryan.com').storeName, 'الريان (elryan.com)');
});
