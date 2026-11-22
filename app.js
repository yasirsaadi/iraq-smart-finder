// ============================================================================
// رادار أسعار العراق — مقارنة شاملة للسلع والسيارات والعقارات في المحافظات الـ 18
// ============================================================================

import * as PriceEngine from './shared/price-engine.js';
import { escapeHtml as esc, safeHttpUrl, safeIraqiMobile, isReviewableSellerName } from './shared/sanitize.js';
import { formatIQDText, AD_CHECKLISTS, verdictLine, guideSummaryText, basisLine, vinFindings, vinSpecRows } from './shared/check-report.js';

const IRAQ_GOVERNORATES = {
  baghdad: { name: 'بغداد', lat: 33.3152, lon: 44.3661, keywords: ['بغداد', 'المنصور', 'الكرادة', 'زيونة', 'الأعظمية', 'الكاظمية', 'الدورة', 'شارع الصناعة', 'الربيعي', 'الشورجة', 'السنك', 'النهضة', 'البياع', 'اليرموك', 'بسماية', 'الجادرية'] },
  basra: { name: 'البصرة', lat: 30.5081, lon: 47.7835, keywords: ['البصرة', 'بصرة', 'العشار', 'الجزائر', 'الجبيلة', 'الزبير', 'أبو الخصيب', 'البراضعية'] },
  erbil: { name: 'أربيل', lat: 36.1901, lon: 44.0091, keywords: ['أربيل', 'اربيل', 'عنكاوة', 'شارع 60', 'شارع 100', 'القلعة', 'القرية اللبنانية', 'امباير'] },
  nineveh: { name: 'نينوى (الموصل)', lat: 36.3489, lon: 43.1577, keywords: ['الموصل', 'موصل', 'نينوى', 'المجموعة الثقافية', 'الزهور'] },
  najaf: { name: 'النجف الأشرف', lat: 32.0000, lon: 44.3333, keywords: ['النجف', 'نجف', 'الكوفة', 'حي السعد', 'شارع الروان', 'حي الأمير'] },
  karbala: { name: 'كربلاء المقدسة', lat: 32.6160, lon: 44.0249, keywords: ['كربلاء', 'الحسين', 'حي الحسين', 'العباس', 'حي الأسرة'] },
  sulaymaniyah: { name: 'السليمانية', lat: 35.5613, lon: 45.4304, keywords: ['السليمانية', 'سليمانية', 'سالم', 'بختياري'] },
  dhiqar: { name: 'ذي قار (الناصرية)', lat: 31.0439, lon: 46.2573, keywords: ['الناصرية', 'ذي قار', 'الحبوبي', 'الشطرة'] },
  babil: { name: 'بابل (الحلة)', lat: 32.4637, lon: 44.4196, keywords: ['بابل', 'الحلة', 'حلة', 'شارع 40'] },
  kirkuk: { name: 'كركوك', lat: 35.4681, lon: 44.3922, keywords: ['كركوك', 'طريق بغداد'] },
  anbar: { name: 'الأنبار (الرمادي)', lat: 33.4258, lon: 43.2995, keywords: ['الأنبار', 'الانبار', 'الرمادي', 'الفلوجة'] },
  diyala: { name: 'ديالى (بعقوبة)', lat: 33.7476, lon: 44.6436, keywords: ['ديالى', 'بعقوبة', 'الخالص'] },
  wasit: { name: 'واسط (الكوت)', lat: 32.5128, lon: 45.8182, keywords: ['واسط', 'الكوت', 'كوت'] },
  salahaddin: { name: 'صلاح الدين (تكريت)', lat: 34.6095, lon: 43.6787, keywords: ['صلاح الدين', 'تكريت', 'سامراء', 'بلد'] },
  maysan: { name: 'ميسان (العمارة)', lat: 31.8379, lon: 47.1449, keywords: ['ميسان', 'العمارة', 'عمارة'] },
  qadisiyah: { name: 'القادسية (الديوانية)', lat: 31.9889, lon: 44.9247, keywords: ['الديوانية', 'القادسية', 'ديوانية'] },
  muthanna: { name: 'المثنى (السماوة)', lat: 31.3188, lon: 45.2806, keywords: ['السماوة', 'المثنى', 'سماوة'] },
  duhok: { name: 'دهوك', lat: 36.8669, lon: 42.9885, keywords: ['دهوك', 'زاخو'] }
};

const PRODUCT_IMAGES = {
  iphone: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=300&q=80',
  ps5: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=300&q=80',
  ac: 'https://images.unsplash.com/photo-1614631446501-abcf76949eca?auto=format&fit=crop&w=300&q=80',
  laptop: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=300&q=80',
  airpods: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=300&q=80',
  coffee: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=300&q=80',
  tv: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=300&q=80',
  sedan: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=300&q=80',
  suv: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=300&q=80',
  house: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=300&q=80',
  apartment: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=300&q=80',
  land: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=300&q=80'
};

function getProductImageUrl(offer) {
  const directImage = safeHttpUrl(offer.imageUrl);
  if (directImage) return directImage;
  // الصور العامة من مكتبة الصور مخصصة للعروض التجريبية فقط، ولا تُنسب لإعلان حقيقي
  if (offer.source !== 'demo') return null;
  const text = `${offer.title} ${(offer.keywords || []).join(' ')}`.toLowerCase();
  if (offer.section === 'cars') {
    if (/لاندكروزر|سبورتاج|تاهو|جيتور|سورينتو|سنتافي/.test(text)) return PRODUCT_IMAGES.suv;
    return PRODUCT_IMAGES.sedan;
  }
  if (offer.section === 'realestate') {
    if (/شقة|بسماية|القرية|مجمع/.test(text)) return PRODUCT_IMAGES.apartment;
    if (/أرض|ارض|قطعة/.test(text)) return PRODUCT_IMAGES.land;
    return PRODUCT_IMAGES.house;
  }
  if (/ايفون|آيفون|iphone/.test(text)) return PRODUCT_IMAGES.iphone;
  if (/بلاي ستيشن|ps5|playstation/.test(text)) return PRODUCT_IMAGES.ps5;
  if (/سبلت|مكيف|gree/.test(text)) return PRODUCT_IMAGES.ac;
  if (/لابتوب|لينوفو|lenovo/.test(text)) return PRODUCT_IMAGES.laptop;
  if (/ايربودز|airpods/.test(text)) return PRODUCT_IMAGES.airpods;
  if (/ماكينة قهوة|ديلونجي/.test(text)) return PRODUCT_IMAGES.coffee;
  if (/شاشة سامسونج|تلفزيون/.test(text)) return PRODUCT_IMAGES.tv;
  return null;
}

// العروض التجريبية نُقلت حرفياً إلى demo/demo-offers.js ولا تُحمَّل إلا في وضع العرض التجريبي (DEMO_MODE=true).

const state = {
  // في الإنتاج تبدأ القائمة فارغة: لا تظهر إلا عروض المستخدمين المحفوظة ونتائج البحث الحي
  offers: [],
  config: { demoMode: false, loginEnabled: false, paymentsEnabled: false, alertsDeliveryEnabled: false },
  user: null,
  subscription: { active: false },
  liveOffers: [],
  indexedOffers: [],
  priceGuide: null,
  alerts: [],
  isSearchingLive: false,
  selectedSection: 'all', // 'all' | 'products' | 'cars' | 'realestate'
  carFilters: { brand: '', origin: '', plate: '' },
  propFilters: { deal: '', type: '', deed: '' },
  query: '',
  adComparisonPrice: null,
  selectedGov: 'baghdad',
  maxBudget: null,
  selectedPlatform: 'all',
  sortBy: 'smart',
  includeDelivery: true,
  sameCityOnly: false,
  exchangeRate100USD: 150000,
  // لا تُعتبر العضوية فعالة إلا بعد تحقق الخادم، ولا تحقق إلا إذا كانت بوابة الدفع مفعلة
  isSubscribed: false
};

