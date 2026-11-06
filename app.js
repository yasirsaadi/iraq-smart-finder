// ============================================================================
// دَلال العراق — النسخة المتكاملة مع الميزات العالمية الست والربط بقاعدة بيانات نيون
// ============================================================================

const IRAQ_GOVERNORATES = {
  baghdad: { name: 'بغداد', lat: 33.3152, lon: 44.3661, keywords: ['بغداد', 'المنصور', 'الكرادة', 'زيونة', 'الأعظمية', 'الكاظمية', 'الدورة', 'شارع الصناعة', 'الربيعي', 'الشورجة', 'السنك'] },
  basra: { name: 'البصرة', lat: 30.5081, lon: 47.7835, keywords: ['البصرة', 'بصرة', 'العشار', 'الجزائر', 'الجبيلة', 'الزبير', 'أبو الخصيب'] },
  erbil: { name: 'أربيل', lat: 36.1901, lon: 44.0091, keywords: ['أربيل', 'اربيل', 'عنكاوة', 'شارع 60', 'شارع 100', 'القلعة'] },
  nineveh: { name: 'نينوى (الموصل)', lat: 36.3489, lon: 43.1577, keywords: ['الموصل', 'موصل', 'نينوى', 'المجموعة الثقافية', 'الزهور'] },
  najaf: { name: 'النجف الأشرف', lat: 32.0000, lon: 44.3333, keywords: ['النجف', 'نجف', 'الكوفة', 'حي السعد', 'شارع الروان'] },
  karbala: { name: 'كربلاء المقدسة', lat: 32.6160, lon: 44.0249, keywords: ['كربلاء', 'الحسين', 'حي الحسين', 'العباس'] },
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
  tv: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=300&q=80'
};

function getProductImageUrl(offer) {
  if (offer.imageUrl) return offer.imageUrl;
  const text = `${offer.title} ${(offer.keywords || []).join(' ')}`.toLowerCase();
  if (/ايفون|آيفون|iphone/.test(text)) return PRODUCT_IMAGES.iphone;
  if (/بلاي ستيشن|ps5|playstation/.test(text)) return PRODUCT_IMAGES.ps5;
  if (/سبلت|مكيف|gree/.test(text)) return PRODUCT_IMAGES.ac;
  if (/لابتوب|لينوفو|lenovo/.test(text)) return PRODUCT_IMAGES.laptop;
  if (/ايربودز|airpods/.test(text)) return PRODUCT_IMAGES.airpods;
  if (/ماكينة قهوة|ديلونجي/.test(text)) return PRODUCT_IMAGES.coffee;
  if (/شاشة سامسونج|تلفزيون/.test(text)) return PRODUCT_IMAGES.tv;
  return null;
}

