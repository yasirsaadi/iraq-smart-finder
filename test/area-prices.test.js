import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAreaPriceTable, renderAreaGovPage, renderAreaIndexPage } from '../lib/area-prices.js';

const now = Date.parse('2026-11-22T00:00:00Z');
const day = 86400000;
const row = (title, price, area, city, daysAgo = 5, governorate = 'baghdad') => ({
  title, description: '', priceIQD: price, areaSqm: area, governorate, city, seenAt: new Date(now - daysAgo * day).toISOString()
});

test('سعر المتر لكل منطقة ونوع، دون رقم من أقل من 3 إعلانات، مع الاتجاه', () => {
  const rows = [
    // السيدية: بيوت حديثة بمتر 1.5 مليون، وقديمة بمتر 1.2 مليون
    row('بيت للبيع', 300e6, 200, 'السيدية', 10), row('دار للبيع', 450e6, 300, 'السيدية', 20), row('بيت للبيع', 150e6, 100, 'السيدية', 30),
    row('بيت للبيع', 240e6, 200, 'السيدية', 80), row('دار للبيع', 360e6, 300, 'السيدية', 90), row('بيت للبيع', 120e6, 100, 'السيدية', 100),
    // أرضان فقط: غير كافية
    row('قطعة ارض للبيع', 100e6, 200, 'السيدية'), row('ارض للبيع', 90e6, 200, 'السيدية'),
    // قيم خاطئة تُستبعد: مساحة بالدونم، سعر متر غير معقول
    row('بيت للبيع', 300e6, 5, 'السيدية'), row('بيت للبيع', 1000, 200, 'السيدية'),
    // محافظة غير معروفة تُستبعد
    { ...row('بيت للبيع', 300e6, 200, 'x'), governorate: null }
  ];
  const t = buildAreaPriceTable(rows, { now });
  const saydiya = t.baghdad.areas.find((a) => a.name === 'السيدية');
  assert.equal(saydiya.types.house.count, 6);
  assert.equal(saydiya.types.house.median, 1_350_000);
  assert.equal(saydiya.types.house.trendPct, 25, 'آخر 60 يوماً مقابل ما قبلها');
  assert.equal(saydiya.types.land.median, undefined, 'أرضان لا تكفيان');
  assert.equal(saydiya.types.land.count, 2);
  assert.equal(t.baghdad.total, 8);
});

test('صفحات الدليل: عنوان بالمحافظة، روابط، ونصوص مهرّبة', () => {
  const rows = ['<b>حي</b>', '<b>حي</b>', '<b>حي</b>'].map((c, i) => row('بيت للبيع', (300 + i * 10) * 1e6, 200, c));
  const t = buildAreaPriceTable(rows, { now });
  const html = renderAreaGovPage('baghdad', t.baghdad, { govNames: { baghdad: 'بغداد' }, baseUrl: 'https://x' });
  assert.match(html, /<title>سعر المتر في بغداد \d{4} حسب المنطقة/);
  assert.doesNotMatch(html, /<b>حي<\/b>/);
  assert.match(html, /&lt;b&gt;حي/);
  const index = renderAreaIndexPage(t, { govNames: { baghdad: 'بغداد' }, baseUrl: 'https://x' });
  assert.match(index, /href="\/prices\/baghdad"/);
  assert.match(renderAreaGovPage('basra', undefined, { govNames: { basra: 'البصرة' }, baseUrl: 'https://x' }), /لا توجد بعد إعلانات كافية في البصرة/);
});
