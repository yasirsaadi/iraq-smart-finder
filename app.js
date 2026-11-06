// ============================================================================
// رادار أسعار العراق — مقارنة شاملة للسلع والسيارات والعقارات في المحافظات الـ 18
// ============================================================================

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
  if (offer.imageUrl) return offer.imageUrl;
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

const INITIAL_OFFERS = [
  // ==================== ١. قسم السيارات (Cars) ====================
  {
    id: 'car-elantra-1',
    section: 'cars',
    specs: { year: '2024', mileage: 'زيرو (0 كم)', plate: 'رقم بغداد', origin: 'خليجي وكالة', brand: 'هيونداي' },
    title: 'هيونداي النترا 2024 خليجي زيرو محرك 2000 كامل المواصفات فتحة وبصمة',
    category: 'سيارات',
    keywords: ['سيارة', 'هيونداي', 'النترا', '2024', 'خليجي', 'زيرو'],
    platform: 'facebook',
    storeName: 'معرض النور للسيارات الحديثة - معارض النهضة',
    verified: true,
    allowsInspection: true,
    trustRating: 4.9,
    reviewsCount: 64,
    priceIQD: 31500000, // دفترين و10 أوراق
    deliveryLocalIQD: 0,
    deliveryNationalIQD: 0,
    governorate: 'baghdad',
    district: 'بغداد - معارض النهضة',
    delivery: 'معاينة وفحص سونار في المعرض • تحويل سنوية فوري',
    phone: '07704455661',
    snippet: 'هيونداي النترا موديل 2024 زيرو خليجي ضمان الشركة، السعر دفترين و10 أوراق (31,500,000 د.ع) شامل اللوحات.',
    postedAgo: 'منذ ساعتين'
  },
  {
    id: 'car-elantra-2',
    section: 'cars',
    specs: { year: '2024', mileage: 'زيرو (0 كم)', plate: 'رقم أربيل', origin: 'خليجي وكالة', brand: 'هيونداي' },
    title: 'Hyundai Elantra 2024 خليجي زيرو - ترقيم أربيل فوري',
    category: 'سيارات',
    keywords: ['سيارة', 'هيونداي', 'النترا', '2024', 'خليجي', 'زيرو'],
    platform: 'instagram',
    storeName: 'معرض أربيل الدولي للسيارات (Erbil Motors)',
    verified: true,
    allowsInspection: true,
    trustRating: 4.8,
    reviewsCount: 49,
    priceIQD: 29700000, // دفتر و98 ورقة
    deliveryLocalIQD: 0,
    deliveryNationalIQD: 0,
    governorate: 'erbil',
    district: 'أربيل - مدينة المعارض شارع 100',
    delivery: 'وكالة عامة أو تحويل باسم المشتري من كافة المحافظات',
    phone: '07503322119',
    snippet: 'أرخص سعر بالعراق لهيونداي النترا 2024 زيرو رقم أربيل: دفتر و98 ورقة فقط (29,700,000 د.ع) كفالة عامة.',
    postedAgo: 'منذ 3 ساعات'
  },
  {
    id: 'car-sportage-1',
    section: 'cars',
    specs: { year: '2024', mileage: 'زيرو (0 كم)', plate: 'رقم بغداد', origin: 'خليجي وكالة', brand: 'كيا' },
    title: 'كيا سبورتاج 2024 خليجي زيرو بانوراما شاشة كبيرة ضمان شركة كيا',
    category: 'سيارات',
    keywords: ['سيارة', 'كيا', 'سبورتاج', '2024', 'زيرو', 'خليجي'],
    platform: 'facebook',
    storeName: 'معرض الياسري للسيارات - معارض البياع',
    verified: true,
    allowsInspection: true,
    trustRating: 4.9,
    reviewsCount: 52,
    priceIQD: 39750000, // دفترين و65 ورقة
    deliveryLocalIQD: 0,
    deliveryNationalIQD: 0,
    governorate: 'baghdad',
    district: 'بغداد - معارض البياع',
    delivery: 'مرقمة جاهزة رقم بغداد ألماني • فحص كامل',
    phone: '07801122998',
    snippet: 'كيا سبورتاج 2024 خليجي زيرو فول مواصفات بانوراما السعر دفترين و65 ورقة (39,750,000 د.ع).',
    postedAgo: 'منذ ساعة'
  },
  {
    id: 'car-sportage-2',
    section: 'cars',
    specs: { year: '2023', mileage: '18,000 كم', plate: 'رقم البصرة', origin: 'وارد أمريكي', brand: 'كيا' },
    title: 'كيا سبورتاج 2023 وارد أمريكي كلين تايتل بدون صبغ - رقم البصرة',
    category: 'سيارات',
    keywords: ['سيارة', 'كيا', 'سبورتاج', 'وارد أمريكي', 'كلين'],
    platform: 'google',
    storeName: 'السوق المفتوح العراق - معارض البصرة',
    verified: true,
    allowsInspection: true,
    trustRating: 4.7,
    reviewsCount: 23,
    priceIQD: 29250000, // دفتر و95 ورقة
    deliveryLocalIQD: 0,
    deliveryNationalIQD: 0,
    governorate: 'basra',
    district: 'البصرة - معارض الزبير',
    delivery: 'فحص سونار وكارفاكس مرفق • تحويل فوري',
    phone: '07719900887',
    snippet: 'سبورتاج 2023 وارد أمريكي نظيفة جداً ماشية 18 ألف ميل فقط، السعر دفتر و95 ورقة (29,250,000 د.ع).',
    postedAgo: 'منذ 4 ساعات'
  },
  {
    id: 'car-landcruiser-1',
    section: 'cars',
    specs: { year: '2024', mileage: 'زيرو (0 كم)', plate: 'رقم بغداد', origin: 'خليجي وكالة', brand: 'تويوتا' },
    title: 'تويوتا لاندكروزر GXR 2024 توين تيربو خليجي وكالة زيرو',
    category: 'سيارات',
    keywords: ['سيارة', 'تويوتا', 'لاندكروزر', '2024', 'خليجي'],
    platform: 'instagram',
    storeName: 'معرض القمة للسيارات الفاخرة - الجادرية',
    verified: true,
    allowsInspection: true,
    trustRating: 5.0,
    reviewsCount: 77,
    priceIQD: 124500000, // 8 دفاتر و30 ورقة
    deliveryLocalIQD: 0,
    deliveryNationalIQD: 0,
    governorate: 'baghdad',
    district: 'بغداد - الكرادة / الجادرية',
    delivery: 'ضمان تويوتا العراق الرسمي • استلام فوري',
    phone: '07700088776',
    snippet: 'لاندكروزر 2024 GXR ستة سلندر توين تيربو زيرو رقم بغداد، السعر 8 دفاتر و30 ورقة (124,500,000 د.ع).',
    postedAgo: 'منذ ساعتين'
  },
  {
    id: 'car-jetour-1',
    section: 'cars',
    specs: { year: '2024', mileage: 'زيرو (0 كم)', plate: 'رقم بغداد', origin: 'خليجي وكالة', brand: 'جيتور' },
    title: 'جيتور داشينغ (Jetour Dashing) 2024 زيرو ضمان الوكالة 5 سنوات',
    category: 'سيارات',
    keywords: ['سيارة', 'جيتور', 'داشينغ', '2024', 'خليجي', 'زيرو'],
    platform: 'facebook',
    storeName: 'معرض جيتور بغداد المعتمد - الرصافة',
    verified: true,
    allowsInspection: true,
    trustRating: 4.9,
    reviewsCount: 41,
    priceIQD: 29250000, // دفتر و95 ورقة
    deliveryLocalIQD: 0,
    deliveryNationalIQD: 0,
    governorate: 'baghdad',
    district: 'بغداد - معارض النهضة',
    delivery: 'شامل اللوحات والضمان الرسمي 5 سنوات أو 150 ألف كم',
    phone: '07718822331',
    snippet: 'جيتور داشينغ 2024 فول مواصفات شاشة عملاقة وبانوراما زيرو رقم بغداد، السعر دفتر و95 ورقة (29,250,000 د.ع).',
    postedAgo: 'منذ ساعة'
  },
  {
    id: 'car-nissan-1',
    section: 'cars',
    specs: { year: '2024', mileage: 'زيرو (0 كم)', plate: 'رقم بغداد', origin: 'خليجي وكالة', brand: 'نيسان' },
    title: 'نيسان سني 2024 خليجي زيرو الشكل الجديد كاملة المواصفات رقم بغداد',
    category: 'سيارات',
    keywords: ['سيارة', 'نيسان', 'سني', '2024', 'خليجي', 'زيرو'],
    platform: 'facebook',
    storeName: 'معرض الرصافة للسيارات الحديثة - النهضة',
    verified: true,
    allowsInspection: true,
    trustRating: 4.8,
    reviewsCount: 37,
    priceIQD: 24750000, // دفتر و65 ورقة
    deliveryLocalIQD: 0,
    deliveryNationalIQD: 0,
    governorate: 'baghdad',
    district: 'بغداد - معارض النهضة',
    delivery: 'ترقيم بغداد جاهز وفحص كامل في المعرض',
    phone: '07703344112',
    snippet: 'نيسان سني 2024 زيرو خليجي شاشة وكاميرا وحساسات، السعر دفتر و65 ورقة (24,750,000 د.ع).',
    postedAgo: 'منذ ساعتين'
  },
  {
    id: 'car-chevy-1',
    section: 'cars',
    specs: { year: '2024', mileage: 'زيرو (0 كم)', plate: 'رقم بغداد', origin: 'خليجي وكالة', brand: 'شيفروليه' },
    title: 'شيفروليه تاهو (Tahoe RST) 2024 زيرو وكالة المنصور رقم بغداد',
    category: 'سيارات',
    keywords: ['سيارة', 'شيفروليه', 'تاهو', '2024', 'خليجي', 'زيرو'],
    platform: 'instagram',
    storeName: 'معرض المنصور للسيارات الأمريكية - بغداد',
    verified: true,
    allowsInspection: true,
    trustRating: 4.9,
    reviewsCount: 48,
    priceIQD: 108000000, // 7 دفاتر و20 ورقة
    deliveryLocalIQD: 0,
    deliveryNationalIQD: 0,
    governorate: 'baghdad',
    district: 'بغداد - المنصور',
    delivery: 'ضمان الوكالة الرسمي • تحويل سنوية فوري',
    phone: '07809911223',
    snippet: 'شيفروليه تاهو 2024 فئة RST زيرو مكفولة كفالة عامة، السعر 7 دفاتر و20 ورقة (108,000,000 د.ع).',
    postedAgo: 'منذ 3 ساعات'
  },
  {
    id: 'car-jeep-1',
    section: 'cars',
    specs: { year: '2023', mileage: '14,000 كم', plate: 'رقم أربيل', origin: 'وارد أمريكي', brand: 'جيب' },
    title: 'جيب غراند شيروكي ليمتد 2023 الشكل الجديد وارد أمريكي كلين',
    category: 'سيارات',
    keywords: ['سيارة', 'جيب', 'شيروكي', '2023', 'وارد أمريكي'],
    platform: 'facebook',
    storeName: 'معرض أربيل للسيارات الأمريكية',
    verified: true,
    allowsInspection: true,
    trustRating: 4.8,
    reviewsCount: 29,
    priceIQD: 57000000, // 3 دفاتر و80 ورقة
    deliveryLocalIQD: 0,
    deliveryNationalIQD: 0,
    governorate: 'erbil',
    district: 'أربيل - معارض شارع 100',
    delivery: 'فحص سونار وكارفاكس كامل • وكالة عامة لكافة المحافظات',
    phone: '07504411889',
    snippet: 'جيب غراند شيروكي 2023 ليمتد بانوراما فورويل نظيفة جداً، السعر 3 دفاتر و80 ورقة (57,000,000 د.ع).',
    postedAgo: 'منذ 4 ساعات'
  },
  {
    id: 'car-dodge-1',
    section: 'cars',
    specs: { year: '2022', mileage: '22,000 كم', plate: 'رقم بغداد', origin: 'وارد أمريكي', brand: 'دوج' },
    title: 'دوج تشارجر GT 2022 وارد أمريكي بدون صبغ رقم بغداد ألماني',
    category: 'سيارات',
    keywords: ['سيارة', 'دوج', 'تشارجر', '2022', 'وارد أمريكي'],
    platform: 'facebook',
    storeName: 'معرض البياع للسيارات الرياضية',
    verified: true,
    allowsInspection: true,
    trustRating: 4.8,
    reviewsCount: 33,
    priceIQD: 39000000, // دفترين و60 ورقة
    deliveryLocalIQD: 0,
    deliveryNationalIQD: 0,
    governorate: 'baghdad',
    district: 'بغداد - معارض البياع',
    delivery: 'فحص كمبيوتر وسونار • تحويل فوري',
    phone: '07716655443',
    snippet: 'دوج تشارجر GT موديل 2022 كلين تايتل كشنات جلد وفتحة سقف، السعر دفترين و60 ورقة (39,000,000 د.ع).',
    postedAgo: 'منذ ساعتين'
  },
  {
    id: 'car-changan-1',
    section: 'cars',
    specs: { year: '2024', mileage: 'زيرو (0 كم)', plate: 'رقم البصرة', origin: 'خليجي وكالة', brand: 'شانجان' },
    title: 'شانجان يوني كي (Changan UNI-K) 2024 زيرو خليجي ضمان الوكالة',
    category: 'سيارات',
    keywords: ['سيارة', 'شانجان', 'يوني كي', '2024', 'خليجي', 'زيرو'],
    platform: 'instagram',
    storeName: 'معرض البصرة الدولي للسيارات الحديثة',
    verified: true,
    allowsInspection: true,
    trustRating: 4.9,
    reviewsCount: 44,
    priceIQD: 43500000, // دفترين و90 ورقة
    deliveryLocalIQD: 0,
    deliveryNationalIQD: 0,
    governorate: 'basra',
    district: 'البصرة - العشار',
    delivery: 'شامل الضمان الرسمي 6 سنوات واللوحات',
    phone: '07805544331',
    snippet: 'شانجان يوني كي 2024 زيرو دفع رباعي فول مواصفات، السعر دفترين و90 ورقة (43,500,000 د.ع).',
    postedAgo: 'منذ 3 ساعات'
  },
  {
    id: 'car-mg-1',
    section: 'cars',
    specs: { year: '2024', mileage: 'زيرو (0 كم)', plate: 'رقم بغداد', origin: 'خليجي وكالة', brand: 'ام جي' },
    title: 'إم جي جي تي (MG GT) 2024 تيربو زيرو وكالة العراق مع اللوحات',
    category: 'سيارات',
    keywords: ['سيارة', 'ام جي', 'إم جي', 'mg', '2024', 'خليجي', 'زيرو'],
    platform: 'google',
    storeName: 'وكالة إم جي العراق - بغداد',
    verified: true,
    allowsInspection: true,
    trustRating: 4.8,
    reviewsCount: 51,
    priceIQD: 25500000, // دفتر و70 ورقة
    deliveryLocalIQD: 0,
    deliveryNationalIQD: 0,
    governorate: 'baghdad',
    district: 'بغداد - الكرادة',
    delivery: 'ضمان الوكالة 6 سنوات أو 200 ألف كم',
    phone: '07709988114',
    snippet: 'سيارة MG GT موديل 2024 زيرو رياضية فول مواصفات، السعر دفتر و70 ورقة (25,500,000 د.ع).',
    postedAgo: 'متوفر الآن'
  },
  {
    id: 'car-chery-1',
    section: 'cars',
    specs: { year: '2024', mileage: 'زيرو (0 كم)', plate: 'رقم بغداد', origin: 'خليجي وكالة', brand: 'شيري' },
    title: 'شيري تيجو 8 برو ماكس (Chery Tiggo 8 Pro) 2024 سبعة راكب زيرو',
    category: 'سيارات',
    keywords: ['سيارة', 'شيري', 'تيجو', '2024', 'خليجي', 'زيرو'],
    platform: 'facebook',
    storeName: 'معرض النخبة للسيارات - بغداد',
    verified: true,
    allowsInspection: true,
    trustRating: 4.9,
    reviewsCount: 38,
    priceIQD: 33000000, // دفترين و20 ورقة
    deliveryLocalIQD: 0,
    deliveryNationalIQD: 0,
    governorate: 'baghdad',
    district: 'بغداد - معارض النهضة',
    delivery: 'مرقمة جاهزة مع ضمان الوكالة 5 سنوات',
    phone: '07721133445',
    snippet: 'شيري تيجو 8 برو 2024 زيرو عائلية 7 راكب بانوراما، السعر دفترين و20 ورقة (33,000,000 د.ع).',
    postedAgo: 'منذ ساعتين'
  },
  {
    id: 'car-mercedes-1',
    section: 'cars',
    specs: { year: '2023', mileage: '9,000 كم', plate: 'رقم أربيل', origin: 'خليجي وكالة', brand: 'مرسيدس' },
    title: 'مرسيدس بنز E200 AMG 2023 خليجي صبغ وكالة بحالة الزيرو',
    category: 'سيارات',
    keywords: ['سيارة', 'مرسيدس', 'بنز', 'e200', '2023', 'خليجي'],
    platform: 'instagram',
    storeName: 'معرض رويال موتورز - أربيل',
    verified: true,
    allowsInspection: true,
    trustRating: 5.0,
    reviewsCount: 62,
    priceIQD: 87000000, // 5 دفاتر و80 ورقة
    deliveryLocalIQD: 0,
    deliveryNationalIQD: 0,
    governorate: 'erbil',
    district: 'أربيل - شارع 100',
    delivery: 'كفالة عامة وفحص شركة مرسيدس',
    phone: '07508877665',
    snippet: 'مرسيدس E200 موديل 2023 كت AMG أصلي بانوراما، السعر 5 دفاتر و80 ورقة (87,000,000 د.ع).',
    postedAgo: 'منذ 3 ساعات'
  },
  {
    id: 'car-bmw-1',
    section: 'cars',
    specs: { year: '2023', mileage: '12,000 كم', plate: 'رقم بغداد', origin: 'خليجي وكالة', brand: 'بي ام دبليو' },
    title: 'بي إم دبليو (BMW X5 M-Package) 2023 خليجي رقم بغداد مميز',
    category: 'سيارات',
    keywords: ['سيارة', 'بي ام دبليو', 'bmw', 'x5', '2023', 'خليجي'],
    platform: 'facebook',
    storeName: 'معرض الجادرية للسيارات الفارهة',
    verified: true,
    allowsInspection: true,
    trustRating: 4.9,
    reviewsCount: 47,
    priceIQD: 117000000, // 7 دفاتر و80 ورقة
    deliveryLocalIQD: 0,
    deliveryNationalIQD: 0,
    governorate: 'baghdad',
    district: 'بغداد - الجادرية',
    delivery: 'فحص وكالة كامل وتحويل فوري',
    phone: '07705566771',
    snippet: 'بي إم دبليو X5 موديل 2023 خليجي صبغ وكالة، السعر 7 دفاتر و80 ورقة (117,000,000 د.ع).',
    postedAgo: 'منذ ساعتين'
  },

  // ==================== ٢. قسم العقارات والأراضي (Real Estate) ====================
  {
    id: 'prop-bismayah-1',
    section: 'realestate',
    specs: { areaSqm: 100, deedType: 'سند استثماري', dealType: 'بيع تمليك', propertyType: 'شقة سكنية' },
    title: 'شقة في مجمع بسماية السكني 100 م² طابق مميز جاهزة للسكن الفوري',
    category: 'عقارات',
    keywords: ['عقار', 'شقة', 'بسماية', 'مجمع بسماية', 'بيع'],
    platform: 'facebook',
    storeName: 'مكتب بسماية المركزي للعقارات',
    verified: true,
    allowsInspection: true,
    trustRating: 4.9,
    reviewsCount: 58,
    priceIQD: 105000000, // 105 مليون دينار
    deliveryLocalIQD: 0,
    deliveryNationalIQD: 0,
    governorate: 'baghdad',
    district: 'بغداد - مدينة بسماية السكنية',
    delivery: 'معاينة موقعية وتحويل رسمي في الهيئة الوطنية للاستثمار',
    phone: '07712233445',
    snippet: 'شقة 100 متر مربع في بسماية بلوك A نظيفة جداً مع مطبخ تركي وسبالت، السعر الكلي 105 مليون دينار عراقي.',
    postedAgo: 'منذ ساعتين'
  },
  {
    id: 'prop-bismayah-2',
    section: 'realestate',
    specs: { areaSqm: 120, deedType: 'سند استثماري', dealType: 'بيع تمليك', propertyType: 'شقة سكنية' },
    title: 'شقة في مجمع بسماية 120 م² (3 غرف نوم وصالة) إطلالة مفتوحة',
    category: 'عقارات',
    keywords: ['عقار', 'شقة', 'بسماية', 'مجمع بسماية', 'بيع'],
    platform: 'instagram',
    storeName: 'شركة بوابة بغداد للاستثمار العقاري',
    verified: true,
    allowsInspection: true,
    trustRating: 4.8,
    reviewsCount: 39,
    priceIQD: 122000000, // 122 مليون دينار
    deliveryLocalIQD: 0,
    deliveryNationalIQD: 0,
    governorate: 'baghdad',
    district: 'بغداد - مدينة بسماية السكنية',
    delivery: 'تحويل مباشر في المصرف وهيئة الاستثمار',
    phone: '07814455667',
    snippet: 'شقة مساحة 120 متر مربع في بسماية جاهزة للسكن، السعر 122 مليون دينار (سعر المتر المربع مليون و16 ألف فقط).',
    postedAgo: 'منذ 4 ساعات'
  },
  {
    id: 'prop-house-1',
    section: 'realestate',
    specs: { areaSqm: 200, deedType: 'طابو صرف', dealType: 'بيع تمليك', propertyType: 'دار سكنية' },
    title: 'دار سكنية طابو صرف 200 م² بناء حديث طابقين في النجف الأشرف',
    category: 'عقارات',
    keywords: ['عقار', 'دار', 'سكنية', 'طابو', 'طابو صرف', 'بيت'],
    platform: 'facebook',
    storeName: 'مكتب الغري العقاري المعتمد - النجف',
    verified: true,
    allowsInspection: true,
    trustRating: 4.9,
    reviewsCount: 44,
    priceIQD: 290000000, // 290 مليون دينار
    deliveryLocalIQD: 0,
    deliveryNationalIQD: 0,
    governorate: 'najaf',
    district: 'النجف الأشرف - حي الأمير',
    delivery: 'سند طابو صرف جاهز للتحويل في التسجيل العقاري',
    phone: '07803344556',
    snippet: 'دار سكنية مساحة 200 متر مربع (واجهة 10 نزال 20) بناء درجة أولى واجهة حجر، السعر 290 مليون دينار.',
    postedAgo: 'منذ 3 ساعات'
  },
  {
    id: 'prop-house-2',
    section: 'realestate',
    specs: { areaSqm: 150, deedType: 'سند استثماري', dealType: 'بيع تمليك', propertyType: 'شقة سكنية' },
    title: 'شقة فاخرة للتمليك 150 م² في أربيل (القرية اللبنانية) يصلح للإقامة',
    category: 'عقارات',
    keywords: ['عقار', 'شقة', 'اربيل', 'أربيل', 'القرية اللبنانية', 'دار', 'طابو', 'فاخرة', 'للتمليك'],
    platform: 'google',
    storeName: 'مجموعة أربيل العقارية (Erbil Real Estate)',
    verified: true,
    allowsInspection: true,
    trustRating: 4.8,
    reviewsCount: 51,
    priceIQD: 138000000, // 9 دفاتر و20 ورقة
    deliveryLocalIQD: 0,
    deliveryNationalIQD: 0,
    governorate: 'erbil',
    district: 'أربيل - القرية اللبنانية طريق بحركة',
    delivery: 'تحويل رسمي لكافة العراقيين مع خدمات على مدار الساعة',
    phone: '07509988112',
    snippet: 'شقة 150 م² ثلاث غرف نوم في القرية اللبنانية أربيل، السعر 9 دفاتر و20 ورقة (138,000,000 د.ع).',
    postedAgo: 'متوفر الآن'
  },
  {
    id: 'prop-land-1',
    section: 'realestate',
    specs: { areaSqm: 250, deedType: 'طابو صرف', dealType: 'بيع تمليك', propertyType: 'قطعة أرض' },
    title: 'قطعة أرض سكنية طابو صرف 250 م² كاملة الخدمات في كربلاء المقدسة',
    category: 'عقارات',
    keywords: ['عقار', 'قطعة', 'أرض', 'ارض', 'سكنية', 'طابو', 'طابو صرف'],
    platform: 'facebook',
    storeName: 'مكتب الفراتين للعقارات والاستثمار - كربلاء',
    verified: true,
    allowsInspection: true,
    trustRating: 4.9,
    reviewsCount: 33,
    priceIQD: 175000000, // 175 مليون دينار
    deliveryLocalIQD: 0,
    deliveryNationalIQD: 0,
    governorate: 'karbala',
    district: 'كربلاء المقدسة - حي الأسرة',
    delivery: 'سند طابو صرف سجل عقاري جاهز للتحويل الفوري',
    phone: '07725566778',
    snippet: 'قطعة أرض سكنية 250 م² واجهة 10 متر على شارع مبلط كامل الخدمات، السعر 175 مليون دينار عراقي.',
    postedAgo: 'منذ ساعتين'
  },

  // ==================== ٣. قسم السلع والأجهزة (Products) ====================
  {
    id: 'ip15-1',
    section: 'products',
    specs: {},
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
    section: 'products',
    specs: {},
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
    id: 'ip15-4',
    section: 'products',
    specs: {},
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
    id: 'ac-1',
    section: 'products',
    specs: {},
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
    section: 'products',
    specs: {},
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
    id: 'ps5-1',
    section: 'products',
    specs: {},
    title: 'بلاي ستيشن 5 سليم (PlayStation 5 Slim) نسخة القرص 1 تيرا مع يدتين',
    category: 'ألعاب إلكترونية',
    keywords: ['بلاي ستيشن', 'بلي ستيشن', 'ps5', 'سليم', 'العاب'],
    platform: 'facebook',
    storeName: 'بغداد جيمرز - زيونة',
    verified: true,
    allowsInspection: true,
    trustRating: 4.9,
    reviewsCount: 42,
    priceIQD: 695000,
    deliveryLocalIQD: 4000,
    deliveryNationalIQD: 7000,
    governorate: 'baghdad',
    district: 'زيونة - قرب مول دار السلام',
    delivery: 'توصيل فوري داخل بغداد والمحافظات مع الفحص',
    phone: '07719988221',
    snippet: 'جهاز بلاي ستيشن 5 سليم الأصلي ضمان سنة مع يدتين أصلية.',
    postedAgo: 'منذ ساعتين'
  },
  {
    id: 'lap-1',
    section: 'products',
    specs: {},
    title: 'لابتوب لينوفو للألعاب Lenovo LOQ i7-13650HX RTX 4060 RAM 16GB',
    category: 'حواسيب ولابتوبات',
    keywords: ['لابتوب', 'لينوفو', 'lenovo', 'العاب', 'حاسبة'],
    platform: 'facebook',
    storeName: 'مكتب التكنولوجيا الحديثة - شارع الصناعة',
    verified: true,
    allowsInspection: true,
    trustRating: 4.9,
    reviewsCount: 38,
    priceIQD: 1290000,
    deliveryLocalIQD: 0,
    deliveryNationalIQD: 5000,
    governorate: 'baghdad',
    district: 'بغداد - شارع الصناعة مقابل الجامعة التكنولوجية',
    delivery: 'توصيل مجاني لبغداد مع حقيبة وماوس ألعاب هدية',
    phone: '07705544332',
    snippet: 'لابتوب لينوفو للألعاب والهندسة كارت شاشة RTX 4060 8GB ضمان سنة كاملة.',
    postedAgo: 'منذ 3 ساعات'
  },
  {
    id: 'air-1',
    section: 'products',
    specs: {},
    title: 'سماعة أبل ايربودز برو 2 (AirPods Pro 2 USB-C) أصلية ضمان أبل',
    category: 'إكسسوارات وصوتيات',
    keywords: ['سماعة', 'ايربودز', 'برو', 'airpods', 'ابل'],
    platform: 'instagram',
    storeName: 'موصل تيك ستور (Mosul Tech)',
    verified: true,
    allowsInspection: true,
    trustRating: 4.8,
    reviewsCount: 24,
    priceIQD: 295000,
    deliveryLocalIQD: 3000,
    deliveryNationalIQD: 5000,
    governorate: 'nineveh',
    district: 'الموصل - المجموعة الثقافية',
    delivery: 'توصيل سريع لكافة المحافظات مع فحص السيريال نمبر',
    phone: '07741122339',
    snippet: 'سماعة ايربودز برو الجيل الثاني منفذ تايب سي أصلية مختومة بسعر 295,000 د.ع.',
    postedAgo: 'منذ ساعتين'
  },
  {
    id: 'cof-1',
    section: 'products',
    specs: {},
    title: 'ماكينة قهوة ديلونجي ديديكا (DeLonghi Dedica EC685) إيطالية مع طاحونة',
    category: 'أجهزة مطبخ',
    keywords: ['ماكينة', 'قهوة', 'ديلونجي', 'ديديكا', 'اسبريسو'],
    platform: 'google',
    storeName: 'متجر مسواك العراقي (Miswag)',
    verified: true,
    allowsInspection: true,
    trustRating: 4.9,
    reviewsCount: 61,
    priceIQD: 245000,
    deliveryLocalIQD: 4000,
    deliveryNationalIQD: 6000,
    governorate: 'baghdad',
    district: 'بغداد - الكرادة',
    delivery: 'توصيل سريع لكافة المحافظات مع ضمان سنة',
    phone: '07804455112',
    snippet: 'ماكينة إسبريسو ديلونجي ديديكا المعدنية الأصلية 15 بار بسعر 245,000 د.ع.',
    postedAgo: 'متوفر بالمخزن'
  },
  {
    id: 'tv-1',
    section: 'products',
    specs: {},
    title: 'شاشة سامسونج سمارت 55 بوصة 4K Crystal UHD موديل 2024',
    category: 'شاشات وتلفزيونات',
    keywords: ['شاشة', 'سامسونج', '55', 'بوصة', 'تلفزيون', 'سمارت'],
    platform: 'facebook',
    storeName: 'معرض النجف الدولي للأجهزة المنزلية',
    verified: true,
    allowsInspection: true,
    trustRating: 4.8,
    reviewsCount: 31,
    priceIQD: 540000,
    deliveryLocalIQD: 0,
    deliveryNationalIQD: 10000,
    governorate: 'najaf',
    district: 'النجف الأشرف - شارع الروان',
    delivery: 'توصيل مع قاعدة تعليق جدارية مجانية وضمان سنتين',
    phone: '07817766554',
    snippet: 'شاشة سامسونج 55 بوصة دقة فور كي أصلية تدعم شاهد ونتفليكس واليوتيوب بسعر 540,000 د.ع.',
    postedAgo: 'منذ 4 ساعات'
  }
];