const INITIAL_OFFERS = [
  {
    id: 'ip15-1',
    title: 'آيفون 15 برو ماكس 256 جيجا تيتانيوم طبيعي - ضمان وكالة',
    category: 'هواتف ذكية',
    keywords: ['ايفون', 'آيفون', 'iphone', '15', 'برو ماكس', 'موبايل', 'ابل'],
    platform: 'facebook',
    storeName: 'معرض كلكسي المنصور للهواتف',
    verified: true,
    allowsInspection: true,
    trustRating: 4.9,
    reviewsCount: 34,
    priceIQD: 1620000,
    deliveryLocalIQD: 5000,
    deliveryNationalIQD: 8000,
    governorate: 'baghdad',
    district: 'المنصور - شارع 14 رمضان',
    delivery: 'توصيل بغداد 5,000 د.ع والمحافظات 8,000 د.ع',
    phone: '07701122334',
    snippet: 'آيفون 15 برو ماكس ذاكرة 256 جيجا نسخة الشرق الأوسط فيس تايم فعال، ضمان سنة كاملة.',
    postedAgo: 'منذ ساعتين'
  },
  {
    id: 'ip15-2',
    title: 'iPhone 15 Pro Max 256GB (جديد مختوم مع شاحن أصلي)',
    category: 'هواتف ذكية',
    keywords: ['ايفون', 'آيفون', 'iphone', '15', 'برو ماكس', 'موبايل', 'ابل'],
    platform: 'instagram',
    storeName: 'آي ستور أربيل (iStore Erbil)',
    verified: true,
    allowsInspection: true,
    trustRating: 4.8,
    reviewsCount: 28,
    priceIQD: 1585000,
    deliveryLocalIQD: 4000,
    deliveryNationalIQD: 7000,
    governorate: 'erbil',
    district: 'شارع 60 - مقابل القلعة',
    delivery: 'شحن سريع لكافة المحافظات خلال 24 ساعة',
    phone: '07504455667',
    snippet: 'أقل سعر في العراق من آي ستور أربيل: 1,585,000 د.ع شامل شاحن أصلي وكفر حماية.',
    postedAgo: 'منذ 4 ساعات'
  },
  {
    id: 'ip15-3',
    title: 'أبل آيفون 15 برو ماكس 256 جيجابايت - ضمان رسمي سنة كاملة',
    category: 'هواتف ذكية',
    keywords: ['ايفون', 'آيفون', 'iphone', '15', 'برو ماكس', 'موبايل', 'ابل'],
    platform: 'google',
    storeName: 'متجر مسواك العراقي (Miswag.iq)',
    verified: true,
    allowsInspection: true,
    trustRating: 4.9,
    reviewsCount: 112,
    priceIQD: 1690000,
    deliveryLocalIQD: 0,
    deliveryNationalIQD: 0,
    governorate: 'baghdad',
    district: 'الكرادة داخل - المركز الرئيسي',
    delivery: 'توصيل مجاني لجميع المحافظات',
    phone: '6007',
    snippet: 'متوفر على موقع مسواك الرسمي مع الدفع عند الاستلام وفحص الجهاز قبل الاستلام.',
    postedAgo: 'متوفر بالمخزن'
  },
  {
    id: 'ip15-4',
    title: 'آيفون 15 برو ماكس 256GB نظيف جداً بطارية 100% كالجديد',
    category: 'هواتف ذكية',
    keywords: ['ايفون', 'آيفون', 'iphone', '15', 'برو ماكس', 'موبايل', 'ابل'],
    platform: 'facebook',
    storeName: 'سوق البصرة المفتوح للهواتف',
    verified: false,
    allowsInspection: true,
    trustRating: 4.5,
    reviewsCount: 9,
    priceIQD: 1475000,
    deliveryLocalIQD: 3000,
    deliveryNationalIQD: 8000,
    governorate: 'basra',
    district: 'البصرة - العشار',
    delivery: 'استلام مباشر في البصرة أو شحن للمحافظات',
    phone: '07809988776',
    snippet: 'الجهاز استخدام أسبوعين فقط بطارية 100% مع الكارتون وجميع الملحقات الأصلية.',
    postedAgo: 'منذ 55 دقيقة'
  },
  {
    id: 'ps5-1',
    title: 'بلاي ستيشن 5 سليم (PS5 Slim CD) نسخة القرص 1 تيرا مع ذراعين',
    category: 'أجهزة ألعاب',
    keywords: ['بلاي', 'بلاي ستيشن', 'ps5', 'سوني', '5', 'سليم', 'العاب'],
    platform: 'facebook',
    storeName: 'مركز عالم الألعاب - بغداد الربيعي',
    verified: true,
    allowsInspection: true,
    trustRating: 4.8,
    reviewsCount: 41,
    priceIQD: 695000,
    deliveryLocalIQD: 5000,
    deliveryNationalIQD: 8000,
    governorate: 'baghdad',
    district: 'زيونة - شارع الربيعي',
    delivery: 'توصيل بغداد 5,000 د.ع والمحافظات 8,000 د.ع',
    phone: '07712345678',
    snippet: 'جهاز PS5 Slim نسخة القرص 1 تيرابايت مع ذراعين أصليتين وضمان سنة.',
    postedAgo: 'منذ 3 ساعات'
  },
  {
    id: 'ps5-2',
    title: 'Sony PlayStation 5 Slim Digital Edition - جديد بالكارتون',
    category: 'أجهزة ألعاب',
    keywords: ['بلاي', 'بلاي ستيشن', 'ps5', 'سوني', '5', 'سليم', 'العاب'],
    platform: 'instagram',
    storeName: 'كيمر زون النجف (GamerZone)',
    verified: true,
    allowsInspection: true,
    trustRating: 4.7,
    reviewsCount: 19,
    priceIQD: 635000,
    deliveryLocalIQD: 4000,
    deliveryNationalIQD: 6000,
    governorate: 'najaf',
    district: 'النجف - شارع الروان',
    delivery: 'توصيل الفرات الأوسط 4,000 د.ع وباقي المحافظات 6,000 د.ع',
    phone: '07811223344',
    snippet: 'نسخة الديجيتال سليم الجديدة سعة 1 تيرابايت بسعر تنافسي 635,000 د.ع.',
    postedAgo: 'منذ ساعة'
  },
  {
    id: 'ac-1',
    title: 'سبلت جري (GREE) 2 طن انفرتر اقتصادي 6 أمبير - أصلي',
    category: 'أجهزة منزلية',
    keywords: ['سبلت', 'جري', 'gree', 'تبريد', 'مكيف', '2 طن', 'انفرتر'],
    platform: 'facebook',
    storeName: 'معرض النهرين للأجهزة الكهربائية',
    verified: true,
    allowsInspection: true,
    trustRating: 4.9,
    reviewsCount: 53,
    priceIQD: 845000,
    deliveryLocalIQD: 0,
    deliveryNationalIQD: 15000,
    governorate: 'baghdad',
    district: 'الكرادة خارج - قرب المسرح الوطني',
    delivery: 'توصيل مجاني داخل بغداد مع أنابيب نحاس 4 متر',
    phone: '07722334455',
    snippet: 'كفالة 5 سنوات على الضاغط، نظام انفرتر اقتصادي يعمل على المولدة 6 أمبير.',
    postedAgo: 'منذ 5 ساعات'
  },
  {
    id: 'ac-2',
    title: 'سبلت GREE 2 Ton تروبيكال يتحمل درجات الحرارة العالية',
    category: 'أجهزة منزلية',
    keywords: ['سبلت', 'جري', 'gree', 'تبريد', 'مكيف', '2 طن', 'انفرتر'],
    platform: 'instagram',
    storeName: 'البصرة للتبريد والأجهزة المنزلية',
    verified: true,
    allowsInspection: true,
    trustRating: 4.8,
    reviewsCount: 27,
    priceIQD: 815000,
    deliveryLocalIQD: 0,
    deliveryNationalIQD: 15000,
    governorate: 'basra',
    district: 'البصرة - الجزائر',
    delivery: 'توصيل مجاني في البصرة وشحن للمحافظات',
    phone: '07822334499',
    snippet: 'سبلت جري 2 طن أصلي بسعر الجملة 815,000 د.ع مع ضمان الوكالة.',
    postedAgo: 'منذ 3 ساعات'
  },
  {
    id: 'lap-1',
    title: 'لابتوب Lenovo LOQ 15 للألعاب والهندسة Core i7 الجيل 13 + RTX 4050',
    category: 'حاسبات محمولة',
    keywords: ['لابتوب', 'لينوفو', 'lenovo', 'loq', 'حاسبة', 'كمبيوتر', 'كيمينج'],
    platform: 'google',
    storeName: 'شركة النبأ للحاسبات - شارع الصناعة',
    verified: true,
    allowsInspection: true,
    trustRating: 4.9,
    reviewsCount: 86,
    priceIQD: 1125000,
    deliveryLocalIQD: 0,
    deliveryNationalIQD: 0,
    governorate: 'baghdad',
    district: 'بغداد - شارع الصناعة',
    delivery: 'توصيل مجاني لجميع محافظات العراق مع حقيبة وماوس',
    phone: '07700011122',
    snippet: 'الذاكرة 16GB DDR5، التخزين 512GB NVMe، بطاقة الرسوميات RTX 4050 6GB، شاشة 144Hz.',
    postedAgo: 'متوفر بالموقع'
  },
  {
    id: 'lap-2',
    title: 'Lenovo LOQ Gaming i7-13620H / RTX 4050 - جديد بالكارتون',
    category: 'حاسبات محمولة',
    keywords: ['لابتوب', 'لينوفو', 'lenovo', 'loq', 'حاسبة', 'كمبيوتر', 'كيمينج'],
    platform: 'facebook',
    storeName: 'مكتب الموصل تكنولوجي للحاسبات',
    verified: true,
    allowsInspection: true,
    trustRating: 4.8,
    reviewsCount: 22,
    priceIQD: 1080000,
    deliveryLocalIQD: 3000,
    deliveryNationalIQD: 5000,
    governorate: 'nineveh',
    district: 'الموصل - المجموعة الثقافية',
    delivery: 'توصيل داخل الموصل 3,000 د.ع وباقي المحافظات 5,000 د.ع',
    phone: '07733445566',
    snippet: 'عرض خاص لطلبة الهندسة والمصممين بسعر 1,080,000 د.ع شامل الضمان.',
    postedAgo: 'منذ ساعتين'
  },
  {
    id: 'air-1',
    title: 'سماعة Apple AirPods Pro 2 منفذ تايب سي الأصلية ضمان أبل',
    category: 'صوتيات وملحقات',
    keywords: ['سماعة', 'ايربودز', 'airpods', 'برو', 'ابل'],
    platform: 'instagram',
    storeName: 'بغداد ستور (Baghdad Store)',
    verified: true,
    allowsInspection: true,
    trustRating: 4.7,
    reviewsCount: 18,
    priceIQD: 315000,
    deliveryLocalIQD: 4000,
    deliveryNationalIQD: 6000,
    governorate: 'baghdad',
    district: 'بغداد - المنصور',
    delivery: 'توصيل بغداد 4,000 د.ع والمحافظات 6,000 د.ع',
    phone: '07719988771',
    snippet: 'نسخة أصلية وكالة مع إمكانية فحص الرقم التسلسلي في موقع أبل قبل الاستلام.',
    postedAgo: 'منذ ساعة'
  },
  {
    id: 'cof-1',
    title: 'ماكينة قهوة وإسبريسو ديلونجي ديديكا DeLonghi Dedica EC685',
    category: 'أجهزة مطبخ',
    keywords: ['ماكينة', 'قهوة', 'ديلونجي', 'اسبريسو', 'كوفي'],
    platform: 'facebook',
    storeName: 'بيت القهوة العراقي - الكرادة',
    verified: true,
    allowsInspection: true,
    trustRating: 4.9,
    reviewsCount: 31,
    priceIQD: 235000,
    deliveryLocalIQD: 0,
    deliveryNationalIQD: 5000,
    governorate: 'baghdad',
    district: 'الكرادة داخل',
    delivery: 'توصيل مجاني داخل بغداد مع بن إيطالي هدية',
    phone: '07705544332',
    snippet: 'ماكينة ديلونجي ديديكا الأصلية ضغط 15 بار لتحضير الإسبريسو والكابتشينو.',
    postedAgo: 'منذ 4 ساعات'
  },
  {
    id: 'tv-1',
    title: 'شاشة سامسونج سمارت 55 بوصة 4K Crystal UHD ضمان سنتين',
    category: 'شاشات وتلفزيونات',
    keywords: ['شاشة', 'تلفزيون', 'سامسونج', '55', 'سمارت', '4k'],
    platform: 'facebook',
    storeName: 'معرض الشروق للشاشات - الحلة',
    verified: true,
    allowsInspection: true,
    trustRating: 4.8,
    reviewsCount: 24,
    priceIQD: 540000,
    deliveryLocalIQD: 5000,
    deliveryNationalIQD: 10000,
    governorate: 'babil',
    district: 'بابل - الحلة شارع 40',
    delivery: 'توصيل لبابل وكربلاء والنجف وبغداد والديوانية',
    phone: '07804433221',
    snippet: 'شاشة سامسونج 55 بوصة أصلية مع قاعدة جدارية هدية وضمان لمدة سنتين.',
    postedAgo: 'منذ 3 ساعات'
  }
];

