// ============================================================================
// محرك الأسعار العراقية المشترك بين الخادم والمتصفح
// - استخراج السعر من نص الإعلان (دينار، ألف، مليون، دفتر، ورقة، دولار)
// - تصنيف العرض (سلع / سيارات / عقارات) ومجموعة المقارنة المماثلة
// - إحصاءات الأسعار: المتوسط الحسابي والوسيط والربيعيات والقيم الشاذة
// ملاحظة: لا يعتمد على lookbehind في التعابير النمطية حفاظاً على توافق متصفحات iOS القديمة.
// ============================================================================

const AR = '\\u0600-\\u06FF';
const WORD_CHARS = `${AR}a-z0-9`;
// يشمل: 1,585,000 و 43.900.000 (النقطة فاصل آلاف عند تكرارها) و 1.5
const NUM = '\\d{1,3}(?:,\\d{3})+(?:\\.\\d+)?|\\d{1,3}(?:\\.\\d{3}){2,}(?!\\d)|\\d+(?:\\.\\d+)?';
const NUM_MILLION = '\\d+(?:[.,]\\d{1,2})?(?!\\d)';
const WARQA_WORD = '(?:ورقه|ورقات|اوراق|ورق)';
const B = `(^|[^${WORD_CHARS}])`; // حد بداية الكلمة (بديل عن lookbehind)
const E = `(?![${WORD_CHARS}])`; // حد نهاية الكلمة

export const DEFAULT_USD_RATE = 1500; // دينار لكل دولار واحد

// وحدات إذا جاءت بعد الرقم فهو ليس سعراً (مسافة، سعة، مدة، مساحة...)
const NON_PRICE_UNITS =
  'كم|كيلو|ك\\.م|km|ميل|mile|متر|م2|م²|م(?![' + AR + '])|جيجا|جيكا|جي بي|gb|tb|تيرا|ميجا|انش|بوصه|inch|سنه|سنوات|سنين|شهر|اشهر|يوم|ايام|ساعه|ساعات|امبير|طن|واط|mah|ملم|mm|سي سي|cc|حصان|hp|سلندر|راكب|غرفه|غرف|طابق|حبه|قطعه|نسخه|%|٪';
const NON_PRICE_AFTER = new RegExp(`^\\s*(?:${NON_PRICE_UNITS})`, 'i');

// كلمات إذا سبقت الرقم مباشرة فهو ليس السعر الرئيسي
const NON_PRICE_BEFORE = /(?:ماشيه|ماشي|ممشى|مشي|عداد|ضمان|موديل|كفاله)\s*[:\-]?\s*$/;
const NEGATIVE_BEFORE = /(?:قسط|اقساط|مقدمه|مقدم|عربون|دفعه|خصم|وفر|توفير|بدل|كان|قبل|اجور|اجره|توصيل|شحن|ربح|راتب|تامين)[^\d]{0,12}$/;
const PRICE_KEYWORD_BEFORE = /(?:السعر|سعر|بسعر|سعره|سعرها|المطلوب|price|للبيع ب|فقط ب)[^\d]{0,14}$/;
const RENT_WORDS = new RegExp(`${B}(?:ايجار|للايجار|مؤجر|تاجير|للتاجير|rent)${E}`);
const RENT_PERIOD_AFTER = /^[^\d]{0,14}?(شهري|شهريا|بالشهر|\/\s*شهر|في الشهر|سنوي|سنويا|بالسنه|\/\s*سنه|يومي|يوميا|باليوم)/;

// ---------------------------------------------------------------------------
// التطبيع
// ---------------------------------------------------------------------------

export function normalizeDigits(str) {
  return String(str ?? '')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٬/g, ',') // فاصل الآلاف العربي
    .replace(/(\d)،(?=\d{3}(?!\d))/g, '$1,') // الفاصلة العربية بين الأرقام: 82،000
    .replace(/٫/g, '.'); // الفاصلة العشرية العربية
}

/** تطبيع للمطابقة فقط: أرقام لاتينية، أحرف صغيرة، توحيد الألف والتاء المربوطة والياء، حذف التشكيل والتطويل. */
export function normalizeForMatch(str) {
  return normalizeDigits(str)
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/گ/g, 'ك') // الكاف العراقية: "گري" = "كري"
    .replace(/چ/g, 'ج')
    .replace(/پ/g, 'ب')
    .replace(/ڤ/g, 'ف')
    .replace(/\s+/g, ' ')
    .trim();
}

