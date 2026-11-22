// ============================================================================
// تقرير "قبل أن تدفع" القابل للمشاركة
// الخادم يعيد حساب كل شيء بنفسه (دليل السعر، الحكم، الشاصي) من مدخلات الفحص،
// فلا يستطيع أحد صناعة تقرير مزيف يقول "السعر عادل" باسم الموقع.
// ============================================================================

import { randomBytes } from 'node:crypto';
import { judgeAdPrice } from '../shared/price-engine.js';
import { escapeHtml as esc, cleanPlainText } from '../shared/sanitize.js';
import { normalizeVin, compareVinWithAd } from '../shared/vin.js';
import { formatIQDText, AD_CHECKLISTS, verdictLine, guideSummaryText, basisLine, vinFindings, vinSpecRows } from '../shared/check-report.js';

const SECTIONS = ['cars', 'realestate', 'products'];
const SECTION_NAMES = { cars: 'سيارة', realestate: 'عقار', products: 'سلعة' };

export async function initReportTables(sql) {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS dalal_iraq_check_reports (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
}

/** يتحقق من مدخلات الفحص. يعيد null إن كانت غير صالحة. */
export function cleanCheckInput(body) {
  const query = cleanPlainText(body?.query, 120);
  const section = SECTIONS.includes(body?.section) ? body.section : null;
  const price = Math.round(Number(body?.price));
  if (!query || !section || !(price > 0 && price < 1e12)) return null;
  const area = Math.round(Number(body?.area)) || 0;
  return {
    query,
    section,
    price,
    area: section === 'realestate' && area > 0 && area < 1_000_000 ? area : 0,
    vin: section === 'cars' && body?.vin ? normalizeVin(body.vin).slice(0, 17) : '',
    adText: cleanPlainText(body?.adText, 1800)
  };
}

/** يبني لقطة التقرير بحساب الخادم وحده. */
export async function buildCheckReport(input, { listingIndex, vinDecoder }) {
  const raw = await listingIndex.priceGuide({ query: input.query, section: input.section, governorate: input.governorate || null });
  const guide = raw ? { ...raw, scopeName: raw.scope === 'governorate' ? input.scopeNames?.[raw.governorate] || raw.governorate : 'العراق' } : raw;
  const perSqm =
    input.section === 'realestate' && input.area > 0 && guide?.perSqmMedian
      ? { enough: true, count: guide.perSqmCount, median: guide.perSqmMedian, q1: guide.perSqmQ1, q3: guide.perSqmQ3 }
      : null;
  const judgement = perSqm ? judgeAdPrice(input.price / input.area, perSqm) : judgeAdPrice(input.price, guide);
  if (perSqm && judgement.diffIQD) judgement.diffIQD = Math.round(judgement.diffIQD * input.area);

  let vin = null;
  if (input.vin) {
    try {
      const r = await vinDecoder.decode(input.vin);
      vin = r.valid ? { ...r, comparison: compareVinWithAd(r.decoded, `${input.query} ${input.adText}`) } : { error: true, message: 'رقم الشاصي المدخل غير صالح.' };
    } catch {
      vin = { error: true, message: 'تعذر فحص الشاصي وقت إنشاء التقرير.' };
    }
  }
  return {
    query: input.query,
    section: input.section,
    price: input.price,
    area: perSqm ? input.area : 0,
    judgement,
    guide: guide?.count ? guide : null,
    vin,
    createdAt: new Date().toISOString()
  };
}

export function createReportStore({ sql = null } = {}) {
  const mem = new Map();
  return {
    async save(report) {
      const id = randomBytes(8).toString('base64url');
      if (!sql) mem.set(id, report);
      else await sql`INSERT INTO dalal_iraq_check_reports (id, data) VALUES (${id}, ${JSON.stringify(report)})`;
      return id;
    },
    async get(id) {
      if (!/^[A-Za-z0-9_-]{8,16}$/.test(String(id || ''))) return null;
      if (!sql) return mem.get(id) || null;
      const rows = await sql`SELECT data FROM dalal_iraq_check_reports WHERE id = ${id}`;
      return rows[0]?.data || null;
    }
  };
}

/** عنوان مختصر للتقرير (يظهر في معاينة واتساب). */
export function reportHeadline(r) {
  const item = `${SECTION_NAMES[r.section]}: ${r.query}`;
  const v = r.judgement?.verdict;
  const pct = Math.abs(r.judgement?.diffPct || 0);
  const vinBad = vinFindings(r.vin).warnings.length > 0;
  const priceText = {
    suspicious_low: `أرخص من السوق بـ ${pct}% — انتبه`,
    below_market: `أرخص من السوق بـ ${pct}%`,
    fair: 'السعر ضمن السوق',
    above_market: `أغلى من الوسيط بـ ${pct}%`,
    overpriced: `أغلى من السوق بـ ${pct}%`,
    insufficient: 'لا بيانات كافية للحكم بعد'
  }[v] || '';
  return `${item} — ${priceText}${vinBad ? ' • الشاصي لا يطابق الإعلان' : ''}`;
}

/** صفحة التقرير كاملة (HTML من الخادم، دون JavaScript). */
export function renderReportPage(r, { url }) {
  const headline = reportHeadline(r);
  const { warnings, matched } = vinFindings(r.vin);
  const specs = vinSpecRows(r.vin?.decoded);
  const basis = basisLine(r.section, r.price, r.area, r.guide);
  const summary = guideSummaryText(r.guide);
  const checklist = (AD_CHECKLISTS[r.section] || AD_CHECKLISTS.products).map((t) => `<li>${esc(t)}</li>`).join('');
  const date = new Date(r.createdAt).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' });
  const vinHtml = !r.vin
    ? ''
    : r.vin.error
      ? `<section class="r-box r-bad"><h2>رقم الشاصي</h2><p>${esc(r.vin.message)}</p></section>`
      : `<section class="r-box ${warnings.length ? 'r-bad' : 'r-good'}">
          <h2>رقم الشاصي <span dir="ltr">${esc(r.vin.vin)}</span></h2>
          ${warnings.map((w) => `<p>⚠ ${esc(w)}</p>`).join('')}
          ${matched.length ? `<p>✔ مطابق للإعلان: ${esc(matched.join('، '))}</p>` : ''}
          ${specs.length ? `<table>${specs.map(([k, v]) => `<tr><th>${esc(k)}</th><td dir="auto">${esc(v)}</td></tr>`).join('')}</table>` : '<p>لم يُعثر على مواصفات هذا الشاصي في السجل الأمريكي.</p>'}
          <small>المواصفات من سجل المصنع الأمريكي (NHTSA)، ولا تكشف الحوادث أو الغرق أو العداد.</small>
        </section>`;
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(headline)} | رادار أسعار العراق</title>
  <meta name="robots" content="noindex" />
  <meta property="og:title" content="${esc(headline)}" />
  <meta property="og:description" content="تقرير فحص قبل الدفع من رادار أسعار العراق: مقارنة السعر بالسوق${r.vin ? ' وفحص رقم الشاصي' : ''}." />
  <meta property="og:url" content="${esc(url)}" />
  <meta property="og:type" content="article" />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css" />
  <link rel="stylesheet" href="/legal/page.css" />
</head>
<body class="legal-body">
  <main class="legal-page report-page">
    <a class="legal-back" href="/">→ رادار أسعار العراق</a>
    <div class="legal-card">
      <p class="legal-meta">تقرير فحص قبل الدفع • ${esc(date)}</p>
      <h1>${esc(headline)}</h1>
      <section class="r-box r-${esc(r.judgement?.verdict || 'none')}">
        <h2>السعر</h2>
        <p><strong>${esc(verdictLine(r.judgement))}</strong></p>
        <p>سعر الإعلان: ${esc(formatIQDText(r.price))}${r.area ? ` • المساحة ${esc(r.area)} م²` : ''}</p>
        ${basis ? `<p>${esc(basis)}</p>` : ''}
        ${summary ? `<p>${esc(summary)}</p>` : ''}
      </section>
      ${vinHtml}
      <section class="r-box">
        <h2>قبل أن تدفع</h2>
        <ul>${checklist}</ul>
      </section>
      <p class="legal-meta">هذا التقرير محسوب آلياً من أسعار مرصودة في مواقع ونتائج بحث عامة، وليس تقييماً رسمياً أو ضماناً. تحقق بنفسك قبل الدفع.</p>
      <p><a class="r-cta" href="/">افحص إعلانك أنت مجاناً على رادار أسعار العراق</a></p>
    </div>
  </main>
</body>
</html>`;
}
