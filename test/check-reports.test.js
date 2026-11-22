import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanCheckInput, buildCheckReport, renderReportPage, reportHeadline, createReportStore } from '../lib/check-reports.js';

const guide = { count: 12, enough: true, median: 30_000_000, q1: 28_000_000, q3: 32_000_000, label: 'سيارات • كامري', windowDays: 120, byKind: { estimated: 12 } };
const deps = (decoded = { make: 'TOYOTA', model: 'Camry', modelYear: 2017 }) => ({
  listingIndex: { priceGuide: async () => guide },
  vinDecoder: { decode: async (vin) => ({ vin, valid: true, checkDigitOk: true, region: { code: 'north_america', label: 'صُنعت في أمريكا الشمالية' }, decoded }) }
});

test('مدخلات التقرير: رفض الناقص، وتجاهل الشاصي لغير السيارات', () => {
  assert.equal(cleanCheckInput({ query: '', section: 'cars', price: 1 }), null);
  assert.equal(cleanCheckInput({ query: 'كامري', section: 'weapons', price: 1 }), null);
  assert.equal(cleanCheckInput({ query: 'كامري', section: 'cars', price: 0 }), null);
  assert.equal(cleanCheckInput({ query: 'بيت', section: 'realestate', price: 1e8, vin: '1HGCM82633A004352' }).vin, '');
});

test('التقرير يحسبه الخادم: الحكم والشاصي لا يُؤخذان من المتصفح', async () => {
  const input = cleanCheckInput({ query: 'تويوتا كامري 2020', section: 'cars', price: 45_000_000, vin: '1hgcm82633a004352', verdict: 'fair', judgement: { verdict: 'fair' } });
  const r = await buildCheckReport(input, deps());
  assert.equal(r.judgement.verdict, 'overpriced', 'حكم الخادم لا حكم المرسل');
  assert.equal(r.judgement.diffPct, 50);
  assert.equal(r.vin.comparison.checks.find((c) => c.field === 'year').ok, false, 'الإعلان 2020 والشاصي 2017');
  assert.match(reportHeadline(r), /أغلى من السوق بـ 50% • الشاصي لا يطابق الإعلان/);
});

test('صفحة التقرير: محتوى المستخدم يُهرَّب، ومعاينة واتساب بعنوان الحكم', async () => {
  const input = cleanCheckInput({ query: '<script>alert(1)</script> كامري', section: 'cars', price: 30_500_000 });
  const r = await buildCheckReport(input, deps());
  const html = renderReportPage(r, { url: 'https://site/r/abc' });
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /ضمن نطاق السعر المعتاد/);
  assert.match(html, /<meta property="og:title" content="سيارة: .*السعر ضمن السوق"/);
  assert.match(html, /ليس تقييماً رسمياً/);
});

test('حفظ التقرير واسترجاعه بمعرّف عشوائي', async () => {
  const store = createReportStore({ sql: null });
  const id = await store.save({ a: 1 });
  assert.match(id, /^[A-Za-z0-9_-]{10,12}$/);
  assert.deepEqual(await store.get(id), { a: 1 });
  assert.equal(await store.get('../../etc'), null);
});