function calculateDistanceKm(govKey1, govKey2) {
  if (govKey1 === govKey2) return 0;
  const g1 = IRAQ_GOVERNORATES[govKey1] || IRAQ_GOVERNORATES.baghdad;
  const g2 = IRAQ_GOVERNORATES[govKey2] || IRAQ_GOVERNORATES.baghdad;

  const R = 6371;
  const dLat = ((g2.lat - g1.lat) * Math.PI) / 180;
  const dLon = ((g2.lon - g1.lon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((g1.lat * Math.PI) / 180) *
      Math.cos((g2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/** رسالة مفهومة لفشل الحفظ حسب رد الخادم. */
function saveErrorMessage(status, data) {
  if (status === 401) return 'يجب تسجيل الدخول بحساب غوغل أولاً. لم يُحفظ شيء.';
  if (status === 429) return 'أرسلت عدداً كبيراً من الطلبات خلال وقت قصير. انتظر قليلاً ثم أعد المحاولة.';
  if (status === 403) return 'رُفض الطلب لأسباب أمنية. حدّث الصفحة ثم أعد المحاولة.';
  if (status === 503) return 'الحفظ غير متاح حالياً على الخادم. لم يُحفظ شيء.';
  if (status === 400) return data?.message || 'تحقق من البيانات المدخلة ثم أعد المحاولة.';
  if (status === 0) return 'تعذر الاتصال بالخادم. تحقق من الإنترنت؛ لم يُحفظ شيء.';
  return 'حدث خطأ في الخادم ولم يُحفظ شيء. أعد المحاولة لاحقاً.';
}

async function postJson(url, body) {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) });
    let data = null;
    try {
      data = await res.json();
    } catch {}
    return { ok: res.ok && data?.saved === true, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

/**
 * وصف المسافة بصدق: نعرف المحافظة فقط لا العنوان، فالمسافة خط مستقيم تقريبي بين مركزي المحافظتين
 * وليست مسافة الطريق، وداخل المحافظة نفسها لا نعرض صفراً لأن المسافة الفعلية غير معروفة.
 */
function describeDistance(offer) {
  if (offer.distanceKm === null || offer.distanceKm === undefined) return 'الموقع غير محدد في الإعلان';
  if (offer.distanceKm === 0) return 'داخل محافظتك (المسافة الفعلية غير معروفة)';
  const approx = Math.max(10, Math.round(offer.distanceKm / 10) * 10);
  return `نحو ${approx} كم بخط مستقيم بين مركزي المحافظتين (ليست مسافة الطريق)`;
}

/** شارة الشاصي لإعلانات المعارض والمعلنين: مطابق لسجل المصنع، أو لا يطابق الإعلان. */
function vinBadgeHtml(offer) {
  const c = offer.vinCheck;
  if (!c || !c.decoded) return '';
  const northAmerica = /أمريكا الشمالية/.test(c.region || '');
  if (c.mismatches > 0 || (northAmerica && !c.checkDigitOk)) {
    return '<span class="ribbon-tag ribbon-overpriced" title="بيانات الشاصي من سجل المصنع لا تطابق ما كُتب في الإعلان">⚠ الشاصي لا يطابق الإعلان</span>';
  }
  const what = [c.modelYear, c.make, c.model].filter(Boolean).join(' ');
  return `<span class="ribbon-tag ribbon-cheapest" title="${esc(`مفكوك من سجل المصنع الأمريكي: ${what}`)}">✔ شاصي مطابق للإعلان</span>`;
}

/** وصف نوع العرض المخالف لنوع البحث، مثل "أرض" أو "إيجار". */
function mismatchLabel(offer) {
  const g = PriceEngine.parseGroupKey(offer.comparisonKey);
  const intent = PriceEngine.queryIntent(state.query);
  if (intent.propertyType && g.type && g.type !== intent.propertyType && PriceEngine.PROPERTY_TYPE_NAMES[g.type]) {
    return PriceEngine.PROPERTY_TYPE_NAMES[g.type];
  }
  return g.deal === 'rent' ? 'إيجار' : 'بيع';
}

/** السعر مؤكد فقط إن كان العرض موثقاً ولم يُستخرج آلياً من نتيجة بحث. */
function isVerifiedPrice(offer) {
  return offer.source !== 'live' && offer.source !== 'demo' && offer.verified === true && offer.priceSource !== 'search_snippet';
}

/** تسمية نوع السعر: مستخرج آلياً = تقديري، أدخله المستخدم = معلن غير موثّق. */
function priceKindLabel(offer) {
  if (isVerifiedPrice(offer)) return 'سعر موثّق';
  if (offer.source === 'live' || offer.priceSource === 'search_snippet') return 'سعر تقديري';
  if (offer.source === 'indexed') return 'سعر معلن في الموقع غير موثّق';
  return 'سعر معلن غير موثّق';
}

function normalizeDigits(str) {
  return String(str)
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
}

function formatIQD(amountIQD) {
  return formatIQDText(amountIQD);
}

// تحويل السعر إلى دولار أو دفتر وورقة (للسيارات والعقارات)
function convertIQDtoUSD(amountIQD) {
  if (!amountIQD || amountIQD <= 0) return '';
  const usd = Math.round((amountIQD / state.exchangeRate100USD) * 100);
  if (usd >= 10000) {
    const dafateer = Math.floor(usd / 10000);
    const warqat = Math.round((usd % 10000) / 100);
    const dText = dafateer === 1 ? 'دفتر' : dafateer === 2 ? 'دفترين' : `${dafateer} دفاتر`;
    return warqat > 0 ? `${dText} و${warqat} ورقة` : dText;
  }
  return `يعادل ${usd.toLocaleString('en-US')} دولار`;
}

function getDeliveryFeeForUser(offer) {
  if (offer.section === 'cars' || offer.section === 'realestate') return 0;
  // نتائج البحث الحي لا تتضمن أجور توصيل معروفة؛ لا نفترض أي رقم
  if (offer.source === 'live') return null;
  if (/مجاني/.test(offer.delivery || '') && (offer.governorate === state.selectedGov || /لجميع المحافظات/.test(offer.delivery || ''))) {
    return 0;
  }
  if (offer.governorate === state.selectedGov) {
    return typeof offer.deliveryLocalIQD === 'number' ? offer.deliveryLocalIQD : null;
  }
  return typeof offer.deliveryNationalIQD === 'number' ? offer.deliveryNationalIQD : null;
}

/** سعر السلعة نفسها؛ الأسعار المسعّرة بالدولار (دفتر/ورقة/دولار) يعاد حسابها بسعر الصرف الحالي. */
function resolveItemPrice(offer) {
  if (offer.priceBasis === 'USD' && Number(offer.amountUSD) > 0) {
    return Math.round((Number(offer.amountUSD) * state.exchangeRate100USD) / 100);
  }
  return Number(offer.priceIQD) > 0 ? Number(offer.priceIQD) : null;
}

function govLabel(offer) {
  if (offer.locationDetected === false || !IRAQ_GOVERNORATES[offer.governorate]) return 'الموقع غير محدد في الإعلان';
  return IRAQ_GOVERNORATES[offer.governorate].name;
}

// الإعلان الأقدم من هذا العدد من الأيام يُوسم "قديم" ويتأخر في الترتيب
const STALE_AFTER_DAYS = 60;

/**
 * عمر الإعلان بالأيام من تاريخ نشره، أو من تاريخ نتيجة البحث ("منذ 3 أيام"، "3 days ago"، "Sep 23, 2026").
 * يعيد null إن لم يُعرف التاريخ؛ لا نخمّن تاريخاً.
 */
function offerAgeDays(offer) {
  const ts = offer.postedAt ? Date.parse(offer.postedAt) : NaN;
  if (Number.isFinite(ts)) return Math.max(0, (Date.now() - ts) / 86400000);
  const text = normalizeDigits(String(offer.searchDateText || '')).trim().toLowerCase();
  if (!text) return null;
  const units = [
    [/دقيق|minute|min/, 1 / 1440],
    [/ساع|hour/, 1 / 24],
    [/يوم|ايام|أيام|day/, 1],
    [/اسبوع|أسبوع|اسابيع|أسابيع|week/, 7],
    [/شهر|اشهر|أشهر|month/, 30],
    [/سنه|سنة|سنوات|عام|year/, 365]
  ];
  for (const [re, days] of units) {
    if (!re.test(text)) continue;
    const n = Number((text.match(/\d+/) || [])[0]);
    const dual = /(يومين|اسبوعين|أسبوعين|شهرين|سنتين)/.test(text) ? 2 : null;
    return (Number.isFinite(n) && n > 0 ? n : dual || 1) * days;
  }
  const abs = Date.parse(text);
  return Number.isFinite(abs) ? Math.max(0, (Date.now() - abs) / 86400000) : null;
}

function formatPostedTime(offer) {
  if (offer.source === 'demo' && offer.postedAgo) return offer.postedAgo;
  const ts = offer.postedAt ? Date.parse(offer.postedAt) : NaN;
  const verb = offer.source === 'user' ? 'أضيف' : 'نُشر';
  if (Number.isFinite(ts)) {
    const mins = Math.max(0, Math.round((Date.now() - ts) / 60000));
    if (mins < 1) return `${verb} الآن`;
    if (mins < 60) return `${verb} منذ ${mins} دقيقة`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${verb} منذ ${hours} ساعة`;
    const days = Math.round(hours / 24);
    return days < 60 ? `${verb} منذ ${days} يوم` : `${verb} منذ ${Math.round(days / 30)} شهر`;
  }
  if (offer.searchDateText) return `حسب البحث: ${offer.searchDateText}`;
  if (offer.firstSeenAt) {
    const days = Math.round((Date.now() - Date.parse(offer.firstSeenAt)) / 86400000);
    return days < 1 ? 'رُصد اليوم (تاريخ النشر غير معلن)' : `رُصد منذ ${days} يوم (تاريخ النشر غير معلن)`;
  }
  return 'بلا تاريخ نشر';
}

function parseIraqiPostText(rawText) {
  const text = normalizeDigits(rawText);
  // محرك الأسعار المشترك مع الخادم (shared/price-engine.js)
  const extracted = PriceEngine.extractIraqiPrice(text, { usdRate: state.exchangeRate100USD / 100 });
  const extractedPriceIQD = extracted ? extracted.priceIQD : null;

  let detectedGov = state.selectedGov;
  let detectedDistrict = 'المركز';
  for (const [govKey, govObj] of Object.entries(IRAQ_GOVERNORATES)) {
    for (const kw of govObj.keywords) {
      if (text.includes(kw)) {
        detectedGov = govKey;
        detectedDistrict = kw;
        break;
      }
    }
  }

  const phoneMatch = text.match(/(07[3-9]\d{8})/);
  const phone = phoneMatch ? phoneMatch[1] : 'تواصل عبر الصفحة';

  return {
    priceIQD: extractedPriceIQD,
    priceBasis: extracted ? extracted.currency : null,
    amountUSD: extracted ? extracted.amountUSD : null,
    isRent: Boolean(extracted?.isRent),
    governorate: detectedGov,
    district: detectedDistrict,
    phone
  };
}

let activeSearchController = null;

/** معرّف مجهول لهذا المتصفح، يُستخدم فقط لحد الاستخدام العادل لعمليات البحث الجديدة. */
function getClientId() {
  try {
    let id = localStorage.getItem('radar_client_id');
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      id = crypto.randomUUID();
      localStorage.setItem('radar_client_id', id);
    }
    return id;
  } catch {
    return '';
  }
}

/** نتائج البحث: الفهرس المجاني (بيانات منظمة) أولاً، ثم نتائج البحث الحي دون تكرار الرابط نفسه. */
function searchResultOffers() {
  const seen = new Set(state.indexedOffers.map((o) => o.directUrl));
  return [...state.indexedOffers, ...state.liveOffers.filter((o) => !seen.has(o.directUrl))];
}

/** البحث في فهرس الإعلانات المجمّعة ودليل السعر: مجانيان ولا يُحسبان من الحصة. */
async function loadIndexAndGuide(cleanQuery, controller) {
  const section = state.selectedSection;
  const params = `q=${encodeURIComponent(cleanQuery)}&section=${encodeURIComponent(section)}&gov=${encodeURIComponent(state.selectedGov)}`;
  const guideSection = section === 'all' ? null : section;
  const [idx, guide] = await Promise.all([
    fetch(`/api/indexed-search?${params}`, { signal: controller.signal }).then((r) => (r.ok ? r.json() : { offers: [] })).catch(() => ({ offers: [] })),
    guideSection
      ? fetch(`/api/price-guide?q=${encodeURIComponent(cleanQuery)}&section=${guideSection}&gov=${encodeURIComponent(state.selectedGov)}`, { signal: controller.signal }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
      : null
  ]);
  if (controller !== activeSearchController) return;
  state.indexedOffers = (idx.offers || []).map((o) => ({ ...o, source: 'indexed' }));
  state.priceGuide = guide && guide.count > 0 ? guide : null;
  renderApp();
}

function describeAge(isoDate) {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(isoDate)) / 60000));
  if (!Number.isFinite(mins)) return '';
  if (mins < 60) return `${mins} دقيقة`;
  return `${Math.round(mins / 60)} ساعة`;
}
async function performLiveSearch(queryText) {
  const cleanQuery = queryText.trim();
  if (!cleanQuery) {
    state.liveOffers = [];
    state.indexedOffers = [];
    state.priceGuide = null;
    state.isSearchingLive = false;
    renderApp();
    return;
  }

  if (activeSearchController) {
    activeSearchController.abort();
  }
  activeSearchController = new AbortController();

  state.isSearchingLive = true;
  state.indexedOffers = [];
  state.priceGuide = null;
  renderApp();
  loadIndexAndGuide(cleanQuery, activeSearchController);

  const controller = activeSearchController;
  const url = `/api/live-search?q=${encodeURIComponent(cleanQuery)}&gov=${encodeURIComponent(state.selectedGov)}&section=${encodeURIComponent(state.selectedSection)}&rate=${encodeURIComponent(state.exchangeRate100USD)}`;
  const banner = document.getElementById('searchStatusBanner');
  const applyData = (data) => {
    if (data && Array.isArray(data.offers)) {
      state.liveOffers = data.offers.map((o) => ({ ...o, source: 'live' }));
    }
  };

  const headers = { 'X-Client-Id': getClientId() };

  try {
    const res = await fetch(url, { signal: controller.signal, headers });
    const data = await res.json();
    applyData(data);
    if (data && data.quotaExceeded) {
      banner.hidden = false;
      banner.textContent = `استنفدت حصتك من عمليات البحث الجديدة لهذا الشهر (${data.quotaLimit} بحثاً)، وتتجدد مع بداية الشهر القادم. النتائج المحفوظة تبقى متاحة مجاناً: أي بحث أُجري خلال آخر ${state.config.cacheTtlHours || 12} ساعة يظهر فوراً دون أن يُحسب، ويمكنك أيضاً استخدام أزرار البحث المباشر أدناه.`;
    } else if (data && data.budgetExhausted) {
      banner.hidden = false;
      banner.textContent = 'بلغ الموقع الحد اليومي لعمليات البحث الجديدة، ويتجدد الحد غداً. النتائج المحفوظة تبقى متاحة مجاناً، فجرّب بحثاً شائعاً أو استخدم أزرار البحث المباشر أدناه.';
    } else if (data && data.cached && data.cachedAt) {
      banner.hidden = false;
      banner.textContent = `نتائج محفوظة حديثاً: آخر تحديث منذ ${describeAge(data.cachedAt)}. (${(data.offers || []).length} نتيجة بروابطها الأصلية)`;
    } else if (res.status === 429) {
      banner.hidden = false;
      banner.textContent = 'عدد عمليات البحث كبير خلال دقيقة واحدة. انتظر قليلاً ثم أعد المحاولة.';
    } else if (data && data.providerOk === false) {
      banner.hidden = false;
      banner.textContent = 'مصدر البحث الحي لم يُرجع نتائج قابلة للقراءة حالياً. استخدم أزرار البحث المباشر في فيسبوك وانستغرام وكوكل أدناه.';
    }

    // المرحلة الثانية: تُعرض النتائج الأولى فوراً، ثم تُستكمل بقية النتائج بعد استعادة روابطها الأصلية
    if (data && data.pending) {
      state.isSearchingLive = false;
      banner.hidden = false;
      banner.textContent = 'ظهرت النتائج الأولى، وجاري استكمال بقية نتائج فيسبوك وانستغرام والمتاجر العراقية (قرابة 20 ثانية)...';
      renderApp();
      try {
        const res2 = await fetch(`${url}&wait=1`, { signal: controller.signal, headers });
        const full = await res2.json();
        if (controller === activeSearchController && full && Array.isArray(full.offers) && full.offers.length >= (data.offers || []).length) {
          applyData(full);
          banner.textContent = `اكتمل البحث: ${full.offers.length} نتيجة من فيسبوك وانستغرام والمواقع العراقية، بروابطها الأصلية.`;
        } else if (controller === activeSearchController) {
          banner.textContent = 'تعذر استكمال بقية النتائج؛ المعروض هو النتائج الأولى فقط، ولم يُحسب ذلك بحثاً جديداً.';
        }
      } catch (err) {
        if (err.name !== 'AbortError') banner.textContent = 'تعذر استكمال بقية النتائج؛ المعروض هو النتائج الأولى فقط.';
      }
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('Live search error:', err);
    }
  } finally {
    if (controller === activeSearchController) {
      state.isSearchingLive = false;
      renderApp();
    }
  }
}

function updateLiveDeepLinks() {
  let defaultTitle = 'عروض السلع والسيارات والعقارات';
  if (state.selectedSection === 'cars') defaultTitle = 'معارض السيارات في العراق';
  else if (state.selectedSection === 'realestate') defaultTitle = 'العقارات والأراضي في العراق';

  const q = state.query.trim() || defaultTitle;
  const govName = IRAQ_GOVERNORATES[state.selectedGov].name.split(' ')[0];

  document.getElementById('deepLinkQueryTitle').textContent = q;
  document.getElementById('activeLocationBadge').textContent = `المحافظة: ${IRAQ_GOVERNORATES[state.selectedGov].name}`;

  const fbSearchQuery = encodeURIComponent(`${q} ${govName} السعر`);
  document.getElementById('fbMarketplaceLink').href = `https://www.facebook.com/search/posts/?q=${fbSearchQuery}`;

  const igGoogleDork = encodeURIComponent(`site:instagram.com "${q}" ("${govName}" OR "العراق" OR "السعر")`);
  document.getElementById('igShopsLink').href = `https://www.google.com/search?q=${igGoogleDork}`;

  const ggQuery = encodeURIComponent(`${q} السعر في العراق ${govName}`);
  document.getElementById('googleStoresLink').href = `https://www.google.com/search?q=${ggQuery}`;
}

function buildOfferDirectUrl(offer) {
  const original = safeHttpUrl(offer.directUrl);
  if (original) return original;
  // لا يوجد رابط أصلي: نعيد رابط بحث في المنصة (ويُوسم الزر بذلك في البطاقة)
  const govName = IRAQ_GOVERNORATES[offer.governorate]?.name.split(' ')[0] || 'العراق';
  const q = encodeURIComponent(`${offer.title} ${govName}`);
  if (offer.platform === 'facebook') {
    return `https://www.facebook.com/search/top/?q=${q}`;
  }
  if (offer.platform === 'instagram') {
    return `https://www.google.com/search?q=${encodeURIComponent(`site:instagram.com ${offer.title} ${govName}`)}`;
  }
  return `https://www.google.com/search?q=${q}`;
}

function matchesSearch(offer, query) {
  if (!query) return true;
  const words = normalizeDigits(query.toLowerCase())
    .split(/\s+/)
    .filter(Boolean);

  const haystack = normalizeDigits(
    `${offer.title} ${offer.storeName} ${offer.snippet} ${offer.category} ${(offer.keywords || []).join(' ')}`
  ).toLowerCase();

  return words.every((w) => haystack.includes(w));
}

function getProcessedOffers() {
  const query = state.query.trim();
  const searchIntent = PriceEngine.queryIntent(query);

  const localMatches = state.offers.filter((offer) => matchesSearch(offer, query));
  const combinedSource = query ? [...localMatches, ...searchResultOffers()] : [...state.offers, ...searchResultOffers()];

  let filtered = combinedSource.filter((offer) => {
    const offerSec = offer.section || 'products';
    if (state.selectedSection !== 'all' && offerSec !== state.selectedSection) return false;

    // فلاتر السيارات التخصصية
    if (state.selectedSection === 'cars') {
      const fullText = `${offer.title} ${offer.snippet} ${JSON.stringify(offer.specs || {})}`;
      if (state.carFilters.brand && !fullText.includes(state.carFilters.brand)) return false;
      if (state.carFilters.origin && !fullText.includes(state.carFilters.origin)) return false;
      if (state.carFilters.plate && !fullText.includes(state.carFilters.plate)) return false;
    }

    // فلاتر العقارات التخصصية
    if (state.selectedSection === 'realestate') {
      const fullText = `${offer.title} ${offer.snippet} ${JSON.stringify(offer.specs || {})}`;
      if (state.propFilters.deal && !fullText.includes(state.propFilters.deal)) return false;
      if (state.propFilters.type && !fullText.includes(state.propFilters.type)) return false;
      if (state.propFilters.deed && !fullText.includes(state.propFilters.deed)) return false;
    }

    return true;
  });

  filtered = filtered.map((offer) => {
    const distanceKm = offer.locationDetected === false ? null : calculateDistanceKm(state.selectedGov, offer.governorate);
    const deliveryFeeIQD = getDeliveryFeeForUser(offer);
    const itemPriceIQD = resolveItemPrice(offer);
    const effectivePriceIQD = itemPriceIQD
      ? state.includeDelivery && deliveryFeeIQD
        ? itemPriceIQD + deliveryFeeIQD
        : itemPriceIQD
      : null;
    const group = PriceEngine.comparisonGroupFor(offer);
    // عقار من نوع أو صفقة غير ما طلبه الباحث (أرض في بحث عن بيت، إيجار في بحث عن بيع)
    const typeMismatch = (offer.section || 'products') === 'realestate' && PriceEngine.conflictsWithIntent(group.key, searchIntent);

    return {
      ...offer,
      itemPriceIQD,
      distanceKm,
      deliveryFeeIQD,
      effectivePriceIQD,
      typeMismatch,
      comparisonKey: group.key,
      comparisonLabel: group.label
    };
  });

  filtered = filtered.filter((offer) => {
    if (state.maxBudget && offer.effectivePriceIQD && offer.effectivePriceIQD > state.maxBudget) return false;
    if (state.sameCityOnly && offer.governorate !== state.selectedGov) return false;
    return true;
  });

  if (filtered.length === 0) return { allFiltered: [], finalDisplayed: [], stats: null, focusKey: null };

  // ===== المقارنة داخل مجموعات العروض المماثلة فقط =====
  // سعر السوق يُحسب على سعر السلعة نفسها (دون أجور التوصيل الخاصة بمحافظة المستخدم)
  const groupMembers = new Map();
  for (const o of filtered) {
    if (!o.itemPriceIQD || o.typeMismatch) continue;
    if (!groupMembers.has(o.comparisonKey)) groupMembers.set(o.comparisonKey, { label: o.comparisonLabel, offers: [] });
    groupMembers.get(o.comparisonKey).offers.push(o);
  }
  const groupStats = new Map();
  for (const [key, g] of groupMembers) {
    groupStats.set(key, { key, label: g.label, stats: PriceEngine.computePriceStats(g.offers.map((o) => o.itemPriceIQD)) });
  }
  // المجموعة المعروضة في مؤشر السعر: الأكثر عروضاً مسعّرة ضمن النتائج الحالية
  const focus = [...groupStats.values()].sort((a, b) => b.stats.count - a.stats.count)[0] || null;

  const knownDistances = filtered.filter((o) => o.distanceKm !== null && !o.typeMismatch).map((o) => o.distanceKm);
  const minDist = knownDistances.length ? Math.min(...knownDistances) : null;
  const maxDist = knownDistances.length ? Math.max(...knownDistances) : null;
  const MIN_N = PriceEngine.MIN_COMPARABLE_OFFERS;

  filtered = filtered.map((offer) => {
    // العرض المخالف لنوع البحث لا يدخل المقارنة ولا يُمنح أي وسم (أرخص، أفضل، أغلى)
    const g = offer.itemPriceIQD && !offer.typeMismatch ? groupStats.get(offer.comparisonKey) : null;
    const st = g ? g.stats : null;
    const comparable = Boolean(st && st.count >= MIN_N);
    const isPriceOutlier = Boolean(
      comparable && st.count >= 4 && (offer.itemPriceIQD < st.lowerFence || offer.itemPriceIQD > st.upperFence)
    );

    let priceNorm = 0.65; // بلا سعر
    if (offer.itemPriceIQD) {
      // السعر الشاذ لا يُكافأ كأنه صفقة: غالباً خطأ استخراج أو إعلان مضلل
      if (isPriceOutlier) priceNorm = 0.85;
      else if (!comparable || st.inlierMax === st.inlierMin) priceNorm = 0.5;
      else priceNorm = Math.min(1, Math.max(0, (offer.itemPriceIQD - st.inlierMin) / (st.inlierMax - st.inlierMin)));
    }
    const distNorm =
      offer.distanceKm === null ? 0.6 : maxDist === minDist ? 0 : (offer.distanceKm - minDist) / (maxDist - minDist);

    const smartPenalty = priceNorm * 0.6 + distNorm * 0.4;
    const smartScore = Math.round((1 - smartPenalty) * 100);
    const reliable = comparable && !isPriceOutlier;
    const savingVsMedianIQD = reliable ? Math.max(0, Math.round(st.median - offer.itemPriceIQD)) : 0;

    return {
      ...offer,
      smartScore,
      comparableCount: st ? st.count : 0,
      groupMedianIQD: st ? st.median : null,
      savingVsMedianIQD,
      isPriceOutlier,
      isReliablyComparable: reliable,
      isCheapest: reliable && offer.itemPriceIQD === st.inlierMin,
      isNearest: !offer.typeMismatch && offer.distanceKm !== null && offer.distanceKm === minDist,
      isOverpriced: reliable && offer.itemPriceIQD > st.median * 1.15
    };
  });

  // الترشيح يُبنى على مقارنة سعرية، فلا يُمنح إلا لعرض ضمن 3 عروض متجانسة على الأقل
  const rankable = filtered.filter((o) => o.isReliablyComparable);
  const maxSmartScore = rankable.length ? Math.max(...rankable.map((o) => o.smartScore)) : null;
  filtered = filtered.map((offer) => ({
    ...offer,
    isBestSmart: offer.isReliablyComparable && offer.smartScore === maxSmartScore
  }));

  const allFiltered = [...filtered];

  let finalDisplayed =
    state.selectedPlatform === 'all'
      ? filtered
      : filtered.filter((o) => o.platform === state.selectedPlatform);

  const FAR = 999999999999;
  const staleOf = (o) => {
    if (o.typeMismatch) return 2; // نوع مختلف عن البحث: في آخر القائمة
    const d = offerAgeDays(o);
    return d !== null && d > STALE_AFTER_DAYS ? 1 : 0;
  };
  finalDisplayed.sort((a, b) => {
    const staleDiff = staleOf(a) - staleOf(b);
    if (staleDiff !== 0) return staleDiff;
    const aHasPrice = Boolean(a.effectivePriceIQD && a.effectivePriceIQD > 0);
    const bHasPrice = Boolean(b.effectivePriceIQD && b.effectivePriceIQD > 0);
    const aDist = a.distanceKm === null ? FAR : a.distanceKm;
    const bDist = b.distanceKm === null ? FAR : b.distanceKm;

    if (state.sortBy === 'cheapest') {
      if (aHasPrice !== bHasPrice) return aHasPrice ? -1 : 1;
      return (a.effectivePriceIQD || 0) - (b.effectivePriceIQD || 0) || aDist - bDist;
    }
    if (state.sortBy === 'nearest') {
      return aDist - bDist || (a.effectivePriceIQD || FAR) - (b.effectivePriceIQD || FAR);
    }
    if (aHasPrice !== bHasPrice) return aHasPrice ? -1 : 1;
    return b.smartScore - a.smartScore || (a.effectivePriceIQD || 0) - (b.effectivePriceIQD || 0);
  });

  return {
    allFiltered,
    finalDisplayed,
    stats: focus ? { ...focus.stats, label: focus.label } : null,
    focusKey: focus ? focus.key : null,
    groupCount: groupStats.size
  };
}

function getPlatformName(platform) {
  if (platform === 'facebook') return 'فيسبوك';
  if (platform === 'instagram') return 'انستغرام';
  return 'مواقع الويب';
}

// رسم الشارات التخصصية للسيارات والعقارات داخل البطاقة
function renderSpecializedSpecsHtml(offer) {
  const specs = offer.specs || {};
  if (offer.section === 'cars') {
    const pills = [];
    if (specs.year) pills.push(`<span class="spec-pill">الموديل: ${esc(specs.year)}</span>`);
    if (specs.mileage) pills.push(`<span class="spec-pill">الممشى: ${esc(specs.mileage)}</span>`);
    if (specs.plate) pills.push(`<span class="spec-pill spec-pill-highlight">${esc(specs.plate)}</span>`);
    if (specs.origin) pills.push(`<span class="spec-pill">${esc(specs.origin)}</span>`);
    return pills.length ? `<div class="spec-pills-row">${pills.join('')}</div>` : '';
  }

  if (offer.section === 'realestate') {
    const pills = [];
    const area = Number(specs.areaSqm) || 0;
    if (area > 0) pills.push(`<span class="spec-pill">المساحة: ${area} م²</span>`);
    if (specs.deedType) pills.push(`<span class="spec-pill spec-pill-highlight">${esc(specs.deedType)}</span>`);
    if (specs.dealType) pills.push(`<span class="spec-pill">${esc(specs.dealType)}</span>`);
    const itemPrice = offer.itemPriceIQD || offer.priceIQD;
    if (area > 0 && itemPrice && itemPrice > 0) {
      const pricePerSqm = Math.round(itemPrice / area);
      pills.push(`<span class="spec-pill spec-pill-highlight">سعر المتر: ${pricePerSqm.toLocaleString('en-US')} د.ع / م²</span>`);
    }
    return pills.length ? `<div class="spec-pills-row">${pills.join('')}</div>` : '';
  }

  return '';
}

// مسودة التقييم تُحفظ حين يُطلب تسجيل الدخول، وتُعاد كما هي بعده
let reviewDraft = null;

window.openStoreReviewModal = async function (storeName) {
  const modal = document.getElementById('reviewModal');
  const status = document.getElementById('reviewFormStatus');
  const draft = reviewDraft && reviewDraft.storeName === storeName ? reviewDraft : null;
  if (status) {
    status.hidden = !draft;
    if (draft) status.textContent = 'تم الاحتفاظ بتقييمك كما كتبته. راجعه ثم اضغط زر النشر.';
  }
  if (!draft) document.getElementById('reviewCommentInput').value = '';
  document.getElementById('reviewStoreNameInput').value = storeName;
  document.getElementById('reviewModalStoreTitle').textContent = `سجل الموثوقية وتجارب المشترين مع: ${storeName} (تقييمات المستخدمين، غير موثقة)`;
  if (!modal.open) modal.showModal();
  await loadStoreReviews(storeName);
};

async function loadStoreReviews(storeName) {
  const box = document.getElementById('storeReviewsList');
  box.innerHTML = '<div class="alert-row">جاري تحميل تقييمات المتجر...</div>';
  try {
    const res = await fetch(`/api/reviews?store=${encodeURIComponent(storeName)}`, { cache: 'no-store' });
    const data = await res.json();
    const reviews = data.reviews || [];
    // تقييمك السابق لهذه الجهة (إن وُجد) يُعرض للتعديل بدل إضافة تقييم مكرر
    const mine = data.mine || null;
    const submitBtn = document.getElementById('reviewSubmitBtn');
    if (submitBtn) submitBtn.textContent = mine ? 'تحديث تقييمك السابق' : 'نشر التقييم في سجل الموثوقية';
    const draft = reviewDraft && reviewDraft.storeName === storeName ? reviewDraft : null;
    const fill = draft || (mine && { rating: mine.rating, allowsInspection: mine.allows_inspection, comment: mine.comment });
    // المسودة غير المرسلة لها الأولوية على التقييم السابق المحفوظ
    if (fill) {
      document.getElementById('reviewRatingSelect').value = String(fill.rating);
      document.getElementById('reviewInspectionSelect').value = fill.allowsInspection ? 'true' : 'false';
      document.getElementById('reviewCommentInput').value = fill.comment || '';
    }
    if (reviews.length === 0) {
      box.innerHTML = '<div class="alert-row">لا توجد تقييمات سابقة مسجلة لهذه الجهة حتى الآن. كن أول من يقيمها!</div>';
      return;
    }
    box.innerHTML = reviews
      .map(
        (r) => `
        <div class="alert-row">
          <div>
            <strong>${'★'.repeat(Math.min(5, Math.max(0, Math.round(Number(r.rating) || 0))))} (${r.allows_inspection ? 'يقبل الفحص الكامل' : 'رفض الفحص'})</strong>
            <div style="color:var(--text-body); margin-top:2px;">${esc(r.comment)}</div>
          </div>
          <span style="font-size:0.72rem; color:var(--text-muted);">${esc(IRAQ_GOVERNORATES[r.reviewer_gov]?.name || 'العراق')}</span>
        </div>
      `
      )
      .join('');
  } catch {
    box.innerHTML = '<div class="alert-row">تعذر جلب التقييمات حالياً.</div>';
  }
}

function normalizeVinClient(raw) {
  return normalizeDigits(String(raw || '')).toUpperCase().replace(/[\s\-_.]/g, '');
}

/** قسم نتيجة فحص الشاصي في نافذة الفحص (كل النصوص المعروضة مهرّبة). */
function renderVinSection(v) {
  if (!v) return '';
  if (v.error) return `<div class="vin-box vin-bad"><strong>رقم الشاصي:</strong> ${esc(v.message)}</div>`;
  const { warnings, matched } = vinFindings(v);
  const specs = vinSpecRows(v.decoded);
  return `
    <div class="vin-box ${warnings.length ? 'vin-bad' : 'vin-good'}">
      <strong>رقم الشاصي ${esc(v.vin)} — ${esc(v.region?.label || '')}</strong>
      ${warnings.map((w) => `<div>⚠ ${esc(w)}</div>`).join('')}
      ${matched.length ? `<div>✔ مطابق للإعلان: ${esc(matched.join('، '))}</div>` : ''}
      ${
        v.decoded
          ? `<table class="vin-specs">${specs.map(([k, val]) => `<tr><th>${esc(k)}</th><td dir="auto">${esc(val)}</td></tr>`).join('')}</table>`
          : '<div>لم يُعثر على مواصفات هذا الشاصي في السجل الأمريكي (شائع في السيارات المصنوعة لأسواق غير أمريكية).</div>'
      }
      <small>المواصفات من سجل المصنع الأمريكي (NHTSA). لا تكشف الحوادث أو الغرق أو العداد — هذه يكشفها تقرير تاريخ السيارة.</small>
      ${
        state.config.vinHistoryEnabled && v.region?.code === 'north_america'
          ? `<button type="button" class="btn-submit" data-action="buy-vin-report" data-vin="${esc(v.vin)}">تقرير تاريخ السيارة الكامل (${esc(formatIQD(state.config.vinReportPriceIQD))}): غرق، تلف، خسارة كلية، قراءات العداد</button>
             <small>إن لم توجد بيانات لهذا الشاصي في السجل الأمريكي يُضاف لك رصيد تقرير لشاصي آخر، فلا يضيع مالك.</small>
             <div class="vin-buy-status" hidden></div>`
          : ''
      }
    </div>`;
}

/** نص حكم فحص الإعلان (كل القيم المعروضة أرقام منسقة أو نصوص ثابتة). */
function renderAdVerdict(j, guide, section, price, areaSqm = 0) {
  const insufficientHint = j.verdict === 'insufficient' ? ' اضغط "ابحث الآن" لمقارنته بالعروض الحالية.' : '';
  const summary = guideSummaryText(guide);
  const basis = basisLine(section, price, areaSqm, guide);
  const checklist = (AD_CHECKLISTS[section] || AD_CHECKLISTS.products).map((t) => `<li>${esc(t)}</li>`).join('');
  return `
    <strong>${esc(verdictLine(j) + insufficientHint)}</strong>
    ${price > 0 ? `<div>سعر الإعلان: ${esc(formatIQD(price))}</div>` : ''}
    ${basis ? `<div>${esc(basis)}</div>` : ''}
    ${summary ? `<div class="ad-verdict-guide">${esc(summary)}</div>` : ''}
    <div class="ad-verdict-checklist">قبل الدفع:<ul>${checklist}</ul></div>
    <small>الأسعار المرصودة تقديرية ومعلنة من مواقع ونتائج بحث، وليست تقييماً رسمياً.</small>`;
}

/** دليل السعر من ذاكرة الأسعار: ما رصدناه من أسعار مماثلة خلال الأشهر الأخيرة. */
function guideSummary(g) {
  return guideSummaryText(g);
}

function renderPriceGuideNote() {
  const el = document.getElementById('priceGuideNote');
  if (!el) return;
  const text = state.query.trim() ? guideSummary(state.priceGuide) : '';
  el.hidden = !text;
  el.textContent = text;
}

function renderApp() {
  updateLiveDeepLinks();

  // تحديث عدادات القطاعات الرئيسية في الشريط العلوي
  const allSource = state.query.trim() ? [...state.offers.filter((o) => matchesSearch(o, state.query.trim())), ...searchResultOffers()] : state.offers;
  const secCountAllEl = document.getElementById('secCountAll');
  const secCountProductsEl = document.getElementById('secCountProducts');
  const secCountCarsEl = document.getElementById('secCountCars');
  const secCountRealestateEl = document.getElementById('secCountRealestate');
  if (secCountAllEl) secCountAllEl.textContent = allSource.length;
  if (secCountProductsEl) secCountProductsEl.textContent = allSource.filter((o) => (o.section || 'products') === 'products').length;
  if (secCountCarsEl) secCountCarsEl.textContent = allSource.filter((o) => o.section === 'cars').length;
  if (secCountRealestateEl) secCountRealestateEl.textContent = allSource.filter((o) => o.section === 'realestate').length;

  // إظهار أو إخفاء أشرطة الفلاتر التخصصية للسيارات والعقارات
  document.getElementById('carsFilterPanel').hidden = state.selectedSection !== 'cars';
  document.getElementById('realestateFilterPanel').hidden = state.selectedSection !== 'realestate';

  const { allFiltered, finalDisplayed, stats, focusKey } = getProcessedOffers();

  document.getElementById('countAll').textContent = allFiltered.length;
  document.getElementById('countFb').textContent = allFiltered.filter((o) => o.platform === 'facebook').length;
  document.getElementById('countIg').textContent = allFiltered.filter((o) => o.platform === 'instagram').length;
  document.getElementById('countGg').textContent = allFiltered.filter((o) => o.platform === 'google').length;

  const MIN_N = PriceEngine.MIN_COMPARABLE_OFFERS;
  renderPriceGuideNote();
  const meterFairNote = document.getElementById('meterFairNote');
  const meterMinNote = document.getElementById('meterMinNote');
  if (stats && stats.count < MIN_N) {
    // أقل من 3 عروض متجانسة: لا حكم على السعر العادل ولا على الأرخص
    document.getElementById('meterMinPrice').textContent = '—';
    document.getElementById('meterAvgPrice').textContent = '—';
    document.getElementById('meterMaxPrice').textContent = '—';
    document.getElementById('meterMaxDiffNote').textContent = 'لا مقارنة دون 3 عروض متجانسة';
    if (meterFairNote) {
      meterFairNote.textContent = `عينة غير كافية: ${stats.count} عرض مماثل مسعّر (${stats.label}) • يلزم ${MIN_N} عروض متجانسة على الأقل للحكم على السعر`;
    }
    if (meterMinNote) meterMinNote.textContent = 'لا يُحدَّد الأرخص قبل توفر عروض كافية للمقارنة';
  } else if (stats) {
    const lowValue = stats.inlierMin;
    const highValue = stats.inlierMax;
    document.getElementById('meterMinPrice').textContent = `${formatIQD(lowValue)} (${convertIQDtoUSD(lowValue)})`;
    document.getElementById('meterAvgPrice').textContent = `${formatIQD(stats.median)} (${convertIQDtoUSD(stats.median)})`;
    document.getElementById('meterMaxPrice').textContent = `${formatIQD(highValue)} (${convertIQDtoUSD(highValue)})`;

    const sampleNote = '';
    if (meterFairNote) {
      meterFairNote.textContent = `الوسيط لـ ${stats.count} عرض مماثل (${stats.label}) • المتوسط الحسابي: ${formatIQD(Math.round(stats.mean))}${sampleNote}`;
    }
    if (meterMinNote) {
      meterMinNote.textContent = stats.outlierCount > 0
        ? `استُبعد ${stats.outlierCount} سعر شاذ من الحدين الأدنى والأعلى`
        : 'ضمن العروض المماثلة المعروضة حالياً';
    }
    const diff = highValue - lowValue;
    document.getElementById('meterMaxDiffNote').textContent =
      diff > 0 ? `أغلى من أقل عرض مماثل بمقدار ${formatIQD(diff)}` : 'لا يوجد فرق سعري بين العروض المماثلة';

    if (state.adComparisonPrice && stats.count >= MIN_N && state.adComparisonPrice > lowValue) {
      const savedFromAd = state.adComparisonPrice - lowValue;
      const banner = document.getElementById('searchStatusBanner');
      banner.hidden = false;
      banner.textContent = `نتيجة مقارنة الإعلان: أقل سعر بين ${stats.count} عرض مماثل هو ${formatIQD(lowValue)}، أي أقل بـ ${formatIQD(savedFromAd)} من سعر الإعلان. تحقق من تطابق المواصفات قبل الشراء.`;
    }
  } else {
    document.getElementById('meterMinPrice').textContent = '—';
    document.getElementById('meterAvgPrice').textContent = '—';
    document.getElementById('meterMaxPrice').textContent = '—';
    document.getElementById('meterMaxDiffNote').textContent = 'ابحث للمقارنة';
    if (meterFairNote) meterFairNote.textContent = 'الوسيط والمتوسط الحسابي للعروض المماثلة فقط';
    if (meterMinNote) meterMinNote.textContent = 'ضمن العروض المماثلة المعروضة حالياً';
  }

  if (allFiltered.length > 0) {
    // الأرخص يُختار من مجموعة المقارنة نفسها وليس من خليط فئات مختلفة
    // لا يُعلن "الأرخص" إلا عند وجود 3 عروض متجانسة مسعّرة على الأقل
    const focusPriced = allFiltered.filter(
      (o) => o.effectivePriceIQD && o.effectivePriceIQD > 0 && o.comparisonKey === focusKey && o.isReliablyComparable
    );
    const cheapest = focusPriced.length ? [...focusPriced].sort((a, b) => a.effectivePriceIQD - b.effectivePriceIQD)[0] : null;
    const located = allFiltered.filter((o) => o.distanceKm !== null && !o.typeMismatch);
    const nearest = located.length
      ? [...located].sort((a, b) => a.distanceKm - b.distanceKm || (a.effectivePriceIQD || 999999999999) - (b.effectivePriceIQD || 999999999999))[0]
      : allFiltered[0];
    const smartest = allFiltered.find((o) => o.isBestSmart) || null;
    const priceKind = priceKindLabel;

    state.topCardTargets = {
      cheapest: cheapest?.id || null,
      nearest: nearest.id,
      smart: smartest?.id || null
    };

    if (cheapest) {
      document.getElementById('bestPriceTitle').textContent = cheapest.title;
      document.getElementById('bestPriceValue').textContent = formatIQD(cheapest.effectivePriceIQD);
      document.getElementById('bestPricePlatform').textContent = `${getPlatformName(cheapest.platform)} • ${govLabel(cheapest)} • ${priceKind(cheapest)}`;
    } else {
      document.getElementById('bestPriceTitle').textContent = `لا توجد ${MIN_N} عروض متجانسة مسعّرة لتحديد الأرخص`;
      document.getElementById('bestPriceValue').textContent = '—';
      document.getElementById('bestPricePlatform').textContent = 'افتح المصادر وقارن يدوياً';
    }

    document.getElementById('nearestItemTitle').textContent = nearest.title;
    document.getElementById('nearestItemDistance').textContent =
      nearest.distanceKm === null ? describeDistance(nearest) : `${govLabel(nearest)} • ${describeDistance(nearest)}`;
    document.getElementById('nearestItemPrice').textContent = formatIQD(nearest.effectivePriceIQD);

    if (smartest) {
      document.getElementById('smartMatchTitle').textContent = smartest.title;
      document.getElementById('smartMatchMeta').textContent = `${formatIQD(smartest.effectivePriceIQD)} • ${govLabel(smartest)}`;
      document.getElementById('smartMatchSaving').textContent = `معيار التوافق ${smartest.smartScore}%`;
    } else {
      document.getElementById('smartMatchTitle').textContent = `لا توجد ${MIN_N} عروض متجانسة مسعّرة لترشيح موثوق`;
      document.getElementById('smartMatchMeta').textContent = '—';
      document.getElementById('smartMatchSaving').textContent = '';
    }
  } else {
    document.getElementById('bestPriceTitle').textContent = state.isSearchingLive ? 'جاري البحث الحي...' : 'لا توجد عروض مطابقة';
    document.getElementById('bestPriceValue').textContent = '—';
    document.getElementById('bestPricePlatform').textContent = '';
    document.getElementById('nearestItemTitle').textContent = state.isSearchingLive ? 'جاري البحث الحي...' : 'لا توجد عروض مطابقة';
    document.getElementById('nearestItemDistance').textContent = '—';
    document.getElementById('nearestItemPrice').textContent = '';
    document.getElementById('smartMatchTitle').textContent = state.isSearchingLive ? 'جاري البحث الحي...' : 'لا توجد عروض مطابقة';
    document.getElementById('smartMatchMeta').textContent = '—';
    document.getElementById('smartMatchSaving').textContent = '';
  }

  const grid = document.getElementById('resultsGrid');

  if (state.isSearchingLive && finalDisplayed.length === 0) {
    grid.innerHTML = `
      <div class="product-card" style="grid-column: 1 / -1; text-align: center; padding: 42px;">
        <h3 style="margin-bottom: 8px; color: var(--brand-primary);">جاري البحث الحي في نتائج محركات البحث عن "${esc(state.query)}"...</h3>
        <p style="color: var(--text-muted); font-size: 0.88rem;">
          تُجمع روابط عامة من فيسبوك وانستغرام ومواقع عراقية، ويُستخرج السعر آلياً من نص النتيجة دون تحقق.
        </p>
      </div>
    `;
    return;
  }

  if (finalDisplayed.length === 0) {
    const noQuery = !state.query.trim();
    grid.innerHTML = `
      <div class="product-card" style="grid-column: 1 / -1; text-align: center; padding: 36px;">
        <h3 style="margin-bottom: 6px;">${noQuery ? 'ابدأ بالبحث عن سلعة أو سيارة أو عقار' : 'لم يتم العثور على عروض مطابقة للمحددات المختارة'}</h3>
        <p style="color: var(--text-muted); font-size: 0.88rem;">
          ${noQuery
            ? 'اكتب اسم ما تبحث عنه في شريط البحث، أو اختر قسماً من القائمة، وستظهر النتائج الحية مع رابط مصدرها.'
            : 'جرب تغيير الفلاتر أو اضغط على أحد أزرار "البحث الحي في المنصات المفتوحة" أعلاه لفتح نتائج فيسبوك أو انستغرام أو كوكل مباشرة.'}
        </p>
      </div>
    `;
    return;
  }

  // صفحات الأقسام والبحث في المواقع تضم إعلانات كثيرة: تُعرض منفصلة أسفل الإعلانات الفردية
  const listingPages = finalDisplayed.filter((o) => o.isListingPage);
  const singleAds = finalDisplayed.filter((o) => !o.isListingPage);
  const listingPagesHtml = listingPages.length
    ? `
      <details class="listing-pages-box" ${singleAds.length ? '' : 'open'}>
        <summary>صفحات أقسام وبحث في المواقع (${listingPages.length}) — كل صفحة تضم إعلانات متعددة، افتحها للتصفح</summary>
        <ul>
          ${listingPages
            .map(
              (o) => `<li><a href="${esc(buildOfferDirectUrl(o))}" target="_blank" rel="noopener noreferrer nofollow">${esc(o.title)}</a>
                <span>${esc(String(o.storeName || ''))}</span></li>`
            )
            .join('')}
        </ul>
      </details>`
    : '';

  grid.innerHTML = singleAds
    .map((offer) => {
      const isDemo = offer.source === 'demo';
      const isLive = offer.source === 'live';
      const govName = govLabel(offer);
      const distText = describeDistance(offer);
      const verifiedPrice = isVerifiedPrice(offer);
      const hasOriginalUrl = Boolean(safeHttpUrl(offer.directUrl));
      const directUrl = buildOfferDirectUrl(offer);
      const imgUrl = getProductImageUrl(offer);
      const usdText = convertIQDtoUSD(offer.effectivePriceIQD);
      const storeName = String(offer.storeName || 'معلن غير مسمى');
      // نتائج البحث الحي لا تحدد بائعاً بعينه (اسمها اسم المنصة أو الموقع)، فلا تقييم لها
      const canReviewSeller = !isLive && isReviewableSellerName(storeName);
      const specsHtml = renderSpecializedSpecsHtml(offer);
      const phone = safeIraqiMobile(offer.phone);
      const hasReviews = Number(offer.reviewsCount) > 0 && Number.isFinite(Number(offer.trustRating)) && offer.trustRating !== null;
      const ratingText = hasReviews ? `★ ${Number(offer.trustRating).toFixed(1)} (${Number(offer.reviewsCount)})` : '☆ لا توجد تقييمات';
      const imgAlt = offer.imageIsIllustrative ? 'صورة توضيحية من بحث الصور وليست من الإعلان' : offer.title;

      // رمز بديل دائماً تحت الصورة: إن تعذر تحميل الصورة يظهر بدل مساحة فارغة
      const placeholderSvg = `<svg class="row-media-placeholder" viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#9ca3af" stroke-width="1.6">
             <rect x="3" y="4" width="18" height="16" rx="2"></rect>
             <circle cx="9" cy="10" r="2"></circle>
             <path d="m21 16-5-5-9 9"></path>
           </svg>`;
      const thumbHtml = imgUrl
        ? `${placeholderSvg}<img src="${esc(imgUrl)}" alt="${esc(imgAlt)}" title="${offer.imageIsIllustrative ? 'صورة توضيحية وليست صورة الإعلان' : ''}" class="product-thumb-img" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" />`
        : placeholderSvg;

      let deliveryBreakdownHtml = '';
      if (offer.section === 'cars') {
        deliveryBreakdownHtml = isDemo
          ? `<span class="delivery-breakdown">فحص سونار ومعاينة مباشرة في المعرض</span>`
          : `<span class="delivery-breakdown">اتفق مع البائع على الفحص والمعاينة قبل الدفع</span>`;
      } else if (offer.section === 'realestate') {
        deliveryBreakdownHtml = isDemo
          ? `<span class="delivery-breakdown">معاينة موقعية وتدقيق السند العقاري</span>`
          : `<span class="delivery-breakdown">تحقق من السند في دائرة التسجيل العقاري قبل الدفع</span>`;
      } else if (offer.itemPriceIQD && offer.itemPriceIQD > 0) {
        if (offer.deliveryFeeIQD === null) {
          deliveryBreakdownHtml = `<span class="delivery-breakdown">سعر السلعة فقط — أجور التوصيل غير معروفة، راجع المصدر</span>`;
        } else if (state.includeDelivery) {
          deliveryBreakdownHtml =
            offer.deliveryFeeIQD === 0
              ? `<span class="delivery-breakdown">السعر الصافي واصل لباب البيت (توصيل مجاني)</span>`
              : `<span class="delivery-breakdown">السعر الصافي واصل لباب البيت (السلعة ${formatIQD(offer.itemPriceIQD)} + توصيل ${formatIQD(offer.deliveryFeeIQD)})</span>`;
        } else {
          deliveryBreakdownHtml = `<span class="delivery-breakdown">سعر السلعة فقط (التوصيل لمحافظتك: ${offer.deliveryFeeIQD === 0 ? 'مجاني' : formatIQD(offer.deliveryFeeIQD)})</span>`;
        }
      }
      if (offer.priceIsRent) {
        deliveryBreakdownHtml += `<span class="delivery-breakdown">سعر إيجار${offer.rentPeriod === 'year' ? ' سنوي' : offer.rentPeriod === 'day' ? ' يومي' : ' شهري'} وليس سعر بيع</span>`;
      }
      if (isLive && offer.isListingPage) {
        deliveryBreakdownHtml += `<span class="delivery-breakdown">صفحة تضم إعلانات متعددة — افتح المصدر لمقارنة أسعارها</span>`;
      }
      if (isLive && offer.itemPriceIQD) {
        const matched = offer.priceMeta?.matchedText ? ` («${esc(offer.priceMeta.matchedText)}»)` : '';
        deliveryBreakdownHtml += `<span class="delivery-breakdown">سعر تقديري مستخرج آلياً من مقتطف البحث${matched} — ليس سعراً مؤكداً، تحقق منه في المصدر</span>`;
      } else if (offer.source === 'indexed' && offer.itemPriceIQD) {
        // نوع السعر ظاهر في الوسم أعلاه، فلا نكرره
      } else if (!isDemo && offer.itemPriceIQD && !verifiedPrice) {
        deliveryBreakdownHtml += `<span class="delivery-breakdown">سعر معلن غير موثّق: أدخله المعلن ولم يتحقق منه أحد</span>`;
      } else if (verifiedPrice && offer.itemPriceIQD) {
        deliveryBreakdownHtml += `<span class="delivery-breakdown">سعر موثّق من مصدر متحقَّق منه</span>`;
      }

      let inspectionLabel;
      if (isLive) {
        inspectionLabel = '⚠ نتيجة بحث آلية: السعر والهاتف والموقع غير موثقة — تحقق من المصدر';
      } else if (offer.source === 'indexed') {
        inspectionLabel = 'إعلان من موقع عراقي: البيانات كما نشرها المعلن — عاين قبل الدفع';
      } else if (isDemo) {
        inspectionLabel =
          offer.section === 'cars'
            ? '✔ مكفول ويقبل فحص السونار والكمبيوتر'
            : offer.section === 'realestate'
              ? '✔ سند رسمي قابل للتحويل الفوري'
              : '✔ يقبل فتح وفحص الطلب أمام المندوب';
      } else {
        inspectionLabel = offer.allowsInspection
          ? 'يقبل الفحص حسب ما ذكره المعلن (غير موثق)'
          : 'لم يؤكد المعلن قبول الفحص';
      }

      const age = offerAgeDays(offer);
      const isStale = age !== null && age > STALE_AFTER_DAYS;
      const reviewControl = canReviewSeller
        ? `<button type="button" class="trust-rate-btn" data-action="review" data-store="${esc(storeName)}" title="عرض وإضافة تقييمات المستخدمين لهذه الجهة">${ratingText}</button>`
        : '<span class="post-time" title="التقييم غير متاح: هوية البائع الحقيقية غير معروفة، فلا تُجمع تقييمات بائعين مختلفين تحت اسم المنصة أو الموقع">بائع غير محدد (لا تقييم)</span>';

      return `
      <article id="offer-card-${esc(offer.id)}" data-offer-id="${esc(offer.id)}" class="product-card result-row ${offer.isCheapest ? 'is-cheapest' : ''} ${isStale ? 'is-stale' : ''}">
        <a class="row-media" href="${esc(directUrl)}" target="_blank" rel="noopener noreferrer nofollow" tabindex="-1" aria-hidden="true">
          ${thumbHtml}
        </a>

        <div class="row-main">
          <div class="card-ribbons">
            ${isDemo ? '<span class="ribbon-tag ribbon-overpriced">عرض تجريبي (غير حقيقي)</span>' : ''}
            ${offer.isCheapest ? '<span class="ribbon-tag ribbon-cheapest">الأقل سعراً بين العروض المماثلة</span>' : ''}
            ${offer.isNearest ? `<span class="ribbon-tag ribbon-nearest">${offer.distanceKm === 0 ? 'داخل محافظتك' : 'الأقرب تقديرياً حسب المحافظة'}</span>` : ''}
            ${offer.isBestSmart ? '<span class="ribbon-tag ribbon-smart">الترشيح الأفضل</span>' : ''}
            ${offer.isOverpriced ? '<span class="ribbon-tag ribbon-overpriced">أغلى من الوسيط للعروض المماثلة</span>' : ''}
            ${offer.isPriceOutlier ? '<span class="ribbon-tag ribbon-overpriced">سعر شاذ عن العروض المماثلة — تحقق منه</span>' : ''}
            ${isStale ? '<span class="ribbon-tag ribbon-stale">إعلان قديم — قد يكون بيع</span>' : ''}
            ${vinBadgeHtml(offer)}
            ${
              offer.source === 'user' && offer.isReliablyComparable && !offer.isOverpriced && !offer.isPriceOutlier && !offer.isCheapest
                ? '<span class="ribbon-tag ribbon-cheapest">✔ سعر ضمن السوق</span>'
                : ''
            }
            ${offer.typeMismatch ? `<span class="ribbon-tag ribbon-stale">نوع مختلف عن بحثك: ${esc(mismatchLabel(offer))} — خارج المقارنة</span>` : ''}
          </div>
          <h3 class="product-title">${esc(offer.title)}</h3>

          <div class="row-meta">
            <span class="platform-chip chip-${esc(offer.platform)}">${esc(getPlatformName(offer.platform))}</span>
            <span class="seller-name">${esc(storeName)}</span>
            <span class="row-meta-sep">•</span>
            <span class="post-time ${isStale ? 'is-old' : ''}">${esc(formatPostedTime(offer))}</span>
          </div>

          ${specsHtml}

          <p class="seller-description">${esc(offer.snippet)}</p>

          <div class="row-facts">
            <span class="logistics-item">
              <svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              ${esc(govName)}${offer.district ? ` (${esc(offer.district)})` : ''}
            </span>
            <span class="distance-badge ${offer.distanceKm === 0 ? 'in-same-city' : ''}">${esc(distText)}</span>
          </div>

          <div class="trust-and-inspection-row">
            <span class="inspection-pill">${esc(inspectionLabel)}</span>
            ${reviewControl}
            ${
              canReviewSeller
                ? `<button type="button" class="overview-jump" style="background:none; border:none; cursor:pointer;" data-action="review" data-store="${esc(storeName)}">تقييم الجهة أو الإبلاغ</button>`
                : ''
            }
          </div>
        </div>

        <div class="row-side card-footer-box">
          <div class="price-block">
            <div class="price-main-row">
              <span class="price-iqd" style="${!offer.effectivePriceIQD ? 'font-size:0.92rem; color:var(--brand-primary);' : ''}">${formatIQD(offer.effectivePriceIQD)}</span>
              ${usdText ? `<span class="price-usd">(${esc(usdText)})</span>` : ''}
            </div>
            ${offer.effectivePriceIQD && !isDemo && !verifiedPrice ? `<span class="price-kind-tag" title="السعر غير مؤكد">• ${esc(priceKindLabel(offer))}</span>` : ''}
            ${deliveryBreakdownHtml}
            ${
              offer.savingVsMedianIQD > 5000
                ? `<span class="saving-note">أقل بـ ${formatIQD(offer.savingVsMedianIQD)} من السعر الوسيط لـ ${offer.comparableCount} عروض مماثلة</span>`
                : ''
            }
          </div>

          <div class="card-cta-group">
            ${
              phone
                ? `<button type="button" class="btn-copy-phone" data-action="copy-phone" data-phone="${esc(phone)}" title="${isLive ? 'رقم مستخرج آلياً من نتيجة البحث وغير موثق' : 'نسخ رقم الهاتف'}">
                    <svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                    <span>${esc(phone)}${isLive ? ' (غير موثق)' : ''}</span>
                  </button>`
                : ''
            }
            <a href="${esc(directUrl)}" target="_blank" rel="noopener noreferrer nofollow" class="btn-open-offer">
              <span>${hasOriginalUrl ? 'فتح الإعلان الأصلي' : 'بحث في المنصة'}</span>
              <svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M7 17 17 7M7 7h10v10"></path>
              </svg>
            </a>
          </div>
        </div>
      </article>
      `;
    })
    .join('') + listingPagesHtml;
}

// ===== رادار الأسعار والإشعارات (مرتبطة بحساب غوغل) =====

const SECTION_LABELS = { all: 'جميع الأقسام', products: 'السلع', cars: 'السيارات', realestate: 'العقارات' };

async function loadPriceAlerts() {
  try {
    const res = await fetch('/api/alerts', { cache: 'no-store' });
    const data = await res.json();
    state.alerts = data.alerts || [];
    state.alertLimit = data.limit || null;
  } catch {
    state.alerts = [];
  }
  renderAlertsList();
}

function renderAlertsList() {
  const box = document.getElementById('activeAlertsList');
  if (!box) return;
  if (!state.user) {
    box.innerHTML = '<div class="alert-row">سجّل الدخول بحساب غوغل لإنشاء تنبيهات الأسعار ومتابعتها على كل أجهزتك.</div>';
    return;
  }
  if (state.alerts.length === 0) {
    box.innerHTML = '<div class="alert-row">لا توجد تنبيهات نشطة حالياً. أضف سلعة أو سيارة أو عقار ليراقبه الرادار لك!</div>';
    return;
  }
  box.innerHTML = state.alerts
    .map(
      (a) => `
      <div class="alert-row">
        <div>
          <strong>${esc(a.keyword)}</strong> — ${
            a.belowMarketPct
              ? `🎯 صفقة: <span style="color:var(--brand-primary); font-weight:700;">أرخص من وسيط السوق بـ ${Number(a.belowMarketPct)}% أو أكثر</span>`
              : `السعر المستهدف: <span style="color:var(--brand-primary); font-weight:700;">${formatIQD(Number(a.targetPriceIQD))}</span>`
          }
          <div style="font-size:0.73rem; color:var(--text-muted);">المحافظة: ${esc(IRAQ_GOVERNORATES[a.governorate]?.name || a.governorate)} • ${esc(SECTION_LABELS[a.section] || SECTION_LABELS.all)} • يُفحص يومياً</div>
        </div>
        <div style="display:flex; gap:6px; flex-shrink:0;">
          <button type="button" class="btn-secondary" style="padding:3px 8px; font-size:0.74rem;" data-edit-alert="${Number(a.id) || 0}">تعديل</button>
          <button type="button" class="btn-secondary" style="padding:3px 8px; font-size:0.74rem;" data-delete-alert="${Number(a.id) || 0}">حذف</button>
        </div>
      </div>
    `
    )
    .join('');
}

async function deleteAlert(id) {
  await fetch(`/api/alerts/${Number(id)}`, { method: 'DELETE' }).catch(() => {});
  await loadPriceAlerts();
}
window.deleteAlert = deleteAlert;

function timeAgo(iso) {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (!Number.isFinite(mins)) return '';
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const h = Math.round(mins / 60);
  return h < 24 ? `منذ ${h} ساعة` : `منذ ${Math.round(h / 24)} يوم`;
}

/** يحدّث عدّاد الإشعارات غير المقروءة على الزر، وعلى أيقونة التطبيق إن كان مثبتاً على الشاشة الرئيسية. */
function setUnreadCount(n) {
  const count = Math.max(0, Number(n) || 0);
  state.unreadNotifications = count;
  const badge = document.getElementById('radarCountBadge');
  badge.textContent = count > 99 ? '99+' : String(count);
  badge.classList.toggle('has-unread', count > 0);
  try {
    if (count > 0) navigator.setAppBadge?.(count)?.catch?.(() => {});
    else navigator.clearAppBadge?.()?.catch?.(() => {});
  } catch {}
}

/** يعلّم كل الإشعارات مقروءة (يُستدعى عند إغلاق نافذة الرادار بعد أن يراها المستخدم). */
function markNotificationsRead() {
  if (!state.user || !state.unreadNotifications) return;
  setUnreadCount(0);
  fetch('/api/notifications/read', { method: 'POST' }).catch(() => {});
}

async function loadNotifications() {
  if (!state.user) {
    setUnreadCount(0);
    return;
  }
  try {
    const res = await fetch('/api/notifications', { cache: 'no-store' });
    const data = await res.json();
    state.notifications = data.items || [];
    setUnreadCount(data.unread);
  } catch {
    state.notifications = [];
  }
  const box = document.getElementById('notificationsList');
  if (!box) return;
  if (!state.notifications.length) {
    box.innerHTML = '<div class="alert-row">لا توجد إشعارات بعد. ستظهر هنا تنبيهات نزول الأسعار وتأكيدات الاشتراك.</div>';
    return;
  }
  box.innerHTML = state.notifications
    .slice(0, 10)
    .map(
      (n) => `
      <a class="alert-row" href="${esc(n.url && n.url.startsWith('/') ? n.url : '/')}" style="text-decoration:none; color:inherit; ${n.readAt ? '' : 'font-weight:600;'}">
        <div>
          <strong>${esc(n.title)}</strong>
          <div style="color:var(--text-body); margin-top:2px;">${esc(n.body)}</div>
        </div>
        <span style="font-size:0.72rem; color:var(--text-muted); white-space:nowrap;">${esc(timeAgo(n.createdAt))}</span>
      </a>`
    )
    .join('');
}

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function refreshPushStatus() {
  const text = document.getElementById('pushStatusText');
  const btn = document.getElementById('enablePushBtn');
  if (!text || !btn) return;
  if (!pushSupported()) {
    const ios = /iphone|ipad/i.test(navigator.userAgent);
    text.textContent = ios
      ? 'على الآيفون: اضغط زر المشاركة ثم "إضافة إلى الشاشة الرئيسية"، وافتح الموقع من الأيقونة لتفعيل الإشعارات. التنبيهات تظهر داخل الموقع في كل الأحوال.'
      : 'متصفحك لا يدعم الإشعارات الفورية. التنبيهات تظهر داخل الموقع في قائمة "آخر الإشعارات".';
    btn.hidden = true;
    return;
  }
  const reg = await navigator.serviceWorker.getRegistration('/');
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (Notification.permission === 'denied') {
    text.textContent = 'إشعارات المتصفح محظورة لهذا الموقع. يمكنك السماح بها من إعدادات المتصفح. التنبيهات تظهر داخل الموقع.';
    btn.hidden = true;
  } else if (sub) {
    text.textContent = '✔ الإشعارات الفورية مفعلة على هذا الجهاز، وستصلك تنبيهات الأسعار حتى والموقع مغلق.';
    btn.textContent = 'إيقاف الإشعارات';
    btn.dataset.mode = 'off';
    btn.hidden = false;
  } else {
    text.textContent = 'فعّلها لتصلك تنبيهات نزول الأسعار فور ظهورها، حتى والموقع مغلق.';
    btn.textContent = 'تفعيل الإشعارات';
    btn.dataset.mode = 'on';
    btn.hidden = false;
  }
}

async function togglePush() {
  const btn = document.getElementById('enablePushBtn');
  const text = document.getElementById('pushStatusText');
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    if (btn.dataset.mode === 'off') {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
        await sub.unsubscribe();
      }
    } else {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        await refreshPushStatus();
        return;
      }
      const { publicKey } = await (await fetch('/api/push/public-key')).json();
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      const res = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON() }) });
      if (!res.ok) throw new Error('subscribe failed');
    }
  } catch {
    text.textContent = 'تعذر تفعيل إشعارات المتصفح الآن. التنبيهات تظهر داخل الموقع في كل الأحوال.';
    return;
  }
  await refreshPushStatus();
}