function toNumber(raw) {
  const str = String(raw);
  if (/^\d{1,3}(?:\.\d{3}){2,}$/.test(str)) return parseFloat(str.replace(/\./g, ''));
  return parseFloat(str.replace(/,/g, ''));
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const termRegexCache = new Map();
/** يتحقق من وجود مصطلح ككلمة مستقلة (مع سوابق عربية شائعة مثل و، ب، ال). */
export function hasTerm(normalizedText, term) {
  let re = termRegexCache.get(term);
  if (!re) {
    const t = escapeRegExp(normalizeForMatch(term));
    re = new RegExp(`${B}(?:و|ب|ل|ف|ك)?(?:ال)?${t}${E}`);
    termRegexCache.set(term, re);
  }
  return re.test(normalizedText);
}

/** موضع أول ظهور لأي مصطلح من القائمة ككلمة مستقلة، أو -1. */
function firstTermIndex(text, terms) {
  let best = -1;
  for (const t of terms) {
    hasTerm(text, t);
    const re = termRegexCache.get(t);
    const m = re.exec(text);
    if (m) {
      const idx = m.index + m[1].length;
      if (best === -1 || idx < best) best = idx;
    }
  }
  return best;
}

function countTerms(text, terms) {
  let n = 0;
  for (const t of terms) if (hasTerm(text, t)) n += 1;
  return n;
}

function numberBelongsToModel(text, numberStart) {
  const before = text.slice(Math.max(0, numberStart - 25), numberStart).trim();
  const lastWord = before.split(' ').pop();
  if (!lastWord) return false;
  return CAR_MODELS.some(([, , terms]) => terms.some((t) => normalizeForMatch(t).split(' ').pop() === lastWord));
}

// ---------------------------------------------------------------------------
// استخراج السعر
// ---------------------------------------------------------------------------

const PATTERNS = [
  {
    unit: 'daftar',
    priority: 7,
    re: new RegExp(
      `${B}(?:(${NUM})\\s*)?(دفترين|دفاتر|دفتر)${E}(?:\\s*و\\s*(?:(نص|ربع)${E}|(${NUM})\\s*${WARQA_WORD}${E}|(ورقتين|ورقه)${E}))?`,
      'g'
    ),
    build(m, text) {
      const word = m[3];
      let count = word === 'دفترين' ? 2 : m[2] ? toNumber(m[2]) : 1;
      // "تيجو 8 دفتر" أو "X5 دفتر": الرقم جزء من اسم الطراز وليس عدد الدفاتر
      if (m[2] && word === 'دفتر' && numberBelongsToModel(text, m.index + m[1].length)) count = 1;
      let usd = count * 10000;
      if (m[4] === 'نص') usd += 5000;
      else if (m[4] === 'ربع') usd += 2500;
      else if (m[5]) usd += toNumber(m[5]) * 100;
      else if (m[6] === 'ورقتين') usd += 200;
      else if (m[6] === 'ورقه') usd += 100;
      const weakAlone = !m[2] && word === 'دفتر' && !m[4] && !m[5] && !m[6];
      return { currency: 'USD', amount: usd, weakAlone };
    }
  },
  {
    unit: 'million',
    priority: 6,
    re: new RegExp(
      `${B}(?:(${NUM_MILLION})\\s*)?(مليونين|ملايين|مليون)${E}(?:\\s*و\\s*(?:(نص|ربع)${E}|(${NUM})\\s*(?:الف|الاف)${E}))?`,
      'g'
    ),
    build(m) {
      const word = m[3];
      if (word === 'ملايين' && !m[2]) return null;
      const count = word === 'مليونين' ? 2 : m[2] ? parseFloat(m[2].replace(',', '.')) : 1;
      let iqd = count * 1_000_000;
      if (m[4] === 'نص') iqd += 500_000;
      else if (m[4] === 'ربع') iqd += 250_000;
      else if (m[5]) iqd += toNumber(m[5]) * 1000;
      const weakAlone = !m[2] && word === 'مليون' && !m[4] && !m[5];
      return { currency: 'IQD', amount: iqd, weakAlone };
    }
  },
  {
    unit: 'million',
    priority: 6,
    re: new RegExp(`${B}(نص|ربع)\\s*مليون${E}`, 'g'),
    build(m) {
      return { currency: 'IQD', amount: m[2] === 'نص' ? 500_000 : 250_000 };
    }
  },
  {
    unit: 'warqa',
    priority: 5,
    re: new RegExp(`${B}(${NUM})\\s*${WARQA_WORD}${E}(?:\\s*و\\s*(نص)${E})?`, 'g'),
    build(m, text, end) {
      const n = toNumber(m[2]);
      if (n <= 0 || n >= 1000) return null;
      if (/^\s*(?:a4|a3|a5)/i.test(text.slice(end))) return null; // رزمة ورق طباعة
      return { currency: 'USD', amount: n * 100 + (m[3] ? 50 : 0) };
    }
  },
  {
    unit: 'warqa',
    priority: 5,
    re: new RegExp(`${B}(ورقتين|ورقه\\s*و\\s*نص)${E}`, 'g'),
    build(m) {
      return { currency: 'USD', amount: m[2] === 'ورقتين' ? 200 : 150 };
    }
  },
  {
    unit: 'usd',
    priority: 4,
    re: new RegExp(`\\$\\s*(${NUM})|${B}(${NUM})\\s*(?:\\$|دولار|usd)${E}`, 'g'),
    build(m) {
      const raw = m[1] || m[3];
      // "19.000$" بالأسلوب الأوروبي: نقطة يتبعها 3 أرقام بالضبط تعني آلافاً لا كسوراً
      const amount = /^\d{1,3}\.\d{3}$/.test(raw) ? parseFloat(raw.replace('.', '')) : toNumber(raw);
      return { currency: 'USD', amount };
    },
    offset(m) {
      return m[1] ? 0 : m[2].length;
    }
  },
  {
    unit: 'iqd',
    priority: 4,
    re: new RegExp(`${B}(${NUM})\\s*(?:دينار|د\\.\\s?ع|ع\\.\\s?د|دع|iqd)${E}|(?:iqd|د\\.\\s?ع|ع\\.\\s?د)\\s*:?\\s*(${NUM})`, 'g'),
    build(m) {
      const n = toNumber(m[2] || m[3]);
      if (n < 1000) return null; // "250 دينار" غامضة: لا نخمّن أنها بالآلاف
      return { currency: 'IQD', amount: n };
    },
    offset(m) {
      return m[2] ? m[1].length : 0;
    }
  },
  {
    unit: 'alf',
    priority: 3,
    re: new RegExp(`${B}(${NUM})\\s*(?:الف|الاف)${E}(\\s*(?:دولار|\\$|usd)${E})?`, 'g'),
    build(m, text, end) {
      if (NON_PRICE_AFTER.test(text.slice(end))) return null;
      const n = toNumber(m[2]);
      if (n <= 0) return null;
      return m[3] ? { currency: 'USD', amount: n * 1000 } : { currency: 'IQD', amount: n * 1000 };
    }
  },
  {
    unit: 'bare',
    priority: 2,
    re: new RegExp(`(السعر|سعر|بسعر|المطلوب|price)\\s*[:\\-–]?\\s*(${NUM})(?![\\d,])`, 'g'),
    build(m, text, end) {
      const after = text.slice(end);
      if (NON_PRICE_AFTER.test(after)) return null;
      if (/^\s*(?:دفتر|دفاتر|ورق|مليون|ملايين|الف|الاف|دولار|\$|دينار|د\.\s?ع|usd|iqd)/.test(after)) return null;
      const raw = m[2];
      const n = toNumber(raw);
      // "السعر 1140" أو "سعر 1775" بلا وحدة: قد تعني آلافاً أو دولارات، فلا نخمّن (ويستبعد هذا سنوات الصنع أيضاً)
      if (n < 10000) return null;
      return { currency: 'IQD', amount: n, keywordBuiltIn: true };
    },
    offset(m) {
      return m[0].length - m[2].length;
    }
  }
];

/**
 * يستخرج السعر الرئيسي من نص إعلان عراقي.
 * @param {string} rawText
 * @param {{usdRate?: number}} [options] usdRate = دينار لكل دولار
 * @returns {null | {priceIQD:number, currency:'IQD'|'USD', amount:number, amountUSD:number|null,
 *   unit:string, isRent:boolean, rentPeriod:string|null, matchedText:string, confidence:'high'|'medium'|'low'}}
 */
export function extractIraqiPrice(rawText, options = {}) {
  const usdRate = Number(options.usdRate) > 0 ? Number(options.usdRate) : DEFAULT_USD_RATE;
  const text = normalizeForMatch(rawText);
  if (!text) return null;

  const candidates = [];
  for (const pattern of PATTERNS) {
    pattern.re.lastIndex = 0;
    let m;
    while ((m = pattern.re.exec(text)) !== null) {
      if (m[0].length === 0) {
        pattern.re.lastIndex += 1;
        continue;
      }
      const prefixLen = pattern.offset ? pattern.offset(m) : m[1] !== undefined && pattern.unit !== 'usd' ? m[1].length : 0;
      const start = m.index + prefixLen;
      const end = m.index + m[0].length;
      const built = pattern.build(m, text, end);
      if (!built || !Number.isFinite(built.amount) || built.amount <= 0) continue;
      candidates.push({ ...built, unit: pattern.unit, priority: pattern.priority, start, end, matchedText: text.slice(start, end).trim() });
    }
  }
  if (candidates.length === 0) return null;

  // إزالة التداخل: الصيغة الأعلى أولوية (والأطول) تربح
  candidates.sort((a, b) => b.priority - a.priority || b.end - b.start - (a.end - a.start) || a.start - b.start);
  const accepted = [];
  for (const c of candidates) {
    if (accepted.some((a) => c.start < a.end && a.start < c.end)) continue;
    accepted.push(c);
  }

  const isRentGlobal = RENT_WORDS.test(text);
  let best = null;
  for (const c of accepted) {
    const before = text.slice(Math.max(0, c.start - 30), c.start);
    if (NON_PRICE_BEFORE.test(before)) continue;
    const hasKeyword = c.keywordBuiltIn || PRICE_KEYWORD_BEFORE.test(before);
    if (c.weakAlone && !hasKeyword) continue;
    let score = c.unit === 'alf' || c.unit === 'bare' ? 2 : 3;
    if (hasKeyword) score += 3;
    if (NEGATIVE_BEFORE.test(before)) score -= 5;
    if (c.weakAlone) score -= 1;
    if (score <= 0) continue;
    c.score = score;
    if (!best || score > best.score || (score === best.score && c.start < best.start)) best = c;
  }
  if (!best) return null;

  const priceIQD = Math.round(best.currency === 'USD' ? best.amount * usdRate : best.amount);
  if (!(priceIQD >= 1000 && priceIQD <= 100_000_000_000)) return null;

  const periodMatch = text.slice(best.end).match(RENT_PERIOD_AFTER);
  let rentPeriod = null;
  if (periodMatch) {
    const p = periodMatch[1];
    rentPeriod = /سن/.test(p) ? 'year' : /يوم/.test(p) ? 'day' : 'month';
  }
  const isRent = Boolean(rentPeriod) || isRentGlobal;

  return {
    priceIQD,
    currency: best.currency,
    amount: best.amount,
    amountUSD: best.currency === 'USD' ? best.amount : null,
    unit: best.unit,
    isRent,
    rentPeriod: isRent ? rentPeriod || 'month' : null,
    matchedText: best.matchedText,
    confidence: best.score >= 6 ? 'high' : best.score >= 3 ? 'medium' : 'low'
  };
}

// ---------------------------------------------------------------------------
// التصنيف
// ---------------------------------------------------------------------------

const CAR_STRONG = [
  'سياره', 'سيارات', 'معرض سيارات', 'تويوتا', 'هيونداي', 'نيسان', 'شيفروليه', 'شفروليه', 'شوفرليت', 'فورد', 'دودج', 'دوج',
  'كرايسلر', 'جي ام سي', 'كاديلاك', 'ميتسوبيشي', 'مازدا', 'هوندا', 'سوزوكي', 'لكزس', 'انفينيتي', 'مرسيدس', 'بي ام دبليو',
  'اودي', 'فولكس واجن', 'بورش', 'رينج روفر', 'لاند روفر', 'جيتور', 'شيري', 'شانجان', 'هافال', 'جيلي', 'بي واي دي', 'بايك',
  'غريت وول', 'بيجو', 'رينو', 'فولفو', 'تيسلا', 'سانغ يونغ', 'سوبارو', 'كيا', 'النترا', 'سوناتا', 'توسان', 'سنتافي', 'سبورتاج',
  'سورينتو', 'سيراتو', 'كادينزا', 'اوبتيما', 'لاندكروزر', 'لاند كروزر', 'برادو', 'كامري', 'كورولا', 'يارس', 'هايلكس', 'افالون',
  'باترول', 'التيما', 'ماكسيما', 'ماليبو', 'ترافيرس', 'تاهو', 'تشارجر', 'تشالنجر', 'دورانجو', 'رانجلر', 'شيروكي', 'كابرس',
  'بيك اب', 'دفع رباعي', 'وارد امريكي', 'كلين تايتل', 'toyota', 'hyundai', 'kia', 'nissan', 'chevrolet', 'ford', 'dodge',
  'mercedes', 'bmw', 'lexus', 'tahoe', 'elantra', 'sportage', 'camry', 'corolla', 'land cruiser', 'landcruiser', 'jetour',
  'changan', 'chery', 'haval', 'geely', 'tiggo', 'jeep', 'تيجو', 'داشينغ', 'يوني كي', 'غراند شيروكي'
];
const CAR_WEAK = [
  'جيب', 'جاك', 'ام جي', 'سني', 'ممشى', 'ماشيه', 'عداد', 'ميل', 'رقم بغداد', 'رقم اربيل', 'رقم البصره', 'خليجي', 'وكاله',
  'صبغ', 'جير', 'محرك', 'سلندر', 'دفتر', 'دفترين', 'دفاتر', 'موديل', 'زيرو'
];
const ACCESSORY_TERMS = [
  'شاحن', 'كفر', 'كفرات', 'جراب', 'حامل', 'غطاء', 'اكسسوار', 'اكسسوارات', 'ملحقات', 'قطع غيار', 'سبير', 'اطار', 'اطارات',
  'تواير', 'زيت', 'مسجل', 'كاميرا خلفيه', 'لعبه', 'مجسم', 'ستيكر', 'واقي', 'سكرين', 'case', 'charger'
];
const RE_STRONG = [
  'عقار', 'عقارات', 'شقه', 'شقق', 'قطعه ارض', 'ارض سكنيه', 'ارض زراعيه', 'طابو', 'دونم', 'مشتمل', 'فيلا', 'عماره سكنيه',
  'بسمايه', 'دار للبيع', 'بيت للبيع', 'دار سكنيه', 'مكتب عقاري', 'متر مربع', 'سند استثماري'
];
const RE_WEAK = ['دار', 'بيت', 'ارض', 'بناء', 'مساحه', 'واجهه', 'نزال', 'م2', 'غرف', 'حمام', 'طابق', 'للايجار', 'ايجار', 'سند'];

/**
 * يصنف النص إلى cars أو realestate أو products، أو unknown عند غياب أي دليل.
 * الإكسسوارات وقطع الغيار تصنف سلعاً حتى لو ذكرت ماركة سيارة.
 */
export function classifySection(rawText) {
  const text = normalizeForMatch(rawText);
  // الإكسسوار هو ما يأتي اسمه قبل اسم المنتج ("كفر ايفون")، لا ما يُذكر كملحق ("ايفون مع شاحن")
  const accessoryIdx = firstTermIndex(text, ACCESSORY_TERMS);
  const mainIdx = firstTermIndex(text, [...CAR_STRONG, ...PRODUCT_FAMILY_TERMS]);
  const isAccessory = accessoryIdx !== -1 && (mainIdx === -1 || accessoryIdx < mainIdx);
  const carScore = countTerms(text, CAR_STRONG) * 2 + countTerms(text, CAR_WEAK);
  const reScore = countTerms(text, RE_STRONG) * 2 + countTerms(text, RE_WEAK);
  const familyKey = detectProductFamily(text);

  if (isAccessory && (carScore > 0 || familyKey)) return { section: 'products', isAccessory: true };
  if (carScore >= 2 && carScore > reScore) return { section: 'cars', isAccessory: false };
  if (reScore >= 2 && reScore >= carScore) return { section: 'realestate', isAccessory: false };
  if (isAccessory || familyKey) return { section: 'products', isAccessory };
  return { section: 'unknown', isAccessory: false };
}

const PRODUCT_FAMILIES = [
  ['phones', 'هواتف ذكية', ['ايفون', 'iphone', 'موبايل', 'هاتف', 'جوال', 'جالكسي', 'galaxy', 'شاومي', 'xiaomi', 'ريدمي', 'redmi', 'هواوي', 'huawei', 'اوبو', 'oppo', 'فيفو', 'vivo', 'ريلمي', 'realme', 'pixel', 'نوكيا', 'هونر', 'honor', 'انفنكس', 'infinix']],
  ['tablets', 'أجهزة لوحية', ['ايباد', 'ipad', 'تابلت']],
  ['laptops', 'حواسيب ولابتوبات', ['لابتوب', 'لاب توب', 'حاسبه', 'حاسوب', 'كمبيوتر', 'laptop', 'ماك بوك', 'macbook', 'لينوفو', 'lenovo', 'dell', 'asus', 'acer']],
  ['consoles', 'أجهزة ألعاب', ['بلاي ستيشن', 'بلايستيشن', 'بلي ستيشن', 'ps5', 'ps4', 'playstation', 'اكس بوكس', 'xbox', 'نينتندو', 'nintendo']],
  ['watches', 'ساعات ذكية', ['ساعه ذكيه', 'ابل واتش', 'apple watch']],
  ['audio', 'سماعات وصوتيات', ['سماعه', 'سماعات', 'ايربودز', 'airpods', 'سبيكر']],
  ['tv', 'شاشات وتلفزيونات', ['شاشه', 'تلفزيون', 'تلفاز', 'tv']],
  ['ac', 'أجهزة تبريد', ['سبلت', 'سبليت', 'مكيف', 'مبرده', 'gree', 'جري', 'كري']],
  ['kitchen', 'أجهزة مطبخ', ['ماكينه قهوه', 'خلاط', 'قلايه', 'مايكرويف', 'طباخ']],
  ['appliances', 'أجهزة منزلية كبيرة', ['ثلاجه', 'غساله', 'مجمده', 'مكنسه', 'نشافه']],
  ['solar', 'طاقة شمسية', ['طاقه شمسيه', 'الواح شمسيه', 'انفرتر', 'بطاريه ليثيوم', 'منظومه']]
];

const PRODUCT_FAMILY_TERMS = PRODUCT_FAMILIES.flatMap(([, , terms]) => terms);

export function detectProductFamily(normalizedOrRawText) {
  const text = normalizeForMatch(normalizedOrRawText);
  for (const [key, , terms] of PRODUCT_FAMILIES) {
    if (terms.some((t) => hasTerm(text, t))) return key;
  }
  return null;
}

const CAR_MODELS = [
  ['elantra', 'هيونداي النترا', ['النترا', 'elantra']],
  ['sonata', 'هيونداي سوناتا', ['سوناتا', 'sonata']],
  ['tucson', 'هيونداي توسان', ['توسان', 'tucson']],
  ['santafe', 'هيونداي سنتافي', ['سنتافي', 'santa fe']],
  ['sportage', 'كيا سبورتاج', ['سبورتاج', 'sportage']],
  ['sorento', 'كيا سورينتو', ['سورينتو', 'sorento']],
  ['cerato', 'كيا سيراتو', ['سيراتو', 'cerato']],
  ['k5', 'كيا اوبتيما', ['اوبتيما', 'optima']],
  ['landcruiser', 'تويوتا لاندكروزر', ['لاندكروزر', 'لاند كروزر', 'land cruiser', 'landcruiser']],
  ['prado', 'تويوتا برادو', ['برادو', 'prado']],
  ['camry', 'تويوتا كامري', ['كامري', 'camry']],
  ['corolla', 'تويوتا كورولا', ['كورولا', 'corolla']],
  ['hilux', 'تويوتا هايلكس', ['هايلكس', 'hilux']],
  ['yaris', 'تويوتا يارس', ['يارس', 'yaris']],
  ['patrol', 'نيسان باترول', ['باترول', 'patrol']],
  ['sunny', 'نيسان سني', ['سني', 'sunny']],
  ['altima', 'نيسان التيما', ['التيما', 'altima']],
  ['tahoe', 'شيفروليه تاهو', ['تاهو', 'tahoe']],
  ['malibu', 'شيفروليه ماليبو', ['ماليبو', 'malibu']],
  ['charger', 'دوج تشارجر', ['تشارجر', 'charger']],
  ['cherokee', 'جيب شيروكي', ['شيروكي', 'cherokee']],
  ['wrangler', 'جيب رانجلر', ['رانجلر', 'wrangler']],
  ['dashing', 'جيتور داشينغ', ['داشينغ', 'dashing']],
  ['tiggo', 'شيري تيجو', ['تيجو', 'tiggo']],
  ['unik', 'شانجان يوني كي', ['يوني كي', 'uni-k', 'uni k']],
  ['mggt', 'ام جي جي تي', ['ام جي جي تي', 'mg gt']],
  ['eclass', 'مرسيدس E', ['e200', 'e300', 'e 200']],
  ['x5', 'بي ام دبليو X5', ['x5']]
];
const CAR_BRANDS = [
  ['hyundai', 'هيونداي', ['هيونداي', 'hyundai']],
  ['kia', 'كيا', ['كيا', 'kia']],
  ['toyota', 'تويوتا', ['تويوتا', 'toyota']],
  ['nissan', 'نيسان', ['نيسان', 'nissan']],
  ['chevrolet', 'شيفروليه', ['شيفروليه', 'شفروليه', 'شوفرليت', 'chevrolet']],
  ['ford', 'فورد', ['فورد', 'ford']],
  ['jeep', 'جيب', ['jeep', 'جيب شيروكي', 'جيب رانجلر', 'جيب غراند']],
  ['dodge', 'دوج', ['دوج', 'دودج', 'dodge']],
  ['mercedes', 'مرسيدس', ['مرسيدس', 'mercedes', 'بنز']],
  ['bmw', 'بي ام دبليو', ['بي ام دبليو', 'bmw']],
  ['lexus', 'لكزس', ['لكزس', 'lexus']],
  ['mg', 'ام جي', ['ام جي', 'mg']],
  ['chery', 'شيري', ['شيري', 'chery']],
  ['changan', 'شانجان', ['شانجان', 'changan']],
  ['jetour', 'جيتور', ['جيتور', 'jetour']],
  ['geely', 'جيلي', ['جيلي', 'geely']],
  ['haval', 'هافال', ['هافال', 'haval']]
];

function findKeyed(text, table) {
  for (const [key, label, terms] of table) {
    if (terms.some((t) => hasTerm(text, t))) return { key, label };
  }
  return null;
}

function detectDealType(text) {
  return /(?:^|[^؀-ۿ])(?:ل|بال)?(?:ايجار|للايجار|مؤجر|تاجير|للتاجير)(?![؀-ۿ])/.test(text) ? 'rent' : 'sale';
}

function detectPropertyType(text) {
  if (hasTerm(text, 'شقه') || hasTerm(text, 'شقق')) return 'apartment';
  if (hasTerm(text, 'ارض') || hasTerm(text, 'قطعه') || hasTerm(text, 'دونم')) return 'land';
  if (hasTerm(text, 'دار') || hasTerm(text, 'بيت') || hasTerm(text, 'فيلا') || hasTerm(text, 'مشتمل')) return 'house';
  return null;
}

const PROPERTY_LABELS = { apartment: 'شقق', land: 'أراضٍ', house: 'دور وبيوت', any: 'عقارات متنوعة' };

/** نص المطابقة الكامل للعرض (العنوان والمقتطف والكلمات المفتاحية والمواصفات). */
function offerText(offer) {
  const specs = offer.specs && typeof offer.specs === 'object' ? Object.values(offer.specs).join(' ') : '';
  return normalizeForMatch(`${offer.title || ''} ${offer.snippet || ''} ${(offer.keywords || []).join(' ')} ${specs}`);
}

/**
 * يحدد مجموعة المقارنة "المماثلة" لعرض ما. لا يُقارن عرض إلا بعروض من المجموعة نفسها.
 * - السيارات: حسب الطراز (أو الماركة) ونوع الصفقة.
 * - العقارات: حسب نوع الصفقة (بيع/إيجار) ونوع العقار.
 * - السلع: حسب عائلة المنتج، والإكسسوارات منفصلة عن الأجهزة.
 */
export function comparisonGroupFor(offer) {
  const section = offer.section || 'products';
  const text = offerText(offer);

  if (section === 'cars') {
    const deal = detectDealType(text);
    const found = findKeyed(text, CAR_MODELS) || findKeyed(text, CAR_BRANDS);
    const key = `cars|${deal}|${found ? found.key : 'other'}`;
    const label = `سيارات • ${found ? found.label : 'طرازات متنوعة'}${deal === 'rent' ? ' (إيجار)' : ''}`;
    return { key, label, section };
  }

  if (section === 'realestate') {
    const specDeal = offer.specs?.dealType ? normalizeForMatch(offer.specs.dealType) : '';
    const deal = specDeal ? detectDealType(specDeal) : detectDealType(text);
    const specType = offer.specs?.propertyType ? detectPropertyType(normalizeForMatch(offer.specs.propertyType)) : null;
    const ptype = specType || detectPropertyType(text) || 'any';
    return {
      key: `realestate|${deal}|${ptype}`,
      label: `عقارات • ${PROPERTY_LABELS[ptype]} ${deal === 'rent' ? 'للإيجار' : 'للبيع'}`,
      section
    };
  }

  const { isAccessory } = classifySection(text);
  if (isAccessory) return { key: 'products|accessory', label: 'سلع • إكسسوارات وملحقات', section: 'products' };
  const family = detectProductFamily(text);
  const familyRow = PRODUCT_FAMILIES.find(([k]) => k === family);
  return {
    key: `products|${family || 'other'}`,
    label: `سلع • ${familyRow ? familyRow[1] : 'منتجات متنوعة'}`,
    section: 'products'
  };
}

const PLAUSIBLE_RANGES = {
  products: { sale: [1_000, 150_000_000], rent: [1_000, 20_000_000] },
  cars: { sale: [1_500_000, 3_000_000_000], rent: [10_000, 50_000_000] },
  realestate: { sale: [5_000_000, 200_000_000_000], rent: [50_000, 200_000_000] },
  unknown: { sale: [1_000, 200_000_000_000], rent: [1_000, 200_000_000] }
};

/** هل السعر معقول لهذا القسم؟ يستبعد أخطاء الاستخراج الفادحة (مثل 18 ألف دينار لسيارة). */
export function isPlausiblePrice(priceIQD, section, isRent = false) {
  if (!Number.isFinite(priceIQD) || priceIQD <= 0) return false;
  const range = (PLAUSIBLE_RANGES[section] || PLAUSIBLE_RANGES.unknown)[isRent ? 'rent' : 'sale'];
  return priceIQD >= range[0] && priceIQD <= range[1];
}

// ---------------------------------------------------------------------------
// المواصفات (تُملأ فقط عند وجود دليل في النص، بلا قيم افتراضية مختلقة)
// ---------------------------------------------------------------------------

export function extractCarSpecs(rawText) {
  const text = normalizeForMatch(rawText);
  const specs = {};
  const year = text.match(/(?:^|[^\d])((?:19[89]\d|20[0-3]\d))(?!\d)/);
  if (year && Number(year[1]) <= new Date().getFullYear() + 1) specs.year = year[1];
  if (/(?:^|[^؀-ۿ])زيرو(?![؀-ۿ])|(?:^|[^\d])0\s*كم/.test(text)) specs.mileage = 'زيرو (0 كم)';
  else {
    const km = text.match(/(\d{1,3}(?:,\d{3})+|\d{1,7})\s*(?:(الف)\s*)?(كم|كيلو|ميل)/);
    if (km) {
      const n = toNumber(km[1]) * (km[2] ? 1000 : 1);
      specs.mileage = `${n.toLocaleString('en-US')} ${km[3] === 'ميل' ? 'ميل' : 'كم'}`;
    }
  }
  if (/رقم\s*(?:اربيل|شمالي)/.test(text)) specs.plate = 'رقم أربيل';
  else if (/رقم\s*بغداد/.test(text)) specs.plate = 'رقم بغداد';
  else if (/رقم\s*(?:ال)?بصره/.test(text)) specs.plate = 'رقم البصرة';
  if (/وارد\s*امريكي|امريكي/.test(text)) specs.origin = 'وارد أمريكي';
  else if (/خليجي/.test(text)) specs.origin = 'خليجي';
  else if (/وارد\s*كوري|كوري/.test(text)) specs.origin = 'وارد كوري';
  const brand = findKeyed(text, CAR_BRANDS);
  if (brand) specs.brand = brand.label;
  return specs;
}

export function extractRealEstateSpecs(rawText) {
  const text = normalizeForMatch(rawText);
  const specs = {};
  const area = text.match(/(\d{2,6})\s*(?:م2|م²|متر مربع|مترمربع|متر|م)(?![؀-ۿ])/);
  if (area) specs.areaSqm = Number(area[1]);
  if (/طابو\s*صرف/.test(text)) specs.deedType = 'طابو صرف';
  else if (/سند\s*استثماري|استثماري/.test(text)) specs.deedType = 'سند استثماري';
  else if (/زراعي/.test(text)) specs.deedType = 'زراعي';
  else if (hasTerm(text, 'طابو')) specs.deedType = 'طابو';
  specs.dealType = detectDealType(text) === 'rent' ? 'إيجار' : undefined;
  const ptype = detectPropertyType(text);
  if (ptype === 'apartment') specs.propertyType = 'شقة سكنية';
  else if (ptype === 'land') specs.propertyType = 'قطعة أرض';
  else if (ptype === 'house') specs.propertyType = 'دار سكنية';
  if (!specs.dealType) delete specs.dealType;
  return specs;
}

// ---------------------------------------------------------------------------
// الصلة بكلمات البحث
// ---------------------------------------------------------------------------

// مرادفات عربية/لاتينية للماركات والطرازات: إعلانات كثيرة تكتب "iPhone 15" والبحث بـ "ايفون 15"
const TERM_SYNONYMS = [
  ['ايفون', 'iphone'], ['ابل', 'apple'], ['سامسونج', 'سامسونك', 'samsung'], ['جالكسي', 'كالكسي', 'galaxy'],
  ['شاومي', 'xiaomi'], ['ريدمي', 'redmi'], ['هواوي', 'huawei'], ['برو', 'pro'], ['ماكس', 'max'], ['الترا', 'ultra'],
  ['بلايستيشن', 'بلاي ستيشن', 'playstation', 'ps'], ['ايربودز', 'airpods'], ['لابتوب', 'laptop'], ['لينوفو', 'lenovo'],
  ['ماك بوك', 'macbook'], ['ايباد', 'ipad'], ['شاشه', 'tv'], ['سبلت', 'سبليت', 'split'], ['جري', 'كري', 'كريي', 'gree'],
  ['هيونداي', 'hyundai'], ['كيا', 'kia'], ['تويوتا', 'toyota'], ['نيسان', 'nissan'], ['شيفروليه', 'شفروليه', 'chevrolet'],
  ['فورد', 'ford'], ['مرسيدس', 'mercedes', 'benz'], ['النترا', 'elantra'], ['سوناتا', 'sonata'], ['توسان', 'tucson'],
  ['سبورتاج', 'sportage'], ['سورينتو', 'sorento'], ['كامري', 'camry'], ['كورولا', 'corolla'],
  ['لاندكروزر', 'لاند كروزر', 'landcruiser', 'land cruiser'], ['تاهو', 'tahoe'], ['جيتور', 'jetour'], ['شيري', 'chery'],
  ['شانجان', 'changan'], ['جيلي', 'geely'], ['هافال', 'haval']
].map((group) => group.map((t) => normalizeForMatch(t)));

function synonymsOf(token) {
  const group = TERM_SYNONYMS.find((g) => g.includes(token));
  return group || [token];
}

const QUERY_STOPWORDS = new Set(['في', 'من', 'على', 'الى', 'عن', 'مع', 'او', 'سعر', 'السعر', 'للبيع', 'بيع', 'ارخص', 'افضل', 'العراق']);

export function isRelevantToQuery(query, rawText) {
  const tokens = normalizeForMatch(query)
    .split(/[\s،,]+/)
    .filter((t) => t && !QUERY_STOPWORDS.has(t) && (t.length >= 2 || /^\d+$/.test(t)));
  if (tokens.length === 0) return true;
  const hay = normalizeForMatch(rawText);

  const digitTokens = tokens.filter((t) => /^\d+$/.test(t));
  const wordTokens = tokens.filter((t) => !/^\d+$/.test(t));

  const digitsOk = digitTokens.every((t) => new RegExp(`(?:^|[^\\d])${t}(?!\\d)`).test(hay));
  if (!digitsOk) return false;

  const matchWord = (t) => {
    for (const form of synonymsOf(t)) {
      if (hay.includes(form)) return true;
      if (form.startsWith('ال') && form.length > 3 && hay.includes(form.slice(2))) return true;
    }
    return false;
  };
  const matched = wordTokens.filter(matchWord).length;
  const required = wordTokens.length >= 3 ? wordTokens.length - 1 : wordTokens.length;
  return matched >= required;
}

// ---------------------------------------------------------------------------
// الإحصاءات
// ---------------------------------------------------------------------------

/** ربيعي بالاستيفاء الخطي (الطريقة 7 المعتمدة في R و Excel QUARTILE.INC). */
function quantileSorted(sorted, p) {
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/**
 * إحصاءات دقيقة لقائمة أسعار:
 * - mean: المتوسط الحسابي لكل القيم (مجموعها ÷ عددها) ويتأثر بالقيم الشاذة.
 * - median: الوسيط، القيمة الوسطى بعد الترتيب (أو متوسط القيمتين الوسطيين للعدد الزوجي).
 * - القيم الشاذة: خارج [Q1 − 1.5×IQR ، Q3 + 1.5×IQR] وتُحسب فقط عند وجود 4 قيم فأكثر.
 */
export function computePriceStats(values) {
  const xs = values.filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  const count = xs.length;
  if (count === 0) return null;

  const sum = xs.reduce((a, b) => a + b, 0);
  const mean = sum / count;
  const mid = Math.floor(count / 2);
  const median = count % 2 === 1 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
  const q1 = quantileSorted(xs, 0.25);
  const q3 = quantileSorted(xs, 0.75);
  const iqr = q3 - q1;
  const canFlag = count >= 4;
  const lowerFence = canFlag ? q1 - 1.5 * iqr : -Infinity;
  const upperFence = canFlag ? q3 + 1.5 * iqr : Infinity;
  const inliers = xs.filter((v) => v >= lowerFence && v <= upperFence);

  return {
    count,
    min: xs[0],
    max: xs[count - 1],
    mean,
    median,
    q1,
    q3,
    iqr,
    lowerFence,
    upperFence,
    inlierCount: inliers.length,
    outlierCount: count - inliers.length,
    inlierMin: inliers[0],
    inlierMax: inliers[inliers.length - 1]
  };
}

/** أقل عدد عروض مماثلة مطلوب قبل إصدار أي حكم مقارن (أرخص/أغلى من الوسيط). */
export const MIN_COMPARABLE_OFFERS = 3;