const state = {
  offers: [...INITIAL_OFFERS],
  liveOffers: [],
  alerts: [],
  isSearchingLive: false,
  query: '',
  adComparisonPrice: null,
  selectedGov: 'baghdad',
  maxBudget: null,
  selectedPlatform: 'all',
  sortBy: 'smart',
  includeDelivery: true,
  sameCityOnly: false,
  exchangeRate100USD: 150000,
  isSubscribed: Boolean(localStorage.getItem('dalal_vip_phone'))
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
  const formatted = Math.round(amountIQD).toLocaleString('en-US');
  return `${formatted} د.ع`;
}

function convertIQDtoUSD(amountIQD) {
  if (!amountIQD || amountIQD <= 0) return '';
  const usd = (amountIQD / state.exchangeRate100USD) * 100;
  return `يعادل ${Math.round(usd)} دولار`;
}

// حساب كلفة التوصيل الفعلية لمحافظة المشتري
function getDeliveryFeeForUser(offer) {
  if (/مجاني/.test(offer.delivery || '') && (offer.governorate === state.selectedGov || /لجميع المحافظات/.test(offer.delivery || ''))) {
    return 0;
  }
  if (offer.governorate === state.selectedGov) {
    return typeof offer.deliveryLocalIQD === 'number' ? offer.deliveryLocalIQD : 4000;
  }
  return typeof offer.deliveryNationalIQD === 'number' ? offer.deliveryNationalIQD : 7000;
}

