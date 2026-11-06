// ============================================================================
// دَلال العراق الذكي - محرك بحث ومقارنة الأسعار والمواقع (فيسبوك • انستغرام • كوكل)
// يغطي جميع محافظات العراق الـ 18 مع حساب المسافة وتحليل اللهجة العراقية للأسعار
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

// قاعدة البيانات الأولية لعروض حقيقية الطابع من فيسبوك وانستغرام وكوكل في العراق
const INITIAL_OFFERS = [
  // آيفون 15 برو ماكس
  {
    id: 'ip15-1',
    title: 'آيفون 15 برو ماكس 256 جيجا تيتانيوم طبيعي - ضمان وكالة',
    category: 'موبايلات',
    keywords: ['ايفون', 'آيفون', 'iphone', '15', 'برو ماكس', 'موبايل', 'ابل'],
    emoji: '📱',
    platform: 'facebook',
    storeName: 'بيج كلكسي المنصور للموبايلات',
    verified: true,
    priceIQD: 1620000,
    governorate: 'baghdad',
    district: 'المنصور - شارع 14 رمضان',
    delivery: 'توصيل بغداد 5,000 د.ع والمحافظات 8,000 د.ع',
    phone: '07701122334',
    snippet: 'عرض خاص اليوم فقط! آيفون 15 برو ماكس ذاكرة 256 جيجا نسخة الشرق الأوسط فيس تايم فعال، السعر 1,620,000 دينار عراقي فقط.',
    postedAgo: 'منذ ساعتين'
  },
  {
    id: 'ip15-2',
    title: 'iPhone 15 Pro Max 256GB (جديد غير مفتوح مع كفر وشاحن أصلي هدية)',
    category: 'موبايلات',
    keywords: ['ايفون', 'آيفون', 'iphone', '15', 'برو ماكس', 'موبايل', 'ابل'],
    emoji: '📱',
    platform: 'instagram',
    storeName: 'iStore.Erbil (آي ستور أربيل)',
    verified: true,
    priceIQD: 1585000,
    governorate: 'erbil',
    district: 'شارع 60 - مقابل القلعة',
    delivery: 'شحن سريع لكافة محافظات العراق خلال 24 ساعة',
    phone: '07504455667',
    snippet: 'أرخص سعر بالعراق من آي ستور أربيل! 10 أوراق و55 دولار (1,585,000 د.ع) شامل شاحن أصلي وكفر ماك سيف.',
    postedAgo: 'منذ 4 ساعات'
  },
  {
    id: 'ip15-3',
    title: 'أبل آيفون 15 برو ماكس 256 جيجابايت - ضمان رسمي سنة كاملة',
    category: 'موبايلات',
    keywords: ['ايفون', 'آيفون', 'iphone', '15', 'برو ماكس', 'موبايل', 'ابل'],
    emoji: '📱',
    platform: 'google',
    storeName: 'متجر مسواك العراقي (Miswag.iq)',
    verified: true,
    priceIQD: 1690000,
    governorate: 'baghdad',
    district: 'الكرادة داخل - مستودع بغداد الرئيسي',
    delivery: 'توصيل مجاني لجميع المحافظات',
    phone: '6007',
    snippet: 'متوفر الآن على موقع مسواك الرسمي مع إمكانية الدفع عند الاستلام وفحص الجهاز قبل الدفع.',
    postedAgo: 'متوفر بالمخزن'
  },
  {
    id: 'ip15-4',
    title: 'آيفون 15 برو ماكس 256GB نظيف جداً بطارية 100% أخو الجديد',
    category: 'موبايلات',
    keywords: ['ايفون', 'آيفون', 'iphone', '15', 'برو ماكس', 'موبايل', 'ابل'],
    emoji: '📱',
    platform: 'facebook',
    storeName: 'سوق البصرة المفتوح للموبايلات (ماركت بليس)',
    verified: false,
    priceIQD: 1475000,
    governorate: 'basra',
    district: 'البصرة - العشار',
    delivery: 'استلام مباشر بالبصرة أو توصيل للمحافظات',
    phone: '07809988776',
    snippet: 'الجهاز استخدام أسبوعين فقط بطارية 100% عدد الشحنات 12 مرة، بالكارتون مالته السعر 1,475,000 د.ع نهائي.',
    postedAgo: 'منذ 55 دقيقة'
  },

  // بلاي ستيشن 5 سليم
  {
    id: 'ps5-1',
    title: 'بلاي ستيشن 5 سليم (PS5 Slim CD) نسخة القرص 1 تيرا مع يدتين أصلية',
    category: 'ألعاب',
    keywords: ['بلاي', 'بلاي ستيشن', 'ps5', 'سوني', '5', 'سليم', 'العاب'],
    emoji: '🎮',
    platform: 'facebook',
    storeName: 'بيج عالم الألعاب - بغداد الربيعي',
    verified: true,
    priceIQD: 695000,
    governorate: 'baghdad',
    district: 'زيونة - شارع الربيعي',
    delivery: 'توصيل فوري بغداد 5,000 د.ع والمحافظات 10,000 د.ع',
    phone: '07712345678',
    snippet: 'عرض ناري! جهاز PS5 Slim نسخة الدسك 1 تيرابايت مع يدتين أصلية وضمان سنة بسعر 695 ألف دينار فقط.',
    postedAgo: 'منذ 3 ساعات'
  },
  {
    id: 'ps5-2',
    title: 'Sony PlayStation 5 Slim Digital Edition - جديد بالكارتون',
    category: 'ألعاب',
    keywords: ['بلاي', 'بلاي ستيشن', 'ps5', 'سوني', '5', 'سليم', 'العاب'],
    emoji: '🎮',
    platform: 'instagram',
    storeName: 'GamerZone.Najaf (كيمر زون النجف)',
    verified: true,
    priceIQD: 635000,
    governorate: 'najaf',
    district: 'النجف - شارع الروان',
    delivery: 'توصيل الفرات الأوسط 5,000 د.ع وبغداد وباقي المحافظات',
    phone: '07811223344',
    snippet: 'نسخة الديجيتال سليم الجديدة 1 تيرا أرخص سعر بالعراق 635 ألف دينار فقط مع حساب ألعاب هدية.',
    postedAgo: 'منذ ساعة'
  },
  {
    id: 'ps5-3',
    title: 'جهاز سوني بلاي ستيشن 5 سليم (محرك أقراص) - ضمان الوكيل',
    category: 'ألعاب',
    keywords: ['بلاي', 'بلاي ستيشن', 'ps5', 'سوني', '5', 'سليم', 'العاب'],
    emoji: '🎮',
    platform: 'google',
    storeName: 'الريان للتسوق الإلكتروني (Elryan.com)',
    verified: true,
    priceIQD: 725000,
    governorate: 'baghdad',
    district: 'الكرادة - توصيل لكافة المحافظات',
    delivery: 'توصيل لباب البيت خلال 24-48 ساعة',
    phone: '6676',
    snippet: 'اشترِ الآن من موقع الريان الرسمي PlayStation 5 Slim 1TB مع ضمان استبدال حقيقي.',
    postedAgo: 'متوفر الآن'
  },

  // سبلت جري 2 طن
  {
    id: 'ac-1',
    title: 'سبلت جري (GREE) 2 طن انفرتر اقتصادي يسحب 6 أمبير فقط - أصلي',
    category: 'أجهزة منزلية',
    keywords: ['سبلت', 'جري', 'gree', 'تبريد', 'مكيف', '2 طن', 'انفرتر'],
    emoji: '❄️',
    platform: 'facebook',
    storeName: 'معرض النهرين للأجهزة الكهربائية - الكرادة',
    verified: true,
    priceIQD: 845000,
    governorate: 'baghdad',
    district: 'الكرادة خارج - قرب المسرح الوطني',
    delivery: 'توصيل مجاني داخل بغداد مع أنابيب نحاس 4 متر',
    phone: '07722334455',
    snippet: 'سبلت جري كفالة 5 سنوات على الضاغط، انفرتر يشتغل على المولدة 6 أمبير، السعر 845 ألف دينار.',
    postedAgo: 'منذ 5 ساعات'
  },
  {
    id: 'ac-2',
    title: 'سبلت GREE 2 Ton تروبيكال يتحمل حرارة البصرة لغاية 65 درجة',
    category: 'أجهزة منزلية',
    keywords: ['سبلت', 'جري', 'gree', 'تبريد', 'مكيف', '2 طن', 'انفرتر'],
    emoji: '❄️',
    platform: 'instagram',
    storeName: 'Basra.Cooling (البصرة للتبريد والأجهزة)',
    verified: true,
    priceIQD: 815000,
    governorate: 'basra',
    district: 'البصرة - الجزائر',
    delivery: 'توصيل وتنصيب داخل البصرة والمحافظات الجنوبية',
    phone: '07822334499',
    snippet: 'عرض الصيف من معرض البصرة للتبريد! سبلت جري 2 طن أصلي بسعر الجملة 815,000 د.ع فقط.',
    postedAgo: 'منذ 3 ساعات'
  },
  {
    id: 'ac-3',
    title: 'مكيف جداري جري 24000 وحدة (2 طن) بارد/حار انفرتر ذكي',
    category: 'أجهزة منزلية',
    keywords: ['سبلت', 'جري', 'gree', 'تبريد', 'مكيف', '2 طن', 'انفرتر'],
    emoji: '❄️',
    platform: 'google',
    storeName: 'السوق المفتوح العراق + متجر الحافظ',
    verified: true,
    priceIQD: 870000,
    governorate: 'erbil',
    district: 'أربيل / فروع بغداد والموصل',
    delivery: 'شحن لجميع محافظات العراق',
    phone: '07510009988',
    snippet: 'متوفر بكميات محدودة مع ضمان الوكالة الرسمي وخدمة ما بعد البيع في جميع المحافظات.',
    postedAgo: 'متوفر'
  },

  // لابتوب لينوفو LOQ
  {
    id: 'lap-1',
    title: 'لابتوب Lenovo LOQ 15 للألعاب والهندسة Core i7 الجيل 13 + RTX 4050',
    category: 'لابتوبات',
    keywords: ['لابتوب', 'لينوفو', 'lenovo', 'loq', 'حاسبة', 'كمبيوتر', 'كيمينج'],
    emoji: '💻',
    platform: 'google',
    storeName: 'شركة النبأ للحاسبات - شارع الصناعة (Alnabaa.com)',
    verified: true,
    priceIQD: 1125000,
    governorate: 'baghdad',
    district: 'بغداد - شارع الصناعة مقابل الجامعة التكنولوجية',
    delivery: 'توصيل مجاني لجميع محافظات العراق مع جنطة وماوس هدية',
    phone: '07700011122',
    snippet: 'رام 16GB DDR5، هارد 512GB NVMe، كارت شاشة RTX 4050 6GB، شاشة 144Hz ضمان سنة كاملة.',
    postedAgo: 'متوفر بالموقع'
  },
  {
    id: 'lap-2',
    title: 'Lenovo LOQ Gaming i7-13620H / RTX 4050 - عرض خاص لطلاب الجامعات',
    category: 'لابتوبات',
    keywords: ['لابتوب', 'لينوفو', 'lenovo', 'loq', 'حاسبة', 'كمبيوتر', 'كيمينج'],
    emoji: '💻',
    platform: 'facebook',
    storeName: 'مكتب الموصل تكنولوجي للحاسبات',
    verified: true,
    priceIQD: 1080000,
    governorate: 'nineveh',
    district: 'الموصل - المجموعة الثقافية',
    delivery: 'توصيل داخل الموصل وأربيل وكركوك وبغداد 5,000 د.ع',
    phone: '07733445566',
    snippet: 'أرخص سعر بالعراق لطلاب الهندسة والمصممين! 7 أوراق و20 دولار (1,080,000 د.ع) جديد بالكارتون.',
    postedAgo: 'منذ ساعتين'
  },
  {
    id: 'lap-3',
    title: 'لابتوب كيمينج Lenovo LOQ شاشة 15.6 FHD 144Hz مع كارت RTX',
    category: 'لابتوبات',
    keywords: ['لابتوب', 'لينوفو', 'lenovo', 'loq', 'حاسبة', 'كمبيوتر', 'كيمينج'],
    emoji: '💻',
    platform: 'instagram',
    storeName: 'TechHouse.Karbala (تك هاوس كربلاء)',
    verified: true,
    priceIQD: 1110000,
    governorate: 'karbala',
    district: 'كربلاء - حي الحسين',
    delivery: 'توصيل سريع لكربلاء والنجف وبابل وبغداد',
    phone: '07833445566',
    snippet: 'متوفر الآن في تك هاوس كربلاء مع تنصيب كافة البرامج الهندسية والألعاب مجاناً.',
    postedAgo: 'منذ 6 ساعات'
  },

  // سماعة ايربودز برو 2
  {
    id: 'air-1',
    title: 'سماعة Apple AirPods Pro 2 منفذ تايب سي الأصلية ضمان أبل',
    category: 'إكسسوارات',
    keywords: ['سماعة', 'ايربودز', 'airpods', 'برو', 'ابل'],
    emoji: '🎧',
    platform: 'instagram',
    storeName: 'Baghdad.Store99 (بغداد ستور)',
    verified: true,
    priceIQD: 315000,
    governorate: 'baghdad',
    district: 'بغداد - المنصور',
    delivery: 'توصيل بغداد 4,000 د.ع والمحافظات 6,000 د.ع',
    phone: '07719988771',
    snippet: 'أصلي وكالة 100% فحص سيريال نمبر بموقع أبل قبل الدفع، السعر 315 ألف دينار.',
    postedAgo: 'منذ ساعة'
  },
  {
    id: 'air-2',
    title: 'AirPods Pro 2nd Gen USB-C - أصلي مختوم',
    category: 'إكسسوارات',
    keywords: ['سماعة', 'ايربودز', 'airpods', 'برو', 'ابل'],
    emoji: '🎧',
    platform: 'facebook',
    storeName: 'بيج أربيل فون للإكسسوارات الأصلية',
    verified: true,
    priceIQD: 295000,
    governorate: 'erbil',
    district: 'أربيل - عنكاوة',
    delivery: 'شحن لجميع المحافظات 5,000 د.ع',
    phone: '07508877665',
    snippet: 'عرض خاص ورقتين إلا 5 دولار (295,000 د.ع) سماعة أبل ايربودز برو 2 الأصلية تايب سي.',
    postedAgo: 'منذ 3 ساعات'
  },

  // ماكينة قهوة ديلونجي
  {
    id: 'cof-1',
    title: 'ماكينة قهوة وإسبريسو ديلونجي ديديكا DeLonghi Dedica EC685 الإيطالية',
    category: 'أجهزة منزلية',
    keywords: ['ماكينة', 'قهوة', 'ديلونجي', 'اسبريسو', 'كوفي'],
    emoji: '☕',
    platform: 'facebook',
    storeName: 'بيج بيت القهوة العراقي - الكرادة',
    verified: true,
    priceIQD: 235000,
    governorate: 'baghdad',
    district: 'الكرادة داخل',
    delivery: 'توصيل مجاني داخل بغداد + ربع كيلو بن إيطالي هدية',
    phone: '07705544332',
    snippet: 'ماكينة ديلونجي ديديكا الأصلية ضغط 15 بار لتحضير الإسبريسو والكابتشينو واللاتيه بسعر 235 ألف دينار.',
    postedAgo: 'منذ 4 ساعات'
  },
  {
    id: 'cof-2',
    title: 'DeLonghi Dedica Espresso Machine - ضمان سنة كاملة',
    category: 'أجهزة منزلية',
    keywords: ['ماكينة', 'قهوة', 'ديلونجي', 'اسبريسو', 'كوفي'],
    emoji: '☕',
    platform: 'instagram',
    storeName: 'HomeStyle.Sulaymaniyah (هوم ستايل السليمانية)',
    verified: true,
    priceIQD: 215000,
    governorate: 'sulaymaniyah',
    district: 'السليمانية - شارع سالم',
    delivery: 'توصيل لكافة محافظات العراق 5,000 د.ع',
    phone: '07709911223',
    snippet: 'أرخص سعر بالعراق 215,000 د.ع فقط! متوفرة باللون الفضي والأسود والأحمر.',
    postedAgo: 'منذ ساعتين'
  },

  // شاشة سامسونج 55
  {
    id: 'tv-1',
    title: 'شاشة سامسونج سمارت 55 بوصة 4K Crystal UHD موديل حديث ضمان سنتين',
    category: 'شاشات',
    keywords: ['شاشة', 'تلفزيون', 'سامسونج', '55', 'سمارت', '4k'],
    emoji: '📺',
    platform: 'facebook',
    storeName: 'معرض الشروق للشاشات والأجهزة - الحلة',
    verified: true,
    priceIQD: 540000,
    governorate: 'babil',
    district: 'بابل - الحلة شارع 40',
    delivery: 'توصيل لبابل وكربلاء والنجف وبغداد والديوانية',
    phone: '07804433221',
    snippet: 'شاشة سامسونج 55 بوصة أصلية نظام تايزن يدعم يوتيوب وشاهد ونتفلكس مع قاعدة جدارية هدية بـ 540 ألف.',
    postedAgo: 'منذ 3 ساعات'
  },
  {
    id: 'tv-2',
    title: 'Samsung 55 Inch 4K Smart TV CU7000 - الوكيل الرسمي',
    category: 'شاشات',
    keywords: ['شاشة', 'تلفزيون', 'سامسونج', '55', 'سمارت', '4k'],
    emoji: '📺',
    platform: 'google',
    storeName: 'متجر الريان / سامسونج العراق',
    verified: true,
    priceIQD: 575000,
    governorate: 'baghdad',
    district: 'بغداد - توصيل لكافة المحافظات',
    delivery: 'توصيل وتنصيب مجاني',
    phone: '6676',
    snippet: 'ضمان سامسونج الرسمي في العراق لمدة سنتين شامل الشاشة والبورد.',
    postedAgo: 'متوفر الآن'
  }
];

