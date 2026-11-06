import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapSerperOrganic, buildSerperQueries, isSerperConfigured } from '../lib/serper-provider.js';
import { buildLiveOffer } from '../lib/live-results.js';

// عينة مأخوذة من استجابة حقيقية لسيربر (مختصرة)
const ORGANIC = [
  { title: 'ايفون 15 برو ماكس ضمان ماستر بطارية 89🔋 ذاكرة 256 السعر 1140', link: 'https://www.facebook.com/groups/iraq.iphones/posts/3761370334163371/', snippet: 'ايفون 15 برو ماكس ضمان ماستر بطارية 89 ذاكرة 256 السعر 1140 ألف عنواني بغداد البنوك', date: '٣ أيام' },
  { title: 'Apple iPhone 15 Pro Max', link: 'https://www.jibalzone.com/ar/product/x', snippet: 'Apple iPhone 15 Pro Max. ع.د 1,908,159.' },
  { title: 'موبايل ايفون 15 برو ماكس للبيع في العراق ‏(171) - السوق المفتوح', link: 'https://iq.opensooq.com/ar/x', snippet: 'ايفون 15 برو ماكس للبيع السعر 900 الف' },
  { title: 'مطلووب ايفون 15 برو ماكس بغداد', link: 'https://www.facebook.com/p/2', snippet: 'مطلوب ايفون 15 برو ماكس بسعر مناسب' },
  { title: 'تليفون ايفون 15 برو ماكس بقسط شهري (82،000)', link: 'https://www.instagram.com/reel/abc/', snippet: 'ايفون 15 برو ماكس بقسط شهري (82،000) العنوان / بغداد' },
  { title: 'نتيجة غير مستعادة', link: 'https://www.google.com/goto?url=CAES123', snippet: 'ايفون 15 برو ماكس' },
  { title: 'رابط خبيث', link: 'javascript:alert(1)', snippet: 'x' }
];

const ctx = { query: 'ايفون 15 برو ماكس', sectionHint: 'all', usdRate: 1500, detectGov: () => ({ governorate: 'baghdad', district: 'بغداد' }) };

test('mapSerperOrganic يتجاهل روابط التحويل غير المستعادة والروابط الخطرة', () => {
  const rows = mapSerperOrganic(ORGANIC);
  assert.equal(rows.length, 5);
  assert.ok(rows.every((r) => /^https:\/\//.test(r.url) && !r.url.includes('google.com/goto')));
  assert.equal(rows[0].searchDateText, '٣ أيام');
});

test('نتائج سيربر الحقيقية تتحول إلى عروض صحيحة', () => {
  const offers = mapSerperOrganic(ORGANIC).map((r) => buildLiveOffer(r, ctx));
  const [fb, store, listing, wanted, installment] = offers;
  assert.equal(fb.priceIQD, 1_140_000);
  assert.equal(fb.platform, 'facebook');
  assert.equal(fb.searchDateText, '٣ أيام');
  assert.equal(store.priceIQD, 1_908_159, 'صيغة ع.د');
  assert.equal(listing.isListingPage, true);
  assert.equal(listing.priceIQD, null, 'صفحة الفئة لا تعطي سعر عرض واحد');
  assert.equal(wanted, null, 'منشور "مطلوب" ليس عرض بيع');
  assert.equal(installment.priceIQD, null, 'القسط الشهري ليس سعر السلعة');
});

test('خطة الاستعلامات: ثلاثة استعلامات تشمل المنصات والمتاجر العراقية', () => {
  const plan = buildSerperQueries('ايفون 15', 'بغداد', 'all');
  assert.equal(plan.length, 3);
  assert.match(plan[1].q, /site:facebook\.com OR site:instagram\.com/);
  assert.match(plan[2].q, /site:iq\.opensooq\.com/);
  assert.match(plan[2].q, /site:elryan\.com/);
  assert.match(plan[2].q, /site:miswag\.com/);
});

test('المزود غير مفعل دون مفتاح', () => {
  const saved = process.env.SERPER_API_KEY;
  delete process.env.SERPER_API_KEY;
  assert.equal(isSerperConfigured(), false);
  if (saved !== undefined) process.env.SERPER_API_KEY = saved;
});

test('صفحات الفئات في السوق المفتوح لا تعطي سعراً، والإعلان الفردي يعطي', () => {
  const mk = (title, url, snippet) => buildLiveOffer({ url, host: new URL(url).hostname.replace(/^www\./, ''), title, snippet }, { ...ctx, query: 'كيا سبورتاج 2023', sectionHint: 'cars' });
  const listing = mk('68 كيا سبورتاج 2023 مستعملة للبيع في العراق - السوق المفتوح', 'https://iq.opensooq.com/ar/cars/kia/sportage', 'كيا سبورتاج 2023 السعر 19237 دولار');
  assert.equal(listing.isListingPage, true);
  assert.equal(listing.priceIQD, null);
  const ad = mk('كيا سبورتاج 2023 للبيع - (286896354) | OpenSooq', 'https://iq.opensooq.com/ar/search/286896354', 'كيا سبورتاج 2023 السعر دفتر و95 ورقة');
  assert.equal(ad.isListingPage, false);
  assert.equal(ad.priceIQD, 29_250_000);
});
