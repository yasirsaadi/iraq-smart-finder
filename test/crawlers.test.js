import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseShanashel, parseAjiiba, parseSitemap, robotsAllows, extractJsonLd, CRAWL_SOURCES } from '../lib/crawlers.js';

const fixture = (name) => fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

test('شناشيل: إعلان عقاري كامل من البيانات المنظمة', () => {
  const l = parseShanashel(fixture('shanashel-property.html'), 'https://shanashel.com/property/71');
  assert.equal(l.url, 'https://shanashel.com/property/71');
  assert.equal(l.section, 'realestate');
  assert.equal(l.title, 'دار سكن في منطقه السيديه قرب شارع النخل');
  assert.equal(l.priceAmount, 600000000);
  assert.equal(l.currency, 'IQD');
  assert.equal(l.deal, 'sale');
  assert.equal(l.region, 'بغداد');
  assert.equal(l.city, 'السيدية');
  assert.equal(l.areaSqm, 150);
  assert.equal(l.rooms, 4);
  assert.equal(l.category, 'بيت للبيع');
  assert.match(l.imageUrl, /^https:\/\/app\.shanashel\.com\//);
  assert.equal(l.postedAt, '2025-10-02T14:26:50.396Z');
  assert.equal(l.sourceName, 'شناشيل (shanashel.com)');
});

test('عجيبة: منتج بسعر ومدينة وحالة', () => {
  const l = parseAjiiba(fixture('ajiiba-listing.html'), 'https://ajiiba.com/ar/listings/a7940404-5063-4a2b-a224-f3a9fed70121');
  assert.equal(l.priceAmount, 100000);
  assert.equal(l.currency, 'IQD');
  assert.equal(l.city, 'أربيل');
  assert.equal(l.condition, 'used');
  assert.equal(l.category, 'تلفزيونات وشاشات');
  assert.equal(l.section, 'products');
  assert.equal(l.postedAt, null, 'لا نختلق تاريخ نشر غير منشور');
});

test('صفحة بلا بيانات منظمة لا تعطي إعلاناً، والكتل التالفة تُتجاوز', () => {
  assert.equal(parseShanashel('<html><body>لا شيء</body></html>', 'https://shanashel.com/property/1'), null);
  assert.equal(parseAjiiba('<script type="application/ld+json">{bad json</script>', 'x'), null);
  assert.equal(extractJsonLd('<script type="application/ld+json">{"@graph":[{"@type":"A"},{"@type":"B"}]}</script>').length, 2);
});

test('خريطة الموقع: الروابط وتواريخ التعديل', () => {
  const xml = '<urlset><url><loc>https://shanashel.com/property/3923</loc><lastmod>2026-11-20T21:35:49Z</lastmod></url><url><loc>https://shanashel.com/properties/baghdad</loc></url></urlset>';
  const entries = parseSitemap(xml);
  assert.deepEqual(entries[0], { loc: 'https://shanashel.com/property/3923', lastmod: '2026-11-20T21:35:49Z' });
  const src = CRAWL_SOURCES.find((s) => s.id === 'shanashel');
  assert.deepEqual(entries.filter((e) => src.urlFilter.test(e.loc)).map((e) => e.loc), ['https://shanashel.com/property/3923'], 'صفحات الأقسام لا تُزحف');
});

test('robots.txt: قواعد "*"، وأولوية مجموعة وكيلنا، واستبعاد الموقع كاملاً', () => {
  const shan = robotsAllows('User-Agent: *\nAllow: /\nDisallow: /api/\nDisallow: /property/*/map\n');
  assert.equal(shan('/property/71'), true);
  assert.equal(shan('/property/71/map'), false);
  assert.equal(shan('/api/x'), false);
  const optOut = robotsAllows('User-agent: *\nAllow: /\n\nUser-agent: IraqPriceRadarBot\nDisallow: /\n');
  assert.equal(optOut('/property/71'), false, 'الموقع استبعد زاحفنا تحديداً');
  assert.equal(robotsAllows('User-agent: *\nDisallow:\n')('/anything'), true, 'Disallow فارغ يسمح بكل شيء');
  assert.equal(robotsAllows('')('/x'), true);
});

test('المواقع التي تمنع شروطها الجمع الآلي غير مشمولة', () => {
  const origins = CRAWL_SOURCES.map((s) => s.origin).join(' ');
  assert.doesNotMatch(origins, /opensooq|kryari|iqcars/);
});
