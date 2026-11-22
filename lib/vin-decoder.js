// ============================================================================
// فك رقم الشاصي من قاعدة NHTSA الأمريكية الرسمية (vPIC) — مجانية ولا تحتاج مفتاحاً.
// تعطي مواصفات المصنع (الشركة، الطراز، السنة، المحرك، بلد الصنع)، لا تاريخ الحوادث.
// النتائج تُحفظ لتجنب تكرار الطلب نفسه.
// ============================================================================

import { isValidVinFormat, checkDigitValid, vinRegion } from '../shared/vin.js';

const VPIC_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues';

export async function initVinTables(sql) {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS dalal_iraq_vin_decodes (
      vin TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
}

const clean = (v) => {
  const s = String(v ?? '').trim();
  return s && s !== 'Not Applicable' && s !== '0' ? s.slice(0, 120) : null;
};

/** يحول رد vPIC إلى حقول موحدة. */
export function mapVpicResult(r) {
  const errorCodes = String(r.ErrorCode || '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
  return {
    make: clean(r.Make),
    model: clean(r.Model),
    modelYear: Number(r.ModelYear) || null,
    trim: clean(r.Trim),
    series: clean(r.Series),
    body: clean(r.BodyClass),
    engineL: clean(r.DisplacementL) ? Number(Number(r.DisplacementL).toFixed(1)) : null,
    cylinders: Number(r.EngineCylinders) || null,
    fuel: clean(r.FuelTypePrimary),
    drive: clean(r.DriveType),
    transmission: clean(r.TransmissionStyle),
    plantCountry: clean(r.PlantCountry),
    plantCity: clean(r.PlantCity),
    manufacturer: clean(r.Manufacturer),
    vehicleType: clean(r.VehicleType),
    // 0 = فك كامل. الرموز الأخرى تعني نقصاً أو خطأ في الرقم
    decodedCleanly: errorCodes.length === 0 || (errorCodes.length === 1 && errorCodes[0] === '0'),
    errorText: clean(r.ErrorText)
  };
}

export function createVinDecoder({ sql = null, fetchImpl = fetch } = {}) {
  const mem = new Map();

  return {
    /**
     * يفك الشاصي. يعيد { vin, valid, checkDigitOk, region, decoded } أو { valid:false } لصيغة خاطئة.
     * decoded=null إن لم تعرفه القاعدة (شائع في السيارات غير المصنوعة لأمريكا الشمالية).
     */
    async decode(vin) {
      if (!isValidVinFormat(vin)) return { vin, valid: false };
      const base = { vin, valid: true, checkDigitOk: checkDigitValid(vin), region: vinRegion(vin) };
      if (mem.has(vin)) return { ...base, decoded: mem.get(vin), cached: true };
      if (sql) {
        const rows = await sql`SELECT data FROM dalal_iraq_vin_decodes WHERE vin = ${vin} AND fetched_at > NOW() - INTERVAL '180 days'`;
        if (rows.length) {
          mem.set(vin, rows[0].data);
          return { ...base, decoded: rows[0].data, cached: true };
        }
      }
      const res = await fetchImpl(`${VPIC_URL}/${encodeURIComponent(vin)}?format=json`, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) throw new Error(`vpic HTTP ${res.status}`);
      const body = await res.json();
      const row = body?.Results?.[0];
      const decoded = row && (row.Make || row.Model) ? mapVpicResult(row) : null;
      if (decoded) {
        mem.set(vin, decoded);
        if (mem.size > 2000) mem.clear();
        if (sql) {
          await sql`
            INSERT INTO dalal_iraq_vin_decodes (vin, data) VALUES (${vin}, ${JSON.stringify(decoded)})
            ON CONFLICT (vin) DO UPDATE SET data = EXCLUDED.data, fetched_at = NOW()
          `.catch(() => {});
        }
      }
      return { ...base, decoded };
    }
  };
}