function parseIraqiPostText(rawText) {
  const text = normalizeDigits(rawText);
  const ratePer1USD = state.exchangeRate100USD / 100;

  let extractedPriceIQD = null;

  const daftarMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:دفتر|دفاتر)/);
  const warqaMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:ورقة|ورقات|اوراق|أوراق)/);

  if (daftarMatch) {
    let usd = parseFloat(daftarMatch[1]) * 10000;
    const extraWarqa = text.match(/و\s*(\d+)\s*(?:ورقة|أوراق|اوراق)/);
    if (extraWarqa) usd += parseFloat(extraWarqa[1]) * 100;
    extractedPriceIQD = Math.round(usd * ratePer1USD);
  } else if (text.includes('ورقتين')) {
    extractedPriceIQD = Math.round(200 * ratePer1USD);
  } else if (text.includes('ورقة ونص')) {
    extractedPriceIQD = Math.round(150 * ratePer1USD);
  } else if (warqaMatch) {
    let usd = parseFloat(warqaMatch[1]) * 100;
    if (text.includes('ونص')) usd += 50;
    extractedPriceIQD = Math.round(usd * ratePer1USD);
  }

  if (!extractedPriceIQD) {
    const millionMatch = text.match(/(\d[\d,]*)\s*(?:دينار|د\.ع)/);
    const alfMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:الف|ألف|آلاف)/);
    const usdSymbolMatch = text.match(/(?:\$\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:\$|دولار))/);

    if (millionMatch) {
      const cleanNum = parseFloat(millionMatch[1].replace(/,/g, ''));
      extractedPriceIQD = cleanNum < 2000 ? cleanNum * 1000 : cleanNum;
    } else if (alfMatch) {
      const val = parseFloat(alfMatch[1]);
      extractedPriceIQD = val < 2000 ? val * 1000 : val;
    } else if (usdSymbolMatch) {
      const usdVal = parseFloat(usdSymbolMatch[1] || usdSymbolMatch[2]);
      extractedPriceIQD = Math.round(usdVal * ratePer1USD);
    }
  }

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

  const phoneMatch = text.match(/(07[5789]\d{8})/);
  const phone = phoneMatch ? phoneMatch[1] : 'تواصل عبر الصفحة';

  return {
    priceIQD: extractedPriceIQD,
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
      `/api/live-search?q=${encodeURIComponent(cleanQuery)}&gov=${encodeURIComponent(state.selectedGov)}`,
      { signal: activeSearchController.signal }
    );
    const data = await res.json();
    if (data && Array.isArray(data.offers)) {
      state.liveOffers = data.offers;
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
  const q = state.query.trim() || 'عروض الإلكترونيات والأجهزة';
  const govName = IRAQ_GOVERNORATES[state.selectedGov].name.split(' ')[0];

  document.getElementById('deepLinkQueryTitle').textContent = q;
  document.getElementById('activeLocationBadge').textContent = `المحافظة: ${IRAQ_GOVERNORATES[state.selectedGov].name}`;

  const fbSearchQuery = encodeURIComponent(`${q} ${govName} السعر`);
  document.getElementById('fbMarketplaceLink').href = `https://www.facebook.com/search/posts/?q=${fbSearchQuery}`;

  const igGoogleDork = encodeURIComponent(`site:instagram.com "${q}" ("${govName}" OR "العراق" OR "توصيل" OR "السعر")`);
  document.getElementById('igShopsLink').href = `https://www.google.com/search?q=${igGoogleDork}`;

  const ggQuery = encodeURIComponent(`${q} السعر في العراق ${govName} د.ع`);
  document.getElementById('googleStoresLink').href = `https://www.google.com/search?q=${ggQuery}`;
}