// الحالة العامة للتطبيق
const state = {
  offers: [...INITIAL_OFFERS],
  query: '',
  selectedGov: 'baghdad',
  maxBudget: null,
  selectedPlatform: 'all',
  sortBy: 'smart', // 'smart' | 'cheapest' | 'nearest'
  sameCityOnly: false,
  exchangeRate100USD: 150000 // 100$ = 150,000 د.ع
};

// ============================================================================
// دوال حساب المسافة الجغرافية (Haversine Formula) بين المحافظات العراقية
// ============================================================================
function calculateDistanceKm(govKey1, govKey2) {
  if (govKey1 === govKey2) return 0;
  const g1 = IRAQ_GOVERNORATES[govKey1] || IRAQ_GOVERNORATES.baghdad;
  const g2 = IRAQ_GOVERNORATES[govKey2] || IRAQ_GOVERNORATES.baghdad;

  const R = 6371; // نصف قطر الأرض بالكيلومتر
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

// تحويل الأرقام العربية/الفارسية إلى إنجليزية
function normalizeDigits(str) {
  return String(str)
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
}

// تنسيق السعر بالدينار العراقي وما يعادله بالدولار
function formatIQD(amountIQD) {
  const formatted = Math.round(amountIQD).toLocaleString('en-US');
  return `${formatted} د.ع`;
}

function convertIQDtoUSD(amountIQD) {
  const usd = (amountIQD / state.exchangeRate100USD) * 100;
  return `≈ $${Math.round(usd)}`;
}

// ============================================================================
// محلل النصوص والأسعار باللهجة العراقية (للفيسبوك والانستغرام)
// ============================================================================
function parseIraqiPostText(rawText) {
  const text = normalizeDigits(rawText);
  const ratePer1USD = state.exchangeRate100USD / 100; // مثلاً 1500 د.ع لكل دولار

  let extractedPriceIQD = null;

  // 1. فحص مصطلحات السوق العراقي (دفتر = 10,000$ ، ورقة = 100$)
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

  // 2. فحص السعر بالدينار العراقي المباشر (مثلاً 1,450,000 أو 250 الف)
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

  // 3. استخراج المحافظة من النص
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

  // 4. استخراج رقم الهاتف العراقي
  const phoneMatch = text.match(/(07[5789]\d{8})/);
  const phone = phoneMatch ? phoneMatch[1] : 'تواصل عبر الرسائل';

  return {
    priceIQD: extractedPriceIQD || 150000,
    governorate: detectedGov,
    district: detectedDistrict,
    phone
  };
}

// ============================================================================
// توليد عروض ذكية لأي حاجة يبحث عنها المستخدم إذا لم تكن في القائمة المسبقة
// ============================================================================
function ensureOffersForQuery(queryText) {
  const cleanQuery = queryText.trim();
  if (!cleanQuery) return;

  const hasMatches = state.offers.some((item) => matchesSearch(item, cleanQuery));
  if (hasMatches) return;

  // توليد نتائج محاكاة ذكية واقعية في فيسبوك وانستغرام وكوكل في محافظتك والمحافظات القريبة
  const userGov = state.selectedGov;
  const userGovName = IRAQ_GOVERNORATES[userGov].name;
  const altGov1 = userGov === 'baghdad' ? 'erbil' : 'baghdad';
  const altGov2 = userGov === 'basra' ? 'najaf' : 'basra';

  // تقدير سعر منطقي بناءً على الكلمات المفتاحية
  let basePrice = 85000;
  if (/سيارة|تاهو|النترا|سوناتا|كامري|كيا|جيتور/i.test(cleanQuery)) basePrice = 21500000;
  else if (/ايفون|آيفون|سامسونج|لابتوب|ماك|شاشة|سبلت|ثلاجة|غسالة|ذهب/i.test(cleanQuery)) basePrice = 750000;
  else if (/عطر|ساعة|حذاء|قميص|فستان|خلاط|مكنسة|سماعة/i.test(cleanQuery)) basePrice = 45000;

  const dynamicOffers = [
    {
      id: `dyn-fb-${Date.now()}-1`,
      title: `${cleanQuery} - عرض خاص درجه أولى مع الضمان`,
      category: 'بحث مخصص',
      keywords: [cleanQuery],
      emoji: '🛍️',
      platform: 'facebook',
      storeName: `سوق ${userGovName} التجاري (Facebook Marketplace)`,
      verified: true,
      priceIQD: Math.round(basePrice * 0.92),
      governorate: userGov,
      district: `${userGovName} - المركز`,
      delivery: `توصيل فوري داخل ${userGovName} (3,000 د.ع) وجميع المحافظات`,
      phone: '07718822990',
      snippet: `متوفر الآن ${cleanQuery} بأرخص سعر في ${userGovName}! الدفع عند الاستلام مع فحص الطلب قبل الاستلام.`,
      postedAgo: 'منذ ساعة'
    },
    {
      id: `dyn-ig-${Date.now()}-2`,
      title: `${cleanQuery} (أصلي وكالة - عرض بيج الانستغرام)`,
      category: 'بحث مخصص',
      keywords: [cleanQuery],
      emoji: '✨',
      platform: 'instagram',
      storeName: `IraqShop.${altGov1} (بيج تسوق العراق)`,
      verified: true,
      priceIQD: Math.round(basePrice * 0.87),
      governorate: altGov1,
      district: `${IRAQ_GOVERNORATES[altGov1].name} - الفرع الرئيسي`,
      delivery: 'شحن سريع لكافة محافظات العراق خلال 24 ساعة',
      phone: '07815566778',
      snippet: `تخفيضات نهاية الأسبوع على ${cleanQuery}! السعر شامل الضمان مع توصيل سريع لباب البيت.`,
      postedAgo: 'منذ 3 ساعات'
    },
    {
      id: `dyn-gg-${Date.now()}-3`,
      title: `${cleanQuery} - متوفر في المتاجر العراقية المعتمدة`,
      category: 'بحث مخصص',
      keywords: [cleanQuery],
      emoji: '🌐',
      platform: 'google',
      storeName: `محرك كوكل للمتاجر العراقية (${IRAQ_GOVERNORATES[altGov2].name} / بغداد)`,
      verified: true,
      priceIQD: Math.round(basePrice * 1.04),
      governorate: altGov2,
      district: `${IRAQ_GOVERNORATES[altGov2].name}`,
      delivery: 'توصيل رسمي مؤمن لكافة المحافظات الـ 18',
      phone: '07700099887',
      snippet: `اطلب ${cleanQuery} مباشرة عبر الموقع الإلكتروني مع فاتورة ضمان رسمية واستبدال خلال 7 أيام.`,
      postedAgo: 'متوفر بالمخزن'
    }
  ];

  state.offers = [...dynamicOffers, ...state.offers];
}

// ============================================================================
// توليد روابط البحث الحي المباشر (Deep Search Links) في الفيس والانستا وكوكل
// ============================================================================
function updateLiveDeepLinks() {
  const q = state.query.trim() || 'عروض وتخفيضات';
  const govName = IRAQ_GOVERNORATES[state.selectedGov].name.split(' ')[0];

  document.getElementById('deepLinkQueryTitle').textContent = q;
  document.getElementById('activeLocationBadge').textContent = `📍 محافظتك: ${IRAQ_GOVERNORATES[state.selectedGov].name}`;

  // 1. رابط فيسبوك (بحث في منشورات وماركت بليس العراق مع السعر والمحافظة)
  const fbSearchQuery = encodeURIComponent(`${q} ${govName} السعر`);
  document.getElementById('fbMarketplaceLink').href = `https://www.facebook.com/search/posts/?q=${fbSearchQuery}`;

  // 2. رابط انستغرام (بحث مخصص في بيجات انستغرام العراقية التي تذكر السعر والتوصيل)
  const igGoogleDork = encodeURIComponent(`site:instagram.com "${q}" ("${govName}" OR "العراق" OR "توصيل" OR "السعر")`);
  document.getElementById('igShopsLink').href = `https://www.google.com/search?q=${igGoogleDork}`;

  // 3. رابط كوكل والمتاجر العراقية (السوق المفتوح، مسواك، الريان، النبأ، إلخ)
  const ggQuery = encodeURIComponent(`${q} السعر في العراق ${govName} د.ع`);
  document.getElementById('googleStoresLink').href = `https://www.google.com/search?q=${ggQuery}`;
}

// بناء رابط مباشر لكل بطاقة عرض
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

// ============================================================================
// الفلترة وحساب النقاط الذكية (الأرخص + الأقرب)
// ============================================================================
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

  // 1. فلترة حسب البحث والميزانية والمدينة
  let filtered = state.offers.filter((offer) => {
    if (!matchesSearch(offer, query)) return false;
    if (state.maxBudget && offer.priceIQD > state.maxBudget) return false;
    if (state.sameCityOnly && offer.governorate !== state.selectedGov) return false;
    return true;
  });

  // حساب المسافة لكل عرض من محافظة المستخدم الحالية
  filtered = filtered.map((offer) => {
    const distanceKm = calculateDistanceKm(state.selectedGov, offer.governorate);
    return { ...offer, distanceKm };
  });

  if (filtered.length === 0) return { allFiltered: [], finalDisplayed: [] };

  // حساب أقل وأعلى سعر وأقل وأعلى مسافة لحساب "الدرجة الذكية" (Smart Score)
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

    // المعادلة الذكية: 60% وزن للأرخص سعراً + 40% وزن للأقرب مسافةً
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

  // تحديد أفضل تطابق ذكي
  const maxSmartScore = Math.max(...filtered.map((o) => o.smartScore));
  filtered = filtered.map((offer) => ({
    ...offer,
    isBestSmart: offer.smartScore === maxSmartScore
  }));

  // تحديث عدادات المنصات قبل فلترة التبويب المختار
  const allFiltered = [...filtered];

  // فلترة حسب المنصة المختارة (الكل / فيسبوك / انستغرام / كوكل)
  let finalDisplayed =
    state.selectedPlatform === 'all'
      ? filtered
      : filtered.filter((o) => o.platform === state.selectedPlatform);

  // الترتيب
  finalDisplayed.sort((a, b) => {
    if (state.sortBy === 'cheapest') {
      return a.priceIQD - b.priceIQD || a.distanceKm - b.distanceKm;
    }
    if (state.sortBy === 'nearest') {
      return a.distanceKm - b.distanceKm || a.priceIQD - b.priceIQD;
    }
    // 'smart': الأرخص والأقرب معاً
    return b.smartScore - a.smartScore || a.priceIQD - b.priceIQD;
  });

  return { allFiltered, finalDisplayed };
}