function detectUserGovernorateByGPS() {
  const statusBanner = document.getElementById('searchStatusBanner');
  if (!navigator.geolocation) {
    statusBanner.hidden = false;
    statusBanner.textContent = 'المتصفح لا يدعم تحديد الموقع الجغرافي، يمكنك اختيار محافظتك من القائمة العلوية.';
    return;
  }

  statusBanner.hidden = false;
  statusBanner.textContent = 'جاري تحديد موقعك الجغرافي وحساب أقرب محافظة عراقية...';

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      let closestGov = 'baghdad';
      let minDist = Infinity;

      for (const [govKey, govData] of Object.entries(IRAQ_GOVERNORATES)) {
        const d = Math.hypot(latitude - govData.lat, longitude - govData.lon);
        if (d < minDist) {
          minDist = d;
          closestGov = govKey;
        }
      }

      state.selectedGov = closestGov;
      document.getElementById('governorateSelect').value = closestGov;
      statusBanner.textContent = `تم تحديد المحافظة تلقائياً: ${IRAQ_GOVERNORATES[closestGov].name} — تم تحديث المسافات وأجور التوصيل.`;
      renderApp();
    },
    () => {
      statusBanner.textContent = 'تعذر الوصول إلى الموقع الجغرافي تلقائياً، يرجى اختيار محافظتك من القائمة العلوية.';
    }
  );
}

