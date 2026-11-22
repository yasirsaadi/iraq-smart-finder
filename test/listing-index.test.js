import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createListingIndex, normalizeIncomingListing, buildPriceGuide } from '../lib/listing-index.js';

const detectGov = (t) => (/بغداد/.test(t) ? { governorate: 'baghdad', district: 'بغداد' } : /البصرة/.test(t) ? { governorate: 'basra', district: 'البصرة' } : null);
const raw = (over = {}) => ({
  url: 'https://shanashel.com/property/71',
  source: 'shanashel.com',
  sourceName: 'شناشيل (shanashel.com)',
  section: 'realestate',
  title: 'بيت للبيع في السيدية',
  description: 'دار حديث 4 نوم',
  priceAmount: 600000000,
  currency: 'IQD',
  deal: 'sale',
  region: 'بغداد',
  city: 'السيدية',
  areaSqm: 150,
  rooms: 4,
  postedAt: '2026-11-01T10:00:00Z',
  ...over
});

test('تنظيف الإعلان القادم: سعر بالدينار أو الدولار، ورفض الروابط والأقسام غير الصالحة', () => {
  const l = normalizeIncomingListing(raw(), { detectGov });
  assert.equal(l.priceIQD, 600000000);
  assert.equal(l.governorate, 'baghdad');
  assert.equal(l.postedAt, '2026-11-01T10:00:00.000Z');
  assert.equal(normalizeIncomingListing(raw({ priceAmount: 20000, currency: 'USD', section: 'cars', title: 'كامري 2020' }), { usdRate: 1500 }).priceIQD, 30_000_000);
  assert.equal(normalizeIncomingListing(raw({ url: 'javascript:alert(1)' })), null);
  assert.equal(normalizeIncomingListing(raw({ section: 'weapons' })), null);
  assert.equal(normalizeIncomingListing(raw({ currency: 'EUR' })).priceIQD, null, 'عملة غير معروفة: بلا سعر');
  assert.equal(normalizeIncomingListing(raw({ postedAt: '2099-01-01' })).postedAt, null, 'لا تواريخ مستقبلية');
});

test('الفهرس: بحث مجاني ذو صلة، ومحافظة المستخدم أولاً، وسعر معلن من الموقع', async () => {
  const idx = createListingIndex({ sql: null });
  await idx.upsertListings([
    normalizeIncomingListing(raw(), { detectGov }),
    normalizeIncomingListing(raw({ url: 'https://shanashel.com/property/72', title: 'بيت للبيع في البصرة الجزائر', region: 'البصرة', city: 'الجزائر' }), { detectGov }),
    normalizeIncomingListing(raw({ url: 'https://shanashel.com/property/73', title: 'شقة للايجار في المنصور', deal: 'rent', priceAmount: 800000 }), { detectGov })
  ]);
  const hits = await idx.search({ query: 'بيت للبيع', section: 'realestate', governorate: 'basra' });
  assert.equal(hits.length, 2);
  assert.equal(hits[0].governorate, 'basra', 'محافظة المستخدم أولاً');
  const h = hits.find((x) => x.directUrl.endsWith('/71'));
  assert.equal(h.source, 'indexed');
  assert.equal(h.storeName, 'شناشيل (shanashel.com)');
  assert.equal(h.priceSource, 'listing_structured_data');
  assert.equal(h.specs.areaSqm, 150);
  assert.equal(h.isListingPage, false);
  assert.equal(h.phone, null, 'لا أرقام هواتف من الزاحف');
  assert.equal((await idx.search({ query: 'سيارة كامري', section: 'all' })).length, 0);
});

test('ذاكرة الأسعار: إعلانات البيع الفردية فقط، والإيجار وصفحات الأقسام مستبعدة', async () => {
  const idx = createListingIndex({ sql: null });
  const live = (id, title, price, extra = {}) => ({ directUrl: `https://www.facebook.com/p/${id}`, section: 'cars', title, priceIQD: price, platform: 'facebook', ...extra });
  const n = await idx.recordLiveOffers([
    live(1, 'تويوتا كامري 2020 للبيع', 30_000_000),
    live(2, 'تويوتا كامري 2020 نظيفة', 31_000_000),
    live(3, 'كامري 2020 وارد', 29_000_000),
    live(4, 'تويوتا كامري 2020 صفحة قسم', 25_000_000, { isListingPage: true }),
    live(5, 'كامري 2020 للايجار', 900_000, { priceIsRent: true }),
    live(6, 'كامري 2020 بلا سعر', null)
  ]);
  assert.equal(n, 3);
  const guide = await idx.priceGuide({ query: 'كامري 2020', section: 'cars' });
  assert.equal(guide.count, 3);
  assert.equal(guide.enough, true);
  assert.equal(guide.median, 30_000_000);
  assert.deepEqual(guide.byKind, { estimated: 3 });
  assert.equal((await idx.priceGuide({ query: 'سوناتا 2020', section: 'cars' })).count, 0);
});

