// ============================================================================
// أدوات التعقيم المشتركة بين الخادم والمتصفح
// تمنع حقن الشيفرة (XSS) من النصوص والروابط القادمة من مصادر خارجية أو من المستخدمين.
// ============================================================================

const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;',
  '=': '&#61;'
};

/** يحوّل أي قيمة إلى نص آمن للإدراج داخل HTML (محتوى أو قيمة خاصية بين علامتي تنصيص). */
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"'`=]/g, (ch) => HTML_ESCAPES[ch]);
}

/**
 * يقبل الروابط ذات البروتوكول http أو https فقط ويعيد الرابط بصيغته القياسية،
 * ويرفض javascript: و data: وغيرها بإرجاع null.
 */
export function safeHttpUrl(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (parsed.username || parsed.password) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

/** رقم هاتف عراقي محمول بصيغة 07XXXXXXXXX فقط، وإلا null. */
export function safeIraqiMobile(value) {
  const digits = String(value || '').replace(/[^\d]/g, '');
  return /^07[3-9]\d{8}$/.test(digits) ? digits : null;
}

/** يزيل محارف التحكم غير المرئية ويقص النص إلى طول أقصى. */
export function cleanPlainText(value, maxLength = 500) {
  return String(value ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * يحول مقتطف HTML خارجي إلى نص عادي:
 * يحذف الوسوم، ثم يفك ترميز الكيانات، ثم يحذف أي وسوم ظهرت بعد فك الترميز،
 * وأخيراً يحذف علامتي < و > نهائياً كي لا يبقى أي أثر لوسم.
 */
export function htmlToPlainText(html, maxLength = 500) {
  const withoutTags = String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ');
  const decoded = decodeHtmlEntities(withoutTags);
  const stripped = decoded.replace(/<[^>]*>/g, ' ').replace(/[<>]/g, ' ');
  return cleanPlainText(stripped, maxLength);
}

export function decodeHtmlEntities(str) {
  return String(str ?? '')
    .replace(/&#x([0-9A-Fa-f]{1,6});/g, (_, hex) => safeFromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d{1,7});/g, (_, dec) => safeFromCodePoint(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function safeFromCodePoint(code) {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return '';
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

// الأسماء العامة (اسم منصة أو نطاق موقع) لا تمثل تاجراً محدداً، فلا تُقبل لها تقييمات
// حتى لا تُجمع تحتها تقييمات بائعين مختلفين. تُستخدم في المتصفح والخادم معاً.
const GENERIC_SELLER_NAMES = new Set(['منشور أو صفحة على فيسبوك', 'منشور أو حساب على انستغرام', 'معلن غير مسمى', 'فيسبوك', 'انستغرام', 'مواقع الويب']);

export function isReviewableSellerName(name) {
  const n = String(name || '').trim();
  // أي اسم يحمل نطاق موقع (مثل "البسطية (albastiya.com)") هو اسم مصدر لا تاجر
  return n.length >= 2 && !GENERIC_SELLER_NAMES.has(n) && !/(^|[\s(])[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(?=$|[\s)])/i.test(n);
}