// ===== حقول المبالغ: فواصل الآلاف تلقائياً لتجنب صفر زائد أو ناقص =====

/** يقرأ قيمة حقل مبلغ كرقم (يتجاهل الفواصل وأي رمز غير رقمي). */
function readMoney(el) {
  const digits = normalizeDigits(String(el?.value || '')).replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}

function groupThousands(digits) {
  return digits.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** يضع مبلغاً في حقل منسقاً بالفواصل، ويحدّث سطر القراءة تحته. */
// ===== حفظ سعر الصرف الذي يختاره المستخدم =====
// يُحفظ في المتصفح فوراً، وفي الحساب عند تسجيل الدخول ليبقى بعد التحديث وعلى أي جهاز.
const EXCHANGE_RATE_KEY = 'radar_exchange_rate';
const validExchangeRate = (v) => Number.isFinite(v) && v >= 100000 && v <= 300000;
let exchangeRateSaveTimer = null;

function readStoredExchangeRate() {
  try {
    const v = Number(localStorage.getItem(EXCHANGE_RATE_KEY));
    return validExchangeRate(v) ? v : null;
  } catch {
    return null;
  }
}

function saveExchangeRateToAccount(rate) {
  return fetch('/api/account/preferences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ exchangeRate100USD: rate })
  }).catch(() => {});
}

