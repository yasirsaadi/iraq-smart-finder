// صفحة تقرير تاريخ السيارة المدفوع (لصاحبه فقط، تُعرض من الخادم دون JavaScript)

import { escapeHtml as esc } from '../shared/sanitize.js';

const dateAr = (d) => {
  const t = Date.parse(d);
  return Number.isFinite(t) ? new Date(t).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
};

export function renderVinHistoryPage(report) {
  const h = report.data || {};
  const s = h.summary || {};
  const rows = (items, cols) =>
    items.length
      ? `<table><thead><tr>${cols.map(([title]) => `<th>${esc(title)}</th>`).join('')}</tr></thead><tbody>${items
          .map((it) => `<tr>${cols.map(([, get]) => `<td dir="auto">${esc(get(it) ?? '—')}</td>`).join('')}</tr>`)
          .join('')}</tbody></table>`
      : '<p>لا توجد سجلات.</p>';
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex" />
  <title>تقرير تاريخ السيارة ${esc(report.vin)} | رادار أسعار العراق</title>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css" />
  <link rel="stylesheet" href="/legal/page.css" />
</head>
<body class="legal-body">
  <main class="legal-page report-page">
    <a class="legal-back" href="/">→ رادار أسعار العراق</a>
    <div class="legal-card">
      <p class="legal-meta">تقرير تاريخ السيارة • الشاصي <span dir="ltr">${esc(report.vin)}</span> • ${esc(dateAr(report.createdAt))}</p>
      <h1>${esc(s.headline || 'تقرير تاريخ السيارة')}</h1>
      <section class="r-box ${s.severe || h.odometerRollback ? 'r-bad' : 'r-good'}">
        <h2>الخلاصة</h2>
        ${h.odometerRollback ? '<p>⚠ قراءة العداد نزلت بين سجلين متتاليين: احتمال تلاعب بالعداد.</p>' : ''}
        ${h.vinChanged ? '<p>⚠ السجل يشير إلى تغيير في رقم الشاصي.</p>' : ''}
        <p>${esc(s.note || '')}</p>
      </section>
      <section class="r-box">
        <h2>علامات سند الملكية (Title brands)</h2>
        ${rows(h.brands || [], [['العلامة', (b) => b.arabic || b.name], ['الوصف الأصلي', (b) => b.description || b.name]])}
      </section>
      <section class="r-box">
        <h2>سجلات التلف والبيع كخردة أو تالفة</h2>
        ${rows(h.junk || [], [['الجهة', (j) => j.entity], ['المكان', (j) => j.place], ['التاريخ', (j) => dateAr(j.date)], ['المصير', (j) => j.disposition], ['للتصدير', (j) => (j.forExport ? 'نعم' : '—')]])}
      </section>
      <section class="r-box">
        <h2>سجلات شركات التأمين</h2>
        ${rows(h.insurance || [], [['الجهة', (i) => i.entity], ['التاريخ', (i) => dateAr(i.date)]])}
      </section>
      <section class="r-box">
        <h2>سجل السند وقراءات العداد</h2>
        ${rows(h.titles || [], [['التاريخ', (t) => dateAr(t.date)], ['الولاية', (t) => t.state], ['العداد', (t) => (t.odometer ? `${t.odometer.toLocaleString('en-US')} ${t.unit}` : '—')]])}
      </section>
      <p class="legal-meta">المصدر: سجلات العناوين الأمريكية عبر مزوّد بيانات مرخّص. غياب سجل لا يعني أن السيارة سليمة؛ افحصها في مركز مستقل قبل الدفع.</p>
    </div>
  </main>
</body>
</html>`;
}
