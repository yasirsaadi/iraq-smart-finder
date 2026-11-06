import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractIraqiPrice,
  classifySection,
  comparisonGroupFor,
  computePriceStats,
  isPlausiblePrice,
  isRelevantToQuery,
  extractCarSpecs,
  extractRealEstateSpecs,
  normalizeDigits
} from '../shared/price-engine.js';
import { DEMO_OFFERS } from '../demo/demo-offers.js';

const price = (text, opts) => extractIraqiPrice(text, opts)?.priceIQD ?? null;

test('صيغ الدفتر والورقة العراقية', () => {
  assert.equal(price('هيونداي النترا 2024 السعر دفتر و98 ورقة'), 29_700_000); // كانت 14.7 مليون
  assert.equal(price('النترا السعر دفترين و10 أوراق'), 31_500_000);
  assert.equal(price('تاهو 2024 السعر 7 دفاتر و20 ورقة'), 108_000_000);
  assert.equal(price('لاندكروزر السعر 8 دفاتر'), 120_000_000);
  assert.equal(price('سيارة السعر دفتر ونص'), 22_500_000);
  assert.equal(price('تيجو 8 دفتر ونص'), 22_500_000, 'رقم الطراز ليس عدد دفاتر');
  assert.equal(price('سني 2024 السعر 14 ورقة'), 2_100_000);
  assert.equal(price('السعر ورقتين'), 300_000);
  assert.equal(price('السعر ورقة ونص'), 225_000);
});

test('صيغ المليون والألف والدينار', () => {
  assert.equal(price('ايفون 15 السعر مليون و600 ألف'), 1_600_000); // كانت 600 ألف
  assert.equal(price('شقة بسماية 100 م2 السعر 105 مليون'), 105_000_000);
  assert.equal(price('ايفون مليونين ونص'), 2_500_000);
  assert.equal(price('السعر 1.5 مليون'), 1_500_000);
  assert.equal(price('السعر نص مليون'), 500_000);
  assert.equal(price('ايفون 15 السعر 1,585,000 د.ع'), 1_585_000);
  assert.equal(price('ps5 بسعر 695000'), 695_000);
  assert.equal(price('سبلت جري السعر 845 الف'), 845_000);
});

test('الأرقام العربية والهندية وفواصلها', () => {
  assert.equal(normalizeDigits('١٢٣٤٥٦٧٨٩٠'), '1234567890');
  assert.equal(normalizeDigits('۱۲۳'), '123');
  assert.equal(price('ايفون ١٥ السعر ١٬٥٨٥٬٠٠٠ دينار'), 1_585_000);
  assert.equal(price('السعر ٢٫٥ مليون'), 2_500_000);
});

test('الدولار وسعر الصرف القابل للتغيير', () => {
  assert.equal(price('iPhone 15 Pro Max 256GB $1050'), 1_575_000);
  assert.equal(price('iPhone 15 Pro Max $1050', { usdRate: 1320 }), 1_386_000);
  assert.equal(price('النترا دفتر و98 ورقة', { usdRate: 1320 }), 26_136_000);
  const r = extractIraqiPrice('السعر 5 الاف دولار');
  assert.equal(r.currency, 'USD');
  assert.equal(r.amountUSD, 5000);
});

test('الأرقام التي ليست أسعاراً لا تُستخرج كسعر', () => {
  assert.equal(price('كيا سبورتاج 2023 ماشية 18 ألف ميل'), null);
  assert.equal(price('سيارة ماشية 150 ألف كم'), null);
  assert.equal(price('النترا موديل 2022 السعر 2022'), null);
  assert.equal(price('دفتر ملاحظات 100 ورقة A4'), null);
  assert.equal(price('ضمان 5 سنوات أو 200 ألف كم'), null);
  assert.equal(price('ايفون 15 برو ماكس 256 جيجا'), null);
  assert.equal(price('السعر 250 دينار'), null, 'لا نخمّن أن 250 دينار تعني 250 ألفاً');
  assert.equal(price('دار قرب دفترين الخدمة السعر 290 مليون'), 290_000_000, 'كلمة السعر ترجح الرقم الصحيح');
  assert.equal(price('لاندكروزر ضمان 200 ألف كم السعر 8 دفاتر'), 120_000_000);
  assert.equal(price('سبلت السعر 845 الف توصيل 5 الاف'), 845_000, 'أجور التوصيل ليست السعر');
});

test('تمييز الإيجار عن البيع', () => {
  const rent = extractIraqiPrice('شقة للايجار 600 دولار شهرياً');
  assert.equal(rent.isRent, true);
  assert.equal(rent.rentPeriod, 'month');
  assert.equal(extractIraqiPrice('دار للبيع السعر 290 مليون').isRent, false);
});

test('التصنيف بحدود الكلمات والإكسسوارات', () => {
  assert.equal(classifySection('هيونداي النترا 2024 خليجي').section, 'cars');
  assert.equal(classifySection('شقة 120 م² في بسماية').section, 'realestate');
  assert.equal(classifySection('ايفون 15 برو ماكس').section, 'products');
  assert.equal(classifySection('شاحن سيارة تويوتا اصلي').section, 'products', 'إكسسوار السيارة سلعة');
  assert.equal(classifySection('كفر ايفون 15').section, 'products');
  assert.equal(classifySection('مكياج سهرة').section, 'unknown', '"كيا" داخل "مكياج" ليست سيارة');
});

