// ============================================================================
// تقرير تاريخ السيارة المدفوع (سجل العناوين الأمريكي: تالفة، غارقة، خسارة كلية، قراءات العداد)
// المزوّد: CarsXE (https://api.carsxe.com/history) — طلب واحد بالمفتاح والشاصي.
// لا يُحاسَب المزوّد على شاصي بلا بيانات (404)، ونحن لا نخصم من المستخدم في هذه الحالة: نعطيه رصيداً.
// يبقى معطلاً حتى يُضبط CARSXE_API_KEY ويُفعَّل الدفع الحقيقي.
// ============================================================================

export function readVinHistoryConfig(env = process.env) {
  const key = String(env.CARSXE_API_KEY || '').trim();
  const price = Number.parseInt(env.VIN_REPORT_PRICE_IQD, 10);
  return {
    provider: key ? 'carsxe' : null,
    key,
    baseUrl: String(env.CARSXE_BASE_URL || 'https://api.carsxe.com').replace(/\/$/, ''),
    priceIQD: Number.isFinite(price) && price >= 1000 ? price : 6000
  };
}

const num = (v) => {
  const n = Number(String(v ?? '').replace(/^0+(?=\d)/, ''));
  return Number.isFinite(n) ? n : null;
};
const list = (v) => (Array.isArray(v) ? v : v ? [v] : []);

// علامات العنوان التي تعني ضرراً جسيماً سابقاً
const SEVERE_BRANDS = /salvage|flood|junk|total loss|rebuilt|reconstructed|fire|hail|water|lemon|dismantled|scrap|non-repairable|destroyed|vandal/i;
const BRAND_AR = [
  [/flood|water/i, 'غرق'],
  [/salvage/i, 'تالفة (سالفج)'],
  [/total loss/i, 'خسارة كلية'],
  [/junk|scrap|dismantled|destroyed|non-repairable/i, 'خردة / غير قابلة للإصلاح'],
  [/rebuilt|reconstructed/i, 'أعيد بناؤها بعد تلف'],
  [/fire/i, 'حريق'],
  [/hail/i, 'ضرر برَد'],
  [/taxi|police|fleet|rental/i, 'استخدام تجاري (تكسي/تأجير)'],
  [/odometer|mileage/i, 'مشكلة في العداد']
];
export function brandArabic(name) {
  const hit = BRAND_AR.find(([re]) => re.test(String(name || '')));
  return hit ? hit[1] : String(name || '');
}

/** يحول رد CarsXE إلى تقرير موحد بالعربية مع خلاصة واضحة. */
export function normalizeCarsxeHistory(vin, body) {
  const brands = list(body.brandsInformation).map((b) => ({ name: b.name || b.code || '', arabic: brandArabic(b.name || b.description), description: b.description || '' }));
  const titles = [...list(body.currentTitleInformation), ...list(body.historyInformation)]
    .map((t) => ({
      date: t.TitleIssueDate?.Date || t.TitleIssueDate || null,
      state: t.TitleIssuingAuthorityName || null,
      odometer: num(t.VehicleOdometerReadingMeasure),
      unit: t.VehicleOdometerReadingUnitCode === 'K' ? 'كم' : 'ميل'
    }))
    .filter((t) => t.date || t.odometer);
  const sortedReadings = titles.filter((t) => t.odometer && t.date).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  let rollback = false;
  for (let i = 1; i < sortedReadings.length; i += 1) {
    if (sortedReadings[i].odometer + 500 < sortedReadings[i - 1].odometer) rollback = true;
  }
  const junk = list(body.junkAndSalvageInformation).map((j) => ({
    entity: j.ReportingEntityAbstract?.EntityName || null,
    place: [j.ReportingEntityAbstract?.LocationCityName, j.ReportingEntityAbstract?.LocationStateUSPostalServiceCode].filter(Boolean).join(', ') || null,
    date: j.VehicleObtainedDate?.Date || j.VehicleObtainedDate || null,
    disposition: j.VehicleDispositionText || null,
    forExport: j.VehicleIntendedForExportCode === 'Y' || j.VehicleIntendedForExportCode === true
  }));
  const insurance = list(body.insuranceInformation).map((i) => ({
    entity: i.ReportingEntityAbstract?.EntityName || null,
    date: i.VehicleObtainedDate?.Date || i.VehicleObtainedDate || null
  }));
  const severe = brands.some((b) => SEVERE_BRANDS.test(`${b.name} ${b.description}`)) || junk.length > 0 || insurance.length > 0;
  return {
    vin,
    provider: 'carsxe',
    found: true,
    vinChanged: Boolean(body.vinChanged && body.vinChanged !== 'false'),
    brands,
    titles,
    junk,
    insurance,
    odometerRollback: rollback,
    summary: {
      severe,
      headline: severe
        ? '⚠ للسيارة سجل ضرر أو بيع كتالفة في أمريكا'
        : rollback
          ? '⚠ قراءات العداد نزلت بين سجلين: احتمال تلاعب'
          : '✔ لا توجد في السجل علامات تلف أو غرق أو خسارة كلية',
      note: 'غياب السجل لا يضمن سلامة السيارة: بعض الحوادث لا تُبلَّغ. افحصها في مركز مستقل.'
    }
  };
}

/**
 * يجلب التاريخ من المزوّد. يعيد { found:false } إن لم توجد بيانات (لا يُحاسَب أحد)،
 * ويرمي خطأً عند عطل مؤقت (لا نعطي رصيداً ولا نخصم؛ يُعاد المحاولة).
 */
export async function fetchVinHistory(cfg, vin, { fetchImpl = fetch } = {}) {
  if (cfg.provider !== 'carsxe') throw new Error('vin history provider not configured');
  const url = `${cfg.baseUrl}/history?key=${encodeURIComponent(cfg.key)}&vin=${encodeURIComponent(vin)}`;
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(30000) });
  if (res.status === 404) return { vin, found: false };
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    if (/no data/i.test(String(body.message || ''))) return { vin, found: false };
    throw new Error(`carsxe HTTP ${res.status} ${String(body.message || '').slice(0, 80)}`);
  }
  return normalizeCarsxeHistory(vin, body);
}
