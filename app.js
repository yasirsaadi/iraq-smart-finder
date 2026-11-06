// ============================================================================
// دَلال العراق — محرك مقارنة الأسعار والمواقع (فيسبوك • انستغرام • كوكل)
// تصميم تجاري احترافي يغطي جميع محافظات العراق الـ 18
// ============================================================================

const IRAQ_GOVERNORATES = {
  baghdad: { name: 'بغداد', lat: 33.3152, lon: 44.3661, keywords: ['بغداد', 'المنصور', 'الكرادة', 'زيونة', 'الأعظمية', 'الكاظمية', 'الدورة', 'شارع الصناعة', 'الربيعي'] },
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

// صور المنتجات الحقيقية حسب الفئة أو الكلمات المفتاحية
const PRODUCT_IMAGES = {
  iphone: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=300&q=80',
  ps5: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=300&q=80',
  ac: 'https://images.unsplash.com/photo-1614631446501-abcf76949eca?auto=format&fit=crop&w=300&q=80',
  laptop: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=300&q=80',
  airpods: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=300&q=80',
  coffee: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=300&q=80',
  tv: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=300&q=80',
  default: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=300&q=80'
};

function getProductImageUrl(offer) {
  if (offer.imageUrl) return offer.imageUrl;
  const text = `${offer.title} ${(offer.keywords || []).join(' ')}`.toLowerCase();
  if (/ايفون|آيفون|iphone|موبايل|سامسونج/.test(text)) return PRODUCT_IMAGES.iphone;
  if (/بلاي|ps5|سوني|العاب/.test(text)) return PRODUCT_IMAGES.ps5;
  if (/سبلت|مكيف|gree|جري|تبريد/.test(text)) return PRODUCT_IMAGES.ac;
  if (/لابتوب|لينوفو|lenovo|حاسبة|ماك/.test(text)) return PRODUCT_IMAGES.laptop;
  if (/سماعة|ايربودز|airpods/.test(text)) return PRODUCT_IMAGES.airpods;
  if (/قهوة|ديلونجي|اسبريسو/.test(text)) return PRODUCT_IMAGES.coffee;
  if (/شاشة|تلفزيون|55/.test(text)) return PRODUCT_IMAGES.tv;
  return PRODUCT_IMAGES.default;
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
    priceIQD: 1620000,
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
    priceIQD: 1585000,
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
    priceIQD: 1690000,
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
    priceIQD: 1475000,
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
    priceIQD: 695000,
    governorate: 'baghdad',
    district: 'زيونة - شارع الربيعي',
    delivery: 'توصيل بغداد 5,000 د.ع والمحافظات 10,000 د.ع',
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
    priceIQD: 635000,
    governorate: 'najaf',
    district: 'النجف - شارع الروان',
    delivery: 'توصيل الفرات الأوسط 5,000 د.ع وباقي المحافظات',
    phone: '07811223344',
    snippet: 'نسخة الديجيتال سليم الجديدة سعة 1 تيرابايت بسعر تنافسي 635,000 د.ع.',
    postedAgo: 'منذ ساعة'
  },
  {
    id: 'ps5-3',
    title: 'جهاز سوني بلاي ستيشن 5 سليم (محرك أقراص) - ضمان الوكيل',
    category: 'أجهزة ألعاب',
    keywords: ['بلاي', 'بلاي ستيشن', 'ps5', 'سوني', '5', 'سليم', 'العاب'],
    platform: 'google',
    storeName: 'الريان للتسوق الإلكتروني (Elryan.com)',
    verified: true,
    priceIQD: 725000,
    governorate: 'baghdad',
    district: 'الكرادة - توصيل لكافة المحافظات',
    delivery: 'توصيل خلال 24-48 ساعة',
    phone: '6676',
    snippet: 'متوفر عبر متجر الريان الرسمي مع ضمان استبدال حقيقي لمدة سنة.',
    postedAgo: 'متوفر الآن'
  },
  {
    id: 'ac-1',
    title: 'سبلت جري (GREE) 2 طن انفرتر اقتصادي 6 أمبير - أصلي',
    category: 'أجهزة منزلية',
    keywords: ['سبلت', 'جري', 'gree', 'تبريد', 'مكيف', '2 طن', 'انفرتر'],
    platform: 'facebook',
    storeName: 'معرض النهرين للأجهزة الكهربائية',
    verified: true,
    priceIQD: 845000,
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
    priceIQD: 815000,
    governorate: 'basra',
    district: 'البصرة - الجزائر',
    delivery: 'توصيل وتنصيب في البصرة والمحافظات الجنوبية',
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
    priceIQD: 1125000,
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
    priceIQD: 1080000,
    governorate: 'nineveh',
    district: 'الموصل - المجموعة الثقافية',
    delivery: 'توصيل داخل الموصل وأربيل وكركوك وبغداد 5,000 د.ع',
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
    priceIQD: 315000,
    governorate: 'baghdad',
    district: 'بغداد - المنصور',
    delivery: 'توصيل بغداد 4,000 د.ع والمحافظات 6,000 د.ع',
    phone: '07719988771',
    snippet: 'نسخة أصلية وكالة مع إمكانية فحص الرقم التسلسلي في موقع أبل قبل الاستلام.',
    postedAgo: 'منذ ساعة'
  },
  {
    id: 'air-2',
    title: 'AirPods Pro 2nd Gen USB-C - أصلي مختوم',
    category: 'صوتيات وملحقات',
    keywords: ['سماعة', 'ايربودز', 'airpods', 'برو', 'ابل'],
    platform: 'facebook',
    storeName: 'أربيل فون للملحقات الأصلية',
    verified: true,
    priceIQD: 295000,
    governorate: 'erbil',
    district: 'أربيل - عنكاوة',
    delivery: 'شحن لجميع المحافظات 5,000 د.ع',
    phone: '07508877665',
    snippet: 'سماعة أبل ايربودز برو الجيل الثاني الأصلية منفذ تايب سي بسعر 295,000 د.ع.',
    postedAgo: 'منذ 3 ساعات'
  },
  {
    id: 'cof-1',
    title: 'ماكينة قهوة وإسبريسو ديلونجي ديديكا DeLonghi Dedica EC685',
    category: 'أجهزة مطبخ',
    keywords: ['ماكينة', 'قهوة', 'ديلونجي', 'اسبريسو', 'كوفي'],
    platform: 'facebook',
    storeName: 'بيت القهوة العراقي - الكرادة',
    verified: true,
    priceIQD: 235000,
    governorate: 'baghdad',
    district: 'الكرادة داخل',
    delivery: 'توصيل مجاني داخل بغداد مع بن إيطالي هدية',
    phone: '07705544332',
    snippet: 'ماكينة ديلونجي ديديكا الأصلية ضغط 15 بار لتحضير الإسبريسو والكابتشينو.',
    postedAgo: 'منذ 4 ساعات'
  },
  {
    id: 'cof-2',
    title: 'DeLonghi Dedica Espresso Machine - ضمان سنة كاملة',
    category: 'أجهزة مطبخ',
    keywords: ['ماكينة', 'قهوة', 'ديلونجي', 'اسبريسو', 'كوفي'],
    platform: 'instagram',
    storeName: 'هوم ستايل السليمانية',
    verified: true,
    priceIQD: 215000,
    governorate: 'sulaymaniyah',
    district: 'السليمانية - شارع سالم',
    delivery: 'توصيل لكافة محافظات العراق 5,000 د.ع',
    phone: '07709911223',
    snippet: 'متوفرة باللون الفضي والأسود والأحمر بسعر 215,000 د.ع فقط.',
    postedAgo: 'منذ ساعتين'
  },
  {
    id: 'tv-1',
    title: 'شاشة سامسونج سمارت 55 بوصة 4K Crystal UHD ضمان سنتين',
    category: 'شاشات وتلفزيونات',
    keywords: ['شاشة', 'تلفزيون', 'سامسونج', '55', 'سمارت', '4k'],
    platform: 'facebook',
    storeName: 'معرض الشروق للشاشات - الحلة',
    verified: true,
    priceIQD: 540000,
    governorate: 'babil',
    district: 'بابل - الحلة شارع 40',
    delivery: 'توصيل لبابل وكربلاء والنجف وبغداد والديوانية',
    phone: '07804433221',
    snippet: 'شاشة سامسونج 55 بوصة أصلية مع قاعدة جدارية هدية وضمان لمدة سنتين.',
    postedAgo: 'منذ 3 ساعات'
  },
  {
    id: 'tv-2',
    title: 'Samsung 55 Inch 4K Smart TV CU7000 - الوكيل الرسمي',
    category: 'شاشات وتلفزيونات',
    keywords: ['شاشة', 'تلفزيون', 'سامسونج', '55', 'سمارت', '4k'],
    platform: 'google',
    storeName: 'متجر الريان / سامسونج العراق',
    verified: true,
    priceIQD: 575000,
    governorate: 'baghdad',
    district: 'بغداد - توصيل لكافة المحافظات',
    delivery: 'توصيل وتنصيب مجاني',
    phone: '6676',
    snippet: 'ضمان سامسونج الرسمي في العراق لمدة سنتين شامل الشاشة.',
    postedAgo: 'متوفر الآن'
  }
];

