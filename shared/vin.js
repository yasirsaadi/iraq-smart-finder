// ============================================================================
// رقم الشاصي (VIN): التحقق من الصيغة ومقارنة بياناته الحقيقية بما يدّعيه الإعلان
// يُستخدم في المتصفح والخادم معاً. فك التشفير نفسه يتم في الخادم من قاعدة NHTSA المجانية.
// ============================================================================

import { normalizeDigits, normalizeForMatch, mentionedItemKeys } from './price-engine.js';

const VIN_CHARS = /^[A-HJ-NPR-Z0-9]{17}$/;
const TRANSLIT = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9, S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9 };
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/** يوحّد رقم الشاصي: أحرف كبيرة، أرقام لاتينية، دون مسافات أو شرطات. */
export function normalizeVin(raw) {
  return normalizeDigits(String(raw || ''))
    .toUpperCase()
    .replace(/[\s\-_.]/g, '');
}

/** صيغة صحيحة: 17 خانة، ولا تحتوي الأحرف I وO وQ أبداً. */
export function isValidVinFormat(vin) {
  return VIN_CHARS.test(vin);
}

/**
 * خانة التحقق (التاسعة) إلزامية في سيارات أمريكا الشمالية فقط.
 * فشلها في شاصي أمريكي يعني رقماً مكتوباً خطأً أو مزوراً.
 */
export function checkDigitValid(vin) {
  if (!isValidVinFormat(vin)) return false;
  let sum = 0;
  for (let i = 0; i < 17; i += 1) {
    const c = vin[i];
    const v = /\d/.test(c) ? Number(c) : TRANSLIT[c];
    sum += v * WEIGHTS[i];
  }
  const r = sum % 11;
  return vin[8] === (r === 10 ? 'X' : String(r));
}

/** الخانة الأولى: منطقة التصنيع. 1-5 = أمريكا الشمالية (تاريخها متاح في السجلات الأمريكية). */
export function vinRegion(vin) {
  const c = vin[0];
  if (/[1-5]/.test(c)) return { code: 'north_america', label: 'صُنعت في أمريكا الشمالية' };
  if (/[J]/.test(c)) return { code: 'japan', label: 'صُنعت في اليابان' };
  if (/[K]/.test(c)) return { code: 'korea', label: 'صُنعت في كوريا' };
  if (/[L]/.test(c)) return { code: 'china', label: 'صُنعت في الصين' };
  if (/[S-Z]/.test(c)) return { code: 'europe', label: 'صُنعت في أوروبا' };
  if (/[6-7]/.test(c)) return { code: 'oceania', label: 'صُنعت في أوقيانوسيا' };
  if (/[8-9]/.test(c)) return { code: 'south_america', label: 'صُنعت في أمريكا الجنوبية' };
  if (/[A-H]/.test(c)) return { code: 'africa', label: 'صُنعت في أفريقيا' };
  return { code: 'other', label: 'منطقة تصنيع أخرى' };
}

// أسماء الشركات في سجل NHTSA ومفاتيحها في محرك الأسعار
const MAKE_KEYS = {
  TOYOTA: 'toyota', LEXUS: 'lexus', HYUNDAI: 'hyundai', KIA: 'kia', NISSAN: 'nissan', INFINITI: 'nissan',
  CHEVROLET: 'chevrolet', GMC: 'chevrolet', CADILLAC: 'chevrolet', FORD: 'ford', LINCOLN: 'ford',
  JEEP: 'jeep', DODGE: 'dodge', RAM: 'dodge', CHRYSLER: 'dodge', 'MERCEDES-BENZ': 'mercedes', BMW: 'bmw',
  MG: 'mg', CHERY: 'chery', GEELY: 'geely', CHANGAN: 'changan', HAVAL: 'haval'
};

/** يستخرج من نص الإعلان سنة الصنع المذكورة (إن وُجدت سنة واحدة واضحة). */
export function adModelYear(text) {
  const years = [...new Set((normalizeDigits(String(text || '')).match(/(?:^|[^\d])((?:19[89]|20[0-4])\d)(?!\d)/g) || []).map((m) => Number(m.replace(/\D/g, ''))))];
  const plausible = years.filter((y) => y >= 1985 && y <= new Date().getFullYear() + 1);
  return plausible.length === 1 ? plausible[0] : null;
}

/**
 * يقارن بيانات الشاصي المفكوكة بما يقوله الإعلان: السنة والشركة والطراز.
 * يعيد قائمة فحوص كل منها: ok=true مطابق، false متعارض (إنذار)، null لا يمكن المقارنة.
 */
export function compareVinWithAd(decoded, adText) {
  const checks = [];
  if (!decoded) return { checks, mismatches: 0 };
  const text = String(adText || '');
  const keys = mentionedItemKeys(text);

  const adYear = adModelYear(text);
  const vinYear = Number(decoded.modelYear) || null;
  checks.push({
    field: 'year',
    label: 'سنة الصنع',
    ad: adYear,
    vin: vinYear,
    ok: adYear && vinYear ? adYear === vinYear : null
  });

  const makeKey = MAKE_KEYS[String(decoded.make || '').toUpperCase()] || null;
  const adMakes = [...keys].filter((k) => Object.values(MAKE_KEYS).includes(k));
  checks.push({
    field: 'make',
    label: 'الشركة',
    ad: adMakes[0] || null,
    vin: decoded.make || null,
    ok: makeKey && adMakes.length ? adMakes.includes(makeKey) : null
  });

  const vinModel = normalizeForMatch(String(decoded.model || '')).replace(/[\s-]/g, '');
  const adModelKeys = [...keys].filter((k) => !Object.values(MAKE_KEYS).includes(k));
  checks.push({
    field: 'model',
    label: 'الطراز',
    ad: adModelKeys[0] || null,
    vin: decoded.model || null,
    ok: vinModel && adModelKeys.length ? adModelKeys.some((k) => vinModel.includes(k) || k.includes(vinModel)) : null
  });

  return { checks, mismatches: checks.filter((c) => c.ok === false).length };
}
