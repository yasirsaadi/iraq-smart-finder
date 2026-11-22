// ============================================================================
// دليل سعر المتر حسب المنطقة (من إعلانات العقارات المجمّعة)
// لكل محافظة ثم لكل منطقة: وسيط سعر المتر للبيوت والأراضي والشقق، وعدد الإعلانات،
// واتجاه السعر حين تتوفر بيانات فترتين متتاليتين. لا يُعرض رقم من أقل من 3 إعلانات.
// ============================================================================

import { comparisonGroupFor, computePriceStats, normalizeForMatch, MIN_COMPARABLE_OFFERS } from '../shared/price-engine.js';
import { escapeHtml as esc } from '../shared/sanitize.js';
import { formatIQDText } from '../shared/check-report.js';

export const AREA_TYPES = { house: 'بيوت', land: 'أراضٍ', apartment: 'شقق' };
const TREND_SPLIT_DAYS = 60;

const typeOf = (row) => comparisonGroupFor({ section: 'realestate', title: row.title, snippet: row.description || '', specs: {} }).key.split('|')[2];

/** سعر متر معقول فقط: يستبعد أخطاء الإدخال (مساحة بالدونم، سعر إيجار...). */
function perSqmOf(row) {
  const area = Number(row.areaSqm);
  const price = Number(row.priceIQD);
  if (!(area >= 30 && area <= 20000 && price > 0)) return null;
  const v = price / area;
  return v >= 50_000 && v <= 25_000_000 ? v : null;
}

function summarize(rows, now) {
  const values = rows.map((r) => r.perSqm);
  const stats = computePriceStats(values);
  if (!stats || stats.count < MIN_COMPARABLE_OFFERS) return { count: stats?.count || 0 };
  const cut = now - TREND_SPLIT_DAYS * 86400000;
  const recent = computePriceStats(rows.filter((r) => r.at >= cut).map((r) => r.perSqm));
  const older = computePriceStats(rows.filter((r) => r.at < cut).map((r) => r.perSqm));
  const trendPct =
    recent && older && recent.count >= MIN_COMPARABLE_OFFERS && older.count >= MIN_COMPARABLE_OFFERS
      ? Math.round(((recent.median - older.median) / older.median) * 100)
      : null;
  return { count: stats.count, median: Math.round(stats.median), q1: Math.round(stats.q1), q3: Math.round(stats.q3), trendPct };
}

/**
 * يبني الجدول: { [gov]: { all: {type: summary}, areas: [{ name, types: {type: summary}, total }] } }
 * المنطقة = الحي/المدينة كما نشرها الموقع (addressLocality).
 */
export function buildAreaPriceTable(rows, { now = Date.now() } = {}) {
  const govs = new Map();
  for (const row of rows || []) {
    if (!row.governorate) continue;
    const perSqm = perSqmOf(row);
    const type = typeOf(row);
    if (!perSqm || !AREA_TYPES[type]) continue;
    const area = String(row.city || '').trim() || 'مناطق أخرى';
    const at = Date.parse(row.seenAt) || now;
    if (!govs.has(row.governorate)) govs.set(row.governorate, new Map());
    const g = govs.get(row.governorate);
    const key = normalizeForMatch(area);
    if (!g.has(key)) g.set(key, { name: area, items: [] });
    g.get(key).items.push({ type, perSqm, at });
  }
  const out = {};
  for (const [gov, areas] of govs) {
    const all = {};
    const allItems = [...areas.values()].flatMap((a) => a.items);
    for (const t of Object.keys(AREA_TYPES)) all[t] = summarize(allItems.filter((i) => i.type === t), now);
    const list = [...areas.values()]
      .map((a) => {
        const types = {};
        for (const t of Object.keys(AREA_TYPES)) types[t] = summarize(a.items.filter((i) => i.type === t), now);
        return { name: a.name, types, total: a.items.length };
      })
      .filter((a) => Object.values(a.types).some((s) => s.median))
      .sort((x, y) => y.total - x.total);
    out[gov] = { all, areas: list, total: allItems.length };
  }
  return out;
}

const cell = (s) =>
  s?.median
    ? `<td><strong>${esc(formatIQDText(s.median))}</strong><small>${esc(`عدد الإعلانات: ${s.count}`)}${
        s.trendPct !== null && s.trendPct !== undefined ? ` • ${s.trendPct > 0 ? '▲' : s.trendPct < 0 ? '▼' : '='} ${Math.abs(s.trendPct)}%` : ''
      }</small></td>`
    : '<td class="na">—</td>';

