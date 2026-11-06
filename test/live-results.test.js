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