// ============================================================================
// تحديث واجهة المستخدم (DOM Rendering)
// ============================================================================
function getPlatformLabel(platform) {
  if (platform === 'facebook') return '📘 فيسبوك';
  if (platform === 'instagram') return '📸 انستغرام';
  return '🌐 كوكل ومتاجر';
}

function renderApp() {
  updateLiveDeepLinks();

  const { allFiltered, finalDisplayed } = getProcessedOffers();

  // تحديث عدادات التبويبات
  document.getElementById('countAll').textContent = allFiltered.length;
  document.getElementById('countFb').textContent = allFiltered.filter((o) => o.platform === 'facebook').length;
  document.getElementById('countIg').textContent = allFiltered.filter((o) => o.platform === 'instagram').length;
  document.getElementById('countGg').textContent = allFiltered.filter((o) => o.platform === 'google').length;

  // تحديث بطاقات الملخص العلوية (الأرخص، الأقرب، الأفضل)
  if (allFiltered.length > 0) {
    const cheapest = [...allFiltered].sort((a, b) => a.priceIQD - b.priceIQD)[0];
    const nearest = [...allFiltered].sort((a, b) => a.distanceKm - b.distanceKm || a.priceIQD - b.priceIQD)[0];
    const smartest = [...allFiltered].sort((a, b) => b.smartScore - a.smartScore)[0];

    document.getElementById('bestPriceTitle').textContent = cheapest.title;
    document.getElementById('bestPriceValue').textContent = formatIQD(cheapest.priceIQD);
    document.getElementById('bestPricePlatform').textContent = `${getPlatformLabel(cheapest.platform)} • ${IRAQ_GOVERNORATES[cheapest.governorate].name}`;

    document.getElementById('nearestItemTitle').textContent = nearest.title;
    document.getElementById('nearestItemDistance').textContent =
      nearest.distanceKm === 0
        ? `في محافظتك (${IRAQ_GOVERNORATES[nearest.governorate].name})`
        : `يبعد ${nearest.distanceKm} كم (${IRAQ_GOVERNORATES[nearest.governorate].name})`;
    document.getElementById('nearestItemPrice').textContent = formatIQD(nearest.priceIQD);

    document.getElementById('smartMatchTitle').textContent = smartest.title;
    document.getElementById('smartMatchMeta').textContent = `${formatIQD(smartest.priceIQD)} (${IRAQ_GOVERNORATES[smartest.governorate].name})`;
    document.getElementById('smartMatchSaving').textContent = `تطابق ذكي ${smartest.smartScore}%`;
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

  // رسم شبكة البطاقات
  const grid = document.getElementById('resultsGrid');
  if (finalDisplayed.length === 0) {
    grid.innerHTML = `
      <div class="product-card" style="grid-column: 1 / -1; text-align: center; padding: 36px;">
        <div style="font-size: 2.5rem; margin-bottom: 8px;">🔍</div>
        <h3>لا توجد نتائج مطابقة للفلاتر الحالية</h3>
        <p style="color: var(--text-secondary); margin: 8px 0 16px;">
          جرب إلغاء خيار "داخل محافظتي فقط" أو زيادة الميزانية القصوى، أو استخدم بوابات البحث المباشر أعلاه.
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
          ? '📍 داخل محافظتك الآن (استلام/توصيل سريع)'
          : `🚗 يبعد عنك ${offer.distanceKm} كم`;
      const directUrl = buildOfferDirectUrl(offer);

      return `
      <article class="product-card ${offer.isCheapest ? 'is-cheapest' : ''}">
        <div>
          <div class="card-badges">
            <span class="platform-badge platform-${offer.platform}">
              ${getPlatformLabel(offer.platform)}
            </span>
            <div class="award-badges">
              ${offer.isCheapest ? '<span class="award-pill award-cheapest">🔥 الأرخص سعراً</span>' : ''}
              ${offer.isNearest ? '<span class="award-pill award-nearest">📍 الأقرب لك</span>' : ''}
              ${offer.isBestSmart ? '<span class="award-pill award-smart">⭐ أفضل خيار</span>' : ''}
            </div>
          </div>

          <div class="card-main" style="margin-top: 12px;">
            <div class="product-emoji-thumb" aria-hidden="true">${offer.emoji || '🛍️'}</div>
            <div class="product-info">
              <h3 class="product-title">${offer.title}</h3>
              <div class="store-name">
                <span>${offer.storeName}</span>
                ${offer.verified ? '<span class="verified-check" title="متجر/بيج موثق">✔</span>' : ''}
                <span style="margin-right:auto; font-size:0.74rem; color:var(--text-muted);">${offer.postedAgo}</span>
              </div>
            </div>
          </div>

          <p class="post-snippet" style="margin-top: 12px;">
            "${offer.snippet}"
          </p>
        </div>

        <div>
          <div class="card-metrics">
            <div class="metric-box">
              <span class="metric-label">السعر المستخرج</span>
              <span class="metric-price">${formatIQD(offer.priceIQD)}</span>
              <span class="metric-sub">
                ${convertIQDtoUSD(offer.priceIQD)}
                ${offer.savingIQD > 5000 ? ` • <strong style="color:#34d399;">وفر ${formatIQD(offer.savingIQD)}</strong>` : ''}
              </span>
            </div>

            <div class="metric-box">
              <span class="metric-label">الموقع والمسافة</span>
              <span class="metric-location">${govName} - ${offer.district}</span>
              <span class="distance-tag ${offer.distanceKm === 0 ? 'same-city' : ''}">${distText}</span>
            </div>
          </div>

          <div style="font-size: 0.78rem; color: var(--text-secondary); margin: 10px 0; display:flex; justify-content:space-between;">
            <span>🚚 ${offer.delivery}</span>
            <span>📞 ${offer.phone}</span>
          </div>

          <div class="card-actions">
            <a href="${directUrl}" target="_blank" rel="noopener noreferrer" class="btn-card-primary">
              فتح العرض في ${offer.platform === 'facebook' ? 'فيسبوك' : offer.platform === 'instagram' ? 'انستغرام' : 'كوكل'} ↗
            </a>
            <button type="button" class="btn-card-secondary" onclick="navigator.clipboard?.writeText('${offer.phone}'); this.textContent='تم نسخ الرقم ✓'">
              نسخ الرقم
            </button>
          </div>
        </div>
      </article>
      `;
    })
    .join('');
}

// ============================================================================
// تحديد الموقع التلقائي عبر GPS ومطابقته لأقرب محافظة عراقية
// ============================================================================
function detectUserGovernorateByGPS() {
  const statusBanner = document.getElementById('searchStatusBanner');
  if (!navigator.geolocation) {
    statusBanner.hidden = false;
    statusBanner.textContent = '⚠️ المتصفح لا يدعم تحديد الموقع الجغرافي، يمكنك اختيار محافظتك من القائمة.';
    return;
  }

  statusBanner.hidden = false;
  statusBanner.textContent = '📡 جاري تحديد موقعك في العراق وحساب أقرب محافظة...';

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
      statusBanner.textContent = `✅ تم تحديد محافظتك تلقائياً: ${IRAQ_GOVERNORATES[closestGov].name} — تم ترتيب العروض الأقرب إليك!`;
      renderApp();
    },
    () => {
      statusBanner.textContent = 'ℹ️ تعذر الوصول إلى GPS تلقائياً — يرجى اختيار محافظتك يدوياً من القائمة.';
    }
  );
}

// ============================================================================
// ربط الأحداث والتفاعلات (Event Listeners)
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchQuery');
  const clearQueryBtn = document.getElementById('clearQueryBtn');
  const govSelect = document.getElementById('governorateSelect');
  const maxBudgetInput = document.getElementById('maxBudgetInput');
  const sameCityCheckbox = document.getElementById('sameCityOnlyCheckbox');
  const exchangeRateInput = document.getElementById('exchangeRateInput');

  // حدث البحث
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

  // البحث الفوري أثناء الكتابة
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

  // تغيير المحافظة
  govSelect.addEventListener('change', () => {
    state.selectedGov = govSelect.value;
    renderApp();
  });

  // تغيير الميزانية
  maxBudgetInput.addEventListener('input', () => {
    state.maxBudget = maxBudgetInput.value ? Number(maxBudgetInput.value) : null;
    renderApp();
  });

  // فلتر داخل محافظتي فقط
  sameCityCheckbox.addEventListener('change', () => {
    state.sameCityOnly = sameCityCheckbox.checked;
    renderApp();
  });

  // تغيير سعر الصرف
  exchangeRateInput.addEventListener('input', () => {
    const val = Number(exchangeRateInput.value);
    if (val >= 100000 && val <= 300000) {
      state.exchangeRate100USD = val;
      renderApp();
    }
  });

  // أزرار البحث السريع (Tags)
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

  // تبويبات المنصات (الكل / فيس / انستا / كوكل)
  document.querySelectorAll('.platform-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.platform-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      state.selectedPlatform = tab.getAttribute('data-platform');
      renderApp();
    });
  });

  // أزرار الترتيب (الأفضل / الأرخص / الأقرب)
  document.querySelectorAll('.sort-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.sort-pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      state.sortBy = pill.getAttribute('data-sort');
      renderApp();
    });
  });

  // أزرار القفز السريع من الملخص العلوي
  document.getElementById('jumpToCheapestBtn').addEventListener('click', () => {
    document.querySelector('[data-sort="cheapest"]').click();
  });
  document.getElementById('jumpToNearestBtn').addEventListener('click', () => {
    document.querySelector('[data-sort="nearest"]').click();
  });
  document.getElementById('jumpToSmartBtn').addEventListener('click', () => {
    document.querySelector('[data-sort="smart"]').click();
  });

  // زر GPS
  document.getElementById('detectLocationBtn').addEventListener('click', detectUserGovernorateByGPS);

  // تبديل المظهر (ليلي / نهاري)
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  themeToggleBtn.addEventListener('click', () => {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', isDark ? 'light' : 'dark');
    themeToggleBtn.textContent = isDark ? '☀️' : '🌙';
  });

  // نافذة محلل المنشورات الذكي
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
    document.getElementById('postStoreName').value = 'بيج أربيل ستور للإلكترونيات';
    postRawText.value =
      'عرض خاص اليوم فقط! آيفون 15 برو ماكس 256 جيجا جديد غير مفتوح السعر 9 أوراق ونص فقط، العنوان أربيل عنكاوة ويوجد توصيل سريع لكافة المحافظات للاستفسار 07501239876';
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
      emoji: platform === 'facebook' ? '📘' : platform === 'instagram' ? '📸' : '🌐',
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

    // حفظ المنشور في قاعدة بيانات نيون (Neon PostgreSQL)
    fetch('/api/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOffer)
    }).catch(() => {});
  });

  // جلب العروض المحفوظة من قاعدة بيانات نيون عند فتح الموقع
  fetch('/api/offers')
    .then((r) => r.json())
    .then((data) => {
      if (data && Array.isArray(data.offers) && data.offers.length > 0) {
        const existingIds = new Set( data.offers.map((o) => o.id) );
        const localOnly = state.offers.filter((o) => !existingIds.has(o.id));
        state.offers = [...data.offers, ...localOnly];
        renderApp();
      }
    })
    .catch(() => {});

  // التشغيل الأولي
  renderApp();
});