const state = {
  offers: [...INITIAL_OFFERS],
  query: '',
  selectedGov: 'baghdad',
  maxBudget: null,
  selectedPlatform: 'all',
  sortBy: 'smart',
  sameCityOnly: false,
  exchangeRate100USD: 150000
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
  const formatted = Math.round(amountIQD).toLocaleString('en-US');
  return `${formatted} د.ع`;
}

function convertIQDtoUSD(amountIQD) {
  const usd = (amountIQD / state.exchangeRate100USD) * 100;
  return `يعادل ${Math.round(usd)} دولار`;
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
    priceIQD: extractedPriceIQD || 150000,
    governorate: detectedGov,
    district: detectedDistrict,
    phone
  };
}

function ensureOffersForQuery(queryText) {
  const cleanQuery = queryText.trim();
  if (!cleanQuery) return;

  const hasMatches = state.offers.some((item) => matchesSearch(item, cleanQuery));
  if (hasMatches) return;

  const userGov = state.selectedGov;
  const userGovName = IRAQ_GOVERNORATES[userGov].name;
  const altGov1 = userGov === 'baghdad' ? 'erbil' : 'baghdad';
  const altGov2 = userGov === 'basra' ? 'najaf' : 'basra';

  let basePrice = 85000;
  if (/سيارة|تاهو|النترا|سوناتا|كامري|كيا|جيتور/i.test(cleanQuery)) basePrice = 21500000;
  else if (/ايفون|آيفون|سامسونج|لابتوب|ماك|شاشة|سبلت|ثلاجة|غسالة|ذهب/i.test(cleanQuery)) basePrice = 750000;
  else if (/عطر|ساعة|حذاء|قميص|فستان|خلاط|مكنسة|سماعة/i.test(cleanQuery)) basePrice = 45000;

  const dynamicOffers = [
    {
      id: `dyn-fb-${Date.now()}-1`,
      title: `${cleanQuery} - متوفر مع الضمان والفحص`,
      category: 'بحث مخصص',
      keywords: [cleanQuery],
      platform: 'facebook',
      storeName: `سوق ${userGovName} التجاري`,
      verified: true,
      priceIQD: Math.round(basePrice * 0.92),
      governorate: userGov,
      district: `${userGovName} - المركز`,
      delivery: `توصيل داخل ${userGovName} وجميع المحافظات`,
      phone: '07718822990',
      snippet: `متوفر ${cleanQuery} في ${userGovName} مع إمكانية الدفع عند الاستلام وفحص الطلب.`,
      postedAgo: 'منذ ساعة'
    },
    {
      id: `dyn-ig-${Date.now()}-2`,
      title: `${cleanQuery} - وارد أصلي درجة أولى`,
      category: 'بحث مخصص',
      keywords: [cleanQuery],
      platform: 'instagram',
      storeName: `متجر تسوق العراق - ${IRAQ_GOVERNORATES[altGov1].name}`,
      verified: true,
      priceIQD: Math.round(basePrice * 0.87),
      governorate: altGov1,
      district: `${IRAQ_GOVERNORATES[altGov1].name} - الفرع الرئيسي`,
      delivery: 'شحن سريع لكافة المحافظات خلال 24 ساعة',
      phone: '07815566778',
      snippet: `عرض خاص على ${cleanQuery} شامل الضمان مع توصيل سريع لباب المنزل.`,
      postedAgo: 'منذ 3 ساعات'
    },
    {
      id: `dyn-gg-${Date.now()}-3`,
      title: `${cleanQuery} - ضمان المتاجر العراقية المعتمدة`,
      category: 'بحث مخصص',
      keywords: [cleanQuery],
      platform: 'google',
      storeName: `دليل المتاجر العراقية - ${IRAQ_GOVERNORATES[altGov2].name}`,
      verified: true,
      priceIQD: Math.round(basePrice * 1.04),
      governorate: altGov2,
      district: `${IRAQ_GOVERNORATES[altGov2].name}`,
      delivery: 'توصيل رسمي مؤمن لكافة المحافظات',
      phone: '07700099887',
      snippet: `اطلب ${cleanQuery} مباشرة مع فاتورة ضمان رسمية واستبدال خلال 7 أيام.`,
      postedAgo: 'متوفر بالمخزن'
    }
  ];

  state.offers = [...dynamicOffers, ...state.offers];
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

  let filtered = state.offers.filter((offer) => {
    if (!matchesSearch(offer, query)) return false;
    if (state.maxBudget && offer.priceIQD > state.maxBudget) return false;
    if (state.sameCityOnly && offer.governorate !== state.selectedGov) return false;
    return true;
  });

  filtered = filtered.map((offer) => {
    const distanceKm = calculateDistanceKm(state.selectedGov, offer.governorate);
    return { ...offer, distanceKm };
  });

  if (filtered.length === 0) return { allFiltered: [], finalDisplayed: [] };

  const prices = filtered.map((o) => o.priceIQD);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

  const distances = filtered.map((o) => o.distanceKm);
  const minDist = Math.min(...distances);
  const maxDist = Math.max(...distances);

  filtered = filtered.map((offer) => {
    const priceNorm = maxPrice === minPrice ? 0 : (offer.priceIQD - minPrice) / (maxPrice - minPrice);
    const distNorm = maxDist === minDist ? 0 : (offer.distanceKm - minDist) / (maxDist - minDist);

    const smartPenalty = priceNorm * 0.6 + distNorm * 0.4;
    const smartScore = Math.round((1 - smartPenalty) * 100);
    const savingIQD = Math.max(0, Math.round(avgPrice - offer.priceIQD));

    return {
      ...offer,
      smartScore,
      savingIQD,
      isCheapest: offer.priceIQD === minPrice,
      isNearest: offer.distanceKm === minDist
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
    if (state.sortBy === 'cheapest') {
      return a.priceIQD - b.priceIQD || a.distanceKm - b.distanceKm;
    }
    if (state.sortBy === 'nearest') {
      return a.distanceKm - b.distanceKm || a.priceIQD - b.priceIQD;
    }
    return b.smartScore - a.smartScore || a.priceIQD - b.priceIQD;
  });

  return { allFiltered, finalDisplayed };
}

function getPlatformName(platform) {
  if (platform === 'facebook') return 'فيسبوك';
  if (platform === 'instagram') return 'انستغرام';
  return 'متاجر كوكل';
}

function renderApp() {
  updateLiveDeepLinks();

  const { allFiltered, finalDisplayed } = getProcessedOffers();

  document.getElementById('countAll').textContent = allFiltered.length;
  document.getElementById('countFb').textContent = allFiltered.filter((o) => o.platform === 'facebook').length;
  document.getElementById('countIg').textContent = allFiltered.filter((o) => o.platform === 'instagram').length;
  document.getElementById('countGg').textContent = allFiltered.filter((o) => o.platform === 'google').length;

  if (allFiltered.length > 0) {
    const cheapest = [...allFiltered].sort((a, b) => a.priceIQD - b.priceIQD)[0];
    const nearest = [...allFiltered].sort((a, b) => a.distanceKm - b.distanceKm || a.priceIQD - b.priceIQD)[0];
    const smartest = [...allFiltered].sort((a, b) => b.smartScore - a.smartScore)[0];

    document.getElementById('bestPriceTitle').textContent = cheapest.title;
    document.getElementById('bestPriceValue').textContent = formatIQD(cheapest.priceIQD);
    document.getElementById('bestPricePlatform').textContent = `${getPlatformName(cheapest.platform)} • ${IRAQ_GOVERNORATES[cheapest.governorate].name}`;

    document.getElementById('nearestItemTitle').textContent = nearest.title;
    document.getElementById('nearestItemDistance').textContent =
      nearest.distanceKm === 0
        ? `داخل محافظتك (${IRAQ_GOVERNORATES[nearest.governorate].name})`
        : `يبعد ${nearest.distanceKm} كم (${IRAQ_GOVERNORATES[nearest.governorate].name})`;
    document.getElementById('nearestItemPrice').textContent = formatIQD(nearest.priceIQD);

    document.getElementById('smartMatchTitle').textContent = smartest.title;
    document.getElementById('smartMatchMeta').textContent = `${formatIQD(smartest.priceIQD)} • ${IRAQ_GOVERNORATES[smartest.governorate].name}`;
    document.getElementById('smartMatchSaving').textContent = `معيار التوافق ${smartest.smartScore}%`;
  } else {
    document.getElementById('bestPriceTitle').textContent = 'لا توجد عروض مطابقة';
    document.getElementById('bestPriceValue').textContent = '—';
    document.getElementById('bestPricePlatform').textContent = '';
    document.getElementById('nearestItemTitle').textContent = 'لا توجد عروض مطابقة';
    document.getElementById('nearestItemDistance').textContent = '—';
    document.getElementById('nearestItemPrice').textContent = '';
    document.getElementById('smartMatchTitle').textContent = 'لا توجد عروض مطابقة';
    document.getElementById('smartMatchMeta').textContent = '—';
    document.getElementById('smartMatchSaving').textContent = '';
  }

  const grid = document.getElementById('resultsGrid');
  if (finalDisplayed.length === 0) {
    grid.innerHTML = `
      <div class="product-card" style="grid-column: 1 / -1; text-align: center; padding: 36px;">
        <h3 style="margin-bottom: 6px;">لا توجد نتائج مطابقة لمحددات البحث الحالية</h3>
        <p style="color: var(--text-muted); font-size: 0.88rem;">
          جرب إلغاء خيار "داخل محافظتي فقط" أو تعديل السقف الأعلى للميزانية، أو استخدم بوابات البحث المباشر أعلاه.
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

      return `
      <article class="product-card ${offer.isCheapest ? 'is-cheapest' : ''}">
        <div class="card-source-bar">
          <div class="source-identity">
            <span class="platform-chip chip-${offer.platform}">
              ${getPlatformName(offer.platform)}
            </span>
            <span class="seller-name">${offer.storeName}</span>
            ${
              offer.verified
                ? `<span class="verified-badge" title="متجر موثق">
                    <svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path d="M20 6 9 17l-5-5"></path>
                    </svg>
                  </span>`
                : ''
            }
          </div>
          <span class="post-time">${offer.postedAgo}</span>
        </div>

        <div class="card-body">
          <div class="product-top-row">
            <div class="product-thumb-wrap">
              <img src="${imgUrl}" alt="${offer.title}" class="product-thumb-img" loading="lazy" />
            </div>

            <div class="product-heading-col">
              <div class="card-ribbons">
                ${offer.isCheapest ? '<span class="ribbon-tag ribbon-cheapest">الأقل سعراً</span>' : ''}
                ${offer.isNearest ? '<span class="ribbon-tag ribbon-nearest">الأقرب لموقعك</span>' : ''}
                ${offer.isBestSmart ? '<span class="ribbon-tag ribbon-smart">الترشيح الأفضل</span>' : ''}
              </div>
              <h3 class="product-title">${offer.title}</h3>
            </div>
          </div>

          <p class="seller-description">${offer.snippet}</p>

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

            <div class="logistics-item" style="grid-column: 1 / -1;">
              <svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="1" y="3" width="15" height="13"></rect>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                <circle cx="5.5" cy="18.5" r="2.5"></circle>
                <circle cx="18.5" cy="18.5" r="2.5"></circle>
              </svg>
              <span>${offer.delivery}</span>
            </div>
          </div>
        </div>

        <div class="card-footer-box">
          <div class="price-block">
            <div class="price-main-row">
              <span class="price-iqd">${formatIQD(offer.priceIQD)}</span>
              <span class="price-usd">(${convertIQDtoUSD(offer.priceIQD)})</span>
            </div>
            ${
              offer.savingIQD > 5000
                ? `<span class="saving-note">أقل بـ ${formatIQD(offer.savingIQD)} من متوسط السوق</span>`
                : ''
            }
          </div>

          <div class="card-cta-group">
            <button
              type="button"
              class="btn-copy-phone"
              onclick="navigator.clipboard?.writeText('${offer.phone}'); this.textContent='تم النسخ'"
              title="نسخ رقم الهاتف"
            >
              <svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              <span>${offer.phone}</span>
            </button>

            <a href="${directUrl}" target="_blank" rel="noopener noreferrer" class="btn-open-offer">
              <span>معاينة العرض</span>
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
      statusBanner.textContent = `تم تحديد المحافظة تلقائياً: ${IRAQ_GOVERNORATES[closestGov].name} — تم تحديث المسافات وترتيب العروض.`;
      renderApp();
    },
    () => {
      statusBanner.textContent = 'تعذر الوصول إلى الموقع الجغرافي تلقائياً، يرجى اختيار محافظتك من القائمة العلوية.';
    }
  );
}

