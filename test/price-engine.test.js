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
  assert.equal(price('Apple iPhone 15 Pro Max. ع.د 1,908,159.'), 1_908_159);
  assert.equal(price('ايفون السعر 1,140،000 دينار'), 1_140_000, 'الفاصلة العربية بين الأرقام');
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
  assert.equal(price('آيفون ١٧ سعر ١٧٧٥ مكان بغداد'), null, 'رقم بلا وحدة أقل من 10 آلاف غامض');
  assert.equal(price('ايفون بقسط شهري (82،000) العنوان بغداد'), null, 'القسط ليس السعر');
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

test('صيغ السوق العراقي من نتائج حقيقية: النقطة للآلاف والكاف العراقية', () => {
  assert.equal(price('Kia Sportage سعر 19.000$ الموديل: 2023'), 28_500_000);
  assert.equal(price('السعر 43.900.000 دينار'), 43_900_000);
  assert.equal(price('السعر 1.5 مليون'), 1_500_000, 'النقطة العشرية العادية لم تتأثر');
  assert.equal(isRelevantToQuery('سبلت جري 2 طن', 'سبلت گري 2 طن انفرتر'), true);
  assert.equal(isRelevantToQuery('سبلت جري 2 طن', 'سبلت كري جداري 2 طن'), true);
  assert.equal(classifySection('سبلت گري 2 طن').section, 'products');
});

test('السعر لا يُنسب لسلعة أخرى مذكورة في المقتطف نفسه (حالة بي ام دبليو الحقيقية)', async () => {
  const { extractPriceForQuery } = await import('../shared/price-engine.js');
  const p = (q, t, s) => extractPriceForQuery(q, t, s)?.priceIQD ?? null;
  assert.equal(
    p('بي ام دبليو 760', 'بغداد: بي ام دبليو الفئة 7 760, 2024 عدد الأميال', 'بغداد: بي ام دبليو الفئة 7 760 ... بغداد: هيونداي كونا SE, 2024 عدد الأميال : 53,000 كم السعر: 15,500$'),
    null
  );
  assert.equal(p('بي ام دبليو 760', 'BMW 760i 2026', 'بي إم دبليو 760i السعر: 295,000,000 دينار عراقي'), 295_000_000);
  assert.equal(p('ايفون 15', 'ايفون 15 برو للبيع', 'ايفون 13 نظيف السعر 600 الف'), null);
  assert.equal(p('كيا سبورتاج 2023', 'كيا سبورتاج 2023 للبيع', 'وارد امريكي ... السعر دفتر و95 ورقة'), 29_250_000);
});

test('حكم سعر الإعلان مقابل دليل السعر', async () => {
  const { judgeAdPrice } = await import('../shared/price-engine.js');
  const guide = { enough: true, count: 12, median: 30_000_000, q1: 28_000_000, q3: 32_000_000 };
  assert.equal(judgeAdPrice(30_500_000, guide).verdict, 'fair');
  assert.equal(judgeAdPrice(27_000_000, guide).verdict, 'below_market');
  assert.equal(judgeAdPrice(15_000_000, guide).verdict, 'suspicious_low', 'السعر المنخفض جداً إنذار احتيال لا صفقة');
  assert.equal(judgeAdPrice(35_000_000, guide).verdict, 'above_market');
  const over = judgeAdPrice(45_000_000, guide);
  assert.equal(over.verdict, 'overpriced');
  assert.equal(over.diffPct, 50);
  assert.equal(over.diffIQD, 15_000_000);
  assert.equal(judgeAdPrice(30_000_000, { enough: false, count: 2 }).verdict, 'insufficient');
  assert.equal(judgeAdPrice(null, guide).verdict, 'no_price');
});

test('الصلة: "بي ام دبليو" لا تطابق أي نص فيه "بي" أو "ام" داخل كلمة أخرى', async () => {
  const { isRelevantToQuery: r } = await import('../shared/price-engine.js');
  assert.equal(r('بي ام دبليو', 'حذاء ابيض مستخدم قياس 39 من ماركة ميلانو'), false);
  assert.equal(r('بي ام دبليو', 'سوت الأحلام اصلي 100% قطعه نادره'), false);
  assert.equal(r('بي ام دبليو', 'بيت للبيع طابو صرف امام الجامع'), false);
  assert.equal(r('بي ام دبليو', 'عرض خاص 95000000 دينار بي ام دبليو 520i'), true);
  assert.equal(r('بي ام دبليو', 'BMW 530i 2020 للبيع'), true, 'الاسم العربي يطابق الإنجليزي');
  assert.equal(r('bmw x5', 'بي ام دبليو X5 2019'), true);
  assert.equal(r('ام جي 5', 'MG 5 2022 للبيع'), true);
  assert.equal(r('ام جي 5', 'جهاز امي جيد 5 قطع'), false);
  assert.equal(r('ايفون 15', 'الايفون 15 برو للبيع'), true, 'الكلمات الطويلة ما زالت تطابق مع "ال"');
});

test('نوع العقار: أول نوع يُذكر هو موضوع الإعلان، مع أنواع المحلات والعمارات', async () => {
  const { comparisonGroupFor, extractRealEstateSpecs } = await import('../shared/price-engine.js');
  const grp = (title, snippet = '') => comparisonGroupFor({ section: 'realestate', title, snippet, specs: extractRealEstateSpecs(`${title} ${snippet}`) }).key;
  assert.equal(grp('عقارات بغداد الجديده', 'قطعة للبيع 50 متر سعر 75 مليون ... والبيت الصيني فرع'), 'realestate|sale|land');
  assert.equal(grp('بيت للبيع على قطعة 200 متر في السيدية'), 'realestate|sale|house');
  assert.equal(grp('مكتب عقارات البركة', 'شقة للبيع في المنصور 120 متر'), 'realestate|sale|apartment', '"مكتب عقارات" ليس عقاراً تجارياً معروضاً');
  assert.equal(grp('محل للايجار في الكرادة', 'محل تجاري 40 متر'), 'realestate|rent|commercial');
  assert.equal(grp('عمارة للبيع في الكرادة 4 طوابق'), 'realestate|sale|building');
  assert.equal(grp('مزرعة للبيع الموقع اليوسفية', 'سند 25 زراعي'), 'realestate|sale|land');
});

test('نية الباحث: البحث عن بيت للبيع يستبعد الأرض والإيجار من المقارنة، والنوع المجهول لا يُستبعد', async () => {
  const { queryIntent, conflictsWithIntent } = await import('../shared/price-engine.js');
  const intent = queryIntent('بيت للبيع');
  assert.deepEqual(intent, { propertyType: 'house', deal: 'sale' });
  assert.equal(conflictsWithIntent('realestate|sale|land', intent), true);
  assert.equal(conflictsWithIntent('realestate|rent|house', intent), true);
  assert.equal(conflictsWithIntent('realestate|sale|house', intent), false);
  assert.equal(conflictsWithIntent('realestate|sale|any', intent), false);
  assert.equal(conflictsWithIntent('cars|sale|camry', intent), false);
  assert.deepEqual(queryIntent('بي ام دبليو'), { propertyType: null, deal: null });
});
