#!/usr/bin/env node
// ============================================================================
// الزاحف الليلي لرادار أسعار العراق
// يعمل في GitHub Actions (لا على خادم رندر)، يزور المواقع المسموح بها بهدوء،
// يقرأ البيانات المنظمة لكل إعلان، ويرسلها على دفعات إلى /api/admin/ingest-listings.
//
// الاستخدام:
//   SITE_URL=https://... REFRESH_TOKEN=... node scripts/crawl.mjs [--max=200] [--delay=1500] [--only=shanashel] [--dry]
// ============================================================================

import { CRAWL_SOURCES, CRAWLER_USER_AGENT, parseSitemap, robotsAllows } from '../lib/crawlers.js';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const MAX_PER_SOURCE = Math.min(2000, Number(args.max) || 200);
const DELAY_MS = Math.max(800, Number(args.delay) || 1500);
const DRY = Boolean(args.dry);
const ONLY = args.only ? String(args.only).split(',') : null;
const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, '');
const TOKEN = process.env.REFRESH_TOKEN || '';
const BATCH = 50;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url, { timeoutMs = 25000 } = {}) {
  const res = await fetch(url, {
    headers: { 'User-Agent': CRAWLER_USER_AGENT, Accept: 'text/html,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'ar,en;q=0.8' },
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'follow'
  });
  if (res.status === 429 || res.status === 503) throw Object.assign(new Error(`HTTP ${res.status}`), { backoff: true });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function ingest(listings) {
  if (DRY || !listings.length) return { saved: 0, dry: DRY };
  const res = await fetch(`${SITE_URL}/api/admin/ingest-listings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ listings }),
    signal: AbortSignal.timeout(120000)
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`ingest HTTP ${res.status} ${JSON.stringify(body)}`);
  return body;
}

async function crawlSource(src) {
  const report = { source: src.id, candidates: 0, fetched: 0, parsed: 0, saved: 0, skippedByRobots: 0, errors: 0, stoppedEarly: false };
  const robots = await fetchText(`${src.origin}/robots.txt`).catch(() => '');
  const allowed = robotsAllows(robots);

  let entries = [];
  for (const sm of src.sitemaps) {
    entries.push(...parseSitemap(await fetchText(sm, { timeoutMs: 60000 })));
    await sleep(DELAY_MS);
  }
  entries = entries.filter((e) => src.urlFilter.test(e.loc));
  // الأحدث تعديلاً أولاً؛ ومن دون تاريخ نحافظ على ترتيب الخريطة
  entries.sort((a, b) => (Date.parse(b.lastmod || 0) || 0) - (Date.parse(a.lastmod || 0) || 0));
  const picked = entries.slice(0, MAX_PER_SOURCE);
  report.candidates = entries.length;

  let batch = [];
  let consecutiveErrors = 0;
  for (const e of picked) {
    const path = new URL(e.loc).pathname;
    if (!allowed(path)) {
      report.skippedByRobots += 1;
      continue;
    }
    try {
      const html = await fetchText(e.loc);
      report.fetched += 1;
      consecutiveErrors = 0;
      const listing = src.parse(html, e.loc);
      if (listing && listing.title) {
        report.parsed += 1;
        batch.push(listing);
      }
    } catch (err) {
      report.errors += 1;
      consecutiveErrors += 1;
      // الموقع يطلب التمهل أو يرفض: نتوقف احتراماً له بدل الإلحاح
      if (err.backoff || consecutiveErrors >= 5) {
        report.stoppedEarly = true;
        break;
      }
    }
    if (batch.length >= BATCH) {
      report.saved += (await ingest(batch)).saved || 0;
      batch = [];
    }
    await sleep(DELAY_MS);
  }
  if (batch.length) report.saved += (await ingest(batch)).saved || 0;
  return report;
}

async function main() {
  if (!DRY && (!SITE_URL || !TOKEN)) {
    console.log('SITE_URL or REFRESH_TOKEN is missing; nothing to do.');
    return;
  }
  for (const src of CRAWL_SOURCES) {
    if (ONLY && !ONLY.includes(src.id)) continue;
    try {
      console.log(JSON.stringify(await crawlSource(src)));
    } catch (err) {
      console.log(JSON.stringify({ source: src.id, failed: err.message }));
    }
  }
}

main();