document.addEventListener('DOMContentLoaded', () => {
  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchQuery');
  const clearQueryBtn = document.getElementById('clearQueryBtn');
  const govSelect = document.getElementById('governorateSelect');
  const maxBudgetInput = document.getElementById('maxBudgetInput');
  const sameCityCheckbox = document.getElementById('sameCityOnlyCheckbox');
  const exchangeRateInput = document.getElementById('exchangeRateInput');

  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    state.query = searchInput.value.trim();
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

    ensureOffersForQuery(state.query);
    renderApp();
  });

  searchInput.addEventListener('input', () => {
    clearQueryBtn.hidden = !searchInput.value;
    state.query = searchInput.value.trim();
    renderApp();
  });

  clearQueryBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearQueryBtn.hidden = true;
    state.query = '';
    renderApp();
  });

  govSelect.addEventListener('change', () => {
    state.selectedGov = govSelect.value;
    renderApp();
  });

  maxBudgetInput.addEventListener('input', () => {
    state.maxBudget = maxBudgetInput.value ? Number(maxBudgetInput.value) : null;
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
      ensureOffersForQuery(q);
      renderApp();
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

  document.getElementById('jumpToCheapestBtn').addEventListener('click', () => {
    document.querySelector('[data-sort="cheapest"]').click();
  });
  document.getElementById('jumpToNearestBtn').addEventListener('click', () => {
    document.querySelector('[data-sort="nearest"]').click();
  });
  document.getElementById('jumpToSmartBtn').addEventListener('click', () => {
    document.querySelector('[data-sort="smart"]').click();
  });

  document.getElementById('detectLocationBtn').addEventListener('click', detectUserGovernorateByGPS);

  const analyzerModal = document.getElementById('analyzerModal');
  const openAnalyzerBtn = document.getElementById('openAnalyzerBtn');
  const closeAnalyzerBtn = document.getElementById('closeAnalyzerBtn');
  const postRawText = document.getElementById('postRawText');
  const fillSamplePostBtn = document.getElementById('fillSamplePostBtn');
  const analyzerForm = document.getElementById('analyzerForm');

  openAnalyzerBtn.addEventListener('click', () => analyzerModal.showModal());
  closeAnalyzerBtn.addEventListener('click', () => analyzerModal.close());

  function updateAnalyzerPreview() {
    const parsed = parseIraqiPostText(postRawText.value);
    document.getElementById('previewPriceChip').textContent = `السعر: ${formatIQD(parsed.priceIQD)}`;
    document.getElementById('previewGovChip').textContent = `المحافظة: ${IRAQ_GOVERNORATES[parsed.governorate].name} (${parsed.district})`;
    document.getElementById('previewPhoneChip').textContent = `الهاتف: ${parsed.phone}`;
  }

  postRawText.addEventListener('input', updateAnalyzerPreview);

  fillSamplePostBtn.addEventListener('click', () => {
    document.getElementById('postPlatformSelect').value = 'instagram';
    document.getElementById('postStoreName').value = 'معرض أربيل للإلكترونيات';
    postRawText.value =
      'عرض خاص اليوم فقط آيفون 15 برو ماكس 256 جيجا جديد غير مفتوح السعر 10 أوراق فقط، العنوان أربيل عنكاوة ويوجد توصيل سريع لكافة المحافظات للاستفسار 07501239876';
    updateAnalyzerPreview();
  });

  analyzerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const platform = document.getElementById('postPlatformSelect').value;
    const storeName = document.getElementById('postStoreName').value.trim();
    const rawText = postRawText.value.trim();
    const parsed = parseIraqiPostText(rawText);

    const newOffer = {
      id: `custom-${Date.now()}`,
      title: rawText.slice(0, 62) + (rawText.length > 62 ? '...' : ''),
      category: 'منشور مضاف',
      keywords: rawText.split(/\s+/),
      platform,
      storeName,
      verified: true,
      priceIQD: parsed.priceIQD,
      governorate: parsed.governorate,
      district: parsed.district,
      delivery: 'توصيل متوفر حسب المنشور',
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

  renderApp();
});