test('دليل السعر: أقل من 3 أسعار ليس كافياً، وسعر المتر للعقارات', () => {
  const obs = (i, price, area) => ({ url: `u${i}`, title: 'بيت للبيع في بغداد', groupKey: 'realestate|sale|house', priceIQD: price, areaSqm: area, priceKind: 'declared', observedAt: '2026-11-20T00:00:00Z' });
  const small = buildPriceGuide('بيت للبيع', 'realestate', [obs(1, 300e6, 150), obs(2, 320e6, 160)]);
  assert.equal(small.enough, false);
  const g = buildPriceGuide('بيت للبيع', 'realestate', [obs(1, 300e6, 150), obs(2, 320e6, 160), obs(3, 400e6, 200), obs(4, 360e6, 180)]);
  assert.equal(g.enough, true);
  assert.equal(g.perSqmMedian, 2_000_000);
  assert.equal(g.lastObservedAt, '2026-11-20T00:00:00.000Z');
});

test('الفهرس: "بي ام دبليو" لا يعيد أحذية أو بيوتاً، ودليل السعر لا يخلط أرضاً ببيوت', async () => {
  const idx = createListingIndex({ sql: null });
  const mk = (n, title, section, price) => normalizeIncomingListing({ ...raw({ url: `https://ajiiba.com/ar/listings/${n}`, title, section, priceAmount: price }), description: '' }, { detectGov });
  await idx.upsertListings([
    mk('a1', 'حذاء ابيض مستخدم قياس 39', 'products', 30000),
    mk('a2', 'سوت الأحلام اصلي قطعه نادره', 'products', 100000),
    mk('a3', 'بي ام دبليو 520i موديل 2018 للبيع', 'cars', 32_000_000),
    mk('a4', 'بيت للبيع امام الجامع', 'realestate', 200_000_000)
  ]);
  const hits = await idx.search({ query: 'بي ام دبليو', section: 'all' });
  assert.deepEqual(hits.map((h) => h.title), ['بي ام دبليو 520i موديل 2018 للبيع']);

  const obs = (i, title, price) => ({ url: `u${i}`, title, groupKey: 'realestate|sale|house', priceIQD: price, areaSqm: null, priceKind: 'declared', observedAt: '2026-11-20T00:00:00Z' });
  const guide = buildPriceGuide('بيت للبيع', 'realestate', [
    obs(1, 'بيت للبيع في السيدية', 300e6), obs(2, 'بيت للبيع في الدورة', 320e6), obs(3, 'بيت للبيع في البياع', 340e6),
    // مفتاح قديم خاطئ (house) لعنوان أرض: يُصحح من العنوان ويُستبعد من دليل البيوت
    obs(4, 'قطعة ارض للبيع قرب بيت الحاج', 40e6), obs(5, 'قطعة ارض للبيع 100 متر بيت', 45e6)
  ]);
  assert.equal(guide.count, 3, 'الأراضي خارج دليل البيوت');
  assert.equal(guide.median, 320e6);
});

test('دليل السعر يفضّل محافظة الباحث إن كفت بياناتها، وإلا العراق كله', async () => {
  const idx = createListingIndex({ sql: null });
  const live = (id, price, governorate) => ({ directUrl: `https://www.facebook.com/p/${id}`, section: 'cars', title: 'تويوتا كامري 2020 للبيع', priceIQD: price, locationDetected: true, governorate, platform: 'facebook' });
  await idx.recordLiveOffers([live(1, 30e6, 'baghdad'), live(2, 31e6, 'baghdad'), live(3, 32e6, 'baghdad'), live(4, 25e6, 'basra'), live(5, 26e6, 'basra')]);
  const bg = await idx.priceGuide({ query: 'كامري 2020', section: 'cars', governorate: 'baghdad' });
  assert.equal(bg.scope, 'governorate');
  assert.equal(bg.median, 31e6);
  const bs = await idx.priceGuide({ query: 'كامري 2020', section: 'cars', governorate: 'basra' });
  assert.equal(bs.scope, 'iraq', 'سعران في البصرة لا يكفيان');
  assert.equal(bs.count, 5);
});