function rememberExchangeRate(rate) {
  try {
    localStorage.setItem(EXCHANGE_RATE_KEY, String(rate));
  } catch {}
  if (!state.user) return;
  clearTimeout(exchangeRateSaveTimer);
  exchangeRateSaveTimer = setTimeout(() => saveExchangeRateToAccount(rate), 700);
}

function applyExchangeRate(rate) {
  if (!validExchangeRate(rate) || rate === state.exchangeRate100USD) return false;
  state.exchangeRate100USD = rate;
  const input = document.getElementById('exchangeRateInput');
  if (input) setMoney(input, rate);
  return true;
}

/** المحفوظ في الحساب هو المرجع؛ وإن لم يوجد بعد يُرفع إليه ما اختاره المستخدم قبل الدخول. */
function syncExchangeRateWithAccount(preferences) {
  if (!state.user) return;
  const saved = Number(preferences?.exchangeRate100USD);
  if (validExchangeRate(saved)) {
    try {
      localStorage.setItem(EXCHANGE_RATE_KEY, String(saved));
    } catch {}
    if (applyExchangeRate(saved) && typeof renderApp === 'function') renderApp();
  } else {
    const local = readStoredExchangeRate();
    if (local) saveExchangeRateToAccount(local);
  }
}

function setMoney(el, value) {
  if (!el) return;
  el.value = value ? groupThousands(String(Math.round(Number(value)))) : '';
  updateMoneyHint(el);
}

/** سطر صغير تحت حقول المبالغ في النماذج يقرأ المبلغ بالكلمات (مليون، دفتر وورقة). */
function updateMoneyHint(el) {
  const block = el.closest('.field-block');
  if (!block) return;
  let hint = block.querySelector('.money-hint');
  if (!hint) {
    hint = document.createElement('span');
    hint.className = 'money-hint';
    hint.style.cssText = 'font-size:0.76rem; color:var(--text-muted); min-height:1em;';
    block.appendChild(hint);
  }
  const n = readMoney(el);
  if (!n) {
    hint.textContent = '';
    return;
  }
  const usd = convertIQDtoUSD(n);
  hint.textContent = `= ${formatIQD(n)}${usd ? ` • ${usd}` : ''}`;
}

/** تنسيق أثناء الكتابة مع إبقاء المؤشر في مكانه الصحيح بالنسبة للأرقام. */
function formatMoneyInput(el) {
  const raw = normalizeDigits(el.value);
  const caret = typeof el.selectionStart === 'number' ? el.selectionStart : raw.length;
  const digitsBeforeCaret = raw.slice(0, caret).replace(/[^\d]/g, '').length;
  const digits = raw.replace(/[^\d]/g, '').slice(0, 15);
  const formatted = digits ? groupThousands(digits) : '';
  if (formatted !== el.value) {
    el.value = formatted;
    let pos = 0;
    let seen = 0;
    while (pos < formatted.length && seen < digitsBeforeCaret) {
      if (/\d/.test(formatted[pos])) seen += 1;
      pos += 1;
    }
    try {
      el.setSelectionRange(pos, pos);
    } catch {}
  }
  updateMoneyHint(el);
}