test('مجموعات المقارنة: لا خلط بين الفئات', () => {
  const g = (o) => comparisonGroupFor(o).key;
  assert.notEqual(g({ section: 'products', title: 'ايفون 15 برو' }), g({ section: 'products', title: 'كفر ايفون 15 برو' }));
  assert.notEqual(g({ section: 'products', title: 'ايفون 15' }), g({ section: 'products', title: 'بلاي ستيشن 5' }));
  assert.notEqual(g({ section: 'cars', title: 'هيونداي النترا 2024' }), g({ section: 'cars', title: 'تويوتا لاندكروزر 2024' }));
  assert.notEqual(
    g({ section: 'realestate', title: 'شقة للبيع', specs: { dealType: 'بيع تمليك' } }),
    g({ section: 'realestate', title: 'شقة', specs: { dealType: 'إيجار' } })
  );
  assert.equal(g({ section: 'cars', title: 'Hyundai Elantra 2024' }), g({ section: 'cars', title: 'هيونداي النترا 2024 خليجي' }));
});

test('المتوسط الحسابي مقابل الوسيط بدقة', () => {
  const odd = computePriceStats([5, 1, 3]);
  assert.equal(odd.median, 3);
  assert.equal(odd.mean, 3);
  const even = computePriceStats([4, 1, 3, 2]);
  assert.equal(even.median, 2.5, 'العدد الزوجي: متوسط القيمتين الوسطيين');
  assert.equal(even.mean, 2.5);
  const skew = computePriceStats([1_500_000, 1_550_000, 1_600_000, 1_620_000, 20_000]);
  assert.equal(skew.median, 1_550_000);
  assert.equal(Math.round(skew.mean), 1_258_000, 'المتوسط يتأثر بالقيمة الشاذة والوسيط لا');
  assert.equal(skew.outlierCount, 1);
  assert.equal(skew.inlierMin, 1_500_000);
  assert.equal(computePriceStats([]), null);
  assert.equal(computePriceStats([1, 2, 3]).outlierCount, 0, 'لا قيم شاذة بأقل من 4 عينات');
});

test('العروض التجريبية: متوسط الأجهزة لا يتأثر بأسعار العقارات', () => {
  const all = DEMO_OFFERS.map((o) => o.priceIQD);
  const mixedMean = computePriceStats(all).mean;
  const groups = new Map();
  for (const o of DEMO_OFFERS) {
    const k = comparisonGroupFor(o).key;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(o.priceIQD);
  }
  const phones = computePriceStats(groups.get('products|phones'));
  assert.ok(mixedMean > 50_000_000, 'المتوسط المختلط القديم يتجاوز 50 مليون');
  assert.equal(phones.count, 3);
  assert.equal(phones.median, 1_585_000);
  assert.ok(phones.max < 2_000_000, 'مجموعة الهواتف تحوي هواتف فقط');
  for (const [key, values] of groups) {
    const section = key.split('|')[0];
    for (const v of values) assert.ok(isPlausiblePrice(v, section), `${key}: ${v}`);
  }
});

test('معقولية السعر حسب القسم', () => {
  assert.equal(isPlausiblePrice(18_000, 'cars'), false);
  assert.equal(isPlausiblePrice(29_700_000, 'cars'), true);
  assert.equal(isPlausiblePrice(900_000, 'realestate', true), true);
  assert.equal(isPlausiblePrice(900_000, 'realestate', false), false);
});

test('الصلة بكلمات البحث تتطلب كل الكلمات والأرقام', () => {
  assert.equal(isRelevantToQuery('ايفون 15', 'آيفون 15 برو ماكس للبيع'), true);
  assert.equal(isRelevantToQuery('ايفون 15', 'ايفون 13 نظيف'), false);
  assert.equal(isRelevantToQuery('ايفون 15', 'سيارة موديل 2015 السعر 15 ورقة'), false);
  assert.equal(isRelevantToQuery('كيا سبورتاج', 'سبورتاج 2023 وارد'), false);
  assert.equal(isRelevantToQuery('كيا سبورتاج 2024 خليجي', 'كيا سبورتاج 2024 فول'), true, 'تسامح بكلمة واحدة للاستعلامات الطويلة');
});

test('المواصفات لا تُختلق عند غياب الدليل', () => {
  assert.deepEqual(extractCarSpecs('سيارة للبيع'), {});
  const car = extractCarSpecs('كيا سبورتاج 2023 وارد امريكي ماشية 18 الف ميل رقم بغداد');
  assert.equal(car.year, '2023');
  assert.equal(car.origin, 'وارد أمريكي');
  assert.equal(car.mileage, '18,000 ميل');
  assert.equal(car.plate, 'رقم بغداد');
  assert.deepEqual(extractRealEstateSpecs('عقار للبيع'), {});
  assert.equal(extractRealEstateSpecs('شقة 120 م² للايجار').areaSqm, 120);
});

test('الصلة تقبل الكتابة اللاتينية للماركات والطرازات', () => {
  assert.equal(isRelevantToQuery('ايفون 15', 'iPhone 15 Pro Max for sale Baghdad'), true);
  assert.equal(isRelevantToQuery('كيا سبورتاج', 'KIA Sportage 2023 clean'), true);
  assert.equal(isRelevantToQuery('ايفون 15', 'iPhone 13 used'), false);
  assert.equal(isRelevantToQuery('لاندكروزر', 'Toyota Land Cruiser GXR'), true);
});