function buildOfferDirectUrl(offer) {
  if (offer.directUrl) return offer.directUrl;
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
  const combinedSource = query ? [...localMatches, ...state.liveOffers] : [...state.offers];

  let filtered = combinedSource.map((offer) => {
    const distanceKm = calculateDistanceKm(state.selectedGov, offer.governorate);
    const deliveryFeeIQD = getDeliveryFeeForUser(offer);
    const hasPrice = Boolean(offer.priceIQD && offer.priceIQD > 0);
    const effectivePriceIQD = hasPrice
      ? state.includeDelivery
        ? offer.priceIQD + deliveryFeeIQD
        : offer.priceIQD
      : null;

    return {
      ...offer,
      distanceKm,
      deliveryFeeIQD,
      effectivePriceIQD
    };
  });

  filtered = filtered.filter((offer) => {
    if (state.maxBudget && offer.effectivePriceIQD && offer.effectivePriceIQD > state.maxBudget) return false;
    if (state.sameCityOnly && offer.governorate !== state.selectedGov) return false;
    return true;
  });

  if (filtered.length === 0) return { allFiltered: [], finalDisplayed: [], stats: null };

  const pricedOffers = filtered.filter((o) => o.effectivePriceIQD && o.effectivePriceIQD > 0);
  const prices = pricedOffers.map((o) => o.effectivePriceIQD);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const avgPrice = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;

  const distances = filtered.map((o) => o.distanceKm);
  const minDist = Math.min(...distances);
  const maxDist = Math.max(...distances);

  filtered = filtered.map((offer) => {
    const hasPrice = Boolean(offer.effectivePriceIQD && offer.effectivePriceIQD > 0);
    const priceNorm = !hasPrice
      ? 0.65
      : maxPrice === minPrice
        ? 0
        : (offer.effectivePriceIQD - minPrice) / (maxPrice - minPrice);
    const distNorm = maxDist === minDist ? 0 : (offer.distanceKm - minDist) / (maxDist - minDist);

    const smartPenalty = priceNorm * 0.6 + distNorm * 0.4;
    const smartScore = Math.round((1 - smartPenalty) * 100);
    const savingIQD = hasPrice ? Math.max(0, Math.round(avgPrice - offer.effectivePriceIQD)) : 0;
    const isOverpriced = hasPrice && prices.length > 1 && offer.effectivePriceIQD > avgPrice * 1.08;

    return {
      ...offer,
      smartScore,
      savingIQD,
      isCheapest: hasPrice && offer.effectivePriceIQD === minPrice,
      isNearest: offer.distanceKm === minDist,
      isOverpriced
    };
  });

  const maxSmartScore = Math.max(...filtered.map((o) => o.smartScore));
  filtered = filtered.map((offer) => ({
    ...offer,
    isBestSmart: offer.smartScore === maxSmartScore
  }));

  const allFiltered = [...filtered];

  let finalDisplayed =
    state.selectedPlatform === 'all'
      ? filtered
      : filtered.filter((o) => o.platform === state.selectedPlatform);

  finalDisplayed.sort((a, b) => {
    const aHasPrice = Boolean(a.effectivePriceIQD && a.effectivePriceIQD > 0);
    const bHasPrice = Boolean(b.effectivePriceIQD && b.effectivePriceIQD > 0);

    if (state.sortBy === 'cheapest') {
      if (aHasPrice !== bHasPrice) return aHasPrice ? -1 : 1;
      return (a.effectivePriceIQD || 0) - (b.effectivePriceIQD || 0) || a.distanceKm - b.distanceKm;
    }
    if (state.sortBy === 'nearest') {
      return a.distanceKm - b.distanceKm || (a.effectivePriceIQD || 999999999) - (b.effectivePriceIQD || 999999999);
    }
    if (aHasPrice !== bHasPrice) return aHasPrice ? -1 : 1;
    return b.smartScore - a.smartScore || (a.effectivePriceIQD || 0) - (b.effectivePriceIQD || 0);
  });

  return {
    allFiltered,
    finalDisplayed,
    stats: prices.length ? { minPrice, avgPrice, maxPrice } : null
  };
}

function getPlatformName(platform) {
  if (platform === 'facebook') return 'فيسبوك';
  if (platform === 'instagram') return 'انستغرام';
  return 'متاجر كوكل';
}