document.addEventListener('DOMContentLoaded', () => {
  // التحويل الفوري لأي أرقام عربية إلى إنجليزية في جميع الحقول
  document.addEventListener(
    'input',
    (e) => {
      const target = e.target;
      if (!target || (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA')) return;
      if (typeof target.value !== 'string') return;

      if (target.dataset && target.dataset.money === 'true') {
        formatMoneyInput(target);
        return;
      }

      const original = target.value;
      let converted = normalizeDigits(original);

      if (target.dataset && target.dataset.numericOnly === 'true') {
        converted = converted.replace(/[^\d]/g, '');
      }

      if (converted !== original) {
        const start = target.selectionStart;
        const end = target.selectionEnd;
        target.value = converted;
        if (typeof start === 'number' && typeof end === 'number') {
          try {
            target.setSelectionRange(start, end);
          } catch {}
        }
      }
    },
    true
  );

  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchQuery');
  const clearQueryBtn = document.getElementById('clearQueryBtn');
  const govSelect = document.getElementById('governorateSelect');
  const maxBudgetInput = document.getElementById('maxBudgetInput');
  const includeDeliveryCheckbox = document.getElementById('includeDeliveryCheckbox');
  const sameCityCheckbox = document.getElementById('sameCityOnlyCheckbox');
  const exchangeRateInput = document.getElementById('exchangeRateInput');

  const subBtn = document.getElementById('openSubscriptionBtn');
  const subBtnLabel = document.getElementById('subscriptionBtnLabel');
  if (state.isSubscribed) {
    subBtn.classList.add('is-subscribed');
    subBtnLabel.textContent = 'عضوية الرادار المفعلة ✓';
  }

  const quickTagsContainer = document.getElementById('quickTagsContainer');
  const scrollStripRight = document.getElementById('scrollStripRight');
  const scrollStripLeft = document.getElementById('scrollStripLeft');

  // تحريك شريط الاختصارات والأقسام بالأسهم والماوس واللمس
  if (scrollStripRight && quickTagsContainer) {
    scrollStripRight.addEventListener('click', () => {
      quickTagsContainer.scrollBy({ left: 260, behavior: 'smooth' });
    });
  }
  if (scrollStripLeft && quickTagsContainer) {
    scrollStripLeft.addEventListener('click', () => {
      quickTagsContainer.scrollBy({ left: -260, behavior: 'smooth' });
    });
  }

  let isDraggingStrip = false;
  let didDragMove = false;
  let startX = 0;
  let scrollLeftStart = 0;

  if (quickTagsContainer) {
    quickTagsContainer.addEventListener(
      'wheel',
      (e) => {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          e.preventDefault();
          quickTagsContainer.scrollLeft -= e.deltaY;
        }
      },
      { passive: false }
    );

    quickTagsContainer.addEventListener('mousedown', (e) => {
      isDraggingStrip = true;
      didDragMove = false;
      quickTagsContainer.classList.add('is-dragging');
      startX = e.pageX - quickTagsContainer.offsetLeft;
      scrollLeftStart = quickTagsContainer.scrollLeft;
    });

    window.addEventListener('mouseup', () => {
      if (isDraggingStrip) {
        isDraggingStrip = false;
        quickTagsContainer.classList.remove('is-dragging');
      }
    });

    quickTagsContainer.addEventListener('mousemove', (e) => {
      if (!isDraggingStrip) return;
      const x = e.pageX - quickTagsContainer.offsetLeft;
      const walk = (x - startX) * 1.4;
      if (Math.abs(walk) > 6) {
        didDragMove = true;
        e.preventDefault();
        quickTagsContainer.scrollLeft = scrollLeftStart - walk;
      }
    });
  }

  function syncQuickTagsForSection(sectionKey) {
    document.querySelectorAll('.tag-chip').forEach((chip) => {
      const chipSec = chip.getAttribute('data-section') || 'all';
      chip.hidden = sectionKey !== 'all' && chipSec !== sectionKey;
    });
  }

  const allSectorsDropdownBtn = document.getElementById('allSectorsDropdownBtn');
  const sectorsMegaMenu = document.getElementById('sectorsMegaMenu');
  const closeMegaMenuBtn = document.getElementById('closeMegaMenuBtn');
  const megaShowAllOffersBtn = document.getElementById('megaShowAllOffersBtn');

  function closeSectorsMegaMenu() {
    if (sectorsMegaMenu && !sectorsMegaMenu.hidden) {
      sectorsMegaMenu.hidden = true;
      if (allSectorsDropdownBtn) allSectorsDropdownBtn.setAttribute('aria-expanded', 'false');
      syncFixedHeaderHeight();
    }
  }

  function resetAndSwitchToSector(sec) {
    if (activeSearchController) {
      activeSearchController.abort();
    }
    state.isSearchingLive = false;

    document.querySelectorAll('.vertical-tab').forEach((t) => {
      t.classList.toggle('active', t.getAttribute('data-section') === sec);
    });

    state.selectedSection = sec;
    state.query = '';
    searchInput.value = '';
    clearQueryBtn.hidden = true;
    state.liveOffers = [];
    state.indexedOffers = [];
    state.priceGuide = null;
    state.adComparisonPrice = null;

    state.carFilters = { brand: '', origin: '', plate: '' };
    state.propFilters = { deal: '', type: '', deed: '' };
    ['carBrandFilter', 'carOriginFilter', 'carPlateFilter', 'propDealFilter', 'propTypeFilter', 'propDeedFilter'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    document.querySelectorAll('.tag-chip').forEach((c) => c.classList.remove('active-tag'));
    syncQuickTagsForSection(sec);

    const sectionNames = {
      all: 'جميع القطاعات (السلع والأجهزة • معارض السيارات • العقارات والأراضي)',
      products: 'قطاع السلع والأجهزة والمنزل',
      cars: 'قطاع معارض وسوق السيارات في العراق',
      realestate: 'قطاع العقارات والأراضي والاستثمار السكني'
    };
    const banner = document.getElementById('searchStatusBanner');
    banner.hidden = false;
    banner.textContent = `تم عرض: ${sectionNames[sec] || sectionNames.all}`;

    renderApp();
    syncFixedHeaderHeight();
  }

  // تبويبات القطاعات الرئيسية (الضغط على "جميع القطاعات" يفتح/يغلق القائمة المنسدلة الشاملة)
  document.querySelectorAll('.vertical-tab').forEach((vTab) => {
    vTab.addEventListener('click', (e) => {
      e.stopPropagation();
      const sec = vTab.getAttribute('data-section') || 'all';

      if (sec === 'all' && sectorsMegaMenu) {
        const willOpen = sectorsMegaMenu.hidden;
        sectorsMegaMenu.hidden = !willOpen;
        vTab.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        if (state.selectedSection !== 'all' || state.query) {
          resetAndSwitchToSector('all');
        } else {
          syncFixedHeaderHeight();
        }
        return;
      }

      closeSectorsMegaMenu();
      resetAndSwitchToSector(sec);
    });
  });

  if (closeMegaMenuBtn) {
    closeMegaMenuBtn.addEventListener('click', () => {
      closeSectorsMegaMenu();
    });
  }

  if (megaShowAllOffersBtn) {
    megaShowAllOffersBtn.addEventListener('click', () => {
      closeSectorsMegaMenu();
      resetAndSwitchToSector('all');
    });
  }

  document.querySelectorAll('[data-mega-section]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetSec = btn.getAttribute('data-mega-section') || 'all';
      const targetQuery = (btn.getAttribute('data-mega-query') || '').trim();
      closeSectorsMegaMenu();

      if (!targetQuery) {
        resetAndSwitchToSector(targetSec);
        return;
      }

      document.querySelectorAll('.vertical-tab').forEach((t) => {
        t.classList.toggle('active', t.getAttribute('data-section') === targetSec);
      });
      state.selectedSection = targetSec;
      syncQuickTagsForSection(targetSec);

      searchInput.value = targetQuery;
      clearQueryBtn.hidden = false;
      state.query = targetQuery;
      state.adComparisonPrice = null;
      syncFixedHeaderHeight();
      performLiveSearch(targetQuery);
    });
  });

  document.addEventListener('click', (e) => {
    if (
      sectorsMegaMenu &&
      !sectorsMegaMenu.hidden &&
      !sectorsMegaMenu.contains(e.target) &&
      allSectorsDropdownBtn &&
      !allSectorsDropdownBtn.contains(e.target)
    ) {
      closeSectorsMegaMenu();
    }
  });

  // فلاتر السيارات (مع جلب حي تلقائي لأي ماركة من الـ 38 ماركة في العراق)
  // البحث عن سيارة بعينها: الماركة + الطراز + السنة، في قسم السيارات
  document.getElementById('carFinderForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const brand = document.getElementById('carBrandFilter').value;
    const model = document.getElementById('carFinderModelInput').value.trim();
    const yearRaw = normalizeDigits(document.getElementById('carFinderYearInput').value.trim());
    const year = /^(19[5-9]\d|20[0-4]\d)$/.test(yearRaw) ? yearRaw : '';
    const q = [brand, model, year].filter(Boolean).join(' ').trim();
    if (!q) return;
    // الماركة صارت جزءاً من نص البحث، فلا نكررها كفلتر قد يستبعد نتائج بالإنجليزية
    state.carFilters.brand = '';
    document.getElementById('carBrandFilter').value = '';
    state.selectedSection = 'cars';
    state.query = q;
    searchInput.value = q;
    clearQueryBtn.hidden = false;
    performLiveSearch(q);
  });

  ['carBrandFilter', 'carOriginFilter', 'carPlateFilter'].forEach((id) => {
    document.getElementById(id).addEventListener('change', () => {
      state.carFilters.brand = document.getElementById('carBrandFilter').value;
      state.carFilters.origin = document.getElementById('carOriginFilter').value;
      state.carFilters.plate = document.getElementById('carPlateFilter').value;

      if (id === 'carBrandFilter' && state.carFilters.brand) {
        const localCount = state.offers.filter(
          (o) => o.section === 'cars' && `${o.title} ${o.snippet} ${JSON.stringify(o.specs || {})}`.includes(state.carFilters.brand)
        ).length;
        if (localCount < 2) {
          performLiveSearch(`سيارة ${state.carFilters.brand}`);
          return;
        }
      }
      renderApp();
    });
  });

  // فلاتر العقارات
  ['propDealFilter', 'propTypeFilter', 'propDeedFilter'].forEach((id) => {
    document.getElementById(id).addEventListener('change', () => {
      state.propFilters.deal = document.getElementById('propDealFilter').value;
      state.propFilters.type = document.getElementById('propTypeFilter').value;
      state.propFilters.deed = document.getElementById('propDeedFilter').value;
      renderApp();
    });
  });

  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    state.query = searchInput.value.trim();
    state.adComparisonPrice = null;
    state.selectedGov = govSelect.value;
    state.maxBudget = readMoney(maxBudgetInput) || null;

    // تسجيل البحث يتم في الخادم مع كل عملية بحث (بما فيها أزرار الأقسام) لقائمة الأكثر طلباً

    performLiveSearch(state.query);
  });

  let debounceTimer = null;
  searchInput.addEventListener('input', () => {
    clearQueryBtn.hidden = !searchInput.value;
    state.query = searchInput.value.trim();
    state.adComparisonPrice = null;
    state.liveOffers = [];
    state.indexedOffers = [];
    state.priceGuide = null;
    document.querySelectorAll('.tag-chip').forEach((c) => c.classList.remove('active-tag'));
    renderApp();

    clearTimeout(debounceTimer);
    if (state.query.length >= 3) {
      debounceTimer = setTimeout(() => {
        performLiveSearch(state.query);
      }, 650);
    }
  });

  clearQueryBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearQueryBtn.hidden = true;
    state.query = '';
    state.adComparisonPrice = null;
    state.liveOffers = [];
    state.indexedOffers = [];
    state.priceGuide = null;
    document.querySelectorAll('.tag-chip').forEach((c) => c.classList.remove('active-tag'));
    document.getElementById('searchStatusBanner').hidden = true;
    renderApp();
  });

  govSelect.addEventListener('change', () => {
    state.selectedGov = govSelect.value;
    if (state.query.length >= 3) {
      performLiveSearch(state.query);
    } else {
      renderApp();
    }
  });

  maxBudgetInput.addEventListener('input', () => {
    state.maxBudget = readMoney(maxBudgetInput) || null;
    renderApp();
  });

  includeDeliveryCheckbox.addEventListener('change', () => {
    state.includeDelivery = includeDeliveryCheckbox.checked;
    renderApp();
  });

  sameCityCheckbox.addEventListener('change', () => {
    state.sameCityOnly = sameCityCheckbox.checked;
    renderApp();
  });

  exchangeRateInput.addEventListener('input', () => {
    const val = readMoney(exchangeRateInput);
    if (val >= 100000 && val <= 300000) {
      state.exchangeRate100USD = val;
      rememberExchangeRate(val);
      renderApp();
    }
  });

  document.querySelectorAll('.tag-chip').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      if (didDragMove) {
        e.preventDefault();
        return;
      }
      const q = btn.getAttribute('data-query');
      const targetSec = btn.getAttribute('data-section') || 'all';
      document.querySelectorAll('.vertical-tab').forEach((t) => {
        t.classList.toggle('active', t.getAttribute('data-section') === targetSec);
      });
      document.querySelectorAll('.tag-chip').forEach((c) => c.classList.remove('active-tag'));
      btn.classList.add('active-tag');
      state.selectedSection = targetSec;
      searchInput.value = q;
      clearQueryBtn.hidden = false;
      state.query = q;
      state.adComparisonPrice = null;
      syncFixedHeaderHeight();
      performLiveSearch(q);
    });
  });

  document.querySelectorAll('.platform-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.platform-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      state.selectedPlatform = tab.getAttribute('data-platform');
      renderApp();
    });
  });

  document.querySelectorAll('.sort-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.sort-pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      state.sortBy = pill.getAttribute('data-sort');
      renderApp();
    });
  });

  let spotlightTimer = null;
  function scrollAndSpotlightOffer(sortType, targetKey) {
    state.selectedPlatform = 'all';
    document.querySelectorAll('.platform-tab').forEach((t) => {
      t.classList.toggle('active', t.getAttribute('data-platform') === 'all');
    });

    document.querySelectorAll('.sort-pill').forEach((p) => {
      p.classList.toggle('active', p.getAttribute('data-sort') === sortType);
    });
    state.sortBy = sortType;
    renderApp();

    const targetId = state.topCardTargets?.[targetKey];
    const targetCard =
      (targetId && document.querySelector(`[data-offer-id="${CSS.escape(String(targetId))}"]`)) ||
      document.querySelector('#resultsGrid .product-card');

    if (!targetCard) return;

    document.querySelectorAll('.product-card.is-spotlight-target').forEach((el) => {
      el.classList.remove('is-spotlight-target');
    });

    targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // إعادة تشغيل حركة الوميض والتأشير البصري
    void targetCard.offsetWidth;
    targetCard.classList.add('is-spotlight-target');

    clearTimeout(spotlightTimer);
    spotlightTimer = setTimeout(() => {
      targetCard.classList.remove('is-spotlight-target');
    }, 4500);
  }

  document.getElementById('jumpToCheapestBtn').addEventListener('click', (e) => {
    e.preventDefault();
    scrollAndSpotlightOffer('cheapest', 'cheapest');
  });
  document.getElementById('jumpToNearestBtn').addEventListener('click', (e) => {
    e.preventDefault();
    scrollAndSpotlightOffer('nearest', 'nearest');
  });
  document.getElementById('jumpToSmartBtn').addEventListener('click', (e) => {
    e.preventDefault();
    scrollAndSpotlightOffer('smart', 'smart');
  });

  const siteHeader = document.querySelector('.site-header');
  function syncFixedHeaderHeight() {
    if (siteHeader) {
      document.documentElement.style.setProperty('--header-height', `${siteHeader.offsetHeight}px`);
    }
  }
  syncFixedHeaderHeight();
  window.addEventListener('resize', syncFixedHeaderHeight);

  document.getElementById('detectLocationBtn').addEventListener('click', detectUserGovernorateByGPS);

  // نافذة إضافة عرض (سلعة / سيارة / عقار)
  const analyzerModal = document.getElementById('analyzerModal');
  const postSectionSelect = document.getElementById('postSectionSelect');
  const modalCarFields = document.getElementById('modalCarFields');
  const modalRealestateFields = document.getElementById('modalRealestateFields');
  const modalDeliveryFields = document.getElementById('modalDeliveryFields');

  function syncModalSectionFields() {
    const sec = postSectionSelect.value;
    modalCarFields.hidden = sec !== 'cars';
    modalRealestateFields.hidden = sec !== 'realestate';
    modalDeliveryFields.hidden = sec !== 'products';
  }
  postSectionSelect.addEventListener('change', syncModalSectionFields);

  document.getElementById('openAnalyzerBtn').addEventListener('click', () => {
    if (state.selectedSection !== 'all') {
      postSectionSelect.value = state.selectedSection;
      syncModalSectionFields();
    }
    analyzerModal.showModal();
  });
  document.getElementById('closeAnalyzerBtn').addEventListener('click', () => analyzerModal.close());

  const postRawText = document.getElementById('postRawText');
  function updateAnalyzerPreview() {
    const parsed = parseIraqiPostText(postRawText.value);
    document.getElementById('previewPriceChip').textContent = `السعر: ${formatIQD(parsed.priceIQD)}`;
    document.getElementById('previewGovChip').textContent = `المحافظة: ${IRAQ_GOVERNORATES[parsed.governorate].name} (${parsed.district})`;
    document.getElementById('previewPhoneChip').textContent = `الهاتف: ${parsed.phone}`;
  }
  postRawText.addEventListener('input', updateAnalyzerPreview);

  document.getElementById('fillSamplePostBtn').addEventListener('click', () => {
    postSectionSelect.value = 'cars';
    syncModalSectionFields();
    document.getElementById('postPlatformSelect').value = 'facebook';
    document.getElementById('postStoreName').value = 'معرض النهضة للسيارات الحديثة';
    document.getElementById('carYearInput').value = '2024';
    document.getElementById('carMileageInput').value = 'زيرو (0 كم)';
    document.getElementById('carPlateInput').value = 'رقم بغداد • خليجي';
    postRawText.value =
      'هيونداي النترا 2024 خليجي زيرو بصمة وفتحة سقف رقم بغداد جاهز السعر دفترين و5 أوراق فقط، العنوان بغداد معارض النهضة للاستفسار 07701239876';
    updateAnalyzerPreview();
  });

  document.getElementById('analyzerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formStatus = document.getElementById('analyzerFormStatus');
    const submitBtn = document.getElementById('analyzerSubmitBtn');
    const showStatus = (text) => {
      formStatus.hidden = false;
      formStatus.textContent = text;
    };
    if (!state.user) {
      showStatus('إضافة العروض تتطلب تسجيل الدخول بحساب غوغل لمنع الإعلانات الوهمية والمتكررة.');
      openLoginModal(() => {
        if (!analyzerModal.open) analyzerModal.showModal();
      });
      return;
    }
    const section = postSectionSelect.value;
    const platform = document.getElementById('postPlatformSelect').value;
    const storeName = document.getElementById('postStoreName').value.trim();
    const rawText = postRawText.value.trim();
    const deliveryLocalIQD = section === 'products' ? readMoney(document.getElementById('postDeliveryLocal')) || 4000 : 0;
    const deliveryNationalIQD = section === 'products' ? readMoney(document.getElementById('postDeliveryNational')) || 7000 : 0;
    const allowsInspection = document.getElementById('postAllowsInspection').checked;
    const parsed = parseIraqiPostText(rawText);

    let specs = {};
    if (section === 'cars') {
      specs = {
        year: document.getElementById('carYearInput').value || '2024',
        mileage: document.getElementById('carMileageInput').value || 'زيرو',
        plate: document.getElementById('carPlateInput').value || 'رقم بغداد'
      };
    } else if (section === 'realestate') {
      specs = {
        areaSqm: Number(document.getElementById('propAreaInput').value || 200),
        deedType: document.getElementById('propDeedInput').value,
        dealType: document.getElementById('propDealInput').value
      };
    }

    const newOffer = {
      id: `custom-${Date.now()}`,
      source: 'user',
      section,
      specs,
      title: rawText.slice(0, 68) + (rawText.length > 68 ? '...' : ''),
      category: section === 'cars' ? 'سيارات' : section === 'realestate' ? 'عقارات' : 'سلع وأجهزة',
      keywords: rawText.split(/\s+/),
      platform,
      storeName,
      // لا توثيق ولا تقييم مفترض للعروض المضافة من المستخدمين
      verified: false,
      allowsInspection,
      trustRating: null,
      reviewsCount: 0,
      priceIQD: parsed.priceIQD,
      priceBasis: parsed.priceBasis,
      amountUSD: parsed.amountUSD,
      priceIsRent: parsed.isRent,
      deliveryLocalIQD,
      deliveryNationalIQD,
      governorate: parsed.governorate,
      district: parsed.district,
      delivery: section === 'products' ? `توصيل داخل المحافظة ${formatIQD(deliveryLocalIQD)}` : '',
      phone: safeIraqiMobile(parsed.phone) || '',
      snippet: rawText,
      vin: section === 'cars' ? document.getElementById('postVinInput').value.trim() : '',
      postedAt: new Date().toISOString(),
      postedAgo: null
    };

    // لا يظهر العرض ولا رسالة النجاح إلا بعد أن يؤكد الخادم الحفظ
    submitBtn.disabled = true;
    showStatus('جاري الحفظ...');
    const { ok, status: code, data } = await postJson('/api/offers', newOffer);
    submitBtn.disabled = false;
    if (!ok) {
      showStatus(saveErrorMessage(code, data));
      return;
    }
    formStatus.hidden = true;
    state.offers.unshift({
      ...newOffer,
      id: data.offer?.id || newOffer.id,
      postedAt: data.offer?.postedAt || newOffer.postedAt,
      vin: data.offer?.vin || null,
      vinCheck: data.offer?.vinCheck || null
    });
    state.selectedSection = section;
    document.querySelectorAll('.vertical-tab').forEach((t) => {
      t.classList.toggle('active', t.getAttribute('data-section') === section);
    });
    state.query = '';
    searchInput.value = '';
    analyzerModal.close();
    renderApp();
    const banner = document.getElementById('searchStatusBanner');
    banner.hidden = false;
    banner.textContent = 'تم حفظ عرضك. يظهر لجميع الزوار على أنه عرض غير موثق.';
  });

  // نافذة رادار التنبيهات (تتطلب تسجيل الدخول بغوغل)
  const radarModal = document.getElementById('radarModal');
  const radarGovSelect = document.getElementById('radarGovSelect');
  radarGovSelect.innerHTML = Object.entries(IRAQ_GOVERNORATES)
    .map(([key, g]) => `<option value="${esc(key)}">${esc(g.name)}</option>`)
    .join('');
  const radarSubmitBtn = document.getElementById('radarSubmitBtn');
  const cancelAlertEditBtn = document.getElementById('cancelAlertEditBtn');
  let editingAlertId = null;

  const radarModeSelect = document.getElementById('radarModeSelect');
  const radarPctSelect = document.getElementById('radarPctSelect');
  const syncRadarMode = () => {
    const deal = radarModeSelect.value === 'deal';
    document.getElementById('radarPctBlock').hidden = !deal;
    document.getElementById('radarTargetBlock').hidden = deal;
  };
  radarModeSelect.addEventListener('change', syncRadarMode);
  syncRadarMode();

  function setAlertEditMode(alert) {
    editingAlertId = alert ? Number(alert.id) : null;
    radarSubmitBtn.textContent = alert ? 'حفظ التعديل' : 'تفعيل رادار المراقبة الآن';
    cancelAlertEditBtn.hidden = !alert;
    if (alert) {
      document.getElementById('radarKeywordInput').value = alert.keyword;
      setMoney(document.getElementById('radarTargetPriceInput'), alert.targetPriceIQD);
      radarModeSelect.value = alert.belowMarketPct ? 'deal' : 'price';
      if (alert.belowMarketPct) radarPctSelect.value = String(alert.belowMarketPct);
      syncRadarMode();
      document.getElementById('radarSectionSelect').value = alert.section || 'all';
      radarGovSelect.value = IRAQ_GOVERNORATES[alert.governorate] ? alert.governorate : state.selectedGov;
      document.getElementById('radarKeywordInput').focus();
    } else {
      document.getElementById('radarKeywordInput').value = '';
      setMoney(document.getElementById('radarTargetPriceInput'), 0);
      radarGovSelect.value = state.selectedGov;
    }
  }
  cancelAlertEditBtn.addEventListener('click', () => setAlertEditMode(null));

  function openRadarModal() {
    if (state.query) document.getElementById('radarKeywordInput').value = state.query;
    const sec = document.getElementById('radarSectionSelect');
    if (sec && state.selectedSection) sec.value = state.selectedSection;
    if (!editingAlertId) radarGovSelect.value = state.selectedGov;
    if (!state.user) {
      openLoginModal(() => openRadarModal());
      return;
    }
    radarModal.showModal();
    loadPriceAlerts();
    loadNotifications();
    refreshPushStatus();
  }
  document.getElementById('openRadarBtn').addEventListener('click', openRadarModal);
  document.getElementById('createAlertFromMeterBtn').addEventListener('click', openRadarModal);
  document.getElementById('closeRadarBtn').addEventListener('click', () => radarModal.close());
  // الإشعارات تُعدّ مقروءة بعد أن يراها المستخدم في النافذة ويغلقها، لا لحظة فتحها
  radarModal.addEventListener('close', markNotificationsRead);
  document.getElementById('enablePushBtn').addEventListener('click', togglePush);
  document.getElementById('activeAlertsList').addEventListener('click', (e) => {
    const del = e.target.closest('[data-delete-alert]');
    if (del) {
      if (Number(del.dataset.deleteAlert) === editingAlertId) setAlertEditMode(null);
      deleteAlert(del.dataset.deleteAlert);
      return;
    }
    const edit = e.target.closest('[data-edit-alert]');
    if (edit) {
      const alert = state.alerts.find((a) => Number(a.id) === Number(edit.dataset.editAlert));
      if (alert) setAlertEditMode(alert);
    }
  });

  document.getElementById('radarForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const keyword = document.getElementById('radarKeywordInput').value.trim();
    const deal = radarModeSelect.value === 'deal';
    const targetPriceIQD = deal ? 0 : readMoney(document.getElementById('radarTargetPriceInput'));
    const belowMarketPct = deal ? Number(radarPctSelect.value) : null;
    const section = document.getElementById('radarSectionSelect').value;
    if (!deal && !(targetPriceIQD > 0)) {
      document.getElementById('activeAlertsList').innerHTML = '<div class="alert-row">اكتب السعر المستهدف، أو اختر صياد الصفقات ليحسب سعر السوق تلقائياً.</div>';
      return;
    }
    const governorate = radarGovSelect.value || state.selectedGov;
    const listBox = document.getElementById('activeAlertsList');

    let result = { ok: false, data: {} };
    try {
      const res = await fetch(editingAlertId ? `/api/alerts/${editingAlertId}` : '/api/alerts', {
        method: editingAlertId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, targetPriceIQD, belowMarketPct, governorate, section })
      });
      result = { ok: res.ok, data: await res.json().catch(() => ({})) };
    } catch {}

    if (!result.ok || !result.data.saved) {
      const err = result.data.error;
      listBox.innerHTML =
        err === 'alert_limit_reached'
          ? `<div class="alert-row">وصلت إلى الحد الأقصى للتنبيهات النشطة (${Number(result.data.limit) || ''}). احذف تنبيهاً قديماً لإضافة جديد.</div>`
          : err === 'login_required'
            ? '<div class="alert-row">سجّل الدخول أولاً لحفظ التنبيه.</div>'
            : err === 'alerts_delivery_disabled'
              ? '<div class="alert-row">خدمة التنبيهات غير مفعلة حالياً، لذلك لم يُحفظ التنبيه.</div>'
              : '<div class="alert-row">تعذر حفظ التنبيه. تأكد من اسم السلعة والسعر المستهدف.</div>';
      return;
    }

    setAlertEditMode(null);
    await loadPriceAlerts();
    await loadNotifications();
  });

  // نافذة البحث بصورة الإعلان
  const imageSearchModal = document.getElementById('imageSearchModal');
  const adScreenshotInput = document.getElementById('adScreenshotInput');
  const screenshotPreviewImg = document.getElementById('screenshotPreviewImg');
  const imageExtractedQuery = document.getElementById('imageExtractedQuery');

  const adSectionSelect = document.getElementById('adSectionSelect');
  const adPastedText = document.getElementById('adPastedText');
  const adSeenPriceInput = document.getElementById('adSeenPriceInput');
  const adVerdictBox = document.getElementById('adVerdictBox');
  const adCompareLiveBtn = document.getElementById('adCompareLiveBtn');
  const adAreaBlock = document.getElementById('adAreaBlock');
  const adAreaInput = document.getElementById('adAreaInput');
  const adVinBlock = document.getElementById('adVinBlock');
  const adVinInput = document.getElementById('adVinInput');
  const syncAdArea = () => {
    adAreaBlock.hidden = adSectionSelect.value !== 'realestate';
    adVinBlock.hidden = adSectionSelect.value !== 'cars';
  };
  adSectionSelect.addEventListener('change', syncAdArea);
  document.getElementById('openImageSearchBtn').addEventListener('click', () => {
    if (state.selectedSection !== 'all') adSectionSelect.value = state.selectedSection;
    syncAdArea();
    imageSearchModal.showModal();
  });

  // نص الإعلان الملصوق: يُقرأ منه السعر إن لم يُكتب، ويُقترح نوع الإعلان
  adPastedText.addEventListener('input', () => {
    const text = normalizeDigits(adPastedText.value);
    if (!readMoney(adSeenPriceInput)) {
      const found = PriceEngine.extractIraqiPrice(text, { usdRate: state.exchangeRate100USD / 100 });
      if (found && found.priceIQD && !found.isRent) setMoney(adSeenPriceInput, found.priceIQD);
    }
    const sec = PriceEngine.classifySection(text).section;
    if (['cars', 'realestate', 'products'].includes(sec)) adSectionSelect.value = sec;
    const area = PriceEngine.extractRealEstateSpecs(text).areaSqm;
    if (area && !adAreaInput.value) adAreaInput.value = String(area);
    syncAdArea();
  });
  document.getElementById('closeImageSearchBtn').addEventListener('click', () => imageSearchModal.close());

  adScreenshotInput.addEventListener('change', () => {
    const file = adScreenshotInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      screenshotPreviewImg.src = reader.result;
      screenshotPreviewImg.hidden = false;
    };
    reader.readAsDataURL(file);
    // الصورة للمعاينة فقط: لا تحليل ولا استخراج، والبحث يعتمد على الاسم الذي يكتبه المستخدم
    imageExtractedQuery.focus();
  });

  // فحص سعر الإعلان: مقارنة فورية بذاكرة الأسعار (مجاناً)، ثم بحث حي اختياري للمقارنة بالعروض الحالية
  document.getElementById('imageSearchForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = imageExtractedQuery.value.trim();
    if (!q) return;
    const price = readMoney(adSeenPriceInput);
    const section = adSectionSelect.value;
    adVerdictBox.hidden = false;
    adVerdictBox.className = 'ad-verdict';
    adVerdictBox.textContent = 'جاري المقارنة بأسعار مماثلة...';
    let guide = null;
    try {
      const res = await fetch(`/api/price-guide?q=${encodeURIComponent(q)}&section=${encodeURIComponent(section)}&gov=${encodeURIComponent(state.selectedGov)}`);
      if (res.ok) guide = await res.json();
    } catch {}
    // العقار يُقارن بسعر المتر إن عُرفت المساحة؛ فالسعر الكلي وحده يختلف كثيراً بالمساحة والمنطقة
    const area = Number(normalizeDigits(adAreaInput.value)) || 0;
    const perSqmGuide =
      section === 'realestate' && area > 0 && guide?.perSqmMedian
        ? { enough: true, count: guide.perSqmCount, median: guide.perSqmMedian, q1: guide.perSqmQ1, q3: guide.perSqmQ3 }
        : null;
    const judgement = perSqmGuide ? PriceEngine.judgeAdPrice(price / area, perSqmGuide) : PriceEngine.judgeAdPrice(price, guide);
    if (perSqmGuide && judgement.diffIQD) judgement.diffIQD = Math.round(judgement.diffIQD * area);

    // فحص الشاصي (مجاني): المواصفات الحقيقية ومقارنتها بما يقوله الإعلان
    let vinResult = null;
    const vinRaw = section === 'cars' ? adVinInput.value.trim() : '';
    if (vinRaw) {
      try {
        const adText = `${q} ${adPastedText.value}`.slice(0, 1800);
        const res = await fetch(`/api/vin/${encodeURIComponent(normalizeVinClient(vinRaw))}?text=${encodeURIComponent(adText)}`);
        vinResult = await res.json();
        if (!res.ok) vinResult = { error: true, message: vinResult.message || 'تعذر فحص الشاصي.' };
      } catch {
        vinResult = { error: true, message: 'تعذر الاتصال بخدمة فحص الشاصي.' };
      }
    }

    state.lastCheck = { query: q, section, price, area: perSqmGuide ? area : 0, judgement, guide, vin: vinResult };
    adVerdictBox.className = `ad-verdict verdict-${vinResult?.comparison?.mismatches ? 'overpriced' : judgement.verdict}`;
    adVerdictBox.innerHTML =
      renderVinSection(vinResult) +
      renderAdVerdict(judgement, guide, section, price, perSqmGuide ? area : 0) +
      (price > 0
        ? `<div class="ad-share"><button type="button" class="btn-secondary" data-action="make-report">أنشئ رابط تقرير لمشاركته في واتساب</button><div class="ad-share-result" hidden></div></div>`
        : '');
    adCompareLiveBtn.hidden = false;
  });

  // تقرير قابل للمشاركة: الخادم يعيد حساب كل شيء بنفسه ثم يعطي رابطاً ثابتاً
  adVerdictBox.addEventListener('click', async (e) => {
    const buy = e.target.closest('[data-action="buy-vin-report"]');
    if (buy) {
      const status = adVerdictBox.querySelector('.vin-buy-status');
      status.hidden = false;
      if (!state.user) {
        status.textContent = 'سجّل الدخول بحساب غوغل أولاً ليُحفظ التقرير في حسابك.';
        openLoginModal();
        return;
      }
      buy.disabled = true;
      status.textContent = 'جاري التحضير...';
      try {
        const res = await fetch('/api/vin-history/purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vin: buy.dataset.vin })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'تعذر إتمام الطلب. لم يُخصم أي مبلغ.');
        if (data.formUrl) {
          status.textContent = 'جاري تحويلك إلى صفحة الدفع الآمنة لدى كي كارد...';
          window.location.href = data.formUrl;
          return;
        }
        if (data.reportUrl) {
          status.innerHTML = `تم استخدام رصيدك. <a href="${esc(data.reportUrl)}" target="_blank" rel="noopener">افتح التقرير</a>`;
        } else if (data.status === 'no_data') {
          status.textContent = 'لا توجد بيانات لهذا الشاصي في السجل الأمريكي، وبقي رصيدك لشاصي آخر.';
        }
      } catch (err) {
        status.textContent = err.message;
        buy.disabled = false;
      }
      return;
    }
    const btn = e.target.closest('[data-action="make-report"]');
    if (btn) {
      const out = adVerdictBox.querySelector('.ad-share-result');
      btn.disabled = true;
      out.hidden = false;
      out.textContent = 'جاري إنشاء التقرير...';
      const c = state.lastCheck || {};
      try {
        const res = await fetch('/api/check-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: c.query, section: c.section, price: c.price, area: c.area, vin: adVinInput.value.trim(), adText: adPastedText.value, gov: state.selectedGov })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'تعذر إنشاء التقرير.');
        const wa = `https://wa.me/?text=${encodeURIComponent(`تقرير فحص قبل الدفع: ${c.query}\n${data.url}`)}`;
        out.innerHTML = `
          <input type="text" readonly dir="ltr" value="${esc(data.url)}" class="ad-share-url" />
          <div class="ad-share-actions">
            <a class="btn-open-offer" href="${esc(wa)}" target="_blank" rel="noopener noreferrer">مشاركة في واتساب</a>
            <button type="button" class="btn-secondary" data-action="copy-report">نسخ الرابط</button>
            <a href="${esc(data.url)}" target="_blank" rel="noopener noreferrer">فتح التقرير</a>
          </div>`;
      } catch (err) {
        out.textContent = err.message || 'تعذر إنشاء التقرير.';
        btn.disabled = false;
      }
      return;
    }
    if (e.target.closest('[data-action="copy-report"]')) {
      const input = adVerdictBox.querySelector('.ad-share-url');
      try {
        await navigator.clipboard.writeText(input.value);
        e.target.textContent = 'تم النسخ ✓';
      } catch {
        input.select();
      }
    }
  });

  adCompareLiveBtn.addEventListener('click', () => {
    const q = imageExtractedQuery.value.trim();
    if (!q) return;
    const price = readMoney(adSeenPriceInput);
    state.query = q;
    state.adComparisonPrice = price > 0 ? price : null;
    state.selectedSection = adSectionSelect.value;
    document.querySelectorAll('.vertical-tab').forEach((t) => t.classList.toggle('active', t.getAttribute('data-section') === state.selectedSection));
    searchInput.value = q;
    clearQueryBtn.hidden = false;
    imageSearchModal.close();
    const banner = document.getElementById('searchStatusBanner');
    banner.hidden = false;
    banner.textContent = `جاري البحث عن "${q}" لمقارنة سعر الإعلان بالعروض الحالية...`;
    performLiveSearch(q);
  });

  // نافذة التقييمات
  const reviewModal = document.getElementById('reviewModal');
  document.getElementById('closeReviewBtn').addEventListener('click', () => reviewModal.close());
  document.getElementById('reviewForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const storeName = document.getElementById('reviewStoreNameInput').value;
    const rating = Number(document.getElementById('reviewRatingSelect').value);
    const allowsInspection = document.getElementById('reviewInspectionSelect').value === 'true';
    const comment = document.getElementById('reviewCommentInput').value.trim();
    const status = document.getElementById('reviewFormStatus');
    const submitBtn = document.getElementById('reviewSubmitBtn');
    const showStatus = (text) => {
      status.hidden = false;
      status.textContent = text;
    };

    if (!state.user) {
      reviewDraft = { storeName, rating, allowsInspection, comment };
      showStatus('التقييم يتطلب تسجيل الدخول بحساب غوغل حتى لا تتكرر التقييمات الوهمية. سيبقى ما كتبته كما هو.');
      openLoginModal(() => window.openStoreReviewModal(storeName));
      return;
    }

    submitBtn.disabled = true;
    showStatus('جاري الحفظ...');
    const { ok, status: code, data } = await postJson('/api/reviews', {
      storeName,
      rating,
      allowsInspection,
      comment,
      reviewerGov: state.selectedGov
    });
    submitBtn.disabled = false;
    if (!ok) {
      showStatus(saveErrorMessage(code, data));
      return;
    }
    reviewDraft = null;
    showStatus(data.updated ? 'تم تحديث تقييمك السابق لهذه الجهة.' : 'تم حفظ تقييمك.');
    await loadStoreReviews(storeName);
  });

  // ===== الحساب (تسجيل الدخول بغوغل) والاشتراك المدفوع عبر كي كارد =====
  // العضوية مرتبطة بحساب غوغل، ولا تُفعَّل إلا بعد تأكيد الخادم لنجاح الدفع من بوابة كي كارد نفسها.
  const subscriptionModal = document.getElementById('subscriptionModal');
  const subscriptionStatusBox = document.getElementById('subscriptionStatusBox');
  const loginModal = document.getElementById('loginModal');
  const openLoginBtn = document.getElementById('openLoginBtn');
  const loginBtnLabel = document.getElementById('loginBtnLabel');
  const loginStatusBox = document.getElementById('loginStatusBox');
  const accountBox = document.getElementById('accountBox');
  const accountSummary = document.getElementById('accountSummary');
  const googleButtonHost = document.getElementById('googleSignInButton');
  let pendingAfterLogin = null;

  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return '';
    }
  };

  function applyAccount(data) {
    state.user = data?.user || null;
    syncExchangeRateWithAccount(data?.preferences);
    state.subscription = data?.subscription || { active: false };
    state.isSubscribed = Boolean(state.subscription.active);

    if (state.user) {
      const first = String(state.user.name || state.user.email || '').split(' ')[0];
      loginBtnLabel.textContent = first ? `مرحباً، ${first}` : 'حسابي';
      accountBox.hidden = false;
      googleButtonHost.hidden = true;
      accountSummary.textContent = state.isSubscribed
        ? `مسجّل الدخول باسم ${state.user.email || state.user.name}. العضوية فعالة حتى ${formatDate(state.subscription.expiresAt)}.`
        : `مسجّل الدخول باسم ${state.user.email || state.user.name}. لا توجد عضوية فعالة حالياً.`;
    } else {
      loginBtnLabel.textContent = 'تسجيل الدخول';
      accountBox.hidden = true;
      googleButtonHost.hidden = false;
    }

    if (state.isSubscribed) {
      subBtn.classList.add('is-subscribed');
      subBtnLabel.textContent = `عضوية فعالة (${state.subscription.daysRemaining ?? ''} يوم) ✓`;
      if (subscriptionStatusBox) {
        subscriptionStatusBox.hidden = false;
        subscriptionStatusBox.textContent = `✔ عضويتك فعالة حتى ${formatDate(state.subscription.expiresAt)}. التجديد الآن يُضاف إلى المدة المتبقية.`;
      }
    } else {
      subBtn.classList.remove('is-subscribed');
      subBtnLabel.textContent = `اشتراك الرادار (${Number(state.config.subscriptionPriceIQD || 1000).toLocaleString('en-US')} د.ع)`;
      if (subscriptionStatusBox) subscriptionStatusBox.hidden = true;
    }
  }

  async function refreshAccount() {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (res.ok) applyAccount(await res.json());
    } catch {}
  }

  let googleScriptPromise = null;
  function loadGoogleIdentity() {
    if (window.google?.accounts?.id) return Promise.resolve();
    if (!googleScriptPromise) {
      googleScriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error('google script failed'));
        document.head.appendChild(script);
      });
    }
    return googleScriptPromise;
  }

  async function handleGoogleCredential(response) {
    loginStatusBox.hidden = false;
    loginStatusBox.textContent = 'جاري التحقق من حسابك...';
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });
      if (!res.ok) throw new Error('login failed');
      applyAccount(await res.json());
      loginStatusBox.hidden = true;
      loginModal.close();
      const next = pendingAfterLogin;
      pendingAfterLogin = null;
      if (next) next();
      else maybeAskForPush();
    } catch {
      loginStatusBox.textContent = 'تعذر تسجيل الدخول. حاول مرة أخرى.';
    }
  }

  async function openLoginModal(afterLogin = null) {
    pendingAfterLogin = afterLogin;
    loginModal.showModal();
    if (state.user || !state.config.googleClientId) return;
    try {
      await loadGoogleIdentity();
      window.google.accounts.id.initialize({
        client_id: state.config.googleClientId,
        callback: handleGoogleCredential,
        ux_mode: 'popup',
        context: 'signin'
      });
      googleButtonHost.innerHTML = '';
      window.google.accounts.id.renderButton(googleButtonHost, { theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill', locale: 'ar' });
    } catch {
      loginStatusBox.hidden = false;
      loginStatusBox.textContent = 'تعذر تحميل زر غوغل. تحقق من اتصالك ثم أعد المحاولة.';
    }
  }

  // ===== سؤال تفعيل الإشعارات بعد تسجيل الدخول (مرة واحدة، ويمكن تأجيله) =====
  const pushPromptModal = document.getElementById('pushPromptModal');
  function pushPromptDismissedRecently() {
    try {
      const t = Number(localStorage.getItem('radar_push_prompt_later') || 0);
      return Date.now() - t < 14 * 86400000; // "لاحقاً" تؤجل السؤال أسبوعين
    } catch {
      return false;
    }
  }
  async function maybeAskForPush() {
    if (!state.user || !state.config.alertsDeliveryEnabled || !pushSupported()) return;
    if (Notification.permission !== 'default' || pushPromptDismissedRecently()) return;
    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (reg && (await reg.pushManager.getSubscription())) return;
    } catch {}
    if (!pushPromptModal.open && !document.querySelector('dialog[open]')) pushPromptModal.showModal();
  }
  document.getElementById('pushPromptYesBtn').addEventListener('click', async () => {
    pushPromptModal.close();
    document.getElementById('enablePushBtn').dataset.mode = 'on';
    await togglePush();
    const banner = document.getElementById('searchStatusBanner');
    banner.hidden = false;
    banner.textContent = Notification.permission === 'granted'
      ? '✔ تم تفعيل الإشعارات الفورية. أضف تنبيه سعر من زر "رادار التنبيهات" لتصلك العروض فوراً.'
      : 'لم تُفعَّل الإشعارات الفورية. يمكنك تفعيلها لاحقاً من نافذة رادار التنبيهات.';
  });
  const postponePushPrompt = () => {
    try {
      localStorage.setItem('radar_push_prompt_later', String(Date.now()));
    } catch {}
    pushPromptModal.close();
  };
  document.getElementById('pushPromptLaterBtn').addEventListener('click', postponePushPrompt);
  document.getElementById('closePushPromptBtn').addEventListener('click', postponePushPrompt);

  openLoginBtn.addEventListener('click', () => openLoginModal());
  document.getElementById('closeLoginBtn').addEventListener('click', () => loginModal.close());
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.google?.accounts?.id?.disableAutoSelect?.();
    applyAccount({ user: null, subscription: { active: false } });
    loginModal.close();
  });

  subBtn.addEventListener('click', () => {
    if (!state.user) {
      openLoginModal(() => subscriptionModal.showModal());
      return;
    }
    subscriptionModal.showModal();
  });
  document.getElementById('closeSubscriptionBtn').addEventListener('click', () => subscriptionModal.close());

  document.getElementById('subscriptionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const banner = document.getElementById('searchStatusBanner');
    if (!state.config.paymentsEnabled) {
      subscriptionModal.close();
      banner.hidden = false;
      banner.textContent = 'الاشتراك المدفوع غير متاح حالياً.';
      return;
    }
    if (!state.user) {
      subscriptionModal.close();
      openLoginModal(() => subscriptionModal.showModal());
      return;
    }
    subscriptionStatusBox.hidden = false;
    subscriptionStatusBox.textContent = 'جاري تحويلك إلى صفحة الدفع الآمنة لدى كي كارد...';
    try {
      const res = await fetch('/api/payments/qicard/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json().catch(() => ({}));
      const target = safeHttpUrl(data.formUrl);
      if (!res.ok || !target) throw new Error('create failed');
      // صفحة الدفع مستضافة لدى كي كارد: بيانات البطاقة لا تمر بموقعنا
      window.location.assign(target);
    } catch {
      subscriptionStatusBox.textContent = 'تعذر بدء عملية الدفع حالياً، ولم يُخصم أي مبلغ. حاول بعد قليل.';
    }
  });

  // عودة المشترك من صفحة كي كارد: الخادم يسأل البوابة مباشرة عن حالة الدفع
  async function handlePaymentReturn() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') !== 'return') return;
    const returnedPaymentId = /^[0-9a-f-]{36}$/i.test(params.get('paymentId') || '') ? params.get('paymentId') : '';
    history.replaceState(null, '', window.location.pathname);
    const banner = document.getElementById('searchStatusBanner');
    banner.hidden = false;
    banner.textContent = 'جاري التحقق من عملية الدفع لدى كي كارد...';
    try {
      const res = await fetch(`/api/payments/qicard/confirm${returnedPaymentId ? `?paymentId=${encodeURIComponent(returnedPaymentId)}` : ''}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.user) applyAccount(data);
      if (data.vinReport) {
        if (data.vinReport.reportUrl) {
          banner.innerHTML = `✔ تم الدفع وتقرير تاريخ السيارة جاهز: <a href="${esc(data.vinReport.reportUrl)}">افتح التقرير</a>`;
        } else if (data.vinReport.status === 'no_data') {
          banner.textContent = 'تم الدفع، لكن السجل الأمريكي لا يحوي بيانات لهذا الشاصي؛ أُضيف لك رصيد تقرير تستخدمه لشاصي آخر.';
        } else {
          banner.textContent = 'تم الدفع، والتقرير قيد التجهيز. سيصلك إشعار فور جاهزيته.';
        }
        return;
      }
      if (data.paymentStatus === 'SUCCESS' || data.subscription?.active) {
        banner.textContent = `✔ تم الدفع وتفعيل عضويتك حتى ${formatDate(data.subscription.expiresAt)}. شكراً لك!`;
      } else if (['FAILED', 'AUTHENTICATION_FAILED', 'CANCELED'].includes(data.paymentStatus)) {
        banner.textContent = 'لم تكتمل عملية الدفع، ولم تُفعَّل العضوية. يمكنك المحاولة مجدداً.';
      } else {
        banner.textContent = 'لم يصل تأكيد الدفع بعد. إذا خُصم المبلغ ستُفعَّل عضويتك تلقائياً خلال دقائق.';
      }
    } catch {
      banner.textContent = 'تعذر التحقق من الدفع الآن. إذا خُصم المبلغ ستُفعَّل عضويتك تلقائياً عند وصول تأكيد كي كارد.';
    }
  }

  // نقر البطاقات عبر التفويض بدل onclick المضمّن، كي لا تُحقن أسماء المتاجر داخل شيفرة JavaScript
  document.getElementById('resultsGrid').addEventListener('click', (e) => {
    const reviewBtn = e.target.closest('[data-action="review"]');
    if (reviewBtn) {
      window.openStoreReviewModal(reviewBtn.dataset.store || '');
      return;
    }
    const phoneBtn = e.target.closest('[data-action="copy-phone"]');
    if (phoneBtn) {
      const phone = safeIraqiMobile(phoneBtn.dataset.phone);
      if (phone) {
        navigator.clipboard?.writeText(phone);
        phoneBtn.textContent = 'تم النسخ';
      }
    }
  });

  function applyFeatureFlags() {
    // الاشتراك المدفوع لا يعمل فعلياً (لا بوابة دفع ولا تحقق من الدفع): يُخفى زره في الإنتاج
    subBtn.hidden = !state.config.paymentsEnabled;
    // تسجيل الدخول بغوغل يظهر فقط عند ضبط معرّف التطبيق في الخادم
    openLoginBtn.hidden = !state.config.loginEnabled;
    // لا يوجد مرسل فعلي لرسائل واتساب/تليغرام: تُخفى مداخل رادار التنبيهات
    const alertsOn = Boolean(state.config.alertsDeliveryEnabled);
    document.getElementById('openRadarBtn').hidden = !alertsOn;
    document.getElementById('createAlertFromMeterBtn').hidden = !alertsOn;
    syncFixedHeaderHeight();
  }

  async function bootApp() {
    try {
      const res = await fetch('/api/config');
      if (res.ok) state.config = { ...state.config, ...(await res.json()) };
    } catch {}
    applyFeatureFlags();

    if (state.config.demoMode) {
      try {
        const mod = await import('/demo/demo-offers.js');
        state.offers = [...state.offers, ...mod.DEMO_OFFERS.map((o) => ({ ...o, source: 'demo' }))];
        const banner = document.getElementById('searchStatusBanner');
        banner.hidden = false;
        banner.textContent = 'وضع العرض التجريبي: العروض الموسومة "عرض تجريبي" بيانات وهمية لأغراض العرض فقط.';
      } catch (err) {
        console.error('Demo offers failed to load:', err);
      }
    }

    try {
      const res = await fetch('/api/offers');
      const data = await res.json();
      if (data && Array.isArray(data.offers) && data.offers.length > 0) {
        const existingIds = new Set(data.offers.map((o) => o.id));
        const localOnly = state.offers.filter((o) => !existingIds.has(o.id));
        state.offers = [...data.offers.map((o) => ({ ...o, source: 'user' })), ...localOnly];
      }
    } catch {}

    if (state.config.loginEnabled) {
      await refreshAccount();
      if (state.config.paymentsEnabled) await handlePaymentReturn();
      if (state.user && state.config.alertsDeliveryEnabled) {
        loadNotifications();
        setTimeout(maybeAskForPush, 1500);
        // تحديث العدّاد فور وصول إشعار والصفحة مفتوحة، وعند العودة إليها
        navigator.serviceWorker?.addEventListener('message', (e) => {
          if (e.data?.type === 'radar-notification') loadNotifications();
        });
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible' && state.user) loadNotifications();
        });
      }
    }

    // روابط الإشعارات: ?q=...&section=... تفتح البحث مباشرة
    const deep = new URLSearchParams(window.location.search);
    const deepQuery = (deep.get('q') || '').trim().slice(0, 120);
    if (deepQuery) {
      const deepSection = ['all', 'products', 'cars', 'realestate'].includes(deep.get('section')) ? deep.get('section') : 'all';
      history.replaceState(null, '', window.location.pathname);
      state.selectedSection = deepSection;
      document.querySelectorAll('.vertical-tab').forEach((t) => t.classList.toggle('active', t.getAttribute('data-section') === deepSection));
      searchInput.value = deepQuery;
      clearQueryBtn.hidden = false;
      state.query = deepQuery;
      performLiveSearch(deepQuery);
    }
    renderApp();
  }

  const storedRate = readStoredExchangeRate();
  if (storedRate) {
    state.exchangeRate100USD = storedRate;
    document.getElementById('exchangeRateInput').value = String(storedRate);
  }
  document.querySelectorAll('input[data-money="true"]').forEach((el) => {
    if (el.value) setMoney(el, readMoney(el));
  });

  renderApp();
  bootApp();
});
