// ============================================================================
// رادار أسعار العراق — مقارنة شاملة للسلع والسيارات والعقارات في المحافظات الـ 18
// ============================================================================

import * as PriceEngine from './shared/price-engine.js';
import { escapeHtml as esc, safeHttpUrl, safeIraqiMobile } from './shared/sanitize.js';

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
  config: { demoMode: false, paymentsEnabled: false, alertsDeliveryEnabled: false },
  liveOffers: [],
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

function normalizeDigits(str) {
  return String(str)
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
}

function formatIQD(amountIQD) {
  if (!amountIQD || amountIQD <= 0) return 'السعر داخل المنشور الأصلي';
  if (amountIQD >= 10000000) {
    const millions = (amountIQD / 1000000).toFixed(amountIQD % 1000000 === 0 ? 0 : 2);
    return `${millions} مليون د.ع`;
  }
  const formatted = Math.round(amountIQD).toLocaleString('en-US');
  return `${formatted} د.ع`;
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

function formatPostedTime(offer) {
  const ts = offer.postedAt ? Date.parse(offer.postedAt) : NaN;
  if (Number.isFinite(ts)) {
    const mins = Math.max(0, Math.round((Date.now() - ts) / 60000));
    if (mins < 1) return 'أضيف الآن';
    if (mins < 60) return `أضيف منذ ${mins} دقيقة`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `أضيف منذ ${hours} ساعة`;
    return `أضيف منذ ${Math.round(hours / 24)} يوم`;
  }
  if (offer.source === 'demo' && offer.postedAgo) return offer.postedAgo;
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
async function performLiveSearch(queryText) {
  const cleanQuery = queryText.trim();
  if (!cleanQuery) {
    state.liveOffers = [];
    state.isSearchingLive = false;
    renderApp();
    return;
  }

  if (activeSearchController) {
    activeSearchController.abort();
  }
  activeSearchController = new AbortController();

  state.isSearchingLive = true;
  renderApp();

  try {
    const res = await fetch(
      `/api/live-search?q=${encodeURIComponent(cleanQuery)}&gov=${encodeURIComponent(state.selectedGov)}&section=${encodeURIComponent(state.selectedSection)}&rate=${encodeURIComponent(state.exchangeRate100USD)}`,
      { signal: activeSearchController.signal }
    );
    const data = await res.json();
    if (data && Array.isArray(data.offers)) {
      state.liveOffers = data.offers.map((o) => ({ ...o, source: 'live' }));
    }
    if (data && data.providerOk === false) {
      const banner = document.getElementById('searchStatusBanner');
      banner.hidden = false;
      banner.textContent = 'تعذر الوصول إلى مصدر البحث الحي حالياً (مصدر تجريبي غير مضمون). استخدم أزرار البحث المباشر في المنصات أدناه.';
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('Live search error:', err);
    }
  } finally {
    state.isSearchingLive = false;
    renderApp();
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

  const localMatches = state.offers.filter((offer) => matchesSearch(offer, query));
  const combinedSource = query ? [...localMatches, ...state.liveOffers] : [...state.offers, ...state.liveOffers];

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

    return {
      ...offer,
      itemPriceIQD,
      distanceKm,
      deliveryFeeIQD,
      effectivePriceIQD,
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
    if (!o.itemPriceIQD) continue;
    if (!groupMembers.has(o.comparisonKey)) groupMembers.set(o.comparisonKey, { label: o.comparisonLabel, offers: [] });
    groupMembers.get(o.comparisonKey).offers.push(o);
  }
  const groupStats = new Map();
  for (const [key, g] of groupMembers) {
    groupStats.set(key, { key, label: g.label, stats: PriceEngine.computePriceStats(g.offers.map((o) => o.itemPriceIQD)) });
  }
  // المجموعة المعروضة في مؤشر السعر: الأكثر عروضاً مسعّرة ضمن النتائج الحالية
  const focus = [...groupStats.values()].sort((a, b) => b.stats.count - a.stats.count)[0] || null;

  const knownDistances = filtered.filter((o) => o.distanceKm !== null).map((o) => o.distanceKm);
  const minDist = knownDistances.length ? Math.min(...knownDistances) : null;
  const maxDist = knownDistances.length ? Math.max(...knownDistances) : null;
  const MIN_N = PriceEngine.MIN_COMPARABLE_OFFERS;

  filtered = filtered.map((offer) => {
    const g = offer.itemPriceIQD ? groupStats.get(offer.comparisonKey) : null;
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
      isCheapest: reliable && offer.itemPriceIQD === st.inlierMin,
      isNearest: offer.distanceKm !== null && offer.distanceKm === minDist,
      isOverpriced: reliable && offer.itemPriceIQD > st.median * 1.15
    };
  });

  const maxSmartScore = Math.max(...filtered.filter((o) => !o.isPriceOutlier).map((o) => o.smartScore));
  filtered = filtered.map((offer) => ({
    ...offer,
    isBestSmart: !offer.isPriceOutlier && offer.smartScore === maxSmartScore
  }));

  const allFiltered = [...filtered];

  let finalDisplayed =
    state.selectedPlatform === 'all'
      ? filtered
      : filtered.filter((o) => o.platform === state.selectedPlatform);

  const FAR = 999999999999;
  finalDisplayed.sort((a, b) => {
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

window.openStoreReviewModal = async function (storeName) {
  const modal = document.getElementById('reviewModal');
  document.getElementById('reviewStoreNameInput').value = storeName;
  document.getElementById('reviewModalStoreTitle').textContent = `سجل الموثوقية وتجارب المشترين مع: ${storeName} (تقييمات المستخدمين، غير موثقة)`;
  modal.showModal();
  await loadStoreReviews(storeName);
};

async function loadStoreReviews(storeName) {
  const box = document.getElementById('storeReviewsList');
  box.innerHTML = '<div class="alert-row">جاري تحميل تقييمات المتجر...</div>';
  try {
    const res = await fetch(`/api/reviews?store=${encodeURIComponent(storeName)}`);
    const data = await res.json();
    const reviews = data.reviews || [];
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

function renderApp() {
  updateLiveDeepLinks();

  // تحديث عدادات القطاعات الرئيسية في الشريط العلوي
  const allSource = state.query.trim() ? [...state.offers.filter((o) => matchesSearch(o, state.query.trim())), ...state.liveOffers] : state.offers;
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
  const meterFairNote = document.getElementById('meterFairNote');
  const meterMinNote = document.getElementById('meterMinNote');
  if (stats) {
    const lowValue = stats.inlierMin;
    const highValue = stats.inlierMax;
    document.getElementById('meterMinPrice').textContent = `${formatIQD(lowValue)} (${convertIQDtoUSD(lowValue)})`;
    document.getElementById('meterAvgPrice').textContent = `${formatIQD(stats.median)} (${convertIQDtoUSD(stats.median)})`;
    document.getElementById('meterMaxPrice').textContent = `${formatIQD(highValue)} (${convertIQDtoUSD(highValue)})`;

    const sampleNote =
      stats.count < MIN_N ? ` • عينة صغيرة (${stats.count}) لا تكفي لحكم موثوق` : '';
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

    if (state.adComparisonPrice && state.adComparisonPrice > lowValue) {
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
    const focusPriced = allFiltered.filter(
      (o) => o.effectivePriceIQD && o.effectivePriceIQD > 0 && o.comparisonKey === focusKey && !o.isPriceOutlier
    );
    const cheapest = focusPriced.length
      ? [...focusPriced].sort((a, b) => a.effectivePriceIQD - b.effectivePriceIQD)[0]
      : allFiltered[0];
    const located = allFiltered.filter((o) => o.distanceKm !== null);
    const nearest = located.length
      ? [...located].sort((a, b) => a.distanceKm - b.distanceKm || (a.effectivePriceIQD || 999999999999) - (b.effectivePriceIQD || 999999999999))[0]
      : allFiltered[0];
    const smartest = [...allFiltered].sort((a, b) => Number(a.isPriceOutlier) - Number(b.isPriceOutlier) || b.smartScore - a.smartScore)[0];

    state.topCardTargets = {
      cheapest: cheapest.id,
      nearest: nearest.id,
      smart: smartest.id
    };

    document.getElementById('bestPriceTitle').textContent = cheapest.title;
    document.getElementById('bestPriceValue').textContent = formatIQD(cheapest.effectivePriceIQD);
    document.getElementById('bestPricePlatform').textContent = `${getPlatformName(cheapest.platform)} • ${govLabel(cheapest)}`;

    document.getElementById('nearestItemTitle').textContent = nearest.title;
    document.getElementById('nearestItemDistance').textContent =
      nearest.distanceKm === null
        ? 'الموقع غير محدد في الإعلان'
        : nearest.distanceKm === 0
          ? `داخل محافظتك (${govLabel(nearest)})`
          : `يبعد ${nearest.distanceKm} كم (${govLabel(nearest)})`;
    document.getElementById('nearestItemPrice').textContent = formatIQD(nearest.effectivePriceIQD);

    document.getElementById('smartMatchTitle').textContent = smartest.title;
    document.getElementById('smartMatchMeta').textContent = `${formatIQD(smartest.effectivePriceIQD)} • ${govLabel(smartest)}`;
    document.getElementById('smartMatchSaving').textContent = `معيار التوافق ${smartest.smartScore}%`;
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

  grid.innerHTML = finalDisplayed
    .map((offer) => {
      const isDemo = offer.source === 'demo';
      const isLive = offer.source === 'live';
      const govName = govLabel(offer);
      const distText =
        offer.distanceKm === null
          ? 'المسافة غير معروفة'
          : offer.distanceKm === 0
            ? 'متوفر داخل محافظتك'
            : `يبعد ${offer.distanceKm} كم عن محافظتك`;
      const hasOriginalUrl = Boolean(safeHttpUrl(offer.directUrl));
      const directUrl = buildOfferDirectUrl(offer);
      const imgUrl = getProductImageUrl(offer);
      const usdText = convertIQDtoUSD(offer.effectivePriceIQD);
      const storeName = String(offer.storeName || 'معلن غير مسمى');
      const specsHtml = renderSpecializedSpecsHtml(offer);
      const phone = safeIraqiMobile(offer.phone);
      const hasReviews = Number(offer.reviewsCount) > 0 && Number.isFinite(Number(offer.trustRating)) && offer.trustRating !== null;
      const ratingText = hasReviews ? `★ ${Number(offer.trustRating).toFixed(1)} (${Number(offer.reviewsCount)})` : '☆ لا توجد تقييمات';
      const imgAlt = offer.imageIsIllustrative ? 'صورة توضيحية من بحث الصور وليست من الإعلان' : offer.title;

      const thumbHtml = imgUrl
        ? `<img src="${esc(imgUrl)}" alt="${esc(imgAlt)}" title="${offer.imageIsIllustrative ? 'صورة توضيحية وليست صورة الإعلان' : ''}" class="product-thumb-img" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none'" />`
        : `<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#9ca3af" stroke-width="1.6">
             <circle cx="12" cy="12" r="9"></circle>
             <path d="M12 8v8M8 12h8"></path>
           </svg>`;

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
      if (isLive && offer.itemPriceIQD) {
        const matched = offer.priceMeta?.matchedText ? ` («${esc(offer.priceMeta.matchedText)}»)` : '';
        deliveryBreakdownHtml += `<span class="delivery-breakdown">السعر مستخرج آلياً من مقتطف البحث${matched} وغير موثق</span>`;
      }

      let inspectionLabel;
      if (isLive) {
        inspectionLabel = '⚠ نتيجة بحث آلية: السعر والهاتف والموقع غير موثقة — تحقق من المصدر';
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

      return `
      <article id="offer-card-${esc(offer.id)}" data-offer-id="${esc(offer.id)}" class="product-card ${offer.isCheapest ? 'is-cheapest' : ''}">
        <div class="card-source-bar">
          <div class="source-identity">
            <span class="platform-chip chip-${esc(offer.platform)}">
              ${esc(getPlatformName(offer.platform))}
            </span>
            <span class="seller-name">${esc(storeName)}</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <button type="button" class="trust-rate-btn" data-action="review" data-store="${esc(storeName)}" title="عرض وإضافة تقييمات المستخدمين لهذه الجهة">
              ${ratingText}
            </button>
            <span class="post-time">${esc(formatPostedTime(offer))}</span>
          </div>
        </div>

        <div class="card-body">
          <div class="product-top-row">
            <div class="product-thumb-wrap">
              ${thumbHtml}
            </div>

            <div class="product-heading-col">
              <div class="card-ribbons">
                ${isDemo ? '<span class="ribbon-tag ribbon-overpriced">عرض تجريبي (غير حقيقي)</span>' : ''}
                ${offer.isCheapest ? '<span class="ribbon-tag ribbon-cheapest">الأقل سعراً بين العروض المماثلة</span>' : ''}
                ${offer.isNearest ? '<span class="ribbon-tag ribbon-nearest">الأقرب لمحافظتك</span>' : ''}
                ${offer.isBestSmart ? '<span class="ribbon-tag ribbon-smart">الترشيح الأفضل</span>' : ''}
                ${offer.isOverpriced ? '<span class="ribbon-tag ribbon-overpriced">أغلى من الوسيط للعروض المماثلة</span>' : ''}
                ${offer.isPriceOutlier ? '<span class="ribbon-tag ribbon-overpriced">سعر شاذ عن العروض المماثلة — تحقق منه</span>' : ''}
              </div>
              <h3 class="product-title">${esc(offer.title)}</h3>
            </div>
          </div>

          ${specsHtml}

          <p class="seller-description">${esc(offer.snippet)}</p>

          <div class="trust-and-inspection-row">
            <span class="inspection-pill">${esc(inspectionLabel)}</span>
            <button type="button" class="overview-jump" style="background:none; border:none; cursor:pointer;" data-action="review" data-store="${esc(storeName)}">
              تقييم الجهة أو الإبلاغ
            </button>
          </div>

          <div class="logistics-grid">
            <div class="logistics-item">
              <svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>${esc(govName)}${offer.district ? ` (${esc(offer.district)})` : ''}</span>
            </div>

            <div class="logistics-item">
              <span class="distance-badge ${offer.distanceKm === 0 ? 'in-same-city' : ''}">${esc(distText)}</span>
            </div>
          </div>
        </div>

        <div class="card-footer-box">
          <div class="price-block">
            <div class="price-main-row">
              <span class="price-iqd" style="${!offer.effectivePriceIQD ? 'font-size:0.92rem; color:var(--brand-primary);' : ''}">${formatIQD(offer.effectivePriceIQD)}</span>
              ${usdText ? `<span class="price-usd">(${esc(usdText)})</span>` : ''}
            </div>
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
                ? `<button
                    type="button"
                    class="btn-copy-phone"
                    data-action="copy-phone"
                    data-phone="${esc(phone)}"
                    title="${isLive ? 'رقم مستخرج آلياً من نتيجة البحث وغير موثق' : 'نسخ رقم الهاتف'}"
                  >
                    <svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                    <span>${esc(phone)}${isLive ? ' (غير موثق)' : ''}</span>
                  </button>`
                : ''
            }

            <a href="${esc(directUrl)}" target="_blank" rel="noopener noreferrer nofollow" class="btn-open-offer">
              <span>${hasOriginalUrl ? 'فتح المصدر' : 'بحث في المنصة'}</span>
              <svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M7 17 17 7M7 7h10v10"></path>
              </svg>
            </a>
          </div>
        </div>
      </article>
      `;
    })
    .join('');
}

function getStoredAlertPhone() {
  try {
    return safeIraqiMobile(localStorage.getItem('dalal_alert_phone'));
  } catch {
    return null;
  }
}

async function loadPriceAlerts() {
  const phone = getStoredAlertPhone();
  if (!phone) {
    state.alerts = [];
    document.getElementById('radarCountBadge').textContent = 0;
    renderAlertsList();
    return;
  }
  try {
    const res = await fetch(`/api/alerts?phone=${encodeURIComponent(phone)}`);
    const data = await res.json();
    state.alerts = data.alerts || [];
    document.getElementById('radarCountBadge').textContent = state.alerts.length;
    renderAlertsList();
  } catch {}
}

function renderAlertsList() {
  const box = document.getElementById('activeAlertsList');
  if (!box) return;
  if (state.alerts.length === 0) {
    box.innerHTML = '<div class="alert-row">لا توجد تنبيهات نشطة حالياً. أضف سلعة أو سيارة أو عقار ليراقبه الرادار لك!</div>';
    return;
  }
  box.innerHTML = state.alerts
    .map(
      (a) => `
      <div class="alert-row">
        <div>
          <strong>${esc(a.keyword)}</strong> — السعر المطلوب: <span style="color:var(--brand-primary); font-weight:700;">${formatIQD(Number(a.targetPriceIQD))}</span>
          <div style="font-size:0.73rem; color:var(--text-muted);">المحافظة: ${esc(IRAQ_GOVERNORATES[a.governorate]?.name || a.governorate)} • التنبيه عبر: ${a.contactChannel === 'whatsapp' ? 'واتساب' : 'تليغرام'} (${esc(a.contactPhone)})</div>
        </div>
        <button type="button" class="btn-secondary" style="padding:3px 8px; font-size:0.74rem;" onclick="window.deleteAlert(${Number(a.id) || 0})">حذف</button>
      </div>
    `
    )
    .join('');
}

window.deleteAlert = async function (id) {
  const phone = getStoredAlertPhone();
  if (!phone) return;
  await fetch(`/api/alerts/${Number(id)}?phone=${encodeURIComponent(phone)}`, { method: 'DELETE' }).catch(() => {});
  await loadPriceAlerts();
};

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

document.addEventListener('DOMContentLoaded', () => {
  // التحويل الفوري لأي أرقام عربية إلى إنجليزية في جميع الحقول
  document.addEventListener(
    'input',
    (e) => {
      const target = e.target;
      if (!target || (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA')) return;
      if (typeof target.value !== 'string') return;

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
    state.maxBudget = maxBudgetInput.value ? Number(maxBudgetInput.value) : null;

    if (state.query) {
      fetch('/api/searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: state.query,
          governorate: state.selectedGov,
          maxBudget: state.maxBudget
        })
      }).catch(() => {});
    }

    performLiveSearch(state.query);
  });

  let debounceTimer = null;
  searchInput.addEventListener('input', () => {
    clearQueryBtn.hidden = !searchInput.value;
    state.query = searchInput.value.trim();
    state.adComparisonPrice = null;
    state.liveOffers = [];
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
    state.maxBudget = maxBudgetInput.value ? Number(maxBudgetInput.value) : null;
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
    const val = Number(exchangeRateInput.value);
    if (val >= 100000 && val <= 300000) {
      state.exchangeRate100USD = val;
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

  document.getElementById('analyzerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const section = postSectionSelect.value;
    const platform = document.getElementById('postPlatformSelect').value;
    const storeName = document.getElementById('postStoreName').value.trim();
    const rawText = postRawText.value.trim();
    const deliveryLocalIQD = section === 'products' ? Number(document.getElementById('postDeliveryLocal').value || 4000) : 0;
    const deliveryNationalIQD = section === 'products' ? Number(document.getElementById('postDeliveryNational').value || 7000) : 0;
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
      postedAt: new Date().toISOString(),
      postedAgo: null
    };

    state.offers.unshift(newOffer);
    state.selectedSection = section;
    document.querySelectorAll('.vertical-tab').forEach((t) => {
      t.classList.toggle('active', t.getAttribute('data-section') === section);
    });
    state.query = '';
    searchInput.value = '';
    analyzerModal.close();
    renderApp();

    fetch('/api/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOffer)
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok || !data.saved) {
          const banner = document.getElementById('searchStatusBanner');
          banner.hidden = false;
          banner.textContent = 'تعذر حفظ العرض في قاعدة البيانات؛ سيظهر في هذا المتصفح فقط حتى إعادة تحميل الصفحة.';
        }
      })
      .catch(() => {});
  });

  // نافذة رادار التنبيهات
  const radarModal = document.getElementById('radarModal');
  document.getElementById('openRadarBtn').addEventListener('click', () => {
    if (state.query) {
      document.getElementById('radarKeywordInput').value = state.query;
    }
    radarModal.showModal();
    loadPriceAlerts();
  });
  document.getElementById('createAlertFromMeterBtn').addEventListener('click', () => {
    if (state.query) {
      document.getElementById('radarKeywordInput').value = state.query;
    }
    radarModal.showModal();
    loadPriceAlerts();
  });
  document.getElementById('closeRadarBtn').addEventListener('click', () => radarModal.close());

  document.getElementById('radarForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const keyword = document.getElementById('radarKeywordInput').value.trim();
    const targetPriceIQD = Number(document.getElementById('radarTargetPriceInput').value);
    const contactPhone = document.getElementById('radarPhoneInput').value.trim();
    const contactChannel = document.getElementById('radarChannelSelect').value;
    const listBox = document.getElementById('activeAlertsList');

    let result = { ok: false, data: {} };
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword,
          targetPriceIQD,
          governorate: state.selectedGov,
          contactPhone,
          contactChannel
        })
      });
      result = { ok: res.ok, data: await res.json().catch(() => ({})) };
    } catch {}

    if (!result.ok || !result.data.saved) {
      listBox.innerHTML =
        result.data.error === 'alerts_delivery_disabled'
          ? '<div class="alert-row">خدمة إرسال التنبيهات غير مفعلة حالياً، لذلك لم يُحفظ التنبيه.</div>'
          : '<div class="alert-row">تعذر حفظ التنبيه. تأكد من رقم الهاتف (07XXXXXXXXX) والسعر المستهدف.</div>';
      return;
    }

    try {
      localStorage.setItem('dalal_alert_phone', safeIraqiMobile(contactPhone) || '');
    } catch {}
    document.getElementById('radarKeywordInput').value = '';
    document.getElementById('radarTargetPriceInput').value = '';
    await loadPriceAlerts();
  });

  // نافذة البحث بصورة الإعلان
  const imageSearchModal = document.getElementById('imageSearchModal');
  const adScreenshotInput = document.getElementById('adScreenshotInput');
  const screenshotPreviewImg = document.getElementById('screenshotPreviewImg');
  const imageExtractedQuery = document.getElementById('imageExtractedQuery');

  document.getElementById('openImageSearchBtn').addEventListener('click', () => imageSearchModal.showModal());
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

    const cleanName = file.name
      .replace(/\.[^.]+$/, '')
      .replace(/[-_]/g, ' ')
      .replace(/screenshot|img|image|whatsapp|photo|\d{4,}/gi, '')
      .trim();
    if (cleanName.length >= 3 && !imageExtractedQuery.value) {
      imageExtractedQuery.value = cleanName;
    }
  });

  document.getElementById('imageSearchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = imageExtractedQuery.value.trim();
    const adPrice = Number(document.getElementById('adSeenPriceInput').value || 0);
    if (!q) return;

    state.query = q;
    state.adComparisonPrice = adPrice > 0 ? adPrice : null;
    searchInput.value = q;
    clearQueryBtn.hidden = false;
    imageSearchModal.close();

    const banner = document.getElementById('searchStatusBanner');
    banner.hidden = false;
    banner.textContent = `جاري فحص صورة الإعلان والبحث عن المصدر الأرخص في العراق لـ: ${q}...`;

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

    await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeName,
        rating,
        allowsInspection,
        comment,
        reviewerGov: state.selectedGov
      })
    }).catch(() => {});

    document.getElementById('reviewCommentInput').value = '';
    await loadStoreReviews(storeName);
  });

  // نافذة الاشتراك الشهري والتحقق السحابي لمدة 30 يوماً
  const subscriptionModal = document.getElementById('subscriptionModal');
  const subscriptionStatusBox = document.getElementById('subscriptionStatusBox');
  const restoreSubPhoneInput = document.getElementById('restoreSubPhoneInput');
  const restoreSubBtn = document.getElementById('restoreSubBtn');

  async function verifySubscriptionFromServer(phoneToCheck, isManualRestore = false) {
    const cleanPhone = normalizeDigits(String(phoneToCheck || '')).replace(/[^\d]/g, '');
    if (!cleanPhone) return;

    try {
      const res = await fetch(`/api/subscription-status?phone=${encodeURIComponent(cleanPhone)}`);
      const data = await res.json();

      if (data && data.active) {
        localStorage.setItem('dalal_vip_phone', cleanPhone);
        state.isSubscribed = true;
        subBtn.classList.add('is-subscribed');
        subBtnLabel.textContent = `عضوية فعالة (${data.daysRemaining} يوم متبقي) ✓`;

        if (subscriptionStatusBox) {
          subscriptionStatusBox.hidden = false;
          subscriptionStatusBox.innerHTML = `<strong>✔ عضوية فعالة ومؤكدة في قاعدة البيانات:</strong> الرقم <span>${cleanPhone}</span> — متبقي <strong>${data.daysRemaining} يوماً</strong> من أصل 30 يوماً.`;
        }

        if (isManualRestore) {
          const banner = document.getElementById('searchStatusBanner');
          banner.hidden = false;
          banner.textContent = `تم استعادة عضويتك بنجاح للرقم ${cleanPhone} — متبقي في اشتراكك ${data.daysRemaining} يوماً!`;
          subscriptionModal.close();
        }
      } else {
        if (!isManualRestore) {
          localStorage.removeItem('dalal_vip_phone');
          state.isSubscribed = false;
          subBtn.classList.remove('is-subscribed');
          subBtnLabel.textContent = 'اشترك بـ 1,000 د.ع / شهر';
        }
        if (subscriptionStatusBox && isManualRestore) {
          subscriptionStatusBox.hidden = false;
          subscriptionStatusBox.innerHTML = data?.found
            ? `<strong>انتهت صلاحية اشتراك الثلاثين يوماً للرقم ${cleanPhone}.</strong> يمكنك تجديده الآن لمدة 30 يوماً إضافية بألف دينار فقط.`
            : `<strong>لم يتم العثور على اشتراك فعال للرقم ${cleanPhone}.</strong> يمكنك تفعيل العضوية الآن من النموذج أدناه.`;
        }
      }
    } catch {}
  }

  // التحقق من العضوية المحفوظة يتم بعد تحميل إعدادات الخادم (انظر bootApp أدناه)

  subBtn.addEventListener('click', () => {
    const currentPhone = localStorage.getItem('dalal_vip_phone');
    if (currentPhone) {
      document.getElementById('subPhoneInput').value = currentPhone;
      verifySubscriptionFromServer(currentPhone, false);
    }
    subscriptionModal.showModal();
  });
  document.getElementById('closeSubscriptionBtn').addEventListener('click', () => subscriptionModal.close());

  if (restoreSubBtn && restoreSubPhoneInput) {
    restoreSubBtn.addEventListener('click', () => {
      const phone = restoreSubPhoneInput.value.trim();
      if (!phone) return;
      verifySubscriptionFromServer(phone, true);
    });
  }

  document.getElementById('subscriptionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const banner = document.getElementById('searchStatusBanner');
    if (!state.config.paymentsEnabled) {
      subscriptionModal.close();
      banner.hidden = false;
      banner.textContent = 'الاشتراك المدفوع غير متاح حالياً.';
      return;
    }
    const phone = document.getElementById('subPhoneInput').value.trim();
    const paymentMethod = document.getElementById('subPaymentMethod').value;

    let ok = false;
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, paymentMethod })
      });
      const data = await res.json().catch(() => ({}));
      ok = res.ok && data.subscribed === true;
    } catch {}

    if (!ok) {
      banner.hidden = false;
      banner.textContent = 'تعذر تفعيل الاشتراك، ولم يُخصم أي مبلغ عبر هذا الموقع.';
      return;
    }

    localStorage.setItem('dalal_vip_phone', phone);
    await verifySubscriptionFromServer(phone, false);
    subscriptionModal.close();

    banner.hidden = false;
    banner.textContent = `تم تفعيل عضوية رادار أسعار العراق لمدة 30 يوماً للرقم ${phone}.`;
  });

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

    if (state.config.paymentsEnabled) {
      const savedVipPhone = localStorage.getItem('dalal_vip_phone');
      if (savedVipPhone) verifySubscriptionFromServer(savedVipPhone, false);
    }
    if (state.config.alertsDeliveryEnabled) loadPriceAlerts();
    renderApp();
  }

  renderApp();
  bootApp();
});