// فتح نافذة تقييم المتجر وسجل الموثوقية
window.openStoreReviewModal = async function (storeName) {
  const modal = document.getElementById('reviewModal');
  document.getElementById('reviewStoreNameInput').value = storeName;
  document.getElementById('reviewModalStoreTitle').textContent = `سجل الموثوقية وتجارب المشترين مع: ${storeName}`;
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
      box.innerHTML = '<div class="alert-row">لا توجد تقييمات سابقة مسجلة لهذا المتجر حتى الآن. كن أول من يقيمه!</div>';
      return;
    }
    box.innerHTML = reviews
      .map(
        (r) => `
        <div class="alert-row">
          <div>
            <strong>${'★'.repeat(r.rating)} (${r.allows_inspection ? 'يقبل الفحص عند الاستلام' : 'رفض الفحص'})</strong>
            <div style="color:var(--text-body); margin-top:2px;">${r.comment}</div>
          </div>
          <span style="font-size:0.72rem; color:var(--text-muted);">${IRAQ_GOVERNORATES[r.reviewer_gov]?.name || 'العراق'}</span>
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

  const { allFiltered, finalDisplayed, stats } = getProcessedOffers();

  document.getElementById('countAll').textContent = allFiltered.length;
  document.getElementById('countFb').textContent = allFiltered.filter((o) => o.platform === 'facebook').length;
  document.getElementById('countIg').textContent = allFiltered.filter((o) => o.platform === 'instagram').length;
  document.getElementById('countGg').textContent = allFiltered.filter((o) => o.platform === 'google').length;

  // تحديث مؤشر السعر العادل وكاشف الغلاء
  if (stats) {
    document.getElementById('meterMinPrice').textContent = formatIQD(stats.minPrice);
    document.getElementById('meterAvgPrice').textContent = formatIQD(stats.avgPrice);
    document.getElementById('meterMaxPrice').textContent = formatIQD(stats.maxPrice);
    const diff = stats.maxPrice - stats.minPrice;
    document.getElementById('meterMaxDiffNote').textContent =
      diff > 0 ? `أغلى من أقل سعر بمقدار ${formatIQD(diff)}` : 'السعر موحد في السوق';

    // إذا كان المستخدم يبحث عبر لقطة شاشة لإعلان ممول وأدخل سعر الإعلان، نعرض له كم وفر!
    if (state.adComparisonPrice && state.adComparisonPrice > stats.minPrice) {
      const savedFromAd = state.adComparisonPrice - stats.minPrice;
      const banner = document.getElementById('searchStatusBanner');
      banner.hidden = false;
      banner.textContent = `نتيجة فحص الإعلان الممول: وجدنا لك نفس السلعة بسعر ${formatIQD(stats.minPrice)}، أي أنك وفرت ${formatIQD(savedFromAd)} مقارنة بسعر الإعلان الممول!`;
    }
  } else {
    document.getElementById('meterMinPrice').textContent = '—';
    document.getElementById('meterAvgPrice').textContent = '—';
    document.getElementById('meterMaxPrice').textContent = '—';
    document.getElementById('meterMaxDiffNote').textContent = 'ابحث عن سلعة مسعرة للمقارنة';
  }

  const pricedFiltered = allFiltered.filter((o) => o.effectivePriceIQD && o.effectivePriceIQD > 0);

  if (allFiltered.length > 0) {
    const cheapest = pricedFiltered.length
      ? [...pricedFiltered].sort((a, b) => a.effectivePriceIQD - b.effectivePriceIQD)[0]
      : allFiltered[0];
    const nearest = [...allFiltered].sort((a, b) => a.distanceKm - b.distanceKm || (a.effectivePriceIQD || 999999999) - (b.effectivePriceIQD || 999999999))[0];
    const smartest = [...allFiltered].sort((a, b) => b.smartScore - a.smartScore)[0];

    document.getElementById('bestPriceTitle').textContent = cheapest.title;
    document.getElementById('bestPriceValue').textContent = formatIQD(cheapest.effectivePriceIQD);
    document.getElementById('bestPricePlatform').textContent = `${getPlatformName(cheapest.platform)} • ${IRAQ_GOVERNORATES[cheapest.governorate].name}`;

    document.getElementById('nearestItemTitle').textContent = nearest.title;
    document.getElementById('nearestItemDistance').textContent =
      nearest.distanceKm === 0
        ? `داخل محافظتك (${IRAQ_GOVERNORATES[nearest.governorate].name})`
        : `يبعد ${nearest.distanceKm} كم (${IRAQ_GOVERNORATES[nearest.governorate].name})`;
    document.getElementById('nearestItemPrice').textContent = formatIQD(nearest.effectivePriceIQD);

    document.getElementById('smartMatchTitle').textContent = smartest.title;
    document.getElementById('smartMatchMeta').textContent = `${formatIQD(smartest.effectivePriceIQD)} • ${IRAQ_GOVERNORATES[smartest.governorate].name}`;
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
        <h3 style="margin-bottom: 8px; color: var(--brand-primary);">جاري البحث الحي في فيسبوك وانستغرام ومتاجر العراق عن "${state.query}"...</h3>
        <p style="color: var(--text-muted); font-size: 0.88rem;">
          يتم الآن فحص الصفحات والمتاجر العراقية واستخراج الروابط والصور والأسعار الحقيقية.
        </p>
      </div>
    `;
    return;
  }

  if (finalDisplayed.length === 0) {
    grid.innerHTML = `
      <div class="product-card" style="grid-column: 1 / -1; text-align: center; padding: 36px;">
        <h3 style="margin-bottom: 6px;">لم يتم العثور على منشورات مفهرسة مباشرة لهذه العبارة</h3>
        <p style="color: var(--text-muted); font-size: 0.88rem;">
          اضغط على أحد أزرار "البحث الحي في المنصات المفتوحة" أعلاه لفتح نتائج فيسبوك أو انستغرام أو كوكل مباشرة.
        </p>
      </div>
    `;
    return;
  }

  grid.innerHTML = finalDisplayed
    .map((offer) => {
      const govName = IRAQ_GOVERNORATES[offer.governorate]?.name || offer.governorate;
      const distText =
        offer.distanceKm === 0
          ? 'متوفر داخل محافظتك'
          : `يبعد ${offer.distanceKm} كم عن محافظتك`;
      const directUrl = buildOfferDirectUrl(offer);
      const imgUrl = getProductImageUrl(offer);
      const usdText = convertIQDtoUSD(offer.effectivePriceIQD);
      const safeStoreName = String(offer.storeName || 'متجر').replace(/'/g, '');

      const thumbHtml = imgUrl
        ? `<img src="${imgUrl}" alt="${offer.title}" class="product-thumb-img" loading="lazy" onerror="this.style.display='none'" />`
        : `<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#9ca3af" stroke-width="1.6">
             <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
             <path d="M3 6h18"></path>
             <path d="M16 10a4 4 0 0 1-8 0"></path>
           </svg>`;

      let deliveryBreakdownHtml = '';
      if (offer.priceIQD && offer.priceIQD > 0) {
        if (state.includeDelivery) {
          deliveryBreakdownHtml =
            offer.deliveryFeeIQD === 0
              ? `<span class="delivery-breakdown">السعر الصافي واصل لباب البيت (توصيل مجاني)</span>`
              : `<span class="delivery-breakdown">السعر الصافي واصل لباب البيت (السلعة ${formatIQD(offer.priceIQD)} + توصيل ${formatIQD(offer.deliveryFeeIQD)})</span>`;
        } else {
          deliveryBreakdownHtml = `<span class="delivery-breakdown">سعر السلعة فقط (التوصيل لمحافظتك: ${offer.deliveryFeeIQD === 0 ? 'مجاني' : formatIQD(offer.deliveryFeeIQD)})</span>`;
        }
      }

      return `
      <article class="product-card ${offer.isCheapest ? 'is-cheapest' : ''}">
        <div class="card-source-bar">
          <div class="source-identity">
            <span class="platform-chip chip-${offer.platform}">
              ${getPlatformName(offer.platform)}
            </span>
            <span class="seller-name">${offer.storeName}</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <button type="button" class="trust-rate-btn" onclick="window.openStoreReviewModal('${safeStoreName}')" title="عرض وإضافة تقييمات المتجر">
              ★ ${offer.trustRating || '4.8'} (${offer.reviewsCount || 12})
            </button>
            <span class="post-time">${offer.postedAgo}</span>
          </div>
        </div>

        <div class="card-body">
          <div class="product-top-row">
            <div class="product-thumb-wrap">
              ${thumbHtml}
            </div>

            <div class="product-heading-col">
              <div class="card-ribbons">
                ${offer.isCheapest ? '<span class="ribbon-tag ribbon-cheapest">سعر لقطة (الأقل بالعراق)</span>' : ''}
                ${offer.isNearest ? '<span class="ribbon-tag ribbon-nearest">الأقرب لمحافظتك</span>' : ''}
                ${offer.isBestSmart ? '<span class="ribbon-tag ribbon-smart">الترشيح الأفضل</span>' : ''}
                ${offer.isOverpriced ? '<span class="ribbon-tag ribbon-overpriced">أغلى من متوسط السوق</span>' : ''}
              </div>
              <h3 class="product-title">${offer.title}</h3>
            </div>
          </div>

          <p class="seller-description">${offer.snippet}</p>

          <div class="trust-and-inspection-row">
            ${
              offer.allowsInspection !== false
                ? `<span class="inspection-pill">✔ يقبل فتح وفحص الطلب أمام المندوب</span>`
                : `<span class="inspection-pill" style="background:#fef2f2; color:#991b1b; border-color:#fecaca;">تحقق من شروط الفحص قبل الدفع</span>`
            }
            <button type="button" class="overview-jump" style="background:none; border:none; cursor:pointer;" onclick="window.openStoreReviewModal('${safeStoreName}')">
              تقييم المتجر أو الإبلاغ
            </button>
          </div>

          <div class="logistics-grid">
            <div class="logistics-item">
              <svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>${govName} (${offer.district})</span>
            </div>

            <div class="logistics-item">
              <span class="distance-badge ${offer.distanceKm === 0 ? 'in-same-city' : ''}">${distText}</span>
            </div>
          </div>
        </div>

        <div class="card-footer-box">
          <div class="price-block">
            <div class="price-main-row">
              <span class="price-iqd" style="${!offer.effectivePriceIQD ? 'font-size:0.92rem; color:var(--brand-primary);' : ''}">${formatIQD(offer.effectivePriceIQD)}</span>
              ${usdText ? `<span class="price-usd">(${usdText})</span>` : ''}
            </div>
            ${deliveryBreakdownHtml}
            ${
              offer.savingIQD > 5000
                ? `<span class="saving-note">أوفر بـ ${formatIQD(offer.savingIQD)} من متوسط السوق</span>`
                : ''
            }
          </div>

          <div class="card-cta-group">
            ${
              offer.phone && offer.phone.startsWith('07')
                ? `<button
                    type="button"
                    class="btn-copy-phone"
                    onclick="navigator.clipboard?.writeText('${offer.phone}'); this.textContent='تم النسخ'"
                    title="نسخ رقم الهاتف"
                  >
                    <svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                    <span>${offer.phone}</span>
                  </button>`
                : ''
            }

            <a href="${directUrl}" target="_blank" rel="noopener noreferrer" class="btn-open-offer">
              <span>فتح المصدر</span>
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

// إدارة رادار تنبيهات هبوط الأسعار
async function loadPriceAlerts() {
  try {
    const res = await fetch('/api/alerts');
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
    box.innerHTML = '<div class="alert-row">لا توجد تنبيهات نشطة حالياً. أضف سلعة ليراقبها الرادار لك!</div>';
    return;
  }
  box.innerHTML = state.alerts
    .map(
      (a) => `
      <div class="alert-row">
        <div>
          <strong>${a.keyword}</strong> — السعر المطلوب: <span style="color:var(--brand-primary); font-weight:700;">${formatIQD(a.targetPriceIQD)}</span>
          <div style="font-size:0.73rem; color:var(--text-muted);">المحافظة: ${IRAQ_GOVERNORATES[a.governorate]?.name || a.governorate} • التنبيه عبر: ${a.contactChannel === 'whatsapp' ? 'واتساب' : 'تليغرام'} (${a.contactPhone})</div>
        </div>
        <button type="button" class="btn-secondary" style="padding:3px 8px; font-size:0.74rem;" onclick="window.deleteAlert(${a.id})">حذف</button>
      </div>
    `
    )
    .join('');
}

window.deleteAlert = async function (id) {
  await fetch(`/api/alerts/${id}`, { method: 'DELETE' }).catch(() => {});
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
  // التحويل التلقائي والفوري لأي أرقام عربية أو شرقية إلى إنجليزية أثناء الكتابة
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

  // تحديث حالة زر الاشتراك إذا كان مشتركاً
  const subBtn = document.getElementById('openSubscriptionBtn');
  const subBtnLabel = document.getElementById('subscriptionBtnLabel');
  if (state.isSubscribed) {
    subBtn.classList.add('is-subscribed');
    subBtnLabel.textContent = 'عضوية التوفير المفعلة ✓';
  }

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
    btn.addEventListener('click', () => {
      const q = btn.getAttribute('data-query');
      searchInput.value = q;
      clearQueryBtn.hidden = false;
      state.query = q;
      state.adComparisonPrice = null;
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

  document.getElementById('jumpToCheapestBtn').addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector('[data-sort="cheapest"]').click();
    document.getElementById('resultsGrid').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  document.getElementById('jumpToNearestBtn').addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector('[data-sort="nearest"]').click();
    document.getElementById('resultsGrid').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  document.getElementById('jumpToSmartBtn').addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector('[data-sort="smart"]').click();
    document.getElementById('resultsGrid').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ضبط ارتفاع الهيدر الثابت تلقائياً ليبقى الشريط العلوي ثابتاً دائماً دون أن يغطي المحتوى
  const siteHeader = document.querySelector('.site-header');
  function syncFixedHeaderHeight() {
    if (siteHeader) {
      document.documentElement.style.setProperty('--header-height', `${siteHeader.offsetHeight}px`);
    }
  }
  syncFixedHeaderHeight();
  window.addEventListener('resize', syncFixedHeaderHeight);

  document.getElementById('detectLocationBtn').addEventListener('click', detectUserGovernorateByGPS);

  // 1. نافذة بوابة التجار ومحلل المنشورات
  const analyzerModal = document.getElementById('analyzerModal');
  document.getElementById('openAnalyzerBtn').addEventListener('click', () => analyzerModal.showModal());
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
    document.getElementById('postPlatformSelect').value = 'instagram';
    document.getElementById('postStoreName').value = 'معرض أربيل للإلكترونيات';
    postRawText.value =
      'عرض خاص اليوم فقط آيفون 15 برو ماكس 256 جيجا جديد غير مفتوح السعر 10 أوراق فقط، العنوان أربيل عنكاوة ويوجد توصيل سريع لكافة المحافظات للاستفسار 07501239876';
    updateAnalyzerPreview();
  });

  document.getElementById('analyzerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const platform = document.getElementById('postPlatformSelect').value;
    const storeName = document.getElementById('postStoreName').value.trim();
    const rawText = postRawText.value.trim();
    const deliveryLocalIQD = Number(document.getElementById('postDeliveryLocal').value || 4000);
    const deliveryNationalIQD = Number(document.getElementById('postDeliveryNational').value || 7000);
    const allowsInspection = document.getElementById('postAllowsInspection').checked;
    const parsed = parseIraqiPostText(rawText);

    const newOffer = {
      id: `custom-${Date.now()}`,
      title: rawText.slice(0, 65) + (rawText.length > 65 ? '...' : ''),
      category: 'عروض التجار',
      keywords: rawText.split(/\s+/),
      platform,
      storeName,
      verified: true,
      allowsInspection,
      trustRating: 4.9,
      reviewsCount: 1,
      priceIQD: parsed.priceIQD,
      deliveryLocalIQD,
      deliveryNationalIQD,
      governorate: parsed.governorate,
      district: parsed.district,
      delivery: `توصيل داخل المحافظة ${formatIQD(deliveryLocalIQD)} وللمحافظات ${formatIQD(deliveryNationalIQD)}`,
      phone: parsed.phone,
      snippet: rawText,
      postedAgo: 'أضيف الآن'
    };

    state.offers.unshift(newOffer);
    state.query = '';
    searchInput.value = '';
    analyzerModal.close();
    renderApp();

    fetch('/api/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOffer)
    }).catch(() => {});
  });

  // 2. نافذة رادار صيد اللقطات وتنبيهات هبوط الأسعار
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

    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword,
        targetPriceIQD,
        governorate: state.selectedGov,
        contactPhone,
        contactChannel
      })
    }).catch(() => {});

    document.getElementById('radarKeywordInput').value = '';
    document.getElementById('radarTargetPriceInput').value = '';
    await loadPriceAlerts();
  });

  // 3. نافذة البحث بصورة الإعلان الممول
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

    // استخراج ذكي مبدئي من اسم الملف إذا كان يحتوي على نص واضح
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

  // 4. نافذة تقييم المتجر وسجل الموثوقية
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

  // 5. نافذة اشتراك الألف دينار العراقي الشهري
  const subscriptionModal = document.getElementById('subscriptionModal');
  subBtn.addEventListener('click', () => subscriptionModal.showModal());
  document.getElementById('closeSubscriptionBtn').addEventListener('click', () => subscriptionModal.close());

  document.getElementById('subscriptionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = document.getElementById('subPhoneInput').value.trim();
    const paymentMethod = document.getElementById('subPaymentMethod').value;

    await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, paymentMethod })
    }).catch(() => {});

    localStorage.setItem('dalal_vip_phone', phone);
    state.isSubscribed = true;
    subBtn.classList.add('is-subscribed');
    subBtnLabel.textContent = 'عضوية التوفير المفعلة ✓';
    subscriptionModal.close();

    const banner = document.getElementById('searchStatusBanner');
    banner.hidden = false;
    banner.textContent = `تم تفعيل عضوية المتسوق الذكي بنجاح للرقم ${phone} — جميع ميزات الرادار والبحث الحي مفعلة بالكامل!`;
  });

  // تحميل البيانات من نيون عند بدء التشغيل
  fetch('/api/offers')
    .then((r) => r.json())
    .then((data) => {
      if (data && Array.isArray(data.offers) && data.offers.length > 0) {
        const existingIds = new Set(data.offers.map((o) => o.id));
        const localOnly = state.offers.filter((o) => !existingIds.has(o.id));
        state.offers = [...data.offers, ...localOnly];
        renderApp();
      }
    })
    .catch(() => {});

  loadPriceAlerts();
  renderApp();
});
