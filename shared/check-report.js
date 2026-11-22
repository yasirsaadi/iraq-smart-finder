// ============================================================================
// نصوص فحص الإعلان: حكم السعر، ملخص دليل السعر، نتيجة الشاصي، وقائمة التحقق قبل الدفع.
// مشتركة بين نافذة الفحص في المتصفح وصفحة التقرير القابل للمشاركة في الخادم،
// كي يقول التقرير المشارك ما قالته النافذة حرفياً.
// ============================================================================

export function formatIQDText(amountIQD) {
  if (!amountIQD || amountIQD <= 0) return 'السعر داخل المنشور الأصلي';
  if (amountIQD >= 10000000) {
    const millions = (amountIQD / 1000000).toFixed(amountIQD % 1000000 === 0 ? 0 : 2);
    return `${millions} مليون د.ع`;
  }
  return `${Math.round(amountIQD).toLocaleString('en-US')} د.ع`;
}

export const AD_CHECKLISTS = {
  cars: ['افحص السيارة بالسونار والكمبيوتر في مركز فحص مستقل', 'طابق رقم الشاصي مع السنوية واسأل عن الوارد والحوادث', 'لا تدفع عربوناً قبل المعاينة'],
  realestate: ['تحقق من السند في دائرة التسجيل العقاري', 'تأكد أن البائع هو المالك أو لديه وكالة نافذة', 'عاين العقار بنفسك ولا تحوّل مالاً قبل العقد'],
  products: ['اطلب الفحص قبل الدفع أو الدفع عند الاستلام', 'تأكد من الضمان والمنشأ', 'احذر الأسعار الأقل كثيراً من السوق']
};

/** جملة الحكم على السعر. */
export function verdictLine(j) {
  const pct = Math.abs(j?.diffPct || 0);
  const lines = {
    no_price: 'اكتب السعر المكتوب في الإعلان، أو الصق نص الإعلان ليُقرأ منه.',
    insufficient: `لا توجد لدينا بعد أسعار مماثلة كافية للحكم (${j?.count || 0} من 3 على الأقل).`,
    suspicious_low: `⚠ أرخص من سعر السوق بـ ${pct}% — انخفاض غير معتاد. احذر: كثير من الإعلانات بهذا الفرق احتيال أو فيها عيب مخفي.`,
    below_market: `✔ أرخص من أغلب العروض المماثلة بـ ${pct}% عن الوسيط. فرصة جيدة إن كانت المواصفات مطابقة.`,
    fair: '✔ ضمن نطاق السعر المعتاد للعروض المماثلة.',
    above_market: `أغلى من الوسيط بـ ${pct}%. يمكنك التفاوض على السعر.`,
    overpriced: `✖ أغلى من السوق بـ ${pct}% (نحو ${formatIQDText(j?.diffIQD)} زيادة). فاوض أو ابحث عن بديل.`
  };
  return lines[j?.verdict] || '';
}

/** ملخص دليل السعر بجملة واحدة. */
export function guideSummaryText(g) {
  if (!g || !g.count) return '';
  const kinds = [g.byKind?.declared ? `${g.byKind.declared} معلن في مواقع` : '', g.byKind?.estimated ? `${g.byKind.estimated} تقديري من نتائج البحث` : '']
    .filter(Boolean)
    .join('، ');
  const where = g.scopeName ? ` في ${g.scopeName}` : '';
  if (!g.enough) return `ذاكرة الأسعار: ${g.count} سعر فقط لـ ${g.label}${where} خلال ${g.windowDays} يوماً — غير كافٍ لحكم موثوق بعد.`;
  const perSqm = g.perSqmMedian ? ` • سعر المتر الوسيط ${formatIQDText(g.perSqmMedian)}` : '';
  return `ذاكرة الأسعار (${g.label}${where}): الوسيط ${formatIQDText(g.median)}، وأغلب الأسعار بين ${formatIQDText(g.q1)} و${formatIQDText(g.q3)} — من ${g.count} سعراً خلال ${g.windowDays} يوماً (${kinds})${perSqm}.`;
}

/** أساس المقارنة للعقار: سعر المتر أو تنبيه بأن المقارنة تقريبية. */
export function basisLine(section, price, areaSqm, guide) {
  if (section !== 'realestate') return '';
  if (areaSqm > 0 && guide?.perSqmMedian) {
    return `قورن سعر المتر: ${formatIQDText(Math.round(price / areaSqm))} للمتر مقابل وسيط ${formatIQDText(guide.perSqmMedian)}.`;
  }
  return 'تنبيه: أسعار العقارات تختلف كثيراً بالمساحة والمنطقة؛ اكتب المساحة لمقارنة أدق بسعر المتر.';
}

const VIN_FIELD_NAMES = { year: 'سنة الصنع', make: 'الشركة', model: 'الطراز' };

/** تحذيرات الشاصي وما طابق منه الإعلان. */
export function vinFindings(v) {
  if (!v || v.error) return { warnings: [], matched: [] };
  const warnings = [];
  if (!v.checkDigitOk && v.region?.code === 'north_america') {
    warnings.push('خانة التحقق في الرقم لا تطابق: الرقم مكتوب خطأً أو مزوّر. اطلب رؤية الشاصي على السيارة نفسها.');
  }
  for (const c of v.comparison?.checks || []) {
    if (c.ok === false) warnings.push(`${VIN_FIELD_NAMES[c.field]} في الإعلان لا تطابق الشاصي: الإعلان «${c.ad}» والشاصي «${c.vin}».`);
  }
  const matched = (v.comparison?.checks || []).filter((c) => c.ok === true).map((c) => VIN_FIELD_NAMES[c.field]);
  return { warnings, matched };
}

/** مواصفات الشاصي المفكوكة كأزواج (عنوان، قيمة). */
export function vinSpecRows(d) {
  if (!d) return [];
  return [
    ['الشركة والطراز', [d.make, d.model].filter(Boolean).join(' ')],
    ['سنة الصنع', d.modelYear],
    ['الفئة', d.trim || d.series],
    ['الهيكل', d.body],
    ['المحرك', d.engineL ? `${d.engineL} لتر${d.cylinders ? ` • ${d.cylinders} سلندر` : ''}` : null],
    ['الوقود والدفع', [d.fuel, d.drive].filter(Boolean).join(' • ')],
    ['بلد المصنع', [d.plantCountry, d.plantCity].filter(Boolean).join(' • ')]
  ].filter(([, val]) => val);
}