const state = {
  offers: [...INITIAL_OFFERS],
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

  if (text.includes('دفترين')) {
    let usd = 20000;
    const extraW = text.match(/و\s*(\d+)\s*(?:ورقة|ورقات|اوراق|أوراق)/);
    if (extraW) usd += parseFloat(extraW[1]) * 100;
    extractedPriceIQD = Math.round(usd * ratePer1USD);
  } else {
    const daftarMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:دفتر|دفاتر)/);
    const millionWordMatch = text.match(/(\d{1,4}(?:\.\d+)?)\s*(?:مليون|ملايين)/);
    const warqaMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:ورقة|ورقات|اوراق|أوراق)/);

    if (daftarMatch) {
      let usd = parseFloat(daftarMatch[1]) * 10000;
      const extraWarqa = text.match(/و\s*(\d+)\s*(?:ورقة|أوراق|اوراق)/);
      if (extraWarqa) usd += parseFloat(extraWarqa[1]) * 100;
      extractedPriceIQD = Math.round(usd * ratePer1USD);
    } else if (millionWordMatch) {
      extractedPriceIQD = Math.round(parseFloat(millionWordMatch[1]) * 1000000);
    } else if (text.includes('ورقتين')) {
      extractedPriceIQD = Math.round(200 * ratePer1USD);
    } else if (text.includes('ورقة ونص')) {
      extractedPriceIQD = Math.round(150 * ratePer1USD);
    } else if (warqaMatch) {
      let usd = parseFloat(warqaMatch[1]) * 100;
      if (text.includes('ونص')) usd += 50;
      extractedPriceIQD = Math.round(usd * ratePer1USD);
    }
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
      `/api/live-search?q=${encodeURIComponent(cleanQuery)}&gov=${encodeURIComponent(state.selectedGov)}&section=${encodeURIComponent(state.selectedSection)}`,
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
      return a.distanceKm - b.distanceKm || (a.effectivePriceIQD || 999999999999) - (b.effectivePriceIQD || 999999999999);
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
  return 'مواقع كوكل';
}

