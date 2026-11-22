import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCarsxeHistory, fetchVinHistory, readVinHistoryConfig, brandArabic } from '../lib/vin-history.js';
import { createVinPurchaseStore, fulfillVinReport } from '../lib/vin-purchases.js';
import { renderVinHistoryPage } from '../lib/vin-history-page.js';

// شكل رد CarsXE كما في وثائقه (https://docs.carsxe.com/docs/products/vehicle-history)
const SAMPLE = {
  success: true,
  vin: '1HGCM82633A004352',
  brandsInformation: [{ name: 'Salvage', code: '15', description: 'Salvage: Damage or Not Specified' }],
  junkAndSalvageInformation: [
    { ReportingEntityAbstract: { EntityName: 'COPART', LocationCityName: 'DALLAS', LocationStateUSPostalServiceCode: 'TX' }, VehicleObtainedDate: { Date: '2021-03-04' }, VehicleDispositionText: 'SOLD', VehicleIntendedForExportCode: 'Y' }
  ],
  insuranceInformation: [],
  currentTitleInformation: [{ TitleIssuingAuthorityName: 'TX', TitleIssueDate: { Date: '2022-01-10' }, VehicleOdometerReadingMeasure: '000041000', VehicleOdometerReadingUnitCode: 'M' }],
  historyInformation: [{ TitleIssuingAuthorityName: 'CA', TitleIssueDate: { Date: '2019-05-01' }, VehicleOdometerReadingMeasure: '000063500', VehicleOdometerReadingUnitCode: 'M' }]
};

test('قراءة تقرير CarsXE: علامة سالفج، بيع في المزاد للتصدير، ونزول العداد', () => {
  const r = normalizeCarsxeHistory('1HGCM82633A004352', SAMPLE);
  assert.equal(r.found, true);
  assert.equal(r.brands[0].arabic, 'تالفة (سالفج)');
  assert.equal(r.junk[0].entity, 'COPART');
  assert.equal(r.junk[0].forExport, true);
  assert.equal(r.titles.find((t) => t.state === 'CA').odometer, 63500, 'الأصفار البادئة تُحذف');
  assert.equal(r.odometerRollback, true, '63,500 في 2019 ثم 41,000 في 2022');
  assert.equal(r.summary.severe, true);
  assert.match(r.summary.headline, /سجل ضرر/);
  assert.equal(brandArabic('Flood Damage'), 'غرق');
});

test('المزوّد: 404 يعني لا بيانات، والعطل يرمي خطأً، والمفتاح في الطلب', async () => {
  const cfg = readVinHistoryConfig({ CARSXE_API_KEY: 'k1', VIN_REPORT_PRICE_IQD: '7500' });
  assert.equal(cfg.priceIQD, 7500);
  assert.equal(readVinHistoryConfig({}).provider, null, 'معطل دون مفتاح');
  let url = '';
  const ok = await fetchVinHistory(cfg, 'V', { fetchImpl: async (u) => ((url = u), { ok: true, status: 200, json: async () => SAMPLE }) });
  assert.match(url, /^https:\/\/api\.carsxe\.com\/history\?key=k1&vin=V$/);
  assert.equal(ok.found, true);
  const none = await fetchVinHistory(cfg, 'V', { fetchImpl: async () => ({ ok: false, status: 404, json: async () => ({ success: false, message: 'No data found for this VIN' }) }) });
  assert.deepEqual(none, { vin: 'V', found: false });
  await assert.rejects(fetchVinHistory(cfg, 'V', { fetchImpl: async () => ({ ok: false, status: 502, json: async () => ({ success: false }) }) }));
});

test('التسليم: تقرير لدفعة واحدة فقط، ورصيد تعويض عند غياب البيانات', async () => {
  const store = createVinPurchaseStore({ sql: null });
  const sent = [];
  const notifier = { notifyUser: async (uid, n) => sent.push([uid, n.title]) };
  const cfg = readVinHistoryConfig({ CARSXE_API_KEY: 'k' });
  let calls = 0;
  const okFetch = async () => (calls++, { ok: true, status: 200, json: async () => SAMPLE });
  const first = await fulfillVinReport({ userId: 5, vin: '1HGCM82633A004352', paymentId: 'p1' }, { cfg, store, notifier, fetchImpl: okFetch });
  assert.equal(first.status, 'ready');
  const again = await fulfillVinReport({ userId: 5, vin: '1HGCM82633A004352', paymentId: 'p1' }, { cfg, store, notifier, fetchImpl: okFetch });
  assert.equal(again.reportId, first.reportId);
  assert.equal(calls, 1, 'إعادة تأكيد الدفعة لا تكرر طلب المزوّد ولا تكلفته');
  assert.equal((await store.reportFor(6, first.reportId)), null, 'التقرير لصاحبه فقط');

  const noData = await fulfillVinReport({ userId: 5, vin: '2T1BURHE0JC000000', paymentId: 'p2' }, { cfg, store, notifier, fetchImpl: async () => ({ ok: false, status: 404, json: async () => ({}) }) });
  assert.equal(noData.status, 'no_data');
  assert.equal(await store.creditsOf(5), 1);
  assert.equal(await store.useCredit(5), true);
  assert.equal(await store.useCredit(5), false, 'الرصيد يُستخدم مرة واحدة');
  assert.match(sent.at(-1)[1], /رصيد تقرير/);
});

test('صفحة التقرير المدفوع تهرّب بيانات المزوّد', () => {
  const data = normalizeCarsxeHistory('1HGCM82633A004352', { ...SAMPLE, junkAndSalvageInformation: [{ ReportingEntityAbstract: { EntityName: '<img src=x onerror=alert(1)>' } }] });
  const html = renderVinHistoryPage({ vin: '1HGCM82633A004352', createdAt: '2026-11-22T00:00:00Z', data });
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /تالفة \(سالفج\)/);
  assert.match(html, /احتمال تلاعب بالعداد/);
});
