import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeVin, isValidVinFormat, checkDigitValid, vinRegion, compareVinWithAd, adModelYear } from '../shared/vin.js';
import { createVinDecoder, mapVpicResult } from '../lib/vin-decoder.js';

// رقم شاصي حقيقي الصيغة بخانة تحقق صحيحة (مثال NHTSA الشهير)
const GOOD = '1HGCM82633A004352';

test('صيغة رقم الشاصي وخانة التحقق', () => {
  assert.equal(normalizeVin(' 1hgcm8-2633 a004352 '), GOOD);
  assert.equal(normalizeVin('١HGCM82633A004352'), GOOD, 'الأرقام العربية تتحول');
  assert.equal(isValidVinFormat(GOOD), true);
  assert.equal(isValidVinFormat('1HGCM82633A00435'), false, '16 خانة');
  assert.equal(isValidVinFormat('1HGCM82633A00435O'), false, 'حرف O ممنوع');
  assert.equal(checkDigitValid(GOOD), true);
  assert.equal(checkDigitValid('1HGCM82643A004352'), false, 'تغيير خانة واحدة يكشفه التحقق');
  assert.equal(vinRegion(GOOD).code, 'north_america');
  assert.equal(vinRegion('JTDBR32E720123456').code, 'japan');
});

test('مقارنة الشاصي بالإعلان: السنة والشركة والطراز', () => {
  const decoded = { make: 'TOYOTA', model: 'Camry', modelYear: 2017 };
  const bad = compareVinWithAd(decoded, 'تويوتا كامري 2020 وارد امريكي نظيفة');
  assert.equal(bad.checks.find((c) => c.field === 'year').ok, false, 'الإعلان 2020 والشاصي 2017');
  assert.equal(bad.checks.find((c) => c.field === 'make').ok, true);
  assert.equal(bad.checks.find((c) => c.field === 'model').ok, true);
  assert.equal(bad.mismatches, 1);
  const other = compareVinWithAd({ make: 'HYUNDAI', model: 'Sonata', modelYear: 2020 }, 'كامري 2020 للبيع');
  assert.equal(other.checks.find((c) => c.field === 'model').ok, false, 'الطراز مختلف');
  const unknown = compareVinWithAd(decoded, 'سيارة للبيع نظيفة');
  assert.equal(unknown.mismatches, 0);
  assert.equal(unknown.checks.every((c) => c.ok === null), true, 'لا حكم دون معلومة في الإعلان');
  assert.equal(adModelYear('موديل 2018 او 2019'), null, 'سنتان: لا نخمّن');
});

test('فك الشاصي: قراءة رد NHTSA، والحفظ، وصيغة خاطئة دون طلب', async () => {
  let calls = 0;
  const fetchImpl = async (url) => {
    calls += 1;
    assert.match(url, /DecodeVinValues\/1HGCM82633A004352\?format=json$/);
    return { ok: true, json: async () => ({ Results: [{ ErrorCode: '0', Make: 'HONDA', Model: 'Accord', ModelYear: '2003', BodyClass: 'Coupe', DisplacementL: '2.998', PlantCountry: 'UNITED STATES (USA)', Trim: 'Not Applicable' }] }) };
  };
  const dec = createVinDecoder({ sql: null, fetchImpl });
  const r = await dec.decode(GOOD);
  assert.equal(r.valid, true);
  assert.equal(r.checkDigitOk, true);
  assert.equal(r.decoded.make, 'HONDA');
  assert.equal(r.decoded.modelYear, 2003);
  assert.equal(r.decoded.engineL, 3);
  assert.equal(r.decoded.trim, null, '"Not Applicable" ليست قيمة');
  assert.equal(r.decoded.decodedCleanly, true);
  await dec.decode(GOOD);
  assert.equal(calls, 1, 'الطلب الثاني من الحفظ');
  assert.deepEqual(await dec.decode('ABC'), { vin: 'ABC', valid: false });
  assert.equal(calls, 1);
  assert.equal(mapVpicResult({ ErrorCode: '1,5', Make: 'X' }).decodedCleanly, false);
});