// رسم الشارات التخصصية للسيارات والعقارات داخل البطاقة
function renderSpecializedSpecsHtml(offer) {
  const specs = offer.specs || {};
  if (offer.section === 'cars') {
    const pills = [];
    if (specs.year) pills.push(`<span class="spec-pill">الموديل: ${specs.year}</span>`);
    if (specs.mileage) pills.push(`<span class="spec-pill">الممشى: ${specs.mileage}</span>`);
    if (specs.plate) pills.push(`<span class="spec-pill spec-pill-highlight">${specs.plate}</span>`);
    if (specs.origin) pills.push(`<span class="spec-pill">${specs.origin}</span>`);
    return pills.length ? `<div class="spec-pills-row">${pills.join('')}</div>` : '';
  }

  if (offer.section === 'realestate') {
    const pills = [];
    const area = Number(specs.areaSqm) || 0;
    if (area > 0) pills.push(`<span class="spec-pill">المساحة: ${area} م²</span>`);
    if (specs.deedType) pills.push(`<span class="spec-pill spec-pill-highlight">${specs.deedType}</span>`);
    if (specs.dealType) pills.push(`<span class="spec-pill">${specs.dealType}</span>`);
    if (area > 0 && offer.priceIQD && offer.priceIQD > 0) {
      const pricePerSqm = Math.round(offer.priceIQD / area);
      pills.push(`<span class="spec-pill spec-pill-highlight">سعر المتر: ${pricePerSqm.toLocaleString('en-US')} د.ع / م²</span>`);
    }
    return pills.length ? `<div class="spec-pills-row">${pills.join('')}</div>` : '';
  }

  return '';
}

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
      box.innerHTML = '<div class="alert-row">لا توجد تقييمات سابقة مسجلة لهذه الجهة حتى الآن. كن أول من يقيمها!</div>';
      return;
    }
    box.innerHTML = reviews
      .map(
        (r) => `
        <div class="alert-row">
          <div>
            <strong>${'★'.repeat(r.rating)} (${r.allows_inspection ? 'يقبل الفحص الكامل' : 'رفض الفحص'})</strong>
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

  const { allFiltered, finalDisplayed, stats } = getProcessedOffers();

  document.getElementById('countAll').textContent = allFiltered.length;
  document.getElementById('countFb').textContent = allFiltered.filter((o) => o.platform === 'facebook').length;
  document.getElementById('countIg').textContent = allFiltered.filter((o) => o.platform === 'instagram').length;
  document.getElementById('countGg').textContent = allFiltered.filter((o) => o.platform === 'google').length;

  if (stats) {
    document.getElementById('meterMinPrice').textContent = `${formatIQD(stats.minPrice)} (${convertIQDtoUSD(stats.minPrice)})`;
    document.getElementById('meterAvgPrice').textContent = `${formatIQD(stats.avgPrice)} (${convertIQDtoUSD(stats.avgPrice)})`;
    document.getElementById('meterMaxPrice').textContent = `${formatIQD(stats.maxPrice)} (${convertIQDtoUSD(stats.maxPrice)})`;
    const diff = stats.maxPrice - stats.minPrice;
    document.getElementById('meterMaxDiffNote').textContent =
      diff > 0 ? `أغلى من أقل عرض بمقدار ${formatIQD(diff)}` : 'السعر موحد في السوق';

    if (state.adComparisonPrice && state.adComparisonPrice > stats.minPrice) {
      const savedFromAd = state.adComparisonPrice - stats.minPrice;
      const banner = document.getElementById('searchStatusBanner');
      banner.hidden = false;
      banner.textContent = `نتيجة فحص الإعلان الممول: وجدنا لك نفس العرض بسعر ${formatIQD(stats.minPrice)}، أي أنك وفرت ${formatIQD(savedFromAd)} مقارنة بسعر الإعلان الممول!`;
    }
  } else {
    document.getElementById('meterMinPrice').textContent = '—';
    document.getElementById('meterAvgPrice').textContent = '—';
    document.getElementById('meterMaxPrice').textContent = '—';
    document.getElementById('meterMaxDiffNote').textContent = 'ابحث للمقارنة';
  }

  const pricedFiltered = allFiltered.filter((o) => o.effectivePriceIQD && o.effectivePriceIQD > 0);

  if (allFiltered.length > 0) {
    const cheapest = pricedFiltered.length
      ? [...pricedFiltered].sort((a, b) => a.effectivePriceIQD - b.effectivePriceIQD)[0]
      : allFiltered[0];
    const nearest = [...allFiltered].sort((a, b) => a.distanceKm - b.distanceKm || (a.effectivePriceIQD || 999999999999) - (b.effectivePriceIQD || 999999999999))[0];
    const smartest = [...allFiltered].sort((a, b) => b.smartScore - a.smartScore)[0];

    state.topCardTargets = {
      cheapest: cheapest.id,
      nearest: nearest.id,
      smart: smartest.id
    };

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
        <h3 style="margin-bottom: 8px; color: var(--brand-primary);">جاري البحث الحي في فيسبوك وانستغرام ومواقع العراق عن "${state.query}"...</h3>
        <p style="color: var(--text-muted); font-size: 0.88rem;">
          يتم الآن فحص المعارض والمكاتب العقارية والمتاجر العراقية واستخراج الروابط والصور والأسعار الحقيقية.
        </p>
      </div>
    `;
    return;
  }

  if (finalDisplayed.length === 0) {
    grid.innerHTML = `
      <div class="product-card" style="grid-column: 1 / -1; text-align: center; padding: 36px;">
        <h3 style="margin-bottom: 6px;">لم يتم العثور على عروض مطابقة للمحددات المختارة</h3>
        <p style="color: var(--text-muted); font-size: 0.88rem;">
          جرب تغيير الفلاتر أو اضغط على أحد أزرار "البحث الحي في المنصات المفتوحة" أعلاه لفتح نتائج فيسبوك أو انستغرام أو كوكل مباشرة.
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
      const safeStoreName = String(offer.storeName || 'معرض').replace(/'/g, '');
      const specsHtml = renderSpecializedSpecsHtml(offer);

      const thumbHtml = imgUrl
        ? `<img src="${imgUrl}" alt="${offer.title}" class="product-thumb-img" loading="lazy" onerror="this.style.display='none'" />`
        : `<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#9ca3af" stroke-width="1.6">
             <circle cx="12" cy="12" r="9"></circle>
             <path d="M12 8v8M8 12h8"></path>
           </svg>`;

      let deliveryBreakdownHtml = '';
      if (offer.section === 'cars') {
        deliveryBreakdownHtml = `<span class="delivery-breakdown">فحص سونار ومعاينة مباشرة في المعرض</span>`;
      } else if (offer.section === 'realestate') {
        deliveryBreakdownHtml = `<span class="delivery-breakdown">معاينة موقعية وتدقيق السند العقاري</span>`;
      } else if (offer.priceIQD && offer.priceIQD > 0) {
        if (state.includeDelivery) {
          deliveryBreakdownHtml =
            offer.deliveryFeeIQD === 0
              ? `<span class="delivery-breakdown">السعر الصافي واصل لباب البيت (توصيل مجاني)</span>`
              : `<span class="delivery-breakdown">السعر الصافي واصل لباب البيت (السلعة ${formatIQD(offer.priceIQD)} + توصيل ${formatIQD(offer.deliveryFeeIQD)})</span>`;
        } else {
          deliveryBreakdownHtml = `<span class="delivery-breakdown">سعر السلعة فقط (التوصيل لمحافظتك: ${offer.deliveryFeeIQD === 0 ? 'مجاني' : formatIQD(offer.deliveryFeeIQD)})</span>`;
        }
      }

      const inspectionLabel =
        offer.section === 'cars'
          ? '✔ مكفول ويقبل فحص السونار والكمبيوتر'
          : offer.section === 'realestate'
            ? '✔ سند رسمي قابل للتحويل الفوري'
            : '✔ يقبل فتح وفحص الطلب أمام المندوب';

      return `
      <article id="offer-card-${offer.id}" data-offer-id="${offer.id}" class="product-card ${offer.isCheapest ? 'is-cheapest' : ''}">
        <div class="card-source-bar">
          <div class="source-identity">
            <span class="platform-chip chip-${offer.platform}">
              ${getPlatformName(offer.platform)}
            </span>
            <span class="seller-name">${offer.storeName}</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <button type="button" class="trust-rate-btn" onclick="window.openStoreReviewModal('${safeStoreName}')" title="عرض وإضافة تقييمات المعرض أو المتجر">
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

          ${specsHtml}

          <p class="seller-description">${offer.snippet}</p>

          <div class="trust-and-inspection-row">
            <span class="inspection-pill">${inspectionLabel}</span>
            <button type="button" class="overview-jump" style="background:none; border:none; cursor:pointer;" onclick="window.openStoreReviewModal('${safeStoreName}')">
              تقييم الجهة أو الإبلاغ
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
    box.innerHTML = '<div class="alert-row">لا توجد تنبيهات نشطة حالياً. أضف سلعة أو سيارة أو عقار ليراقبه الرادار لك!</div>';
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
      (targetId && document.querySelector(`[data-offer-id="${targetId}"]`)) ||
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
      section,
      specs,
      title: rawText.slice(0, 68) + (rawText.length > 68 ? '...' : ''),
      category: section === 'cars' ? 'سيارات' : section === 'realestate' ? 'عقارات' : 'سلع وأجهزة',
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
      delivery: section === 'products' ? `توصيل داخل المحافظة ${formatIQD(deliveryLocalIQD)}` : 'معاينة وفحص رسمي',
      phone: parsed.phone,
      snippet: rawText,
      postedAgo: 'أضيف الآن'
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
    }).catch(() => {});
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

  const savedVipPhone = localStorage.getItem('dalal_vip_phone');
  if (savedVipPhone) {
    verifySubscriptionFromServer(savedVipPhone, false);
  }

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
    const phone = document.getElementById('subPhoneInput').value.trim();
    const paymentMethod = document.getElementById('subPaymentMethod').value;

    await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, paymentMethod })
    }).catch(() => {});

    localStorage.setItem('dalal_vip_phone', phone);
    await verifySubscriptionFromServer(phone, false);
    subscriptionModal.close();

    const banner = document.getElementById('searchStatusBanner');
    banner.hidden = false;
    banner.textContent = `تم تفعيل عضوية رادار أسعار العراق لمدة 30 يوماً للرقم ${phone} — جميع الميزات مفعلة بالكامل!`;
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

  loadPriceAlerts();
  renderApp();
});