function pageShell({ title, description, url, body }) {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${esc(url)}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css" />
  <link rel="stylesheet" href="/legal/page.css" />
</head>
<body class="legal-body">
  <main class="legal-page area-prices-page">
    <a class="legal-back" href="/">→ رادار أسعار العراق</a>
    <div class="legal-card">${body}</div>
  </main>
</body>
</html>`;
}

const NOTE = `<p class="legal-meta">الأرقام وسيط سعر المتر المربع (السعر الكلي ÷ المساحة) لإعلانات بيع منشورة خلال آخر 120 يوماً، كما نشرها المعلنون، وليست تقييماً رسمياً. لا يُعرض رقم من أقل من ${MIN_COMPARABLE_OFFERS} إعلانات. الاتجاه يقارن آخر ${TREND_SPLIT_DAYS} يوماً بما قبلها حين تتوفر بيانات كافية.</p>`;

/** صفحة كل المحافظات. */
export function renderAreaIndexPage(table, { govNames, baseUrl }) {
  const rows = Object.entries(table)
    .filter(([, g]) => Object.values(g.all).some((s) => s.median))
    .sort((a, b) => b[1].total - a[1].total)
    .map(
      ([gov, g]) =>
        `<tr><th><a href="/prices/${esc(gov)}">${esc(govNames[gov] || gov)}</a></th>${Object.keys(AREA_TYPES)
          .map((t) => cell(g.all[t]))
          .join('')}</tr>`
    )
    .join('');
  const body = `
    <h1>سعر متر العقارات في العراق حسب المحافظة والمنطقة</h1>
    ${NOTE}
    ${
      rows
        ? `<div class="area-table-wrap"><table class="area-table"><thead><tr><th>المحافظة</th>${Object.values(AREA_TYPES)
            .map((n) => `<th>${esc(n)} (للمتر)</th>`)
            .join('')}</tr></thead><tbody>${rows}</tbody></table></div><p>اختر محافظة لترى سعر المتر في كل منطقة منها.</p>`
        : '<p>البيانات قيد التجميع؛ تظهر الأرقام بعد توفر 3 إعلانات على الأقل لكل نوع.</p>'
    }
    <p><a class="r-cta" href="/">افحص سعر عقار رأيته</a></p>`;
  return pageShell({
    title: 'سعر متر العقارات في العراق حسب المنطقة | رادار أسعار العراق',
    description: 'وسيط سعر المتر المربع للبيوت والأراضي والشقق في محافظات العراق ومناطقها، من إعلانات البيع الحديثة.',
    url: `${baseUrl}/prices`,
    body
  });
}

/** صفحة محافظة واحدة بمناطقها. */
export function renderAreaGovPage(gov, data, { govNames, baseUrl }) {
  const name = govNames[gov] || gov;
  const rows = (data?.areas || [])
    .map((a) => `<tr id="${esc(normalizeForMatch(a.name).replace(/\s+/g, '-'))}"><th>${esc(a.name)}</th>${Object.keys(AREA_TYPES).map((t) => cell(a.types[t])).join('')}</tr>`)
    .join('');
  const top = data?.areas?.slice(0, 3).map((a) => a.name).join('، ');
  const body = `
    <h1>سعر متر العقارات في ${esc(name)} حسب المنطقة</h1>
    ${NOTE}
    ${
      data && Object.values(data.all).some((s) => s.median)
        ? `<h2>المعدل العام في ${esc(name)}</h2>
           <div class="area-table-wrap"><table class="area-table"><thead><tr><th></th>${Object.values(AREA_TYPES).map((n) => `<th>${esc(n)} (للمتر)</th>`).join('')}</tr></thead>
           <tbody><tr><th>${esc(name)}</th>${Object.keys(AREA_TYPES).map((t) => cell(data.all[t])).join('')}</tr></tbody></table></div>`
        : ''
    }
    ${
      rows
        ? `<h2>حسب المنطقة</h2><div class="area-table-wrap"><table class="area-table"><thead><tr><th>المنطقة</th>${Object.values(AREA_TYPES)
            .map((n) => `<th>${esc(n)} (للمتر)</th>`)
            .join('')}</tr></thead><tbody>${rows}</tbody></table></div>`
        : `<p>لا توجد بعد إعلانات كافية في ${esc(name)} لحساب سعر المتر لكل منطقة.</p>`
    }
    <p><a href="/prices">← كل المحافظات</a></p>
    <p><a class="r-cta" href="/">افحص سعر عقار رأيته</a></p>`;
  return pageShell({
    title: `سعر المتر في ${name} ${new Date().getFullYear()} حسب المنطقة | رادار أسعار العراق`,
    description: `وسيط سعر المتر المربع للبيوت والأراضي والشقق في ${name}${top ? `: ${top} وغيرها` : ''}، من إعلانات البيع الحديثة.`,
    url: `${baseUrl}/prices/${gov}`,
    body
  });
}
